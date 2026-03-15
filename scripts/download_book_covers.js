const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const htmlPath = path.join(repoRoot, "resources", "books.html");
const booksDir = path.join(repoRoot, "assets", "images", "books");
const INVALID_COVER_HASHES = new Set([
    "3EFA8C43E5B4348F303A528C81ADF435F0111EA752FE9F0F6241478B60987FA6"
]);

function readBooksPage() {
    const html = fs.readFileSync(htmlPath, "utf8");
    const booksMatch = html.match(/const books = \[(.*?)\];/s);
    const manualCoverMapMatch = html.match(/const manualCoverMap = \{(.*?)\n\s*\};/s);

    if (!booksMatch) throw new Error("Could not find books array in resources/books.html");
    if (!manualCoverMapMatch) throw new Error("Could not find manualCoverMap in resources/books.html");

    const books = eval("[" + booksMatch[1] + "]");
    const manualCoverMap = eval("({" + manualCoverMapMatch[1] + "})");

    return {
        books,
        manualCoverMap
    };
}

function normalizeLookupValue(value) {
    return String(value || "")
        .replace(/[â€™']/g, "")
        .replace(/[:!?.,]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function getAuthorVariants(author) {
    const variants = new Set([author, normalizeLookupValue(author)]);
    if (author === "Dwight L. Moody") variants.add("D. L. Moody");
    if (author === "D. L. Moody") variants.add("Dwight L. Moody");
    if (author === "Marc Reklah") variants.add("Marc Reklau");
    if (author === "Marc Reklau") variants.add("Marc Reklah");
    if (author === "A. W. Tozer") variants.add("AW Tozer");
    return Array.from(variants).filter(Boolean);
}

function slugifyCoverSegment(value) {
    return String(value || "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function localCoverBaseName(title, author) {
    return `${slugifyCoverSegment(title)}-${slugifyCoverSegment(author)}`.replace(/-+/g, "-");
}

function localCoverCandidates(title, author) {
    const base = path.join(booksDir, localCoverBaseName(title, author));
    return [base + ".jpg", base + ".jpeg", base + ".png", base + ".webp", base + ".svg"];
}

function fileSha256(filePath) {
    const crypto = require("crypto");
    const buffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(buffer).digest("hex").toUpperCase();
}

function isInvalidExistingCover(filePath) {
    if (!fs.existsSync(filePath)) return false;
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".svg") return false;

    try {
        return INVALID_COVER_HASHES.has(fileSha256(filePath));
    } catch (error) {
        return false;
    }
}

function manualCoverKey(title, author) {
    return `${title}||${author}`;
}

function isRemoteUrl(value) {
    return /^https?:\/\//i.test(String(value || ""));
}

function inferExtensionFromContentType(contentType, fallbackUrl = "") {
    const normalized = String(contentType || "").toLowerCase();
    if (normalized.includes("image/jpeg")) return ".jpg";
    if (normalized.includes("image/png")) return ".png";
    if (normalized.includes("image/webp")) return ".webp";
    if (normalized.includes("image/jpg")) return ".jpg";

    const ext = path.extname(new URL(fallbackUrl).pathname || "").toLowerCase();
    if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) return ext === ".jpeg" ? ".jpg" : ext;
    return ".jpg";
}

async function fetchJsonWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "FreedomExpertBookCoverFetcher/1.0"
            }
        });
        if (!response.ok) throw new Error(`Request failed with ${response.status}`);
        return await response.json();
    } finally {
        clearTimeout(timeoutId);
    }
}

