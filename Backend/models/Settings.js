// models/Settings.js

const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    publishingFrequency: {
      type: Number,
      default: 60, // minutes
      min: 1
    },

    keywords: {
      type: [String],
      default: [
        "Artificial Intelligence",
        "Machine Learning",
        "Web Development",
        "Data Science",
        "Cloud Computing",
        "Cybersecurity",
        "Blockchain Technology",
        "Internet of Things",
        "Digital Marketing",
        "Mobile Applications"
      ],
      validate: {
        validator: arr => arr.length <= 10,
        message: 'A maximum of 10 keywords is allowed.'
      }
    },

    lastGenerated: {
      type: Date,
      default: null
    },

    geminiApiKey: {
      type: String,
      default: "",
      trim: true
    }
  },

  {
    timestamps: true 
  }
);

module.exports = mongoose.model('Settings', settingsSchema);
