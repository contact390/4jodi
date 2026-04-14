const express = require("express");
const router = express.Router();
const pool = require("../db"); // <-- Your db.js file with mysql2 connection

// =======================
// Create table if not exists
// =======================
(async () => {
  try {
    const createTable = `
      CREATE TABLE IF NOT EXISTS register2 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        mobile VARCHAR(15) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    await pool.query(createTable);
    console.log("✅ Users table ready");
  } catch (err) {
    console.error("❌ Error creating table:", err);
  }
})();

// =======================
// Register API
// =======================
router.post("/register2", async (req, res) => {
  try {
    const { name, mobile, email, password } = req.body;

    // check if user exists
    const [userExists] = await pool.query("SELECT * FROM register2 WHERE email = ?", [email]);
    if (userExists.length > 0) {
      return res.json({ success: false, message: "Email already registered" });
    }

    // directly store password (⚠️ plain text)
    await pool.query("INSERT INTO register2 (name, mobile, email, password) VALUES (?, ?, ?, ?)", 
      [name, mobile, email, password]);

    res.json({ success: true, message: "Registration successful!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// =======================
// Login API (check both register2 & newwprofiles tables)
// =======================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Normalize inputs
    const emailTrim = (email || '').toString().trim().toLowerCase();
    const passwordTrim = (password || '').toString().trim();

    console.log('[LOGIN] Attempt for email:', emailTrim);

    // First try register2 table
    const [rows] = await pool.query("SELECT * FROM register2 WHERE LOWER(email) = ?", [emailTrim]);

    if (rows.length > 0) {
      const user = rows[0];
      // compare plain password
      if (user.password !== passwordTrim) {
        console.log('[LOGIN] Password mismatch in register2 for email:', emailTrim);
        return res.json({ success: false, message: "Invalid email or password" });
      }
      console.log('[LOGIN] Authenticated from register2 table, user id:', user.id);
      
      // Save session if available
      if (req && req.session) {
        req.session.user = {
          id: user.id,
          firstName: user.name,
          lastName: '',
          email: user.email,
          profileImage: null
        };
      }

      return res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          firstName: user.name,
          lastName: '',
          email: user.email,
          profileImage: null
        }
      });
    }

    // If not in register2, try newwprofiles table
    const [rowsNP] = await pool.query("SELECT * FROM newwprofiles WHERE LOWER(email) = ?", [emailTrim]);

    if (rowsNP.length > 0) {
      const user = rowsNP[0];
      // compare plain password
      if (user.password !== passwordTrim) {
        console.log('[LOGIN] Password mismatch in newwprofiles for email:', emailTrim);
        return res.json({ success: false, message: "Invalid email or password" });
      }
      console.log('[LOGIN] Authenticated from newwprofiles table, user id:', user.id);
      
      // Save session if available
      if (req && req.session) {
        req.session.user = {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImage: user.profileImage || null
        };
      }

      return res.json({
        success: true,
        message: "Login successful",
        user: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          profileImage: user.profileImage || null
        }
      });
    }

    // No user found in either table
    console.log('[LOGIN] No user found for email:', emailTrim);
    res.json({ success: false, message: "Invalid email or password" });
  } catch (err) {
    console.error('[LOGIN] Error:', err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
