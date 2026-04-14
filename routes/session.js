const express = require('express');
const router = express.Router();

// GET /api/session -> returns current session user or null
router.get('/session', (req, res) => {
  try {
    const user = req.session && req.session.user ? req.session.user : null;
    return res.json({ success: true, user });
  } catch (err) {
    console.error('[SESSION] GET error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/logout -> destroy session
router.post('/logout', (req, res) => {
  try {
    if (req.session) {
      req.session.destroy(err => {
        if (err) {
          console.error('[SESSION] Logout error:', err);
          return res.status(500).json({ success: false, message: 'Logout failed' });
        }
        // Clear cookie if using default cookie name
        res.clearCookie('connect.sid');
        return res.json({ success: true, message: 'Logged out' });
      });
    } else {
      return res.json({ success: true, message: 'No active session' });
    }
  } catch (err) {
    console.error('[SESSION] Logout exception:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
