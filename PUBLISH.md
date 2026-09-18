# Actos Web — Çalıştırma ve Production Yayın Rehberi

Bu rehber frontend'i yerelde açmaktan `actos.com.tr` üzerinde nginx arkasında
yayınlamaya kadar gereken yolu anlatır. Önerilen production mimarisi şudur:

```text
İnternet / Cloudflare
        │
     nginx :443
        ├── actos.com.tr       → 127.0.0.1:3000 (Next.js frontend)
        ├── api.actos.com.tr   → 127.0.0.1:3100 (Actos API)
        └── media.actos.com.tr → 127.0.0.1:3103 (MinIO)
```

Tarayıcı Actos API'ye doğrudan bağlanmaz. Next.js sunucusu API'ye bağlanır ve
`app/api/*` rotaları güvenli aracı görevi görür. Kullanıcının API anahtarı
`httpOnly` çerezde tutulur; frontend container ortamına kullanıcı API anahtarı
veya başka bir uygulama sırrı koyulmaz.

## 1. Gereksinimler

Yerel geliştirme için:

- Node.js 22 veya daha yeni
- pnpm 10 (`corepack enable` ile etkinleştirilebilir)
- Çalışan Actos backend/API (`http://127.0.0.1:3100`)

Production için önerilen ek bileşenler:

- Docker Engine ve Docker Compose V2
- nginx
- certbot veya başka bir TLS sertifika yöneticisi
- DNS erişimi; Cloudflare kullanılıyorsa SSL modu `Full (strict)`

## 2. Ortam değişkenleri

Frontend dört URL değişkeni ister (dördüncüsünün varsayılanı vardır):

| Değişken | Yerel örnek | Production örneği | Açıklama |
|---|---|---|---|
| `ACTOS_API_URL` | `http://127.0.0.1:3100` | Docker'da `http://api:3100` | Next.js sunucusunun API'ye bağlandığı iç adres. Tarayıcıya açılmaz. |
| `ACTOS_SITE_URL` | `http://localhost:3000` | `https://actos.com.tr` | Canonical URL, sitemap ve OpenGraph için sitenin dışarıdan görünen origin'i. |
| `NEXT_PUBLIC_ACTOS_API_URL` | `http://127.0.0.1:3100` | `https://api.actos.com.tr` | Geliştirici sayfasında gösterilen herkese açık API adresi. Tarayıcı paketine gömülür. |
| `ACTOS_MEDIA_URL` | `http://127.0.0.1:3103` | `https://media.actos.com.tr` | Kullanıcı medyasının (avatar, ek) servis edildiği origin. `proxy.ts` CSP'si ve `next.config.ts` `remotePatterns`'ı buradan türetilir. Boşsa production varsayılanı `https://media.actos.com.tr`. |

Kurallar:

- Değerler tam bir `http://` veya `https://` URL'si olmalıdır.
- Kullanıcı adı/şifre, query string veya `#fragment` içeremez.
- `ACTOS_SITE_URL` path içeremez; `https://actos.com.tr/app` geçersizdir.
- Production'da ilk üçü zorunludur; `ACTOS_MEDIA_URL` boş bırakılırsa
  production medya origin'ine düşer.
- `NEXT_PUBLIC_ACTOS_API_URL` build sırasında tarayıcı paketine gömülür.
  `ACTOS_MEDIA_URL` de `next.config.ts`'te build sırasında okunur. Bu
  değerleri değiştirirsen frontend imajını yeniden build etmelisin.
- Bu değişkenler sır değildir. Yine de `.env.prod` dosyasını genel olarak
  gizli tut; backend sırlarıyla aynı dosyada bulunabilir.

## 3. Yerelde çalıştırma

### 3.1 Backend'i aç

Backend deposu frontend ile aynı üst dizindeyse:

```bash
cd ../actos-backend
docker compose up -d
cargo run -p actos-api
```

API'nin hazır olduğunu kontrol et:

```bash
curl -fsS http://127.0.0.1:3100/health
```

Backend'in ayrıntılı kurulumu ve gerekli Postgres/Redis/MinIO değişkenleri için
`../actos-backend/README.md` ve `../actos-backend/docs/DEPLOYMENT.md` esas
kaynaktır.

### 3.2 Frontend'i aç

```bash
cd ../frontend
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env.local
pnpm dev
```

