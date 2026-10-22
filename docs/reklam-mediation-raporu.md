# Reklam mediation raporu — Liftoff + Unity (2026-10-22)

AdMob bidding'e iki ağ eklendi; amaç eCPM. Kaynak bağlam: Wordmaster/Kaktus'taki Liftoff kurulumu.

## Kurulum
| Kalem | iOS | Android |
|---|---|---|
| Liftoff App ID | `6ada176035edd12f41d31e8c` | `6ada18051ab1289974cfc248` (mağaza URL'siz) |
| Liftoff geçişli / ödüllü | `TH_GECISLI-5651637` / `TH_ODULLU-4395984` | `TH_GECISLI-2440332` / `TH_ODULLU-4274970` |
| Unity Game ID | `800407857` | `800407860` (mağaza URL'siz) |
| Unity geçişli / ödüllü | `BP_Interstitial_iOS` / `BP_Rewarded_iOS` | `BP_Interstitial_Android` / `BP_Rewarded_Android` |
| AdMob grupları | Tea House iOS Gecisli / Odullu | Tea House Android Gecisli / Odullu |

Her grupta AdMob + Liftoff + Unity (bidding). Engelleme Kontrolleri iki ağda da AÇIK (Unity'de varsayılan kapalıydı).
Unity org core ID `18968526111836`; app-ads.txt `unity.com, 158315629, DIRECT, 96cabb5fbdde37a7` + 161 RESELLER.

## Kod
- Android: `vungle 7.7.8.1` · `mediation:unity 4.20.1.0` · **`unity-ads 4.20.1` ayrıca** · okhttp için 9 `-dontwarn`.
- iOS (SPM, pbxproj): `liftoffmonetize 7.7.800` · `unity 4.20.100` (GMA 13.6.0 ile uyumlu).
- SKAdNetwork 50 → 161 (Liftoff + Unity listelerinden eksikler).
- Bekçi: `tests/ios-platform.test.ts` adaptör + SDK + SKAdNetwork; 2 mutasyonla düştüğü doğrulandı.

## Tuzaklar
1. Unity Android adaptörü SDK'yı getirmiyor → debug geçer, R8'li AAB "Missing class com.unity3d.ads" ile düşer.
2. unity-ads okhttp getirir → R8 BouncyCastle/Conscrypt/OpenJSSE missing class → `missing_rules.txt` dontwarn.
3. AdMob'da yeni kaynakta Engelleme Kontrolleri varsayılan KAPALI.
4. Unity "Enable and continue" = ek veri paylaşımı şartı; düz "Continue" yeterli (kabul edilmedi).
5. Sürüm sınırı: vungle 7.7.9+ / unity 4.21+ play-services-ads 25.5.0 ister; bizde 25.4.0.

## Etki
1.0.5 (10005) yayına girene kadar sıfır: yayındaki sürümlerde adaptör yok. Doğrulama = yayından sonra AdMob raporunda
Liftoff/Unity dolum oranı. Android AAB 24,2 MB.
