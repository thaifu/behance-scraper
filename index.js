const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const { parse } = require("json2csv");

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/scrape", async (req, res) => {
  let urls = req.query.urls;
  if (!urls) {
    return res.status(400).json({ error: "Missing 'urls' query parameter" });
  }

  if (typeof urls === "string") {
    urls = urls.split("\n").map((url) => url.trim()).filter(Boolean);
  }

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const results = [];

  for (const url of urls) {
    const page = await browser.newPage();
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForSelector(".Project-projectStat-ZdT span[title]", {
        timeout: 15000,
      });

      const data = await page.evaluate(() => {
        const stats = document.querySelectorAll(".Project-projectStat-ZdT span[title]");
        const views = stats[1]?.getAttribute("title") || "нет";
        const likes = stats[0]?.getAttribute("title") || "нет";
        return { views, likes };
      });

      results.push({ url, ...data });
    } catch (error) {
      results.push({ url, error: error.message });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  // CSV
  const csv = parse(results, { fields: ["url", "likes", "views"] });
  fs.writeFileSync("results.csv", csv);

  res.json({
    message: "✅ Готово! Ссылки обработаны.",
    data: results,
    csv: "Файл сохранён: results.csv",
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`);
});
