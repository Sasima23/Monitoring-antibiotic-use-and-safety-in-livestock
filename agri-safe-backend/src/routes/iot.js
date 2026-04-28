const express = require("express");
const router = express.Router();
const SensorReading = require("../models/SensorReading");
const { protect } = require("../middleware/auth");

// Simulated IoT reading generate பண்றது (real device இல்லாம்)
const generateReading = (rfid, animalName) => {
  const baseTemp = 38.5;
  const tempVariation = (Math.random() - 0.5) * 3;
  const temperature = Math.round((baseTemp + tempVariation) * 10) / 10;
  const heartRate = Math.floor(50 + Math.random() * 30);

  let healthStatus = "Healthy";
  if (temperature > 39.8 || temperature < 37.5) healthStatus = "Critical";
  else if (temperature > 39.3 || temperature < 37.8) healthStatus = "Mild Concern";

  const activities = ["Active", "Resting", "Feeding", "Sleeping"];
  const activity = activities[Math.floor(Math.random() * activities.length)];

  return { rfid: rfid.toUpperCase(), animalName, temperature, heartRate, healthStatus, activity };
};

// GET /api/iot/live/:rfid
// Real-time sensor data (simulated) - poll பண்ண use பண்றது
router.get("/live/:rfid", protect, async (req, res) => {
  try {
    const { rfid } = req.params;
    const { animalName } = req.query;

    // Real-time reading generate + DB-ல save
    const reading = generateReading(rfid, animalName || "Unknown");
    const saved = await SensorReading.create(reading);

    res.json(saved);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/iot/history/:rfid
// ஒரு animal-ஓட past readings
router.get("/history/:rfid", protect, async (req, res) => {
  try {
    const readings = await SensorReading.find({
      rfid: req.params.rfid.toUpperCase(),
    })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json(readings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/iot/reading
// Real IoT device இருந்தா data push பண்ண (future use)
router.post("/reading", protect, async (req, res) => {
  try {
    const { rfid, animalName, temperature, heartRate, healthStatus, activity } = req.body;

    if (!rfid || !temperature || !heartRate) {
      return res.status(400).json({ message: "rfid, temperature, heartRate required" });
    }

    const reading = await SensorReading.create({
      rfid: rfid.toUpperCase(),
      animalName,
      temperature,
      heartRate,
      healthStatus,
      activity,
    });

    res.status(201).json(reading);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
