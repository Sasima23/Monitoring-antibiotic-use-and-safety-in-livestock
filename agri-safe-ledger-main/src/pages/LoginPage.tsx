import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { getAvailableUsers } from "@/lib/data-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Leaf, AlertCircle } from "lucide-react";

const LoginPage = () => {
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const { login } = useAuth();
  const navigate = useNavigate();
  const demoUsers = getAvailableUsers();

  const handleSubmit = async(e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const success = await login(userId, password);
    if (success) {
      const user = demoUsers.find((u) => u.id === userId.toUpperCase());
      if (user?.role === "farmer") navigate("/farmer");
      else if (user?.role === "veterinarian") navigate("/vet");
      else if (user?.role === "admin") navigate("/admin");
    } else {
      setError("Invalid credentials. Please check your User ID and password.");
    }
  };

  const quickLogin = (id: string, pass: string) => {
    setUserId(id);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen gradient-hero flex items-center justify-center p-4">
      <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Left - Branding */}
        <div className="text-primary-foreground space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shadow-glow">
              <Leaf className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Digital Farm</h1>
              <p className="text-sm opacity-80">MRL Monitoring Portal</p>
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-4xl font-extrabold leading-tight">
              Monitor Maximum
              <br />
              Residue Limits
              <br />
              <span className="text-primary opacity-90">in Livestock</span>
            </h2>
            <p className="text-lg opacity-70 max-w-md">
              Blockchain-secured animal treatment records with real-time IoT
              monitoring for safe food production.
            </p>
          </div>
          <div className="flex gap-4 text-sm opacity-60">
            <div className="flex items-center gap-1.5">
              <Shield className="w-4 h-4" /> Blockchain Secured
            </div>
            <div className="flex items-center gap-1.5">
              <Leaf className="w-4 h-4" /> IoT Monitored
            </div>
          </div>
        </div>

        {/* Right - Login Form */}
        <Card className="shadow-card animate-slide-up border-0">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl">Sign In</CardTitle>
            <CardDescription>
              Enter your credentials to access the portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="userId">User ID</Label>
                <Input
                  id="userId"
                  placeholder="e.g. FARMER001"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 gradient-primary text-primary-foreground font-semibold">
                Sign In
              </Button>
            </form>

            {/* Demo Credentials
            <div className="mt-6 pt-4 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-3">
                Demo Accounts (click to fill):
              </p>
              <div className="grid grid-cols-1 gap-2">
                {demoUsers.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => quickLogin(u.id, u.password)}
                    className="flex items-center justify-between p-2.5 rounded-lg border hover:bg-accent transition-colors text-left text-sm"
                  >
                    <div>
                      <span className="font-medium">{u.name}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                        {u.role}
                      </span>
                    </div>
                    <code className="text-xs text-muted-foreground font-mono">
                      {u.id}
                    </code>
                  </button>
                ))}
              </div>
            </div> */}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;