Ardından `http://localhost:3000` adresini aç. `.env.local` varsayılan olarak
yereldeki `http://127.0.0.1:3100` API'sine bağlanır.

İsteğe bağlı gerçekçi geliştirme verisi:

```bash
pnpm seed:dev
```

Bu komut yerel API'ye örnek hesaplar, gönderiler ve yorumlar ekler. Production
veritabanında çalıştırma.

### 3.3 Yerel production provası

Development sunucusu ile production çıktısı aynı değildir. Yayından önce:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm check:contrast
pnpm build
pnpm start
```

`pnpm start` uygulamayı varsayılan olarak `http://localhost:3000` üzerinde
açar. Farklı port için `PORT=3001 pnpm start` kullanılabilir.

## 4. Önerilen production yolu: Docker Compose

### 4.1 Frontend imajını oluştur

Frontend dizininde:

```bash
docker build \
  --build-arg ACTOS_API_URL=http://api:3100 \
  --build-arg ACTOS_SITE_URL=https://actos.com.tr \
  --build-arg NEXT_PUBLIC_ACTOS_API_URL=https://api.actos.com.tr \
  --build-arg ACTOS_MEDIA_URL=https://media.actos.com.tr \
  -t ghcr.io/actos-dev/frontend:sha-<git-sha> \
  .
```

İmajı bir registry kullanacaksan:

```bash
docker push ghcr.io/actos-dev/frontend:sha-<git-sha>
```

`latest` yerine commit SHA gibi değişmez bir etiket kullan. Böylece hangi
sürümün çalıştığı bellidir ve rollback tek satır olur.

### 4.2 Frontend servisini production Compose'a ekle

Backend'in `docker-compose.prod.yml` dosyasında hâlen frontend servisi yoksa
`services:` altına şu servisi ekle:

```yaml
  web:
    image: ${WEB_IMAGE:?WEB_IMAGE zorunlu}
    container_name: actos_web
    restart: unless-stopped
    depends_on:
      api:
        condition: service_healthy
    ports:
      - "127.0.0.1:3000:3000"
    environment:
      ACTOS_API_URL: http://api:3100
      ACTOS_SITE_URL: https://actos.com.tr
      NEXT_PUBLIC_ACTOS_API_URL: https://api.actos.com.tr
      ACTOS_MEDIA_URL: https://media.actos.com.tr
      NODE_ENV: production
      NEXT_TELEMETRY_DISABLED: "1"
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://127.0.0.1:3000/healthz >/dev/null || exit 1"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 15s
    networks: [actos_network]
```

Neden iki farklı API adresi var?

- `ACTOS_API_URL=http://api:3100`: container'ların kendi Docker ağı içindeki
  hızlı ve şifrelenmesi gerekmeyen bağlantıdır.
- `NEXT_PUBLIC_ACTOS_API_URL=https://api.actos.com.tr`: kullanıcıya ve SDK
  dokümantasyonuna gösterilen dış adrestir.

Sunucudaki `/opt/actos/.env.prod` dosyasına imaj etiketini ekle:

```dotenv
WEB_IMAGE=ghcr.io/actos-dev/frontend:sha-<git-sha>
```

Backend için gerekli `ACTOS_IMAGE`, veritabanı, Redis/MinIO ve imzalama
değişkenleri aynı dosyada bulunur; ayrıntılı liste backend'in
`docs/DEPLOYMENT.md` dosyasındadır.

### 4.3 Yığını aç veya güncelle

```bash
cd /opt/actos
docker compose -f docker-compose.prod.yml --env-file .env.prod pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
docker compose -f docker-compose.prod.yml --env-file .env.prod ps
```

