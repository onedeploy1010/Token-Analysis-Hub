import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, Grid, Home, Users, X, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", labelZh: "仪表盘", icon: Home },
  { href: "/projects", label: "Projects", labelZh: "项目库", icon: Grid },
  { href: "/tools", label: "Simulators", labelZh: "模拟工具", icon: Activity },
  { href: "/recruit", label: "Recruit", labelZh: "节点招募", icon: Users },
];

/* ─── Animated Logo ──────────────────────────────────────────────── */
function AnimatedRuneLogo({ size = 36 }: { size?: number }) {
  const ring = size + 6;
  return (
    <div className="relative shrink-0" style={{ width: ring, height: ring }}>
      {/* spinning conic-gradient ring */}
      <motion.div
        className="absolute inset-0 rounded-xl"
        style={{
          background: "conic-gradient(from 0deg, transparent 60%, rgba(251,191,36,0.9) 80%, rgba(217,119,6,1) 90%, rgba(251,191,36,0.9) 100%, transparent 140%)",
          padding: 1.5,
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "linear" }}
      />
      {/* static amber outer glow */}
      <div
        className="absolute inset-0 rounded-xl"
        style={{ boxShadow: "0 0 14px 2px rgba(251,191,36,0.22), 0 0 4px 1px rgba(251,191,36,0.12) inset" }}
      />
      {/* image */}
      <div
        className="absolute rounded-[9px] overflow-hidden bg-black"
        style={{ inset: 2 }}
      >
        <img src="/rune-logo.png" alt="MarketRune" className="w-full h-full object-contain" />
      </div>
    </div>
  );
}

/* ─── Shimmer wordmark ───────────────────────────────────────────── */
function WordmarkRune({ small = false }: { small?: boolean }) {
  return (
    <span
      className={cn(
        "font-bold uppercase tracking-[0.18em] leading-none select-none",
        small ? "text-[17px]" : "text-[22px] sm:text-[24px]"
      )}
      style={{
        fontFamily: "'Cinzel', serif",
        background: "linear-gradient(100deg, #b45309 0%, #fbbf24 30%, #fef3c7 50%, #fbbf24 70%, #b45309 100%)",
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        backgroundClip: "text",
        animation: "rune-shimmer 3.2s ease-in-out infinite",
      }}
    >
      RUNE
    </span>
  );
}

/* ─── Keyframe injection ─────────────────────────────────────────── */
const shimmerStyle = `
@keyframes rune-shimmer {
  0%   { background-position: 100% 50%; }
  50%  { background-position:   0% 50%; }
  100% { background-position: 100% 50%; }
}
`;

function Navbar() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <style>{shimmerStyle}</style>

      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/90 backdrop-blur-md shadow-sm">
        <div className="container flex h-16 items-center justify-between mx-auto px-4">

          {/* Logo + wordmark */}
          <Link
            href="/"
            className="flex items-center gap-3 group"
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              whileHover={{ scale: 1.06 }}
              transition={{ type: "spring", stiffness: 340, damping: 22 }}
            >
              <AnimatedRuneLogo size={34} />
            </motion.div>
            <WordmarkRune />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-stretch h-16 gap-0">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "relative flex flex-col items-center justify-center px-6 transition-all duration-200 group border-b-2",
                    isActive
                      ? "border-amber-400 text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border/50"
                  )}
                >
                  <span className={cn(
                    "text-[13.5px] font-semibold tracking-tight leading-none transition-colors",
                    isActive ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                  )}>
                    {item.labelZh}
                  </span>
                  <span className={cn(
                    "text-[9.5px] uppercase tracking-[0.12em] mt-[3px] leading-none transition-colors",
                    isActive ? "text-amber-400/80" : "text-muted-foreground/40 group-hover:text-muted-foreground/70"
                  )}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-border/50 bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md md:hidden"
              onClick={() => setMenuOpen(false)}
            />

            <motion.div
              key="drawer"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-0 right-0 bottom-0 z-50 md:hidden w-[78vw] max-w-[300px] flex flex-col bg-[#080f1e] border-l border-border/40 shadow-[-20px_0_60px_rgba(0,0,0,0.6)]"
            >
              {/* Drawer header */}
              <div className="flex items-center justify-between px-6 h-16 border-b border-border/30 shrink-0">
                <div className="flex items-center gap-3">
                  <AnimatedRuneLogo size={28} />
                  <WordmarkRune small />
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Nav items */}
              <nav className="flex-1 flex flex-col justify-center px-6 gap-1 py-8">
                {NAV_ITEMS.map((item, i) => {
                  const Icon = item.icon;
                  const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                  return (
                    <motion.div
                      key={item.href}
                      initial={{ opacity: 0, x: 24 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.07 + 0.1, duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <Link
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          "group flex items-center gap-5 py-5 border-b transition-all",
                          isActive ? "border-primary/30" : "border-border/20 hover:border-border/40"
                        )}
                      >
                        <span className={cn(
                          "text-[11px] font-mono tabular-nums w-5 shrink-0",
                          isActive ? "text-primary/80" : "text-muted-foreground/40"
                        )}>
                          0{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xl font-bold tracking-tight leading-none",
                            isActive ? "text-primary" : "text-foreground/70 group-hover:text-foreground transition-colors"
                          )}>
                            {item.labelZh}
                          </p>
                          <p className={cn(
                            "text-[11px] mt-1 tracking-widest uppercase",
                            isActive ? "text-primary/60" : "text-muted-foreground/40"
                          )}>
                            {item.label}
                          </p>
                        </div>
                        <Icon className={cn(
                          "h-4 w-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                          isActive ? "text-primary" : "text-muted-foreground/30"
                        )} />
                      </Link>
                    </motion.div>
                  );
                })}
              </nav>

              {/* Drawer footer */}
              <div className="px-6 py-5 border-t border-border/20 shrink-0">
                <p className="text-[10px] text-muted-foreground/30 uppercase tracking-widest">
                  机构级 DeFi 研究平台
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export function AppLayout({ children }: LayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background selection:bg-primary/30 selection:text-amber-200">
      <style>{shimmerStyle}</style>
      <Navbar />
      <main className="flex-1 w-full mx-auto">
        {children}
      </main>
      <footer className="py-6 md:px-8 md:py-0 border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row mx-auto px-4">
          <div className="flex items-center gap-2.5">
            <div className="w-[18px] h-[18px] rounded overflow-hidden bg-black border border-white/10 shrink-0">
              <img src="/rune-logo.png" alt="MarketRune" className="w-full h-full object-contain" />
            </div>
            <span style={{ fontFamily: "'Cinzel', serif" }}>
              <span className="text-[11px] font-bold tracking-[0.18em] text-amber-500/60 uppercase">Rune</span>
            </span>
          </div>
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            专为机构级投资者打造 · 数据延迟最多15分钟
          </p>
        </div>
      </footer>
    </div>
  );
}
