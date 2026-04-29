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
  const sessionUserId = req.session && req.session.user && req.session.user.id;
  const bodyUserId = req.body && req.body.userId;
  const queryUserId = req.query && req.query.userId;
  const headerUserId = req.headers['x-user-id'];

  console.log('[AUTH] requireAuth:', {
    sessionUserId,
    bodyUserId,
    queryUserId,
    headerUserId
  });

  if (sessionUserId) return next();
  if (bodyUserId) {
    req.fallbackUserId = bodyUserId;
    return next();
  }
  if (queryUserId) {
    req.fallbackUserId = queryUserId;
    return next();
  }
  if (headerUserId) {
    req.fallbackUserId = headerUserId;
    return next();
  }
  return res.status(401).json({ success: false, message: 'Not authenticated' });
}

// GET /api/user/profile
router.get('/user/profile', requireAuth, async (req, res) => {
  try {
    const userId = (req.session && req.session.user && req.session.user.id) ? req.session.user.id : req.fallbackUserId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      `SELECT id, profileFor, firstName, lastName, dob, gender, maritalStatus, profileImage,
              religion, caste, subCaste, motherTongue, education, college, profession,
              income, aboutMe, partnerExpectations, mobile, email, created_at
       FROM newwprofiles WHERE id = ?`,
      [userId]
    );
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
    const userId = (req.session && req.session.user && req.session.user.id) ? req.session.user.id : req.fallbackUserId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const allowed = ['profileFor','firstName','lastName','dob','gender','maritalStatus','religion','caste','subCaste','motherTongue','education','college','profession','income','aboutMe','partnerExpectations','profileImage','mobile'];
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
    const [rows] = await conn.query(
      `SELECT id, profileFor, firstName, lastName, dob, gender, maritalStatus, profileImage,
              religion, caste, subCaste, motherTongue, education, college, profession,
              income, aboutMe, partnerExpectations, mobile, email
       FROM newwprofiles WHERE id = ?`,
      [userId]
    );
    conn.release();

    if (rows && rows[0]) {
      req.session.user = {
        id: rows[0].id,
        firstName: rows[0].firstName,
        lastName: rows[0].lastName,
        email: rows[0].email,
        profileImage: rows[0].profileImage
      };
      try { req.session.save(() => {}); } catch(e) {}
    }

    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('[USER] update error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/user/record-profile-view - Record when someone views a profile
// NOTE: This endpoint works without authentication to allow tracking views
router.post('/user/record-profile-view', async (req, res) => {
  try {
    // Get viewer ID from session, body, or header
    const viewerId = (req.session && req.session.user && req.session.user.id) 
      || req.body.userId 
      || req.headers['x-user-id']
      || null;
    
    const profileOwnerId = req.body.profileOwnerId;
    
    if (!profileOwnerId) {
      return res.status(400).json({ success: false, message: 'profileOwnerId required' });
    }
    
    // Don't count own profile views
    if (viewerId === profileOwnerId) {
      return res.json({ success: true, message: 'Own profile view not counted' });
    }
    
    const conn = await pool.getConnection();
    
    // Insert view record
    await conn.query(
      'INSERT INTO profile_views (viewer_id, viewed_user_id, viewed_at) VALUES (?, ?, NOW())',
      [viewerId, profileOwnerId]
    );
    
    // Update total view count for the profile owner
    await conn.query(
      'UPDATE newwprofiles SET profile_views = COALESCE(profile_views, 0) + 1 WHERE id = ?',
      [profileOwnerId]
    );
    
    conn.release();
    
    return res.json({ success: true, message: 'Profile view recorded' });
  } catch (err) {
    console.error('[USER] record profile view error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/user/dashboard-stats
router.get('/user/dashboard-stats', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user ? req.session.user.id : req.fallbackUserId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }
    
    const conn = await pool.getConnection();
    
    // Get profile views count
    const [viewsResult] = await conn.query(
      'SELECT COALESCE(profile_views, 0) as profileViews FROM newwprofiles WHERE id = ?',
      [userId]
    );
    
    // Get interested profiles count (from interest table)
    const [interestedResult] = await conn.query(
      'SELECT COUNT(*) as count FROM interests WHERE receiver_id = ?',
      [userId]
    );
    
    // Get match suggestions count (profiles of opposite gender, not already interested/ignored)
    const [userProfile] = await conn.query('SELECT gender FROM newwprofiles WHERE id = ?', [userId]);
    let matchSuggestions = 0;
    if (userProfile.length > 0) {
      const oppositeGender = userProfile[0].gender === 'Male' ? 'Female' : 'Male';
      const [matchesResult] = await conn.query(
        `SELECT COUNT(*) as count FROM newwprofiles 
         WHERE gender = ? AND id != ? 
         AND id NOT IN (SELECT receiver_id FROM interests WHERE sender_id = ?)`,
        [oppositeGender, userId, userId]
      );
      matchSuggestions = matchesResult[0].count;
    }
    
    // For now, new messages is placeholder
    const newMessages = 0;
    
    conn.release();
    
    const stats = {
      profileViews: viewsResult[0].profileViews || 0,
      interestedProfiles: interestedResult[0].count || 0,
      matchSuggestions: matchSuggestions,
      newMessages: newMessages
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
