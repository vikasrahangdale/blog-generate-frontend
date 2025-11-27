const mongoose = require('mongoose');

const blogSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  excerpt: {
    type: String,
    default: ''
  },
  keywords: [{
    type: String
  }],
  imageUrl: {
    type: String,
    required: true
  },
  targetUrl: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'published_to_target', 'scheduled'],
    default: 'draft'
  },
  publishedAt: {
    type: Date
  }
}, { 
  timestamps: true 
});

module.exports = mongoose.model('Blog', blogSchema);