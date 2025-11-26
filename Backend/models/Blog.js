// models/Blog.js

const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true
    },

    content: {
      type: String,
      required: true
    },

    // 👇 Image URL REQUIRED
    image: {
      type: String,
      required: true,
      trim: true
    },

    excerpt: {
      type: String,
      trim: true
    },

    keywords: {
      type: [String],
      default: []
    },

    status: {
      type: String,
      enum: ['draft', 'scheduled', 'published'],
      default: 'draft'
    },

    publishedAt: {
      type: Date,
      default: null
    }
  },

  { timestamps: true }
);

module.exports = mongoose.model('Blog', blogSchema);
