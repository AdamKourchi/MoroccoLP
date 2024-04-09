import puppeteer from "puppeteer";
import express from "express";

const app = express();
const PORT = 3000;

let scrapingLogs = []; // Array to store scraping logs

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

app.get("/scrape", async (req, res) => {
  let { cities } = req.query; // Receive the cities array from the request query parameters
  if (typeof cities === 'string') {
    cities = cities.split(',');
  }

  (async () => {
    const browser = await puppeteer.launch({
      headless: true
     // channel: "chrome",
      //executablePath: "/usr/bin/google-chrome-stable",
    });

    const page = await browser.newPage();

    const delay = (ms) => new Promise((res) => setTimeout(res, ms));

    let allPosts = []; // Initialize an empty array to store all posts

    for (const city of cities) {
      console.log(`Scraping posts from ${city}`);
      scrapingLogs.push(`Scraping posts from ${city}`);
      await page.goto(
        `https://www.licence-professionnelle-maroc.com/search/label/${city}`, {timeout: 0}
      );
      const showMoreButton = await page.$(".loadMorePosts a");
      const nomorePosts = await page.$(".noMorePosts");
      console.log(showMoreButton, nomorePosts);
      while (
        (await page.evaluate(
          (element) => window.getComputedStyle(element).display,
          nomorePosts
        )) === "none"
      ) {
        console.log("Clicked on Show More");
        scrapingLogs.push("Aquiring more posts from the city");
        await showMoreButton.evaluate((b) => b.click());
        await delay(1000);
      }

      const posts = await page.$$eval(
        ".post-outer",
        async (posts, city) => {
          const result = [];

          for (const post of posts) {
            const cityName = city;
            const titleElement = post.querySelector(".posts-titles a");
            const title = titleElement.textContent.trim();
            const href = titleElement.href;

            if (title.toLowerCase().startsWith("licence")) {
              result.push({ cityName, title, href });
            }
          }

          return result;
        },
        city
      );
      allPosts = allPosts.concat(posts); // Concatenate the posts from this city to the allPosts array
    }

    console.log(allPosts);
    await browser.close();
    scrapingLogs.push("Scraping completed");
    res.json(allPosts);

  })();
});

app.get("/logs", (req, res) => {
  res.json(scrapingLogs);
});

app.get("/emptylogs", (req, res) => {
  scrapingLogs = [];
  res.json({ message: "Logs emptied" });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

server.setTimeout(100000);
