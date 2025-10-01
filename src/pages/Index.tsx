import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Seo } from "@/components/Seo";

const Index = () => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
      return;
    }
    if (data.session) {
      toast({ title: "Welcome back", description: "Logged in successfully" });
      navigate("/dashboard");
      setOpen(false);
    }
  };

  const onReset = async () => {
    if (!email.trim()) {
      toast({ 
        title: "Email required", 
        description: "Please enter your email address to reset your password.",
        variant: "destructive" 
      });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        toast({ 
          title: "Reset failed", 
          description: error.message, 
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Password reset sent!", 
          description: "Check your email for a password reset link. It may take a few minutes to arrive.",
        });
        setEmail(""); // Clear email after successful request
      }
    } catch (err) {
      toast({
        title: "Reset failed",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Seo
        title="LinKD – KD ↔ KES Cash Exchange & Transfer"
        description="LinKD facilitates fast, secure cash exchange and transfers between Kuwait Dinar and Kenyan Shillings. Login to access your dashboard."
        canonical={window.location.href}
      />
      <header className="border-b border-border">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">LinKD</span>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>Log in</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log in to LinKD</DialogTitle>
                <DialogDescription>Enter your credentials to access your LinKD dashboard.</DialogDescription>
              </DialogHeader>
              <form onSubmit={onLogin} className="grid gap-4 py-2">
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
                      Forgot password?
                    </Link>
                  </div>
                  <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <DialogFooter className="gap-2">
                  <Button type="submit" disabled={loading} className="w-full">{loading ? "Signing in…" : "Sign in"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container py-16">
        <section className="grid gap-6 text-center max-w-2xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-bold text-foreground">Cash Exchange & Transfers for Kuwait Dinar (KD) → KES</h1>
          <p className="text-muted-foreground text-lg">
            Provide your customers with secure KD payment links and receive instant KES payouts. Transparent rates, streamlined workflow.
          </p>
          <div className="flex justify-center">
            <Button onClick={() => setOpen(true)} className="px-8">Get started – Log in</Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="container py-6 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} LinKD. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
