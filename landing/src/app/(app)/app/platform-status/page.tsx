/**
 * /app/platform-status — REDIRECT to /app/system-status (INT-044)
 *
 * Эта страница была BROKEN на production (404 fallback) и заменена на /app/system-status.
 * Сохранена как редирект, чтобы не ломать возможные внешние ссылки.
 *
 * PLAT-001 (Platform Status Center) — broken
 * PLAT-013 (System Status Center) — verified
 */

import { redirect } from "next/navigation";

export default function PlatformStatusRedirectPage() {
  redirect("/app/system-status");
}
