# İlk Analiz Raporu — Aşama 2

**Proje:** Task Manager
**Öğrenci:** 230229083 — Furkan Öztürk
**Tarih:** 2026-04-22
**Aşama:** Aşama 2 — İlk Statik Analiz

---

## 1. Kullanılan Araçlar, Versiyonlar ve Konfigürasyon

### 1.1 Çalışma Ortamı
| Bileşen | Versiyon |
| --- | --- |
| OS | Windows 11 Pro |
| Node.js | 22.15.0 |
| npm | 10.9.2 |
| Java (sonar-scanner için) | Eclipse Adoptium JDK 21.0.8 |
| Docker | 28.3.2 |

### 1.2 ESLint
| Bileşen | Versiyon |
| --- | --- |
| `eslint` | 8.57.0 |
| `@typescript-eslint/parser` | 7.18.0 |
| `@typescript-eslint/eslint-plugin` | 7.18.0 |
| `eslint-plugin-react` | 7.35.0 |
| `eslint-plugin-react-hooks` | 4.6.2 |

**Kural seti (`.eslintrc.cjs`):**
- `eslint:recommended`
- `plugin:@typescript-eslint/recommended`
- `plugin:react/recommended` (yalnızca `client/src/**/*`)
- `plugin:react-hooks/recommended` (yalnızca `client/src/**/*`)
- `plugin:react/jsx-runtime` (yalnızca `client/src/**/*`)

Ek özelleştirmeler:
- `no-var`: error
- `prefer-const`: warn
- `eqeqeq`: smart warn
- `@typescript-eslint/no-unused-vars`: warn, `_`-önekli olanlar hariç
- `@typescript-eslint/no-explicit-any`: warn
- `react/prop-types`: off (TypeScript zaten tip kontrolü yapıyor)
- Test dosyaları için `no-explicit-any`: off

**Kapsam:** `src/`, `client/src/`, `tests/` (uzantılar `.ts`, `.tsx`).
**Hariç:** `node_modules/`, `node_modules_old/`, `dist/`, `build/`,
`coverage/`, `client/dist/`, `data/`, `reports/`, config dosyaları.

**Komut:**
```bash
npm run lint:stage1
# eslint --ext .ts,.tsx --format json --output-file reports/stage1/eslint.json src client/src tests
```

### 1.3 SonarQube
| Bileşen | Versiyon |
| --- | --- |
| SonarQube Community | 10.6 (docker image `sonarqube:10.6-community`) |
| sonar-scanner (npm) | 3.1.0 |
| Java | 21.0.8 |

**Konfigürasyon (`sonar-project.properties`):**
- `sonar.projectKey = task-manager`
- `sonar.sources = src,client/src`
- `sonar.tests = tests`
- `sonar.exclusions = **/node_modules/**, **/dist/**, **/build/**, **/coverage/**, reports/**, data/**, client/dist/**`
- `sonar.typescript.tsconfigPaths = tsconfig.json,client/tsconfig.json`
- Kural seti: **Sonar way (built-in)** — JS/TS için varsayılan kalite profili.

**Raporlanan issue türleri:** `BUG`, `CODE_SMELL`.
**Raporlanan severity seviyeleri:** `BLOCKER`, `CRITICAL`, `MAJOR`, `MINOR`, `INFO`.

**Raporlanan metrikler (Web API `/api/measures/component`):**
`bugs`, `code_smells`, `duplicated_lines_density`, `ncloc`, `complexity`,
`cognitive_complexity`, `reliability_rating`, `sqale_rating`,
`vulnerabilities`, `security_hotspots`, `security_rating`, `sqale_index`,
`sqale_debt_ratio`.

**Komutlar:**
```bash
npm run sonar:up                  # docker compose -f docker-compose.sonarqube.yml up -d
npm run sonar:scan                # sonar-scanner (sonar-project.properties kullanır)
npm run sonar:fetch:stage1        # Web API'den JSON çekip reports/stage1/ altına yazar
```

---

## 2. Bulgular

### 2.1 ESLint Özeti (`reports/stage1/eslint.json`)

| Metrik | Değer |
| --- | --- |
| Sorunlu dosya sayısı | 7 |
| Toplam error | 15 |
| Toplam warning | 26 |
| Toplam bulgu | 41 |

**Kural dağılımı:**

| Kural | Adet | Seviye |
| --- | ---: | --- |
| `@typescript-eslint/no-explicit-any` | 36 | error/warn |
| `react/no-unescaped-entities` | 2 | error |
| `@typescript-eslint/no-unused-vars` | 2 | warn |
| `react-hooks/exhaustive-deps` | 1 | warn |

**Dosya bazlı bulgular:**

| Dosya | Error | Warning | Tetiklenen kurallar |
| --- | ---: | ---: | --- |
| `client/src/pages/AdminPage.tsx` | 5 | 0 | `no-explicit-any` |
| `client/src/pages/TasksPage.tsx` | 10 | 1 | `no-explicit-any`, `no-unescaped-entities`, `exhaustive-deps` |
| `src/routes/tasks.ts` | 0 | 1 | `no-explicit-any` |
| `src/services/projectService.ts` | 0 | 19 | `no-explicit-any` |
| `src/services/taskService.ts` | 0 | 3 | `no-explicit-any` |
| `tests/unit/projectService.test.ts` | 0 | 1 | `no-unused-vars` |
| `tests/unit/taskService.test.ts` | 0 | 1 | `no-unused-vars` |

