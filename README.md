# Dönem Projesi - Task Manager API

## Proje Açıklaması

Bu proje, Yazılım Kalite Güvencesi dersi kapsamında geliştirilmiş bir görev yönetimi (Task Manager) REST API uygulamasıdır. TypeScript, Node.js ve Express framework kullanılarak inşa edilmiş olan bu API, kullanıcıların görev oluşturmasına, güncellemesine, listemesine ve silmesine olanak tanır. Kimlik doğrulama ve yetkilendirme mekanizmaları da dahil olmak üzere tam işlevsel bir backend servisi sunmaktadır.

## Mimari Özeti

Uygulama, katmanlı mimari prensibine göre tasarlanmıştır. Sunum katmanında Express Router'ları ile tanımlanmış HTTP endpoint'leri bulunmakta, iş mantığı ise `services/` dizini altında ayrı servis modüllerinde konumlandırılmaktadır. Bu yaklaşım, kodun test edilebilirliğini ve bakımını önemli ölçüde kolaylaştırmaktadır.

Veritabanı katmanında `better-sqlite3` kütüphanesi kullanılarak senkron SQLite operasyonları gerçekleştirilmektedir. `db.ts` modülü uygulama başladığında tabloları otomatik olarak oluşturmakta ve WAL (Write-Ahead Logging) modu etkinleştirilerek performans optimize edilmektedir. Yabancı anahtar kısıtları da açıkça aktif hale getirilmiştir.

Kimlik doğrulama, `express-session` middleware'i aracılığıyla sunucu taraflı oturum yönetimiyle sağlanmaktadır. Oturum kimliği `httpOnly` özelliğine sahip bir çerezde saklanarak XSS saldırılarına karşı koruma sağlanmaktadır. Kullanıcı şifreleri veritabanına kaydedilmeden önce `bcrypt` ile hash'lenerek güvenlik güçlendirilmektedir.

Test altyapısı Vitest ve Supertest üzerine inşa edilmiştir. Birim testleri servis fonksiyonlarını izole in-memory veritabanları ile test ederken, duman testleri (smoke tests) gerçek HTTP istekleri göndererek uçtan uca akışı doğrulamaktadır. Bu iki katmanlı test stratejisi hem bireysel bileşenlerin hem de sistemin bütününün doğru çalıştığını garanti etmektedir.

## Kurulum ve Çalıştırma

### Gereksinimler

- Node.js >= 18.x
- npm >= 9.x

### Adımlar

```bash
# Bağımlılıkları yükle
npm install

# Veritabanını başlangıç verileriyle doldur
npm run seed

# Geliştirme modunda başlat
npm run dev

# Üretim için derle
npm run build

# Derlenmiş uygulamayı çalıştır
npm start
```

## Varsayılan Kullanıcılar (Seed)

`npm run seed` komutu çalıştırıldıktan sonra aşağıdaki kullanıcılar oluşturulur:

| Kullanıcı Adı | Şifre     | Rol   |
|---------------|-----------|-------|
| admin         | Admin123! | admin |
| user1         | User123!  | user  |

Seed ayrıca 3 örnek görev de oluşturur: biri "todo", biri "in-progress", biri "done" statüsünde.

## Oturum Yönetimi Tercihi

Oturum yönetimi için JWT yerine sunucu taraflı `express-session` tercih edilmiştir. Bu kararın temel sebebi güvenlik odaklıdır: oturum verileri sunucuda tutulduğundan, bir oturumu geçersiz kılmak (örneğin kullanıcıyı çıkış yapmaya zorlamak) anlık olarak mümkündür. JWT tabanlı yaklaşımda token süresi dolana kadar geçersiz kılma mümkün değildir. Oturum ID'si `httpOnly` çerezde taşınarak JavaScript tarafından erişilmesi engellenmekte, böylece XSS saldırılarına karşı ek koruma sağlanmaktadır.

## Veritabanı Tercihi

