"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ExternalLink,
  Globe,
  Sun,
  Moon,
  MessageCircle,
} from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n-context";
import { localeNames } from "@/lib/i18n";
import { SearchModal } from "./SearchModal";

interface TopBarProps {
  sidebarCollapsed: boolean;
  onSearchOpen: () => void;
}

export function TopBar({ sidebarCollapsed, onSearchOpen }: TopBarProps) {
  const { locale, setLocale } = useI18n();
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onSearchOpen();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onSearchOpen]);

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-14 flex items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur-xl transition-all duration-300 ${
        sidebarCollapsed ? "left-16" : "left-56"
      }`}
    >
      {/* Left: Search trigger */}
      <button
        onClick={onSearchOpen}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-muted hover:text-foreground bg-surface border border-border rounded-lg hover:border-border-light transition-colors min-w-[200px]"
      >
        <Search className="w-3.5 h-3.5" />
        <span className="text-xs flex-1 text-left">Search everything...</span>
        <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-surface-2 border border-border text-muted">
          ⌘K
        </kbd>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Discord */}
        <a
          href="#"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors"
          title="Discord"
        >
          <MessageCircle className="w-4 h-4" />
        </a>

        {/* Telegram */}
        <a
          href="#"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors"
          title="Telegram"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
          </svg>
        </a>

        {/* GitHub */}
        <a
          href="https://github.com/Ksander215/sec-scanner-workspace"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors"
          title="GitHub"
        >
          <GitHubIcon className="w-4 h-4" />
        </a>

        {/* Language */}
        <button
          onClick={() => setLocale(locale === "ru" ? "en" : "ru")}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors"
          title="Switch language"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="font-medium">{localeNames[locale]}</span>
        </button>

        {/* Theme toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors"
          title="Toggle theme"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}
