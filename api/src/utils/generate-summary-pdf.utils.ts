import puppeteer from "puppeteer";

export interface ClientVisitPlainItem {
    title: string;
    body: string;
}

export interface ClientVisitsPlainReportJson {
    report_title: string;
    visits: ClientVisitPlainItem[];
}

function escapeHtml(value: unknown = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function escapeHtmlWithBreaks(value: unknown = "") {
    return escapeHtml(value).replace(/\n/g, "<br />");
}

function renderVisit(item: ClientVisitPlainItem): string {
    return `
        <div class="visit">
            <h2>${escapeHtml(item.title || "Недостатньо даних")}</h2>
            <div class="visit-body">
                ${escapeHtmlWithBreaks(item.body || "Недостатньо даних")}
            </div>
        </div>
    `;
}

function generateClientVisitsPlainReportHtml(data: ClientVisitsPlainReportJson) {
    const visitsHtml = data.visits?.length
        ? data.visits.map(renderVisit).join("")
        : `<p>Недостатньо даних</p>`;

    return `
<!DOCTYPE html>
<html lang="uk">
<head>
    <meta charset="UTF-8" />
    <title>${escapeHtml(data.report_title || "Звіт по клієнтських зустрічах")}</title>

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            font-family: Arial, sans-serif;
            color: #111827;
            background: #ffffff;
            margin: 0;
            padding: 0;
            line-height: 1.5;
            font-size: 14px;
        }

        .page {
            padding: 34px;
        }

        .header {
            margin-bottom: 26px;
            padding-bottom: 14px;
            border-bottom: 2px solid #111827;
        }

        .header h1 {
            margin: 0;
            font-size: 26px;
            color: #111827;
            font-weight: 700;
        }

        .visit {
            margin-bottom: 30px;
            padding-bottom: 24px;
            border-bottom: 1px solid #d1d5db;
            page-break-inside: avoid;
        }

        .visit:last-child {
            border-bottom: none;
        }

        .visit h2 {
            margin: 0 0 10px;
            font-size: 18px;
            line-height: 1.35;
            color: #111827;
            font-weight: 700;
        }

        .visit-body {
            color: #1f2937;
            font-size: 14px;
            line-height: 1.55;
        }

        .visit-body br {
            line-height: 1.7;
        }

        .footer {
            margin-top: 36px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 12px;
            text-align: center;
        }

        @media print {
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }

            .page {
                padding: 24px;
            }
        }
    </style>
</head>

<body>
    <div class="page">
        <div class="header">
            <h1>${escapeHtml(data.report_title || "Звіт по клієнтських зустрічах")}</h1>
        </div>

        ${visitsHtml}

        <div class="footer">
            Звіт згенеровано автоматично на основі тексту розмови або нотаток.
        </div>
    </div>
</body>
</html>
`;
}

export async function generateClientVisitsPlainReportPdfBig(
    reportJson: ClientVisitsPlainReportJson
): Promise<Buffer> {
    const html = generateClientVisitsPlainReportHtml(reportJson);

    const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium-browser",
        args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu"
        ]
    });

    try {
        const page = await browser.newPage();

        await page.setContent(html, {
            waitUntil: "domcontentloaded"
        });

        const pdfBuffer = await page.pdf({
            format: "A4",
            printBackground: true,
            margin: {
                top: "16mm",
                right: "14mm",
                bottom: "16mm",
                left: "14mm"
            }
        });

        return Buffer.from(pdfBuffer);
    } finally {
        await browser.close();
    }
}