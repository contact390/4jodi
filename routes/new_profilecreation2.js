const express = require("express");
const router = express.Router();
const pool = require("../db");
const nodemailer = require("nodemailer");
const bcrypt = require("bcryptjs");

// =======================
// Create table if not exists
// =======================
(async () => {
  try {
    const createTable = `
      CREATE TABLE IF NOT EXISTS newwprofiles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        profileFor VARCHAR(50) NOT NULL,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100) NOT NULL,
        dob DATE NOT NULL,
        gender VARCHAR(20) NOT NULL,
        maritalStatus VARCHAR(50) NOT NULL,
        profileImage LONGTEXT,
        religion VARCHAR(50) NOT NULL,
        caste VARCHAR(50) NOT NULL,
        subCaste VARCHAR(100),
        motherTongue VARCHAR(50) NOT NULL,
        education VARCHAR(100) NOT NULL,
        college VARCHAR(200),
        profession VARCHAR(100) NOT NULL,
        income VARCHAR(50) NOT NULL,
        mobile VARCHAR(20) NOT NULL,
        email VARCHAR(150) NOT NULL,
        password VARCHAR(255) NOT NULL,
        isActive BOOLEAN DEFAULT TRUE,
        isVerified BOOLEAN DEFAULT FALSE,
        verificationToken VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `;
    const conn = await pool.getConnection();
    await conn.query(createTable);
    conn.release();
    console.log("✅ Profiles table is ready");
  } catch (err) {
    console.error("Error creating table:", err);
  }
})();

// =======================
// Configure Nodemailer
// =======================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hitaishimatrimony@gmail.com",
    pass: "hgkh ylho pibp bopl",
  },
});

// =======================
// Utility Functions
// =======================
const generateVerificationToken = () => {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
};