### 2.2 SonarQube Özeti (`reports/stage1/sonarqube-*.json`)

Analiz, yerel SonarQube 10.6 Community sunucusunda **Sonar way** yerleşik
kalite profili ile koşturulmuştur. Toplam 83 issue raporlanmıştır.

**Metrikler (`/api/measures/component`):**

| Metrik | Değer | Anlam |
| --- | ---: | --- |
| `ncloc` | 5153 | Analiz edilen yorum-dışı kod satırı |
| `complexity` | 776 | Toplam cyclomatic complexity |
| `cognitive_complexity` | 2 | Toplam bilişsel karmaşıklık |
| `bugs` | 14 | BUG tipi issue sayısı |
| `code_smells` | 69 | CODE_SMELL tipi issue sayısı |
| `vulnerabilities` | 0 | VULNERABILITY tipi issue sayısı |
| `security_hotspots` | 2 | Güvenlik incelemesi gerektiren nokta |
| `duplicated_lines_density` | 1.3 % | Yinelenen satır yoğunluğu |
| `reliability_rating` | 4.0 (**D**) | A=1 … E=5 ölçeği |
| `sqale_rating` | 1.0 (**A**) | Teknik borç ölçeği |
| `security_rating` | 1.0 (**A**) | Güvenlik ölçeği |
| `sqale_index` | 348 dk | Toplam tahmini teknik borç |
| `sqale_debt_ratio` | 0.2 % | Borcun tahmini toplam kodlama süresine oranı |

**Severity dağılımı (`severityBreakdown` alanı):**

| Tip | BLOCKER | CRITICAL | MAJOR | MINOR | INFO | Toplam |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| BUG | 0 | 1 | 0 | 13 | 0 | 14 |
| CODE_SMELL | 0 | 1 | 9 | 59 | 0 | 69 |
| **Genel toplam** | 0 | 2 | 9 | 72 | 0 | **83** |

**En çok tetiklenen kurallar (top 10):**

| Adet | Kural | Kısa anlam |
| ---: | --- | --- |
| 25 | `typescript:S6606` | Prefer nullish coalescing (`??`) over `\|\|` |
| 15 | `typescript:S6853` | Accessible label / form control bağlama |
| 14 | `typescript:S6848` | JSX üzerinde non-interactive element handler'ı |
| 13 | `typescript:S1082` | DOM event handler tipi (`on*`) |
| 6  | `typescript:S6759` | `readonly` prop eksik |
| 4  | `typescript:S3863` | Duplicate import |
| 2  | `typescript:S3358` | İç içe ternary ifade |
| 1  | `typescript:S2871` | `.sort()` için karşılaştırıcı fonksiyon |
| 1  | `typescript:S3696` | Literal atma (`throw`) |
| 1  | `typescript:S3626` | Gereksiz `return/break/continue` |
| 1  | `typescript:S3776` | Cognitive complexity eşik aşımı |

**CRITICAL bulguların yeri:**

| Tip | Dosya:Satır | Kural | Mesaj |
| --- | --- | --- | --- |
| BUG | `src/routes/tasks.ts:130` | `typescript:S2871` | `.sort()` çağrısına karşılaştırıcı fonksiyon verilmemiş |
| CODE_SMELL | `src/routes/tasks.ts:113` | `typescript:S3776` | Fonksiyonun cognitive complexity değeri 23; eşik 15 |

**En çok issue üreten dosyalar:**

| Dosya | Issue |
| --- | ---: |
| `client/src/pages/TasksPage.tsx` | 51 |
| `client/src/pages/AdminPage.tsx` | 8 |
| `src/routes/tasks.ts` | 6 |
| `client/src/pages/RegisterPage.tsx` | 5 |
| `client/src/pages/LoginPage.tsx` | 4 |
| `client/src/pages/ReportsPage.tsx` | 3 |
| `src/server.ts` | 2 |
| Diğerleri (4 dosya × 1 issue) | 4 |

**Öne çıkan gözlemler:**
- `reliability_rating = D` → mevcut 14 BUG içinde **1 CRITICAL**
  (`src/routes/tasks.ts:130`) olması değerlendirmeyi aşağı çekiyor;
  Aşama 3'te en öncelikli kapatılacak bulgu.
- `sqale_debt_ratio %0.2` ve `sqale_rating = A` → teknik borç kontrol altında.
- `duplicated_lines_density %1.3` → kabul edilebilir seviyede; düşürme hedefi
  minör olarak ele alınabilir.
- `security_rating = A`, `vulnerabilities = 0`, yalnızca 2 `security_hotspot`
  var → güvenlik tarafı stabil.

Tüm ham veri ve her issue için `severity`, `rule`, `component`, `line`
alanları `reports/stage1/sonarqube-issues.json` içindedir.

---

