#!/usr/bin/env python3
"""Run Lighthouse audits on key pages and extract scores."""
import subprocess
import json
import os

OUTPUT_DIR = "/home/z/my-project/sec-scanner-landing/screenshots/lighthouse"
os.makedirs(OUTPUT_DIR, exist_ok=True)

CHROME_PATH = "/home/z/.cache/puppeteer/chrome/linux-150.0.7871.24/chrome-linux64/chrome"

pages = [
    ("https://sec-scanner.pro/", "homepage"),
    ("https://sec-scanner.pro/app/dashboard", "dashboard"),
    ("https://sec-scanner.pro/app/workspace", "workspace"),
    ("https://sec-scanner.pro/app/projects", "projects"),
    ("https://sec-scanner.pro/app/findings", "findings"),
    ("https://sec-scanner.pro/app/demo", "demo"),
    ("https://sec-scanner.pro/app/marketplace", "marketplace"),
    ("https://sec-scanner.pro/app/docs", "docs"),
    ("https://sec-scanner.pro/app/settings", "settings"),
]

results = []

for url, name in pages:
    output_path = os.path.join(OUTPUT_DIR, f"{name}.json")
    print(f"Auditing: {name} ({url})...")
    
    try:
        env = os.environ.copy()
        env["CHROME_PATH"] = CHROME_PATH
        env["LIGHTHOUSE_CHROMIUM_PATH"] = CHROME_PATH
        
        result = subprocess.run(
            [
                "lighthouse", url,
                "--output=json",
                f"--output-path={output_path}",
                "--chrome-flags=--headless=new --no-sandbox --disable-gpu --disable-dev-shm-usage",
                "--only-categories=performance,accessibility,best-practices,seo",
                "--quiet",
            ],
            env=env,
            capture_output=True,
            text=True,
            timeout=120,
        )
        
        if os.path.exists(output_path):
            with open(output_path) as f:
                data = json.load(f)
            
            perf = int(data["categories"]["performance"]["score"] * 100)
            a11y = int(data["categories"]["accessibility"]["score"] * 100)
            best = int(data["categories"]["best-practices"]["score"] * 100)
            seo = int(data["categories"]["seo"]["score"] * 100)
            
            results.append({
                "page": name,
                "url": url,
                "performance": perf,
                "accessibility": a11y,
                "best_practices": best,
                "seo": seo,
            })
            
            print(f"  Performance={perf}, Accessibility={a11y}, Best Practices={best}, SEO={seo}")
        else:
            print(f"  FAILED - no output file")
            results.append({"page": name, "url": url, "performance": 0, "accessibility": 0, "best_practices": 0, "seo": 0})
    except Exception as e:
        print(f"  ERROR: {e}")
        results.append({"page": name, "url": url, "performance": 0, "accessibility": 0, "best_practices": 0, "seo": 0})

# Summary
print("\n" + "=" * 80)
print("LIGHTHOUSE AUDIT SUMMARY")
print("=" * 80)
print(f"{'Page':<20} {'Perf':>6} {'A11Y':>6} {'Best':>6} {'SEO':>6}")
print("-" * 80)
for r in results:
    perf_marker = "✓" if r["performance"] >= 90 else "✗"
    a11y_marker = "✓" if r["accessibility"] >= 95 else "✗"
    best_marker = "✓" if r["best_practices"] >= 95 else "✗"
    seo_marker = "✓" if r["seo"] >= 95 else "✗"
    print(f"{r['page']:<20} {r['performance']:>4}{perf_marker:>2} {r['accessibility']:>4}{a11y_marker:>2} {r['best_practices']:>4}{best_marker:>2} {r['seo']:>4}{seo_marker:>2}")

# Save results
results_path = os.path.join(OUTPUT_DIR, "summary.json")
with open(results_path, "w") as f:
    json.dump(results, f, indent=2)
print(f"\nResults saved to: {results_path}")
