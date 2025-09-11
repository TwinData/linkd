import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/AuthProvider";
import { Seo } from "@/components/Seo";
import { useToast } from "@/hooks/use-toast";
import { TransactionCharges } from "@/components/TransactionCharges";

const Settings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading && !user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="LinKD Settings | Configure your workspace"
        description="Adjust LinKD settings and preferences for your workspace."
        canonical={window.location.href}
      />
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <Button variant="secondary" onClick={() => navigate("/dashboard")}>Back to Dashboard</Button>
        </div>
      </header>
      <main className="container py-8 space-y-6">
        <section aria-labelledby="settings-overview" className="space-y-2">
          <h2 id="settings-overview" className="sr-only">Overview</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-muted-foreground">General Settings</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Default Currency</Label>
                  <Select defaultValue="KES">
                    <SelectTrigger>
                      <SelectValue placeholder="Currency" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="KES">Kenyan Shilling (KES)</SelectItem>
                      <SelectItem value="KWD">Kuwaiti Dinar (KWD)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Locale</Label>
                  <Select defaultValue="en-KE">
                    <SelectTrigger>
                      <SelectValue placeholder="Locale" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-KE">English (Kenya)</SelectItem>
                      <SelectItem value="en-US">English (US)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Notification Email</Label>
                  <Input type="email" placeholder="you@example.com" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => toast({ title: "Settings saved (mock)", description: "Wire to Supabase to persist." })}>Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </section>
        
        <section aria-labelledby="transaction-charges" className="space-y-2">
          <h2 id="transaction-charges" className="sr-only">Transaction Charges</h2>
          <TransactionCharges />
        </section>
      </main>
    </div>
  );
};

export default Settings;
