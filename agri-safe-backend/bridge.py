import serial, json, requests, time

# உங்கள் Arduino port மாத்தி போடு
SERIAL_PORT = "COM9"        # Windows: COM3, COM4...
# Mac/Linux: "/dev/ttyUSB0" or "/dev/ttyACM0"

BAUD_RATE   = 9600
BACKEND_URL = "http://localhost:5000"

# முதல்ல login பண்ணு → token எடு
def get_token():
    res = requests.post(f"{BACKEND_URL}/api/auth/login",
        json={"userId": "VET001", "password": "vet123"})
    return res.json()["token"]

token = get_token()
headers = {"Authorization": f"Bearer {token}"}

ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=2)
print("Listening for RFID scans...")

while True:
    line = ser.readline().decode("utf-8").strip()
    if not line: continue
    try:
        data = json.loads(line)
        temp = data["temperature"]
        rfid = data["rfid"]
        # Health status calculate பண்ணு
        if temp > 39.8 or temp < 37.5:
            status = "Critical"
        elif temp > 39.3 or temp < 37.8:
            status = "Mild Concern"
        else:
            status = "Healthy"

        payload = {
            "rfid": rfid,
            "animalName": "Unknown",
            "temperature": temp,
            "heartRate": 70,       # sensor இல்லன்னா default
            "healthStatus": status,
            "activity": "Active"
        }

        r = requests.post(
            f"{BACKEND_URL}/api/iot/reading",
            json=payload, headers=headers)
        print(f"Sent: {rfid} | {temp}C | {status} → {r.status_code}")

    except Exception as e:
        print(f"Error: {e}")