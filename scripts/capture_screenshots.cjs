const http = require('http');
const fs = require('fs');
const path = require('path');

// Resolve playwright from ASCEND node_modules
const playwrightPath = path.resolve(__dirname, '..', '..', 'ASCEND', 'node_modules', 'playwright');
const { chromium } = require(playwrightPath);

const DIST_DIR = path.resolve(__dirname, '..', 'dist');
const SCREENSHOTS_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots');
const ARTIFACTS_DIR = path.resolve(__dirname, '..', 'artifacts');

[SCREENSHOTS_DIR, ARTIFACTS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  const filePath = path.join(DIST_DIR, reqPath.replace(/^\//, ''));

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
    });
    fs.createReadStream(filePath).pipe(res);
  } else {
    const fallbackIndex = path.join(DIST_DIR, 'index.html');
    if (fs.existsSync(fallbackIndex)) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      fs.createReadStream(fallbackIndex).pipe(res);
    } else {
      res.writeHead(404);
      res.end('Not Found');
    }
  }
});

async function capture() {
  const PORT = 5199;
  await new Promise((resolve) => server.listen(PORT, resolve));
  console.log(`Static server running on http://localhost:${PORT}`);

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  });

  const saveBoth = async (page, filename) => {
    const pathDocs = path.join(SCREENSHOTS_DIR, filename);
    const pathArts = path.join(ARTIFACTS_DIR, filename);
    await page.screenshot({ path: pathDocs, fullPage: false });
    fs.copyFileSync(pathDocs, pathArts);
    console.log(`📸 Saved ${filename}`);
  };

  try {
    // 1. Desktop context (1440x900)
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);

    // Shot 1: Operations Desk
    await saveBoth(page, '01-operations-desk.png');

    // Trigger Scenario 1 to show active conflict in Conflict Inbox
    const tabScenarios = page.locator('button:has-text("Guided Scenarios")');
    await tabScenarios.click();
    await page.waitForTimeout(500);

    // Click load on Campus Conflict scenario
    const loadBtn = page.locator('button:has-text("Load Scenario in Lab")').first();
    await loadBtn.click();
    await page.waitForTimeout(600);

    // Shot 8: Hero Showcase Cover with active conflict
    await saveBoth(page, '08-relay-showcase-cover.png');

    // Shot 2: Conflict Inbox
    const tabConflicts = page.locator('button:has-text("Conflict Inbox")');
    await tabConflicts.click();
    await page.waitForTimeout(500);
    await saveBoth(page, '02-conflict-inbox.png');

    // Shot 3: Transport History
    const tabHistory = page.locator('button:has-text("Transport & Causal History")');
    await tabHistory.click();
    await page.waitForTimeout(500);
    await saveBoth(page, '03-transport-history.png');

    // Shot 4: Guided Scenarios
    await tabScenarios.click();
    await page.waitForTimeout(500);
    await saveBoth(page, '04-guided-scenarios.png');

    // Shot 5: Replay & Export
    const tabExport = page.locator('button:has-text("Replay & Export")');
    await tabExport.click();
    await page.waitForTimeout(500);
    await saveBoth(page, '05-replay-export.png');

    await context.close();

    // 2. Tablet context (1024x768)
    const tabletContext = await browser.newContext({
      viewport: { width: 1024, height: 768 },
      deviceScaleFactor: 2,
    });
    const tabletPage = await tabletContext.newPage();
    await tabletPage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    await tabletPage.waitForTimeout(600);
    await saveBoth(tabletPage, '06-tablet-1024.png');
    await tabletContext.close();

    // 3. Mobile context (390x844)
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
    });
    const mobilePage = await mobileContext.newPage();
    await mobilePage.goto(`http://localhost:${PORT}/`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(600);
    await saveBoth(mobilePage, '07-mobile-390.png');
    await mobileContext.close();

    console.log('🎉 All 8 screenshots captured successfully!');
  } finally {
    await browser.close();
    server.close();
  }
}

capture().catch((err) => {
  console.error('Error during screenshot capture:', err);
  process.exit(1);
});
