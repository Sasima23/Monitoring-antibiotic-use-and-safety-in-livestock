// IoT Sensor Simulation Module
// Simulates temperature, health status, and feeding data for livestock

export interface SensorData {
  rfid: string;
  animalName: string;
  temperature: number; // in Celsius
  healthStatus: "Healthy" | "Mild Concern" | "Critical";
  heartRate: number;
  activity: "Active" | "Resting" | "Feeding" | "Sleeping";
  timestamp: string;
}

/** Generates realistic simulated sensor data for an animal */
export function generateSensorData(rfid: string, animalName: string): SensorData {
  // Normal cattle temperature: 38.0 - 39.5°C
  const baseTemp = 38.5;
  const tempVariation = (Math.random() - 0.5) * 3; // -1.5 to +1.5
  const temperature = Math.round((baseTemp + tempVariation) * 10) / 10;

  // Heart rate: 40-80 bpm for cattle
  const heartRate = Math.floor(50 + Math.random() * 30);

  // Determine health status based on temperature
  let healthStatus: SensorData["healthStatus"] = "Healthy";
  if (temperature > 39.8 || temperature < 37.5) {
    healthStatus = "Critical";
  } else if (temperature > 39.3 || temperature < 37.8) {
    healthStatus = "Mild Concern";
  }

  // Random activity
  const activities: SensorData["activity"][] = ["Active", "Resting", "Feeding", "Sleeping"];
  const activity = activities[Math.floor(Math.random() * activities.length)];

  return {
    rfid,
    animalName,
    temperature,
    healthStatus,
    heartRate,
    activity,
    timestamp: new Date().toISOString(),
  };
}

/** Stores IoT data history in localStorage */
export function storeIoTData(data: SensorData): void {
  const stored = localStorage.getItem("mrl_iot_data");
  const history: SensorData[] = stored ? JSON.parse(stored) : [];
  history.push(data);
  // Keep last 500 readings
  if (history.length > 500) {
    history.splice(0, history.length - 500);
  }
  localStorage.setItem("mrl_iot_data", JSON.stringify(history));
}

/** Gets IoT data history */
export function getIoTHistory(rfid?: string): SensorData[] {
  const stored = localStorage.getItem("mrl_iot_data");
  const history: SensorData[] = stored ? JSON.parse(stored) : [];
  if (rfid) {
    return history.filter((d) => d.rfid === rfid);
  }
  return history;
}
