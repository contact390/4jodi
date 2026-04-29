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
        aboutMe TEXT,
        partnerExpectations TEXT,
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
    try {
      // Add columns if they don't exist
      await conn.query(`ALTER TABLE newwprofiles ADD COLUMN aboutMe TEXT`);
    } catch (e) {
      // Column might already exist, ignore error
    }
    try {
      await conn.query(`ALTER TABLE newwprofiles ADD COLUMN partnerExpectations TEXT`);
    } catch (e) {
      // Column might already exist, ignore error
    }
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
// In-Memory OTP Storage
// =======================
const otpStorage = {};

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const storeOTP = (email, otp) => {
  const expiryTime = Date.now() + (10 * 60 * 1000); // 10 minutes expiry
  otpStorage[email] = {
    otp,
    expiryTime,
    attempts: 0
  };
};

const verifyOTP = (email, otp) => {
  if (!otpStorage[email]) {
    return { valid: false, message: "No OTP found for this email" };
  }

  const { otp: storedOTP, expiryTime, attempts } = otpStorage[email];

  if (Date.now() > expiryTime) {
    delete otpStorage[email];
    return { valid: false, message: "OTP has expired. Please request a new one." };
  }

  if (attempts >= 5) {
    delete otpStorage[email];
    return { valid: false, message: "Too many attempts. Please request a new OTP." };
  }

  if (otp === storedOTP) {
    delete otpStorage[email];
    return { valid: true, message: "OTP verified successfully" };
  } else {
    otpStorage[email].attempts++;
    return { valid: false, message: "Invalid OTP. Please try again.", remainingAttempts: 5 - otpStorage[email].attempts };
  }
};

const sendOTPEmail = async (email, firstName, otp) => {
  const mailOptions = {
    from: 'hitaishimatrimony@gmail.com',
    to: email,
    subject: "Your Hitaishi Matrimony Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9f9f9; padding: 20px; border-radius: 10px;">
        <h2 style="color: #ff3366; text-align: center;">Hitaishi Matrimony</h2>
        <p style="font-size: 16px; color: #333;">Hello ${firstName},</p>
        <p style="font-size: 16px; color: #333;">Your OTP for email verification is:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #ff3366; background: white; padding: 20px; border-radius: 10px; border: 2px solid #ff3366;">
            ${otp}
          </div>
        </div>
        
        <p style="font-size: 14px; color: #666;">This OTP is valid for 10 minutes only. Do not share this code with anyone.</p>
        <p style="font-size: 14px; color: #666;">If you didn't request this code, please ignore this email.</p>
        
        <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
        <p style="font-size: 12px; color: #999; text-align: center;">© Hitaishi Matrimony. All rights reserved.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

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
// Send OTP API
// =======================
router.post("/send-otp", async (req, res) => {
  try {
    const { email, firstName } = req.body;

    if (!email || !validateEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address"
      });
    }

    // Check if email already exists in the system
    const conn = await pool.getConnection();
    const [existing] = await conn.query(
      "SELECT id FROM newwprofiles WHERE email = ?",
      [email]
    );
    conn.release();

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "This email is already registered"
      });
    }

    // Generate and store OTP
    const otp = generateOTP();
    storeOTP(email, otp);

    // Send OTP email
    try {
      await sendOTPEmail(email, firstName || 'User', otp);
    } catch (emailError) {
      console.error("Error sending OTP email:", emailError);
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP. Please try again."
      });
    }

    res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email"
    });
  } catch (err) {
    console.error("Error in send-otp:", err);
    res.status(500).json({
      success: false,
      message: "Server Error: " + err.message
    });
  }
});

