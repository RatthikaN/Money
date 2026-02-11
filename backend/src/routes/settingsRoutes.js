
const express = require('express');
const { getSection, updateSection, send2FA, verify2FA, testConnection } = require('../controllers/settingsController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// 1. IMPORTANT: Move specific static routes to the VERY TOP
router.post('/test-mail', protect, testConnection);
router.post('/2fa/send', protect, send2FA);
router.post('/2fa/verify', protect, verify2FA);

// 2. IMPORTANT: Generic parameter-based routes must be at the BOTTOM
router.get('/:section', protect, getSection);
router.post('/:section', protect, updateSection);

module.exports = router;
