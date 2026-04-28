# 🌾 Agri-Safe Ledger — Node.js Backend Setup Guide

## 📁 Folder Structure

```
agri-safe-ledger-main/        ← உன் existing React frontend
agri-safe-backend/            ← இந்த புதுசா create ஆன backend
  ├── src/
  │   ├── index.js            ← Main Express server
  │   ├── config/
  │   │   ├── db.js           ← MongoDB connection
  │   │   └── seed.js         ← Demo users + genesis block
  │   ├── models/
  │   │   ├── User.js         ← User schema (bcrypt password)
  │   │   ├── AnimalRecord.js ← Animal treatment records
  │   │   ├── Block.js        ← Real blockchain blocks
  │   │   └── SensorReading.js← IoT sensor data
  │   ├── middleware/
  │   │   └── auth.js         ← JWT verify + role check
  │   └── routes/
  │       ├── auth.js         ← /api/auth/login, /api/auth/me
  │       ├── records.js      ← /api/records (CRUD)
  │       ├── blockchain.js   ← /api/blockchain (validate)
  │       └── iot.js          ← /api/iot/live, /api/iot/history
  ├── package.json
  └── .env.example

FRONTEND_*.tsx / FRONTEND_api.ts  ← Frontend-ல copy பண்ண வேண்டிய files
```

---

## ✅ STEP 1 — MongoDB Install பண்ணு

### Option A: Local MongoDB
```bash
# macOS
brew install mongodb-community
brew services start mongodb-community

# Ubuntu/Debian
sudo apt install mongodb
sudo systemctl start mongodb

# Windows → https://www.mongodb.com/try/download/community
```

### Option B: MongoDB Atlas (Free Cloud - recommended)
1. https://cloud.mongodb.com → Free account create பண்ணு
2. Free cluster create பண்ணு
3. Connection string copy பண்ணு → .env-ல MONGO_URI-ல paste பண்ணு

---

## ✅ STEP 2 — Backend Setup

```bash
# Backend folder-க்கு போ
cd agri-safe-backend

# .env file create பண்ணு
cp .env.example .env

# .env file திற, MONGO_URI மாத்து:
# Local:  MONGO_URI=mongodb://localhost:27017/agri_safe_ledger
# Atlas:  MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/agri_safe_ledger

# Dependencies install பண்ணு
npm install

# Demo users + Genesis block seed பண்ணு (ஒரு தடவை மட்டும்)
node src/config/seed.js

# Server start பண்ணு
npm run dev
```

Server start ஆனா இப்படி தெரியும்:
```
✅ MongoDB Connected: localhost
🚀 Server running at http://localhost:5000
📡 API endpoints:
   POST /api/auth/login
   GET  /api/auth/me
   ...
```

---

## ✅ STEP 3 — Frontend Files Update பண்ணு

### 3a. api.ts copy பண்ணு
```bash
cp FRONTEND_api.ts agri-safe-ledger-main/src/lib/api.ts
```

### 3b. AuthContext replace பண்ணு
```bash
cp FRONTEND_AuthContext.tsx agri-safe-ledger-main/src/contexts/AuthContext.tsx
```

### 3c. .env file create பண்ணு (frontend folder-ல)
```bash
# agri-safe-ledger-main/.env
echo "VITE_API_URL=http://localhost:5000/api" > agri-safe-ledger-main/.env
```

### 3d. VetDashboard.tsx update பண்ணு
`FRONTEND_VetDashboard_snippet.tsx` பாரு → handleSubmit function replace பண்ணு

### 3e. FarmerDashboard.tsx update பண்ணு
`FRONTEND_FarmerDashboard_snippet.tsx` பாரு → 2 useEffect replace பண்ணு

### 3f. AdminDashboard.tsx update பண்ணு
`FRONTEND_AdminDashboard_snippet.tsx` பாரு → useEffect + search replace பண்ணு

### 3g. App.tsx - seedSampleData remove பண்ணு
```tsx
// இந்த import REMOVE பண்ணு:
// import { seedSampleData } from "@/lib/data-store";
// import { blockchain } from "@/lib/blockchain";

// AppInit component-ஐ இப்படி simple-ஆ மாத்து:
const AppInit = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};
```

---

## ✅ STEP 4 — Frontend Start பண்ணு

```bash
cd agri-safe-ledger-main
npm run dev
```

---

## 🔑 Demo Login Credentials

| Role         | User ID    | Password   |
|--------------|------------|------------|
| Farmer       | FARMER001  | farmer123  |
| Farmer       | FARMER002  | farmer123  |
| Veterinarian | VET001     | vet123     |
| Veterinarian | VET002     | vet123     |
| Admin        | ADMIN001   | admin123   |

---

## 📡 API Endpoints Summary

| Method | Endpoint                  | Role Required      | Description              |
|--------|---------------------------|--------------------|--------------------------|
| POST   | /api/auth/login           | Public             | Login → JWT token        |
| GET    | /api/auth/me              | Any logged in      | Current user info        |
| GET    | /api/records              | Any logged in      | Get records (role-based) |
| GET    | /api/records/search?rfid= | Any logged in      | Search by RFID           |
| POST   | /api/records              | vet / admin        | Create new record        |
| GET    | /api/blockchain           | admin              | All blocks               |
| GET    | /api/blockchain/validate  | admin              | Chain integrity check    |
| GET    | /api/iot/live/:rfid       | Any logged in      | Live sensor reading      |
| GET    | /api/iot/history/:rfid    | Any logged in      | Sensor history           |

---

## 🔄 Before vs After

| Feature          | Before (Frontend only)    | After (Node.js Backend)     |
|------------------|---------------------------|-----------------------------|
| Auth             | Hardcoded passwords       | bcrypt + JWT tokens         |
| Data Storage     | localStorage (browser)    | MongoDB (persistent)        |
| Blockchain       | Fake simpleHash()         | Real SHA-256 (Node crypto)  |
| IoT Data         | Random numbers only       | DB-stored sensor history    |
| Multi-user       | ❌ Single browser only    | ✅ Any device, any browser  |
| Data loss        | ❌ Clear browser = gone   | ✅ Permanent in MongoDB     |
