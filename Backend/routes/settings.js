// routes/settingsRoutes.js

const express = require('express');
const router = express.Router();
const Settings = require('../models/Settings');


// Helper: Auto-create default settings
const getOrCreateSettings = async () => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({
      publishingFrequency: 60,
      keywords: []
    });
  }
  return settings;
};


// ===============================
// GET: Fetch Settings
// ===============================
router.get('/get', async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    return res.json(settings);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


// ===============================
// PUT: Update ALL settings
// ===============================
router.put('/update', async (req, res) => {
  try {
    let settings = await getOrCreateSettings();

    settings.publishingFrequency = req.body.publishingFrequency ?? settings.publishingFrequency;
    settings.geminiApiKey = req.body.geminiApiKey ?? settings.geminiApiKey;
    settings.keywords = req.body.keywords ?? settings.keywords;

    await settings.save();

    return res.json({
      message: "Settings updated successfully",
      settings
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


// ===============================
// PUT: Update ONLY Keywords
// ===============================
router.put('/update-keywords', async (req, res) => {
  try {
    const { keywords } = req.body;

    if (!Array.isArray(keywords)) {
      return res.status(400).json({ error: "Keywords must be an array" });
    }

    let settings = await getOrCreateSettings();
    settings.keywords = keywords;
    await settings.save();

    return res.json({
      message: "Keywords updated successfully",
      keywords: settings.keywords
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


// ===============================
// DELETE: Delete keyword by index
// ===============================
router.delete('/delete-keyword/:index', async (req, res) => {
  try {
    const index = parseInt(req.params.index);

    let settings = await getOrCreateSettings();

    if (!settings.keywords || settings.keywords.length === 0) {
      return res.status(400).json({ error: "No keywords available" });
    }

    if (index < 0 || index >= settings.keywords.length) {
      return res.status(400).json({ error: "Invalid keyword index" });
    }

    // Remove keyword
    settings.keywords.splice(index, 1);
    await settings.save();

    return res.json({
      message: "Keyword deleted",
      keywords: settings.keywords
    });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});


module.exports = router;
