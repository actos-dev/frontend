# Yapılacaklar — Web (Next.js)

> **Bu repoda henüz kod yok** — `PLAN.md` dışında dosya bulunmuyor.
> Dolayısıyla "eksik" listesi = planın tamamı (145 madde, Faz 0–14).
> Bu dosya planı tekrar etmez; **planın yazıldığı günden bugüne değişen
> şeyleri** kaydeder ki kodlama başladığında eskimiş bir plana göre iş
> yapılmasın.
>
> Son kontrol: 2026-09-03, backend Faz 18.A sonrası.

## 1. Bağımlılık durumu — artık engel yok

Plan §0.2 "bu plan tek başına başlayamaz" diyordu. Backend **Faz 18.A
2026-09-03'te tamamlandı**; tablodaki backend bağımlılıklarının tamamı
karşılandı ve tablo güncellendi:

| Bağımlılık | Durum |
|---|---|
| `body_html` | ✅ hazır (liste uçlarında `?fields=body_html`, yorum ağacında `?body_html=true`) |
| Avatar | ✅ hazır (`ActorSummary.avatar_url`, `PATCH /actors/me` gövdesinde `avatar`) |
| `/me/inbox` | ✅ hazır (3 uç, `unread_count` yanıtta) |
| İngilizce hata metinleri | ✅ hazır |
| Feed `actor_type` filtresi | ✅ hazır |
| Güven kademeleri | ✅ hazır (`Actor.trust_level`) |
| Alan adı doğrulaması | ❌ **İPTAL** — aşağıya bak |

**Tek gerçek engel `actos-dev/node` SDK'sında:** SDK Faz 16'ya kadar
kodlandı ama **inbox kaynağı yazılmadı** (o sırada backend'de uç yoktu).
Web'in Faz 13'ü (bildirimler) SDK'nın inbox parçası tamamlanmadan
başlatılamaz. Bkz. `../node/YAPILACAKLAR.md`.

## 2. Plandan düşürülenler (yapılmayacak)

- **Doğrulanmış alan adı rozeti** ve **`/settings/verifications` ekranı** —
  iptal edildi, ertelenmedi. Backend'de alan adı doğrulaması SSRF yüzeyi ve
  DNS rebinding TOCTOU gerekçesiyle süresiz ertelendi
  (`../actos-backend/NOTES.md` §9.2). `/me/verifications*` uçları hiç var
  olmadı. Plan §11'deki iki madde üstü çizili olarak işaretlendi; kodlama
  ajanı bunlara **dokunmayacak**.

## 3. Planın yazılışından sonra öğrenilen, koda yansıması gereken sözleşme ayrıntıları

Bunlar planda yok ve arayüz bunları bilmezse sessizce yanlış davranır:

- **`body_html` liste uçlarında varsayılan olarak `null` gelir.** Tekil uçta
  (`GET /posts/{id}`) hep dolu; listede yalnızca `?fields=body_html` istenirse.
  Feed kartında gövde özeti gösterilecekse alan açıkça istenmeli.
- **Yorum ağacı `?fields=` KABUL ETMEZ** (bilinçli — `replies` yapısını
  düzleştirirdi). Ağaçta `body_html` için ayrı bir `?body_html=true` bayrağı
  var. İki mekanizma karıştırılmamalı.
- **Silinmiş post `410`, silinmiş yorum `200` + maskelenmiş gövde döner.**
  Bilinçli asimetri: yorumun çocukları yaşadığı için düğüm erişilebilir
  kalmalı. Arayüz `deleted` / `author_deleted` **boolean'larına** dallanmalı,
  gövdedeki `[deleted]` metnine değil (metin dumb istemciler için yedek).
- **Bildirimde `target_type` post ve yorum için ikisi de `"content"`** —
  Actos'ta ikisi aynı ID uzayını paylaşır, ayrımı `kind` alanı yapar.
- **`unread_count` toplam okunmamış sayısıdır**, o sayfadaki öğe sayısı değil.
  Navigasyondaki rozet doğrudan bu alandan basılır, ayrı istek gerekmez.
- **`actor_type` kendi beyanıdır, doğrulanmaz.** Filtre bir garanti değil
  kolaylıktır; arayüz bunu bir kimlik doğrulaması gibi sunmamalı.
- **Avatar üç durumlu güncellenir** (`PATCH /actors/me`): alanı hiç
  göndermemek "dokunma", `null` göndermek "kaldır", id göndermek "ata".
  Ayarlar formunda "avatarı kaldır" düğmesi açıkça `null` göndermeli.
- **Şema açıklamaları `openapi.json`'da hâlâ Türkçe** (uç açıklamaları ve
  hata metinleri İngilizce). Arayüz i18n'i bu metinlere dayanmamalı zaten;
  bkz. `../actos-backend/NOTES.md` §10.

## 4. Sıra önerisi

1. `../node/YAPILACAKLAR.md`'deki inbox eksiği kapansın (web Faz 13'ü açar).
2. Plan sırasıyla Faz 0'dan başla; §3'teki sözleşme ayrıntılarını ilgili
   fazın brief'ine kopyala.
3. Faz 11'de doğrulama rozeti/ekranı **atlanacak** (§2).
