# Static Analysis Reports — Task Manager

This folder contains JSON outputs from **SonarQube** and **ESLint** static
analyses run on the project, as well as human-readable analysis reports.

```
reports/
├── README.md              # (this file)
├── stage1/                # Stage 2 — Initial Static Analysis
│   ├── eslint.json
│   ├── sonarqube-issues.json
│   ├── sonarqube-measures.json
│   └── ILK_ANALIZ_RAPORU.md
└── stage2/                # Stage 4 — Final Static Analysis
    ├── eslint.json
    ├── sonarqube-issues.json
    ├── sonarqube-measures.json
    └── SON_ANALIZ_RAPORU.md
```

As per the guidelines, **Stage 2 and Stage 4 are produced with the same
commands and the same settings**. Only `<stage>` changes (`stage1` → `stage2`).

---

## 1) Reproducing the Analysis

### Prerequisites
- Node.js ≥ 20 (tested with `v22.x`)
- Docker Desktop (for local SonarQube)
- Java 17+ (for sonar-scanner — tested with Eclipse Adoptium JDK 21)

### 1.1 ESLint

```bash
# Stage 2
npm run lint:stage1

# Stage 4 (final analysis)
npm run lint:stage2
```

Output: `reports/<stage>/eslint.json`

Rule set: `.eslintrc.cjs` in root — `eslint:recommended`,
`plugin:@typescript-eslint/recommended`, `plugin:react/recommended`,
`plugin:react-hooks/recommended`. Scope: `src/`, `client/src/`, `tests/`.

### 1.2 SonarQube

#### a) Start the local SonarQube server

```bash
npm run sonar:up
# http://localhost:9000 — initial login admin/admin, change password
```

In the SonarQube UI:
1. **Projects → Create Project** → key: `task-manager`
2. **My Account → Security → Generate Token** → copy the token

#### b) Set the token in environment

```bash
export SONAR_HOST_URL=http://localhost:9000
export SONAR_TOKEN=<generated_token>
```

For Windows PowerShell:
```powershell
$env:SONAR_HOST_URL = "http://localhost:9000"
$env:SONAR_TOKEN = "<generated_token>"
```

#### c) Scan + fetch JSON reports from Web API

```bash
# Stage 2
npm run sonar:scan
npm run sonar:fetch:stage1

# Stage 4
npm run sonar:scan
npm run sonar:fetch:stage2
```

`sonar:scan` reads configuration from `sonar-project.properties`. As soon as
the scan finishes, analysis results are available on the server; the
`sonar:fetch:*` command calls the following Web API endpoints and writes to JSON:

- `GET /api/issues/search?componentKeys=<key>&types=BUG|CODE_SMELL` →
  `reports/<stage>/sonarqube-issues.json`
- `GET /api/measures/component?component=<key>&metricKeys=bugs,code_smells,duplicated_lines_density,ncloc,complexity,cognitive_complexity,reliability_rating,sqale_rating,vulnerabilities,security_hotspots,security_rating,sqale_index,sqale_debt_ratio`
  → `reports/<stage>/sonarqube-measures.json`

The Issues JSON carries the `severity` field (BLOCKER/CRITICAL/MAJOR/MINOR/INFO)
in the original payload; a `severityBreakdown` summary is also added for easy review.

### 1.3 Single-command Stage 2 analysis

```bash
# With SonarQube server running and token defined
npm run analyze:stage1
```

This runs the chain: `lint:stage1` → `sonar:scan` → `sonar:fetch:stage1`.

---

## 2) Analysis Scope

The `sonar-project.properties` and `.eslintrc.cjs` configuration only
analyzes **the project's own code**:

- **Included:** `src/**`, `client/src/**`, `tests/**`
- **Excluded:** `node_modules/`, `node_modules_old/`, `dist/`, `build/`,
  `coverage/`, `client/dist/`, `data/`, `reports/`, config files.

Do not change this scope to avoid breaking comparability between Stage 2
and Stage 4.
