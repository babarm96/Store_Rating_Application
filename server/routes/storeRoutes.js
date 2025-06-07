const express = require("express");
const router = express.Router();
const db = require("../config/db");

const getOwnerEmail = (req) => req.headers["x-owner-email"];
const getOwnerId = (req) => req.headers["x-user-id"];

// ----------------- Get Store Owner Dashboard -----------------
router.get("/owner/dashboard", (req, res) => {
  const ownerEmail = getOwnerEmail(req);

  const getStoreSql = "SELECT id FROM stores WHERE email = ?";
  db.query(getStoreSql, [ownerEmail], (err, storeRes) => {
    if (err) return res.status(500).json({ error: err });
    if (storeRes.length === 0) return res.status(404).json({ message: "Store not found for owner" });

    const storeId = storeRes[0].id;

    const avgRatingSql = "SELECT IFNULL(AVG(rating), 0) AS avgRating FROM ratings WHERE store_id = ?";
    const usersSql = `
      SELECT u.id, u.name, u.email, r.rating
      FROM ratings r
      JOIN users u ON u.id = r.user_id
      WHERE r.store_id = ?
    `;

    db.query(avgRatingSql, [storeId], (err, avgRes) => {
      if (err) return res.status(500).json({ error: err });

      db.query(usersSql, [storeId], (err, usersRes) => {
        if (err) return res.status(500).json({ error: err });

        res.json({
          storeId,
          averageRating: avgRes[0].avgRating,
          usersRated: usersRes,
        });
      });
    });
  });
});

// ----------------- Store Owner Password Update -----------------
const bcrypt = require("bcryptjs");

router.put("/owner/update-password", async (req, res) => {
  const userId = getOwnerId(req);
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
