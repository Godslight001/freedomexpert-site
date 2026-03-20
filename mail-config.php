<?php

return [
    'smtp_host' => getenv('FREEDOM_SMTP_HOST') ?: 'smtp.hostinger.com',
    'smtp_port' => (int) (getenv('FREEDOM_SMTP_PORT') ?: 465),
    'smtp_encryption' => getenv('FREEDOM_SMTP_ENCRYPTION') ?: 'ssl',
    'smtp_username' => getenv('FREEDOM_SMTP_USERNAME') ?: 'ask@freedomexpert.ca',
    'smtp_password' => getenv('FREEDOM_SMTP_PASSWORD') ?: '',
    'from_email' => getenv('FREEDOM_FROM_EMAIL') ?: 'ask@freedomexpert.ca',
    'from_name' => getenv('FREEDOM_FROM_NAME') ?: 'FreedomExpert Website',
    'recipient_email' => getenv('FREEDOM_RECIPIENT_EMAIL') ?: 'ask@freedomexpert.ca',
    'recipient_name' => getenv('FREEDOM_RECIPIENT_NAME') ?: 'FreedomExpert',
    'site_name' => 'FreedomExpert',
];