// =======================
// Verify OTP API
// =======================
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    const result = verifyOTP(email, otp);

    if (!result.valid) {
      return res.status(400).json({
        success: false,
        message: result.message,
        remainingAttempts: result.remainingAttempts
      });
    }

    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (err) {
    console.error("Error in verify-otp:", err);
    res.status(500).json({
      success: false,
      message: "Server Error: " + err.message
    });
  }
});

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

    // Normalize inputs
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
    console.log('[LOGIN3] User found, id:', user.id, 'isVerified:', user.isVerified);

    // Verify password with bcrypt
    let isPasswordValid = false;
    try {
      isPasswordValid = await bcrypt.compare(passwordTrim, user.password);
      console.log('[LOGIN3] Password check result:', isPasswordValid);
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

    // Save user info into server session
    req.session.user = userData;
    
    // Save session and send response
    req.session.save((err) => {
      if (err) {
        console.error('[LOGIN3] Session save error:', err);
      }
      
      res.status(200).json({
        success: true,
        message: "Login successful",
        user: userData
      });
    });
  } catch (err) {
    console.error('[LOGIN3] Error logging in:', err);
    res.status(500).json({ success: false, message: "Server Error: " + err.message });
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




router.get("/profiles/widow", async (req, res) => {
  try {
    const conn = await pool.getConnection();

    // Fetch ALL widowed profiles (no filter isActive/isVerified)
    const [rows] = await conn.query(
      "SELECT * FROM newwprofiles WHERE maritalStatus='Widowed' ORDER BY created_at DESC"
    );

    conn.release();
    res.status(200).json({ success: true, data: rows });

  } catch (err) {
    console.error("Error fetching widow profiles:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});


router.get("/profiles/divorced", async (req, res) => {
  try {
    const conn = await pool.getConnection();

    const [rows] = await conn.query(
      "SELECT * FROM newwprofiles WHERE maritalStatus='Divorced' ORDER BY created_at DESC"
    );

    conn.release();
    res.status(200).json({ success: true, data: rows });

  } catch (err) {
    console.error("Error fetching divorced profiles:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});




router.get("/profiles/separated", async (req, res) => {
  try {
    const conn = await pool.getConnection();

    const [rows] = await conn.query(
      "SELECT * FROM newwprofiles WHERE maritalStatus='Separated' ORDER BY created_at DESC"
    );

    conn.release();
    res.status(200).json({ success: true, data: rows });

  } catch (err) {
    console.error("Error fetching separated profiles:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});



// =======================
// Get Never Married Profiles - NO CONDITIONS
// =======================
router.get("/profiles/never-married", async (req, res) => {
  try {
    const conn = await pool.getConnection();
    
    // Fetch ALL profiles with maritalStatus = 'Never Married' - NO FILTERS
    const [rows] = await conn.query(
      "SELECT * FROM newwprofiles WHERE maritalStatus = 'Never Married' ORDER BY created_at DESC"
    );
    
    conn.release();
    
    console.log(`Found ${rows.length} never married profiles`);
    res.status(200).json({ 
      success: true, 
      data: rows,
      count: rows.length 
    });
    
  } catch (err) {
    console.error("Error fetching never married profiles:", err);
    res.status(500).json({ 
      success: false, 
      message: "Server Error: " + err.message 
    });
  }
});











// =======================
// Get User Profile by ID (for dashboard)
// =======================
router.get("/api/user/profile", async (req, res) => {
    try {
        // Get user from session
        const userId = req.session.user?.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "Not authenticated" 
            });
        }

        const conn = await pool.getConnection();
        const [rows] = await conn.query(
            "SELECT id, profileFor, firstName, lastName, dob, gender, maritalStatus, profileImage, religion, caste, subCaste, motherTongue, education, college, profession, income, mobile, email, isVerified FROM newwprofiles WHERE id = ?",
            [userId]
        );
        conn.release();

        if (rows.length === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        res.status(200).json({ 
            success: true, 
            user: rows[0] 
        });
    } catch (err) {
        console.error("Error fetching user profile:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server Error: " + err.message 
        });
    }
});

// =======================
// Update User Profile
// =======================
router.post("/api/user/update-profile", async (req, res) => {
    let conn;
    try {
        // Get userId from query parameter or session
        const userId = req.query.userId || req.session.user?.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "User ID required" 
            });
        }

        const {
            profileFor, firstName, lastName, dob, gender, maritalStatus,
            profileImage, religion, caste, subCaste, motherTongue,
            education, college, profession, income,
            aboutMe, partnerExpectations, mobile
        } = req.body;

        conn = await pool.getConnection();

        // Build dynamic update query
        const updates = [];
        const values = [];

        if (profileFor !== undefined) {
            updates.push("profileFor = ?");
            values.push(profileFor);
        }
        if (firstName !== undefined) {
            updates.push("firstName = ?");
            values.push(firstName);
        }
        if (lastName !== undefined) {
            updates.push("lastName = ?");
            values.push(lastName);
        }
        if (dob !== undefined) {
            updates.push("dob = ?");
            values.push(dob);
        }
        if (gender !== undefined) {
            updates.push("gender = ?");
            values.push(gender);
        }
        if (maritalStatus !== undefined) {
            updates.push("maritalStatus = ?");
            values.push(maritalStatus);
        }
        if (religion !== undefined) {
            updates.push("religion = ?");
            values.push(religion);
        }
        if (caste !== undefined) {
            updates.push("caste = ?");
            values.push(caste);
        }
        if (subCaste !== undefined) {
            updates.push("subCaste = ?");
            values.push(subCaste);
        }
        if (motherTongue !== undefined) {
            updates.push("motherTongue = ?");
            values.push(motherTongue);
        }
        if (profileImage !== undefined) {
            updates.push("profileImage = ?");
            values.push(profileImage);
        }
        if (education !== undefined) {
            updates.push("education = ?");
            values.push(education);
        }
        if (college !== undefined) {
            updates.push("college = ?");
            values.push(college);
        }
        if (profession !== undefined) {
            updates.push("profession = ?");
            values.push(profession);
        }
        if (income !== undefined) {
            updates.push("income = ?");
            values.push(income);
        }
        if (mobile !== undefined) {
            updates.push("mobile = ?");
            values.push(mobile);
        }
        // Add aboutMe and partnerExpectations if your table has these columns
        // If not, you'll need to add them to your database table

        if (updates.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: "No fields to update" 
            });
        }

        values.push(userId);
        const sql = `UPDATE newwprofiles SET ${updates.join(", ")} WHERE id = ?`;
        
        const [result] = await conn.query(sql, values);
        conn.release();

        if (result.affectedRows === 0) {
            return res.status(404).json({ 
                success: false, 
                message: "User not found" 
            });
        }

        // Fetch updated user data
        const [updatedUser] = await pool.query(
            "SELECT id, profileFor, firstName, lastName, dob, gender, maritalStatus, profileImage, religion, caste, subCaste, motherTongue, education, college, profession, income, mobile, email FROM newwprofiles WHERE id = ?",
            [userId]
        );

        res.status(200).json({ 
            success: true, 
            message: "Profile updated successfully",
            user: updatedUser[0]
        });
    } catch (err) {
        console.error("Error updating profile:", err);
        if (conn) conn.release();
        res.status(500).json({ 
            success: false, 
            message: "Server Error: " + err.message 
        });
    }
});

// =======================
// Get Session Info
// =======================
router.get("/api/session", async (req, res) => {
    try {
        if (req.session.user) {
            res.status(200).json({ 
                success: true, 
                user: req.session.user 
            });
        } else {
            res.status(401).json({ 
                success: false, 
                message: "No active session" 
            });
        }
    } catch (err) {
        console.error("Session error:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error" 
        });
    }
});

// =======================
// Logout
// =======================
router.post("/api/logout", async (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout error:", err);
            return res.status(500).json({ 
                success: false, 
                message: "Logout failed" 
            });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ 
            success: true, 
            message: "Logged out successfully" 
        });
    });
});

