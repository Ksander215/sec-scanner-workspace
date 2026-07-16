"use client";

import { useState, useMemo, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, FileText, ArrowRight } from "lucide-react";
import { searchIndex, type SearchEntry } from "@/lib/search-index";

interface SearchModalProps {
  open: boolean;
  onClose: () => void;
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter results with useMemo instead of useEffect
  const results = useMemo<SearchEntry[]>(() => {
    if (!query.trim()) {
      return searchIndex.slice(0, 8);
    }
    const q = query.toLowerCase();
    return searchIndex
      .filter(
        (entry) =>
          entry.title.toLowerCase().includes(q) ||
          entry.description.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [query]);

  // Reset selection when query changes
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setSelectedIndex(0);
  }, []);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === "Enter" && results[selectedIndex]) {
        window.location.href = results[selectedIndex].href;
        onClose();
      } else if (e.key === "Escape") {
        onClose();
      }
    },
    [results, selectedIndex, onClose]
  );

  // Group results by category
  const categories = Array.from(new Set(results.map((r) => r.category)));

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-[90] flex items-start justify-center pt-[15vh] px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: -20 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl bg-surface border border-border rounded-xl shadow-2xl shadow-black/60 overflow-hidden"
              onKeyDown={handleKeyDown}
            >
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 border-b border-border">
                <Search className="w-4 h-4 text-muted shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search docs, pages..."
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  className="flex-1 py-4 bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
                  autoFocus
                />
                <button
                  onClick={onClose}
                  className="p-1 text-muted hover:text-foreground"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto p-2">
                {results.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted">
                    No results found
                  </div>
                ) : (
                  categories.map((category) => (
                    <div key={category} className="mb-2">
                      <div className="px-3 py-1.5 text-xs font-semibold uppercase tracking-widest text-muted">
                        {category}
                      </div>
                      {results
                        .filter((r) => r.category === category)
                        .map((entry) => {
                          const globalIdx = results.indexOf(entry);
                          return (
                            <a
                              key={entry.href}
                              href={entry.href}
                              onClick={(e) => {
                                e.preventDefault();
                                window.location.href = entry.href;
                                onClose();
                              }}
                              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                                globalIdx === selectedIndex
                                  ? "bg-surface-2 text-foreground"
                                  : "text-muted-2 hover:bg-surface-2 hover:text-foreground"
                              }`}
                            >
                              <FileText className="w-4 h-4 shrink-0 text-muted" />
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                  {entry.title}
                                </div>
                                <div className="text-xs text-muted truncate">
                                  {entry.description}
                                </div>
                              </div>
                              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-muted opacity-0 group-hover:opacity-100" />
                            </a>
                          );
                        })}
                    </div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-2.5 border-t border-border text-xs text-muted">
                <span>↑↓ Navigate</span>
                <span>↵ Open</span>
                <span>Esc Close</span>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
