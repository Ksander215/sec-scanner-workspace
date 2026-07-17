"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Menu,
  X,
  ExternalLink,
  ArrowRight,
} from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";

const navLinks = [
  { href: "#platform", label: "Platform" },
  { href: "#metrics", label: "Metrics" },
  { href: "#demo", label: "Demo" },
  { href: "#community", label: "Community" },
];

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <Shield className="w-7 h-7 text-accent" />
              <div className="absolute inset-0 bg-accent/20 rounded-full blur-md group-hover:bg-accent/30 transition-colors" />
            </div>
            <span className="font-semibold text-lg tracking-tight">
              <span className="text-foreground">sec</span>
              <span className="text-accent">‑scanner</span>
              <span className="text-muted text-sm">.pro</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3 py-2 text-sm text-muted-2 hover:text-foreground transition-colors rounded-lg hover:bg-surface-2"
              >
                {link.label}
              </a>
            ))}
            <Link
              href="/app/dashboard"
              className="px-3 py-2 text-sm text-muted-2 hover:text-foreground transition-colors rounded-lg hover:bg-surface-2"
            >
              Dashboard
            </Link>
            <Link
              href="/app/docs"
              className="px-3 py-2 text-sm text-muted-2 hover:text-foreground transition-colors rounded-lg hover:bg-surface-2"
            >
              Docs
            </Link>
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/Ksander215/sec-scanner-workspace"
              target="_blank"
              rel="noopener noreferrer"
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-sm text-muted-2 hover:text-foreground transition-colors"
            >
              <GitHubIcon className="w-4 h-4" />
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" />
            </a>
            <Link
              href="/app/dashboard"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-accent text-background rounded-lg hover:bg-accent-hover transition-colors"
            >
              Open Platform
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 text-muted-2 hover:text-foreground"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile nav */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-surface/95 backdrop-blur-xl border-b border-border overflow-hidden"
          >
            <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-2.5 text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
                >
                  {link.label}
                </a>
              ))}
              <Link
                href="/app/dashboard"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-2.5 text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/app/docs"
                onClick={() => setMobileOpen(false)}
                className="px-4 py-2.5 text-sm text-muted-2 hover:text-foreground hover:bg-surface-2 rounded-lg transition-colors"
              >
                Docs
              </Link>
              <div className="flex gap-3 mt-3 pt-3 border-t border-border">
                <a
                  href="https://github.com/Ksander215/sec-scanner-workspace"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2.5 text-sm text-muted-2 hover:text-foreground"
                >
                  <GitHubIcon className="w-4 h-4" /> GitHub
                </a>
                <Link
                  href="/app/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-accent text-background rounded-lg"
                >
                  Open Platform <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