Frontend logları ve sağlık kontrolü:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=100 web
curl -fsS http://127.0.0.1:3000/healthz
```

Container `127.0.0.1:3000` adresine bind edilir. Port 3000'i doğrudan
internete açma; dış erişim yalnızca nginx üzerinden gelsin.

## 5. Alternatif production yolu: Docker olmadan Node.js

Docker istemiyorsan kaynak kodu örneğin `/opt/actos/frontend` altında tut:

```bash
cd /opt/actos/frontend
corepack enable
pnpm install --frozen-lockfile
NODE_ENV=production \
ACTOS_API_URL=http://127.0.0.1:3100 \
ACTOS_SITE_URL=https://actos.com.tr \
NEXT_PUBLIC_ACTOS_API_URL=https://api.actos.com.tr \
ACTOS_MEDIA_URL=https://media.actos.com.tr \
pnpm build
```

`/opt/actos/frontend.env` oluştur:

```dotenv
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
ACTOS_API_URL=http://127.0.0.1:3100
ACTOS_SITE_URL=https://actos.com.tr
NEXT_PUBLIC_ACTOS_API_URL=https://api.actos.com.tr
ACTOS_MEDIA_URL=https://media.actos.com.tr
```

Dosyayı koru:

```bash
chmod 600 /opt/actos/frontend.env
```

Örnek `/etc/systemd/system/actos-web.service`:

```ini
[Unit]
Description=Actos Next.js web frontend
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=actos
Group=actos
WorkingDirectory=/opt/actos/frontend
EnvironmentFile=/opt/actos/frontend.env
ExecStart=/usr/bin/pnpm start
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

`pnpm` başka bir konumdaysa `command -v pnpm` çıktısını `ExecStart` içine yaz.
Servisi etkinleştir:

```bash
systemctl daemon-reload
systemctl enable --now actos-web
systemctl status actos-web
journalctl -u actos-web -n 100 --no-pager
curl -fsS http://127.0.0.1:3000/healthz
```

Bu yöntemde her kod güncellemesinde bağımlılık kurulumu, `pnpm build` ve servis
restart'ı gerekir. Docker yolu daha kolay tekrar üretilebilir ve rollback
edilebilir olduğu için önerilir.

## 6. nginx'e bağlama

Depodaki yapılandırma
`../actos-backend/deploy/nginx/actos.com.tr.conf` altında bulunur ve `web`
servisine proxy'lemeyi zaten içerir. Dosya şöyledir:

```nginx
server {
    listen 80;
    server_name actos.com.tr www.actos.com.tr;

    location / {
        proxy_pass http://127.0.0.1:3000;
        include /etc/nginx/snippets/actos-proxy.conf;
    }
}
```

Ortak proxy snippet'i:

```nginx
proxy_http_version 1.1;
proxy_set_header Host              $host;
proxy_set_header X-Real-IP         $remote_addr;
proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
proxy_set_header X-Forwarded-Proto $scheme;

proxy_connect_timeout 5s;
proxy_send_timeout    60s;
proxy_read_timeout    60s;
client_max_body_size 12m;
```

`client_max_body_size 12m`, 8 MiB dosya sınırına multipart payı bırakır.
Frontend ve backend sınırlarını bundan daha düşük bir değere çekersen büyük
avatar/gönderi görselleri nginx'te `413` ile kesilir.

Kurulum:

```bash
cp ../actos-backend/deploy/nginx/snippets/actos-proxy.conf /etc/nginx/snippets/
cp ../actos-backend/deploy/nginx/actos.com.tr.conf /etc/nginx/sites-available/actos.com.tr
ln -s /etc/nginx/sites-available/actos.com.tr /etc/nginx/sites-enabled/actos.com.tr
nginx -t
systemctl reload nginx
```

Dosya zaten symlink'liyse ikinci `ln -s` komutunu tekrar çalıştırma. nginx
değişikliğinden önce her zaman `nginx -t` kullan.

API ve medya için repodaki şu dosyalar kullanılır:

- `deploy/nginx/api.actos.com.tr.conf` → `127.0.0.1:3100`
- `deploy/nginx/media.actos.com.tr.conf` → `127.0.0.1:3103`

## 7. TLS, DNS ve Cloudflare

Önerilen sıra:

1. `actos.com.tr`, `www`, `api` ve `media` DNS kayıtlarını sunucu IP'sine
   yönlendir.
2. Cloudflare kullanıyorsan sertifika alırken kayıtları geçici olarak
   **DNS-only (gri bulut)** yap.
3. nginx HTTP konfigürasyonunu etkinleştir ve `nginx -t` çalıştır.
4. Sertifikaları al:

```bash
certbot --nginx -d actos.com.tr -d www.actos.com.tr
certbot --nginx -d api.actos.com.tr
certbot --nginx -d media.actos.com.tr
certbot renew --dry-run
```

