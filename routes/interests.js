const express = require("express");
const router = express.Router();
const pool = require("../db");
const nodemailer = require('nodemailer');

// configure mail transporter (reuse same account as registration email)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'hitaishimatrimony@gmail.com',
    pass: 'hgkh ylho pibp bopl'
  }
});

// ============================
// SEND INTEREST (uses session user as sender when available)
// ============================
router.post("/send-interest", async (req, res) => {
  try {
    // Prefer server-side session user
    const sessionUser = req.session && req.session.user ? req.session.user : null;
    // allow anonymous (no session) sender
    const sender_id = sessionUser ? sessionUser.id : (req.body.sender_id || null);
    const receiver_id = req.body.receiver_id;

    if (!receiver_id) return res.status(400).json({ success: false, message: 'Receiver id required' });
    if (sender_id && parseInt(sender_id) === parseInt(receiver_id)) return res.json({ success: false, message: 'Cannot send interest to yourself' });

    const conn = await pool.getConnection();
    // check duplicates only when sender_id present (for anonymous allow duplicates)
    if (sender_id) {
      const [check] = await conn.query(
        "SELECT * FROM interests WHERE sender_id = ? AND receiver_id = ?",
        [sender_id, receiver_id]
      );

      if (check.length > 0) {
        conn.release();
        return res.json({ success: false, message: "Interest already sent" });
      }
    }

    await conn.query(
      "INSERT INTO interests (sender_id, receiver_id) VALUES (?, ?)",
      [sender_id, receiver_id]
    );

    // fetch receiver details to send email
    const [recRows] = await conn.query("SELECT firstName, email FROM newwprofiles WHERE id = ?", [receiver_id]);
    const receiver = recRows && recRows[0] ? recRows[0] : null;

    // fetch sender name for email
    const [senderRows] = await conn.query("SELECT firstName, email FROM newwprofiles WHERE id = ?", [sender_id]);
    const sender = senderRows && senderRows[0] ? senderRows[0] : null;

    conn.release();

    // send notification email to receiver (best-effort)
    if (receiver && receiver.email) {
      const mailOptions = {
        from: 'hitaishimatrimony@gmail.com',
        to: receiver.email,
        subject: 'You have received an interest on Hitaishi Matrimony',
        html: `<p>Hi ${receiver.firstName || 'User'},</p>
               <p>You have received an interest from ${sender ? sender.firstName : 'a user'} on Hitaishi Matrimony.</p>
               <p>To view the profile, visit: <a href="http://${req.headers.host}/single_profile.html?id=${sender_id}">View Sender Profile</a></p>
               <p>Regards,<br/>Hitaishi Matrimony Team</p>`
      };

      transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.error('Interest email error:', err);
      });
    }

    return res.json({ success: true, message: "Interest sent successfully" });
  } catch (err) {
    console.error("Error sending interest:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ============================
// CHECK IF INTEREST ALREADY SENT
// ============================
router.post("/check-interest", async (req, res) => {
  try {
    const sessionUser = req.session && req.session.user ? req.session.user : null;
    const sender_id = sessionUser ? sessionUser.id : req.body.sender_id;
    const receiver_id = req.body.receiver_id;

    if (!sender_id) return res.json({ success: true, exists: false });

    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      "SELECT * FROM interests WHERE sender_id=? AND receiver_id=?",
      [sender_id, receiver_id]
    );
    conn.release();

    if (rows.length > 0) {
      return res.json({ success: true, exists: true });
    }

    res.json({ success: true, exists: false });
  } catch (err) {
    console.error("Error checking interest:", err);
    res.status(500).json({ success: false });
  }
});

// ============================
// VIEW INTERESTS RECEIVED
// ============================
router.get("/received/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      `SELECT i.*, p.firstName, p.lastName, p.profileImage
       FROM interests i
       JOIN newwprofiles p ON i.sender_id = p.id
       WHERE i.receiver_id = ?`,
      [userId]
    );

    conn.release();

    res.json({ success: true, data: rows });
  } catch (err) {
    console.error("Error loading received interests:", err);
    res.status(500).json({ success: false });
  }
});

module.exports = router;
