const fs = require('fs');
const puppeteer = require('puppeteer');

(async () => {
  const out = [];
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });
  const page = await browser.newPage();

  page.on('console', msg => {
    const text = `[console:${msg.type()}] ${msg.text()}`;
    out.push(text);
    console.log(text);
  });

  page.on('pageerror', err => {
    const text = `[pageerror] ${err.toString()}`;
    out.push(text);
    console.error(text);
  });

  const url = process.env.TEST_URL || 'http://localhost:5176/campo';
  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

  // Wait for the map controls panel to appear
  await page.waitForSelector('.card', { timeout: 20000 }).catch(() => {});

  // Try to click the 'Mão Livre' button
  const freehandBtn = await page.$x("//button[contains(., 'Mão Livre') or contains(., 'Mão Livre (Rua)')]");
  if (freehandBtn && freehandBtn.length) {
    await freehandBtn[0].click();
    console.log('Clicked Mão Livre');
    await page.waitForTimeout(500);
  } else {
    console.warn('Mão Livre button not found');
  }

  // Wait for the map container
  const mapSelector = '.gm-style';
  await page.waitForSelector(mapSelector, { timeout: 20000 });
  const map = await page.$(mapSelector);
  const box = await map.boundingBox();
  const startX = box.x + box.width * 0.2;
  const startY = box.y + box.height * 0.5;
  const endX = box.x + box.width * 0.8;
  const endY = startY;

  // Draw freehand: mousedown, move, mouseup
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  // draw with several steps
  const steps = 8;
  for (let i = 1; i <= steps; i++) {
    const x = startX + ((endX - startX) * i) / steps;
    const y = startY + Math.sin(i / steps * Math.PI) * 10;
    await page.mouse.move(x, y, { steps: 2 });
    await page.waitForTimeout(50);
  }
  await page.mouse.up();
  console.log('Drew freehand');

  await page.waitForTimeout(500);

  // Click Borracha button
  const eraserBtn = await page.$x("//button[contains(., 'Borracha') or contains(., 'Borracha')]");
  if (eraserBtn && eraserBtn.length) {
    await eraserBtn[0].click();
    console.log('Clicked Borracha');
    await page.waitForTimeout(300);
  } else {
    console.warn('Borracha button not found');
  }

  // Erase: drag across the same area
  const eraseStartX = startX + 10;
  const eraseStartY = startY - 10;
  const eraseEndX = endX - 10;
  const eraseEndY = startY + 10;

  await page.mouse.move(eraseStartX, eraseStartY);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    const x = eraseStartX + ((eraseEndX - eraseStartX) * i) / steps;
    const y = eraseStartY + ((eraseEndY - eraseStartY) * i) / steps;
    await page.mouse.move(x, y, { steps: 2 });
    await page.waitForTimeout(50);
  }
  await page.mouse.up();
  console.log('Performed erase drag');

  // Wait for any async commits
  await page.waitForTimeout(1000);

  // Save logs
  const outPath = 'scripts/auto_erase_test_output.txt';
  fs.writeFileSync(outPath, out.join('\n'));
  console.log('Saved logs to', outPath);

  await browser.close();
  process.exit(0);
})();
