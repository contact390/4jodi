// api.js
const express = require("express");
const router = express.Router();
const pool = require("../db");
const nodemailer = require("nodemailer");

// Ensure table exists
(async () => {
  try {
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS membership_plans (
        id INT AUTO_INCREMENT PRIMARY KEY,
        packageName VARCHAR(100) NOT NULL,
        packagePrice VARCHAR(50) NOT NULL,
        fullName VARCHAR(150) NOT NULL,
        email VARCHAR(150) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    const connection = await pool.getConnection();
    await connection.query(createTableQuery);
    connection.release();
    console.log("✅ membership_plans table is ready");
  } catch (err) {
    console.error("❌ Error creating table:", err);
  }
})();

// Setup Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'gmail', // You can also use SMTP settings if not Gmail
  auth: {
    user: "hitaishimatrimony@gmail.com", // Replace with your email
    pass: "hgkh ylho pibp bopl",   // Use App Password if using Gmail
  },
});

// POST route for membership plan enrollment
router.post("/membership_plan", async (req, res) => {
  const { packageName, packagePrice, fullName, email, phone } = req.body;

  if (!packageName || !packagePrice || !fullName || !email || !phone) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    // Insert into DB
    const insertQuery = `
      INSERT INTO membership_plans (packageName, packagePrice, fullName, email, phone)
      VALUES (?, ?, ?, ?, ?)
    `;
    const connection = await pool.getConnection();
    await connection.query(insertQuery, [packageName, packagePrice, fullName, email, phone]);
    connection.release();

    // Send Email
    const mailOptions = {
      from: 'hitaishimatrimony@gmail.com', // Sender
      to: email, // Send to the user
      subject: `✅ Membership Enrollment Confirmation - ${packageName}`,
      html: `
        <h2>Hello ${fullName},</h2>
        <p>Thank you for enrolling in our <b>${packageName}</b> plan.</p>
        <p><b>Plan:</b> ${packageName} <br>
           <b>Price:</b> ${packagePrice} <br>
           <b>Phone:</b> ${phone}</p>
        <p>Our team will contact you shortly.</p>
        <br>
        <p style="color:#007bff;">- Hitaishi Matrimony Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    res.json({ message: "Membership enrollment saved & email sent successfully" });
  } catch (err) {
    console.error("❌ Error inserting data or sending email:", err);
    res.status(500).json({ error: "Server error while saving data or sending email" });
  }
});

// GET route to fetch all membership enrollments
router.get("/membership_plans", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * FROM membership_plans ORDER BY created_at DESC");
    connection.release();

    res.json(rows); // Send JSON data
  } catch (err) {
    console.error("❌ Error fetching data:", err);
    res.status(500).json({ error: "Server error while fetching data" });
  }
});





// GET route to fetch a single member by email or phone
// GET route to fetch one member by Email
router.get("/membership_plan/email/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const connection = await pool.getConnection();
    const [rows] = await connection.query("SELECT * FROM membership_plans WHERE email = ?", [email]);
    connection.release();

    if (rows.length === 0) {
      return res.status(404).json({ error: "Subscriber not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ Error fetching subscriber:", err);
    res.status(500).json({ error: "Server error while fetching subscriber" });
  }
});


module.exports = router;
