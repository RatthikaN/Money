
const express = require('express');
const { getSection, updateSection } = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Get settings (e.g. GET /api/settings/general)
router.get('/:section', protect, getSection);

// Update settings (e.g. POST /api/settings/general)
router.post('/:section', protect, updateSection);

module.exports = router;