Veritabanı olarak SQLite (`better-sqlite3`) seçilmiştir. Bu tercih, uygulamanın bağımsız çalışabilmesini (ek veritabanı sunucusu gerektirmemesini) sağlar ve özellikle geliştirme ortamında kurulum karmaşıklığını ortadan kaldırır. `better-sqlite3` kütüphanesi senkron API sunduğu için kod okunabilirliği artmakta ve async/await karmaşası yaşanmamaktadır. WAL modu etkinleştirilerek eş zamanlı okuma performansı da iyileştirilmiştir.

## Test Komutları

```bash
# Tüm testleri çalıştır
npm test

# Yalnızca duman testlerini çalıştır
npm run test:smoke

# Yalnızca birim testlerini çalıştır
npm run test:unit
```

## Test Logları

`npm test` çıktısı (98/98 test geçti):

```
  ✓ tests/smoke/api.smoke.test.ts (31)
  ✓ tests/unit/taskService.test.ts (24)
  ✓ tests/unit/reportService.test.ts (8)
  ✓ tests/unit/labelService.test.ts (9)
  ✓ tests/unit/commentService.test.ts (8)
  ✓ tests/unit/projectService.test.ts (7)
  ✓ tests/unit/authService.test.ts (10)

 Test Files  7 passed (7)
      Tests  98 passed (98)
   Start at  14:50:04
   Duration  1.30s (transform 189ms, setup 1ms, collect 594ms, tests 420ms, environment 0ms, prepare 131ms)
```

## Testler

Bu projede kalite güvencesi kapsamında iki temel test seviyesi uygulanmıştır: Birim Testleri (Unit Tests) ve Duman Testleri (Smoke Tests).

### Duman Testleri (Smoke Tests)

Duman testleri, uygulamanın en kritik işlevlerinin uçtan uca (end-to-end) doğru çalışıp çalışmadığını doğrular. `tests/smoke/api.smoke.test.ts` içinde yer alan 31 senaryo şunları kapsar:

1.  **Kimlik Doğrulama:** Kayıt olma, giriş yapma ve oturum (session) çerezinin doğrulanması.
2.  **Yetkilendirme:** Oturum açmadan korumalı endpoint'lere erişimin engellenmesi ve admin-only endpoint testleri.
3.  **Ana Varlık (Task) CRUD:** Görev oluşturma, listeleme, detay görüntüleme, güncelleme ve silme akışları.
4.  **Doğrulama (Validation):** Geçersiz verilerle (örn. boş başlık) yapılan isteklerin 400 hatası ile reddedilmesi.
5.  **Ek Özellikler:** Yorum ekleme/silme, etiket yönetimi, alt görev (subtask) oluşturma ve proje bazlı yönetim.
6.  **Raporlama:** İstatistik ve özet raporlarına yetkili erişim.

### Birim Testleri (Unit Tests)

Birim testleri, servis katmanındaki (service layer) iş kurallarını ve veri doğrulama mantığını veritabanı veya ağ bağımlılığı olmadan (in-memory DB ile) izole bir şekilde test eder. Toplam 67 birim testi şu başlıkları içerir:

-   **Validation / İş Kuralları:** `taskService`, `authService`, `labelService` vb. içindeki girdi doğrulama fonksiyonları (boş değer, uzunluk, format kontrolü).
-   **Yetkilendirme Kararı:** `authService` içindeki rol bazlı (admin/user) erişim izinleri.
-   **Hata Durumları:** Kaynak bulunamadı (404), yetkisiz erişim (403) ve çakışma (conflict) durumlarının servis seviyesinde yönetimi.
-   **Servis Mantığı:** "Ana varlık" ve yardımcı varlıkların (etiket, yorum, proje) veritabanı ile olan CRUD etkileşimleri ve karmaşık istatistik hesaplama algoritmaları (`reportService`).

## API Endpoint Dokümantasyonu

### Kimlik Doğrulama

