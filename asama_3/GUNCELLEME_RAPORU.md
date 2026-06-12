# Güncelleme Raporu — Aşama 3

**Proje:** Task Manager
**Öğrenci:** 230229083 — Furkan Öztürk
**Tarih:** 2026-05-07
**Aşama:** Aşama 3 — Kod Güncelleme
**Son teslim:** 17.05.2026 23:55

---

## 1. Özet

Aşama 2'de tespit edilen toplam **124 bulgu** (41 ESLint + 83 SonarQube) Aşama 3
boyunca ele alındı. Sayısal sonuç:

| Metrik | Aşama 2 | Aşama 3 | Δ |
| --- | ---: | ---: | ---: |
| ESLint error | 15 | **0** | **−15** |
| ESLint warning | 26 | **0** | **−26** |
| ESLint toplam | 41 | **0** | **−41** |
| SonarQube BUG | 14 | **0** | **−14** |
| SonarQube CODE_SMELL | 69 | **0** | **−69** |
| SonarQube vulnerabilities | 0 | 0 | 0 |
| SonarQube security_hotspots | 2 | **0** | **−2** |
| SonarQube açık issue toplam | 83 | **0** | **−83** |
| `reliability_rating` | **D (4.0)** | **A (1.0)** | ⬆️ |
| `sqale_rating` | A (1.0) | A (1.0) | korundu |
| `security_rating` | A (1.0) | A (1.0) | korundu |
| `sqale_index` | 348 dk | **0 dk** | **−348** |
| `sqale_debt_ratio` | %0.2 | **%0.0** | %0.2 |
| `duplicated_lines_density` | %1.3 | %1.0 | %0.3 |
| `ncloc` | 5153 | 5308 | +155 |

Toplam **124 bulgudan 124'ü kapatıldı**. Yalnızca **1 adet suppression**
kullanıldı (Bölüm 4). Hedef "Aşama 4 Hedef" tablosunun (İlk Analiz Raporu §3.3)
tüm satırlarına Aşama 3 sonunda ulaşılmıştır.

Birim ve smoke testlerinin tamamı (66 + 32 = **98 test**) düzeltmeler sonrası
da geçmektedir; regresyon yoktur (Bölüm 3 — `reports/stage2/regression-tests.log`).

---

## 2. Çözülen Bulguların Listesi

### 2.1 ESLint Bulguları (41 adet — tamamı kapatıldı)

#### B-E1. `@typescript-eslint/no-explicit-any` — 36 adet

| Dosya | Adet | Önce | Sonra |
| --- | ---: | --- | --- |
| `src/services/projectService.ts` | 19 | `userId: any`, `input: any`, `values: any`, `e: any` … | `Id` (string\|number) tip alias, `ProjectMemberRow`, `SqliteError`, `Record<string, string\|number\|null>` |
| `client/src/pages/TasksPage.tsx` | 11 | `(data: any) => Promise<void>`, `taskData: any`, `e.target.value as any`, `style as any` | Yeni `TaskFormData` interface, `TaskStatus`/`TaskPriority` type cast, `as CSSProperties` |
| `client/src/pages/AdminPage.tsx` | 5 | `(u as any).created_at`, `e.target.value as any` | `User` type'ına `created_at: string` alanı eklendi; rol filter `'all'\|'admin'\|'user'` |
| `src/services/taskService.ts` | 3 | `parseTaskRow(row: any)`, `let rows: any[]` | Yeni `TaskRow` tip alias, tüm `db.prepare(...).all()` sonuçları `as TaskRow[]` |
| `src/routes/tasks.ts` | 1 | `(u: any) => u.id` | `Task['assigned_users']` üzerinden tipli erişim |
| **Toplam** | **36** | — | — |

**Problem özeti:** TypeScript'in sağladığı tip güvenliği `any` kullanıldığı her
yerde devreden çıkıyor; tip kontrolünü baypaslayıp yanlış alan/metot çağrısı
risklerini görünmez kılıyordu.
**Yapılan değişiklik:** Her `any` için domain tipinden uygun bir interface,
type-alias veya `unknown`+narrowing kullanıldı.
**Doğrulama:** `npm run lint:stage2` raporu → 0 error, 0 warning. Backend ve
frontend için `tsc --noEmit` temiz. Testlerin 98/98'i geçiyor.

