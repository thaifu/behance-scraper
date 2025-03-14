const express = require("express");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Функция для парсинга одного проекта
async function scrapeProject(url, page) {
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Ждём появления нужных блоков
    await page.waitForSelector(".Project-projectStat-ZdT span[title]", { timeout: 15000 });

    // Получаем данные
    const result = await page.evaluate(() => {
      const stats = document.querySelectorAll(".Project-projectStat-ZdT span[title]");
      const views = stats[1]?.getAttribute("title") || "нет";
      const likes = stats[0]?.getAttribute("title") || "нет";
      return { views, likes };
    });

    return { url, ...result };
  } catch (error) {
    return { url, views: "ошибка", likes: "ошибка", error: error.message };
  }
}

app.get("/scrape", async (req, res) => {
  // Получаем список url из параметров запроса: ?url=...&url=...
  const urls = req.query.url
    ? Array.isArray(req.query.url)
      ? req.query.url
      : [req.query.url]
    : [];

  if (urls.length === 0) {
    return res.status(400).json({ error: "Укажи хотя бы один параметр 'url'" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    const results = [];

    for (const url of urls) {
      const data = await scrapeProject(url, page);
      results.push(data);
      console.log(`✅ Готово: ${url}`);
    }

    await browser.close();

    // Создаём CSV-файл
    const csvRows = [
      ["URL", "Likes", "Views"],
      ...results.map((item) => [item.url, item.likes, item.views]),
    ];

    const csvContent = csvRows.map((row) => row.join(",")).join("\n");
    const filePath = path.join(__dirname, "results.csv");
    fs.writeFileSync(filePath, csvContent);

    res.json({
      message: "✅ Готово! Ссылки обработаны.",
      data: results,
      csv: "Файл сохранён: results.csv",
    });
  } catch (error) {
    console.error("❌ Ошибка при запуске парсера:", error.message);
    res.status(500).json({ error: "Ошибка: " + error.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен: http://localhost:${PORT}`);
});
