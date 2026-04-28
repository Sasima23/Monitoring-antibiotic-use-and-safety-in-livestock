const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const AnimalRecord = require("../models/AnimalRecord");
const Block = require("../models/Block");
const { protect, authorize } = require("../middleware/auth");

// Simple SHA-256 hash (real cryptography!)
const computeHash = (data) => {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
};

// Block உருவாக்கி MongoDB-ல save பண்றது
const addBlockToDB = async (data) => {
  const lastBlock = await Block.findOne().sort({ index: -1 });

  const previousHash = lastBlock ? lastBlock.hash : "0";
  const index = lastBlock ? lastBlock.index + 1 : 1;
  const timestamp = new Date().toISOString();
  const nonce = Math.floor(Math.random() * 100000);

  const hash = computeHash({ index, data, previousHash, timestamp, nonce });

  const block = await Block.create({
    index,
    timestamp,
    data,
    previousHash,
    hash,
    nonce,
  });

  return block;
};

// GET /api/records
// எல்லா records - admin மட்டும் / farmer-க்கு அவங்க records மட்டும்
router.get("/", protect, async (req, res) => {
  try {
    let query = {};

    // Farmer-க்கு தன்னோட records மட்டும்
    if (req.user.role === "farmer") {
      query.farmerId = req.user.userId;
    }

    // Search by RFID
    if (req.query.rfid) {
      query.rfid = { $regex: req.query.rfid, $options: "i" };
    }

    const records = await AnimalRecord.find(query).sort({ createdAt: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/records/search?rfid=RFID-001
// RFID search - எல்லாருக்கும்
router.get("/search", protect, async (req, res) => {
  try {
    const { rfid } = req.query;
    if (!rfid) return res.status(400).json({ message: "rfid query required" });

    const records = await AnimalRecord.find({
      rfid: { $regex: rfid, $options: "i" },
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/records
// புதுசா record add பண்றது - vet மட்டும்
router.post("/", protect, authorize("veterinarian", "admin"), async (req, res) => {
  try {
    const {
      rfid,
      animalName,
      farmerName,
      farmerId,
      antibioticName,
      dosage,
      withdrawalDays,
      date,
    } = req.body;

    // Validate required fields
    if (!rfid || !animalName || !farmerId || !antibioticName || !dosage || !withdrawalDays || !date) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const blockData = {
      rfid: rfid.toUpperCase(),
      animalName,
      farmerName,
      farmerId: farmerId.toUpperCase(),
      antibioticName,
      dosage,
      withdrawalDays: Number(withdrawalDays),
      date,
      veterinarian: req.user.name,
    };

    // Real blockchain-ல add பண்றது
    const block = await addBlockToDB(blockData);

    // Record save பண்றது
    const record = await AnimalRecord.create({
      ...blockData,
      blockHash: block.hash,
      blockIndex: block.index,
    });

    res.status(201).json(record);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
