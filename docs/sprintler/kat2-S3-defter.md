# Kat 2 sprint S3 — değişiklik defteri (2026-11-13)

Plan: `kat2-S3-plan.md` · karar: D-195 · rapor `docs/kat2-masasv-raporu-k2-s3.md` · ajan notları `kat2-S3/` ·
karar paketi https://claude.ai/artifact/5pUktw9KbYCGA2HNN6X1zz · ses sayfası https://claude.ai/artifact/EWxNQEzrvuEnA8fZ2G6Dp9

## Eski → yeni (oyuncunun gördüğü)
| Ne | Önce | Şimdi |
|---|---|---|
| Kat 2 masaları | Tek görünüş, yükseltme yok; son pad açılınca yapacak iş kalmıyordu | Sv1-5: okey tabure → döşemeli mavi sandalye, tavla sade kutu → kakma + koyu cila + pirinç + çay |
| Sv'nin getirisi | — | Masa ücreti (okey ×3,4 · tavla ×2,2) + grup daha çabuk gelir; bütün masalar Sv5'te gelir ×2,3 |
| Sv noktası | — | Kat 1 gibi: aynı anda tek masa ("başladığını bitir"), yalnız Sv görevindeyken ya da hat bitince |
| Kat 2 alt bandı | Sabit "Kat 2 — Oyun Salonu" | 18+2 görevlik şerit (ödül + ilerleme), bitince Kat 1'in "Tamamlandı" ritmi; hat bitince eski bant |
| Ses | Kat 2 sessizdi | Takırtı, zar, cezve, kasa, merdiven, duvar, Sv, ilk çıkış (+ Kat 1'in coin/servis/pad sesleri) |
| Başarım | 19 | 25 (Kat 2'den 6; Kat 1'in altı büyüğü 25'er indi, toplam 1000) |
| İngilizce garson | Waiter | Server (D-194) |

## Görünmeyen davranış
- Kayıt additive: `kat2.masaSv`, `kat2.gorev` (saveVersion artmadı; eski kayıt → Sv1, hat kayıttaki pad'e ödülsüz hizalanır).
- Görev hattı Kat 1'deyken de ilerler (Kat 2 arkada işler); Kat 2'nin kazancı yalnız Kat 2'deyken cüzdana.
- Grubun yürüyüş yolu masanın iç yanından dolaşır (dış yanda Sv çerçevesi durur) — bekçi `kat2-yol`.
- Analitik: `kat2_acildi` · `kat_gecis` · `kat2_nokta_acildi` · `masa_sv` · `kat2_gorev_tamam`.

## Test
vitest 2095 · duman 78/78 + EN 4/4 · mutasyon: A 4+2 · C 3 · D 4 · birleştirme 3 (store görev) + 1 (yol) + 3 (tek hedef/kapı) + 1 (`kat2SvCanli`).

## Kontrol tarifi (kullanıcı dilinde)
1. `npm run dev` → konsolda `__kat2(2)`: alt bantta "Okey masasına kahve götür" görünür.
2. Ocaktan kahve al, okey masasına götür → bant yarım saniye "Tamamlandı" der, sonra "Yeni okey masası aç".
3. `__kat2Sv('k2okey2', 4)` → masa çerçeveli büyük masaya döner; `__kat2Sv('k2tavla1', 4)` → tavla masası koyu cilalı.
4. Yakında okey oynanırken ara ara taş takırtısı duyulur; Kat 1'e inince kesilir.

## Kalan (sonraki tur)
- Metinler ChatGPT mikrometin turu (görev 20 + başarım 6 + "Tamamlandı" EN) · kasa doluluğu görsel işareti.
- Game Center / Play başarım girişi (Play arkadaşta — `docs/play-games-kurulum.md` 25 satır).
- Üretim kapısı (`VITE_KAT2`) + 1.1 derlemesi.