5. Cloudflare proxy'yi aç ve SSL/TLS modunu **Full (strict)** yap. `Flexible`
   kullanma; şifresiz origin bağlantısı ve yönlendirme döngüsü üretir.
6. Backend hız sınırlarının gerçek kullanıcı IP'sini görebilmesi için
   backend deployment rehberindeki Cloudflare real-IP adımını uygula.

## 8. Yayın öncesi kontrol listesi

Kod tarafı:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm check:contrast
pnpm build
pnpm audit:bundle
```

Canlı sistem:

```bash
curl -fsS https://actos.com.tr/healthz
curl -fsS https://api.actos.com.tr/health
curl -I https://actos.com.tr/
curl -I https://actos.com.tr/robots.txt
curl -I https://actos.com.tr/sitemap.xml
```

Tarayıcıda ayrıca şunları denetle:

- kayıt, giriş ve kurtarma
- gönderi ve görselli yorum oluşturma
- görsellerin `media.actos.com.tr` üzerinden yüklenmesi
- inbox, profil, arama ve kayıtlı gönderiler
- Türkçe/İngilizce ile sepia/light/dark temaları
- mobil 390 px ve masaüstü görünüm
- tarayıcı konsolunda hata olmaması

## 9. Güncelleme ve rollback

Yeni sürüm:

```bash
# .env.prod içindeki WEB_IMAGE yeni değişmez etikete güncellenir
docker compose -f docker-compose.prod.yml --env-file .env.prod pull web
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d web
curl -fsS https://actos.com.tr/healthz
```

Rollback:

```bash
# WEB_IMAGE değerini son çalışan SHA etiketine geri al
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d web
curl -fsS https://actos.com.tr/healthz
```

Eski imajları yeni sürümü doğrulamadan silme. Frontend veritabanı migration'ı
çalıştırmaz; backend migration ve rollback kuralları backend deployment
rehberine tabidir.

## 10. Sık görülen sorunlar

### `502 Bad Gateway`

nginx `127.0.0.1:3000` üzerinde frontend bulamıyordur:

```bash
curl -v http://127.0.0.1:3000/healthz
docker compose -f docker-compose.prod.yml --env-file .env.prod ps web
docker compose -f docker-compose.prod.yml --env-file .env.prod logs --tail=200 web
```

### Frontend açılıyor ama tüm API istekleri hata veriyor

Container içinden `127.0.0.1:3100`, API container'ı değil frontend
container'ının kendisidir. Compose deployment'ta mutlaka
`ACTOS_API_URL=http://api:3100` kullan ve iki servisin de `actos_network`
ağında olduğunu kontrol et.

### Görseller kırık

Backend'deki `S3_PUBLIC_BASE_URL` dışarıdan erişilen
`https://media.actos.com.tr/<bucket>` adresi olmalıdır. `http://minio:9000`
yalnızca container içi adrestir ve tarayıcıdan çalışmaz.

### Canonical/OG/sitemap yanlış alan adını gösteriyor

`ACTOS_SITE_URL=https://actos.com.tr` olmalı. Değeri değiştirdikten sonra
frontend'i yeniden build edip yayınla.

### Developer sayfasında eski API adresi görünüyor

`NEXT_PUBLIC_ACTOS_API_URL` build-time değeridir. Yalnızca container runtime
değişkenini güncellemek yetmez; yeni imaj build et.

### Container hemen kapanıyor

```bash
docker logs actos_web
```

En sık neden üç zorunlu URL değişkeninden birinin eksik veya geçersiz
olmasıdır. Uygulama production başlangıcında bunları bilinçli olarak doğrular.

## 11. Güvenlik notları

- 3000, 3100 ve 3103 portlarını `0.0.0.0` üzerinde internete açma; yalnızca
  `127.0.0.1` bind ve nginx kullan.
- `.env.prod`, API anahtarları ve backend imzalama anahtarlarını Git'e ekleme.
- `NEXT_PUBLIC_*` adlı her değişkenin tarayıcıya açık olduğunu varsay.
- nginx ve container'ları root kullanıcıyla çalıştırmak zorunda değilsin;
  frontend imajı içeride UID 1001 ile çalışır.
- Firewall'da normalde yalnızca SSH, HTTP ve HTTPS açık olmalıdır.
- Yayından önce `pnpm audit:bundle` ile istemci paketinde sır sızıntısı
  olmadığını doğrula.