async function downloadImage(url, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "FreedomExpertBookCoverFetcher/1.0",
                "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
            }
        });
        if (!response.ok) return null;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.toLowerCase().includes("image/")) return null;

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        if (buffer.length < 8 * 1024) return null;
        const hash = require("crypto").createHash("sha256").update(buffer).digest("hex").toUpperCase();
        if (INVALID_COVER_HASHES.has(hash)) return null;

        return {
            buffer,
            contentType
        };
    } catch (error) {
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

function toGoogleZoom3(url) {
    if (!url || !url.includes("books.google.com/books/content")) return url;
    return url
        .replace("http://", "https://")
        .replace("zoom=1", "zoom=3")
        .replace("zoom=2", "zoom=3");
}

async function findGoogleCandidates(title, author) {
    const queries = [
        `intitle:${title}+inauthor:${author}`,
        `intitle:${normalizeLookupValue(title)}+inauthor:${normalizeLookupValue(author)}`,
        `intitle:${title}`,
        `"${title}" ${author}`,
        normalizeLookupValue(title)
    ];

    const candidates = [];
    for (const query of queries) {
        try {
            const endpoint =
                "https://www.googleapis.com/books/v1/volumes?q=" +
                encodeURIComponent(query) +
                "&maxResults=3";
            const data = await fetchJsonWithTimeout(endpoint, 7000);
            const items = (data && data.items) || [];
            for (const item of items) {
                const imageLinks = item && item.volumeInfo && item.volumeInfo.imageLinks;
                const volumeId = item && item.id;
                if (volumeId) {
                    candidates.push(
                        "https://books.google.com/books/content?id=" +
                        encodeURIComponent(volumeId) +
                        "&printsec=frontcover&img=1&zoom=3&source=gbs_api"
                    );
                }

                const imageCandidates = imageLinks ?
                    [
                        imageLinks.extraLarge,
                        imageLinks.large,
                        imageLinks.medium,
                        imageLinks.small,
                        imageLinks.thumbnail,
                        imageLinks.smallThumbnail
                    ] :
                    [];

                imageCandidates
                    .filter(Boolean)
                    .forEach((link) => {
                        candidates.push(
                            link
                            .replace("http://", "https://")
                            .replace("zoom=1", "zoom=3")
                            .replace("&edge=curl", "")
                        );
                    });
            }
        } catch (error) {}
    }

    return [...new Set(candidates)];
}

async function findOpenLibraryCandidates(title, author) {
    const authorVariants = getAuthorVariants(author);
    const queries = [
        {
            title,
            author
        },
        {
            title: normalizeLookupValue(title),
            author: normalizeLookupValue(author)
        },
        {
            title,
            author: ""
        }
    ];

    const candidates = [];
    for (const query of queries) {
        const authorsToTry = query.author ? [query.author, ...authorVariants] : [""];
        for (const authorCandidate of authorsToTry) {
            try {
                const endpoint =
                    "https://openlibrary.org/search.json?title=" +
                    encodeURIComponent(query.title) +
                    (authorCandidate ? "&author=" + encodeURIComponent(authorCandidate) : "") +
                    "&limit=5";
                const data = await fetchJsonWithTimeout(endpoint, 7000);
                const docs = (data && data.docs) || [];
                for (const doc of docs) {
                    const coverId = doc && doc.cover_i;
                    if (coverId) {
                        candidates.push(
                            "https://covers.openlibrary.org/b/id/" + coverId + "-L.jpg",
                            "https://covers.openlibrary.org/b/id/" + coverId + "-M.jpg"
                        );
                    }
                }
            } catch (error) {}
        }
    }

    return [...new Set(candidates)];
}

function copyExistingLocalCover(sourcePath, title, author) {
    const targetCandidates = localCoverCandidates(title, author);
    const sourceResolved = path.resolve(path.dirname(htmlPath), sourcePath);

    if (!fs.existsSync(sourceResolved)) return null;
    if (isInvalidExistingCover(sourceResolved)) return null;

    const targetPath = targetCandidates[0];
    if (!fs.existsSync(targetPath)) {
        fs.copyFileSync(sourceResolved, targetPath);
    }
    return targetPath;
}

async function saveFirstWorkingCandidate(candidates, title, author) {
    for (const candidate of candidates) {
        const result = await downloadImage(candidate, 12000);
        if (!result) continue;

        const extension = inferExtensionFromContentType(result.contentType, candidate);
        const basePath = path.join(booksDir, localCoverBaseName(title, author));
        const targetPath = basePath + extension;

        for (const existingPath of localCoverCandidates(title, author)) {
            if (fs.existsSync(existingPath) && existingPath !== targetPath) {
                fs.unlinkSync(existingPath);
            }
        }

        fs.writeFileSync(targetPath, result.buffer);
        return targetPath;
    }

    return null;
}

function escapeXml(value) {
    return String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function splitCoverText(value, maxLineLength, maxLines) {
    const words = String(value || "").split(/\s+/).filter(Boolean);
    const lines = [];
    let currentLine = "";
    let consumedWords = 0;

    for (let index = 0; index < words.length; index += 1) {
        const word = words[index];
        const nextLine = currentLine ? currentLine + " " + word : word;
        if (nextLine.length <= maxLineLength || !currentLine) {
            currentLine = nextLine;
            consumedWords = index + 1;
            continue;
        }

        lines.push(currentLine);
        currentLine = word;
        consumedWords = index + 1;
        if (lines.length === maxLines - 1) break;
    }

    if (lines.length < maxLines && currentLine) {
        const remainingWords = words.slice(consumedWords);
        const finalLine = [currentLine, ...remainingWords].join(" ").trim();
        lines.push(finalLine);
    }

    return lines.slice(0, maxLines);
}

function buildFallbackCoverSvg(title, author) {
    const titleLines = splitCoverText(title, 18, 5)
        .map((line, index) => `<tspan x="70" dy="${index === 0 ? 0 : 54}">${escapeXml(line)}</tspan>`)
        .join("");
    const authorLines = splitCoverText(author, 28, 2)
        .map((line, index) => `<tspan x="70" dy="${index === 0 ? 0 : 32}">${escapeXml(line)}</tspan>`)
        .join("");

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900" role="img" aria-label="${escapeXml(title)} cover">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#f7f0ff"/>
      <stop offset="100%" stop-color="#eadbff"/>
    </linearGradient>
  </defs>
  <rect width="600" height="900" fill="url(#bg)"/>
  <rect x="36" y="36" width="528" height="828" rx="28" fill="#ffffff" fill-opacity="0.84" stroke="#c9acef" stroke-width="3"/>
  <text x="70" y="120" fill="#6f42c1" font-family="Inter, Arial, sans-serif" font-size="26" font-weight="700" letter-spacing="3">FREEDOMEXPERT</text>
  <text x="70" y="220" fill="#221934" font-family="Inter, Arial, sans-serif" font-size="42" font-weight="800">
    ${titleLines}
  </text>
  <text x="70" y="700" fill="#5b4a78" font-family="Inter, Arial, sans-serif" font-size="24" font-weight="600">
    ${authorLines}
  </text>
</svg>`;
}

function saveFallbackSvg(title, author) {
    const targetPath = path.join(booksDir, localCoverBaseName(title, author) + ".svg");
    fs.writeFileSync(targetPath, buildFallbackCoverSvg(title, author), "utf8");
    return targetPath;
}

async function downloadCoverForBook(book, manualCoverMap) {
    const existingDeterministic = localCoverCandidates(book.title, book.author).find((filePath) => fs.existsSync(filePath));
    if (existingDeterministic) {
        if (isInvalidExistingCover(existingDeterministic)) {
            fs.unlinkSync(existingDeterministic);
        } else {
            return {
                status: "existing",
                path: existingDeterministic
            };
        }
    }

    const staleNeighbors = localCoverCandidates(book.title, book.author).filter((filePath) => fs.existsSync(filePath) && isInvalidExistingCover(filePath));
    staleNeighbors.forEach((filePath) => fs.unlinkSync(filePath));

    const manualCover = manualCoverMap[manualCoverKey(book.title, book.author)];
    if (manualCover && !isRemoteUrl(manualCover)) {
        const copied = copyExistingLocalCover(manualCover, book.title, book.author);
        if (copied) {
            return {
                status: "copied",
                path: copied
            };
        }
    }

    const candidates = [];
    if (manualCover && isRemoteUrl(manualCover)) {
        candidates.push(toGoogleZoom3(manualCover), manualCover);
    }

    const googleCandidates = await findGoogleCandidates(book.title, book.author);
    const openLibraryCandidates = await findOpenLibraryCandidates(book.title, book.author);
    candidates.push(...googleCandidates, ...openLibraryCandidates);

    const uniqueCandidates = [...new Set(candidates)].filter(Boolean);
    const saved = await saveFirstWorkingCandidate(uniqueCandidates, book.title, book.author);

    if (saved) {
        return {
            status: "downloaded",
            path: saved
        };
    }

    return {
        status: "fallback",
        path: saveFallbackSvg(book.title, book.author)
    };
}

async function main() {
    fs.mkdirSync(booksDir, {
        recursive: true
    });

    const {
        books,
        manualCoverMap
    } = readBooksPage();

    const summary = {
        total: books.length,
        downloaded: 0,
        copied: 0,
        existing: 0,
        fallback: 0
    };

    const fallbackBooks = [];

    for (let index = 0; index < books.length; index += 1) {
        const book = books[index];
        const result = await downloadCoverForBook(book, manualCoverMap);
        summary[result.status] += 1;
        const label = `[${index + 1}/${books.length}] ${book.title} — ${book.author}`;

        if (result.status === "fallback") {
            fallbackBooks.push(`${book.title} — ${book.author}`);
            console.log(`${label} :: fallback`);
        } else {
            console.log(`${label} :: ${result.status}`);
        }
    }

    const reportPath = path.join(repoRoot, "books_cover_download_report.json");
    fs.writeFileSync(reportPath, JSON.stringify({
        summary,
        fallbackBooks
    }, null, 2));

    console.log("");
    console.log("Summary:", summary);
    console.log("Report:", reportPath);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
