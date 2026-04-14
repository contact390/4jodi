const express = require('express');
const router = express.Router();
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// multer setup - save uploads to ./uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${unique}${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

// Helper: require authenticated session
function requireAuth(req, res, next) {
  if (req.session && req.session.user && req.session.user.id) return next();
  return res.status(401).json({ success: false, message: 'Not authenticated' });
}

// GET /api/user/profile
router.get('/user/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT id, profileFor, firstName, lastName, dob, gender, maritalStatus, profileImage, religion, caste, subCaste, motherTongue, education, college, profession, income, mobile, email, created_at FROM newwprofiles WHERE id = ?', [userId]);
    conn.release();
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Profile not found' });
    const user = rows[0];
    return res.json({ success: true, user });
  } catch (err) {
    console.error('[USER] profile error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/user/update-profile
router.post('/user/update-profile', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const allowed = ['firstName','lastName','dob','gender','maritalStatus','religion','caste','subCaste','motherTongue','education','college','profession','income','aboutMe','partnerExpectations'];
    const updates = [];
    const values = [];
    allowed.forEach(k => {
      if (Object.prototype.hasOwnProperty.call(req.body, k)) {
        updates.push(`${k} = ?`);
        values.push(req.body[k]);
      }
    });

    if (updates.length === 0) return res.status(400).json({ success: false, message: 'No valid fields to update' });

    values.push(userId);
    const sql = `UPDATE newwprofiles SET ${updates.join(', ')} WHERE id = ?`;
    const conn = await pool.getConnection();
    await conn.query(sql, values);
    const [rows] = await conn.query('SELECT id, firstName, lastName, email, profileImage FROM newwprofiles WHERE id = ?', [userId]);
    conn.release();

    // update session user
    if (rows && rows[0]) {
      req.session.user = { id: rows[0].id, firstName: rows[0].firstName, lastName: rows[0].lastName, email: rows[0].email, profileImage: rows[0].profileImage };
      try { req.session.save(() => {}); } catch(e) {}
    }

    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('[USER] update error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/user/dashboard-stats
router.get('/user/dashboard-stats', requireAuth, async (req, res) => {
  try {
    // Placeholder/simple stats - can be expanded
    const stats = {
      profileViews: 0,
      interestedProfiles: 0,
      matchSuggestions: 0,
      newMessages: 0
    };
    return res.json({ success: true, stats });
  } catch (err) {
    console.error('[USER] stats error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/user/match-suggestions
router.get('/user/match-suggestions', requireAuth, async (req, res) => {
  try {
    // simple empty suggestions for now
    return res.json({ success: true, matches: [] });
  } catch (err) {
    console.error('[USER] matches error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Photos endpoints
router.get('/user/photos', requireAuth, async (req, res) => {
  try {
    // list files in uploads for this user could be implemented; returning empty for now
    return res.json({ success: true, photos: [] });
  } catch (err) {
    console.error('[USER] photos error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/user/upload-photo', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });
    const url = `/uploads/${req.file.filename}`;
    // if user has no profileImage, set this as profile image
    const userId = req.session.user.id;
    const conn = await pool.getConnection();
    const [rows] = await conn.query('SELECT profileImage FROM newwprofiles WHERE id = ?', [userId]);
    if (rows && rows[0] && !rows[0].profileImage) {
      await conn.query('UPDATE newwprofiles SET profileImage = ? WHERE id = ?', [url, userId]);
      req.session.user.profileImage = url;
      try { req.session.save(() => {}); } catch(e) {}
    }
    conn.release();
    return res.json({ success: true, photoUrl: url });
  } catch (err) {
    console.error('[USER] upload error:', err);
    return res.status(500).json({ success: false, message: 'Upload failed' });
  }
});

router.post('/user/set-profile-photo', requireAuth, express.json(), async (req, res) => {
  try {
    const { photoId, photoUrl } = req.body;
    const userId = req.session.user.id;
    if (!photoUrl) return res.status(400).json({ success: false, message: 'photoUrl required' });
    const conn = await pool.getConnection();
    await conn.query('UPDATE newwprofiles SET profileImage = ? WHERE id = ?', [photoUrl, userId]);
    conn.release();
    req.session.user.profileImage = photoUrl;
    try { req.session.save(() => {}); } catch(e) {}
    return res.json({ success: true });
  } catch (err) {
    console.error('[USER] set-profile-photo error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/user/delete-photo', requireAuth, express.json(), async (req, res) => {
  try {
    const { photoId, photoUrl } = req.body;
    if (!photoUrl) return res.status(400).json({ success: false, message: 'photoUrl required' });
    const filePath = path.join(__dirname, '..', photoUrl.replace(/^\//, ''));
    fs.unlink(filePath, err => {
      // ignore unlink errors
    });
    return res.json({ success: true });
  } catch (err) {
    console.error('[USER] delete-photo error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Express interest / ignore (placeholders)
router.post('/user/express-interest', requireAuth, express.json(), async (req, res) => {
  return res.json({ success: true });
});

router.post('/user/ignore-match', requireAuth, express.json(), async (req, res) => {
  return res.json({ success: true });
});

module.exports = router;
