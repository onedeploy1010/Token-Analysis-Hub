import React from "react";
import { Link, useLocation } from "wouter";
import { Activity, BarChart2, Cpu, Grid, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
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
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-1.5 rounded-md border border-primary/20 group-hover:border-primary/50 transition-colors animate-pulse-glow">
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <span className="hidden font-medium tracking-tight text-lg sm:inline-block">
              CRYP<span className="text-primary font-semibold">TERM</span>
            </span>
          </Link>
        </div>
        <div className="flex flex-1 items-center space-x-2 justify-end sm:justify-start">
          <nav className="flex items-center space-x-1 sm:space-x-4">
            {navItems.map((item) => {
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
    <div className="relative flex min-h-screen flex-col bg-background selection:bg-primary selection:text-primary-foreground">
      <Navbar />
      <main className="flex-1 w-full mx-auto">
        {children}
      </main>
      <footer className="py-6 md:px-8 md:py-0 border-t border-border bg-card/30 backdrop-blur-sm">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row mx-auto px-4">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            专为机构级投资者打造 · 数据延迟最多15分钟 | Built for serious capital. Data is delayed by up to 15 minutes.
          </p>
        </div>
      </footer>
    </div>
  );
}
