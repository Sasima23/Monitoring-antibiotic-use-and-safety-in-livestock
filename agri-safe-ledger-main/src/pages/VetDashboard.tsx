import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, CheckCircle, Plus, Thermometer, AlertTriangle, Clock, Eye, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createRecordAPI, getRecordsAPI, getLiveSensorAPI } from "@/lib/api";
import { getWithdrawalStatus, getDaysRemaining, type AnimalRecord } from "@/lib/data-store";

const ANTIBIOTICS = [
  "Oxytetracycline",
  "Penicillin",
  "Amoxicillin",
  "Gentamicin",
  "Enrofloxacin",
  "Sulfadimethoxine",
  "Ceftiofur",
  "Tulathromycin",
];

const FARMERS = [
  { id: "FARMER001", name: "Naviya" },
  { id: "FARMER002", name: "Preethi" },
];

interface SensorData {
  rfid: string;
  animalName: string;
  temperature: number;
  healthStatus: "Healthy" | "Mild Concern" | "Critical";
  timestamp?: string;
}

const VetDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [records, setRecords] = useState<AnimalRecord[]>([]);
  const [sensorData, setSensorData] = useState<Map<string, SensorData>>(new Map());

  const [form, setForm] = useState({
    rfid: "",
    animalName: "",
    farmerId: "",
    antibioticName: "",
    dosage: "",
    withdrawalDays: "",
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    if (!user || user.role !== "veterinarian") {
      navigate("/");
      return;
    }

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

  // IoT Sensor 
  useEffect(() => {
    if (records.length === 0) return;

    const updateSensors = async () => {
      const newData = new Map<string, SensorData>();
      for (const r of records) {
        try {
          const data = await getLiveSensorAPI(r.rfid, r.animalName);
          newData.set(r.rfid, data);
        } catch {
          // keep old data
        }
      }
      setSensorData(newData);
    };

    updateSensors();
    const interval = setInterval(updateSensors, 3600000);
    return () => clearInterval(interval);
  }, [records]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const farmer = FARMERS.find((f) => f.id === form.farmerId);
    if (!farmer) return;

    try {
      await createRecordAPI({
        rfid: form.rfid.toUpperCase(),
        animalName: form.animalName,
        farmerName: farmer.name,
        farmerId: farmer.id,
        antibioticName: form.antibioticName,
        dosage: form.dosage,
        withdrawalDays: parseInt(form.withdrawalDays),
        date: form.date,
      });

      setSubmitted(true);
      toast({
        title: "Record Saved ✅",
        description: `Treatment for ${form.animalName} saved to blockchain.`,
      });

      const data = await getRecordsAPI();
      setRecords(data);

      setForm({
        rfid: "",
        animalName: "",
        farmerId: "",
        antibioticName: "",
        dosage: "",
        withdrawalDays: "",
        date: new Date().toISOString().split("T")[0],
      });
      setTimeout(() => setSubmitted(false), 3000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save record",
        variant: "destructive",
      });
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const statusBadge = (status: string) => {
    if (status === "Safe")
      return (
        <Badge className="bg-success/15 text-success border-success/30">
          <CheckCircle className="w-3 h-3 mr-1" /> Safe
        </Badge>
      );
    if (status === "Not Safe")
      return (
        <Badge className="bg-destructive/15 text-destructive border-destructive/30">
          <AlertTriangle className="w-3 h-3 mr-1" /> Not Safe
        </Badge>
      );
    return (
      <Badge className="bg-warning/15 text-warning border-warning/30">
        <Clock className="w-3 h-3 mr-1" /> Caution
      </Badge>
    );
  };

  const healthBadge = (status: string) => {
    if (status === "Healthy")
      return <Badge className="bg-success/15 text-success border-success/30">🟢 Healthy</Badge>;
    if (status === "Critical")
      return <Badge className="bg-destructive/15 text-destructive border-destructive/30">🔴 Critical</Badge>;
    return <Badge className="bg-warning/15 text-warning border-warning/30">🟡 Mild Concern</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Veterinarian Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" /> Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        <Tabs defaultValue="add">
          <TabsList className="mb-4">
            <TabsTrigger value="add" className="gap-1.5">
              <Plus className="w-4 h-4" /> Add Record
            </TabsTrigger>
            <TabsTrigger value="monitor" className="gap-1.5">
              <Activity className="w-4 h-4" /> Health Monitor
            </TabsTrigger>
            <TabsTrigger value="records" className="gap-1.5">
              <Eye className="w-4 h-4" /> View Records
            </TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Add Record ── */}
          <TabsContent value="add">
            <Card className="shadow-card max-w-2xl mx-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" /> Add Animal Treatment Record
                </CardTitle>
                <CardDescription>
                  Submit treatment data to database and blockchain for immutable record keeping.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="rfid">RFID Tag</Label>
                      <Input
                        id="rfid"
                        placeholder="e.g. RFID-004"
                        value={form.rfid}
                        onChange={(e) => setForm({ ...form, rfid: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="animalName">Animal Name</Label>
                      <Input
                        id="animalName"
                        placeholder="e.g. Bella"
                        value={form.animalName}
                        onChange={(e) => setForm({ ...form, animalName: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Farmer</Label>
                    <Select
                      value={form.farmerId}
                      onValueChange={(v) => setForm({ ...form, farmerId: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select farmer" />
                      </SelectTrigger>
                      <SelectContent>
                        {FARMERS.map((f) => (
                          <SelectItem key={f.id} value={f.id}>
                            {f.name} ({f.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Antibiotic Name</Label>
                      <Select
                        value={form.antibioticName}
                        onValueChange={(v) => setForm({ ...form, antibioticName: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select antibiotic" />
                        </SelectTrigger>
                        <SelectContent>
                          {ANTIBIOTICS.map((a) => (
                            <SelectItem key={a} value={a}>
                              {a}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dosage">Dosage</Label>
                      <Input
                        id="dosage"
                        placeholder="e.g. 20mg/kg"
                        value={form.dosage}
                        onChange={(e) => setForm({ ...form, dosage: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="withdrawal">Withdrawal Days</Label>
                      <Input
                        id="withdrawal"
                        type="number"
                        min={1}
                        placeholder="e.g. 28"
                        value={form.withdrawalDays}
                        onChange={(e) => setForm({ ...form, withdrawalDays: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="date">Treatment Date</Label>
                      <Input
                        id="date"
                        type="date"
                        value={form.date}
                        onChange={(e) => setForm({ ...form, date: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 gradient-primary text-primary-foreground font-semibold"
                  >
                    {submitted ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" /> Record Added to Blockchain!
                      </span>
                    ) : (
                      "Submit to Database & Blockchain"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── TAB 2: Health Monitor — Temperature Only ── */}
          <TabsContent value="monitor">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Live Animal Temperature Monitoring</h2>
              <p className="text-sm text-muted-foreground">
                Real-time IoT sensor data 
              </p>

              {records.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No animals to monitor. Add a record first.
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {records.filter((r) => {
  const sensor = sensorData.get(r.rfid);
  if (!sensor) return false;
  
  const isUnhealthy = sensor.healthStatus === "Mild Concern" || sensor.healthStatus === "Critical";
  const isNotSafe = getWithdrawalStatus(r) === "Not Safe" || getWithdrawalStatus(r) === "Caution";
  
  return isUnhealthy || isNotSafe;
}).map((r) => {
  const sensor = sensorData.get(r.rfid);
  return (
                      <Card key={r.id} className="shadow-card">
                        <CardHeader className="pb-2">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base">{r.animalName}</CardTitle>
                            {sensor ? healthBadge(sensor.healthStatus) : (
                              <Badge variant="outline">Loading...</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{r.rfid}</p>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {sensor ? (
                            <>
                              {/* Temperature Only */}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Thermometer className="w-4 h-4 text-orange-500" />
                                  Temperature
                                </div>
                                <span className={`font-semibold text-sm ${
                                  sensor.temperature > 39.8 || sensor.temperature < 37.5
                                    ? "text-destructive"
                                    : sensor.temperature > 39.3
                                    ? "text-warning"
                                    : "text-success"
                                }`}>
                                  {sensor.temperature}°C
                                </span>
                              </div>

                              <div className="border-t pt-2 mt-2">
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-muted-foreground">Withdrawal Status</span>
                                  {statusBadge(getWithdrawalStatus(r))}
                                </div>
                                <div className="flex items-center justify-between text-xs mt-1">
                                  <span className="text-muted-foreground">Antibiotic</span>
                                  <span className="font-medium">{r.antibioticName}</span>
                                </div>
                              </div>
                            </>
                          ) : (
                            <div className="text-center text-sm text-muted-foreground py-4">
                              Connecting to sensor...
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── TAB 3: View Records ── */}
          <TabsContent value="records">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">All Animal Treatment Records</h2>

              {records.length === 0 ? (
                <Card className="shadow-card">
                  <CardContent className="py-12 text-center text-muted-foreground">
                    No records found.
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="text-left p-3 font-medium">RFID</th>
                        <th className="text-left p-3 font-medium">Animal</th>
                        <th className="text-left p-3 font-medium">Farmer</th>
                        <th className="text-left p-3 font-medium">Antibiotic</th>
                        <th className="text-left p-3 font-medium">Date</th>
                        <th className="text-left p-3 font-medium">Days Left</th>
                        <th className="text-left p-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {records.map((r) => (
                        <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-mono text-xs">{r.rfid}</td>
                          <td className="p-3 font-medium">{r.animalName}</td>
                          <td className="p-3">{r.farmerName}</td>
                          <td className="p-3">{r.antibioticName}</td>
                          <td className="p-3">{r.date}</td>
                          <td className="p-3">{getDaysRemaining(r)} days</td>
                          <td className="p-3">{statusBadge(getWithdrawalStatus(r))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default VetDashboard;
