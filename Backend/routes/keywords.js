// routes/keywordRoutes.js

const express = require('express');
const router = express.Router();
const Keyword = require('../models/Keyword');



router.get('/all', async (req, res) => {
  try {
    const keywords = await Keyword.find().sort({ createdAt: -1 });
    return res.json(keywords);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});



router.post('/create', async (req, res) => {
  try {
    const total = await Keyword.countDocuments();
    if (total >= 10) {
      return res.status(400).json({
        error: 'You can store a maximum of 10 keywords'
      });
    }

    const keyword = await Keyword.create(req.body);
    return res.status(201).json(keyword);

  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});


// ==========================
// PUT: Update Keyword
// ==========================
router.put('/:keywordId', async (req, res) => {
  try {
    const updated = await Keyword.findByIdAndUpdate(
      req.params.keywordId,
      req.body,
      { new: true }
    );

    return res.json(updated);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});


// ==========================
// DELETE: Remove Keyword
// ==========================
router.delete('/:keywordId', async (req, res) => {
  try {
    await Keyword.findByIdAndDelete(req.params.keywordId);
    return res.json({ message: 'Keyword removed successfully' });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});


module.exports = router;
