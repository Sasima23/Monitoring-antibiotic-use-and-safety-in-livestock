import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getWithdrawalStatus, getDaysRemaining, type AnimalRecord } from "@/lib/data-store";
import { type SensorData } from "@/lib/iot-simulator";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LogOut, Search, Thermometer, AlertTriangle, CheckCircle, Clock, Bell, BellOff, X, ChevronDown, ChevronUp, ShoppingBag } from "lucide-react";
import { getRecordsAPI, getLiveSensorAPI } from "@/lib/api";

// ── Alert Types ──────────────────────────────────────────────────────────────
interface Alert {
  id: string;
  type: "critical" | "warning" | "info";
  animalName: string;
  rfid: string;
  message: string;
  time: string;
}

const generateAlerts = (
  records: AnimalRecord[],
  sensorData: Map<string, SensorData>
): Alert[] => {
  const alerts: Alert[] = [];
  const now = new Date().toLocaleTimeString();

  records.forEach((r) => {
    const sensor = sensorData.get(r.rfid);
    const status = getWithdrawalStatus(r);
    const daysLeft = getDaysRemaining(r);

    if (sensor && sensor.temperature > 39.8)
      alerts.push({ id: `temp-high-${r.rfid}`, type: "critical", animalName: r.animalName, rfid: r.rfid, message: `High fever detected! Temperature: ${sensor.temperature}°C (Normal: 38–39.5°C)`, time: now });
    if (sensor && sensor.temperature < 37.5)
      alerts.push({ id: `temp-low-${r.rfid}`, type: "critical", animalName: r.animalName, rfid: r.rfid, message: `Low temperature detected! Temperature: ${sensor.temperature}°C (Normal: 38–39.5°C)`, time: now });
    if (sensor && sensor.healthStatus === "Critical")
      alerts.push({ id: `health-critical-${r.rfid}`, type: "critical", animalName: r.animalName, rfid: r.rfid, message: `Animal health is CRITICAL! Immediate veterinary attention needed.`, time: now });
    if (sensor && sensor.healthStatus === "Mild Concern")
      alerts.push({ id: `health-mild-${r.rfid}`, type: "warning", animalName: r.animalName, rfid: r.rfid, message: `Mild health concern detected. Monitor closely.`, time: now });
    if (status === "Not Safe")
      alerts.push({ id: `withdrawal-${r.rfid}`, type: "warning", animalName: r.animalName, rfid: r.rfid, message: `Under withdrawal period! ${daysLeft} day(s) remaining. DO NOT sell milk/meat.`, time: now });
    if (status === "Caution")
      alerts.push({ id: `caution-${r.rfid}`, type: "warning", animalName: r.animalName, rfid: r.rfid, message: `Withdrawal period ending in ${daysLeft} day(s). Almost safe for market.`, time: now });
  });

  return alerts;
};

// ── Safe Date helper ─────────────────────────────────────────────────────────
const getSafeDate = (record: AnimalRecord): string => {
  const safeDate = new Date(record.date);
  safeDate.setDate(safeDate.getDate() + record.withdrawalDays);
  return safeDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

// ── Withdrawal Progress Bar ──────────────────────────────────────────────────
const WithdrawalProgressBar = ({ record }: { record: AnimalRecord }) => {
  const daysLeft = getDaysRemaining(record);
  const total = record.withdrawalDays;
  const elapsed = total - daysLeft;
  const percent = Math.min(100, Math.round((elapsed / total) * 100));
  const barColor = daysLeft === 0 ? "bg-success" : daysLeft <= 3 ? "bg-warning" : "bg-destructive";

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>Withdrawal Progress</span>
        <span>{percent}% complete</span>
      </div>
      <div className="w-full bg-muted rounded-full h-2.5">
        <div className={`h-2.5 rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${percent}%` }} />
      </div>
      <div className="flex justify-between text-xs">
        <span className="text-muted-foreground">Day 0</span>
        <span className={daysLeft === 0 ? "text-success font-semibold" : "text-destructive font-semibold"}>
          {daysLeft === 0 ? "✅ Safe!" : `${daysLeft} days left`}
        </span>
        <span className="text-muted-foreground">Day {total}</span>
      </div>
    </div>
  );
};

