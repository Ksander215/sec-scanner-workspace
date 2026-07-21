"use client";

import { useAISEvents } from "@/hooks/useAISEvents";

/**
 * Inner component rendered INSIDE AISSystemEventProvider
 * so that useAISEvents can access the notification context.
 */
export function AISEventBridge() {
  useAISEvents();
  return null;
}
