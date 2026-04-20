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
    { href: "/", label: "Dashboard", icon: Home },
    { href: "/projects", label: "Projects", icon: Grid },
    { href: "/tools", label: "Simulators", icon: Activity },
    { href: "/rune", label: "RUNE Analytics", icon: BarChart2 },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center mx-auto px-4">
        <div className="mr-8 hidden md:flex">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="bg-primary/10 p-1.5 rounded-md border border-primary/20 group-hover:border-primary/50 transition-colors">
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <span className="hidden font-bold tracking-tight text-lg sm:inline-block">
              CRYPT<span className="text-primary">TERM</span>
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
                    "flex items-center gap-2 text-sm font-medium transition-colors px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground",
                    isActive ? "bg-accent/50 text-primary border border-primary/20" : "text-muted-foreground"
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
      <footer className="py-6 md:px-8 md:py-0 border-t border-border">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row mx-auto px-4">
          <p className="text-balance text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built for serious capital. Data is delayed by up to 15 minutes.
          </p>
        </div>
      </footer>
    </div>
  );
}
