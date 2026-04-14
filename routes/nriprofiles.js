const express = require('express');
const router = express.Router();
const db = require('../db'); // mysql2/promise pool
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// Ensure NRI table exists
(async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS nri_profiles (
      id INT AUTO_INCREMENT PRIMARY KEY,
      full_name VARCHAR(100),
      gender VARCHAR(20),
      dob DATE,
      email VARCHAR(100),
      mobile VARCHAR(20),
      residence_country VARCHAR(100),
      years_abroad INT,
      visa_status VARCHAR(100),
      religion VARCHAR(50),
      mother_tongue VARCHAR(50),
      profession VARCHAR(100),
      marital_status VARCHAR(30),
      photo_path VARCHAR(255),
      bio TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  try {
    await db.query(createTableQuery);
    console.log('✅ "nri_profiles" table ensured.');
  } catch (err) {
    console.error('Table creation failed:', err);
  }
})();

// Submit profile
router.post('/nriprofile', upload.single('photo'), async (req, res) => {
  try {
    const {
      full_name, gender, dob, email, mobile, residence_country,
      years_abroad, visa_status, religion, mother_tongue,
      profession, marital_status, bio
    } = req.body;

    const photo_path = req.file ? req.file.path : '';

    const insertQuery = `
      INSERT INTO nri_profiles (
        full_name, gender, dob, email, mobile, residence_country,
        years_abroad, visa_status, religion, mother_tongue,
        profession, marital_status, photo_path, bio
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      full_name, gender, dob, email, mobile, residence_country,
      years_abroad, visa_status, religion, mother_tongue,
      profession, marital_status, photo_path, bio
    ];

    await db.query(insertQuery, values);

    // Send confirmation email
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hitaishimatrimony@gmail.com',
        pass: 'hgkh ylho pibp bopl' // Use App Password only
      }
    });

    const mailOptions = {
      from: 'hitaishimatrimony@gmail.com',
      to: email,
      subject: 'NRI Matrimony Profile Submitted',
      text: `Dear ${full_name},\n\nYour NRI profile has been successfully submitted.\n\nThank you for choosing Hitaishi Matrimony.\n\nBest regards,\nHitaishi Matrimony Team`
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Profile submitted and confirmation email sent successfully!' });
  } catch (err) {
    console.error('Error inserting profile or sending email:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// Fetch all profiles
router.get('/nriprofile', async (req, res) => {
  try {
    const [profiles] = await db.query('SELECT * FROM nri_profiles ORDER BY created_at DESC');
    res.json(profiles);
  } catch (err) {
    console.error('Error fetching profiles:', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// 📩 Connect request route
router.post('/connect-request', async (req, res) => {
  const { toEmail, fromName } = req.body;
  if (!toEmail || !fromName) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hitaishimatrimony@gmail.com',
        pass: 'hgkh ylho pibp bopl' // Use App Password only
      }
    });

    const mailOptions = {
      from: 'hitaishimatrimony@gmail.com',
      to: toEmail,
      subject: 'New Connect Request on Hitaishi Matrimony',
      text: `Hello,\n\n${fromName} is interested in connecting with you on Hitaishi Matrimony.\n\nPlease log in to view and respond.\n\nRegards,\nHitaishi Matrimony`
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: 'Connect request sent to profile owner!' });
  } catch (err) {
    console.error('Error sending connect request:', err);
    res.status(500).json({ message: 'Failed to send connect request' });
  }
});

module.exports = router;
