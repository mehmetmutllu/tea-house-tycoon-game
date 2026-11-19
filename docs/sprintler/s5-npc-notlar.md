# S5 NPC ajanı — DEVİR NOTU (2026-11-20, oturum kapanışı)

## Biten (commit edilmedi)
- **G-100 kök:** `kat2/yol.ts` `merdivenY` kuyunun ÖNÜNÜ (z ≥ AGIZ.on) kuyu dibi sayıyordu → geçitten (x ±0,9) salona
  giren grup y = −3,2'de, zeminin ALTINDA yürüyordu (iz: `docs/s5-npc-iz-once.json`, t 10-13 sn). Düzeltildi.
- **G-99:** çıkan grup artık `cikisYolu` (geliş yolunun ters + yan çıkış şeridi: kuyuda +0,45, kuyunun yanında +0,75,
  geçitte +0,7, önde +0,6) ile merdivene yürüyüp kuyuda İNERKEN söner (`cikisPozu`, `SONME_SN`). Eskiden 5,5 sn yürüyüp salonda sönüyordu.
- `kat2/Grup.tsx`: iki gövde takımı (masa/çıkan), kalkışta yer değiştirir; Sv5'te (boş 1,5 sn) yeni grup önceki oynarken
  çıkış takımıyla yola çıkar (`gelisGecen`, `gerekenOnce`, `ONCE_EN_COK` 24) → hiç ortada belirmez/kaybolmaz.
- Kanıt: `docs/kareler/s5-npc-once-pano.png` / `s5-npc-sonra-pano.png` (k2s2okey1 Sv1), iz araç `tools/s5-npc-iz.mjs`.
- Testler: `tests/kat2-yol.test.ts` + `kat2-g-turu.test.ts` yeşil (16/16). tsc: Grup/yol temiz.

## Yarım / başlanmamış
- **Bekçi testi YAZILMADI** (G-99/100): öneri — (1) her geliş/çıkış örneğinde kuyu dışı ⇒ `merdivenY` = 0;
  (2) çıkış yolu oturakta başlar, kuyu dibinde (y < −2,5) biter, engel/Sv çerçevesi/kova testlerini `cikisYolu` için de koş;
  (3) `cikisPozu` söndüğü an konum KUYU içinde; (4) Sv1..5 + ilkGelis için gelişin ilk görünen u ≈ 0. Mutasyon: eski merdivenY koşulu, eski 5,5 sn çıkış.
- **G-108** kod yok. Bulgu: Kat 2 mantığında garson↔oyuncu/garson çarpışması YOK. Kat 1'de tek kaynak `tick.ts`
  garson+bulaşıkçı `navStep(..., player, obstacles)` (satır ~1036-1178) — `avoid` argümanını kaldırmak yeter (ctx `obstacles` başka yerde kullanılmıyor).
  ÖNCE ölçümleri koşuldu: `docs/s5-npc/olcum-kat1-tost-once.txt` (OLCUM=tam, t9d botu) · `docs/s5-npc/olcum-kat2-carpan-usta-once.txt` (FINAL=1 tam). SONRA koşusu değişiklikten sonra yeniden koşulacak.
- **G-109** başlanmadı (Kat 1 çaycı/usta deseni → `KahveUsta`, Kat2.tsx — dosya sahipliğini kontrol et).

## Riskler
- Uzak masada ilk grup (ilkGelis 3 sn) ve Sv5 tavla geliyor süresi kısa → gelişte koşar (hız > 1,5); mantık değişikliği gerekirse varyant kapısı.
- Gövde sayısı masa başına en çok 2 takım (eskiden 1) — perf ölçülmedi.
- Duman + tam vitest koşulmadı (paralel ajanların derleme hatası vardı: GroundMarker.tsx).
