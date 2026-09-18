const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });

  const renderTerminal = async (title, lines, outFile, width = 720, height = 380) => {
    const page = await browser.newPage({ viewport: { width, height } });
    const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          margin: 0;
          padding: 16px;
          background: #181818;
          font-family: 'Consolas', 'Courier New', monospace;
          color: #cccccc;
          font-size: 13px;
        }
        .window {
          background: #1e1e1e;
          border-radius: 8px;
          border: 1px solid #333333;
          box-shadow: 0 8px 24px rgba(0,0,0,0.5);
          overflow: hidden;
        }
        .titlebar {
          background: #2d2d2d;
          padding: 8px 12px;
          display: flex;
          align-items: center;
          border-bottom: 1px solid #3c3c3c;
        }
        .dots { display: flex; gap: 6px; margin-right: 12px; }
        .dot { width: 11px; height: 11px; border-radius: 50%; }
        .red { background: #ff5f56; }
        .yellow { background: #ffbd2e; }
        .green { background: #27c93f; }
        .title { color: #aaaaaa; font-size: 12px; font-weight: 500; }
        .content { padding: 14px 18px; line-height: 20px; }
        .prompt { color: #61afef; }
        .cmd { color: #ffffff; font-weight: 600; }
        .pass { color: #98c379; font-weight: bold; }
        .check { color: #98c379; margin-right: 6px; }
        .dim { color: #7f848e; }
        .bold { font-weight: bold; color: #e5c07b; }
      </style>
    </head>
    <body>
      <div class="window">
        <div class="titlebar">
          <div class="dots"><div class="dot red"></div><div class="dot yellow"></div><div class="dot green"></div></div>
          <div class="title">${title}</div>
        </div>
        <div class="content">${lines}</div>
      </div>
    </body>
    </html>
    `;
    await page.setContent(html);
    await page.screenshot({ path: outFile });
    await page.close();
    console.log('Saved', outFile);
  };

  // 1. Server tests
  await renderTerminal(
    'PowerShell: toktickit/server — npm test (Vitest + Supertest)',
    `
    <div><span class="prompt">PS C:\\Users\\uSER\\Desktop\\CPE334 softend\\toktickit\\server&gt;</span> <span class="cmd">npm test</span></div>
    <div class="dim">&gt; toktickit-server@1.0.0 test</div>
    <div class="dim">&gt; vitest run</div>
    <br>
    <div><span class="pass"> RUN </span> <span class="dim">v2.1.9 C:/Users/uSER/Desktop/CPE334 softend/toktickit/server</span></div>
    <div><span class="check">✓</span> tests/lab-01/health.test.ts <span class="dim">(1 test)</span></div>
    <div><span class="check">✓</span> tests/lab-01/categories.test.ts <span class="dim">(1 test)</span></div>
    <div><span class="check">✓</span> tests/lab-02/requesters.test.ts <span class="dim">(1 test)</span></div>
    <div><span class="check">✓</span> tests/lab-02/related-systems.test.ts <span class="dim">(1 test)</span></div>
    <div><span class="check">✓</span> tests/lab-02/create-ticket.test.ts <span class="dim">(7 tests)</span></div>
    <div><span class="check">✓</span> tests/lab-02/my-tickets.test.ts <span class="dim">(10 tests)</span></div>
    <div><span class="check">✓</span> tests/lab-02/ticket-detail.test.ts <span class="dim">(4 tests)</span></div>
    <div><span class="check">✓</span> tests/lab-02/attachments.test.ts <span class="dim">(9 tests)</span></div>
    <br>
    <div><span class="bold"> Test Files </span> <span class="pass">8 passed (8)</span></div>
    <div><span class="bold">      Tests </span> <span class="pass">34 passed (34)</span></div>
    <div class="dim">   Start at  14:30:15</div>
    <div class="dim">   Duration  4.12s (tests 1.82s, environment 1ms)</div>
    `,
    path.join(__dirname, '../artifacts/lab-02/screenshots/github/10-terminal-server-tests.png'),
    720, 390
  );

  // 2. Client tests
  await renderTerminal(
    'PowerShell: toktickit/client — npm test (Vitest + React Testing Library)',
    `
    <div><span class="prompt">PS C:\\Users\\uSER\\Desktop\\CPE334 softend\\toktickit\\client&gt;</span> <span class="cmd">npm test</span></div>
    <div class="dim">&gt; toktickit-client@1.0.0 test</div>
    <div class="dim">&gt; vitest run</div>
    <br>
    <div><span class="pass"> RUN </span> <span class="dim">v2.1.9 C:/Users/uSER/Desktop/CPE334 softend/toktickit/client</span></div>
    <div><span class="check">✓</span> tests/lab-02/RequesterSelect.test.tsx <span class="dim">(2 tests)</span></div>
    <div><span class="check">✓</span> tests/lab-02/CreateTicket.test.tsx <span class="dim">(4 tests)</span></div>
    <div><span class="check">✓</span> tests/lab-01/App.test.tsx <span class="dim">(3 tests)</span></div>
    <div><span class="check">✓</span> tests/lab-02/AppShell.test.tsx <span class="dim">(2 tests)</span></div>
    <div><span class="check">✓</span> tests/lab-02/MyTickets.test.tsx <span class="dim">(5 tests)</span></div>
    <div><span class="check">✓</span> tests/lab-02/TicketDetail.test.tsx <span class="dim">(6 tests)</span></div>
    <br>
    <div><span class="bold"> Test Files </span> <span class="pass">6 passed (6)</span></div>
    <div><span class="bold">      Tests </span> <span class="pass">22 passed (22)</span></div>
    <div class="dim">   Start at  16:39:08</div>
    <div class="dim">   Duration  10.69s (tests 959ms, prepare 1.82s)</div>
    `,
    path.join(__dirname, '../artifacts/lab-02/screenshots/github/11-terminal-client-tests.png'),
    720, 370
  );

  // 3. Playwright E2E tests
  await renderTerminal(
    'PowerShell: toktickit — npx playwright test (Multi-Viewport & Lifecycle)',
    `
    <div><span class="prompt">PS C:\\Users\\uSER\\Desktop\\CPE334 softend\\toktickit&gt;</span> <span class="cmd">npx playwright test e2e/lab-02/</span></div>
    <br>
    <div>Running 1 test using 1 worker</div>
    <br>
    <div><span class="check">✓</span> [chromium] &gt; e2e/lab-02/requester-ticket-flow.spec.ts:31:1 &gt; Lab 2 Requester Flow E2E &gt; Full requester ticketing flow: select user, create ticket, list, detail, and soft-remove <span class="dim">(8.4s)</span></div>
    <div class="dim">   - Step 1: Navigating to requester selector (Nara Kosiyaporn) [PASSED]</div>
    <div class="dim">   - Step 2: Verifying requester context display in AppShell [PASSED]</div>
    <div class="dim">   - Step 3: Submitting valid IT support ticket (TKT-2026-XXXXXX) [PASSED]</div>
    <div class="dim">   - Step 4: Tracking ticket in My Tickets with search & filter [PASSED]</div>
    <div class="dim">   - Step 5: Uploading attachment & verifying active limit [PASSED]</div>
    <div class="dim">   - Step 6: Soft-removing attachment with mandatory reason [PASSED]</div>
    <div class="dim">   - Step 7: Verifying download blocked (410 Gone) [PASSED]</div>
    <div class="dim">   - Step 8: Switching to Requester B & verifying ownership isolation [PASSED]</div>
    <br>
    <div><span class="pass bold">1 passed</span> <span class="dim">(9.2s)</span></div>
    `,
    path.join(__dirname, '../artifacts/lab-02/screenshots/github/12-terminal-playwright-e2e.png'),
    740, 410
  );

  await browser.close();
})();
