require("dotenv").config();
const connectDB = require("../config/db");
const User = require("../models/User");
const Block = require("../models/Block");
const crypto = require("crypto");

const computeHash = (data) =>
  crypto.createHash("sha256").update(JSON.stringify(data)).digest("hex");

const users = [
  { userId: "FARMER001", name: "Naviya",     role: "farmer",       password: "farmer123" },
  { userId: "FARMER002", name: "Preethi",    role: "farmer",       password: "farmer123" },
  { userId: "VET001",    name: "Dr. Sasima", role: "veterinarian", password: "vet123"    },
  { userId: "VET002",    name: "Dr. Rathika",  role: "veterinarian", password: "vet123"    },
  { userId: "ADMIN001",  name: "Keerthana",        role: "admin",        password: "admin123"  },
];

const seedDB = async () => {
  await connectDB();


  await User.deleteMany({});
  for (const u of users) {
    await User.create(u);
  }
  console.log("✅ Users seeded:", users.length);

  // Genesis block
  await Block.deleteMany({});
  const genesisData = { message: "Genesis Block - Agri-Safe Ledger" };
  const timestamp = new Date().toISOString();
  const hash = computeHash({ index: 0, data: genesisData, previousHash: "0", timestamp });
  await Block.create({ index: 0, timestamp, data: genesisData, previousHash: "0", hash, nonce: 0 });
  console.log("✅ Genesis block created");

  console.log("\n📋 Demo Login Credentials:");
  users.forEach((u) =>
    console.log(`   ${u.role.padEnd(14)} → ID: ${u.userId.padEnd(10)} | Pass: ${u.password}`)
  );

  process.exit(0);
};

seedDB();