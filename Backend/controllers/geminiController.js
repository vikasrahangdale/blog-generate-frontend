// controllers/geminiController.js
const axios = require("axios");

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const callGemini = async (apiKey, prompt) => {
  const { data } = await axios.post(
    `${GEMINI_URL}?key=${apiKey}`,
    {
      contents: [
        {
          parts: [{ text: prompt }]
        }
      ]
    },
    {
      headers: { "Content-Type": "application/json" }
    }
  );

  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return text;
};

const extractJson = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
};

const generateBlogWithGemini = async (keyword) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("Gemini API key missing in ENV file");
    }

const draftPrompt = `
You are an advanced SEO keyword intelligence system.

User keyword: "${keyword}"

==============================
PART 1 — SMART TREND ANALYSIS
==============================

Generate **3 categories** of realistic search terms:

1) TRENDING_STYLE_KEYWORDS (4–6 items)
   - Inspired by current year search behavior
   - Seasonal patterns (e.g., summer, festivals, exams)
   - Viral social patterns (e.g., reels, AI tools, challenges)
   - Tech/industry updates (without news or politics)

2) LONG_TAIL_KEYWORDS (4–6 items)
   - 4–7 word phrases
   - Strong user intent (how, best, for beginners, near me)

3) QUESTION_BASED_QUERIES (4–6 items)
   - Similar to Google People Also Ask
   - Must start with:
     - how / what / why / is / can / should

RULES:
- MUST stay related to the original user keyword
- No random or unrelated trending topics
- No medical, legal, political, or adult content
- No news reporting

==============================
PART 2 — PRIMARY KEYWORD PICK
==============================

Select **1 PRIMARY_KEYWORD** that:
- has highest search intent
- is valuable & clear
- still aligned with user keyword
- not clickbait

==============================
PART 3 — BLOG GENERATION
==============================

Using the PRIMARY_KEYWORD, generate:

- <h1> title
- 600–900 words
- SEO-friendly structure
- <h2> and <h3> headings
- short paragraphs (max 4 lines)
- examples + steps + tips
- 20–30 word excerpt
- HTML blog + clean text version (no HTML)

==============================
STRICT RETURN FORMAT
==============================

Return ONLY valid JSON:

{
  "primaryKeyword": "",
  "trendingKeywords": [],
  "longTailKeywords": [],
  "questionKeywords": [],
  "title": "",
  "excerpt": "",
  "content": "",
  "cleanText": ""
}

NO markdown
NO explanation
NO extra text
`;


    const draftText = await callGemini(apiKey, draftPrompt);
    let draftBlog = extractJson(draftText);

    if (!draftBlog) {
      console.warn("Draft JSON parse failed, using fallback draft.");
      draftBlog = {
        title: `${keyword} – Draft Guide`,
        excerpt: `Draft excerpt about ${keyword}.`,
        content: `<h1>${keyword} – Draft Guide</h1><p>Draft content for ${keyword}.</p>`,
        cleanText: `Draft clean text for ${keyword}.`
      };
    }

    const refinePrompt = `
You are an expert editor for SEO blog content.

Below is a DRAFT blog in JSON format:

${JSON.stringify(draftBlog, null, 2)}

====================
YOUR TASK:
====================
- Fix grammar, spelling and punctuation
- Improve flow and readability
- Make it more engaging & modern
- Keep HTML tags valid in "content"
- Keep "cleanText" as a plain-text version (no HTML)
- Do NOT change the overall topic or meaning
- Keep title and excerpt catchy & SEO-friendly

====================
VERY IMPORTANT:
====================
Return ONLY corrected JSON in the SAME structure:

{
  "title": "",
  "excerpt": "",
  "content": "",
  "cleanText": ""
}

NO markdown, NO explanation, NO extra text.
`;

    let finalBlog = draftBlog; // default

    try {
      const refinedText = await callGemini(apiKey, refinePrompt);
      const refinedBlog = extractJson(refinedText);

      if (refinedBlog) {
        finalBlog = refinedBlog;
      } else {
        console.warn("Refine JSON parse failed, using draft blog as final.");
      }
    } catch (refErr) {
      console.warn("Refine call failed, using draft blog. Error:", refErr.message);
    }

    return finalBlog;

  } catch (error) {
    console.error("Gemini API Error:", error.message);

    // FINAL HARD FALLBACK
    return {
      title: `${keyword} – Complete Guide`,
      excerpt: `Short overview of ${keyword}.`,
      content: `
        <h1>${keyword} – Complete Guide</h1>
        <p>This fallback explains ${keyword} and why it's important.</p>
      `,
      cleanText: `${keyword} is an important topic. This is fallback clean text.`
    };
  }
};

module.exports = { generateBlogWithGemini };
