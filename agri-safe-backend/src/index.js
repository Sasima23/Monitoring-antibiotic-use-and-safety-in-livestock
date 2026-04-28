require("dotenv").config();
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/db");

// Routes
const authRoutes       = require("./routes/auth");
const recordRoutes     = require("./routes/records");
const blockchainRoutes = require("./routes/blockchain");
const iotRoutes        = require("./routes/iot");
const adminRoutes      = require("./routes/admin");

const app = express();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/auth",       authRoutes);
app.use("/api/records",    recordRoutes);
app.use("/api/blockchain", blockchainRoutes);
app.use("/api/iot",        iotRoutes);
app.use("/api/admin",      adminRoutes);

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Agri-Safe Ledger API running 🌾" });
});

// ── 404 handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// ── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Server error", error: err.message });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📡 API endpoints:`);
    console.log(`   POST /api/auth/login`);
    console.log(`   GET  /api/auth/me`);
    console.log(`   GET  /api/records`);
    console.log(`   POST /api/records`);
    console.log(`   GET  /api/blockchain`);
    console.log(`   GET  /api/blockchain/validate`);
    console.log(`   GET  /api/iot/live/:rfid`);
  });
});
