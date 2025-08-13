const express = require('express');
const archiver = require('archiver');
const puppeteer = require('puppeteer');
const dayjs = require('dayjs');

const router = express.Router();

/**
 * GET /calendar/download?year=2025&months=12&startMonth=1
 * - year: Gregorian year
 * - startMonth: 1–12 (defaults to 1)
 * - months: how many consecutive months to capture (defaults to 12)
 */
router.get('/download', async (req, res) => {
  const year = Number(req.query.year) || dayjs().year();
  const startMonth = Number(req.query.startMonth) || 1; // 1-12
  const months = Math.min(Number(req.query.months) || 12, 24);

  // Where your SPA is served from (prod site or local dev)
  const ORIGIN = process.env.PUBLIC_SITE_ORIGIN || 'http://localhost:5173';

  // Stream a zip to the client
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="calendar-${year}.zip"`);

  const archive = archiver('zip', { zlib: { level: 9 } });
  archive.on('error', err => { throw err; });
  archive.pipe(res);

  const browser = await puppeteer.launch({
    headless: 'new', // puppeteer >=20
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1600, height: 1100 } // roomy so the whole month fits
  });

  try {
    const page = await browser.newPage();

    for (let i = 0; i < months; i++) {
      const m = ((startMonth - 1 + i) % 12) + 1;
      const y = year + Math.floor((startMonth - 1 + i) / 12);

      // Hit the SAME page you use in the browser, in print mode.
      // CalendarView reads these query params (we’ll wire it below).
      const url = `${ORIGIN}/?print=1&year=${y}&month=${m}`;
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });

      // Wait until ExplanationPanel finished loading
      await page.waitForSelector('#print-ready[data-state="ready"]', { timeout: 120000 });

      // Optional: ensure we’re scrolled to top for a clean capture
      await page.evaluate(() => window.scrollTo(0, 0));

      // Screenshot of the full calendar viewport
      const png = await page.screenshot({ type: 'png', fullPage: false });

      const label = dayjs(`${y}-${String(m).padStart(2,'0')}-01`).format('YYYY-MM');
      archive.append(png, { name: `calendar-${label}.png` });
    }

    await archive.finalize();
  } catch (err) {
    console.error('Download error:', err);
    // End the zip stream on error
    try { await archive.abort(); } catch {}
    res.status(500).end();
  } finally {
    await browser.close();
  }
});

module.exports = router;