## 3. Planlanan Aksiyonlar (Aşama 3 için)

Aşama 3 (Kod Güncelleme) sürecinde aşağıdaki iyileştirmeler hedefleniyor.
Öncelik: yüksek trafik alan modüllerdeki **error** kategorisindeki bulgular.

### 3.1 ESLint kaynaklı aksiyonlar

1. **`@typescript-eslint/no-explicit-any` (36 adet)** — Ağırlıklı olarak
   `src/services/projectService.ts` ve React sayfalarında.
   - **Aksiyon:** `any` yerine projenin `src/types.ts` ve `client/src/types.ts`
     içinde tanımlı tiplerin kullanılması; gerekli yerlerde generic veya
     `unknown` + daraltma (narrowing) kullanmak.
   - **Beklenen kazanım:** Derleyici tip güvenliği, Sonar'ın da üreteceği
     `typescript:S4204` benzeri code-smell'lerin azalması.

2. **`react/no-unescaped-entities` (2 adet, `TasksPage.tsx`)**
   - **Aksiyon:** JSX içindeki `'` karakterlerini `&apos;` veya string ile
     değiştirmek.

3. **`react-hooks/exhaustive-deps` (1 adet, `TasksPage.tsx`)**
   - **Aksiyon:** `useEffect` dependency array'ini doğru doldurmak veya
     `useCallback` ile stabil referans üretmek.

4. **`@typescript-eslint/no-unused-vars` (test dosyalarında 2 adet)**
   - **Aksiyon:** Gereksiz importları/değişkenleri kaldırmak; kasıtlı
     bırakılanları `_` ön eki ile işaretlemek.

### 3.2 SonarQube kaynaklı aksiyonlar

1. **CRITICAL BUG** `src/routes/tasks.ts:130` → `.sort()` çağrısına
   karşılaştırıcı fonksiyon ekle. `reliability_rating` D'den A'ya çıkmanın
   önündeki en büyük engel.
2. **CRITICAL CODE_SMELL** `src/routes/tasks.ts:113` → cognitive complexity
   23; fonksiyonu yardımcı fonksiyonlara böl (hedef ≤ 15).
3. **13 MINOR BUG** → Toplu olarak taranıp ilgili dosyalarda kapatılacak.
4. **9 MAJOR CODE_SMELL** → Mümkün olduğunca tamamı kapatılacak.
5. **Yoğunluk merkezli refaktör:** `client/src/pages/TasksPage.tsx` tek
   başına **51 issue** üretiyor (toplam %61'i). Aşama 3'te bu dosya
   küçük bileşenlere bölünecek.
6. **Yaygın kural bazlı temizlik (mekanik):**
   - `S6606` (25) → `||` yerine `??` kullanımı.
   - `S6853` (15) ve `S6848` (14) → `client/src/pages/` altındaki formlar
     için `<label htmlFor>` ve erişilebilirlik düzeltmeleri.
   - `S1082` (13) → DOM event handler'larına doğru tiplerin verilmesi.
   - `S6759` (6) → React prop arayüzlerine `readonly` eklenmesi.
   - `S3863` (4) → Duplicate import'ların birleştirilmesi.
7. **`security_hotspots = 2`** → Sonar UI üzerinden **review** edilecek
   (Aşama 3'te "Reviewed" statüsüne geçirilecek).
8. **MINOR / INFO** kalıntıları → yalnızca temas edilen dosyalarda
   opportunistic olarak temizlenecek.

### 3.3 Ölçüm Hedefi (Aşama 4 karşılaştırması için)

Aşama 4 sonunda Aşama 2'ye kıyasla beklenen iyileşme hedefleri:

| Metrik | Aşama 2 | Aşama 4 Hedef |
| --- | ---: | ---: |
| ESLint error | 15 | 0 |
| ESLint warning | 26 | ≤ 5 |
| SonarQube BUG | 14 | ≤ 2 (CRITICAL = 0) |
| SonarQube CODE_SMELL | 69 | ≤ 20 |
| CODE_SMELL (BLOCKER + CRITICAL) | 1 | 0 |
| `duplicated_lines_density` | %1.3 | ≤ %1.0 |
| `reliability_rating` | D (4.0) | A (1.0) |
| `sqale_rating` | A (1.0) | A (korunur) |
| `security_rating` | A (1.0) | A (korunur) |
| `sqale_index` | 348 dk | ≤ 120 dk |
| `security_hotspots` | 2 | 0 (reviewed) |

---

## 4. Teslimatlar

| Dosya | Durum |
| --- | --- |
| `reports/stage1/eslint.json` | ✓ Üretildi (41 bulgu) |
| `reports/stage1/sonarqube-issues.json` | ✓ Üretildi (83 issue) |
| `reports/stage1/sonarqube-measures.json` | ✓ Üretildi (13 metrik) |
| `reports/stage1/ILK_ANALIZ_RAPORU.md` | ✓ (bu dosya) |

Aşama 4'te aynı komutlar `:stage2` varyantı ile çalıştırılarak
`reports/stage2/` altındaki muadilleri üretilecek ve iki aşamanın sayısal
karşılaştırması yapılacaktır.
