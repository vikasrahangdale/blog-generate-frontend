// models/Keyword.js

const mongoose = require('mongoose');

const keywordSchema = new mongoose.Schema(
  {
    keyword: {
      type: String,
      required: true,
      unique: true,
      trim: true
    }
  },
  {
    timestamps: true // auto adds createdAt & updatedAt
  }
);

module.exports = mongoose.model('Keyword', keywordSchema);
