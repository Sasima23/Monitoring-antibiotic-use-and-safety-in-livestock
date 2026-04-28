export type UserRole = "farmer" | "veterinarian" | "admin";

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export interface AnimalRecord {
  id: string;
  rfid: string;
  animalName: string;
  farmerName: string;
  farmerId: string;
  antibioticName: string;
  dosage: string;
  withdrawalDays: number;
  date: string;
  veterinarian: string;
  blockHash: string;
  createdAt: string;
}

const USERS: User[] = [
  { id: "FARMER001", name: "Naviya",      role: "farmer"       },
  { id: "FARMER002", name: "Preethi",     role: "farmer"       },
  { id: "VET001",    name: "Dr. Sasima",  role: "veterinarian" },
  { id: "VET002",    name: "Dr. Rathika", role: "veterinarian" },
  { id: "ADMIN001",  name: "Keerthana",   role: "admin"        },
];

const PASSWORDS: Record<string, string> = {
  FARMER001: "farmer123",
  FARMER002: "farmer123",
  VET001:    "vet123",
  VET002:    "vet123",
  ADMIN001:  "admin123",
};

export function authenticateUser(userId: string, password: string): User | null {
  const user = USERS.find((u) => u.id === userId.toUpperCase());
  if (user && PASSWORDS[user.id] === password) return user;
  return null;
}

export function getCurrentUser(): User | null {
  const stored = sessionStorage.getItem("mrl_user");
  return stored ? JSON.parse(stored) : null;
}

export function setCurrentUser(user: User | null): void {
  if (user) sessionStorage.setItem("mrl_user", JSON.stringify(user));
  else sessionStorage.removeItem("mrl_user");
}

export function saveAnimalRecord(record: AnimalRecord): void {
  const records = getAnimalRecords();
  records.push(record);
  localStorage.setItem("mrl_animal_records", JSON.stringify(records));
}

export function getAnimalRecords(): AnimalRecord[] {
  const stored = localStorage.getItem("mrl_animal_records");
  return stored ? JSON.parse(stored) : [];
}

export function getFarmerRecords(farmerId: string): AnimalRecord[] {
  return getAnimalRecords().filter((r) => r.farmerId === farmerId.toUpperCase());
}

export function searchByRFID(rfid: string): AnimalRecord[] {
  return getAnimalRecords().filter((r) =>
    r.rfid.toLowerCase().includes(rfid.toLowerCase())
  );
}

export function getWithdrawalStatus(record: AnimalRecord): "Safe" | "Not Safe" | "Caution" {
  const treatmentDate = new Date(record.date);
  const withdrawalEnd = new Date(treatmentDate);
  withdrawalEnd.setDate(withdrawalEnd.getDate() + record.withdrawalDays);
  const now = new Date();
  const daysRemaining = Math.ceil((withdrawalEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysRemaining <= 0) return "Safe";
  if (daysRemaining <= 3) return "Caution";
  return "Not Safe";
}

export function getDaysRemaining(record: AnimalRecord): number {
  const treatmentDate = new Date(record.date);
  const withdrawalEnd = new Date(treatmentDate);
  withdrawalEnd.setDate(withdrawalEnd.getDate() + record.withdrawalDays);
  const now = new Date();
  return Math.max(0, Math.ceil((withdrawalEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export function getAvailableUsers() {
  return USERS.map((u) => ({ ...u, password: PASSWORDS[u.id] }));
}

export function seedSampleData(blockchainRef?: any): void {
  if (getAnimalRecords().length > 0) return;
  if (!blockchainRef) return;
  const blockchain = blockchainRef;

  const sampleRecords: Omit<AnimalRecord, "id" | "blockHash" | "createdAt">[] = [
    {
      rfid: "RFID-001",
      animalName: "Bessie",
      farmerName: "Naviya",
      farmerId: "FARMER001",
      antibioticName: "Oxytetracycline",
      dosage: "20mg/kg",
      withdrawalDays: 28,
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      veterinarian: "Dr. Sasima",
    },
    {
      rfid: "RFID-002",
      animalName: "Daisy",
      farmerName: "Naviya",
      farmerId: "FARMER001",
      antibioticName: "Penicillin",
      dosage: "10mg/kg",
      withdrawalDays: 7,
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      veterinarian: "Dr. Rathika",
    },
    {
      rfid: "RFID-003",
      animalName: "Rosie",
      farmerName: "Preethi",
      farmerId: "FARMER002",
      antibioticName: "Amoxicillin",
      dosage: "15mg/kg",
      withdrawalDays: 14,
      date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      veterinarian: "Dr. Sasima",
    },
  ];

  sampleRecords.forEach((r) => {
    const block = blockchain.addBlock({ ...r });
    saveAnimalRecord({
      ...r,
      id: crypto.randomUUID(),
      blockHash: block.hash,
      createdAt: new Date().toISOString(),
    });
  });
}