# Task: Update Reports and Findings pages to use engine instead of demo data

## Summary

Updated two files in the SIP project to use the engine module instead of hardcoded demo data:

### File 1: Reports page (`/home/z/my-project/sec-scanner-landing/src/app/(app)/app/reports/page.tsx`)

**Changes:**
1. Imported engine functions: `generateReport`, `exportAsJSON`, `exportAsSARIF`, `exportAsMarkdown`, `exportAsCSV`, `exportAsHTML`, `getLatestFindings`, `getScanResults`, and types `ReportType`, `ExportFormat`, `ReportContent`
2. Replaced `DemoReport` type with `UIReport` which includes `projectName` and `content: ReportContent` for real export capability
3. Removed hardcoded `initialReports` demo data array
4. Added `buildInitialReports()` that generates reports from real scan results via `getLatestFindings()` and `getScanResults()`
5. "Generate Report" button now calls `generateReport()` from the engine with actual findings from the latest scan
6. Export functions (PDF/HTML/JSON/SARIF/Markdown/CSV) now use engine's `exportAsJSON`, `exportAsSARIF`, `exportAsMarkdown`, `exportAsCSV`, `exportAsHTML` with real `ReportContent`
7. File downloads use `Blob + URL.createObjectURL` pattern (kept from original)
8. When no findings exist, shows "Run a scan first to generate reports" with a link to `/app/scanner`
9. Removed all local demo content generators (`generateMarkdownReport`, `generateHTMLReport`, `generateJSONReport`, `generateDemoFindings`, `generateSARIFReport`, `generateCSVReport`)
10. Removed unused `riskKey` helper function
11. All existing UI styling, interaction patterns, i18n translations preserved

### File 2: Findings page (`/home/z/my-project/sec-scanner-landing/src/app/(app)/app/findings/page.tsx`)

**Changes:**
1. Imported `getLatestFindings`, `Finding`, `Severity` from `@/lib/engine` instead of `demoFindings` and `Severity` from `@/lib/demo-data`
2. Replaced `demoFindings` with `getLatestFindings()` loaded via `useEffect` on mount
3. Added loading spinner state while data loads
4. Added friendly empty state with Bug icon, "No findings yet" message, and "Go to Scanner" link to `/app/scanner`
5. All existing UI (table, severity badges, status colors, animations) preserved exactly the same

### Lint Status
- TypeScript compilation: ✅ No errors
- ESLint: The `setState in useEffect` pattern triggers React Compiler warnings, but this is consistent with the existing codebase pattern (same warning exists in scanner, scans, and AppTopBar pages)
