<?php

$config = require __DIR__ . '/mail-config.php';

function build_redirect_url(string $returnUrl, string $status, string $formId, string $message): string
{
    $separator = str_contains($returnUrl, '?') ? '&' : '?';
    return $returnUrl . $separator . http_build_query([
        'form_status' => $status,
        'form_id' => $formId,
        'form_message' => $message,
    ]);
}

function redirect_back(string $returnUrl, string $status, string $formId, string $message): never
{
    header('Location: ' . build_redirect_url($returnUrl, $status, $formId, $message));
    exit;
}

function sanitize_return_url(?string $url): string
{
    $url = trim((string) $url);
    if ($url === '' || preg_match('/^(?:[a-z]+:)?\/\//i', $url)) {
        return 'index.html';
    }

    return ltrim($url, '/');
}

function form_value(string $key): string
{
    return trim((string) ($_POST[$key] ?? ''));
}

function smtp_read($socket): string
{
    $response = '';

    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;
        if (strlen($line) < 4 || $line[3] === ' ') {
            break;
        }
    }

    return $response;
}

function smtp_expect($socket, array $expectedCodes): string
{
    $response = smtp_read($socket);
    $code = (int) substr($response, 0, 3);

    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException('SMTP error: ' . trim($response));
    }

    return $response;
}

function smtp_write($socket, string $command): void
{
    fwrite($socket, $command . "\r\n");
}

function smtp_send(array $config, array $message): void
{
    $host = (string) $config['smtp_host'];
    $port = (int) $config['smtp_port'];
    $encryption = strtolower((string) ($config['smtp_encryption'] ?? 'ssl'));
    $username = trim((string) ($config['smtp_username'] ?? ''));
    $password = (string) ($config['smtp_password'] ?? '');

    if ($host === '' || $port <= 0 || $username === '' || $password === '') {
        throw new RuntimeException('SMTP configuration is incomplete.');
    }

    $remote = $encryption === 'ssl' ? 'ssl://' . $host . ':' . $port : $host . ':' . $port;
    $socket = @stream_socket_client($remote, $errno, $errstr, 15, STREAM_CLIENT_CONNECT);

    if (!$socket) {
        throw new RuntimeException('SMTP connection failed: ' . $errstr . ' (' . $errno . ')');
    }

    stream_set_timeout($socket, 15);

    smtp_expect($socket, [220]);
    smtp_write($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
    smtp_expect($socket, [250]);

    if ($encryption === 'tls') {
        smtp_write($socket, 'STARTTLS');
        smtp_expect($socket, [220]);

        if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
            throw new RuntimeException('Unable to start TLS encryption.');
        }

        smtp_write($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'));
        smtp_expect($socket, [250]);
    }

    smtp_write($socket, 'AUTH LOGIN');
    smtp_expect($socket, [334]);
    smtp_write($socket, base64_encode($username));
    smtp_expect($socket, [334]);
    smtp_write($socket, base64_encode($password));
    smtp_expect($socket, [235]);

    smtp_write($socket, 'MAIL FROM:<' . $message['from_email'] . '>');
    smtp_expect($socket, [250]);
    smtp_write($socket, 'RCPT TO:<' . $message['to_email'] . '>');
    smtp_expect($socket, [250, 251]);
    smtp_write($socket, 'DATA');
    smtp_expect($socket, [354]);

    $body = preg_replace('/^\./m', '..', $message['body']);
    fwrite($socket, $body . "\r\n.\r\n");
    smtp_expect($socket, [250]);

    smtp_write($socket, 'QUIT');
    fclose($socket);
}

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'POST') {
    http_response_code(405);
    echo 'Method Not Allowed';
    exit;
}

$returnUrl = sanitize_return_url($_POST['return_url'] ?? '');
$formId = preg_replace('/[^a-z0-9\-]/i', '', form_value('form_id')) ?: 'website-form';
$formType = strtolower(form_value('form_type')) ?: 'general';

if (form_value('company') !== '') {
    redirect_back($returnUrl, 'success', $formId, 'Thank you. Your submission has been received.');
}

$email = filter_var(form_value('email'), FILTER_VALIDATE_EMAIL) ?: '';
$topic = form_value('topic');
$phone = form_value('phone');
$firstName = form_value('first_name');
$lastName = form_value('last_name');
$fullName = trim(form_value('name'));
$messageText = form_value('message');
$sourcePage = form_value('source_page');

if ($fullName === '') {
    $fullName = trim($firstName . ' ' . $lastName);
}

if ($email === '') {
    redirect_back($returnUrl, 'error', $formId, 'Please enter a valid email address.');
}

if (in_array($formType, ['contact', 'application'], true) && ($fullName === '' || $messageText === '')) {
    redirect_back($returnUrl, 'error', $formId, 'Please complete the required fields before sending.');
}

$subject = match ($formType) {
    'contact' => 'New contact message' . ($topic !== '' ? ': ' . $topic : ''),
    'application' => 'New website application inquiry',
    'newsletter' => 'New newsletter signup' . ($sourcePage !== '' ? ' from ' . $sourcePage : ''),
    default => 'New website form submission',
};

$lines = [
    'Form ID: ' . $formId,
    'Form type: ' . $formType,
];

if ($sourcePage !== '') {
    $lines[] = 'Source page: ' . $sourcePage;
}
if ($fullName !== '') {
    $lines[] = 'Name: ' . $fullName;
}

$lines[] = 'Email: ' . $email;

if ($phone !== '') {
    $lines[] = 'Phone: ' . $phone;
}
if ($topic !== '') {
    $lines[] = 'Topic: ' . $topic;
}
if ($messageText !== '') {
    $lines[] = '';
    $lines[] = 'Message:';
    $lines[] = $messageText;
}

$headers = [
    'Date: ' . date(DATE_RFC2822),
    'To: "' . $config['recipient_name'] . '" <' . $config['recipient_email'] . '>',
    'From: "' . $config['from_name'] . '" <' . $config['from_email'] . '>',
    'Reply-To: "' . ($fullName !== '' ? $fullName : $email) . '" <' . $email . '>',
    'Subject: ' . $subject,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    '',
    implode("\r\n", $lines),
];

try {
    smtp_send($config, [
        'from_email' => $config['from_email'],
        'to_email' => $config['recipient_email'],
        'body' => implode("\r\n", $headers),
    ]);

    $successMessage = $formType === 'newsletter'
        ? 'Thanks for subscribing. We will keep you updated.'
        : 'Thanks for reaching out. Your message has been sent.';

    redirect_back($returnUrl, 'success', $formId, $successMessage);
} catch (Throwable $exception) {
    redirect_back($returnUrl, 'error', $formId, 'We could not send your message right now. Please try again in a moment.');
}
