const express = require("express");
const router = express.Router();
const connection = require("../db");
const multer = require("multer");
const path = require("path");
const nodemailer = require("nodemailer");

// Create table if it doesn't exist
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS brokers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    location VARCHAR(100),
    experience INT,
    photo VARCHAR(255),
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`;

(async () => {
  try {
    await connection.query(createTableQuery);
    console.log("✅ marriage_Broker table ensured.");
  } catch (err) {
    console.error("Error ensuring broker table:", err);
  }
})();

// Multer setup for photo upload
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/");
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Nodemailer setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "hitaishimatrimony@gmail.com", // use a verified Gmail
    pass: "hgkh ylho pibp bopl"      // generate app password from Google security
  }
});

// GET: Fetch all brokers
router.get("/brokers", async (req, res) => {
  try {
    // Debug: Log before query
    console.log("[BROKERS] GET /brokers called");
    const [brokers] = await connection.query("SELECT * FROM brokers ORDER BY submitted_at DESC");
    // Debug: Log result
    console.log("[BROKERS] Query result:", brokers);
    res.status(200).json(brokers);
  } catch (err) {
    console.error("Error fetching brokers:", err);
    res.status(500).json({ error: "Failed to fetch brokers.", details: err.message });
  }
});

// POST: Submit broker form
router.post("/brokers", upload.single("photo"), async (req, res) => {
  const { name, email, phone, location, experience } = req.body;
  const photo = req.file ? req.file.filename : null;

  if (!name || !email || !phone || !location || !experience || !photo) {
    return res.status(400).json({ error: "All fields are required." });
  }

  const query = `
    INSERT INTO brokers (name, email, phone, location, experience, photo)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  try {
    await connection.query(query, [name, email, phone, location, experience, photo]);

    // Send email to user
    const mailOptions = {
      from: 'hitaishimatrimony@gmail.com',
      to: email,
      subject: "Broker Application Received",
      html: `<p>Dear ${name},</p>
             <p>Thank you for applying as a broker with Hitaishi Financial Services. We have received your details and will review your application shortly.</p>
             <p>Regards,<br>Team Hitaishi</p>`
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Application submitted successfully!" });
  } catch (err) {
    console.error("Insert or Mail Error:", err);
    res.status(500).json({ error: "Failed to save data or send email." });
  }
});



module.exports = router;