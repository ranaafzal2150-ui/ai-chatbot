// server/index.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

// Chat endpoint
app.post("/api/gemini", async (req, res) => {
  const { message } = req.body;

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" +
        process.env.GEMINI_API_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: message }],
            },
          ],
        }),
      }
    );

    const data = await response.json();
    console.log("Gemini API response:", JSON.stringify(data, null, 2));

    const reply =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No response from Gemini.";
    res.json({ reply });
  } catch (error) {
    console.error("Gemini API error:", error);
    res.status(500).json({ reply: "Error connecting to Gemini API." });
  }
});

// Gemini API Key health check
const testKey = async () => {
  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models",
      {
        method: "GET",
        headers: {
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
      }
    );
    const data = await res.json();
    if (data.error) {
      console.error("❌ Gemini API Key invalid:", data.error.message);
    } else {
      console.log(
        "✅ Gemini API Key is valid. Models available:",
        data.models?.map((m) => m.name)
      );
    }
  } catch (err) {
    console.error("❌ Failed to test Gemini API Key:", err);
  }
};

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  testKey(); // Run key check on startup
});
