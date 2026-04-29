const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const db = require("../db"); // your db.js

const router = express.Router();

router.use(express.json());
router.use(cookieParser());
router.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));

// 🔐 Login (set HttpOnly cookie)
router.post("/login", (req, res) => {
  const token = jwt.sign({ user: "demoUser" }, "secretKey", {
    expiresIn: "1h"
  });

  res.cookie("token", token, {
    httpOnly: true,
    secure: false, // true in production
    sameSite: "Strict"
  });

  res.json({ message: "Login successful" });
});


// 🛡️ Middleware to check cookie
const verifyToken = (req, res, next) => {
  const token = req.cookies.token;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    jwt.verify(token, "secretKey");
    next();
  } catch (err) {
    res.status(401).json({ message: "Invalid token" });
  }
};


// 📩 Save form data (unprotected route)
router.post("/save-user", (req, res) => {
  const { name, email } = req.body;

  const sql = "INSERT INTO usersdemo (name, email) VALUES (?, ?)";
  
  db.query(sql, [name, email], (err, result) => {
    if (err) {
      return res.status(500).json(err);
    }
    res.json({ message: "User saved successfully" });
  });
});



module.exports = router;