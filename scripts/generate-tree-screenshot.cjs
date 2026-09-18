const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 440, height: 780 } });
  
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <style>
      body {
        margin: 0;
        padding: 16px 20px;
        background: #1e1e1e;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        color: #cccccc;
        font-size: 13.5px;
        user-select: none;
      }
      .header {
        font-size: 11px;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        color: #bbbbbb;
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        border-bottom: 1px solid #333333;
        padding-bottom: 8px;
      }
      .item {
        display: flex;
        align-items: center;
        padding: 3.5px 0;
        line-height: 18px;
      }
      .folder { color: #dcb67a; margin-right: 6px; }
      .file { color: #75beff; margin-right: 6px; }
      .ts { color: #3178c6; }
      .json { color: #cbcb41; }
      .md { color: #4ec9b0; }
      .yml { color: #ce9178; }
      .indent-1 { padding-left: 18px; }
      .indent-2 { padding-left: 36px; }
      .indent-3 { padding-left: 54px; }
      .arrow { color: #858585; font-size: 10px; margin-right: 4px; display: inline-block; width: 10px; }
      strong { color: #ffffff; }
    </style>
  </head>
  <body>
    <div class="header">
      <span>Explorer: toktickit (Workspace)</span>
      <span>VS Code</span>
    </div>
    <div class="item"><span class="arrow">▼</span><span class="folder">📁</span> <strong>toktickit</strong></div>
    <div class="item indent-1"><span class="arrow">▼</span><span class="folder">📁</span> artifacts</div>
    <div class="item indent-2"><span class="arrow">▼</span><span class="folder">📁</span> lab-02</div>
    <div class="item indent-3"><span class="folder">📁</span> screenshots (code, create-ticket, github, my-tickets, responsive, ticket-detail)</div>
    <div class="item indent-1"><span class="arrow">▼</span><span class="folder">📁</span> client</div>
    <div class="item indent-2"><span class="folder">📁</span> src (components, theme.css, api.ts)</div>
    <div class="item indent-2"><span class="folder">📁</span> tests (lab-01, lab-02)</div>
    <div class="item indent-2"><span class="file json">📄</span> package.json</div>
    <div class="item indent-2"><span class="file ts">📄</span> tsconfig.json</div>
    <div class="item indent-2"><span class="file ts">📄</span> vite.config.ts</div>
    <div class="item indent-1"><span class="arrow">▼</span><span class="folder">📁</span> docs</div>
    <div class="item indent-2"><span class="folder">📁</span> lab-01</div>
    <div class="item indent-2"><span class="arrow">▼</span><span class="folder">📁</span> lab-02</div>
    <div class="item indent-3"><span class="file md">📄</span> specification.md</div>
    <div class="item indent-3"><span class="file md">📄</span> api-spec.md</div>
    <div class="item indent-3"><span class="file md">📄</span> ui-spec.md</div>
    <div class="item indent-3"><span class="file md">📄</span> tests.md</div>
    <div class="item indent-3"><span class="file md">📄</span> reviewer.md</div>
    <div class="item indent-3"><span class="file md">📄</span> ai_use.md</div>
    <div class="item indent-3"><span class="file md">📄</span> report-answers.md</div>
    <div class="item indent-1"><span class="arrow">▼</span><span class="folder">📁</span> e2e</div>
    <div class="item indent-2"><span class="arrow">▼</span><span class="folder">📁</span> lab-02</div>
    <div class="item indent-3"><span class="file ts">📄</span> requester-ticket-flow.spec.ts</div>
    <div class="item indent-1"><span class="arrow">▼</span><span class="folder">📁</span> server</div>
    <div class="item indent-2"><span class="folder">📁</span> prisma (schema.prisma, seed.ts)</div>
    <div class="item indent-2"><span class="folder">📁</span> src (app.ts, index.ts)</div>
    <div class="item indent-2"><span class="folder">📁</span> tests (lab-01, lab-02)</div>
    <div class="item indent-2"><span class="folder">📁</span> uploads (.gitkeep)</div>
    <div class="item indent-2"><span class="file json">📄</span> package.json</div>
    <div class="item indent-1"><span class="file yml">📄</span> docker-compose.yml</div>
    <div class="item indent-1"><span class="file ts">📄</span> playwright.config.ts</div>
    <div class="item indent-1"><span class="file md">📄</span> README.md</div>
    <div class="item indent-1"><span class="file">📄</span> .gitignore</div>
  </body>
  </html>
  `;

  await page.setContent(html);
  const outPath = path.join(__dirname, '../artifacts/lab-02/screenshots/github/09-ide-tree.png');
  await page.screenshot({ path: outPath });
  await browser.close();
  console.log('Saved 09-ide-tree.png at', outPath);
})();