#### B-E2. `react/no-unescaped-entities` — 2 adet

- **Konum:** `client/src/pages/TasksPage.tsx:821` (eski satır numarası)
- **Problem özeti:** JSX içinde literal `"` karakteri kullanılmış; React
  doğrudan kaçırılmamış tırnağı uyarı veriyor.
- **Yapılan değişiklik:** `"{searchQuery}"` → `&quot;{searchQuery}&quot;`.
- **Doğrulama:** ESLint stage2'de bu kural artık tetiklenmiyor.

#### B-E3. `@typescript-eslint/no-unused-vars` — 2 adet

- **Konumlar:**
  - `tests/unit/projectService.test.ts:10` — `validateUpdateProjectInput`
  - `tests/unit/taskService.test.ts:8` — `getAllTasks`
- **Problem özeti:** Test dosyalarında import edilmiş ama kullanılmayan
  fonksiyonlar.
- **Yapılan değişiklik:** İki import satırı kaldırıldı.
- **Doğrulama:** ESLint temiz; test sayısı (66 unit) değişmedi.

#### B-E4. `react-hooks/exhaustive-deps` — 1 adet

- **Konum:** `client/src/pages/TasksPage.tsx:484` (eski) — `useEffect`'in
  bağımlılık dizisinde `loadTasks` eksikti.
- **Problem özeti:** `loadTasks` closure üzerinden `filterLabel` ve
  `selectedProjectId`'i okuyor; useEffect bağımlılıkları tutarsızdı.
- **Yapılan değişiklik:** `loadTasks` `useCallback([filterLabel, selectedProjectId])`
  ile sarıldı; useEffect dependency array'ine `loadTasks` eklendi.
- **Doğrulama:** ESLint kuralı tetiklenmiyor; tarayıcıda Hızlı Ekle ve filtre
  ile yenileme akışı manuel kontrol edildi.

---

### 2.2 SonarQube Bulguları (83 adet — tamamı kapatıldı)

#### B-S1. `typescript:S2871` — `.sort()` karşılaştırıcısı eksik (CRITICAL BUG)

- **Konum:** `src/routes/tasks.ts:130` (eski).
- **Problem özeti:** `assignee_ids.sort()` JavaScript varsayılanı olarak
  string-leksikografik sıralama yapıyor; sayısal kıyas için sonuç güvenilir
  değil. `reliability_rating`'i D'ye çeken tek **CRITICAL** bulgu.
- **Yapılan değişiklik:** `buildAssigneeIdsKey` yardımcı fonksiyonu eklendi;
  `[...ids].sort((a, b) => a - b)` ile sayısal karşılaştırıcı verildi.
- **Doğrulama:** Yeniden tarama (Aşama 3 SonarQube): `bugs = 0`,
  `reliability_rating = A (1.0)`. `S2871` artık raporda yok.

#### B-S2. `typescript:S3776` — Cognitive Complexity 23 > 15 (CRITICAL CODE_SMELL)

- **Konum:** `src/routes/tasks.ts:113` (eski) — PATCH `/:id` handler.
- **Problem özeti:** Tek fonksiyon içinde 6 farklı alan için iç içe `if`
  bloklarıyla değişiklik tespiti yapılıyordu (cognitive complexity 23, eşik 15).
- **Yapılan değişiklik:** Mantık iki saf yardımcı fonksiyona ayrıldı:
  - `buildAssigneeIdsKey(ids)` — atayı listesini deterministik string'e dönüştür
  - `describePatchChanges(oldTask, patch)` — değişiklik mesajları üret
  PATCH handler artık 5 satırlık temiz bir kontrol akışına sahip.
- **Doğrulama:** Yeniden tarama: `S3776` raporda yok. Smoke test 3 (`PATCH
  /tasks/:id`) ve unit test'ler hâlâ yeşil.