// =======================
// Dashboard Stats - Get actual stats from database
// =======================
router.get("/api/user/dashboard-stats", async (req, res) => {
    try {
        // Get user from session
        const userId = req.session.user?.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "Not authenticated" 
            });
        }
        
        const conn = await pool.getConnection();
        
        // Get profile views count from the profile itself
        const [viewsResult] = await conn.query(
            'SELECT COALESCE(profile_views, 0) as profileViews FROM newwprofiles WHERE id = ?',
            [userId]
        );
        
        // Get interested profiles count (from interests table if exists)
        let interestedProfiles = 0;
        try {
            const [interestedResult] = await conn.query(
                'SELECT COUNT(*) as count FROM interests WHERE receiver_id = ?',
                [userId]
            );
            interestedProfiles = interestedResult[0].count || 0;
        } catch (e) {
            // Table might not exist, ignore
        }
        
        // Get match suggestions count
        const [userProfile] = await conn.query('SELECT gender FROM newwprofiles WHERE id = ?', [userId]);
        let matchSuggestions = 0;
        if (userProfile.length > 0) {
            const oppositeGender = userProfile[0].gender === 'Male' ? 'Female' : 'Male';
            const [matchesResult] = await conn.query(
                `SELECT COUNT(*) as count FROM newwprofiles 
                 WHERE gender = ? AND id != ?`,
                [oppositeGender, userId]
            );
            matchSuggestions = matchesResult[0].count || 0;
        }
        
        conn.release();
        
        res.status(200).json({ 
            success: true, 
            stats: {
                profileViews: viewsResult[0].profileViews || 0,
                interestedProfiles: interestedProfiles,
                matchSuggestions: matchSuggestions,
                newMessages: 0
            }
        });
    } catch (err) {
        console.error('[DASHBOARD STATS] Error:', err);
        res.status(500).json({ 
            success: false, 
            message: "Server error" 
        });
    }
});

// =======================
// Match Suggestions (placeholder)
// =======================
router.get("/api/user/match-suggestions", async (req, res) => {
    try {
        const userId = req.session.user?.id;
        
        if (!userId) {
            return res.status(401).json({ 
                success: false, 
                message: "Not authenticated" 
            });
        }

        const conn = await pool.getConnection();
        
        // Get current user's gender to find opposite gender matches
        const [currentUser] = await conn.query(
            "SELECT gender FROM newwprofiles WHERE id = ?",
            [userId]
        );
        
        let matches = [];
        if (currentUser.length > 0) {
            const oppositeGender = currentUser[0].gender === 'Male' ? 'Female' : 'Male';
            const [rows] = await conn.query(
                "SELECT id, firstName, lastName, gender, age, profession, education, city FROM newwprofiles WHERE gender = ? AND id != ? LIMIT 10",
                [oppositeGender, userId]
            );
            matches = rows;
        }
        
        conn.release();
        
        res.status(200).json({ 
            success: true, 
            matches: matches.map(m => ({
                id: m.id,
                name: `${m.firstName} ${m.lastName}`,
                age: calculateAge(m.dob),
                profession: m.profession,
                education: m.education,
                location: m.city || 'India',
                matchPercentage: Math.floor(Math.random() * 30) + 70 // Random match %
            }))
        });
    } catch (err) {
        console.error("Error fetching matches:", err);
        res.status(500).json({ 
            success: false, 
            message: "Server error" 
        });
    }
});

// Helper function to calculate age
function calculateAge(dob) {
    if (!dob) return 25;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
}
module.exports = router;



