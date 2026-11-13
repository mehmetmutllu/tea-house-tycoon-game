# Ajan C — Kat 2 sesleri (ara not)

**Yeni sesler (2 aday, oyunda Aday 1):** k2takirti (okey taşı) · k2zar (tavla) · k2cezve (fokurtu/hazır) ·
k2kasa (Kat 1 kasası boşaldı) · k2merdiven (geçiş başı) · k2duvar (salon açıldı = `kat2AcikAlan` arttı) ·
k2sv (masa Sv toplamı arttı) · k2yeniKat (Kat 2'ye ilk varış, oturumda bir kez).
**Kat 1'den aynen:** coin (yığın toplandı) · serve (tepsi azaldı + masa kahve aldı) · pour (ocaktan kahve) · padFill.

**Dosyalar:** `src/game/audioKat2.ts` (aday kataloğu + `KAT2_SECIM` + yakınlık) · `src/game/kat2Ses.ts` (kesit,
olaylar, ortam zamanlayıcısı, `kat2SesBaslat`) · `src/game/audio.ts`/`audioWeb.ts` geriye uyumlu genelleştirme
(`sesMotoruKur(…, katalog)`, `cal(id, kazanc?)`) · `tests/kat2-ses.test.ts` · `tools/kat2-ses-dinle.html`.

**Bağlama (Claude takar):** `src/App.tsx`, `const sesiCoz = sesiBagla();` satırının altına
`const kat2SesCoz = kat2SesBaslat();` ve temizlikte `kat2SesCoz();` (import `./game/kat2Ses`).

**Seçim:** kullanıcı adayı seçince yalnız `audioKat2.ts` → `KAT2_SECIM` değişir.

**Notlar:** Sv sesi `kat2.masaSv` toplamından (A'nın alanı; yoksa 0 → sessiz) — `olay.svAtlayan` store'a yazılmadığı
için kullanılmadı. Kat 1 masa yükseltmesi `purchase` çalıyor; Sv atlama için yeni ses istendi (Aday 1 aynı tahta tok
+ farklı jest). "Yeni kat": merdiven bu oturumda açıldıysa ya da yalnız hazır pad'ler varsa; açılış ile ilk çıkış
arasında uygulama kapanıp bir pad alındıysa çalmaz (kabul edilen kenar durum).