// ── Main Component ────────────────────────────────────────────────────────────
const FarmerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<AnimalRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [sensorData, setSensorData] = useState<Map<string, SensorData>>(new Map());
  const [tempHistory, setTempHistory] = useState<Map<string, number[]>>(new Map());
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set());
  const [showAlerts, setShowAlerts] = useState(true);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || user.role !== "farmer") { navigate("/"); return; }
    const loadRecords = async () => {
      try {
        const data = await getRecordsAPI();
        setRecords(data);
      } catch (error) {
        console.error("Failed to load records:", error);
      }
    };
    loadRecords();
  }, [user, navigate]);

  useEffect(() => {
    if (records.length === 0) return;

    const updateSensors = async () => {
      const newData = new Map<string, SensorData>();
      for (const r of records) {
        try {
          const data = await getLiveSensorAPI(r.rfid, r.animalName);
          newData.set(r.rfid, data);
          // Temperature history — last 5 readings
          setTempHistory((prev) => {
            const history = prev.get(r.rfid) || [];
            const updated = [...history, data.temperature].slice(-5);
            return new Map(prev).set(r.rfid, updated);
          });
        } catch {
          // keep old data
        }
      }
      setSensorData(newData);
      const newAlerts = generateAlerts(records, newData);
      setAlerts(newAlerts);
    };

    updateSensors();
    const interval = setInterval(updateSensors, 3600000);
    return () => clearInterval(interval);
  }, [records]);

  const filtered = searchTerm
    ? records.filter((r) => r.rfid.toLowerCase().includes(searchTerm.toLowerCase()) || r.animalName.toLowerCase().includes(searchTerm.toLowerCase()))
    : records;

  const handleLogout = () => { logout(); navigate("/"); };
  const dismissAlert = (id: string) => setDismissedAlerts((prev) => new Set([...prev, id]));
  const toggleExpand = (id: string) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const visibleAlerts = alerts.filter((a) => !dismissedAlerts.has(a.id));
  const criticalCount = visibleAlerts.filter((a) => a.type === "critical").length;
  const warningCount = visibleAlerts.filter((a) => a.type === "warning").length;
  const marketReadyRecords = records.filter((r) => getWithdrawalStatus(r) === "Safe");

  const statusBadge = (status: string) => {
    if (status === "Safe") return <Badge className="bg-success/15 text-success border-success/30 hover:bg-success/20"><CheckCircle className="w-3 h-3 mr-1" />Safe</Badge>;
    if (status === "Not Safe") return <Badge className="bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/20"><AlertTriangle className="w-3 h-3 mr-1" />Not Safe</Badge>;
    return <Badge className="bg-warning/15 text-warning border-warning/30 hover:bg-warning/20"><Clock className="w-3 h-3 mr-1" />Caution</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Farmer Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAlerts(!showAlerts)} className="relative p-2 rounded-lg hover:bg-muted transition-colors">
              {visibleAlerts.length > 0 ? (
                <>
                  <Bell className="w-5 h-5 text-destructive animate-pulse" />
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-white text-xs rounded-full flex items-center justify-center font-bold">{visibleAlerts.length}</span>
                </>
              ) : (
                <BellOff className="w-5 h-5 text-muted-foreground" />
              )}
            </button>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">

        {/* ── ALERTS ── */}
        {showAlerts && visibleAlerts.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-destructive" />
              <h2 className="font-semibold text-sm">
                Active Alerts
                {criticalCount > 0 && <span className="ml-2 px-2 py-0.5 bg-destructive text-white text-xs rounded-full">{criticalCount} Critical</span>}
                {warningCount > 0 && <span className="ml-2 px-2 py-0.5 bg-warning text-white text-xs rounded-full">{warningCount} Warning</span>}
              </h2>
            </div>
            {visibleAlerts.map((alert) => (
              <div key={alert.id} className={`flex items-start justify-between p-3 rounded-lg border text-sm ${alert.type === "critical" ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-warning/10 border-warning/30 text-warning-foreground"}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">{alert.animalName}</span>
                    <span className="text-xs ml-2 opacity-70 font-mono">{alert.rfid}</span>
                    <p className="mt-0.5 opacity-90">{alert.message}</p>
                    <p className="text-xs opacity-50 mt-0.5">{alert.time}</p>
                  </div>
                </div>
                <button onClick={() => dismissAlert(alert.id)} className="ml-2 p-1 rounded hover:bg-black/10 flex-shrink-0">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {showAlerts && visibleAlerts.length === 0 && records.length > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/30 text-success text-sm">
            <CheckCircle className="w-4 h-4" />
            <span>All animals are healthy! No alerts at this time.</span>
          </div>
        )}

        {/* ── MARKET READY SECTION ── */}
        {marketReadyRecords.length > 0 && (
          <div className="p-4 rounded-lg bg-success/10 border border-success/30">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="w-5 h-5 text-success" />
              <h2 className="font-semibold text-success">✅ Ready to Sell ({marketReadyRecords.length})</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {marketReadyRecords.map((r) => (
                <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 bg-success/15 rounded-full text-sm text-success font-medium">
                  <CheckCircle className="w-3 h-3" />
                  {r.animalName}
                  <span className="text-xs opacity-70 font-mono">{r.rfid}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SEARCH ── */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Search by RFID or animal name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
        </div>

        {/* ── STATS ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card className="shadow-card"><CardContent className="pt-6">
            <div className="text-2xl font-bold">{records.length}</div>
            <p className="text-sm text-muted-foreground">Total Animals</p>
          </CardContent></Card>
          <Card className="shadow-card"><CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{records.filter((r) => getWithdrawalStatus(r) === "Not Safe").length}</div>
            <p className="text-sm text-muted-foreground">Under Withdrawal</p>
          </CardContent></Card>
          <Card className="shadow-card"><CardContent className="pt-6">
            <div className="text-2xl font-bold text-success">{records.filter((r) => getWithdrawalStatus(r) === "Safe").length}</div>
            <p className="text-sm text-muted-foreground">Safe for Market</p>
          </CardContent></Card>
          <Card className="shadow-card"><CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{criticalCount}</div>
            <p className="text-sm text-muted-foreground">Active Alerts</p>
          </CardContent></Card>
        </div>

        {/* ── ANIMAL CARDS ── */}
        {filtered.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-12 text-center">
              <p className="text-lg font-medium text-muted-foreground">No records found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {searchTerm ? "Try a different search term" : "No animal treatment records have been added by your veterinarian yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filtered.map((record) => {
              const status = getWithdrawalStatus(record);
              const daysLeft = getDaysRemaining(record);
              const sensor = sensorData.get(record.rfid);
              const hasAlert = visibleAlerts.some((a) => a.rfid === record.rfid);
              const isExpanded = expandedCards.has(record.id);
              const history = tempHistory.get(record.rfid) || [];

              return (
                <Card key={record.id} className={`shadow-card transition-all hover:shadow-card-hover ${
                  hasAlert && sensor?.healthStatus === "Critical" ? "border-destructive/50 bg-destructive/5" :
                  status === "Not Safe" ? "border-destructive/30" :
                  status === "Caution" ? "border-warning/30" : ""
                }`}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col lg:flex-row lg:items-start gap-4">

                      {/* Animal Info */}
                      <div className="flex-1 space-y-3">
                        {/* Name + Badges */}
                        <div className="flex items-center flex-wrap gap-2">
                          <h3 className="text-lg font-semibold">{record.animalName}</h3>
                          {statusBadge(status)}
                          {status === "Safe" && (
                            <Badge className="bg-success/15 text-success border-success/30">
                              <ShoppingBag className="w-3 h-3 mr-1" /> Ready to Sell
                            </Badge>
                          )}
                          {hasAlert && (
                            <Badge className="bg-destructive/15 text-destructive border-destructive/30 animate-pulse">
                              <Bell className="w-3 h-3 mr-1" /> Alert
                            </Badge>
                          )}
                        </div>

                        {/* Basic Info */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                          <div><span className="text-muted-foreground">RFID:</span> <span className="font-mono font-medium">{record.rfid}</span></div>
                          <div><span className="text-muted-foreground">Antibiotic:</span> {record.antibioticName}</div>
                          <div><span className="text-muted-foreground">Dosage:</span> {record.dosage}</div>
                          <div><span className="text-muted-foreground">Treatment Date:</span> {record.date}</div>
                          <div><span className="text-muted-foreground">Vet:</span> {record.veterinarian}</div>
                          {/* Safe Date */}
                          <div>
                            <span className="text-muted-foreground">Safe from: </span>
                            <span className={`font-semibold ${status === "Safe" ? "text-success" : "text-destructive"}`}>
                              {getSafeDate(record)}
                            </span>
                          </div>
                        </div>

                        {/* Withdrawal Progress Bar */}
                        <WithdrawalProgressBar record={record} />

                        {/* Withdrawal Warning */}
                        {status === "Not Safe" && (
                          <div className="flex items-center gap-2 p-2 rounded-lg bg-destructive/10 text-destructive text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="font-medium">⚠️ Milk/meat NOT safe. {daysLeft} day(s) remaining.</span>
                          </div>
                        )}

                        {/* Expand Button */}
                        <button onClick={() => toggleExpand(record.id)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          {isExpanded ? "Hide details" : "View full details"}
                        </button>

                        {/* Expanded Profile */}
                        {isExpanded && (
                          <div className="p-3 rounded-lg bg-muted/40 space-y-2 text-sm border">
                            <p className="font-semibold text-xs uppercase tracking-wide text-muted-foreground">Full Animal Profile</p>
                            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                              <div><span className="text-muted-foreground">Farmer:</span> {record.farmerName}</div>
                              <div><span className="text-muted-foreground">Withdrawal Days:</span> {record.withdrawalDays}</div>
                              <div><span className="text-muted-foreground">Days Remaining:</span> <span className={daysLeft > 0 ? "text-destructive font-semibold" : "text-success font-semibold"}>{daysLeft}</span></div>
                              <div><span className="text-muted-foreground">Safe Date:</span> <span className="text-success font-semibold">{getSafeDate(record)}</span></div>
                            </div>
                            {/* Block Hash */}
                            <div className="pt-1 border-t">
                              <p className="text-xs text-muted-foreground">Blockchain Hash:</p>
                              <code className="text-xs font-mono text-primary break-all">{record.blockHash}</code>
                            </div>
                            {/* Temperature History */}
                            {history.length > 0 && (
                              <div className="pt-1 border-t">
                                <p className="text-xs text-muted-foreground mb-1">Temperature History (last {history.length} readings):</p>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {history.map((t, i) => (
                                    <span key={i} className={`px-2 py-0.5 rounded text-xs font-mono ${
                                      t > 39.8 || t < 37.5 ? "bg-destructive/15 text-destructive" :
                                      t > 39.3 ? "bg-warning/15 text-warning" :
                                      "bg-success/15 text-success"
                                    }`}>{t}°C</span>
                                  ))}
                                  {history.length > 1 && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      {history[history.length-1] > history[0] ? "↑ Rising" : history[history.length-1] < history[0] ? "↓ Falling" : "→ Stable"}
                                    </span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* IoT Sensor */}
                      {sensor && (
                        <div className={`lg:w-48 p-3 rounded-lg space-y-2 ${
                          sensor.healthStatus === "Critical" ? "bg-destructive/10 border border-destructive/30" :
                          sensor.healthStatus === "Mild Concern" ? "bg-warning/10 border border-warning/30" :
                          "bg-muted/50"
                        }`}>
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Live Sensors</p>
                          <div className="flex items-center gap-2 text-sm">
                            <Thermometer className={`w-4 h-4 ${sensor.temperature > 39.5 ? "text-destructive" : "text-primary"}`} />
                            <span className={sensor.temperature > 39.8 || sensor.temperature < 37.5 ? "text-destructive font-semibold" : ""}>
                              {sensor.temperature}°C
                            </span>
                          </div>
                          <Badge className={
                            sensor.healthStatus === "Healthy" ? "bg-success/15 text-success" :
                            sensor.healthStatus === "Critical" ? "bg-destructive/15 text-destructive animate-pulse" :
                            "bg-warning/15 text-warning"
                          }>
                            {sensor.healthStatus === "Critical" && "🔴 "}
                            {sensor.healthStatus === "Mild Concern" && "🟡 "}
                            {sensor.healthStatus === "Healthy" && "🟢 "}
                            {sensor.healthStatus}
                          </Badge>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default FarmerDashboard;
