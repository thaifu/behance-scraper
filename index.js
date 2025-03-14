const express = require('express');
const puppeteer = require('puppeteer-core');
const app = express();

const chromium = require('@sparticuz/chromium'); // Railway поддерживает эту сборку

app.get('/scrape', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) return res.status(400).send('No URL provided');

  let browser;
  try {
    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.goto(targetUrl, { waitUntil: 'networkidle2' });

    await page.waitForSelector('[aria-label$="appreciations"]', { timeout: 10000 });
    await page.waitForSelector('[aria-label$="views"]', { timeout: 10000 });

    const result = await page.evaluate(() => {
      const likesElem = document.querySelector('[aria-label$="appreciations"]');
      const viewsElem = document.querySelector('[aria-label$="views"]');

      const likes = likesElem?.getAttribute('aria-label')?.match(/\d[\d., ]*/)?.[0] || 'нет';
      const views = viewsElem?.getAttribute('aria-label')?.match(/\d[\d., ]*/)?.[0] || 'нет';

      return { views, likes };
    });

    res.json(result);
  } catch (e) {
    res.status(500).send('Error scraping: ' + e.message);
  } finally {
    if (browser) await browser.close();
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server running on port', PORT));
