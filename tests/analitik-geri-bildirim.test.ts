import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { analitikOlaylari, type AnalitikKesit } from '../src/game/analitik';
import { commitGovdesi, geriBildirimGonder, metniHazirla } from '../src/game/geriBildirim';
import { GERI_BILDIRIM_UZUNLUK } from '../src/config/firebase.config';

const GOREVLER = [{ id: 'q_a' }, { id: 'q_b' }, { id: 'q_c' }, { id: 'q_d' }, { id: 'q_e' }];
const k = (o: Partial<AnalitikKesit> = {}): AnalitikKesit => ({
  questIndex: 1,
  seviye: 1,
  padsDone: ['table1'],
  ogreticiAtlandi: false,
  ...o,
});

describe('analitik olayları (1.0.7)', () => {
  it('ilk kesit kıyas noktasıdır — olay doğurmaz', () => {
    // Değerler sıçrama eşiğinin ALTINDA: kural sıçrama korumasına sığınmadan sınansın.
    expect(analitikOlaylari(null, k({ questIndex: 1, seviye: 2, ogreticiAtlandi: true }), GOREVLER)).toEqual([]);
  });

  it('biten görev kimliği ve sırasıyla gider', () => {
    expect(analitikOlaylari(k(), k({ questIndex: 2 }), GOREVLER)).toEqual([
      { ad: 'gorev_tamam', parametreler: { gorev_id: 'q_b', gorev_sira: 2 } },
    ]);
  });

  it('nokta, seviye ve öğretici atlama ayrı olaylardır', () => {
    const o = analitikOlaylari(k(), k({ padsDone: ['table1', 'table2'], seviye: 2, ogreticiAtlandi: true }), GOREVLER);
    expect(o.map((x) => x.ad)).toEqual(['nokta_acildi', 'level_up', 'ogretici_atla']);
    expect(o[0].parametreler).toEqual({ nokta: 'table2' });
    expect(o[1].parametreler).toEqual({ level: 2 });
  });

  it('toplu sıçrama YÜKLEMEDİR (açılış/bulut kaydı) — olay doğurmaz', () => {
    expect(analitikOlaylari(k(), k({ questIndex: 4 }), GOREVLER)).toEqual([]);
    expect(analitikOlaylari(k(), k({ padsDone: ['table1', 'a', 'b', 'c'] }), GOREVLER)).toEqual([]);
    expect(analitikOlaylari(k(), k({ seviye: 9 }), GOREVLER)).toEqual([]);
  });

  it('geri gidiş (sıfırlama) olay doğurmaz', () => {
    expect(analitikOlaylari(k({ questIndex: 3, seviye: 4 }), k({ questIndex: 0, seviye: 1, padsDone: [] }), GOREVLER)).toEqual([]);
  });

  it('olay adları Firebase sınırında (harf/rakam/_ · ≤ 40)', () => {
    const o = analitikOlaylari(k(), k({ questIndex: 2, padsDone: ['table1', 't2'], seviye: 2, ogreticiAtlandi: true }), GOREVLER);
    for (const x of o) expect(x.ad).toMatch(/^[a-z][a-z0-9_]{0,39}$/);
  });
});

describe('geri bildirim (1.0.7)', () => {
  const baglam = { surum: '1.0.7', platform: 'web', dil: 'tr', cihaz: 'web 900x600', ilerleme: 'gorev 3' };

  it('gövdenin alanları firestore.rules listesiyle BİREBİR aynı', () => {
    const kural = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
    const liste = /hasOnly\(\[([^\]]+)\]\)/.exec(kural)?.[1];
    expect(liste).toBeTruthy();
    const izinli = [...liste!.matchAll(/'([a-z]+)'/g)].map((m) => m[1]).sort();
    const g = commitGovdesi('x', 'merhaba', baglam).writes[0];
    const gonderilen = [...Object.keys(g.update.fields), ...g.updateTransforms.map((t) => t.fieldPath)].sort();
    expect(gonderilen).toEqual(izinli);
    // Belge yalnız EKLENİR (kural update'e izin vermez) ve zaman SUNUCUDAN gelir.
    expect(g.currentDocument).toEqual({ exists: false });
    expect(g.updateTransforms).toEqual([{ fieldPath: 'zaman', setToServerValue: 'REQUEST_TIME' }]);
  });

  it('uzunluk sınırı kuraldaki sayıyla aynı', () => {
    const kural = readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8');
    expect(kural).toContain(`metin.size() <= ${GERI_BILDIRIM_UZUNLUK}`);
  });

  it('metin temizlenir; boşsa gönderilmez; uzunsa kesilir', () => {
    expect(metniHazirla('   ')).toBeNull();
    expect(metniHazirla('  selam \n')).toBe('selam');
    expect(metniHazirla('a'.repeat(GERI_BILDIRIM_UZUNLUK + 50))!.length).toBe(GERI_BILDIRIM_UZUNLUK);
  });

  it('başarı true; ret ya da ağ hatası false (fırlatmaz)', async () => {
    const yanit = (ok: boolean) => (async () => ({ ok }) as Response) as unknown as typeof fetch;
    expect(await geriBildirimGonder('x', baglam, yanit(true))).toBe(true);
    expect(await geriBildirimGonder('x', baglam, yanit(false))).toBe(false);
    const kopuk = (async () => { throw new Error('ag yok'); }) as unknown as typeof fetch;
    expect(await geriBildirimGonder('x', baglam, kopuk)).toBe(false);
  });

  it('istek REST commit adresine POST edilir', async () => {
    let adres = '';
    let govde = '';
    const yakala = (async (u: string, i: RequestInit) => { adres = u; govde = String(i.body); return { ok: true } as Response; }) as unknown as typeof fetch;
    await geriBildirimGonder('selam', baglam, yakala);
    expect(adres).toMatch(/^https:\/\/firestore\.googleapis\.com\/v1\/projects\/tea-house-tycoon\/databases\/\(default\)\/documents:commit\?key=/);
    expect(JSON.parse(govde).writes[0].update.fields.metin.stringValue).toBe('selam');
  });
});

describe('analitik izleme yapmaz (gizlilik politikası + mağaza beyanı buna dayanır)', () => {
  it('Android: reklam kimliği ve reklam sinyalleri kapalı', () => {
    const m = readFileSync(new URL('../android/app/src/main/AndroidManifest.xml', import.meta.url), 'utf8');
    for (const k of [
      'google_analytics_adid_collection_enabled',
      'google_analytics_default_allow_ad_storage',
      'google_analytics_default_allow_ad_user_data',
      'google_analytics_default_allow_ad_personalization_signals',
    ]) expect(m).toMatch(new RegExp(`android:name="${k}"\\s+android:value="false"`));
  });

  it('iOS: reklam sinyalleri ve IDFV kapalı', () => {
    const p = readFileSync(new URL('../ios/App/App/Info.plist', import.meta.url), 'utf8');
    for (const k of [
      'GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_STORAGE',
      'GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_USER_DATA',
      'GOOGLE_ANALYTICS_DEFAULT_ALLOW_AD_PERSONALIZATION_SIGNALS',
      'GOOGLE_ANALYTICS_IDFV_COLLECTION_ENABLED',
    ]) expect(p).toMatch(new RegExp(`<key>${k}</key>\\s*<false/>`));
  });
});
