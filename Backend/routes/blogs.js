const express = require('express');
const router = express.Router();

const Blog = require('../models/Blog');
const Settings = require('../models/Settings');
const { generateBlogWithGemini } = require('../controllers/geminiController');
const cron = require('node-cron');

// Get Settings
const getSettings = async () => {
  let s = await Settings.findOne();
  if (!s) {
    s = await Settings.create({
      publishingFrequency: 60,
      keywords: []
    });
  }
  return s;
};

router.get('/all', async (req, res) => {
  const blogs = await Blog.find().sort({ createdAt: -1 });
  res.json(blogs);
});

router.get('/published', async (req, res) => {
  const blogs = await Blog.find({ status: 'published' }).sort({ publishedAt: -1 });
  res.json(blogs);
});

router.post('/generate', async (req, res) => {
  try {
    const settings = await getSettings();

    // ✅ FIXED: Accept array of keywords with imageUrls
    const { keywords: keywordImagePairs } = req.body;

    console.log('Received data:', req.body); // Debug log

    // 1️⃣ Validate input data
    if (!keywordImagePairs || !Array.isArray(keywordImagePairs) || keywordImagePairs.length === 0) {
      return res.status(400).json({ error: "Keywords with image URLs are required!" });
    }

    // 2️⃣ Validate each keyword-image pair
    for (const pair of keywordImagePairs) {
      if (!pair.keyword || pair.keyword.trim() === "") {
        return res.status(400).json({ error: "All keywords are required!" });
      }
      if (!pair.imageUrl || pair.imageUrl.trim() === "") {
        return res.status(400).json({ error: `Image URL is required for keyword: ${pair.keyword}` });
      }
      
      // Validate URL format
      try {
        new URL(pair.imageUrl.trim());
      } catch (error) {
        return res.status(400).json({ error: `Invalid image URL for keyword: ${pair.keyword}` });
      }
    }

    const generatedBlogs = [];

    for (const pair of keywordImagePairs) {
      try {
        const { keyword, imageUrl } = pair;

        // 3️⃣ Generate blog using Gemini
        const blogData = await generateBlogWithGemini(keyword);

        // 4️⃣ Create blog with specific image for this keyword
        const blog = await Blog.create({
          title: blogData.title,
          content: blogData.content,
          excerpt: blogData.excerpt,
          keywords: [keyword],
          image: imageUrl.trim(),        // 👈 USE SPECIFIC IMAGE FOR THIS KEYWORD
          status: "scheduled"
        });

        generatedBlogs.push(blog);

        await new Promise(resolve => setTimeout(resolve, 2000)); // avoid rate limit

      } catch (err) {
        console.log(`Error generating blog for ${pair.keyword}:`, err);
        // Continue with other keywords even if one fails
      }
    }

    res.json({
      message: `${generatedBlogs.length} blogs generated successfully!`,
      blogs: generatedBlogs
    });

  } catch (err) {
    console.error('Generation error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, content } = req.body;

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      { title, content },
      { new: true }
    );

    if (!updatedBlog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({
      message: "Blog updated successfully",
      blog: updatedBlog
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deletedBlog = await Blog.findByIdAndDelete(req.params.id);

    if (!deletedBlog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({ message: "Blog deleted successfully" });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/publish', async (req, res) => {
  const blog = await Blog.findByIdAndUpdate(
    req.params.id,
    { status: "published", publishedAt: new Date() },
    { new: true }
  );

  res.json(blog);
});

cron.schedule('* * * * *', async () => {
  try {
    const settings = await getSettings();

    const queuedBlogs = await Blog.find({ status: "scheduled" }).sort({ createdAt: 1 });
    if (!queuedBlogs.length) return;

    const lastPub = await Blog.findOne({ status: "published" }).sort({ publishedAt: -1 });

    let canPublish = true;

    if (lastPub) {
      const diff = (Date.now() - lastPub.publishedAt) / (1000 * 60);
      canPublish = diff >= settings.publishingFrequency;
    }

    if (canPublish) {
      const next = queuedBlogs[0];
      next.status = "published";
      next.publishedAt = new Date();
      await next.save();
      console.log("Auto Published:", next.title);
    }

  } catch (err) {
    console.error("CRON Error:", err.message);
  }
});

module.exports = router;