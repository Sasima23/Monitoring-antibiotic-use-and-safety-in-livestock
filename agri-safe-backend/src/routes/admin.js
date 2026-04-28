const express = require("express");
const router = express.Router();
const User = require("../models/User");
const AnimalRecord = require("../models/AnimalRecord");
const Block = require("../models/Block");
const { protect, authorize } = require("../middleware/auth");

// ── GET /api/admin/stats ─────────────────────────────────────────────────────
// Dashboard overview stats
router.get("/stats", protect, authorize("admin"), async (req, res) => {
  try {
    const allRecords = await AnimalRecord.find();
    const today = new Date().toISOString().split("T")[0];

    // Withdrawal status calculate
    let safeCount = 0, notSafeCount = 0, cautionCount = 0;
    allRecords.forEach((r) => {
      const withdrawalEnd = new Date(r.date);
      withdrawalEnd.setDate(withdrawalEnd.getDate() + r.withdrawalDays);
      const daysRemaining = Math.ceil((withdrawalEnd - new Date()) / (1000 * 60 * 60 * 24));
      if (daysRemaining <= 0) safeCount++;
      else if (daysRemaining <= 3) cautionCount++;
      else notSafeCount++;
    });

    const [totalFarmers, totalVets, totalBlocks, todayRecords] = await Promise.all([
      User.countDocuments({ role: "farmer" }),
      User.countDocuments({ role: "veterinarian" }),
      Block.countDocuments(),
      AnimalRecord.countDocuments({ date: today }),
    ]);

    res.json({
      totalRecords: allRecords.length,
      totalFarmers,
      totalVets,
      totalBlocks,
      todayRecords,
      safeCount,
      notSafeCount,
      cautionCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/admin/users ─────────────────────────────────────────────────────
// All farmers and vets with record counts
router.get("/users", protect, authorize("admin"), async (req, res) => {
  try {
    const users = await User.find({ role: { $in: ["farmer", "veterinarian"] } }).select("-password");

    // Each user-ஓட record count
    const usersWithCount = await Promise.all(
      users.map(async (u) => {
        let recordCount = 0;
        if (u.role === "farmer") {
          recordCount = await AnimalRecord.countDocuments({ farmerId: u.userId });
        } else if (u.role === "veterinarian") {
          recordCount = await AnimalRecord.countDocuments({ veterinarian: u.name });
        }
        return {
          userId: u.userId,
          name: u.name,
          role: u.role,
          recordCount,
        };
      })
    );

    res.json(usersWithCount);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/admin/withdrawal-alerts ────────────────────────────────────────
// Animals currently in withdrawal period
router.get("/withdrawal-alerts", protect, authorize("admin"), async (req, res) => {
  try {
    const allRecords = await AnimalRecord.find();
    const now = new Date();

    const alerts = allRecords
      .map((r) => {
        const withdrawalEnd = new Date(r.date);
        withdrawalEnd.setDate(withdrawalEnd.getDate() + r.withdrawalDays);
        const daysRemaining = Math.ceil((withdrawalEnd - now) / (1000 * 60 * 60 * 24));

        let status = "Safe";
        if (daysRemaining > 3) status = "Not Safe";
        else if (daysRemaining > 0) status = "Caution";

        return { ...r.toJSON(), daysRemaining: Math.max(0, daysRemaining), status };
      })
      .filter((r) => r.status !== "Safe")
      .sort((a, b) => b.daysRemaining - a.daysRemaining);

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/admin/antibiotic-stats ─────────────────────────────────────────
// Antibiotic usage chart data
router.get("/antibiotic-stats", protect, authorize("admin"), async (req, res) => {
  try {
    const stats = await AnimalRecord.aggregate([
      { $group: { _id: "$antibioticName", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.json(stats.map((s) => ({ name: s._id, count: s.count })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// ── GET /api/admin/records/export ────────────────────────────────────────────
// Records with filters for export
router.get("/records/export", protect, authorize("admin"), async (req, res) => {
  try {
    const { fromDate, toDate, farmerId, antibioticName } = req.query;
    let query = {};

    if (fromDate || toDate) {
      query.date = {};
      if (fromDate) query.date.$gte = fromDate;
      if (toDate) query.date.$lte = toDate;
    }
    if (farmerId) query.farmerId = farmerId;
    if (antibioticName) query.antibioticName = antibioticName;

    const records = await AnimalRecord.find(query).sort({ date: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
