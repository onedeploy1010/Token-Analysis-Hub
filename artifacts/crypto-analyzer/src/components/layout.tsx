import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, Grid, Home, X, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", labelZh: "仪表盘", icon: Home },
  { href: "/projects", label: "Projects", labelZh: "项目库", icon: Grid },
  { href: "/tools", label: "Simulators", labelZh: "模拟工具", icon: Activity },
];

function AurumLogo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill="#0b1628"/>
      <rect x="0.5" y="0.5" width="31" height="31" rx="6.5" stroke="url(#nb)" strokeWidth="1" fill="none"/>
      <ellipse cx="16" cy="17" rx="10" ry="9" fill="#d97706" fillOpacity="0.08"/>
      <line x1="16" y1="5" x2="6" y2="27" stroke="url(#nl)" strokeWidth="2.6" strokeLinecap="round"/>
      <line x1="16" y1="5" x2="26" y2="27" stroke="url(#nl)" strokeWidth="2.6" strokeLinecap="round"/>
      <line x1="10" y1="19" x2="22" y2="19" stroke="url(#nc)" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="16" cy="5" r="1.5" fill="#fbbf24" fillOpacity="0.95"/>
      <defs>
        <linearGradient id="nl" x1="6" y1="27" x2="26" y2="5" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#92400e"/>
          <stop offset="50%" stopColor="#d97706"/>
          <stop offset="100%" stopColor="#fbbf24"/>
        </linearGradient>
        <linearGradient id="nc" x1="10" y1="19" x2="22" y2="19" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#b45309"/>
          <stop offset="100%" stopColor="#fcd34d"/>
        </linearGradient>
        <linearGradient id="nb" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.45"/>
          <stop offset="100%" stopColor="#92400e" stopOpacity="0.1"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

function Navbar() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/90 backdrop-blur-md shadow-sm">
        <div className="container flex h-16 items-center justify-between mx-auto px-4">

          {/* Logo + wordmark — always visible */}
          <Link href="/" className="flex items-center gap-2.5 group" onClick={() => setMenuOpen(false)}>
            <div className="rounded-lg overflow-hidden shadow-[0_0_12px_rgba(251,191,36,0.18)] group-hover:shadow-[0_0_20px_rgba(251,191,36,0.32)] transition-all duration-300 shrink-0">
              <AurumLogo size={32} />
            </div>
            <span className="text-[16px] sm:text-[17px] tracking-tight leading-none select-none">
              <span className="font-light text-foreground/85">Market</span><span className="font-bold text-amber-400 tracking-wide">Aurum</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors px-3 py-4 border-b-2",
                    isActive ? "text-foreground border-primary" : "text-muted-foreground border-transparent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.labelZh} {item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Mobile hamburger button */}
          <button
            className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-border/50 bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
            onClick={() => setMenuOpen(v => !v)}
            aria-label="Toggle menu"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden"
              onClick={() => setMenuOpen(false)}
            />

            {/* Drawer */}
            <motion.div
              key="drawer"
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed top-[65px] left-0 right-0 z-50 md:hidden mx-4"
            >
              <div className="rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-[0_8px_40px_rgba(0,0,0,0.5)] overflow-hidden">
                {/* Brand header inside drawer */}
                <div className="px-5 py-4 border-b border-border/40 flex items-center gap-3">
                  <AurumLogo size={28} />
                  <div>
                    <p className="text-sm font-light text-foreground/70">
                      Market<span className="font-bold text-amber-400">Aurum</span>
                    </p>
                    <p className="text-[11px] text-muted-foreground/50">DeFi Intelligence Platform</p>
                  </div>
                </div>

                {/* Nav items */}
                <nav className="p-3 space-y-1">
                  {NAV_ITEMS.map((item, i) => {
                    const Icon = item.icon;
                    const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
                    return (
                      <motion.div
                        key={item.href}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.06, duration: 0.2 }}
                      >
                        <Link
                          href={item.href}
                          onClick={() => setMenuOpen(false)}
                          className={cn(
                            "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all",
                            isActive
                              ? "bg-primary/10 border border-primary/25 text-foreground"
                              : "text-muted-foreground hover:bg-muted/40 hover:text-foreground border border-transparent"
                          )}
                        >
                          <div className={cn(
                            "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
                            isActive ? "bg-primary/20" : "bg-muted/40"
                          )}>
                            <Icon className={cn("h-4.5 w-4.5", isActive ? "text-primary" : "text-muted-foreground")} />
                          </div>
                          <div>
                            <p className={cn("text-sm font-semibold", isActive && "text-primary")}>{item.labelZh}</p>
                            <p className="text-[11px] text-muted-foreground/60">{item.label}</p>
                          </div>
                          {isActive && (
                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </Link>
                      </motion.div>
                    );
                  })}
                </nav>

                {/* Footer inside drawer */}
                <div className="px-5 py-3 border-t border-border/40">
                  <p className="text-[11px] text-muted-foreground/40 text-center">专为机构级投资者打造 · Built for serious capital</p>
                </div>
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
      <Navbar />
      <main className="flex-1 w-full mx-auto">
        {children}
      </main>
      <footer className="py-6 md:px-8 md:py-0 border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row mx-auto px-4">
          <div className="flex items-center gap-2.5">
            <AurumLogo size={18} />
            <span className="text-xs text-muted-foreground/60 font-light">Market<span className="text-amber-500/70 font-semibold">Aurum</span></span>
          </div>
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            专为机构级投资者打造 · 数据延迟最多15分钟 · Built for serious capital.
          </p>
        </div>
      </footer>
    </div>
  );
}
