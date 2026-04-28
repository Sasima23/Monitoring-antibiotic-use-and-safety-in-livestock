const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const Block = require("../models/Block");
const { protect, authorize } = require("../middleware/auth");

const computeHash = (data) => {
  return crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");
};

// GET /api/blockchain
// எல்லா blocks - admin மட்டும்
router.get("/", protect, authorize("admin"), async (req, res) => {
  try {
    const blocks = await Block.find().sort({ index: 1 });
    res.json(blocks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/blockchain/validate
// Chain valid-ஆ இருக்கா check பண்றது
router.get("/validate", protect, authorize("admin"), async (req, res) => {
  try {
    const blocks = await Block.find().sort({ index: 1 });

    let isValid = true;
    let invalidAt = null;

    for (let i = 1; i < blocks.length; i++) {
      const current = blocks[i];
      const previous = blocks[i - 1];

      // Previous hash match ஆகுதா?
      if (current.previousHash !== previous.hash) {
        isValid = false;
        invalidAt = current.index;
        break;
      }

      // Current block hash சரியா?
      const recomputedHash = computeHash({
        index: current.index,
        data: current.data,
        previousHash: current.previousHash,
        timestamp: current.timestamp,
        nonce: current.nonce,
      });

      if (recomputedHash !== current.hash) {
        isValid = false;
        invalidAt = current.index;
        break;
      }
    }

    res.json({
      isValid,
      totalBlocks: blocks.length,
      invalidAt,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
