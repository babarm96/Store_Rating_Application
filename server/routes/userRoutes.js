const express = require("express");
const router = express.Router();
const db = require("../config/db");
const bcrypt = require("bcryptjs");


const getUserId = (req) => {
  return req.headers["x-user-id"];
};

// ----------------- View All Stores -----------------
router.get("/stores", (req, res) => {
  const userId = getUserId(req);
  const sql = `
    SELECT s.id, s.name, s.address,
      IFNULL(AVG(r.rating), 0) AS averageRating,
      (SELECT rating FROM ratings WHERE store_id = s.id AND user_id = ?) AS userRating
    FROM stores s
    LEFT JOIN ratings r ON s.id = r.store_id
    GROUP BY s.id
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
});

// ----------------- Search Stores -----------------
router.get("/search", (req, res) => {
  const { name, address } = req.query;
  const userId = getUserId(req);

  let sql = `
    SELECT s.id, s.name, s.address,
      IFNULL(AVG(r.rating), 0) AS averageRating,
      (SELECT rating FROM ratings WHERE store_id = s.id AND user_id = ?) AS userRating
    FROM stores s
    LEFT JOIN ratings r ON s.id = r.store_id
    WHERE 1=1
  `;
  const params = [userId];

  if (name) {
    sql += " AND s.name LIKE ?";
    params.push(`%${name}%`);
  }

  if (address) {
    sql += " AND s.address LIKE ?";
    params.push(`%${address}%`);
  }

  sql += " GROUP BY s.id";

  db.query(sql, params, (err, result) => {
    if (err) return res.status(500).json({ error: err });
    res.json(result);
  });
});

// ----------------- Submit or Update Rating -----------------
router.post("/rate", (req, res) => {
  const { store_id, rating } = req.body;
  const user_id = getUserId(req);

  if (!store_id || !rating || rating < 1 || rating > 5) {
    return res.status(400).json({ message: "Invalid store or rating" });
  }

  const checkSql = "SELECT * FROM ratings WHERE store_id = ? AND user_id = ?";

  db.query(checkSql, [store_id, user_id], (err, results) => {
    if (err) return res.status(500).json({ error: err });

    if (results.length > 0) {
      const updateSql = "UPDATE ratings SET rating = ? WHERE store_id = ? AND user_id = ?";
      db.query(updateSql, [rating, store_id, user_id], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Rating updated" });
      });
    } else {
      const insertSql = "INSERT INTO ratings (store_id, user_id, rating) VALUES (?, ?, ?)";
      db.query(insertSql, [store_id, user_id, rating], (err) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Rating submitted" });
      });
    }
  });
});

// ----------------- Update Password -----------------
router.put("/update-password", async (req, res) => {
  const userId = getUserId(req);
  const { newPassword } = req.body;

  if (!newPassword || !/^(?=.*[A-Z])(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,16}$/.test(newPassword)) {
    return res.status(400).json({
      message: "Password must be 8-16 characters with at least one uppercase and one special character.",
    });
  }

  const hashed = await bcrypt.hash(newPassword, 10);
  const sql = "UPDATE users SET password = ? WHERE id = ?";

  db.query(sql, [hashed, userId], (err) => {
    if (err) return res.status(500).json({ error: err });
    res.json({ message: "Password updated successfully" });
  });
});

module.exports = router;
