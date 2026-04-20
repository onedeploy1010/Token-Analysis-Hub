import React from "react";
import { Link, useLocation } from "wouter";
import { Activity, Grid, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

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

  const navItems = [
    { href: "/", label: "仪表盘 Dashboard", icon: Home },
    { href: "/projects", label: "项目库 Projects", icon: Grid },
    { href: "/tools", label: "模拟工具 Simulators", icon: Activity },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="container flex h-16 items-center mx-auto px-4">
        <div className="mr-8 hidden md:flex">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="rounded-lg overflow-hidden shadow-[0_0_12px_rgba(251,191,36,0.18)] group-hover:shadow-[0_0_20px_rgba(251,191,36,0.32)] transition-all duration-300">
              <AurumLogo size={32} />
            </div>
            <span className="hidden sm:inline-block text-[17px] tracking-tight leading-none select-none">
              <span className="font-light text-foreground/85">Market</span><span className="font-bold text-amber-400 tracking-wide">Aurum</span>
            </span>
          </Link>
        </div>

        {/* Mobile logo (icon only) */}
        <div className="mr-4 flex md:hidden">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="rounded-lg overflow-hidden shadow-[0_0_10px_rgba(251,191,36,0.2)] group-hover:shadow-[0_0_16px_rgba(251,191,36,0.35)] transition-all duration-300">
              <AurumLogo size={30} />
            </div>
          </Link>
        </div>

        <div className="flex flex-1 items-center space-x-1 sm:space-x-2 justify-end sm:justify-start">
          <nav className="flex items-center">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 text-sm font-medium transition-colors px-3 py-4 border-b-2",
                    isActive
                      ? "text-foreground border-primary"
                      : "text-muted-foreground border-transparent hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline-block">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}

export function AppLayout({ children }: LayoutProps) {
  return (
    <div className="relative flex min-h-screen flex-col bg-background selection:bg-amber-400/30 selection:text-amber-200">
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
