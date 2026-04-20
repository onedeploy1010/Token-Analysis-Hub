import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { Activity, Grid, Home, Users, X, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { LanguageToggle } from "@/components/language-toggle";
import { useLanguage } from "@/contexts/language-context";

interface LayoutProps {
  children: React.ReactNode;
}

const NAV_ITEMS = [
  { href: "/",        label: "DASHBOARD",  key: "dashboard",  icon: Home },
  { href: "/projects",label: "PROJECTS",   key: "projects",   icon: Grid },
  { href: "/tools",   label: "SIMULATORS", key: "simulators", icon: Activity },
  { href: "/recruit", label: "RECRUIT",    key: "recruit",    icon: Users },
];

/* ─── SVG Rune Mark ──────────────────────────────────────────────── */
function RuneMark({ size = 44 }: { size?: number }) {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
      animate={{
        filter: [
          "drop-shadow(0 0 3px rgba(251,191,36,0.15))",
          "drop-shadow(0 0 10px rgba(251,191,36,0.55))",
          "drop-shadow(0 0 3px rgba(251,191,36,0.15))",
        ],
      }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id="gld-outer" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fef3c7" />
          <stop offset="50%"  stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="gld-inner" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fde68a" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
      </defs>

      {/* Outer hexagon */}
      <polygon
        points="24,2 43.5,13 43.5,35 24,46 4.5,35 4.5,13"
        stroke="url(#gld-outer)"
        strokeWidth="1.2"
        strokeLinejoin="round"
        fill="rgba(251,191,36,0.04)"
      />

      {/* Inner thin hexagon ring */}
      <polygon
        points="24,7 39,15.5 39,32.5 24,41 9,32.5 9,15.5"
        stroke="url(#gld-inner)"
        strokeWidth="0.5"
        strokeLinejoin="round"
        fill="none"
        opacity="0.4"
      />

      {/* Geometric R — spine */}
      <line x1="17" y1="14" x2="17" y2="34" stroke="url(#gld-outer)" strokeWidth="1.6" strokeLinecap="round" />
      {/* R — top arm */}
      <line x1="17" y1="14" x2="27" y2="14" stroke="url(#gld-outer)" strokeWidth="1.6" strokeLinecap="round" />
      {/* R — bowl arc */}
      <path
        d="M27,14 Q33,14 33,20 Q33,26 27,26 L17,26"
        stroke="url(#gld-outer)"
        strokeWidth="1.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* R — diagonal leg */}
      <line x1="26" y1="26" x2="33" y2="34" stroke="url(#gld-outer)" strokeWidth="1.6" strokeLinecap="round" />

      {/* Corner accent dots */}
      <circle cx="24" cy="2"  r="1.2" fill="url(#gld-outer)" opacity="0.7" />
      <circle cx="24" cy="46" r="1.2" fill="url(#gld-outer)" opacity="0.7" />
    </motion.svg>
  );
}

/* ─── Wordmark ───────────────────────────────────────────────────── */
function WordmarkRune({ small = false }: { small?: boolean }) {
  return (
    <div className="flex flex-col justify-center leading-none select-none gap-[3px]">
      <motion.span
        style={{
          fontFamily: "'Cinzel', serif",
          fontSize: small ? "17px" : "25px",
          letterSpacing: small ? "0.28em" : "0.36em",
          fontWeight: 700,
          lineHeight: 1,
          background: "linear-gradient(135deg, #fef3c7 10%, #fbbf24 50%, #d97706 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          paddingRight: small ? "0.28em" : "0.36em",
        }}
        animate={{
          textShadow: [
            "0 0 0px rgba(251,191,36,0)",
            "0 0 20px rgba(251,191,36,0.5)",
            "0 0 0px rgba(251,191,36,0)",
          ],
        }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      >
        RUNE
      </motion.span>
      {!small && (
        <span
          style={{
            fontFamily: "'Cinzel', serif",
            fontSize: "7.5px",
            letterSpacing: "0.38em",
            color: "rgba(251,191,36,0.42)",
            textTransform: "uppercase",
            lineHeight: 1,
            paddingRight: "0.38em",
          }}
        >
          ◆ intelligence
        </span>
      )}
    </div>
  );
}


function Navbar() {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const { t, language } = useLanguage();

  const isEn = language === "en";

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/90 backdrop-blur-md shadow-sm">
        <div className="container flex h-[72px] items-center justify-between mx-auto px-6">

          {/* Logo + wordmark */}
          <Link
            href="/"
            className="flex items-center gap-4 group"
            onClick={() => setMenuOpen(false)}
          >
            <motion.div
              whileHover={{ scale: 1.06 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <RuneMark size={50} />
            </motion.div>
            <WordmarkRune />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-stretch h-[72px] gap-0">
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
                    {t(`mr.nav.${item.key}`)}
                  </span>
                  {!isEn && (
                    <span className={cn(
                      "text-[9.5px] uppercase tracking-[0.12em] mt-[3px] leading-none transition-colors",
                      isActive ? "text-amber-400/80" : "text-muted-foreground/40 group-hover:text-muted-foreground/70"
                    )}>
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <LanguageToggle />

            {/* Mobile hamburger */}
            <button
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl border border-border/50 bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
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
                  <RuneMark size={28} />
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
                            {t(`mr.nav.${item.key}`)}
                          </p>
                          {!isEn && (
                            <p className={cn(
                              "text-[11px] mt-1 tracking-widest uppercase",
                              isActive ? "text-primary/60" : "text-muted-foreground/40"
                            )}>
                              {item.label}
                            </p>
                          )}
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
                  {t("mr.footer.tagline")}
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
  const { t } = useLanguage();

  return (
    <div className="relative flex min-h-screen flex-col bg-background selection:bg-primary/30 selection:text-amber-200">
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
            {t("mr.footer.tagline")}
          </p>
        </div>
      </footer>
    </div>
  );
}
