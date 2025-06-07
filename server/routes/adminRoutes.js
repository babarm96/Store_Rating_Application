const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");


const checkAdmin = (req, res, next) => {

  const role = req.headers["x-role"];
  if (role !== "admin") return res.status(403).json({ message: "Access denied" });
  next();
};

// ----------------- Add User (Admin creates users) -----------------
router.post("/add-user", checkAdmin, async (req, res) => {
  const { name, email, address, password, role } = req.body;

  if (!name || !email || !address || !password || !role) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const sql = "INSERT INTO users (name, email, address, password, role) VALUES (?, ?, ?, ?, ?)";

  db.query(sql, [name, email, address, hashedPassword, role], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.status(201).json({ message: "User added successfully" });
  });
});

// ----------------- Add Store -----------------
router.post("/add-store", checkAdmin, (req, res) => {
  const { name, email, address } = req.body;

  if (!name || !email || !address) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const sql = "INSERT INTO stores (name, email, address) VALUES (?, ?, ?)";

  db.query(sql, [name, email, address], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.status(201).json({ message: "Store added successfully" });
  });
});

// ----------------- Dashboard Stats -----------------
router.get("/dashboard-stats", checkAdmin, (req, res) => {
  const queries = {
    users: "SELECT COUNT(*) AS totalUsers FROM users",
    stores: "SELECT COUNT(*) AS totalStores FROM stores",
    ratings: "SELECT COUNT(*) AS totalRatings FROM ratings",
  };

  let results = {};

  db.query(queries.users, (err, userRes) => {
    if (err) return res.status(500).json({ error: err });
    results.totalUsers = userRes[0].totalUsers;

    db.query(queries.stores, (err, storeRes) => {
      if (err) return res.status(500).json({ error: err });
      results.totalStores = storeRes[0].totalStores;

      db.query(queries.ratings, (err, ratingRes) => {
        if (err) return res.status(500).json({ error: err });
        results.totalRatings = ratingRes[0].totalRatings;

        res.json(results);
      });
    });
  });
});

// ----------------- List All Users -----------------
router.get("/users", checkAdmin, (req, res) => {
  const sql = "SELECT id, name, email, address, role FROM users";
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
});

// ----------------- List All Stores -----------------
router.get("/stores", checkAdmin, (req, res) => {
  const sql = `
    SELECT s.id, s.name, s.email, s.address,
           IFNULL(AVG(r.rating), 0) AS rating
    FROM stores s
    LEFT JOIN ratings r ON s.id = r.store_id
    GROUP BY s.id
  `;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
});

// ----------------- Filter Users -----------------
router.get("/filter-users", checkAdmin, (req, res) => {
  const { name, email, address, role } = req.query;

  let sql = "SELECT * FROM users WHERE 1=1";
  const params = [];

  if (name) {
    sql += " AND name LIKE ?";
    params.push(`%${name}%`);
  }
  if (email) {
    sql += " AND email LIKE ?";
    params.push(`%${email}%`);
  }
  if (address) {
    sql += " AND address LIKE ?";
    params.push(`%${address}%`);
  }
  if (role) {
    sql += " AND role = ?";
    params.push(role);
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
});

// ----------------- Filter Stores -----------------
router.get("/filter-stores", checkAdmin, (req, res) => {
  const { name, email, address } = req.query;

  let sql = "SELECT * FROM stores WHERE 1=1";
  const params = [];

  if (name) {
    sql += " AND name LIKE ?";
    params.push(`%${name}%`);
  }
  if (email) {
    sql += " AND email LIKE ?";
    params.push(`%${email}%`);
  }
  if (address) {
    sql += " AND address LIKE ?";
    params.push(`%${address}%`);
  }

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
});

// ----------------- View User Details -----------------
router.get("/user/:id", checkAdmin, (req, res) => {
  const userId = req.params.id;

  const sql = "SELECT id, name, email, address, role FROM users WHERE id = ?";
  db.query(sql, [userId], (err, results) => {
    if (err) return res.status(500).json({ error: err });
    if (results.length === 0) return res.status(404).json({ message: "User not found" });

    const user = results[0];

    if (user.role === "store-owner") {
      // Add store rating info
      const storeRatingSql = `
        SELECT IFNULL(AVG(r.rating), 0) AS avgRating
        FROM stores s
        JOIN ratings r ON s.id = r.store_id
        WHERE s.email = ?
      `;
      db.query(storeRatingSql, [user.email], (err, ratingRes) => {
        if (err) return res.status(500).json({ error: err });
        user.rating = ratingRes[0].avgRating;
        res.json(user);
      });
    } else {
      res.json(user);
    }
  });
});

module.exports = router;
