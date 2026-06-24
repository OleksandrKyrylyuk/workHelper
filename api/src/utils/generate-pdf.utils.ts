import puppeteer from "puppeteer";

type ScoreValue = 1 | 2 | 3 | 4 | 5;

export interface ScoreItem {
    criterion: string;
    score: ScoreValue | number;
    comment: string;
}

export interface ClientObjection {
    objection: string;
    manager_response: string;
    quality: string;
    better_response: string;
}

export interface BadPhrase {
    phrase: string;
    why_bad: string;
    better_alternative: string;
}

export interface BetterReplyExample {
    situation: string;
    better_manager_reply: string;
}

export interface CallAnalysisJson {
    general_summary: string;
    conversation_result: string;
    scores: ScoreItem[];
    strengths: string[];
    mistakes: string[];
    client_objections: ClientObjection[];
    good_phrases: string[];
    bad_phrases: BadPhrase[];
    recommendations: string[];
    better_reply_examples: BetterReplyExample[];
    final_score_10: number;
    final_score_comment: string;
}

function escapeHtml(value: unknown = "") {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function getScoreClass(score: number) {
    if (score >= 4) return "score-good";
    if (score === 3) return "score-mid";
    return "score-bad";
}

function renderStringList(items?: string[]): string {
    if (!items || items.length === 0) {
        return "<li>Недостатньо даних</li>";
    }

    return items.map(item => `<li>${escapeHtml(item)}</li>`).join("");
}

function generateCallAnalysisHtml(data: CallAnalysisJson) {
    const scoresRows = data.scores?.map(item => `
    <tr>
      <td>${escapeHtml(item.criterion)}</td>
      <td class="score ${getScoreClass(item.score)}">${escapeHtml(item.score)}</td>
      <td>${escapeHtml(item.comment)}</td>
    </tr>
  `).join("") || "";

    const objections = data.client_objections?.map(item => `
    <div class="card">
      <p><strong>Заперечення:</strong> ${escapeHtml(item.objection)}</p>
      <p><strong>Відповідь менеджера:</strong> ${escapeHtml(item.manager_response)}</p>
      <p><strong>Якість відповіді:</strong> ${escapeHtml(item.quality)}</p>
      <p><strong>Кращий варіант:</strong> ${escapeHtml(item.better_response)}</p>
    </div>
  `).join("") || "<p>Недостатньо даних</p>";

    const badPhrases = data.bad_phrases?.map(item => `
    <div class="card warning">
      <p><strong>Фраза:</strong> ${escapeHtml(item.phrase)}</p>
      <p><strong>Чому невдала:</strong> ${escapeHtml(item.why_bad)}</p>
      <p><strong>Кращий варіант:</strong> ${escapeHtml(item.better_alternative)}</p>
    </div>
  `).join("") || "<p>Недостатньо даних</p>";

    const betterExamples = data.better_reply_examples?.map(item => `
    <div class="card">
      <p><strong>Ситуація:</strong> ${escapeHtml(item.situation)}</p>
      <p><strong>Краща відповідь менеджера:</strong> ${escapeHtml(item.better_manager_reply)}</p>
    </div>
  `).join("") || "<p>Недостатньо даних</p>";

    return `
<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8" />
  <title>Аналіз розмови менеджера з клієнтом</title>

  <style>
    * {
      box-sizing: border-box;
    }

    body {
      font-family: Arial, sans-serif;
      color: #1f2937;
      background: #ffffff;
      margin: 0;
      padding: 0;
      line-height: 1.5;
      font-size: 14px;
    }

    .page {
      padding: 36px;
    }

    .header {
      background: linear-gradient(135deg, #2563eb, #1e40af);
      color: white;
      padding: 28px 32px;
      border-radius: 16px;
      margin-bottom: 28px;
    }

    .header h1 {
      margin: 0 0 8px;
      font-size: 28px;
      line-height: 1.2;
    }

    .header p {
      margin: 0;
      opacity: 0.9;
      font-size: 15px;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: 1fr 220px;
      gap: 18px;
      margin-bottom: 26px;
    }

    .summary-box {
      background: #f8fafc;
      border: 1px solid #e5e7eb;
      border-radius: 14px;
      padding: 20px;
    }

    .summary-box h2 {
      margin-top: 0;
      font-size: 18px;
      color: #111827;
    }

    .final-score {
      text-align: center;
      background: #ecfdf5;
      border: 1px solid #bbf7d0;
      border-radius: 14px;
      padding: 20px;
    }

    .final-score .number {
      font-size: 46px;
      font-weight: bold;
      color: #16a34a;
      line-height: 1;
    }

    .final-score .label {
      margin-top: 8px;
      color: #374151;
    }

    h2 {
      margin-top: 30px;
      margin-bottom: 12px;
      font-size: 20px;
      color: #111827;
      border-left: 5px solid #2563eb;
      padding-left: 10px;
    }

    h3 {
      margin-top: 18px;
      font-size: 16px;
      color: #111827;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 12px;
      background: white;
      border-radius: 12px;
      overflow: hidden;
      border: 1px solid #e5e7eb;
    }

    th {
      background: #f3f4f6;
      color: #111827;
      text-align: left;
      padding: 12px;
      font-weight: 700;
      border-bottom: 1px solid #e5e7eb;
    }

    td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }

    tr:last-child td {
      border-bottom: none;
    }

    .score {
      width: 80px;
      text-align: center;
      font-weight: bold;
      border-radius: 8px;
    }

    .score-good {
      color: #15803d;
      background: #dcfce7;
    }

    .score-mid {
      color: #a16207;
      background: #fef9c3;
    }

    .score-bad {
      color: #b91c1c;
      background: #fee2e2;
    }

    ul {
      margin: 8px 0 0;
      padding-left: 22px;
    }

    li {
      margin-bottom: 6px;
    }

    .card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      padding: 14px 16px;
      margin-bottom: 12px;
      page-break-inside: avoid;
    }

    .card p {
      margin: 6px 0;
    }

    .warning {
      background: #fff7ed;
      border-color: #fed7aa;
    }

    .section {
      page-break-inside: avoid;
    }

    .footer {
      margin-top: 36px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      color: #6b7280;
      font-size: 12px;
      text-align: center;
    }

    .badge {
      display: inline-block;
      padding: 5px 10px;
      border-radius: 999px;
      background: #dbeafe;
      color: #1e40af;
      font-weight: 600;
      font-size: 13px;
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
      <h1>Аналіз розмови менеджера з клієнтом</h1>
      <p>Оцінка якості комунікації, продажів, роботи із запереченнями та завершення діалогу</p>
    </div>

    <div class="summary-grid">
      <div class="summary-box">
        <h2>Загальний висновок</h2>
        <p>${escapeHtml(data.general_summary)}</p>
        <p>
          <strong>Результат розмови:</strong>
          <span class="badge">${escapeHtml(data.conversation_result)}</span>
        </p>
      </div>

      <div class="final-score">
        <div class="number">${escapeHtml(data.final_score_10 || 0)}/10</div>
        <div class="label">Підсумкова оцінка</div>
      </div>
    </div>

    <div class="summary-box">
      <h3>Коментар до підсумкової оцінки</h3>
      <p>${escapeHtml(data.final_score_comment)}</p>
    </div>

    <h2>Оцінка за критеріями</h2>
    <table>
      <thead>
        <tr>
          <th>Критерій</th>
          <th>Оцінка</th>
          <th>Коментар</th>
        </tr>
      </thead>
      <tbody>
        ${scoresRows}
      </tbody>
    </table>

    <div class="section">
      <h2>Сильні сторони менеджера</h2>
      <ul>${renderStringList(data.strengths)}</ul>
    </div>

    <div class="section">
      <h2>Помилки менеджера</h2>
      <ul>${renderStringList(data.mistakes)}</ul>
    </div>

    <div class="section">
      <h2>Заперечення клієнта та їх опрацювання</h2>
      ${objections}
    </div>

    <div class="section">
      <h2>Вдалі фрази менеджера</h2>
      <ul>${renderStringList(data.good_phrases)}</ul>
    </div>

    <div class="section">
      <h2>Невдалі фрази менеджера</h2>
      ${badPhrases}
    </div>

    <div class="section">
      <h2>Рекомендації для покращення</h2>
      <ul>${renderStringList(data.recommendations)}</ul>
    </div>

    <div class="section">
      <h2>Приклади кращих відповідей</h2>
      ${betterExamples}
    </div>

    <div class="footer">
      Звіт згенеровано автоматично на основі аналізу розмови.
    </div>
  </div>
</body>
</html>
`;
}

export async function generateCallAnalysisPdf(analysisJson: CallAnalysisJson): Promise<Buffer> {
    const html = generateCallAnalysisHtml(analysisJson);

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