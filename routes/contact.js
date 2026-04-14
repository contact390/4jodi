// routes/api.js
const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');

// Create "contact" table if it doesn't exist
(async () => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS contact(
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100),
        email VARCHAR(100),
        phone VARCHAR(20),
        message TEXT,
        date DATETIME
      )
    `);
    console.log('✅ Table "contact us" is ready.');
  } catch (err) {
    console.error('❌ Table creation failed:', err.message);
  }
})();

// Nodemailer transporter setup (using Gmail as example)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'hitaishimatrimony@gmail.com',       // replace with your email
    pass: 'hgkh ylho pibp bopl' // use app password if 2FA enabled
  }
});

// POST contact route
router.post('/contact', async (req, res) => {
  const { name, email, phone, message, date } = req.body;

  if (!name || !email || !phone || !message) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  try {
    // Insert into DB
    await db.query(
      `INSERT INTO contact (name, email, phone, message, date)
       VALUES (?, ?, ?, ?, ?)`,
      [name, email, phone, message, date]
    );

    // Send email notification
    const mailOptions = {
      from: 'hitaishimatrimony@gmail.com',
      to: email, // can also send to user: email,
      subject: 'New Contact Message Received',
      html: `
        <h2>New Message from Website</h2>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Phone:</strong> ${phone}</p>
        <p><strong>Message:</strong><br/>${message}</p>
        <p><strong>Date:</strong> ${date}</p>
      `
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: 'Message received and email sent successfully!' });
  } catch (err) {
    console.error('❌ Error inserting data or sending mail:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET all contacts
router.get('/contacts', async (req, res) => {
  try {
    const [rows] = await db.query(`SELECT * FROM contact ORDER BY date DESC`);
    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Error fetching data:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

// GET contact by email
router.get('/contacts/:email', async (req, res) => {
  const email = req.params.email;

  try {
    const [rows] = await db.query(`SELECT * FROM contact WHERE email = ?`, [email]);
    if (rows.length === 0) {
      return res.status(404).json({ message: 'No contact found for this email.' });
    }
    res.status(200).json(rows);
  } catch (err) {
    console.error('❌ Error fetching data:', err.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

module.exports = router;
