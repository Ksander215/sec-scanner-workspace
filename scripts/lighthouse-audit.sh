#!/bin/bash
# Run Lighthouse audits on key pages
# Outputs JSON results and extracts scores

OUTPUT_DIR="/home/z/my-project/sec-scanner-landing/screenshots/lighthouse"
mkdir -p "$OUTPUT_DIR"

PAGES=(
  "https://sec-scanner.pro/:homepage"
  "https://sec-scanner.pro/app/dashboard:dashboard"
  "https://sec-scanner.pro/app/workspace:workspace"
  "https://sec-scanner.pro/app/projects:projects"
  "https://sec-scanner.pro/app/findings:findings"
  "https://sec-scanner.pro/app/demo:demo"
  "https://sec-scanner.pro/app/marketplace:marketplace"
  "https://sec-scanner.pro/app/docs:docs"
  "https://sec-scanner.pro/app/settings:settings"
)

echo "=== Lighthouse Performance Audit ==="
echo ""
printf "%-20s %-12s %-12s %-12s %-12s\n" "PAGE" "PERF" "A11Y" "BEST" "SEO"
printf "%-20s %-12s %-12s %-12s %-12s\n" "----" "----" "----" "----" "---"

for page in "${PAGES[@]}"; do
  IFS=':' read -r url name <<< "$page"
  
  lighthouse "$url" \
    --output=json \
    --output-path="$OUTPUT_DIR/${name}.json" \
    --chrome-flags="--headless --no-sandbox --disable-gpu" \
    --only-categories=performance,accessibility,best-practices,seo \
    --quiet \
    2>/dev/null
  
  if [ -f "$OUTPUT_DIR/${name}.json" ]; then
    perf=$(python3 -c "import json; d=json.load(open('$OUTPUT_DIR/${name}.json')); print(d['categories']['performance']['score'])" 2>/dev/null)
    a11y=$(python3 -c "import json; d=json.load(open('$OUTPUT_DIR/${name}.json')); print(d['categories']['accessibility']['score'])" 2>/dev/null)
    best=$(python3 -c "import json; d=json.load(open('$OUTPUT_DIR/${name}.json')); print(d['categories']['best-practices']['score'])" 2>/dev/null)
    seo=$(python3 -c "import json; d=json.load(open('$OUTPUT_DIR/${name}.json')); print(d['categories']['seo']['score'])" 2>/dev/null)
    
    perf_pct=$(python3 -c "print(int(float('$perf') * 100))" 2>/dev/null || echo "N/A")
    a11y_pct=$(python3 -c "print(int(float('$a11y') * 100))" 2>/dev/null || echo "N/A")
    best_pct=$(python3 -c "print(int(float('$best') * 100))" 2>/dev/null || echo "N/A")
    seo_pct=$(python3 -c "print(int(float('$seo') * 100))" 2>/dev/null || echo "N/A")
    
    printf "%-20s %-12s %-12s %-12s %-12s\n" "$name" "$perf_pct" "$a11y_pct" "$best_pct" "$seo_pct"
  else
    printf "%-20s %-12s %-12s %-12s %-12s\n" "$name" "FAIL" "FAIL" "FAIL" "FAIL"
  fi
done

echo ""
echo "Detailed results saved to: $OUTPUT_DIR/"
