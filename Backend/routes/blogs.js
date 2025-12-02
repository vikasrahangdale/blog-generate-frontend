const express = require('express');
const router = express.Router();
const axios = require('axios');

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

// Get all blogs
router.get('/all', async (req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (error) {
    console.error('Error fetching blogs:', error);
    res.status(500).json({ error: 'Failed to fetch blogs' });
  }
});

// Get published blogs
router.get('/published', async (req, res) => {
  try {
    const blogs = await Blog.find({ status: 'published' }).sort({ publishedAt: -1 });
    res.json(blogs);
  } catch (error) {
    console.error('Error fetching published blogs:', error);
    res.status(500).json({ error: 'Failed to fetch published blogs' });
  }
});

router.post('/generate', async (req, res) => {
  try {
    const settings = await getSettings();

    const { keywords: keywordImagePairs, targetUrl } = req.body;

    console.log('Received data:', req.body); // Debug log

    // 1️⃣ Validate input data
    if (!keywordImagePairs || !Array.isArray(keywordImagePairs) || keywordImagePairs.length === 0) {
      return res.status(400).json({ error: "Keywords with image URLs are required!" });
    }

    if (!targetUrl || targetUrl.trim() === "") {
      return res.status(400).json({ error: "Target API URL is required!" });
    }

    // Validate target URL format
    try {
      new URL(targetUrl.trim());
    } catch (error) {
      return res.status(400).json({ error: "Invalid target API URL format!" });
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

        // 4️⃣ Create blog with specific image and target URL
        const blog = await Blog.create({
          title: blogData.title,
          content: blogData.content,
          excerpt: blogData.excerpt,
          keywords: blogData.keywords || [keyword],
          imageUrl: imageUrl.trim(),
          targetUrl: targetUrl.trim(), // ✅ Store target URL
          status: "draft" // ✅ Changed from "scheduled" to "draft" for manual publishing
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

// Update blog
router.put('/:id', async (req, res) => {
  try {
    const { title, content, excerpt, keywords } = req.body;

    const updatedBlog = await Blog.findByIdAndUpdate(
      req.params.id,
      { 
        title, 
        content, 
        excerpt,
        keywords: Array.isArray(keywords) ? keywords : [keywords]
      },
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

// Delete blog
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

// Publish blog locally
router.post('/:id/publish', async (req, res) => {
  try {
    const blog = await Blog.findByIdAndUpdate(
      req.params.id,
      { 
        status: "published", 
        publishedAt: new Date() 
      },
      { new: true }
    );

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    res.json({
      message: "Blog published successfully",
      blog: blog
    });

  } catch (error) {
    console.error('Publish error:', error);
    res.status(500).json({ error: 'Failed to publish blog' });
  }
});

// 🚀 FINAL: Publish blog to Website B (Target Website)
router.post('/:id/publish-to-target', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);

    if (!blog) {
      return res.status(404).json({ error: "Blog not found" });
    }

    if (!blog.targetUrl || blog.targetUrl.trim() === "") {
      return res.status(400).json({ error: "Target URL missing!" });
    }

    // 🟢 Website B ko bhejne wala FINAL payload
    const payload = {
      title: blog.title,
      content: blog.content,
      excerpt: blog.excerpt,
      keywords: blog.keywords,
      imageUrl: blog.imageUrl,
      targetUrl: blog.targetUrl,
      status: "published",
      publishedAt: new Date().toISOString(),
      source: "BlogGenerator"
    };

    console.log("🚀 Sending Blog To Website B:", blog.targetUrl);
    console.log("📦 Payload:", payload);

    // 🟢 Website B par data send karo
    const response = await axios.post(`${blog.targetUrl}/receive-blog`, payload, {

      headers: { "Content-Type": "application/json" }
    });

    console.log("🎉 Website B Response:", response.data);

    // 🟢 Website A me status update
    blog.status = "published_to_target";
    blog.publishedAt = new Date();
    await blog.save();

    res.json({
      message: "🎉 Blog published to Website B successfully!",
      targetResponse: response.data,
      blog: blog
    });

  } catch (error) {
    console.error("❌ Publish to Website B Failed:", error);

    if (error.response) {
      return res.status(error.response.status).json({
        error: error.response.data || "Website B returned an error!"
      });
    }

    return res.status(500).json({
      error: error.message || "Failed to publish blog!"
    });
  }
});


// ✅ NEW: Get blog statistics
router.get('/stats', async (req, res) => {
  try {
    const total = await Blog.countDocuments();
    const published = await Blog.countDocuments({ status: 'published' });
    const draft = await Blog.countDocuments({ status: 'draft' });
    const published_to_target = await Blog.countDocuments({ status: 'published_to_target' });

    res.json({
      total,
      published,
      draft,
      published_to_target
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Auto-publishing cron job (updated)
cron.schedule('* * * * *', async () => {
  try {
    const settings = await getSettings();

    const queuedBlogs = await Blog.find({ status: "scheduled" }).sort({ createdAt: 1 });
    if (!queuedBlogs.length) return;

    const lastPub = await Blog.findOne({ 
      status: { $in: ["published", "published_to_target"] } 
    }).sort({ publishedAt: -1 });

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