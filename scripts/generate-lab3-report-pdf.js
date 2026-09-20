import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const BASE_DIR = process.cwd();
const MARKDOWN_PATH = path.join(BASE_DIR, "docs/lab-03/report-answers.md");
const OUTPUT_PDF_PATH = path.join(
  BASE_DIR,
  "docs/lab-03/Lab3_Report_67070505218_Nara_Kosiyaporn.pdf"
);

async function generatePdf() {
  console.log("Reading markdown from:", MARKDOWN_PATH);
  let mdContent = fs.readFileSync(MARKDOWN_PATH, "utf8");

  // Replace relative image paths with base64 data URLs for 100% reliable rendering
  mdContent = mdContent.replace(
    /!\[(.*?)\]\(\.\.\/\.\.\/artifacts\/lab-03\/screenshots\/(.*?)\)/g,
    (match, alt, relImgPath) => {
      const fullImgPath = path.join(
        BASE_DIR,
        "artifacts/lab-03/screenshots",
        relImgPath
      );
      if (fs.existsSync(fullImgPath)) {
        const ext = path.extname(fullImgPath).replace(".", "");
        const base64 = fs.readFileSync(fullImgPath).toString("base64");
        return `![${alt}](data:image/${ext};base64,${base64})`;
      } else {
        console.warn(`[WARN] Screenshot not found: ${fullImgPath}`);
        return match;
      }
    }
  );

  console.log("Launching Chromium for PDF generation...");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  // HTML shell with marked and Zen Green styles
  const htmlShell = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>TokTickIT Lab 3 Submission Report</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    @page {
      size: A4;
      margin: 18mm 16mm 20mm 16mm;
    }
    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.55;
      color: #1B3A2A;
      margin: 0;
      padding: 0;
    }
    h1 {
      color: #006B3C;
      font-size: 20pt;
      border-bottom: 2.5px solid #006B3C;
      padding-bottom: 6px;
      margin-top: 0;
      margin-bottom: 12px;
    }
    h2 {
      color: #006B3C;
      font-size: 15pt;
      border-bottom: 1.5px solid #D0E0D8;
      padding-bottom: 4px;
      margin-top: 26px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }
    h3 {
      color: #0B7A46;
      font-size: 12pt;
      margin-top: 18px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    p {
      margin-top: 4px;
      margin-bottom: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 9.5pt;
      page-break-inside: avoid;
    }
    th, td {
      border: 1px solid #D0E0D8;
      padding: 6px 10px;
      text-align: left;
    }
    th {
      background-color: #006B3C;
      color: #FFFFFF;
      font-weight: 600;
    }
    tr:nth-child(even) td {
      background-color: #F4FAF6;
    }
    pre, code {
      font-family: Consolas, 'Fira Code', Menlo, Monaco, monospace;
      font-size: 8.5pt;
    }
    pre {
      background-color: #F4F6F5;
      border: 1px solid #D0E0D8;
      border-radius: 4px;
      padding: 10px 12px;
      overflow-x: auto;
      line-height: 1.4;
      page-break-inside: avoid;
      margin: 10px 0;
    }
    p > code {
      background-color: #EAF6EF;
      color: #006B3C;
      padding: 1px 4px;
      border-radius: 3px;
      border: 1px solid #C4DEC0;
    }
    img {
      max-width: 100%;
      height: auto;
      display: block;
      margin: 10px auto 4px auto;
      border-radius: 4px;
      border: 1px solid #D0E0D8;
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
    }
    em {
      display: block;
      text-align: center;
      font-size: 8.5pt;
      color: #556E60;
      margin-bottom: 12px;
    }
    .figure-container {
      page-break-inside: avoid;
      text-align: center;
      margin: 12px 0;
    }
    ul, ol {
      margin-top: 4px;
      margin-bottom: 10px;
      padding-left: 24px;
    }
    li {
      margin-bottom: 4px;
    }
    hr {
      border: 0;
      border-top: 1px solid #D0E0D8;
      margin: 22px 0;
    }
    blockquote {
      border-left: 4px solid #006B3C;
      background-color: #EAF6EF;
      margin: 12px 0;
      padding: 8px 14px;
      color: #1B3A2A;
      font-style: italic;
    }
  </style>
</head>
<body>
  <div id="content"></div>
  <script>
    const rawMarkdown = ${JSON.stringify(mdContent)};
    marked.setOptions({
      gfm: true,
      breaks: false,
    });
    document.getElementById('content').innerHTML = marked.parse(rawMarkdown);
  </script>
</body>
</html>`;

  await page.setContent(htmlShell, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  console.log("Printing to PDF:", OUTPUT_PDF_PATH);
  await page.pdf({
    path: OUTPUT_PDF_PATH,
    format: "A4",
    printBackground: true,
    margin: {
      top: "16mm",
      bottom: "18mm",
      left: "14mm",
      right: "14mm",
    },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 7.5pt; width: 100%; padding: 0 14mm; display: flex; justify-content: space-between; color: #556E60; border-bottom: 0.5px solid #D0E0D8; padding-bottom: 4px;">
        <span>TokTickIT — Lab 3 Report | CPE 334 Software Engineering</span>
        <span>Nara Kosiyaporn (67070505218)</span>
      </div>
    `,
    footerTemplate: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; font-size: 7.5pt; width: 100%; padding: 0 14mm; display: flex; justify-content: space-between; color: #556E60; border-top: 0.5px solid #D0E0D8; padding-top: 4px;">
        <span>https://github.com/narakosi-dev/toktickit</span>
        <span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
      </div>
    `,
  });

  await browser.close();
  console.log("[SUCCESS] Official Lab 3 PDF generated successfully at:", OUTPUT_PDF_PATH);
}

generatePdf().catch((err) => {
  console.error("PDF generation failed:", err);
  process.exit(1);
});
