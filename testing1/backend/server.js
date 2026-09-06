const express = require("express");
const axios = require("axios");
const cors = require("cors");
require("dotenv").config();

const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Gemini client (SDK)
const ai = new GoogleGenAI({});

// ---------------- TEST ROUTE ----------------
app.get("/", (req, res) => {
  res.send("Backend is running ✅");
});

// ---------------- NEWS BY CATEGORY & COUNTRY ----------------
app.get("/api/news", async (req, res) => {
  const category = req.query.category || "general";
  const country = req.query.country || "us";

  try {
    let url = `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&apiKey=${process.env.NEWS_API_KEY}`;
    let response = await axios.get(url);

    // fallback 1
    if (response.data.articles.length === 0 && category !== "general") {
      url = `https://newsapi.org/v2/top-headlines?country=${country}&apiKey=${process.env.NEWS_API_KEY}`;
      response = await axios.get(url);
    }

    // fallback 2
    if (response.data.articles.length === 0) {
      const countryNames = { us: "USA", in: "India", gb: "UK", ca: "Canada", au: "Australia" };
      const searchQuery = `${countryNames[country] || country} ${category}`;
      url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(searchQuery)}&language=en&apiKey=${process.env.NEWS_API_KEY}`;
      response = await axios.get(url);
    }

    res.json(response.data);
  } catch (error) {
    console.error("News Error:", error.message);
    res.status(500).json({ message: "Failed to fetch news" });
  }
});

// ---------------- SEARCH NEWS ----------------
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) {
    return res.status(400).json({ message: "Search query is required" });
  }

  try {
    const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&apiKey=${process.env.NEWS_API_KEY}`;
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error("Search Error:", error.message);
    res.status(500).json({ message: "Search failed" });
  }
});

// ---------------- GEMINI SUMMARY ----------------
app.post("/api/summarize", async (req, res) => {
  const { articleText } = req.body;

  if (!articleText) {
    return res.status(400).json({ message: "Article text is required" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Summarize the following article in one short paragraph:\n\n${articleText}`,
    });

    res.json({
      success: true,
      summary: response.text,
    });
  } catch (error) {
    console.error("Gemini Summary Error:", error);
    res.status(500).json({ success: false, message: "Gemini summarization failed" });
  }
});

// ---------------- GEMINI SENTIMENT ----------------
app.post("/api/sentiment", async (req, res) => {
  const { articleText } = req.body;

  if (!articleText) {
    return res.status(400).json({ message: "Article text is required" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `
Analyze the sentiment of the text below.
Reply with ONLY ONE WORD: Positive, Negative, or Neutral.

Text:
"${articleText}"
`,
    });

    res.json({
      success: true,
      sentiment: response.text.trim(),
    });
  } catch (error) {
    console.error("Gemini Sentiment Error:", error);
    res.status(500).json({ success: false, message: "Gemini sentiment failed" });
  }
});

// ---------------- START SERVER ----------------
app.listen(PORT, () => {
  console.log(`✅ Backend server running at http://localhost:${PORT}`);
});
