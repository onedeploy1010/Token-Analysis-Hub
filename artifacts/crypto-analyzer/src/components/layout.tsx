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

function RuneLogo({ size = 32 }: { size?: number }) {
  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-lg overflow-hidden bg-black border border-white/10 shrink-0"
    >
      <img src="/rune-logo.png" alt="MarketRune" className="w-full h-full object-contain" />
    </div>
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
            <div className="shadow-[0_0_12px_rgba(251,191,36,0.18)] group-hover:shadow-[0_0_20px_rgba(251,191,36,0.32)] transition-all duration-300">
              <RuneLogo size={32} />
            </div>
            <span className="leading-none select-none" style={{ fontFamily: "'Cinzel', serif" }}>
              <span className="text-[13px] sm:text-[14px] font-normal tracking-[0.18em] text-foreground/60 uppercase">Market</span><span className="text-[16px] sm:text-[17px] font-bold tracking-[0.12em] text-amber-400 uppercase">Rune</span>
            </span>
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

      {/* Mobile full-screen drawer */}
      <AnimatePresence>
        {menuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md md:hidden"
              onClick={() => setMenuOpen(false)}
            />

            {/* Right-side drawer panel */}
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
                <div className="flex items-center gap-2.5">
                  <RuneLogo size={26} />
                  <span style={{ fontFamily: "'Cinzel', serif" }}>
                    <span className="text-[12px] font-normal tracking-[0.18em] text-foreground/55 uppercase">Market</span><span className="text-[15px] font-bold tracking-[0.12em] text-amber-400 uppercase">Rune</span>
                  </span>
                </div>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Nav items — large editorial style */}
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
      <Navbar />
      <main className="flex-1 w-full mx-auto">
        {children}
      </main>
      <footer className="py-6 md:px-8 md:py-0 border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row mx-auto px-4">
          <div className="flex items-center gap-2.5">
            <RuneLogo size={18} />
            <span style={{ fontFamily: "'Cinzel', serif" }}>
              <span className="text-[10px] font-normal tracking-[0.15em] text-foreground/40 uppercase">Market</span><span className="text-[11px] font-bold tracking-[0.1em] text-amber-500/60 uppercase">Rune</span>
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
