const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('@playwright/test');

const DIST_DIR = path.join(__dirname, '../client/dist');
const OUTPUT_DIR = path.join(__dirname, '../artifacts/lab-04/screenshots/actions-taken');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function startServer(port = 5174) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(DIST_DIR, req.url.split('?')[0]);
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(DIST_DIR, 'index.html');
    }
    const ext = path.extname(filePath);
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      console.log(`Preview server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

const mockStaffUser = {
  id: 2,
  username: 'somchai',
  fullName: 'Somchai Prasert',
  role: 'IT_Staff',
  email: 'somchai@example.com',
  mustChangePassword: false,
};

const mockRequesterUser = {
  id: 10,
  username: 'komsan',
  fullName: 'Dr. Komsan Tech',
  role: 'Requester',
  email: 'komsan@example.com',
  mustChangePassword: false,
};

const mockStaffMembers = [
  { id: 1, fullName: 'Anan Sukjai', email: 'anan@example.com', role: 'Administrator' },
  { id: 2, fullName: 'Somchai Prasert', email: 'somchai@example.com', role: 'IT_Staff' },
  { id: 3, fullName: 'Wichai Thongdee', email: 'wichai@example.com', role: 'IT_Staff' },
];

const mockActionsTaken = [
  {
    id: 1,
    ticketId: 101,
    actionDateTime: '2026-10-29T08:30:00.000Z',
    performedById: 2,
    performedBy: { id: 2, fullName: 'Somchai Prasert', role: 'IT_Staff' },
    description: 'Inspected rack switch B3-SW01 and identified CRC errors on SFP port 24.',
    result: 'Replaced faulty OM3 fiber patch cord and cleaned optical transceivers.',
    followUpRequired: false,
    followUpNote: null,
    attachmentNotes: 'optical-power-meter-reading.log',
    createdAt: '2026-10-29T08:45:00.000Z',
  },
  {
    id: 2,
    ticketId: 101,
    actionDateTime: '2026-10-29T10:15:00.000Z',
    performedById: 3,
    performedBy: { id: 3, fullName: 'Wichai Thongdee', role: 'IT_Staff' },
    description: 'Monitored port statistics and ran 15-minute ping continuity test.',
    result: 'Zero packet loss observed; interface counters reset and clear.',
    followUpRequired: true,
    followUpNote: 'Check switch syslog tomorrow morning at 09:00 for any recurring link down events.',
    attachmentNotes: null,
    createdAt: '2026-10-29T10:30:00.000Z',
  },
];

const mockTicketDetail = {
  id: 101,
  ticketNumber: 'TKT-2026-000101',
  ticketDate: '2026-10-29T08:00:00.000Z',
  summary: 'Core Switch B3 SFP Port 24 Flapping & Packet Drops',
  description: 'Fiber connection between Building 3 and Data Center drops every 5 minutes.',
  priority: 'High',
  itPriority: 'High',
  status: 'In_Progress',
  version: 3,
  resolvedIndicated: false,
  requesterId: 10,
  requester: { id: 10, name: 'Dr. Komsan Tech', email: 'komsan@example.com' },
  assignedTo: { id: 2, name: 'Somchai Prasert', email: 'somchai@example.com' },
  category: { id: 1, name: 'Network Infrastructure' },
  relatedSystem: { id: 2, name: 'Campus LAN Backbone' },
  attachments: [],
  internalNotes: [],
  publicComments: [],
  activityLogs: [],
  createdAt: '2026-10-29T08:00:00.000Z',
};

async function main() {
  const server = await startServer(5174);
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 960 },
  });

  const page = await context.newPage();
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  page.on('requestfailed', req => console.log('REQ FAILED:', req.url(), req.failure()?.errorText));

  let currentUser = mockStaffUser;

  await page.route('**/api/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/api/auth/me')) {
      return route.fulfill({ json: { user: currentUser } });
    }
    if (url.includes('/api/staff/members')) {
      return route.fulfill({ json: mockStaffMembers });
    }
    if (url.includes('/api/tickets/101/comments')) {
      return route.fulfill({ json: [] });
    }
    if (url.includes('/api/tickets/101/internal-notes')) {
      return route.fulfill({ json: [] });
    }
    if (url.includes('/api/tickets/101/actions-taken')) {
      return route.fulfill({
        json: {
          ticketId: 101,
          ticketNumber: 'TKT-2026-000101',
          totalActions: mockActionsTaken.length,
          actionsTaken: mockActionsTaken,
        },
      });
    }
    if (url.includes('/api/staff/tickets/101')) {
      return route.fulfill({ json: mockTicketDetail });
    }
    if (url.includes('/api/tickets/101')) {
      return route.fulfill({ json: mockTicketDetail });
    }
    if (url.includes('/api/staff/tickets')) {
      return route.fulfill({
        json: {
          tickets: [mockTicketDetail],
          pagination: { page: 1, limit: 20, totalCount: 1, totalPages: 1 },
          stats: { total: 1, new: 0, inProgress: 1, waiting: 0, resolved: 0 },
        },
      });
    }
    if (url.includes('/api/tickets')) {
      return route.fulfill({
        json: {
          tickets: [mockTicketDetail],
          pagination: { page: 1, limit: 10, totalCount: 1, totalPages: 1 },
        },
      });
    }
    if (url.includes('/api/categories')) {
      return route.fulfill({
        json: [
          { id: 1, name: 'Network Infrastructure' },
          { id: 2, name: 'Hardware & Workstations' },
        ],
      });
    }
    if (url.includes('/api/related-systems')) {
      return route.fulfill({
        json: [
          { id: 1, name: 'Active Directory' },
          { id: 2, name: 'Campus LAN Backbone' },
        ],
      });
    }
    if (url.includes('/api/requesters')) {
      return route.fulfill({
        json: [{ id: 10, name: 'Dr. Komsan Tech', email: 'komsan@example.com', active: true }],
      });
    }
    return route.continue();
  });

  // ================= SCENARIO 1: Staff Ticket Detail =================
  currentUser = mockStaffUser;
  await page.goto('http://localhost:5174');
  await page.evaluate(() => {
    localStorage.setItem('toktickit_auth_token', 'mock-staff-jwt-token');
  });
  await page.goto('http://localhost:5174');

  // Wait for queue to load
  await page.waitForSelector('text=TKT-2026-000101');
  console.log('Staff queue loaded. Clicking ticket...');
  await page.click('text=TKT-2026-000101');

  // Wait for Actions Taken section to appear
  await page.waitForSelector('text=Actions Taken');
  await page.waitForTimeout(600);

  // Capture Screenshot 1: Actions Taken Timeline on Staff Ticket Detail
  const s1 = path.join(OUTPUT_DIR, '01-actions-taken-timeline-staff.png');
  await page.screenshot({ path: s1, fullPage: true });
  console.log('Saved Screenshot 1:', s1);

  // ================= SCENARIO 2: Modal Create & Validation =================
  const addBtn = page.getByRole('button', { name: /\+ Add Action Taken/i });
  await addBtn.click();
  await page.waitForSelector('text=Record Action Taken');

  // Check that "Performed By" defaulted to Somchai Prasert
  const selectedStaff = await page.$eval('#performedBySelect', (el) => el.value);
  console.log('Default Performed By in modal:', selectedStaff, '(expected 2)');

  // Fill valid description and result so only the follow-up note triggers validation
  await page.fill('#actionDescription', 'Tested network fiber transceivers.');
  await page.fill('#actionResult', 'Link established with optimal dBm levels.');

  // Toggle Follow-up ON
  await page.click('#followUpSwitch');
  await page.waitForTimeout(300);

  // Click Save to trigger conditional validation error on followUpNote
  await page.click('button:has-text("Save Action Taken")');
  await page.waitForSelector('text=Follow-up note is required when follow-up is needed');

  // Capture Screenshot 2: Modal with conditional validation error & default technician
  const s2 = path.join(OUTPUT_DIR, '02-actions-taken-modal-validation.png');
  await page.screenshot({ path: s2, fullPage: true });
  console.log('Saved Screenshot 2:', s2);

  // Close modal via Escape key
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);

  // ================= SCENARIO 3: Requester Read-Only View =================
  currentUser = mockRequesterUser;
  await page.evaluate(() => {
    localStorage.setItem('toktickit_auth_token', 'mock-requester-jwt-token');
    localStorage.setItem('current_requester_id', '10');
  });
  await page.goto('http://localhost:5174');

  // Wait for My Tickets table
  await page.waitForSelector('text=TKT-2026-000101');
  console.log('Requester tickets loaded. Clicking ticket...');
  await page.click('text=TKT-2026-000101');

  // Wait for Actions Taken section in requester view
  await page.waitForSelector('text=Actions Taken');
  await page.waitForTimeout(600);

  // Capture Screenshot 3: Requester Read-Only view (no Add / Edit buttons)
  const s3 = path.join(OUTPUT_DIR, '03-actions-taken-requester-readonly.png');
  await page.screenshot({ path: s3, fullPage: true });
  console.log('Saved Screenshot 3:', s3);

  await browser.close();
  server.close();
  console.log('All 3 screenshots captured successfully!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
