import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Mail, ShieldAlert, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function AdminLogin() {
  const { session, loading, configured, signIn } = useAuth();
  const [, navigate] = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Already authenticated → bounce to dashboard
  useEffect(() => {
    if (!loading && session) navigate("/admin");
  }, [loading, session, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email, password);
    setSubmitting(false);
    if (error) setError(error);
    else navigate("/admin");
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden bg-background">
      {/* Ambient background */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[120px] animate-orb-drift pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-chart-2/8 rounded-full blur-[90px] animate-float-y pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm relative z-10"
      >
        <div className="corner-brackets border border-border/50 bg-card/80 backdrop-blur-md rounded-2xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)]">
          <div className="mb-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/25 mb-3">
              <Lock className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">Admin Console</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Sign in to manage site materials</p>
          </div>

          {!configured && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-700/40 bg-amber-950/30 p-3 text-[11px] text-amber-200">
              <ShieldAlert className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Supabase env vars are missing. Sign-in is disabled until
                {" "}<code className="font-mono">VITE_SUPABASE_ANON_KEY</code> is set.
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-muted-foreground">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  disabled={!configured || submitting}
                  className="pl-9 bg-background/60 h-10"
                  placeholder="admin@example.com"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-muted-foreground">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  disabled={!configured || submitting}
                  className="pl-9 bg-background/60 h-10"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <div className="text-[11px] text-destructive bg-destructive/10 border border-destructive/30 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={!configured || submitting || !email || !password}
              className="w-full h-10 font-semibold"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
            </Button>
          </form>

          <p className="mt-5 text-center text-[10px] text-muted-foreground/60 uppercase tracking-widest">
            Secured by Supabase Auth
          </p>
        </div>
      </motion.div>
    </div>
  );
}