| Metod | Endpoint            | Açıklama                        | Yetki      |
|-------|---------------------|---------------------------------|------------|
| POST  | /api/auth/register  | Yeni kullanıcı kaydı            | Herkese açık |
| POST  | /api/auth/login     | Giriş yap, oturum oluştur       | Herkese açık |
| POST  | /api/auth/logout    | Oturumu sonlandır               | Giriş yapmış |
| GET   | /api/auth/me        | Mevcut oturum bilgisi           | Giriş yapmış |

#### POST /api/auth/register
```json
{
  "username": "kullanici",
  "email": "kullanici@ornek.com",
  "password": "Sifre123!"
}
```

#### POST /api/auth/login
```json
{
  "username": "kullanici",
  "password": "Sifre123!"
}
```

### Görevler (Tasks)

Tüm görev endpoint'leri kimlik doğrulaması gerektirir.

| Metod  | Endpoint         | Açıklama                  | Yetki        |
|--------|------------------|---------------------------|--------------|
| GET    | /api/tasks       | Tüm görevleri listele      | Giriş yapmış |
| POST   | /api/tasks       | Yeni görev oluştur         | Giriş yapmış |
| GET    | /api/tasks/:id   | Tek görev getir            | Giriş yapmış |
| PATCH  | /api/tasks/:id   | Görevi güncelle            | Giriş yapmış |
| DELETE | /api/tasks/:id   | Görevi sil                 | Giriş yapmış |

#### POST /api/tasks — Görev Oluşturma
```json
{
  "title": "Görev başlığı",
  "description": "İsteğe bağlı açıklama",
  "status": "todo"
}
```
Geçerli `status` değerleri: `todo`, `in-progress`, `done`

#### PATCH /api/tasks/:id — Görev Güncelleme
```json
{
  "title": "Yeni başlık",
  "status": "in-progress"
}
```

### Admin

Yalnızca `admin` rolündeki kullanıcılar erişebilir.

| Metod | Endpoint          | Açıklama                         | Yetki |
|-------|-------------------|----------------------------------|-------|
| GET   | /api/admin/users  | Tüm kullanıcıları listele        | Admin |
| GET   | /api/admin/stats  | Kullanıcı ve görev istatistikleri | Admin |

### Sistem

| Metod | Endpoint  | Açıklama            |
|-------|-----------|---------------------|
| GET   | /health   | Servis sağlık kontrolü |

## Hata Yanıtları

Doğrulama hataları için:
```json
{
  "errors": [
    { "field": "title", "message": "Title is required" }
  ]
}
```

Genel hatalar için:
```json
{
  "error": "Hata mesajı"
}
```

## HTTP Durum Kodları

| Kod | Açıklama                        |
|-----|---------------------------------|
| 200 | Başarılı                        |
| 201 | Kaynak oluşturuldu              |
| 204 | Başarılı, içerik yok (silme)    |
| 400 | Geçersiz istek / doğrulama hatası |
| 401 | Kimlik doğrulaması gerekli      |
| 403 | Yetkisiz erişim                 |
| 404 | Kaynak bulunamadı               |
| 409 | Çakışma (kullanıcı adı/e-posta zaten mevcut) |
| 500 | Sunucu hatası                   |

## Opsiyonel UI (BONUS)

React + Vite ile geliştirilmiş bir kullanıcı arayüzü `client/` dizininde bulunmaktadır.

### UI Kurulumu ve Çalıştırma

```bash
cd client
npm install
npm run dev
```

Tarayıcıda http://localhost:5173 adresini açın. Backend (port 3000) çalışıyor olmalıdır.

### UI Özellikleri
- Giriş ve kayıt sayfaları
- Görev listesi: oluşturma, düzenleme, silme
- Durum rozetleri (Yapılacak / Devam ediyor / Tamamlandı)
- Admin paneli: kullanıcı listesi ve istatistikler (yalnızca admin rolü)
