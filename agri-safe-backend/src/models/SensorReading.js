const mongoose = require("mongoose");

const sensorReadingSchema = new mongoose.Schema(
  {
    rfid: { type: String, required: true, uppercase: true },
    animalName: { type: String, required: true },
    temperature: { type: Number, required: true },
    heartRate: { type: Number, required: true },
    healthStatus: {
      type: String,
      enum: ["Healthy", "Mild Concern", "Critical"],
      required: true,
    },
    activity: {
      type: String,
      enum: ["Active", "Resting", "Feeding", "Sleeping"],
      required: true,
    },
  },
  { timestamps: true }
);

// Index for fast RFID queries
sensorReadingSchema.index({ rfid: 1, createdAt: -1 });

module.exports = mongoose.model("SensorReading", sensorReadingSchema);
