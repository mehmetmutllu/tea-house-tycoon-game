# Kat 2 sprint S5 — oyun testi 2026-11-20 (G-92…G-130)

Kaynak: `docs/geribildirim-oyun-testi-2026-11-20.md`. Kural: Kat 2 = Kat 1 uyarlaması (seçenek sorulmaz) · denge (config/tick/rules/kat2Dongu
sayıları) varyant kapısından geçer (ölç → kullanıcı → uygula) · görsel çatal kareyle gösterilir.

## Ortak brif (her ajan)
- Türkçe çalış, **commit YAPMA**, yalnız SENİN dosyalarına yaz. Başkasının dosyasına dokunman şartsa YAPMA, raporuna "öneri" yaz.
- Windows: Python ile yazarsan rb/wb (CRLF bekçi kırar). Duman portu: kendine ayrı port (`DUMAN_PORT=41xx`).
- Dev kancaları: `window.__game()`, `__advanceTime(sn)`, `__kat2(kat)`, `__kat2Pad(id)`, `__kat2Sv(id,sv)`, `__sinema({pos,bak,fov})`,
  `__teleport`, `__devCam`, `__setState`, `__perf()`. Dev paneli `src/components/ui/DevSandbox.tsx` (Kat 2 bölümü).
- Her düzeltme: bekçi testi (saf mantık ya da durum) + en az 2 mutasyonla yakaladığını göster · bitince `npx vitest run` + duman yeşil.
- Görsel değişiklikte önce/sonra karesi `docs/kareler/s5-<ajan>-*.png` (≤1600 px pano), bir kez bak.
- Rapor ≤ 25 satır: G numarası → ne yapıldı / dosya / test · açık kalan · kullanıcıya soru. Ara notlar `docs/sprintler/s5-<ajan>-notlar.md`.

## Ajanlar
| Ajan | G | SENİN dosyaların (ana) |
|---|---|---|
| **YAPI** Kat 2 sahne/duvar | 101 · 110 · 113 · 116 · 117 · 118 · 121 | `Kat2.tsx` (yapı/duvar/merdiven/lavabo/ocak pad yeri), `kat2/Bolme.tsx`, `kat2/MerdivenDonusum.tsx`, `kat2/parca.tsx`, Kat2 lavabo bileşenleri, `kat.ts` yalnız pad/ocak YER sabitleri |
| **ESYA** eşya/para/pad görseli | 98 · 105 · 126 · 127 · 130 | `kat2/Esya.tsx`, para yığını bileşeni, pad/işaret bileşenleri (`markerFrame.ts`, pad zemin çizimi), tavla/okey masa görseli |
| **NPC** hareket | 99 · 100 · 108 · 109 | `kat2/Grup.tsx`, `kat2/yol.ts`, `Customers.tsx`, `Waiter.tsx`, `KayActor.tsx`, garson/oyuncu çarpışması (`tick.ts`/`kat2Dongu.ts` yalnız çarpışma satırları) |
| **UX** Kat 1 eşitliği | 93 · 94 · 104 · 106 · 107 · 124 · 125 + Kat 1'de olup Kat 2'de olmayan her UX davranışının DENETİMİ | `HUD.tsx`, `hud.css`, `audio*.ts`, `kat2Ses.ts`, `onboarding.ts`, `cameraView.ts`, `Scene.tsx` (yalnız kamera odağı) |
| **OLCUM** varyantlar (kod yok) | 92 · 95 · 96 · 97 · 103 · 119 · 122 · 123 · 128 | `tools/olcum-s5-*.ts`, `docs/s5-denge-raporu.md`, `docs/olcum-s5-*.txt` |
| **TASARIM** kareler (kod yok) | 102 · 111 · 112 · 114 · 115 · 120 · 129 | `tools/s5-tasarim*.{tsx,mjs}`, `docs/kareler/s5-tasarim-*`, `docs/s5-tasarim-adaylar.md` |

## Faz 2
Orkestratör: birleştir → tam test → commit · karar paketi (OLCUM sayıları + TASARIM kareleri) → kullanıcı → uygulama.
