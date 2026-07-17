"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import {
  Search,
  Sun,
  Moon,
  Monitor,
  Bell,
  Globe,
  Menu,
  User,
} from "lucide-react";
import { GitHubIcon } from "@/components/ui/icons";
import { useI18n } from "@/lib/i18n-context";
import { localeNames } from "@/lib/i18n";

interface AppTopBarProps {
  sidebarCollapsed: boolean;
  onSearchOpen: () => void;
  onMobileMenuToggle: () => void;
}

export function AppTopBar({
  sidebarCollapsed,
  onSearchOpen,
  onMobileMenuToggle,
}: AppTopBarProps) {
  const { locale, setLocale } = useI18n();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const themeOptions = [
    { value: "dark" as const, label: "Dark", icon: Moon },
    { value: "light" as const, label: "Light", icon: Sun },
    { value: "system" as const, label: "System", icon: Monitor },
  ];

  return (
    <header
      className={`fixed top-0 right-0 z-30 h-14 flex items-center justify-between px-4 border-b border-border bg-background/80 backdrop-blur-xl transition-all duration-300 ${
        sidebarCollapsed ? "left-16" : "left-60"
      } max-md:left-0`}
    >
      {/* Left: Mobile menu + Search */}
      <div className="flex items-center gap-2">
        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuToggle}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search trigger */}
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
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="relative flex items-center justify-center w-8 h-8 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
          </button>
          {notificationsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotificationsOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-72 bg-surface-2 border border-border rounded-lg shadow-xl z-50 py-2 overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground">Notifications</p>
                </div>
                <div className="px-3 py-3 text-center">
                  <p className="text-xs text-muted-2">No new notifications</p>
                  <p className="text-[10px] text-muted mt-1">Notifications will appear here when scans complete or critical findings are detected.</p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Theme toggle */}
        <div className="relative">
          <button
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors"
            title="Toggle theme"
          >
            {mounted && theme === "light" ? (
              <Sun className="w-4 h-4" />
            ) : mounted && theme === "system" ? (
              <Monitor className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>

          {themeMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setThemeMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-36 bg-surface-2 border border-border rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                {themeOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      setTheme(opt.value);
                      setThemeMenuOpen(false);
                    }}
                    className={`flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors ${
                      theme === opt.value
                        ? "text-accent bg-accent-muted"
                        : "text-muted-2 hover:text-foreground hover:bg-surface-3"
                    }`}
                  >
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Language */}
        <button
          onClick={() => setLocale(locale === "ru" ? "en" : "ru")}
          className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-2 hover:text-foreground hover:bg-surface-2 transition-colors"
          title="Switch language"
        >
          <Globe className="w-3.5 h-3.5" />
          <span className="font-medium hidden sm:inline">{localeNames[locale]}</span>
        </button>

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

        {/* User menu */}
        <div className="relative ml-1">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-lg bg-surface-2 text-foreground hover:bg-surface-3 transition-colors"
          >
            <User className="w-4 h-4" />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-1 w-48 bg-surface-2 border border-border rounded-lg shadow-xl z-50 py-1 overflow-hidden">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium text-foreground">Demo User</p>
                  <p className="text-xs text-muted">demo@sec-scanner.pro</p>
                </div>
                <a
                  href="/app/settings"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-2 hover:text-foreground hover:bg-surface-3 transition-colors"
                >
                  <User className="w-4 h-4" />
                  Profile
                </a>
                <a
                  href="/app/settings"
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-muted-2 hover:text-foreground hover:bg-surface-3 transition-colors"
                >
                  <Sun className="w-4 h-4" />
                  Preferences
                </a>
                <div className="border-t border-border mt-1 pt-1">
                  <button
                    onClick={() => {
                      setUserMenuOpen(false);
                      window.location.href = "/app/demo";
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red hover:bg-red-muted transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
