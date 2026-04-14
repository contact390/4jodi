const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');

// ✅ Create affiliate_applications table
const createAffiliateTable = async () => {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS affiliate_applications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      fullName VARCHAR(100),
      email VARCHAR(100),
      phone VARCHAR(20),
      website VARCHAR(255),
      message TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  try {
    await db.query(createTableQuery);
    console.log('✅ affiliate_applications table is ready.');
  } catch (err) {
    console.error('❌ Error creating affiliate_applications table:', err);
  }
};

createAffiliateTable(); // ← ensure it's called on module load

// ✅ Handle affiliate form POST
router.post('/marriage_affiliate', async (req, res) => {
  const { fullName, email, phone, website, message } = req.body;

  const insertQuery = `
    INSERT INTO affiliate_applications (fullName, email, phone, website, message)
    VALUES (?, ?, ?, ?, ?)
  `;

  try {
    const [result] = await db.query(insertQuery, [fullName, email, phone, website, message]);

    // ✅ Email setup
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'hitaishimatrimony@gmail.com',
        pass: 'hgkh ylho pibp bopl'
      }
    });

    const mailOptions = {
      from: 'hitaishimatrimony@gmail.com',
      to: email,
      subject: 'Affiliate Application Received – Hitaishi Matrimony',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; background-color: #f9f9f9;">
          <h2 style="color: #d6336c; text-align: center;">Affiliate Application Received</h2>
          <p style="font-size: 15px;">Dear <strong>${fullName}</strong>,</p>
          <p style="font-size: 15px;">Thanks for your application. Here are your submitted details:</p>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <tr><td style="padding: 8px; font-weight: bold;">Full Name:</td><td style="padding: 8px;">${fullName}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${email}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Phone:</td><td style="padding: 8px;">${phone}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Website:</td><td style="padding: 8px;">${website}</td></tr>
            <tr><td style="padding: 8px; font-weight: bold;">Message:</td><td style="padding: 8px;">${message}</td></tr>
          </table>
          <p style="margin-top: 20px;">Our team will contact you shortly.</p>
          <p>Best regards,<br><strong>Hitaishi Matrimony Team</strong></p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    res.json({
      success: true,
      message: 'Form submitted and confirmation email sent!',
      id: result.insertId
    });

  } catch (err) {
    console.error('❌ Error inserting or emailing affiliate application:', err);
    res.status(500).json({ success: false, error: 'Server error occurred' });
  }
});

module.exports = router;
