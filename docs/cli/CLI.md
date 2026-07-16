# Security Intelligence Platform CLI Reference

> **Binary**: `si` | **Version**: 1.0.0 | **License**: Proprietary

The `si` CLI provides a command-line interface for the Security Intelligence Platform. It can run analysis locally using the embedded engine or remotely against a running API server. All commands support multiple output formats and can be scripted for automation.

---

## Table of Contents

- [Installation](#installation)
- [Global Options](#global-options)
- [Command Reference](#command-reference)
  - [analyze](#analyze)
  - [reports](#reports)
    - [reports list](#reports-list)
    - [reports show](#reports-show)
    - [reports export](#reports-export)
  - [findings](#findings)
    - [findings list](#findings-list)
    - [findings search](#findings-search)
    - [findings export](#findings-export)
  - [risk](#risk)
    - [risk summary](#risk-summary)
    - [risk top](#risk-top)
    - [risk show](#risk-show)
  - [attack](#attack)
    - [attack list](#attack-list)
    - [attack graph](#attack-graph)
    - [attack simulate](#attack-simulate)
  - [recommend](#recommend)
    - [recommend list](#recommend-list)
    - [recommend plan](#recommend-plan)
    - [recommend export](#recommend-export)
  - [explain](#explain)
    - [explain finding](#explain-finding)
    - [explain risk](#explain-risk)
    - [explain recommendation](#explain-recommendation)
  - [snapshot](#snapshot)
    - [snapshot create](#snapshot-create)
    - [snapshot restore](#snapshot-restore)
  - [migrate](#migrate)
  - [storage-stats](#storage-stats)
  - [config](#config)
    - [config init](#config-init)
    - [config set](#config-set)
    - [config show](#config-show)
  - [server](#server)
    - [server start](#server-start)
    - [server stop](#server-stop)
    - [server status](#server-status)
- [Output Formats](#output-formats)
- [Configuration](#configuration)
- [Remote Mode](#remote-mode)
- [Interactive Mode](#interactive-mode)
- [Server Mode](#server-mode)
- [Pipeline Progress](#pipeline-progress)
- [Environment Variables](#environment-variables)
- [Examples — End-to-End Workflows](#examples--end-to-end-workflows)

---

## Installation

### Prerequisites

- **Node.js** >= 20.0.0
- **npm** (bundled with Node.js) or **bun**

### From Source

```bash
git clone <repository-url> sec-scanner-workspace
cd sec-scanner-workspace

# Install dependencies
npm install

# Build
npm run build

# The CLI binary is now available
node dist/cli/index.js --help

# Or use the dev runner during development
npm run cli -- --help
```

### Global Install (npm link)

```bash
cd sec-scanner-workspace
npm run build
npm link

# Now available globally
si --help
si --version
```

### Verify Installation

```bash
si --version
# 1.0.0

si --help
# Security Intelligence Platform CLI
#
# Usage: si [options] [command]
# ...
```

---

## Global Options

These options apply to all commands and can be placed before or after the subcommand.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | `table` | Output format for command results |
| `--remote` | flag | `false` | Route commands through the REST API instead of the local engine |
| `--version` | flag | — | Print CLI version |
| `--help` | flag | — | Display help for the command |

The `--format` value defaults to the `output.format` setting in your configuration file (`~/.si/config.json`). The `--format` option on a subcommand overrides the global option.

```bash
# Global format override
si --format json reports list

# Subcommand-level format override
si findings list --report rpt_abc123 --format csv
```

---

## Command Reference

### analyze

Run a full security intelligence analysis on a JSON scan results file. This is the primary entry point for the analysis pipeline — it normalizes findings, correlates data, builds a knowledge graph, assesses risk, traces attack paths, analyzes impact, generates recommendations, and produces explanations.

**Usage**

```
si analyze <input> [options]
```

**Arguments**

| Argument | Required | Description |
|----------|----------|-------------|
| `<input>` | Yes | Path to a JSON file containing scan findings |

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--persist` | flag | `false` | No | Save the analysis report to the persistence store |
| `--explain` / `--no-explain` | flag | `true` | No | Generate AI explanations for findings, risks, and recommendations |
| `--output <file>` | string | — | No | Write output to a file instead of stdout |
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |
| `--remote` | flag | `false` | No | Use the remote REST API for analysis |
| `--local` | flag | `true` | No | Use the local embedded engine (default behavior) |

**Examples**

```bash
# Basic analysis — output to stdout
si analyze ./scan-results.json

# Analyze and persist the report for later retrieval
si analyze ./scan-results.json --persist

# Skip explanation generation for faster analysis
si analyze ./scan-results.json --no-explain

# Analyze and write report to a file
si analyze ./scan-results.json --output report.json --format json

# Analyze via remote API server
si analyze ./scan-results.json --remote

# Combine options: persist, output as YAML, write to file
si analyze ./scan-results.json --persist --format yaml --output report.yaml
```

**Output (table format)**

```
Security Intelligence Report
============================
ID:          rpt_7f3a9b2c
Run ID:      run_e1d4f5a6
Timestamp:   2025-01-15T10:30:00.000Z
Findings:    47
Risks:       12
Attack Paths: 3
Recommendations: 8
Duration:    3420ms
```

**Output (markdown format)**

```markdown
# Security Intelligence Report

- **ID**: rpt_7f3a9b2c
- **Run ID**: run_e1d4f5a6
- **Timestamp**: 2025-01-15T10:30:00.000Z
- **Findings**: 47
- **Risks**: 12
- **Attack Paths**: 3
- **Recommendations**: 8
- **Duration**: 3420ms
```

---

### reports

Manage analysis reports. Reports are the top-level container for all analysis output including findings, risk assessments, attack paths, and recommendations.

---

#### reports list

List all persisted analysis reports.

**Usage**

```
si reports list [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |
| `--limit <n>` | number | `100` | No | Maximum number of reports to return |

**Examples**

```bash
# List up to 100 reports (default)
si reports list

# List only the 5 most recent reports
si reports list --limit 5

# List reports as JSON for scripting
si reports list --format json

# List reports as YAML
si reports list --format yaml --limit 20
```

**Output (table format)**

```
ID          Timestamp                 Findings  Risks  Attack Paths
rpt_7f3a    2025-01-15T10:30:00Z      47        12     3
rpt_2e8b    2025-01-14T08:15:00Z      23        6      1
rpt_c5d1    2025-01-13T16:45:00Z      89        21     7
```

---

#### reports show

Display the full details of a single analysis report.

**Usage**

```
si reports show <id> [options]
```

**Arguments**

| Argument | Required | Description |
|----------|----------|-------------|
| `<id>` | Yes | Report ID |

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |

**Examples**

```bash
# Show a report in default table format
si reports show rpt_7f3a9b2c

# Show a report as JSON
si reports show rpt_7f3a9b2c --format json

# Show a report as markdown
si reports show rpt_7f3a9b2c --format markdown
```

**Output (table format)**

```
Security Intelligence Report
============================
ID:          rpt_7f3a9b2c
Run ID:      run_e1d4f5a6
Timestamp:   2025-01-15T10:30:00.000Z
Findings:    47
Risks:       12
Attack Paths: 3
Recommendations: 8
Duration:    3420ms
```

---

#### reports export

Export a report to a file on disk. By default, exports as JSON.

**Usage**

```
si reports export <id> [options]
```

**Arguments**

| Argument | Required | Description |
|----------|----------|-------------|
| `<id>` | Yes | Report ID |

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | `json` | No | Output format for the exported file |
| `--output <file>` | string | `report.json` | No | File path to write the exported report |

**Examples**

```bash
# Export a report as JSON (default)
si reports export rpt_7f3a9b2c

# Export a report as YAML
si reports export rpt_7f3a9b2c --format yaml --output report.yaml

# Export a report as CSV
si reports export rpt_7f3a9b2c --format csv --output report.csv

# Export to a specific path
si reports export rpt_7f3a9b2c --output /tmp/latest-report.json
```

**Output**

```
Report exported to report.json
```

---

### findings

Query and export security findings from analysis reports.

---

#### findings list

List findings for a specific report.

**Usage**

```
si findings list [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--report <id>` | string | — | **Yes** | Report ID to list findings for |
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |
| `--limit <n>` | number | `100` | No | Maximum number of findings to return |

**Examples**

```bash
# List findings for a report
si findings list --report rpt_7f3a9b2c

# List findings as CSV for spreadsheet import
si findings list --report rpt_7f3a9b2c --format csv

# Limit to 10 findings
si findings list --report rpt_7f3a9b2c --limit 10

# List findings as JSONL for log ingestion
si findings list --report rpt_7f3a9b2c --format jsonl
```

**Output (table format)**

```
ID        Source      Name                    Severity   Category        Host
f-7f3a    nessus      Open SSH Port           high       network         10.0.1.5
f-2e8b    qualys      Outdated TLS            critical   encryption      10.0.2.10
f-c5d1    sniffer     ICMP Flood Detected     medium     network         10.0.3.22
```

**Output (CSV format)**

```csv
id,source,name,severity,category,host,port,protocol
"f-7f3a9b2c","nessus","Open SSH Port","high","network","10.0.1.5","22","tcp"
"f-2e8b4d6a","qualys","Outdated TLS","critical","encryption","10.0.2.10","443","tcp"
```

**Output (markdown format)**

```markdown
| ID | Source | Name | Severity | Category | Host |
|---|---|---|---|---|---|
| f-7f3a | nessus | Open SSH Port | high | network | 10.0.1.5 |
| f-2e8b | qualys | Outdated TLS | critical | encryption | 10.0.2.10 |
```

---

#### findings search

Search findings across all reports using a text query.

**Usage**

```
si findings search <query> [options]
```

**Arguments**

| Argument | Required | Description |
|----------|----------|-------------|
| `<query>` | Yes | Search query string |

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |
| `--limit <n>` | number | `100` | No | Maximum number of findings to return |

**Examples**

```bash
# Search for SSH-related findings
si findings search "SSH"

# Search for critical vulnerabilities
si findings search "critical vulnerability" --format json

# Search with limited results
si findings search "SQL injection" --limit 5

# Search and export as markdown
si findings search "outdated TLS" --format markdown
```

---

#### findings export

Export findings from a specific report to a file. By default, exports as CSV.

**Usage**

```
si findings export [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--report <id>` | string | — | **Yes** | Report ID to export findings from |
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | `csv` | No | Output format for the exported file |
| `--output <file>` | string | `findings.csv` | No | File path to write the exported findings |

**Examples**

```bash
# Export findings as CSV (default)
si findings export --report rpt_7f3a9b2c

# Export findings as JSON
si findings export --report rpt_7f3a9b2c --format json --output findings.json

# Export findings as markdown
si findings export --report rpt_7f3a9b2c --format markdown --output findings.md

# Export to a custom path
si findings export --report rpt_7f3a9b2c --output /data/export/findings.csv
```

**Output**

```
Findings exported to findings.csv
```

---

### risk

Risk assessment commands for viewing and analyzing risk data.

---

#### risk summary

Show a high-level risk summary for a specific report.

**Usage**

```
si risk summary [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--report <id>` | string | — | **Yes** | Report ID |
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |

**Examples**

```bash
# Show risk summary for a report
si risk summary --report rpt_7f3a9b2c

# Show risk summary as JSON
si risk summary --report rpt_7f3a9b2c --format json

# Show risk summary as YAML for documentation
si risk summary --report rpt_7f3a9b2c --format yaml
```

---

#### risk top

List the top risks across all reports, sorted by risk score.

**Usage**

```
si risk top [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--limit <n>` | number | `10` | No | Maximum number of risks to return |
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |

**Examples**

```bash
# Show top 10 risks (default)
si risk top

# Show top 25 risks
si risk top --limit 25

# Show top 5 risks as JSON
si risk top --limit 5 --format json

# Show top risks as markdown for a report
si risk top --format markdown
```

**Output (table format)**

```
ID        Finding    Level       Score   Confidence
r-7f3a    f-7f3a     critical    9.8     95%
r-2e8b    f-2e8b     high        8.2     88%
r-c5d1    f-c5d1     high        7.5     92%
```

**Output (markdown format)**

```markdown
| ID | Finding | Level | Score | Confidence |
|---|---|---|---|---|
| r-7f3a | f-7f3a | critical | 9.8 | 95% |
| r-2e8b | f-2e8b | high | 8.2 | 88% |
```

**Output (CSV format)**

```csv
id,findingId,level,score,confidence
"r-7f3a9b2c","f-7f3a9b2c","critical","9.8","0.95"
"r-2e8b4d6a","f-2e8b4d6a","high","8.2","0.88"
```

---

#### risk show

Show all risk assessments for a specific report.

**Usage**

```
si risk show [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--report <id>` | string | — | **Yes** | Report ID |
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |

**Examples**

```bash
# Show all risks for a report
si risk show --report rpt_7f3a9b2c

# Show risks as JSON
si risk show --report rpt_7f3a9b2c --format json

# Show risks as CSV for import into a risk register
si risk show --report rpt_7f3a9b2c --format csv
```

---

### attack

Attack path analysis — view and explore how vulnerabilities can be chained together.

---

#### attack list

List all attack paths identified in a report.

**Usage**

```
si attack list [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--report <id>` | string | — | **Yes** | Report ID |
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |

**Examples**

```bash
# List attack paths for a report
si attack list --report rpt_7f3a9b2c

# List attack paths as JSON
si attack list --report rpt_7f3a9b2c --format json

# List attack paths as markdown
si attack list --report rpt_7f3a9b2c --format markdown
```

**Output (table format)**

```
ID        Name                         Steps   Risk Score   Entry Point
ap-7f3a   Lateral Movement via SSH     4       8.5          10.0.1.5
ap-2e8b   Privilege Escalation Chain   3       7.2          10.0.2.10
```

**Output (markdown format)**

```markdown
| ID | Name | Steps | Risk Score | Entry Point |
|---|---|---|---|---|
| ap-7f3a | Lateral Movement via SSH | 4 | 8.5 | 10.0.1.5 |
| ap-2e8b | Privilege Escalation Chain | 3 | 7.2 | 10.0.2.10 |
```

---

#### attack graph

Show the full attack graph structure for a report, including node relationships and path connectivity. Output defaults to JSON format to preserve graph structure.

**Usage**

```
si attack graph [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--report <id>` | string | — | **Yes** | Report ID |
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | `json` | No | Output format (JSON recommended for graph data) |

**Examples**

```bash
# Show the attack graph as JSON (recommended)
si attack graph --report rpt_7f3a9b2c

# Show the attack graph as YAML
si attack graph --report rpt_7f3a9b2c --format yaml

# Pipe graph data to a visualization tool
si attack graph --report rpt_7f3a9b2c --format json | graph-render
```

---

#### attack simulate

> **Not Implemented** — Planned for a future release.

Simulate an attack path to estimate blast radius and likelihood.

**Usage**

```
si attack simulate [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--report <id>` | string | — | **Yes** | Report ID |
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |

**Current Behavior**

```
Attack path simulation is not yet implemented
```

Exit code: `1`

---

### recommend

Security recommendations and remediation planning.

---

#### recommend list

List all recommendations for a specific report.

**Usage**

```
si recommend list [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--report <id>` | string | — | **Yes** | Report ID |
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |

**Examples**

```bash
# List recommendations for a report
si recommend list --report rpt_7f3a9b2c

# List recommendations as JSON for JIRA integration
si recommend list --report rpt_7f3a9b2c --format json

# List recommendations as markdown for a security report
si recommend list --report rpt_7f3a9b2c --format markdown
```

**Output (table format)**

```
ID        Priority   Title                                   Risk Reduction
rec-7f3   P1         Patch Critical Vulnerability on Host     85%
rec-2e8   P2         Update TLS Configuration                62%
rec-c5d   P3         Implement Network Segmentation          45%
```

**Output (markdown format)**

```markdown
| ID | Priority | Title | Risk Reduction |
|---|---|---|---|
| rec-7f3a | P1 | Patch Critical Vulnerability on Host | 85% |
| rec-2e8b | P2 | Update TLS Configuration | 62% |
| rec-c5d1 | P3 | Implement Network Segmentation | 45% |
```

---

#### recommend plan

Generate a prioritized remediation plan for a report. The plan orders recommendations by impact, dependency, and estimated risk reduction.

**Usage**

```
si recommend plan [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--report <id>` | string | — | **Yes** | Report ID |
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |

**Examples**

```bash
# Generate a remediation plan
si recommend plan --report rpt_7f3a9b2c

# Generate plan as JSON for ticketing integration
si recommend plan --report rpt_7f3a9b2c --format json

# Generate plan as YAML
si recommend plan --report rpt_7f3a9b2c --format yaml
```

---

#### recommend export

Export recommendations to a file. By default, exports as Markdown — ideal for sharing with engineering teams or pasting into wikis.

**Usage**

```
si recommend export [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--report <id>` | string | — | **Yes** | Report ID |
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | `markdown` | No | Output format for the exported file |
| `--output <file>` | string | `recommendations.md` | No | File path to write the exported recommendations |

**Examples**

```bash
# Export recommendations as Markdown (default)
si recommend export --report rpt_7f3a9b2c

# Export recommendations as JSON
si recommend export --report rpt_7f3a9b2c --format json --output recommendations.json

# Export recommendations as CSV for a spreadsheet
si recommend export --report rpt_7f3a9b2c --format csv --output recommendations.csv

# Export to a specific directory
si recommend export --report rpt_7f3a9b2c --output /reports/2025-q1/recommendations.md
```

**Output**

```
Recommendations exported to recommendations.md
```

---

### explain

Explainability commands that provide AI-generated reasoning and context for findings, risk assessments, and recommendations. Each command retrieves a human-readable explanation of *why* the platform made a particular assessment.

---

#### explain finding

Explain why a specific finding was flagged and its security implications.

**Usage**

```
si explain finding <id> [options]
```

**Arguments**

| Argument | Required | Description |
|----------|----------|-------------|
| `<id>` | Yes | Finding ID to explain |

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |

**Examples**

```bash
# Explain a specific finding
si explain finding f-7f3a9b2c

# Explain a finding as JSON
si explain finding f-7f3a9b2c --format json

# Explain a finding as markdown
si explain finding f-7f3a9b2c --format markdown
```

---

#### explain risk

Explain how a risk assessment was calculated, including contributing factors and confidence level.

**Usage**

```
si explain risk <id> [options]
```

**Arguments**

| Argument | Required | Description |
|----------|----------|-------------|
| `<id>` | Yes | Risk assessment ID to explain |

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |

**Examples**

```bash
# Explain a risk assessment
si explain risk r-7f3a9b2c

# Explain a risk as JSON
si explain risk r-7f3a9b2c --format json

# Explain a risk as YAML
si explain risk r-7f3a9b2c --format yaml
```

---

#### explain recommendation

Explain why a specific recommendation was suggested and how it reduces risk.

**Usage**

```
si explain recommendation <id> [options]
```

**Arguments**

| Argument | Required | Description |
|----------|----------|-------------|
| `<id>` | Yes | Recommendation ID to explain |

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |

**Examples**

```bash
# Explain a recommendation
si explain recommendation rec-7f3a9b2c

# Explain a recommendation as JSON
si explain recommendation rec-7f3a9b2c --format json

# Explain a recommendation as markdown
si explain recommendation rec-7f3a9b2c --format markdown
```

---

### snapshot

Snapshot management for creating and restoring point-in-time copies of analysis reports.

---

#### snapshot create

Create a named snapshot of a report. Snapshots capture the complete report state and can be restored later.

**Usage**

```
si snapshot create [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--report <id>` | string | — | **Yes** | Report ID to snapshot |
| `--description <desc>` | string | — | No | Human-readable description for the snapshot |

**Examples**

```bash
# Create a snapshot of a report
si snapshot create --report rpt_7f3a9b2c

# Create a snapshot with a description
si snapshot create --report rpt_7f3a9b2c --description "Pre-remediation baseline"

# Create a snapshot via remote API
si snapshot create --report rpt_7f3a9b2c --description "Q1 audit snapshot" --remote
```

**Output**

```
Snapshot created: snap_a1b2c3d4
```

---

#### snapshot restore

Restore a report from a snapshot. This replaces the current report state with the snapshot's state.

**Usage**

```
si snapshot restore <id> [options]
```

**Arguments**

| Argument | Required | Description |
|----------|----------|-------------|
| `<id>` | Yes | Snapshot ID to restore from |

**Examples**

```bash
# Restore from a snapshot
si snapshot restore snap_a1b2c3d4

# Restore from a snapshot via remote API
si snapshot restore snap_a1b2c3d4 --remote
```

**Output**

```
Restored report: rpt_7f3a9b2c
```

---

### migrate

> **Not Implemented** — The current JSON-based persistence provider does not require migrations.

**Usage**

```
si migrate
```

**Current Behavior**

```
Migration is not yet implemented for JSON provider
```

This command is reserved for future use when database-backed persistence (e.g., PostgreSQL, SQLite) is introduced.

---

### storage-stats

Show storage statistics for the local persistence store, including report counts, disk usage, and snapshot information.

**Usage**

```
si storage-stats [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--format <format>` | `table\|json\|yaml\|csv\|jsonl\|markdown` | config default | No | Output format |

**Examples**

```bash
# Show storage statistics
si storage-stats

# Show storage statistics as JSON
si storage-stats --format json

# Show storage statistics as YAML
si storage-stats --format yaml
```

---

### config

Configuration management for the CLI. The configuration file is stored at `~/.si/config.json`.

---

#### config init

Initialize the configuration file with default values. Creates `~/.si/config.json` if it does not exist.

**Usage**

```
si config init
```

**Examples**

```bash
# Initialize configuration
si config init
```

**Output**

```
Configuration initialized at ~/.si/config.json
```

---

#### config set

Set a configuration value using dot-notation keys. The value is always stored as a string.

**Usage**

```
si config set <key> <value>
```

**Arguments**

| Argument | Required | Description |
|----------|----------|-------------|
| `<key>` | Yes | Configuration key in dot notation (e.g., `api.url`, `output.format`) |
| `<value>` | Yes | Value to set |

**Examples**

```bash
# Set the API URL
si config set api.url http://si-platform.internal:8080

# Set the default output format
si config set output.format json

# Set the API timeout
si config set api.timeout 60000

# Set the data directory
si config set persistence.dataDir /data/si-platform

# Disable color output
si config set output.color false

# Set an auth token
si config set auth.token eyJhbGciOiJIUzI1NiIs...
```

**Output**

```
Set api.url = http://si-platform.internal:8080
```

---

#### config show

Display the current configuration as formatted JSON.

**Usage**

```
si config show
```

**Examples**

```bash
# Show current configuration
si config show

# Show config and pipe to jq for filtering
si config show | jq .api
```

**Output**

```json
{
  "api": {
    "url": "http://localhost:8080",
    "timeout": 30000
  },
  "auth": {
    "token": undefined
  },
  "output": {
    "format": "table",
    "color": true
  },
  "persistence": {
    "dataDir": "./data/si-platform"
  }
}
```

---

### server

API server management — start, stop, and check the status of the Security Intelligence REST API server.

---

#### server start

Start the Security Intelligence API server. The server provides a RESTful API that CLI commands can target with `--remote`.

**Usage**

```
si server start [options]
```

**Options**

| Option | Type | Default | Required | Description |
|--------|------|---------|----------|-------------|
| `--port <port>` | number | `8080` | No | Port to listen on |
| `--host <host>` | string | `0.0.0.0` | No | Host address to bind to |

**Examples**

```bash
# Start the server on default port 8080
si server start

# Start the server on a custom port
si server start --port 3000

# Start the server bound to localhost only
si server start --host 127.0.0.1 --port 8080

# Start the server on a specific host and port
si server start --host 0.0.0.0 --port 9090
```

**Output**

```
Starting Security Intelligence API Server on 0.0.0.0:8080...
```

The server runs in the foreground. Press `Ctrl+C` to stop it.

---

#### server stop

> **Not Implemented** — Use `Ctrl+C` to stop the foreground server process, or send a signal to the process.

**Usage**

```
si server stop
```

**Current Behavior**

```
Server stop not implemented (use Ctrl+C)
```

---

#### server status

Check whether the API server is running by querying its health endpoint.

**Usage**

```
si server status
```

**Examples**

```bash
# Check if the server is running
si server status
```

**Output (server running)**

```json
{
  "status": "ok",
  "uptime": 3600,
  "version": "1.0.0"
}
```

**Output (server not running)**

```
Server is not running
```

---

## Output Formats

All commands that produce data output support the following formats via the `--format` option (or the global `--format` flag):

| Format | Flag | Best For |
|--------|------|----------|
| **Table** | `--format table` | Human-readable terminal output (default) |
| **JSON** | `--format json` | Programmatic consumption, API compatibility |
| **YAML** | `--format yaml` | Configuration files, Kubernetes manifests |
| **CSV** | `--format csv` | Spreadsheet import, data pipeline ingestion |
| **JSONL** | `--format jsonl` | Log aggregation, streaming pipelines |
| **Markdown** | `--format markdown` | Documentation, wikis, PR descriptions |

### Format Examples — Findings

**Table**

```
ID        Source      Name                    Severity   Category        Host
f-7f3a    nessus      Open SSH Port           high       network         10.0.1.5
f-2e8b    qualys      Outdated TLS            critical   encryption      10.0.2.10
```

**JSON**

```json
[
  {
    "id": "f-7f3a9b2c",
    "source": "nessus",
    "name": "Open SSH Port",
    "severity": "high",
    "category": "network",
    "host": "10.0.1.5"
  }
]
```

**YAML**

```yaml
- id: "f-7f3a9b2c"
  source: "nessus"
  name: "Open SSH Port"
  severity: "high"
  category: "network"
  host: "10.0.1.5"
```

**CSV**

```csv
id,source,name,severity,category,host,port,protocol
"f-7f3a9b2c","nessus","Open SSH Port","high","network","10.0.1.5","22","tcp"
```

**JSONL**

```jsonl
{"id":"f-7f3a9b2c","source":"nessus","name":"Open SSH Port","severity":"high","category":"network","host":"10.0.1.5"}
{"id":"f-2e8b4d6a","source":"qualys","name":"Outdated TLS","severity":"critical","category":"encryption","host":"10.0.2.10"}
```

**Markdown**

```markdown
| ID | Source | Name | Severity | Category | Host |
|---|---|---|---|---|---|
| f-7f3a | nessus | Open SSH Port | high | network | 10.0.1.5 |
| f-2e8b | qualys | Outdated TLS | critical | encryption | 10.0.2.10 |
```

### Format Examples — Risk Assessments

**Table**

```
ID        Finding    Level       Score   Confidence
r-7f3a    f-7f3a     critical    9.8     95%
r-2e8b    f-2e8b     high        8.2     88%
```

**CSV**

```csv
id,findingId,level,score,confidence
"r-7f3a9b2c","f-7f3a9b2c","critical","9.8","0.95"
```

### Format Examples — Recommendations

**Table**

```
ID        Priority   Title                                   Risk Reduction
rec-7f3   P1         Patch Critical Vulnerability on Host     85%
rec-2e8   P2         Update TLS Configuration                62%
```

### Format Examples — Attack Paths

**Table**

```
ID        Name                         Steps   Risk Score   Entry Point
ap-7f3a   Lateral Movement via SSH     4       8.5          10.0.1.5
ap-2e8b   Privilege Escalation Chain   3       7.2          10.0.2.10
```

---

## Configuration

The CLI reads configuration from `~/.si/config.json`. If the file does not exist, built-in defaults are used.

### Configuration File Location

```
~/.si/config.json
```

### Default Configuration

```json
{
  "api": {
    "url": "http://localhost:8080",
    "timeout": 30000
  },
  "auth": {
    "token": null
  },
  "output": {
    "format": "table",
    "color": true
  },
  "persistence": {
    "dataDir": "./data/si-platform"
  }
}
```

### Configuration Reference

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `api.url` | string | `http://localhost:8080` | Base URL of the Security Intelligence API server |
| `api.timeout` | number | `30000` | HTTP request timeout in milliseconds |
| `auth.token` | string \| null | `null` | Bearer token for API authentication |
| `output.format` | `table\|json\|yaml\|csv\|jsonl\|markdown` | `table` | Default output format for all commands |
| `output.color` | boolean | `true` | Enable colored output in terminal |
| `persistence.dataDir` | string | `./data/si-platform` | Directory for local JSON file storage |

### Managing Configuration

```bash
# Initialize config with defaults
si config init

# Set individual values (dot notation)
si config set api.url http://si-platform.prod:8080
si config set api.timeout 60000
si config set output.format json
si config set output.color false
si config set persistence.dataDir /var/lib/si-platform
si config set auth.token eyJhbGciOiJIUzI1NiIs...

# View current configuration
si config show
```

### Configuration Precedence

1. **Command-line options** (e.g., `--format json`, `--remote`) — highest priority
2. **Environment variables** (e.g., `SI_API_URL`)
3. **Configuration file** (`~/.si/config.json`)
4. **Built-in defaults** — lowest priority

---

## Remote Mode

By default, the CLI runs analysis and queries using the **local embedded engine** and **local JSON file persistence**. When you pass `--remote`, the CLI routes all operations through the REST API, enabling you to:

- Connect to a shared, centrally-managed Security Intelligence Platform
- Access shared persistence (databases instead of local files)
- Run analysis on more powerful hardware
- Integrate with team workflows

### Setting Up Remote Mode

1. **Start the API server** (or ensure one is running):

   ```bash
   si server start --port 8080
   ```

2. **Configure the API URL**:

   ```bash
   si config set api.url http://localhost:8080
   ```

3. **Set an auth token** (if the server requires authentication):

   ```bash
   si config set auth.token my-secret-token
   ```

4. **Run commands with `--remote`**:

   ```bash
   si analyze ./scan.json --remote
   si reports list --remote
   si findings list --report rpt_abc123 --remote
   ```

### API Authentication

When `auth.token` is set in the configuration, the CLI automatically includes an `Authorization: Bearer <token>` header in all API requests. This token is sent over HTTPS — ensure your API server uses TLS in production.

### API Endpoints Used by Remote Mode

| CLI Command | API Method | API Path |
|-------------|-----------|----------|
| `analyze --remote` | `POST` | `/api/v1/analyze/sync` |
| `reports list --remote` | `GET` | `/api/v1/reports?limit=N` |
| `reports show <id> --remote` | `GET` | `/api/v1/reports/:id` |
| `reports export <id> --remote` | `GET` | `/api/v1/reports/:id` |
| `findings list --remote` | `GET` | `/api/v1/findings?reportId=:id` |
| `findings search --remote` | `GET` | `/api/v1/findings/search?q=...` |
| `risk summary --remote` | `GET` | `/api/v1/risks/summary?reportId=:id` |
| `risk top --remote` | `GET` | `/api/v1/risks/top?limit=N` |
| `risk show --remote` | `GET` | `/api/v1/risks?reportId=:id` |
| `attack list --remote` | `GET` | `/api/v1/attack-paths?reportId=:id` |
| `attack graph --remote` | `GET` | `/api/v1/attack-paths/graph?reportId=:id` |
| `recommend list --remote` | `GET` | `/api/v1/recommendations?reportId=:id` |
| `recommend plan --remote` | `POST` | `/api/v1/recommendations/plan` |
| `explain finding/risk/rec --remote` | `GET` | `/api/v1/explanations/:id` |
| `snapshot create --remote` | `POST` | `/api/v1/snapshots` |
| `snapshot restore --remote` | `POST` | `/api/v1/snapshots/:id/restore` |
| `storage-stats --remote` | `GET` | `/api/v1/storage/statistics` |
| `server status` | `GET` | `/health` |

---

## Interactive Mode

The CLI does not currently have an interactive REPL mode. All operations are single-command invocations. For interactive exploration, consider:

- **Piping commands** together for multi-step workflows
- **Using the API server** with a REST client (e.g., curl, Postman, Swagger UI at `http://localhost:8080/documentation`)
- **Shell scripting** with `si` commands for batch operations

---

## Server Mode

The `si server start` command launches a Fastify-based HTTP API server that exposes the full Security Intelligence engine over REST.

### Starting the Server

```bash
# Start on default host:port (0.0.0.0:8080)
si server start

# Start on a specific port
si server start --port 3000

# Bind to localhost only
si server start --host 127.0.0.1 --port 8080
```

### Server Features

- **REST API** — Full CRUD for reports, findings, risks, attack paths, recommendations, and explanations
- **Swagger UI** — Interactive API documentation at `http://<host>:<port>/documentation`
- **CORS** — Enabled by default for cross-origin requests
- **Compression** — Response compression via `@fastify/compress`
- **Rate Limiting** — Built-in rate limiting via `@fastify/rate-limit`
- **WebSocket** — Real-time updates via `@fastify/websocket`
- **Health Endpoint** — `GET /health` for monitoring and load balancer checks

### Checking Server Status

```bash
si server status
```

### Stopping the Server

The server runs in the foreground. To stop it:

- Press `Ctrl+C` in the terminal running the server
- Send `SIGTERM` or `SIGINT` to the process:

  ```bash
  kill $(lsof -ti:8080)
  ```

### Running as a Systemd Service

A systemd unit file is provided at `deploy/systemd/si-platform.service`:

```bash
sudo cp deploy/systemd/si-platform.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable si-platform
sudo systemctl start si-platform
sudo systemctl status si-platform
```

### Running with Docker

```bash
# Build the image
docker build -t si-platform .

# Run the container
docker run -p 8080:8080 -v ./data:/app/data si-platform
```

---

## Pipeline Progress

When running `si analyze`, the CLI displays a real-time progress bar showing each stage of the analysis pipeline:

```
✓ Normalization         ████████████████████ 100%
✓ Correlation           ████████████████████ 100%
✓ Knowledge Graph       ████████████████████ 100%
⟳ Risk Assessment       ██████████████░░░░░░  70%
· Attack Path           ░░░░░░░░░░░░░░░░░░░░   0%
· Impact Analysis       ░░░░░░░░░░░░░░░░░░░░   0%
· Recommendation        ░░░░░░░░░░░░░░░░░░░░   0%
· Explainability        ░░░░░░░░░░░░░░░░░░░░   0%
· Report Generation     ░░░░░░░░░░░░░░░░░░░░   0%
```

### Pipeline Stages

| Stage | Label | Description |
|-------|-------|-------------|
| `normalize` | Normalization | Normalize findings from multiple scanners into a unified schema |
| `correlate` | Correlation | Correlate findings across scanners to deduplicate and link |
| `knowledge-graph` | Knowledge Graph | Build a knowledge graph of asset relationships |
| `risk` | Risk Assessment | Calculate risk scores and levels for each finding |
| `attack-path` | Attack Path | Trace multi-step attack paths through the graph |
| `impact` | Impact Analysis | Assess business impact of identified risks |
| `recommendation` | Recommendation | Generate prioritized remediation recommendations |
| `explain` | Explainability | Produce AI explanations for findings, risks, and recommendations |
| `report` | Report Generation | Compile all results into a final report |

### Progress Indicators

| Icon | Status |
|------|--------|
| `✓` | Completed |
| `⟳` | Running |
| `✗` | Failed |
| `·` | Pending |

The progress display is written to stderr so it does not interfere with stdout piping. When the analysis completes, the progress display is cleared and the final report is output to stdout.

---

## Environment Variables

The CLI supports the following environment variables as overrides. These take precedence over the configuration file but are overridden by command-line options.

| Variable | Config Key | Description |
|----------|-----------|-------------|
| `SI_API_URL` | `api.url` | Base URL of the API server |
| `SI_API_TIMEOUT` | `api.timeout` | HTTP request timeout in milliseconds |
| `SI_AUTH_TOKEN` | `auth.token` | Bearer token for API authentication |
| `SI_OUTPUT_FORMAT` | `output.format` | Default output format |
| `SI_OUTPUT_COLOR` | `output.color` | Enable color output (`true`/`false`) |
| `SI_DATA_DIR` | `persistence.dataDir` | Local data storage directory |
| `SI_CONFIG_PATH` | — | Custom path to the configuration file (default: `~/.si/config.json`) |
| `NO_COLOR` | `output.color` | Disable color output (standard convention, overrides `SI_OUTPUT_COLOR`) |

### Using Environment Variables

```bash
# Override the API URL for a single command
SI_API_URL=http://si-platform.prod:8080 si reports list --remote

# Set a persistent auth token via environment
export SI_AUTH_TOKEN=eyJhbGciOiJIUzI1NiIs...
si findings list --report rpt_abc123 --remote

# Use a custom data directory
SI_DATA_DIR=/mnt/data/si si analyze ./scan.json --persist

# Disable color for piping
NO_COLOR=1 si findings list --report rpt_abc123 --format csv > findings.csv

# Use a custom config file
SI_CONFIG_PATH=/etc/si/config.json si reports list
```

---

## Examples — End-to-End Workflows

### Workflow 1: Local Analysis and Review

Analyze a scan file, review findings and risks, then export results.

```bash
# 1. Run the analysis and persist the report
si analyze ./nessus-scan.json --persist

# 2. List reports to get the report ID
si reports list --limit 5

# 3. View the full report
si reports show rpt_7f3a9b2c

# 4. Review findings
si findings list --report rpt_7f3a9b2c --format table

# 5. Check risk summary
si risk summary --report rpt_7f3a9b2c

# 6. See top risks
si risk top --limit 5

# 7. View attack paths
si attack list --report rpt_7f3a9b2c

# 8. Get recommendations
si recommend list --report rpt_7f3a9b2c

# 9. Generate a remediation plan
si recommend plan --report rpt_7f3a9b2c --format markdown

# 10. Export findings as CSV
si findings export --report rpt_7f3a9b2c --format csv --output findings.csv

# 11. Export recommendations as markdown
si recommend export --report rpt_7f3a9b2c --output remediation-plan.md
```

### Workflow 2: Remote API Analysis

Analyze via a remote API server and collaborate with a team.

```bash
# 1. Configure the remote API
si config set api.url http://si-platform.prod:8080
si config set auth.token $SI_API_TOKEN

# 2. Check the server is reachable
si server status

# 3. Run analysis on the remote server
si analyze ./qualys-scan.json --remote --persist

# 4. List reports from the remote server
si reports list --remote --limit 10

# 5. Search for specific findings
si findings search "SQL injection" --remote --format json

# 6. View risk assessment
si risk show --report rpt_abc123 --remote

# 7. Explain a specific finding
si explain finding f-abc123 --remote --format json

# 8. Explain a risk assessment
si explain risk r-abc123 --remote
```

### Workflow 3: Automated CI/CD Pipeline

Integrate security analysis into a CI/CD pipeline.

```bash
#!/bin/bash
set -euo pipefail

# Configuration
SCAN_FILE="scan-results.json"
REPORT_FILE="si-report.json"
FINDINGS_FILE="si-findings.csv"
RECS_FILE="si-recommendations.md"
THRESHOLD=7.0

# 1. Run analysis with JSON output
si analyze "$SCAN_FILE" --persist --format json --output "$REPORT_FILE" --no-explain

# 2. Extract the report ID
REPORT_ID=$(jq -r '.id' "$REPORT_FILE")
echo "Report ID: $REPORT_ID"

# 3. Export findings as CSV
si findings export --report "$REPORT_ID" --format csv --output "$FINDINGS_FILE"

# 4. Check for critical risks
MAX_SCORE=$(si risk show --report "$REPORT_ID" --format json | jq '[.[].score] | max')
echo "Maximum risk score: $MAX_SCORE"

# 5. Fail the pipeline if risk exceeds threshold
if (( $(echo "$MAX_SCORE > $THRESHOLD" | bc -l) )); then
  echo "FAIL: Maximum risk score $MAX_SCORE exceeds threshold $THRESHOLD"
  si recommend export --report "$REPORT_ID" --output "$RECS_FILE"
  echo "Recommendations written to $RECS_FILE"
  exit 1
fi

echo "PASS: Risk score within acceptable limits"
```

### Workflow 4: Snapshot and Rollback

Create snapshots before making changes and restore if needed.

```bash
# 1. Analyze and persist the initial scan
si analyze ./baseline-scan.json --persist
BASELINE_REPORT=$(si reports list --format json --limit 1 | jq -r '.[0].id')

# 2. Create a snapshot before remediation
si snapshot create --report "$BASELINE_REPORT" --description "Pre-remediation baseline"

# 3. After remediation, run a new scan and analyze
si analyze ./post-remediation-scan.json --persist

# 4. Compare results
si risk summary --report "$BASELINE_REPORT" --format json > before.json
si risk summary --report "$(si reports list --format json --limit 1 | jq -r '.[0].id')" --format json > after.json

# 5. If needed, restore the baseline snapshot
# si snapshot restore snap_a1b2c3d4
```

### Workflow 5: Export All Report Data

Export a complete report package for archival or compliance.

```bash
REPORT_ID="rpt_7f3a9b2c"
OUTDIR="./exports/$REPORT_ID"
mkdir -p "$OUTDIR"

# Export the full report
si reports export "$REPORT_ID" --format json --output "$OUTDIR/report.json"

# Export findings as CSV
si findings export --report "$REPORT_ID" --format csv --output "$OUTDIR/findings.csv"

# Export risks as JSON
si risk show --report "$REPORT_ID" --format json > "$OUTDIR/risks.json"

# Export attack graph
si attack graph --report "$REPORT_ID" --format json > "$OUTDIR/attack-graph.json"

# Export recommendations as markdown
si recommend export --report "$REPORT_ID" --format markdown --output "$OUTDIR/recommendations.md"

# Export remediation plan as YAML
si recommend plan --report "$REPORT_ID" --format yaml > "$OUTDIR/remediation-plan.yaml"

echo "Full report package exported to $OUTDIR/"
```

### Workflow 6: API Server Deployment

Set up and manage the API server for team use.

```bash
# 1. Initialize configuration
si config init

# 2. Configure the data directory
si config set persistence.dataDir /var/lib/si-platform

# 3. Start the server
si server start --host 0.0.0.0 --port 8080 &

# 4. Verify the server is running
si server status

# 5. From another terminal, run analysis remotely
si config set api.url http://localhost:8080
si analyze ./scan.json --remote --persist

# 6. Query results remotely
si reports list --remote
si findings list --report rpt_abc123 --remote --format table
```

---

## Quick Reference

```
si analyze <input>                          Run security analysis
si reports list                             List reports
si reports show <id>                        Show report details
si reports export <id>                      Export report to file
si findings list --report <id>              List findings for a report
si findings search <query>                  Search findings
si findings export --report <id>            Export findings to file
si risk summary --report <id>               Show risk summary
si risk top [--limit N]                     Show top risks
si risk show --report <id>                  Show risks for a report
si attack list --report <id>               List attack paths
si attack graph --report <id>              Show attack graph
si recommend list --report <id>            List recommendations
si recommend plan --report <id>            Generate remediation plan
si recommend export --report <id>          Export recommendations
si explain finding <id>                     Explain a finding
si explain risk <id>                        Explain a risk assessment
si explain recommendation <id>              Explain a recommendation
si snapshot create --report <id>            Create a snapshot
si snapshot restore <id>                    Restore from a snapshot
si storage-stats                            Show storage statistics
si config init                              Initialize configuration
si config set <key> <value>                 Set a configuration value
si config show                              Show current configuration
si server start [--port N] [--host H]       Start API server
si server status                            Check server status
```

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error — command failed, resource not found, or unimplemented feature |

---

## Not Implemented Features

The following commands are recognized but not yet functional:

| Command | Status | Workaround |
|---------|--------|------------|
| `attack simulate` | Not implemented | Use `attack list` and `attack graph` to review attack paths manually |
| `migrate` | Not implemented | Not needed for JSON provider; reserved for future database support |
| `server stop` | Not implemented | Use `Ctrl+C` or `kill` to stop the server process |

---

## See Also

- [Architecture Documentation](../architecture/Architecture.md)
- [Security Intelligence Engine RFC](../01_architecture/RFC-001_SECURITY_INTELLIGENCE_ENGINE.md)
- [Knowledge Graph Architecture](../01_architecture/KG-001_KNOWLEDGE_GRAPH_ARCHITECTURE.md)
- [REST API Documentation](../../src/api/README.md)
- [SDK Documentation](../../sdk/)