#### B-S3. `typescript:S6606` — Nullish coalescing (`??`) yerine `||` kullanımı

**25 adet** — tamamı kapatıldı. Etkilenen dosyalar:

| Dosya | Adet | Eski örnek | Yeni |
| --- | ---: | --- | --- |
| `client/src/pages/AdminPage.tsx` | 8 | `stats?.userCount \|\| 0` | `stats?.userCount ?? 0` |
| `client/src/pages/TasksPage.tsx` | 7 | `currentProject?.name \|\| 'Tüm Görevler'` | `currentProject?.name ?? 'Tüm Görevler'` |
| `client/src/pages/ReportsPage.tsx` | 3 | `t.project_name \|\| '-'` | `t.project_name ?? '-'` |
| `src/server.ts` | 2 | `process.env.PORT \|\| 3000` | `process.env.PORT ?? 3000` |
| `src/routes/tasks.ts` | 1 | `appErr.statusCode \|\| 500` | `appErr.statusCode ?? 500` |
| `src/services/labelService.ts` | 1 | `input.color \|\| '#6366f1'` | `input.color ?? '#6366f1'` |
| `src/services/projectService.ts` | 1 | `input.description?.trim() \|\| null` | `... ?? null` |
| `src/app.ts` | 1 | `process.env.SESSION_SECRET \|\| '...'` | `... ?? '...'` |
| `client/src/pages/LoginPage.tsx` | 1 | `e.body?.error \|\| 'Giriş başarısız'` | `... ?? '...'` |

**Problem özeti:** `||` operatörü `0`, `''` ve `false` gibi geçerli "falsy" ama
"non-nullish" değerleri de filtreliyor (örn. sayaç değeri `0` ise yanlışlıkla
varsayılan kullanılıyor). `??` yalnızca `null`/`undefined` için fallback uygular.
**Doğrulama:** Yeniden tarama: `S6606` raporda yok.

#### B-S4. `typescript:S6853` — Form etiketi kontrol ile bağlanmamış

**15 adet** — tamamı kapatıldı.

- **Konumlar:** `LoginPage.tsx` (2 form), `RegisterPage.tsx` (3 form),
  `TasksPage.tsx` (TaskForm 6, comment formu 1, project modali 1, search 1,
  filtreler 2 = 11 etiket; ayrıca yeni `<dialog>` etiketleri).
- **Problem özeti:** `<label>` etiketlerinin `htmlFor` özelliği yoktu; ekran
  okuyucular etiketi ilgili input ile eşleştiremezdi.
- **Yapılan değişiklik:** Her input'a benzersiz `id` atandı, label'a
  `htmlFor` eklendi. Görsel olarak gizli (`visually-hidden`) etiketler arama,
  hızlı ekleme ve filtre dropdown'ları için kullanıldı.
- **Doğrulama:** Yeniden tarama: `S6853` raporda yok.

#### B-S5. `typescript:S6759` — React prop'ları `readonly` değil

- **4 adet** — `LoginPage` `Props`, `RegisterPage` `Props`,
  `TasksPage` (`StatusBadge` props, `PriorityBadge` props, `TaskFormProps`,
  `TaskDetailProps`).
- **Problem özeti:** React render'ı süresince props mutate edilmemelidir; tip
  düzeyinde garanti edilmesi tavsiye edilir.
- **Yapılan değişiklik:** İlgili interface'lerde tüm alanlara `readonly`
  modifier eklendi.
- **Doğrulama:** Yeniden tarama: `S6759` raporda yok.

#### B-S6. `typescript:S6848` + `typescript:S1082` — Non-interactive element üstünde click handler

- **Konum:** `TasksPage.tsx` — `<div>` görünümlü modal overlay'leri (4 adet),
  sidebar overlay (1 adet), proje sidebar item'ları (2 adet), task kart
  `<div>`'leri (~6 adet), iç modal `<div>`'leri (4 adet) — toplam **27 adet**
  uyarı (S6848 + S1082 paired).
