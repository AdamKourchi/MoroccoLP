import puppeteer from "puppeteer";
import express from "express";
import dotenv from "dotenv";
import { v4 as uuidv4 } from 'uuid';
dotenv.config();

const app = express();
const PORT = 3000;

let logsMap = new Map(); // Map to store logs for each request


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
    let requestId = uuidv4(); // Generate a unique ID for this request
    let scrapingLogs = []; // Array to store scraping logs for this request

    const browser = await puppeteer.launch(
      {args: ["--no-sandbox", "--disable-setuid-sandbox","--no-zygote","--single-process"],
      executablePath: process.env.NODE_ENV === "production" ? process.env.puppeteer_excutable_path : puppeteer.executablePath(), 
   }
    );

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

    await browser.close();
    scrapingLogs.push("Scraping completed");
    logsMap.set(requestId, scrapingLogs); // Store the logs for this request
    res.json({ requestId, posts: allPosts }); // Include the request ID in the response


  })();
});

app.get("/logs/:id", (req, res) => {
  let logs = logsMap.get(req.params.id); // Get the logs for the requested ID
  if (logs) {
    res.json(logs);
  } else {
    res.status(404).json({ message: "Logs not found" });
  }});

  app.get("/emptylogs/:id", (req, res) => {
    logsMap.delete(req.params.id); // Delete the logs for the requested ID
    res.json({ message: "Logs emptied" });
  });

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

server.setTimeout(100000);
