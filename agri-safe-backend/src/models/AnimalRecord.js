const mongoose = require("mongoose");

const animalRecordSchema = new mongoose.Schema(
  {
    rfid: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    animalName: {
      type: String,
      required: true,
      trim: true,
    },
    farmerName: {
      type: String,
      required: true,
    },
    farmerId: {
      type: String,
      required: true,
      uppercase: true,
    },
    antibioticName: {
      type: String,
      required: true,
    },
    dosage: {
      type: String,
      required: true,
    },
    withdrawalDays: {
      type: Number,
      required: true,
      min: 0,
    },
    date: {
      type: String,
      required: true,
    },
    veterinarian: {
      type: String,
      required: true,
    },
    blockHash: {
      type: String,
      required: true,
    },
    blockIndex: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Withdrawal status calculate 
animalRecordSchema.virtual("withdrawalStatus").get(function () {
  const treatmentDate = new Date(this.date);
  const withdrawalEnd = new Date(treatmentDate);
  withdrawalEnd.setDate(withdrawalEnd.getDate() + this.withdrawalDays);
  const now = new Date();
  const daysRemaining = Math.ceil(
    (withdrawalEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (daysRemaining <= 0) return "Safe";
  if (daysRemaining <= 3) return "Caution";
  return "Not Safe";
});

animalRecordSchema.virtual("daysRemaining").get(function () {
  const treatmentDate = new Date(this.date);
  const withdrawalEnd = new Date(treatmentDate);
  withdrawalEnd.setDate(withdrawalEnd.getDate() + this.withdrawalDays);
  const now = new Date();
  return Math.max(
    0,
    Math.ceil((withdrawalEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );
});

animalRecordSchema.set("toJSON", { virtuals: true });

module.exports = mongoose.model("AnimalRecord", animalRecordSchema);
