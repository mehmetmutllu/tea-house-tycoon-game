# S5 UX denetimi — Kat 1'deki oyuncuya dönük UX, Kat 2'de karşılığı (2026-11-20)

Kural: Kat 2 = Kat 1 uyarlaması. Durum: ✓ vardı · **S5** bu sprintte eklendi · ✗ yok (öneri/sahibi).

| # | Kat 1 davranışı (kaynak) | Kat 2 | Not |
|---|---|---|---|
| 1 | Alt görev bandı + ilerleme (HUD `band`) | ✓ | `kat-bandi` (S3) |
| 2 | Görev bitti → "Tamamlandı" + boşluk (G-04, D-195) | ✓ | `k2Kutlama` |
| 3 | Hat sonu 5 sn kutlama → günlük bant | ✓ | Tarama-4 #6 |
| 4 | Kenar oku, dokununca kamera hedefe (D-038) | ✓ | `rehberHedefi` → `kat2GorevHedefi` |
| 5 | Banda dokun → kamera hedefe | ✓ | `kat2GorevOdak` |
| 6 | Yeni görev başlayınca kamera hedefe pan (tick prio 2, H1 kapısı) | **S5** | `useKat2Rehber`: kutlama bitince görev hedefine, ekrandaysa pan yok |
| 7 | Yeni yükseltme noktası → reveal bildirimi + pan (`revealKeys`, G-107) | **S5** (yarım) | nokta kümesi farkı `kat2Noktalar`/`kat2YeniNokta`; ocak için bildirim. Canlı karede pan/bildirim GÖRÜLMEDİ → devir notu |
| 8 | Alan açılınca pan (prio 3) | **S5** (7 ile aynı yol) | salon pad'i nokta kümesinde |
| 9 | Alan/kat tanıtım bildirimi (reveal toast) | **S5** G-94 | ilk çıkışta perde açılınca "Oyun Salonu — okey ve tavla masaları" ✓ karede |
| 10 | E5 öğretici satırı (ocak/servis/para) + zemin izi | **S5** kısmen G-104 | "Kahveleri buradan al" / "Bulaşıkları buraya koy" satırı + kamera; zemin izi (OgreticiIz) Kat 2'de ✗ (Scene `activeStep` Kat 1'e bağlı) |
| 11 | Bulaşık öğretme kartı + `focusDish` (G-63) | **S5** G-104 | satır + kamera leğene |
| 12 | Karakter görevi: Çaycı sekmesi spot (G-64) | ✓ (ortak) | Kat 2 görevlerinde charStat yok |
| 13 | Panel içinde istenen yükseltme düğmesi | **S5** G-93 | `char-buy … vurgu` nabız (Kat 1 + ortak panel) |
| 14 | Tepsi boşalt ipucu (`trayTipSeen`) | ✓ (bir kez, kayıtta) | Kat 2'ye gelen oyuncu görmüş olur |
| 15 | Para sesi seri ivme "tık tık" (D-122 I2) | **S5** G-106 | yığın = 4 tıklık zincir, `PARA_ZINCIR` |
| 16 | Oto-toplama 180 sn + toplu bildirim | **S5** G-124 | `otoTopla` = `money.autoCollectAfter`; Kat 1'deyken de; elle sayacı/sesi yok |
| 17 | Yükseltme sesi `purchase` | **S5** | ocak/lavabo yükseltmesi |
| 18 | Görev sesi `quest` | **S5** | Kat 2 görevi bitince |
| 19 | Pad tamamlanma sesi `padFill` | ✓ | |
| 20 | Para uçuşu + "+X" yazısı | ✓ | `kat2/Para.tsx`. Öneri (ESYA): oto-toplanan yığın uçuş/yazı üretmesin (`stats.kat2Para` artmadıysa) — bugün uzaktan oyuncuya uçar |
| 21 | Ortam sesi | **S5** G-125 | Kat 2 takırtı/zar zamanlayıcısı KALKTI (Kat 1'de ortam yok) |
| 22 | Seviye/Usta/çevrimdışı/teklif ekranları | ✓ (ortak) | |