- **Problem özeti:** Etkileşimli görünen ama `<button>`/`<a>` olmayan div'ler
  ekran okuyucu/klavye kullanıcılarına ulaşılamıyordu.
- **Yapılan değişiklik (a11y refactor):**
  - **Modal overlay** pattern: dış `<div className="modal-overlay">` artık
    salt-stil; backdrop tıklamasını yakalayan ayrı `<button
    className="modal-overlay-backdrop">` (CSS'de `position:absolute; inset:0`)
    kullanıldı. Modal içeriği `<div className="modal">` olarak kaldı, içinde
    nested button sorunu olmadan kapatma butonu bulunuyor.
  - **Sidebar overlay** `<div>` → `<button type="button">`.
  - **Proje sidebar item'ları** outer div → `<button type="button"
    className="project-item-main">`; sil butonu kardeş button olarak ayrıldı.
  - **Task kartı** `<div>` → `<article>` + içine "stretched-link" pattern:
    `<button className="task-card-stretch">` mutlak konumla tüm kart yüzeyini
    kaplıyor; düzenle/sil butonları üstünde `z-index: 2` ile duruyor.
  - **Tüm modal'ların** iç `<div className="modal">` öğelerinden gereksiz
    `onClick={e => e.stopPropagation()}` kaldırıldı (artık gerek yok, çünkü
    backdrop tıklaması ayrı button'da).
- **Doğrulama:** Yeniden tarama: `S6848` ve `S1082` raporda yok. Klavyeyle:
  Tab → Modal kapatma butonu odaklanabiliyor; Enter ile sidebar açılıp
  kapatılıyor; task kart üzerinde Enter detayı açıyor.

#### B-S7. `typescript:S3863` — `'../types'` çoklu import

- **3 adet** — `src/routes/tasks.ts` (`activityService` iki kere),
  `client/src/pages/TasksPage.tsx` (`'../types'` iki kere).
- **Problem özeti:** Aynı modülden ayrı satırlarda tekrar tekrar import.
- **Yapılan değişiklik:**
  - `src/routes/tasks.ts`: `import { logActivity, getActivitiesByTask } from
    '../services/activityService';` (tek satır).
  - `TasksPage.tsx`: tüm `lucide-react` ve `'../types'` import'ları dosya
    başında tek bloklarda toplandı.
- **Doğrulama:** Yeniden tarama: `S3863` raporda yok.

#### B-S8. `typescript:S3358` — İç içe ternary

- **2 adet:**
  - `src/routes/tasks.ts:31` (eski) — `project_id === 'null' ? null :
    (project_id ? parseInt(...) : undefined)` → `parseProjectIdFilter()`
    yardımcı fonksiyonu.
  - `client/src/pages/TasksPage.tsx:51` (eski) — `StatusBadge` içinde 3'lü
    ternary → `statusBadgeClass(status)` yardımcı fonksiyonu.
- **Doğrulama:** Yeniden tarama: `S3358` raporda yok.

#### B-S9. `typescript:S3696` — Literal değer `throw` edildi

- **Konum:** `client/src/api.ts:11` — `throw { status: res.status, body }`.
- **Problem özeti:** Hata olarak plain object atılıyor; `instanceof Error`
  kontrolü ve standart `.message` özelliği eksik.
- **Yapılan değişiklik:** `class ApiError extends Error` tanımlandı; throw
  artık `throw new ApiError(res.status, body)`. Tüm sayfalar (`LoginPage`,
  `RegisterPage`, `TasksPage`) hata yakalamada `e.body?.error` semantiğine
  zaten uyumlu olduğu için ek değişiklik gerekmedi.
- **Doğrulama:** Yeniden tarama: `S3696` raporda yok.

#### B-S10. `typescript:S3626` — Gereksiz `return`

- **Konum:** `client/src/pages/TasksPage.tsx:407` (eski).
- **Yapılan değişiklik:** Arrow fonksiyonun sonundaki gereksiz `return;`
  satırı kaldırıldı.
- **Doğrulama:** Yeniden tarama: `S3626` raporda yok.

#### B-S11. Security Hotspots — `S5852` ve `S5689`

- **`S5852` regex super-linear backtracking** — `src/services/authService.ts:30`.
  Eski: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)`. Yeni: regex
  tamamen kaldırıldı; yerine `isValidEmail(input)` saf-fonksiyonu eklendi —
  RFC tarafından önerilen 254/64 uzunluk sınırlarını uygular, `@` ve `.`
  konumlarını manuel arar (linear time, backtracking yok). Authservice
  test'leri (`tests/unit/authService.test.ts`) — 10 testin tümü yeniden geçti.
- **`S5689` framework version disclosure** — `src/app.ts:11`. Yeni:
  `app.disable('x-powered-by')` eklendi; Express artık `X-Powered-By` HTTP
  başlığını göndermiyor.
- **Doğrulama:** Yeniden tarama: `security_hotspots = 0`.

---

## 3. Regresyon Test Kanıtı

Aşama 1'de yazılan tüm testler (66 unit + 32 smoke = **98 test**) Aşama 3
düzeltmeleri sonrası tekrar koşturuldu. Çıktının tamamı
[`reports/stage2/regression-tests.log`](../reports/stage2/regression-tests.log)
dosyasında saklı; özet:

```
Test Files  7 passed (7)
     Tests  98 passed (98)
  Duration  1.44s
```

Servis bazında dağılım:
- `tests/unit/authService.test.ts` — 10 test ✓ (regex değiştirildi, davranış
  korundu)
- `tests/unit/projectService.test.ts` — 7 test ✓ (`any` tipleri kaldırıldı)
- `tests/unit/taskService.test.ts` — 12 test ✓ (`TaskRow` tipi eklendi)
- `tests/unit/labelService.test.ts` — 9 test ✓
- `tests/unit/commentService.test.ts` — 8 test ✓
- `tests/unit/reportService.test.ts` — 8 test ✓
- `tests/smoke/api.smoke.test.ts` — 32 test ✓ (HTTP layer end-to-end —
  `tasks.ts` PATCH handler refactörü dahil tüm akışlar yeşil)

---

## 4. Kullanılan Suppression / Ignore (1 / 3)

Yönerge en fazla 3 suppression'a izin veriyor; **1 adet kullanıldı.**

### Suppression #1

| Alan | Değer |
| --- | --- |
| **Kural / Bulgu kimliği** | `typescript:S6847` — *Non-interactive elements should not be assigned mouse or keyboard event listeners* |
| **Kapsam** | `client/src/pages/TasksPage.tsx` (dosya bazlı) |
| **Etkilenen yerler** | (i) `<section className="kanban-column" onDragOver onDrop>` — 3 kanban kolonu, (ii) `<article className="task-card-modern" onDragStart>` — kart başına 1 |
| **Suppression mekanizması** | `sonar-project.properties` içinde `sonar.issue.ignore.multicriteria.s6847dnd.{ruleKey,resourceKey}` |

**Neden istisna?**
HTML5 native drag-and-drop API'si **drop target**'ta `onDragOver` + `onDrop`,
**drag source**'ta `onDragStart` event'lerini doğrudan elementin üstünde ister
— bunları başka bir interactive element'e taşımak mümkün değildir. Tarayıcı,
sadece bu olayları register eden DOM düğümünü drag-drop akışında geçerli
sayıyor. SonarQube'un S6847 kuralı `onDragStart`/`onDragOver`/`onDrop`'u da
"mouse listener" sayıp non-interactive `<section>`/`<article>` üstünde
tetikliyor.

**Risk değerlendirmesi:**
**Düşük.** Erişilebilirlik açısından risk yok çünkü:
- Klavye/ekran okuyucu kullanıcıları için detayı açma akışı task kart üstüne
  konulan **stretched-link `<button>`** (`.task-card-stretch`) üzerinden zaten
  sağlanıyor — Tab + Enter çalışıyor.
- Status değiştirme (kanban kolon değişikliği) için modal'daki "Durum" select
  dropdown'u alternatif yol olarak mevcut.
- Drag-and-drop yalnızca fare/dokunmatik kullanan kullanıcıların ek bir
  kolaylığı; klavye yolundan vazgeçirilmemiştir.

**Alternatif çözüm neden uygulanmadı?**
İki olası alternatif değerlendirildi:
1. **Task kart ve kolonu `<button>` yapmak.** HTML standardı gereği
   `<button>` içine başka `<button>` konulamaz; oysa task kartının içinde
   düzenle/sil butonları var. Ayrıca kolonun başlığı, sayaç ve görev listesi
   içermesi semantik olarak `<button>` olmasını engeller.
2. **Native HTML5 `<dialog>` + drag işlerini React-DnD/dnd-kit gibi
   kütüphaneye devretmek.** Yeni dependency, yeni öğrenme eğrisi ve mevcut
   CSS'i baştan kurma gereksinimi getirirdi; üç haftalık Aşama 3 takvimi
   içinde gerekçeli görülmedi. Mevcut native DnD pattern'ı zaten erişilebilir
   alternatif (stretched-link button) ile destekleniyor.

Suppression sayısı: **1 / 3** (2 yedek kullanılmadı).

---

## 5. Aşama 1 Test ve Aşama 2 Hedefleri ile Karşılaştırma

İlk Analiz Raporu §3.3'te konulan Aşama 4 hedefleri Aşama 3 sonunda
**hepsi Aşama 4'ten önce** karşılandı:

| Metrik | Aşama 2 | Aşama 4 Hedef | Aşama 3 Sonuç | Durum |
| --- | ---: | ---: | ---: | --- |
| ESLint error | 15 | 0 | **0** | ✅ |
| ESLint warning | 26 | ≤ 5 | **0** | ✅ aşıldı |
| SonarQube BUG | 14 | ≤ 2 | **0** | ✅ aşıldı |
| SonarQube CODE_SMELL | 69 | ≤ 20 | **0** | ✅ aşıldı |
| BLOCKER + CRITICAL CODE_SMELL | 1 | 0 | **0** | ✅ |
| `duplicated_lines_density` | %1.3 | ≤ %1.0 | **%1.0** | ✅ |
| `reliability_rating` | D | A | **A (1.0)** | ✅ |
| `sqale_rating` | A | A | **A** | ✅ korundu |
| `security_rating` | A | A | **A** | ✅ korundu |
| `sqale_index` | 348 dk | ≤ 120 dk | **0 dk** | ✅ aşıldı |
| `security_hotspots` | 2 | 0 (reviewed) | **0 (fixed)** | ✅ |

---

## 6. Teslim Edilen Dosyalar

```
asama_3/
├── GUNCELLEME_RAPORU.md                       ← bu dosya
├── reports/
│   └── stage2/
│       ├── eslint.json                        ← ESLint Aşama 3 çıktısı (0 issue)
│       ├── sonarqube-issues.json              ← SonarQube Aşama 3 çıktısı (0 OPEN)
│       ├── sonarqube-measures.json            ← SonarQube metrikleri
│       └── regression-tests.log               ← 98/98 test çıktısı
└── (kod) — kök proje dizininde:
    ├── src/                                   ← güncellenmiş backend
    ├── client/src/                            ← güncellenmiş React istemcisi
    ├── tests/                                 ← güncellenmiş test importları
    └── sonar-project.properties               ← Suppression #1 buraya eklendi
```

Yeniden tarama komutları (her ikisi de Aşama 3 boyunca her bulgu kapatıldıktan
sonra koşturuldu):

```bash
# Statik analiz
npm run lint:stage2
npm run sonar:up
SONAR_TOKEN=... npx sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.token=$SONAR_TOKEN
SONAR_TOKEN=... node scripts/fetch-sonar-reports.mjs --stage stage2

# Regresyon
npm test
```

---

**Sonuç:** Aşama 2 raporundaki **124 bulgunun tamamı** kapatıldı (1
suppression ile), kritik BUG ve CODE_SMELL'ler **0**'a indirildi,
`reliability_rating` D'den A'ya çıktı, 98/98 test geçiyor — regresyon yok.
