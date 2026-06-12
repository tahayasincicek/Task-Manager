# Aşama 2 — Teslimat Paketi

**Ders:** Yazılım Kalite Güvencesi
**Öğrenci:** 230229083 — Furkan Öztürk
**Teslim tarihi:** 2026-04-22 (son teslim 26.04.2026 23:55)

---

## Paket İçeriği

```
asama_2/
├── TESLIMAT.md                           ← bu dosya (dizin)
├── ILK_ANALIZ_RAPORU.tex                 ← İlk Analiz Raporu (IEEE LaTeX kaynağı)
├── ILK_ANALIZ_RAPORU.md                  ← aynı içeriğin Markdown sürümü
└── reports/
    └── stage1/
        ├── eslint.json                   ← ESLint JSON çıktısı
        ├── sonarqube-issues.json         ← SonarQube BUG + CODE_SMELL (severity dahil)
        └── sonarqube-measures.json       ← SonarQube metrikleri (13 metrik)
```

## Raporun PDF'e Dönüştürülmesi (IEEE formatı)

`ILK_ANALIZ_RAPORU.tex` dosyası IEEE konferans formatında
(`IEEEtran.cls`, `\documentclass[conference]{IEEEtran}`) hazırlanmıştır.
PDF üretmek için iki seçenek vardır:

1. **Overleaf** (tavsiye edilen, kurulum gerekmez):
   \> New Project → Blank Project → içeriği yapıştır → Menu bölümünden
   Compiler: **pdfLaTeX** seç → Recompile. Overleaf'te `IEEEtran` sınıfı
   yerleşiktir.
2. **Yerel TeX Live / MiKTeX** ile:
   ```bash
   pdflatex ILK_ANALIZ_RAPORU.tex
   pdflatex ILK_ANALIZ_RAPORU.tex   # çapraz referanslar için 2. geçiş
   ```

## Yönerge ↔ Dosya Eşleşmesi

| Yönerge maddesi | Dosya |
| --- | --- |
| `reports/<stage>/sonarqube-issues.json` | `reports/stage1/sonarqube-issues.json` |
| `reports/<stage>/sonarqube-measures.json` | `reports/stage1/sonarqube-measures.json` |
| `reports/<stage>/eslint.json` | `reports/stage1/eslint.json` |
| İlk Analiz Raporu — araçlar + versiyonlar + config/kural seti | `ILK_ANALIZ_RAPORU.tex` §II (ve `.md` §1) |
| İlk Analiz Raporu — bulgular + planlanan aksiyon | `ILK_ANALIZ_RAPORU.tex` §III–§IV (ve `.md` §2–§3) |

## Özet Rakamlar

**ESLint:** 41 bulgu (15 error + 26 warning) — 7 dosya

**SonarQube:** 83 issue (BUG 14 + CODE_SMELL 69) — 11 dosya
- Severity: CRITICAL 2 • MAJOR 9 • MINOR 72
- `ncloc = 5153`, `bugs = 14`, `code_smells = 69`,
  `vulnerabilities = 0`, `security_hotspots = 2`,
  `duplicated_lines_density = %1.3`,
  `reliability_rating = D`, `sqale_rating = A`,
  `security_rating = A`, `sqale_index = 348 dk`.

## Analizin Yeniden Üretilmesi

Tüm konfigürasyon ve komut detayları proje kökündeki `reports/README.md`
dosyasında ayrıntılandırılmıştır. Aşama 4 aynı komutların `:stage2`
varyantı ile üretilecektir.

```bash
# Aşama 2 (bu teslimin oluşturuluşu)
npm run analyze:stage1

# Aşama 4 (gelecekteki teslim)
npm run analyze:stage2
```
