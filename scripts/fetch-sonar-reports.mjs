#!/usr/bin/env node
/**
 * SonarQube Web API'sinden BUG + CODE_SMELL issue'larını ve yönergede
 * listelenen metrikleri çekip reports/<stage>/ altına JSON olarak yazar.
 *
 * Kullanım:
 *   node scripts/fetch-sonar-reports.mjs --stage stage1
 *
 * Ortam değişkenleri:
 *   SONAR_HOST_URL  (varsayılan: http://localhost:9000)
 *   SONAR_TOKEN     (zorunlu — SonarQube -> My Account -> Security -> Generate Token)
 *   SONAR_PROJECT   (varsayılan: sonar-project.properties içindeki projectKey)
 */

import fs from 'node:fs/promises';
import path from 'node:path';

const METRIC_KEYS = [
  'bugs',
  'code_smells',
  'duplicated_lines_density',
  'ncloc',
  'complexity',
  'cognitive_complexity',
  'reliability_rating',
  'sqale_rating',
  'vulnerabilities',
  'security_hotspots',
  'security_rating',
  'sqale_index',
  'sqale_debt_ratio',
];

const ISSUE_TYPES = ['BUG', 'CODE_SMELL'];
const PAGE_SIZE = 500;

function parseArgs(argv) {
  const args = { stage: 'stage1' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--stage' || a === '-s') args.stage = argv[++i];
    else if (a.startsWith('--stage=')) args.stage = a.slice('--stage='.length);
  }
  return args;
}

async function readProjectKey() {
  try {
    const txt = await fs.readFile('sonar-project.properties', 'utf8');
    const m = txt.match(/^\s*sonar\.projectKey\s*=\s*(.+?)\s*$/m);
    if (m) return m[1];
  } catch {}
  return 'task-manager';
}

function authHeader(token) {
  // SonarQube user token: token as username, empty password
  const b = Buffer.from(`${token}:`).toString('base64');
  return `Basic ${b}`;
}

async function apiGet(host, pathname, token) {
  const url = new URL(pathname, host);
  const res = await fetch(url, { headers: { Authorization: authHeader(token) } });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GET ${url} -> ${res.status} ${res.statusText}\n${body}`);
  }
  return res.json();
}

async function fetchAllIssues(host, token, projectKey) {
  const all = [];
  for (const type of ISSUE_TYPES) {
    let page = 1;
    while (true) {
      const qs = new URLSearchParams({
        componentKeys: projectKey,
        types: type,
        ps: String(PAGE_SIZE),
        p: String(page),
        additionalFields: 'rules,users',
      });
      const data = await apiGet(host, `/api/issues/search?${qs}`, token);
      for (const issue of data.issues || []) all.push(issue);
      const total = data.paging?.total ?? data.total ?? all.length;
      const fetched = page * PAGE_SIZE;
      if (fetched >= total || (data.issues || []).length === 0) break;
      page++;
      // SonarQube /api/issues/search pagination cap
      if (page > 20) break;
    }
  }
  return all;
}

async function fetchMeasures(host, token, projectKey) {
  const qs = new URLSearchParams({
    component: projectKey,
    metricKeys: METRIC_KEYS.join(','),
    additionalFields: 'metrics',
  });
  return apiGet(host, `/api/measures/component?${qs}`, token);
}

async function main() {
  const { stage } = parseArgs(process.argv);
  const host = process.env.SONAR_HOST_URL || 'http://localhost:9000';
  const token = process.env.SONAR_TOKEN;
  const projectKey = process.env.SONAR_PROJECT || await readProjectKey();

  if (!token) {
    console.error('HATA: SONAR_TOKEN ortam değişkeni set edilmeli.');
    console.error('  SonarQube UI -> My Account -> Security -> Generate Token');
    process.exit(2);
  }

  const outDir = path.join('reports', stage);
  await fs.mkdir(outDir, { recursive: true });

  console.log(`[sonar] host=${host} project=${projectKey} stage=${stage}`);

  const issues = await fetchAllIssues(host, token, projectKey);
  const measures = await fetchMeasures(host, token, projectKey);

  // Severity dağılımı — yönerge severity seviyesinin raporlanmasını istiyor
  const severityBreakdown = {};
  for (const i of issues) {
    const s = i.severity || 'UNKNOWN';
    const t = i.type || 'UNKNOWN';
    severityBreakdown[t] = severityBreakdown[t] || {};
    severityBreakdown[t][s] = (severityBreakdown[t][s] || 0) + 1;
  }

  const issuesOut = {
    generatedAt: new Date().toISOString(),
    host,
    projectKey,
    stage,
    total: issues.length,
    severityBreakdown,
    issues,
  };

  const measuresOut = {
    generatedAt: new Date().toISOString(),
    host,
    projectKey,
    stage,
    requestedMetrics: METRIC_KEYS,
    ...measures,
  };

  const issuesPath = path.join(outDir, 'sonarqube-issues.json');
  const measuresPath = path.join(outDir, 'sonarqube-measures.json');
  await fs.writeFile(issuesPath, JSON.stringify(issuesOut, null, 2));
  await fs.writeFile(measuresPath, JSON.stringify(measuresOut, null, 2));

  console.log(`[sonar] wrote ${issuesPath} (${issues.length} issues)`);
  console.log(`[sonar] wrote ${measuresPath}`);
}

main().catch((e) => {
  console.error(e.stack || e.message || e);
  process.exit(1);
});
