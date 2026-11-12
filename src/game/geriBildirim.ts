/**
 * geriBildirim.ts — Ayarlar'daki "Geri bildirim gönder" (1.0.7).
 *
 * Firestore'a REST ile tek belge EKLENİR (`documents:commit`, `exists:false`); yerel SDK yok.
 * Kural (`firestore.rules`) alan listesini, metin uzunluğunu ve `zaman`ın SUNUCU saati olmasını
 * zorlar — istemci saati yazılamaz, bu yüzden `zaman` dönüşümle (`REQUEST_TIME`) gelir.
 *
 * Kişisel veri yok: e-posta/hesap sorulmaz; cihaz yalnız kaba sınıf (platform + ekran), sürüm
 * ve ilerleme özeti (hangi görevdeydi) eklenir — geri bildirimi bağlamıyla okumak için.
 */
import { Capacitor } from '@capacitor/core';
import { FIREBASE, GERI_BILDIRIM_UZUNLUK } from '../config/firebase.config';

export interface GeriBildirimBaglam {
  surum: string;
  platform: string;
  dil: string;
  cihaz: string;
  ilerleme: string;
}

/** Gönderilecek metni temizler; boşsa `null` (gönderilmez). */
export function metniHazirla(ham: string): string | null {
  const m = ham.replace(/\s+$/g, '').replace(/^\s+/g, '').slice(0, GERI_BILDIRIM_UZUNLUK);
  return m.length > 0 ? m : null;
}

/** REST gövdesi (saf) — bekçi alan listesinin kuralla aynı kaldığını buradan doğrular. */
export function commitGovdesi(id: string, metin: string, b: GeriBildirimBaglam) {
  const ad = `projects/${FIREBASE.projectId}/databases/(default)/documents/geribildirim/${id}`;
  return {
    writes: [
      {
        update: {
          name: ad,
          fields: {
            metin: { stringValue: metin },
            surum: { stringValue: b.surum },
            platform: { stringValue: b.platform },
            dil: { stringValue: b.dil },
            cihaz: { stringValue: b.cihaz },
            ilerleme: { stringValue: b.ilerleme },
          },
        },
        currentDocument: { exists: false },
        updateTransforms: [{ fieldPath: 'zaman', setToServerValue: 'REQUEST_TIME' }],
      },
    ],
  };
}

export function cihazOzeti(): string {
  const ekran = typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '?';
  return `${Capacitor.getPlatform()} ${ekran}`;
}

function rastgeleKimlik(): string {
  const a = new Uint8Array(10);
  crypto.getRandomValues(a);
  return Array.from(a, (x) => x.toString(16).padStart(2, '0')).join('');
}

/** Gönderir. Başarıda `true`; ağ yok / kural reddi / zaman aşımında `false` (hata fırlatmaz). */
export async function geriBildirimGonder(
  metin: string,
  baglam: GeriBildirimBaglam,
  getir: typeof fetch = fetch,
): Promise<boolean> {
  const url =
    `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents:commit` +
    `?key=${FIREBASE.apiKey}`;
  const iptal = new AbortController();
  const sure = setTimeout(() => iptal.abort(), 15_000);
  try {
    const yanit = await getir(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(commitGovdesi(rastgeleKimlik(), metin, baglam)),
      signal: iptal.signal,
    });
    return yanit.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(sure);
  }
}
