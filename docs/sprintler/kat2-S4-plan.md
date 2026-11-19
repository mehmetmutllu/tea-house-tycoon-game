# Kat 2 sprint S4 — plan (2026-11-19)

Kullanıcı kararları (2026-11-19, aynen): a) hedef çarpanı Kat 2 gelirine de binsin ("genel olarak geliri etkileyen özellik") ·
b) Usta 💎 bahşişi Kat 2 masalarında da olsun ("ne varsa 2'de de olsun") · c4) `k2_tavla12` (7 pad ~70 dk) ikiye bölünsün ·
c5) gölge: küçük proplarda castShadow kapalı + zayıf cihazda harita 1024 (önce/sonra karesi gösterilir) · c6) Kat 2 ön kurulumu
merdiven tamir edildikten sonra arkada · YENİ: Kat 2'de merdiven varışı duvar dibinde, görsel kötü → adaylar KAREYLE gösterilir ·
c7) ChatGPT metin turu · c8) `firestore.rules` deploy (Firebase konsolu) — **Play Console'a KESİNLİKLE dokunulmaz**.

## Faz 1 — paralel ajanlar (commit YOK, orkestratör birleştirir)
| Ajan | İş | SENİN dosyaların | DOKUNMA |
|---|---|---|---|
| M ölçüm | a + b (iki Usta formülü) + c4 bölme kolları, varyant olarak | `tools/olcum-kat2-carpan-usta.ts` · `docs/kat2-carpan-usta-raporu.md` · `docs/olcum-kat2-carpan-usta*.txt` | `src/**` (salt okunur) |
| G gölge | c5 kod + önce/sonra kareleri + perf sayısı | `src/components/three/lights.tsx` · `src/components/three/kat2/parca.tsx` · küçük prop bileşenleri (castShadow) · `src/game/cihazSinifi.ts` · `docs/kareler/golge-*` · `docs/golge-raporu-s4.md` | `Scene.tsx` · `src/game/{store,tick,rules,kat2Dongu}.ts` · config |
| P ön kurulum | c6 | `Scene.tsx` içindeki `Kat2Katman` · `docs/kat2-onkurulum-notu.md` | gölge ajanının dosyaları · oyun mantığı |
| V varış | merdiven varışı adayları (kod yok) | `tools/kat2-varis*.{tsx,html,mjs}` · `docs/kareler/kat2-varis-*` · `docs/kat2-varis-adaylar.md` | `src/**` |

Orkestratör: Firestore kural deploy (Chrome) · ChatGPT metin turu (Chrome) · Play Console için elle değişiklik listesi.

## Faz 2 — karar paketi → uygulama
Sayılar (M) + kareler (G, V) tek pakette → kullanıcı → a/b/c4 kodu (store/kat2Dongu/rules + Kat 2 Usta noktası + config) ·
bekçi + ≥2 mutasyon + final tam koşu · seçilen varış adayı.