const sendVerificationEmail = async (email, firstName, token) => {
  const verificationLink = `http://localhost:5000/api/verify-email?token=${token}`;
  
  const mailOptions = {
    from: 'hitaishimatrimony@gmail.com',
    to: email,
    subject: "Verify Your Email - Hitaishi Matrimony",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff3366;">Welcome ${firstName}!</h2>
        <p>Thank you for creating your profile on <b>Hitaishi Matrimony</b>.</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background: #ff3366; color: white; padding: 12px 30px; 
                    text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email
          </a>
        </div>
        <p>Best regards,<br>Hitaishi Matrimony Team</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

// =======================
// Validation Functions
// =======================
const validateMobile = (mobile) => {
  const mobileRegex = /^[6-9]\d{9}$/;
  return mobileRegex.test(mobile);
};

const validateAge = (dob) => {
  const birthDate = new Date(dob);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1;
  }
  return age;
};

const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const validatePassword = (password) => {
  return password.length >= 8;
};

// =======================
// Save profile API
// =======================
router.post("/new_profilecreation", async (req, res) => {
  let conn;
  try {
    const {
      profileFor, firstName, lastName, dob, gender, maritalStatus,
      profileImage, religion, caste, subCaste, motherTongue,
      education, college, profession, income,
      mobile, email, password
    } = req.body;

    console.log("Received data:", { mobile, email });

    // Input validation
    if (!mobile || !email || !password || !firstName || !lastName || !dob || !gender || !maritalStatus || !religion || !caste || !motherTongue || !education || !profession || !income) {
      return res.status(400).json({ 
        success: false, 
        message: "All required fields must be filled" 
      });
    }

    // Validate mobile number
    if (!validateMobile(mobile)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid 10-digit mobile number" 
      });
    }

    // Validate age (minimum 18 years)
    const age = validateAge(dob);
    if (age < 18) {
      return res.status(400).json({ 
        success: false, 
        message: "You must be at least 18 years old to register" 
      });
    }

    // Validate email
    if (!validateEmail(email)) {
      return res.status(400).json({ 
        success: false, 
        message: "Please enter a valid email address" 
      });
    }

    // Validate password
    if (!validatePassword(password)) {
      return res.status(400).json({ 
        success: false, 
        message: "Password must be at least 8 characters long" 
      });
    }

    conn = await pool.getConnection();

    // Check if email or mobile already exists
    const checkSql = "SELECT id FROM newwprofiles WHERE email = ? OR mobile = ?";
    const [existing] = await conn.query(checkSql, [email, mobile]);
    
    if (existing.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: "Email or mobile number already registered" 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = generateVerificationToken();

    const sql = `
      INSERT INTO newwprofiles 
      (profileFor, firstName, lastName, dob, gender, maritalStatus,
       profileImage, religion, caste, subCaste, motherTongue,
       education, college, profession, income,
       mobile, email, password, verificationToken)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      profileFor, firstName, lastName, dob, gender, maritalStatus,
      profileImage || null, religion, caste, subCaste || null, motherTongue,
      education, college || null, profession, income,
      mobile, email, hashedPassword, verificationToken
    ];

    const [result] = await conn.query(sql, values);
    conn.release();

    // Send verification email
    try {
      await sendVerificationEmail(email, firstName, verificationToken);
    } catch (emailError) {
      console.error("❌ Email not sent:", emailError);
    }

    res.status(201).json({ 
      success: true, 
      id: result.insertId, 
      message: "Profile created successfully. Please check your email for verification." 
    });
  } catch (err) {
    console.error("Error inserting profile:", err);
    if (conn) conn.release();
    res.status(500).json({ 
      success: false, 
      message: "Server Error: " + err.message 
    });
  }
});

// =======================
// Email Verification API
// =======================
router.get("/verify-email", async (req, res) => {
  try {
    const { token } = req.query;
    
    if (!token) {
      return res.status(400).send("Invalid verification link");
    }

    const conn = await pool.getConnection();
    const [users] = await conn.query(
      "SELECT id, firstName FROM newwprofiles WHERE verificationToken = ? AND isVerified = FALSE",
      [token]
    );

    if (users.length === 0) {
      conn.release();
      return res.status(400).send("Invalid or expired verification token");
    }

    await conn.query(
      "UPDATE newwprofiles SET isVerified = TRUE, verificationToken = NULL WHERE verificationToken = ?",
      [token]
    );
    conn.release();

    res.send(`
      <div style="text-align: center; padding: 50px; font-family: Arial, sans-serif;">
        <h1 style="color: #4CAF50;">Email Verified Successfully!</h1>
        <p>Welcome ${users[0].firstName}! Your email has been verified.</p>
        <p>You can now login to your account.</p>
        <a href="/login2.html" style="background: #ff3366; color: white; padding: 10px 20px; 
           text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px;">
          Go to Login
        </a>
      </div>
    `);
  } catch (err) {
    console.error("Email verification error:", err);
    res.status(500).send("Server error during verification");
  }
});

// =======================
// Get all profiles API
// =======================
router.get("/new_profilecreation", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT * FROM newwprofiles ORDER BY created_at DESC");
    conn.release();

    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error fetching profiles:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// =======================
// Enhanced Login API
// =======================
router.post("/login3", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Normalize email and password
    const emailTrim = (email || '').toString().trim().toLowerCase();
    const passwordTrim = (password || '').toString().trim();

    console.log('[LOGIN3] Attempt for email:', emailTrim);

    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      "SELECT * FROM newwprofiles WHERE LOWER(email) = ? AND isActive = TRUE",
      [emailTrim]
    );
    conn.release();

    if (rows.length === 0) {
      console.log('[LOGIN3] No user found with email:', emailTrim);
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    const user = rows[0];
    console.log('[LOGIN3] User found. Checking password for id:', user.id);
    
    // Verify password with bcrypt
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(passwordTrim, user.password);
    } catch (bcryptErr) {
      console.error('[LOGIN3] Bcrypt error:', bcryptErr);
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    if (!isPasswordValid) {
      console.log('[LOGIN3] Password mismatch for email:', emailTrim);
      return res.status(401).json({ 
        success: false, 
        message: "Invalid email or password" 
      });
    }

    console.log('[LOGIN3] Authentication successful for user id:', user.id);

    // Return user data (excluding sensitive fields)
    const userData = {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      profileImage: user.profileImage || null
    };

    res.status(200).json({
      success: true,
      message: "Login successful",
      user: userData
    });
  } catch (err) {
    console.error('[LOGIN3] Error logging in:', err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

// =======================
// Get Profiles by Gender
// =======================
router.get("/profiles/male", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT * FROM newwprofiles WHERE gender='Male' ORDER BY created_at DESC");
    conn.release();
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error fetching male profiles:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

router.get("/profiles/female", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT * FROM newwprofiles WHERE gender='Female' ORDER BY created_at DESC");
    conn.release();
    res.status(200).json({ success: true, data: rows });
  } catch (err) {
    console.error("Error fetching female profiles:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});

module.exports = router;