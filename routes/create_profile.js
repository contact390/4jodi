const express = require('express');
const router = express.Router();
const db = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');

// Create upload directory if not exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, uniqueName);
  }
});
const upload = multer({ storage });

// Create table if not exists
const createTable = async () => {
  const query = `
    CREATE TABLE IF NOT EXISTS createprofiles2 (
      id INT AUTO_INCREMENT PRIMARY KEY,
      firstName VARCHAR(100) NOT NULL,
      lastName VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL  UNIQUE,
      phone VARCHAR(20) NOT NULL,
      gender VARCHAR(20) NOT NULL,
      dob DATE NOT NULL,
      profilePhoto VARCHAR(255),
      about TEXT NOT NULL,
      fatherName VARCHAR(100) NOT NULL,
      fatherOccupation VARCHAR(100),
      motherName VARCHAR(100) NOT NULL,
      motherOccupation VARCHAR(100),
      siblings VARCHAR(50),
      familyType VARCHAR(50),
      familyValues VARCHAR(50),
      religion VARCHAR(100) NOT NULL,
      caste VARCHAR(100) NOT NULL,
      subCaste VARCHAR(100),
      gothram VARCHAR(100),
      motherTongue VARCHAR(100) NOT NULL,
      diet VARCHAR(50) NOT NULL,
      horoscope VARCHAR(50) NOT NULL,
      height VARCHAR(50) NOT NULL,
      weight VARCHAR(50),
      bloodGroup VARCHAR(10),
      complexion VARCHAR(50),
      disability VARCHAR(100),
      education VARCHAR(100) NOT NULL,
      educationField VARCHAR(100) NOT NULL,
      occupation VARCHAR(100) NOT NULL,
      jobTitle VARCHAR(100),
      company VARCHAR(100),
      income VARCHAR(100) NOT NULL,
      workLocation VARCHAR(100),
      maritalStatus VARCHAR(50) NOT NULL,
      children VARCHAR(50),
      drinking VARCHAR(50),
      smoking VARCHAR(50),
      hobbies TEXT,
      createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;
  try {
    await db.query(query);
    console.log('✅ "createprofiles2" table created or already exists.');
  } catch (err) {
    console.error('❌ Failed to create "createprofiles2" table:', err);
  }
};
createTable();

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'hitaishimatrimony@gmail.com',
    pass: 'hgkh ylho pibp bopl'
  }
});

// POST route for profile creation
router.post('/create_profile', upload.single('profilePhoto'), async (req, res) => {
  try {
    const {
      firstName, lastName, email, phone, gender, dob, about,
      fatherName, fatherOccupation, motherName, motherOccupation, siblings,
      familyType, familyValues, religion, caste, subCaste, gothram,
      motherTongue, diet, horoscope, height, weight, bloodGroup, complexion,
      disability, education, educationField, occupation, jobTitle,
      company, income, workLocation, maritalStatus, children,
      drinking, smoking, hobbies
    } = req.body;

    const profilePhoto = req.file ? req.file.filename : null;

    const query = `
      INSERT INTO createprofiles2 (
        firstName, lastName, email, phone, gender, dob, profilePhoto, about,
        fatherName, fatherOccupation, motherName, motherOccupation, siblings,
        familyType, familyValues, religion, caste, subCaste, gothram,
        motherTongue, diet, horoscope, height, weight, bloodGroup, complexion,
        disability, education, educationField, occupation, jobTitle,
        company, income, workLocation, maritalStatus, children,
        drinking, smoking, hobbies
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      firstName, lastName, email, phone, gender, dob, profilePhoto, about,
      fatherName, fatherOccupation, motherName, motherOccupation, siblings,
      familyType, familyValues, religion, caste, subCaste, gothram,
      motherTongue, diet, horoscope, height, weight, bloodGroup, complexion,
      disability, education, educationField, occupation, jobTitle,
      company, income, workLocation, maritalStatus, children,
      drinking, smoking, hobbies
    ];

    await db.query(query, values);

    // Validate recipient email before sending
    if (!email) {
      return res.status(400).json({ error: 'Recipient email is missing' });
    }

    // Send confirmation email
    const mailOptions = {
      from: 'hitaishimatrimony@gmail.com',
      to: email,
      subject: 'Profile Created Successfully ✅',
      html: `
        <div style="font-family:Arial,sans-serif;background:#f4f4f4;padding:20px;border-radius:8px;">
          <h2 style="color:#198754;">Hello ${firstName},</h2>
          <p>Your matrimonial profile has been created successfully on <strong>Hitaishi Matrimony</strong>.</p>
          <p><strong>Profile Summary:</strong></p>
          <ul style="line-height:1.6;">
            <li><strong>Name:</strong> ${firstName} ${lastName}</li>
            <li><strong>Email:</strong> ${email}</li>
            <li><strong>Phone:</strong> ${phone}</li>
            <li><strong>Gender:</strong> ${gender}</li>
            <li><strong>DOB:</strong> ${dob}</li>
            <li><strong>Religion:</strong> ${religion}</li>
            <li><strong>Caste:</strong> ${caste}</li>
          </ul>
          <p>We will review your profile and get back to you shortly.</p>
          <p style="margin-top:20px;color:#6c757d;">– Hitaishi Matrimony Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(201).json({ message: 'Profile created and email sent successfully' });
  } catch (error) {
    console.error('❌ Error creating profile or sending mail:', error);
    res.status(500).json({ error: 'Failed to create profile or send email' });
  }
});

// GET all profiles
router.get('/create_profile', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM createprofiles2');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching profiles:', error);
    res.status(500).json({ error: 'Failed to retrieve profiles' });
  }
});

// GET profile by email
router.get('/create_profile/:email', async (req, res) => {
  const { email } = req.params;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    const [rows] = await db.query('SELECT * FROM createprofiles2 WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.status(200).json(rows[0]);
  } catch (error) {
    console.error('Error fetching profile by email:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});




// POST: Send connection request email
// POST: Send connection request email
router.post('/connect', async (req, res) => {
  const { profileId, senderName, senderEmail, senderPhone } = req.body;

  if (!profileId || !senderName || !senderEmail) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    // Fetch recipient's email from DB
    const [rows] = await db.query('SELECT email, firstName, lastName FROM createprofiles2 WHERE id = ?', [profileId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const recipient = rows[0];

    // Email content
    const mailOptions = {
      from: 'hitaishimatrimony@gmail.com',
      to: recipient.email, // Fixed: Use actual recipient email from DB
      subject: 'You Have a New Connection Request 💌',
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px;background:#f8f9fa;border-radius:8px;">
          <h2 style="color:#198754;">Hello ${recipient.firstName},</h2>
          <p>Good news! Someone is interested in your profile on <strong>Hitaishi Matrimony</strong>.</p>
          <p><strong>Sender Details:</strong></p>
          <ul style="line-height:1.6;">
            <li><strong>Name:</strong> ${senderName}</li>
            <li><strong>Email:</strong> ${senderEmail}</li>
            <li><strong>Phone:</strong> ${senderPhone || 'Not Provided'}</li>
          </ul>
          <p>Please log in to your account to view more details.</p>
          <p style="margin-top:20px;color:#6c757d;">– Hitaishi Matrimony Team</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Connection request sent successfully' });
  } catch (error) {
    console.error('❌ Error sending connection email:', error);
    res.status(500).json({ error: 'Failed to send connection email' });
  }
});


module.exports = router;
