
const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// ── Token helpers ────────────────────────────────────────────────────────────
export const getToken = (): string | null => sessionStorage.getItem("mrl_token");
export const setToken = (token: string) => sessionStorage.setItem("mrl_token", token);
export const removeToken = () => sessionStorage.removeItem("mrl_token");

// ── Base fetch with auth header ──────────────────────────────────────────────
const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = getToken();

  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || "API error");
  }

  return data;
};

// ────────────────────────────────────────────────────────────────────────────
// AUTH
// ────────────────────────────────────────────────────────────────────────────

export const loginAPI = async (userId: string, password: string) => {
  // Returns: { token, user: { id, name, role } }
  return apiFetch("/auth/login", {
    method: "POST",
    body: JSON.stringify({ userId, password }),
  });
};

export const getMeAPI = async () => {
  return apiFetch("/auth/me");
};

// ────────────────────────────────────────────────────────────────────────────
// ANIMAL RECORDS
// ────────────────────────────────────────────────────────────────────────────


// Add this function to your api.ts file
export const deleteRecordAPI = async (recordId: string): Promise<void> => {
  const response = await fetch(`/api/records/${recordId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete record');
  }
};

export const getRecordsAPI = async (rfid?: string) => {
  const query = rfid ? `?rfid=${rfid}` : "";
  return apiFetch(`/records${query}`);
};

export const searchByRFIDAPI = async (rfid: string) => {
  return apiFetch(`/records/search?rfid=${rfid}`);
};

export interface CreateRecordPayload {
  rfid: string;
  animalName: string;
  farmerName: string;
  farmerId: string;
  antibioticName: string;
  dosage: string;
  withdrawalDays: number;
  date: string;
}

export const createRecordAPI = async (payload: CreateRecordPayload) => {
  return apiFetch("/records", {
    method: "POST",
    body: JSON.stringify(payload),
  });
};

// ────────────────────────────────────────────────────────────────────────────
// BLOCKCHAIN
// ────────────────────────────────────────────────────────────────────────────

export const getBlockchainAPI = async () => {
  return apiFetch("/blockchain");
};

export const validateBlockchainAPI = async () => {
  // Returns: { isValid, totalBlocks, invalidAt }
  return apiFetch("/blockchain/validate");
};

// ────────────────────────────────────────────────────────────────────────────
// IOT SENSORS
// ────────────────────────────────────────────────────────────────────────────

export const getLiveSensorAPI = async (rfid: string, animalName: string) => {
  return apiFetch(`/iot/live/${rfid}?animalName=${encodeURIComponent(animalName)}`);
};

export const getSensorHistoryAPI = async (rfid: string) => {
  return apiFetch(`/iot/history/${rfid}`);
};
