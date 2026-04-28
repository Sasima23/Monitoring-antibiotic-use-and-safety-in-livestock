import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LogOut, Search, Database, Link2, ShieldCheck, ShieldAlert,
  CheckCircle, AlertTriangle, Clock, Users, BarChart2,
  Download, Filter, Bell, Activity,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { getRecordsAPI, getBlockchainAPI, validateBlockchainAPI } from "@/lib/api";
import { getWithdrawalStatus, getDaysRemaining, type AnimalRecord } from "@/lib/data-store";
import type { Block } from "@/lib/blockchain";
import { getToken } from "@/lib/api";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Admin API calls
const adminFetch = async (path: string) => {
  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

// ── Types ────────────────────────────────────────────────────────────────────
interface Stats {
  totalRecords: number;
  totalFarmers: number;
  totalVets: number;
  totalBlocks: number;
  todayRecords: number;
  safeCount: number;
  notSafeCount: number;
  cautionCount: number;
}

interface UserInfo {
  userId: string;
  name: string;
  role: string;
  recordCount: number;
}

interface AntibioticStat {
  name: string;
  count: number;
}

interface WithdrawalAlert extends AnimalRecord {
  daysRemaining: number;
  status: string;
}

const COLORS = ["#4f46e5", "#7c3aed", "#2563eb", "#0891b2", "#059669", "#d97706", "#dc2626", "#db2777"];

const ANTIBIOTIC_OPTIONS = [
  "Oxytetracycline", "Penicillin", "Amoxicillin", "Gentamicin",
  "Enrofloxacin", "Sulfadimethoxine", "Ceftiofur", "Tulathromycin",
];

// ── CSV Export helper ────────────────────────────────────────────────────────
const exportToCSV = (records: AnimalRecord[]) => {
  const headers = ["RFID", "Animal", "Farmer", "Antibiotic", "Dosage", "Date", "Withdrawal Days", "Vet", "Status"];
  const rows = records.map((r) => [
    r.rfid, r.animalName, r.farmerName, r.antibioticName,
    r.dosage, r.date, r.withdrawalDays, r.veterinarian,
    getWithdrawalStatus(r),
  ]);
  const csv = [headers, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `agri-safe-records-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
};

// ── Component ────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState<AnimalRecord[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isValid, setIsValid] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [antibioticStats, setAntibioticStats] = useState<AntibioticStat[]>([]);
  const [withdrawalAlerts, setWithdrawalAlerts] = useState<WithdrawalAlert[]>([]);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [filterFarmer, setFilterFarmer] = useState("all");
  const [filterAntibiotic, setFilterAntibiotic] = useState("all");
  const [filterFromDate, setFilterFromDate] = useState("");
  const [filterToDate, setFilterToDate] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") { navigate("/"); return; }

    const load = async () => {
      try {
        const [rec, blk, val, st, usr, ab, wa] = await Promise.all([
          getRecordsAPI(),
          getBlockchainAPI(),
          validateBlockchainAPI(),
          adminFetch("/admin/stats"),
          adminFetch("/admin/users"),
          adminFetch("/admin/antibiotic-stats"),
          adminFetch("/admin/withdrawal-alerts"),
        ]);
        setRecords(rec);
        setBlocks(blk);
        setIsValid(val.isValid);
        setStats(st);
        setUsers(usr);
        setAntibioticStats(ab);
        setWithdrawalAlerts(wa);
      } catch (e) {
        console.error("Admin load failed:", e);
      }
    };
    load();
  }, [user, navigate]);

  const handleLogout = () => { logout(); navigate("/"); };

  // Filtered records
  const farmers = [...new Set(records.map((r) => r.farmerId))];

  const filtered = records.filter((r) => {
    const matchSearch = !searchTerm ||
      r.rfid.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.animalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.farmerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFarmer = filterFarmer === "all" || r.farmerId === filterFarmer;
    const matchAntibiotic = filterAntibiotic === "all" || r.antibioticName === filterAntibiotic;
    const matchFrom = !filterFromDate || r.date >= filterFromDate;
    const matchTo = !filterToDate || r.date <= filterToDate;
    return matchSearch && matchFarmer && matchAntibiotic && matchFrom && matchTo;
  });

  const handleExportFiltered = async () => {
    const params = new URLSearchParams();
    if (filterFromDate) params.set("fromDate", filterFromDate);
    if (filterToDate) params.set("toDate", filterToDate);
    if (filterFarmer !== "all") params.set("farmerId", filterFarmer);
    if (filterAntibiotic !== "all") params.set("antibioticName", filterAntibiotic);
    const data = await adminFetch(`/admin/records/export?${params}`);
    exportToCSV(data);
  };

  const statusBadge = (status: string) => {
    if (status === "Safe") return <Badge className="bg-success/15 text-success border-success/30"><CheckCircle className="w-3 h-3 mr-1" />Safe</Badge>;
    if (status === "Not Safe") return <Badge className="bg-destructive/15 text-destructive border-destructive/30"><AlertTriangle className="w-3 h-3 mr-1" />Not Safe</Badge>;
    return <Badge className="bg-warning/15 text-warning border-warning/30"><Clock className="w-3 h-3 mr-1" />Caution</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card shadow-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-3">
            {isValid ? (
              <Badge className="bg-success/15 text-success border-success/30">
                <ShieldCheck className="w-3 h-3 mr-1" /> Chain Valid
              </Badge>
            ) : (
              <Badge className="bg-destructive/15 text-destructive border-destructive/30">
                <ShieldAlert className="w-3 h-3 mr-1" /> Chain Compromised
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" /> Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">

        {/* ── OVERVIEW STATS ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[
            { label: "Total Records",   value: stats?.totalRecords  ?? "—", color: "" },
            { label: "Total Farmers",   value: stats?.totalFarmers  ?? "—", color: "" },
            { label: "Total Vets",      value: stats?.totalVets     ?? "—", color: "" },
            { label: "Today's Records", value: stats?.todayRecords  ?? "—", color: "text-primary" },
            { label: "Safe Animals",    value: stats?.safeCount     ?? "—", color: "text-success" },
            { label: "Under Withdrawal",value: stats?.notSafeCount  ?? "—", color: "text-destructive" },
            { label: "Caution",         value: stats?.cautionCount  ?? "—", color: "text-warning" },
            { label: "Blockchain Blocks",value: stats?.totalBlocks  ?? "—", color: "" },
          ].map((s) => (
            <Card key={s.label} className="shadow-card">
              <CardContent className="pt-4 pb-4">
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── TABS ───────────────────────────────────────────────────────── */}
        <Tabs defaultValue="records">
          <TabsList className="flex-wrap">
            <TabsTrigger value="records"    className="gap-1.5"><Database className="w-4 h-4" /> Records</TabsTrigger>
            <TabsTrigger value="alerts"     className="gap-1.5"><Bell className="w-4 h-4" /> Withdrawal Alerts {withdrawalAlerts.length > 0 && <span className="ml-1 px-1.5 py-0.5 bg-destructive text-white text-xs rounded-full">{withdrawalAlerts.length}</span>}</TabsTrigger>
            <TabsTrigger value="users"      className="gap-1.5"><Users className="w-4 h-4" /> Users</TabsTrigger>
            <TabsTrigger value="antibiotics" className="gap-1.5"><BarChart2 className="w-4 h-4" /> Antibiotic Stats</TabsTrigger>
            <TabsTrigger value="blockchain" className="gap-1.5"><Link2 className="w-4 h-4" /> Blockchain</TabsTrigger>
            <TabsTrigger value="system"     className="gap-1.5"><Activity className="w-4 h-4" /> System Health</TabsTrigger>
          </TabsList>

          {/* ── TAB 1: Records + Filter + Export ── */}
          <TabsContent value="records" className="space-y-4 mt-4">
            {/* Search & Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search RFID, animal, farmer..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>

              <Select value={filterFarmer} onValueChange={setFilterFarmer}>
                <SelectTrigger><SelectValue placeholder="All Farmers" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Farmers</SelectItem>
                  {farmers.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>

              <Select value={filterAntibiotic} onValueChange={setFilterAntibiotic}>
                <SelectTrigger><SelectValue placeholder="All Antibiotics" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Antibiotics</SelectItem>
                  {ANTIBIOTIC_OPTIONS.map((a) => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                </SelectContent>
              </Select>

              <Button variant="outline" onClick={handleExportFiltered} className="gap-2">
                <Download className="w-4 h-4" /> Export CSV
              </Button>
            </div>

            {/* Date Range */}
            <div className="flex gap-3 items-center">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <Input type="date" value={filterFromDate} onChange={(e) => setFilterFromDate(e.target.value)} className="max-w-[160px]" />
              <span className="text-muted-foreground text-sm">to</span>
              <Input type="date" value={filterToDate} onChange={(e) => setFilterToDate(e.target.value)} className="max-w-[160px]" />
              {(filterFromDate || filterToDate || filterFarmer !== "all" || filterAntibiotic !== "all") && (
                <Button variant="ghost" size="sm" onClick={() => { setFilterFromDate(""); setFilterToDate(""); setFilterFarmer("all"); setFilterAntibiotic("all"); }}>
                  Clear Filters
                </Button>
              )}
              <span className="text-sm text-muted-foreground ml-auto">{filtered.length} records</span>
            </div>

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
                    <th className="text-left p-3 font-medium">Block Hash</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => (
                    <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                      <td className="p-3 font-mono text-xs">{r.rfid}</td>
                      <td className="p-3">{r.animalName}</td>
                      <td className="p-3">{r.farmerName}</td>
                      <td className="p-3">{r.antibioticName}</td>
                      <td className="p-3">{r.date}</td>
                      <td className="p-3">{getDaysRemaining(r)} days</td>
                      <td className="p-3">{statusBadge(getWithdrawalStatus(r))}</td>
                      <td className="p-3 font-mono text-xs text-muted-foreground">{r.blockHash?.slice(0, 12)}...</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No records found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ── TAB 2: Withdrawal Alerts ── */}
          <TabsContent value="alerts" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Animals Under Withdrawal Period</h2>

            {withdrawalAlerts.length === 0 ? (
              <Card className="shadow-card">
                <CardContent className="py-12 text-center text-success">
                  <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                  <p className="font-medium">All animals are safe! No withdrawal alerts.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {withdrawalAlerts.map((a) => (
                  <Card key={a.id} className={`shadow-card border-l-4 ${a.status === "Not Safe" ? "border-l-destructive" : "border-l-warning"}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{a.animalName}</span>
                            <span className="font-mono text-xs text-muted-foreground">{a.rfid}</span>
                            {statusBadge(a.status)}
                          </div>
                          <div className="text-sm text-muted-foreground mt-1 space-x-4">
                            <span>Farmer: <span className="text-foreground">{a.farmerName}</span></span>
                            <span>Antibiotic: <span className="text-foreground">{a.antibioticName}</span></span>
                            <span>Vet: <span className="text-foreground">{a.veterinarian}</span></span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-2xl font-bold ${a.status === "Not Safe" ? "text-destructive" : "text-warning"}`}>
                            {a.daysRemaining}
                          </div>
                          <div className="text-xs text-muted-foreground">days remaining</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── TAB 3: Users (Farmers & Vets) ── */}
          <TabsContent value="users" className="space-y-4 mt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Farmers */}
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" /> Farmers
                </h2>
                <div className="space-y-2">
                  {users.filter((u) => u.role === "farmer").map((u) => (
                    <Card key={u.userId} className="shadow-card">
                      <CardContent className="pt-4 pb-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{u.userId}</p>
                        </div>
                        <Badge variant="outline" className="text-sm">
                          {u.recordCount} animals
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Vets */}
              <div>
                <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <Users className="w-5 h-5 text-success" /> Veterinarians
                </h2>
                <div className="space-y-2">
                  {users.filter((u) => u.role === "veterinarian").map((u) => (
                    <Card key={u.userId} className="shadow-card">
                      <CardContent className="pt-4 pb-4 flex items-center justify-between">
                        <div>
                          <p className="font-medium">{u.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{u.userId}</p>
                        </div>
                        <Badge variant="outline" className="text-sm">
                          {u.recordCount} records added
                        </Badge>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* ── TAB 4: Antibiotic Stats Chart ── */}
          <TabsContent value="antibiotics" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">Antibiotic Usage Statistics</h2>
            <Card className="shadow-card">
              <CardContent className="pt-6">
                {antibioticStats.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={antibioticStats} margin={{ top: 5, right: 20, left: 0, bottom: 60 }}>
                      <XAxis dataKey="name" angle={-35} textAnchor="end" tick={{ fontSize: 12 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {antibioticStats.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Table */}
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Antibiotic</th>
                    <th className="text-left p-3 font-medium">Times Used</th>
                    <th className="text-left p-3 font-medium">Usage %</th>
                  </tr>
                </thead>
                <tbody>
                  {antibioticStats.map((a, i) => {
                    const total = antibioticStats.reduce((s, x) => s + x.count, 0);
                    return (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="p-3 font-medium">{a.name}</td>
                        <td className="p-3">{a.count}</td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-muted rounded-full h-2">
                              <div className="h-2 rounded-full bg-primary" style={{ width: `${(a.count / total) * 100}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground">{((a.count / total) * 100).toFixed(1)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* ── TAB 5: Blockchain Audit Log ── */}
          <TabsContent value="blockchain" className="space-y-4 mt-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-lg">Blockchain Verification</CardTitle>
                <CardDescription>
                  {isValid ? "✅ All blocks are valid. Data integrity is maintained." : "⚠️ WARNING: Blockchain integrity has been compromised!"}
                </CardDescription>
              </CardHeader>
            </Card>

            <div className="space-y-3">
              {blocks.map((block, idx) => (
                <Card key={idx} className={`shadow-card ${idx === 0 ? "border-primary/30" : ""}`}>
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">Block #{block.index}</Badge>
                        {idx === 0 && <Badge className="bg-primary/15 text-primary border-primary/30">Genesis</Badge>}
                        <Badge className="bg-success/15 text-success border-success/30">
                          <CheckCircle className="w-3 h-3 mr-1" /> Valid
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">{new Date(block.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">Hash: </span><code className="font-mono text-primary break-all">{block.hash}</code></div>
                      <div><span className="text-muted-foreground">Previous: </span><code className="font-mono break-all">{block.previousHash}</code></div>
                    </div>
                    {idx > 0 && block.data && (
                      <div className="mt-2 text-xs text-muted-foreground">
                        Animal: <span className="text-foreground font-medium">{block.data.animalName}</span> |
                        RFID: <span className="font-mono">{block.data.rfid}</span> |
                        Treatment: {block.data.antibioticName} |
                        Vet: {block.data.veterinarian}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── TAB 6: System Health ── */}
          <TabsContent value="system" className="space-y-4 mt-4">
            <h2 className="text-lg font-semibold">System Health</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold">Database</p>
                      <p className="text-sm text-success">Connected</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isValid ? "bg-success/15" : "bg-destructive/15"}`}>
                      {isValid ? <ShieldCheck className="w-5 h-5 text-success" /> : <ShieldAlert className="w-5 h-5 text-destructive" />}
                    </div>
                    <div>
                      <p className="font-semibold">Blockchain</p>
                      <p className={`text-sm ${isValid ? "text-success" : "text-destructive"}`}>
                        {isValid ? "All blocks valid" : "Chain compromised!"}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                      <Link2 className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Total Blocks</p>
                      <p className="text-sm text-muted-foreground">{stats?.totalBlocks ?? "—"} blocks in chain</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                      <Database className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Total Records</p>
                      <p className="text-sm text-muted-foreground">{stats?.totalRecords ?? "—"} animal records</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-success/15 flex items-center justify-center">
                      <Users className="w-5 h-5 text-success" />
                    </div>
                    <div>
                      <p className="font-semibold">Active Users</p>
                      <p className="text-sm text-muted-foreground">
                        {stats ? stats.totalFarmers + stats.totalVets : "—"} users registered
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-warning/15 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-semibold">Active Alerts</p>
                      <p className="text-sm text-muted-foreground">{withdrawalAlerts.length} withdrawal alerts</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
