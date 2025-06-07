const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "yoursecret";


router.get('/', (req, res) => {
    return res.status(200).json({ message: 'API Calling...' })
})

router.post("/register", async (req, res) => {
  const { name, email, address, password, role } = req.body;

  if (!name || !email || !address || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }


  const userRole = role || "user";

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error." });
    if (results.length > 0) return res.status(409).json({ message: "Email already registered." });

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const sql = "INSERT INTO users (name, email, address, password, role) VALUES (?, ?, ?, ?, ?)";
      db.query(sql, [name, email, address, hashedPassword, userRole], (err, result) => {
        if (err) return res.status(500).json({ message: "Failed to register user." });
        res.status(201).json({ message: "User registered successfully." });
      });
    } catch (error) {
      res.status(500).json({ message: "Server error." });
    }
  });
});

// Login route - only required field checks
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) return res.status(400).json({ message: "Email and password are required." });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Database error." });
    if (results.length === 0) return res.status(401).json({ message: "Invalid email or password." });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password." });

    // create JWT token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  });
});

module.exports = router;
