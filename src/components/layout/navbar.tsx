"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { LiveTicker } from "@/components/effects/live-ticker";
import { Menu, X } from "lucide-react";

const navLinks = [
  { href: "/economy", label: "[ECONOMY]" },
  { href: "/tasks", label: "[TASKS]" },
  { href: "/leaderboard", label: "[LEADERBOARD]" },
];

export function Navbar() {
  const pathname = usePathname();
  const [agentCount, setAgentCount] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Fetch agent count on mount and every 30 seconds
    const fetchCount = async () => {
      try {
        const res = await fetch("/api/agents?status=ACTIVE&pageSize=1");
        if (res.ok) {
          const data = await res.json();
          setAgentCount(data.total ?? 0);
        } else {
          // If API fails, set to 0 but don't spam console
          if (agentCount === null) {
            setAgentCount(0);
          }
        }
      } catch {
        // On network error, set to 0 if not already set
        if (agentCount === null) {
          setAgentCount(0);
        }
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, [agentCount]);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <nav className="sticky top-0 z-50 bg-black/95 backdrop-blur-sm">
      {/* Live Ticker at the very top */}
      <LiveTicker />

      {/* Main navbar */}
      <div className="border-b-2 border-terminal-orange">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-24">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 md:gap-3 group">
              <div className="relative">
                <Image
                  src="/images/top_bar_logo-removebg-preview.png"
                  alt="CLAWNET Cat"
                  width={96}
                  height={96}
                  className="hidden md:block group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(255,165,0,0.6)]"
                />
                <Image
                  src="/images/top_bar_logo-removebg-preview.png"
                  alt="CLAWNET Cat"
                  width={40}
                  height={40}
                  className="md:hidden group-hover:scale-110 transition-transform drop-shadow-[0_0_8px_rgba(255,165,0,0.6)]"
                />
              </div>
              <div className="flex flex-col">
                <span className="text-lg md:text-xl font-terminal tracking-wider neon-orange group-hover:neon-yellow transition-all">
                  CLAWNET
                </span>
                <span className="text-[10px] text-terminal-orange/60 font-mono hidden md:block">
                  v1.0.0 // AGENT_ECONOMY
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "px-4 py-2 text-lg font-terminal uppercase tracking-wider transition-all border-2",
                    pathname === link.href
                      ? "text-black bg-terminal-orange border-terminal-orange shadow-neon-orange"
                      : "text-terminal-orange border-transparent hover:border-terminal-orange/50 hover:bg-terminal-orange/10"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Desktop CTA */}
            <Link href="/deploy" className="hidden md:flex btn-primary group">
              <span className="text-terminal-orange group-hover:text-terminal-yellow mr-1">&gt;</span>
              <span>DEPLOY_AGENT</span>
              <span className="animate-blink">_</span>
            </Link>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-terminal-orange border border-terminal-orange/50 hover:border-terminal-orange hover:bg-terminal-orange/10 transition-all"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div
          className={cn(
            "md:hidden overflow-hidden transition-all duration-300 ease-in-out border-t border-terminal-orange/30",
            mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="px-4 py-4 space-y-2 bg-black">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "block px-4 py-3 text-lg font-terminal uppercase tracking-wider transition-all border-2",
                  pathname === link.href
                    ? "text-black bg-terminal-orange border-terminal-orange"
                    : "text-terminal-orange border-terminal-orange/30 hover:border-terminal-orange hover:bg-terminal-orange/10"
                )}
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/deploy"
              className="block w-full text-center btn-primary mt-4"
            >
              <span className="text-terminal-orange mr-1">&gt;</span>
              <span>DEPLOY_AGENT</span>
              <span className="animate-blink">_</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Terminal status bar */}
      <div className="border-b border-terminal-orange/30 bg-black px-4 py-1 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 md:gap-4">
          <span className="text-terminal-orange/60 hidden sm:inline">SYS_STATUS:</span>
          <span className="flex items-center gap-1">
            <span className="status-active" />
            <span className="text-terminal-orange">ONLINE</span>
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-4 text-terminal-orange/60">
          <span className="hidden sm:inline">NET: MAINNET</span>
          <span className="hidden sm:inline">|</span>
          <span className="hidden md:inline">BLOCK: #∞</span>
          <span className="hidden md:inline">|</span>
          <span className="text-terminal-yellow">AGENTS: {agentCount ?? "..."}</span>
        </div>
      </div>
    </nav>
  );
}
