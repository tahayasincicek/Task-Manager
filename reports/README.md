# Statik Analiz Raporları — Task Manager

Bu klasör, proje üzerinde çalıştırılan **SonarQube** ve **ESLint** statik
analizlerinin JSON çıktılarını ve insan tarafından okunabilir analiz raporlarını
barındırır.

```
reports/
├── README.md              # (bu dosya)
├── stage1/                # Aşama 2 — İlk Statik Analiz
│   ├── eslint.json
│   ├── sonarqube-issues.json
│   ├── sonarqube-measures.json
│   └── ILK_ANALIZ_RAPORU.md
└── stage2/                # Aşama 4 — Son Statik Analiz (sonra oluşturulacak)
    ├── eslint.json
    ├── sonarqube-issues.json
    ├── sonarqube-measures.json
    └── SON_ANALIZ_RAPORU.md
```

Yönerge gereği **Aşama 2 ve Aşama 4 aynı komutlar ve aynı ayarlar ile**
üretilir. Yalnızca `<stage>` değişir (`stage1` → `stage2`).

---

## 1) Analizi Yeniden Üretmek

### Ön koşullar
- Node.js ≥ 20 (proje `v22.x` ile test edildi)
- Docker Desktop (yerel SonarQube için)
- Java 17+ (sonar-scanner için — Eclipse Adoptium JDK 21 test edildi)

### 1.1 ESLint

```bash
# Aşama 2
npm run lint:stage1

# Aşama 4 (son analiz)
npm run lint:stage2
```

Çıktı: `reports/<stage>/eslint.json`

Kural seti: kök dizindeki `.eslintrc.cjs` — `eslint:recommended`,
`plugin:@typescript-eslint/recommended`, `plugin:react/recommended`,
`plugin:react-hooks/recommended`. Kapsam: `src/`, `client/src/`, `tests/`.

### 1.2 SonarQube

#### a) Yerel SonarQube sunucusunu başlat

```bash
npm run sonar:up
# http://localhost:9000 — ilk giriş admin/admin, parolayı değiştir
```

SonarQube UI'da:
1. **Projects → Create Project** → key: `task-manager`
2. **My Account → Security → Generate Token** → token'ı kopyala

#### b) Token'ı ortama ver

```bash
export SONAR_HOST_URL=http://localhost:9000
export SONAR_TOKEN=<generated_token>
```

Windows PowerShell için:
```powershell
$env:SONAR_HOST_URL = "http://localhost:9000"
$env:SONAR_TOKEN = "<generated_token>"
```

#### c) Scan + Web API'den JSON raporları çek

```bash
# Aşama 2
npm run sonar:scan
npm run sonar:fetch:stage1

# Aşama 4
npm run sonar:scan
npm run sonar:fetch:stage2
```

`sonar:scan` konfigürasyonu `sonar-project.properties` dosyasından alır. Scan
biter bitmez sunucuda analiz sonuçları hazırdır; `sonar:fetch:*` komutu
aşağıdaki Web API uç noktalarını çağırıp JSON'a yazar:

- `GET /api/issues/search?componentKeys=<key>&types=BUG|CODE_SMELL` →
  `reports/<stage>/sonarqube-issues.json`
- `GET /api/measures/component?component=<key>&metricKeys=bugs,code_smells,duplicated_lines_density,ncloc,complexity,cognitive_complexity,reliability_rating,sqale_rating,vulnerabilities,security_hotspots,security_rating,sqale_index,sqale_debt_ratio`
  → `reports/<stage>/sonarqube-measures.json`

Issues JSON'u `severity` (BLOCKER/CRITICAL/MAJOR/MINOR/INFO) alanını orijinal
payload'da taşır; ayrıca kolay inceleme için `severityBreakdown` özeti eklenir.

### 1.3 Tek komutla Aşama-2 analizi

```bash
# SonarQube sunucusu ayaktayken, token tanımlıyken
npm run analyze:stage1
```

Bu zinciri çalıştırır: `lint:stage1` → `sonar:scan` → `sonar:fetch:stage1`.

---

## 2) Analiz Kapsamı

`sonar-project.properties` ve `.eslintrc.cjs` konfigürasyonu yalnızca
**projenin kendi kodunu** analiz eder:

- **Dahil:** `src/**`, `client/src/**`, `tests/**`
- **Hariç:** `node_modules/`, `node_modules_old/`, `dist/`, `build/`,
  `coverage/`, `client/dist/`, `data/`, `reports/`, config dosyaları.

Aşama 2 ile Aşama 4 arasındaki karşılaştırılabilirliği bozmamak için bu
kapsamı değiştirmeyin.
