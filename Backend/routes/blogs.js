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

// ✅ COMPLETELY FIXED: No targetUrl validation
router.post('/generate', async (req, res) => {
  try {
    console.log('📝 Blog generation started');
    console.log('📦 Request body:', JSON.stringify(req.body, null, 2));

    // Get the data from request
    const { keywords } = req.body;
    
    // Debug log
    console.log('🔍 Keywords received:', keywords);
    console.log('📊 Type of keywords:', typeof keywords);
    console.log('🔢 Is array?', Array.isArray(keywords));

    // Simple validation
    if (!keywords || !Array.isArray(keywords)) {
      console.log('❌ Validation failed: keywords must be an array');
      return res.status(400).json({ 
        error: "Please provide keywords as an array" 
      });
    }

    if (keywords.length === 0) {
      console.log('❌ Validation failed: empty keywords array');
      return res.status(400).json({ 
        error: "Please provide at least one keyword" 
      });
    }

    // Process each keyword
    const generatedBlogs = [];

    for (let i = 0; i < keywords.length; i++) {
      const item = keywords[i];
      
      console.log(`🔄 Processing item ${i+1}:`, item);

      // Check if item has required fields
      if (!item || typeof item !== 'object') {
        console.log(`⚠️ Skipping invalid item at index ${i}`);
        continue;
      }

      const keyword = item.keyword || '';
      const imageUrl = item.imageUrl || '';

      if (!keyword.trim()) {
        console.log(`⚠️ Skipping item ${i} - missing keyword`);
        continue;
      }

      if (!imageUrl.trim()) {
        console.log(`⚠️ Skipping item ${i} - missing imageUrl`);
        continue;
      }

      try {
        console.log(`🚀 Generating blog for: "${keyword}"`);
        
        // Generate blog content
        const blogData = await generateBlogWithGemini(keyword);
        
        console.log(`✅ Generated: "${blogData.title}"`);

        // Create blog in database
        const blog = await Blog.create({
          title: blogData.title,
          content: blogData.content,
          excerpt: blogData.excerpt || '',
          keywords: blogData.keywords || [keyword],
          image: imageUrl,
          status: "draft",
          createdAt: new Date()
        });

        generatedBlogs.push({
          _id: blog._id,
          title: blog.title,
          keyword: keyword
        });

        console.log(`💾 Saved blog ID: ${blog._id}`);

        // Small delay between generations
        if (i < keywords.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }

      } catch (error) {
        console.error(`❌ Error for "${keyword}":`, error.message);
        // Continue with next item
      }
    }

    console.log(`🎉 Successfully generated ${generatedBlogs.length} blogs`);

    if (generatedBlogs.length === 0) {
      return res.status(400).json({
        error: "Failed to generate any blogs. Please check your input."
      });
    }

    res.json({
      success: true,
      message: `Successfully generated ${generatedBlogs.length} blog(s)!`,
      count: generatedBlogs.length,
      blogs: generatedBlogs
    });

  } catch (error) {
    console.error('🔥 Fatal error in generate route:', error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error.message 
    });
  }
});

// Get single blog
router.get('/:id', async (req, res) => {
  try {
    const blog = await Blog.findById(req.params.id);
    if (!blog) {
      return res.status(404).json({ error: 'Blog not found' });
    }
    res.json(blog);
  } catch (error) {
    console.error('Error fetching blog:', error);
    res.status(500).json({ error: 'Failed to fetch blog' });
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

// Publish blog
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

// Get stats
router.get('/stats', async (req, res) => {
  try {
    const total = await Blog.countDocuments();
    const published = await Blog.countDocuments({ status: 'published' });
    const draft = await Blog.countDocuments({ status: 'draft' });

    res.json({
      total,
      published,
      draft
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: 'Failed to fetch statistics' });
  }
});

// Auto-publishing cron job
cron.schedule('* * * * *', async () => {
  try {
    const settings = await getSettings();

    const drafts = await Blog.find({ status: "draft" }).sort({ createdAt: 1 });
    if (!drafts.length) return;

    const lastPublished = await Blog.findOne({ 
      status: "published" 
    }).sort({ publishedAt: -1 });

    let canPublish = true;

    if (lastPublished) {
      const diffMinutes = (Date.now() - lastPublished.publishedAt) / (1000 * 60);
      canPublish = diffMinutes >= settings.publishingFrequency;
    }

    if (canPublish && drafts.length > 0) {
      const nextBlog = drafts[0];
      nextBlog.status = "published";
      nextBlog.publishedAt = new Date();
      await nextBlog.save();
      console.log("Auto-published:", nextBlog.title);
    }

  } catch (err) {
    console.error("Cron error:", err.message);
  }
});

// ✅ TEST ROUTE - Use this to test if basic connection works
router.post('/test-generate', async (req, res) => {
  try {
    console.log('🧪 Test route called');
    
    // Create a simple test blog
    const blog = await Blog.create({
      title: "Test Blog - " + new Date().toISOString(),
      content: "<h2>Test Content</h2><p>This is a test blog generated for debugging.</p>",
      excerpt: "Test excerpt for debugging",
      keywords: ["test", "debug"],
      image: "https://picsum.photos/800/400",
      status: "draft"
    });

    res.json({
      success: true,
      message: "Test blog created successfully",
      blog: {
        id: blog._id,
        title: blog.title
      }
    });

  } catch (error) {
    console.error('Test route error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;