/**
 * kasa.test.ts — K2-4 BEKÇİSİ: Kat 1'in kasası (saf `kasa.ts`).
 *
 * Kasa paranın YOLUNU değiştirir, miktarını yaratmaz: kasaya atılan her ₺ ya kasaya girer ya taşar
 * (toplam korunur), sınır asla aşılmaz, boşaltma kasayı cüzdana birebir aktarır. Sınırsız kasa
 * (`null`) bugünkü davranıştır: hiçbir şey taşmaz.
 */
import { describe, it, expect } from 'vitest';
import { D } from '../src/game/decimal';
import { kasaBosalt, kasaBosaltilir, kasaDolu, kasaDoluluk, kasaSiniri, kasayaAt } from '../src/game/kasa';

describe('kasaSiniri — Kat 1 dakika gelirinin N katı', () => {
  it('dakika × oran, aşağı yuvarlı', () => {
    expect(kasaSiniri(65.47, 10)!.toNumber()).toBe(654);
    expect(kasaSiniri(D(70), 20)!.toNumber()).toBe(1400);
  });
  it('0 / negatif / sonsuz dakika = sınırsız (bugünkü davranış)', () => {
    expect(kasaSiniri(70, 0)).toBeNull();
    expect(kasaSiniri(70, -5)).toBeNull();
    expect(kasaSiniri(70, Infinity)).toBeNull();
    expect(kasaSiniri(70, NaN)).toBeNull();
  });
});

describe('kasayaAt — sınır, taşma, korunum', () => {
  it('sınırın altında hepsi girer', () => {
    const r = kasayaAt(D(100), 50, D(500));
    expect(r.kasa.toNumber()).toBe(150);
    expect(r.giren.toNumber()).toBe(50);
    expect(r.tasan.toNumber()).toBe(0);
  });
  it('sınırı aşan kısım taşar, kasa tam sınırda durur', () => {
    const r = kasayaAt(D(480), 50, D(500));
    expect(r.kasa.toNumber()).toBe(500);
    expect(r.giren.toNumber()).toBe(20);
    expect(r.tasan.toNumber()).toBe(30);
  });
  it('dolu kasaya atılan her şey taşar', () => {
    const r = kasayaAt(D(500), 75, D(500));
    expect(r.kasa.toNumber()).toBe(500);
    expect(r.tasan.toNumber()).toBe(75);
  });
  it('sınırsız kasa hiç taşmaz', () => {
    const r = kasayaAt(D(1e9), 1e9, null);
    expect(r.kasa.toNumber()).toBe(2e9);
    expect(r.tasan.toNumber()).toBe(0);
  });
  it('0 / negatif miktar kasayı değiştirmez', () => {
    const k = D(10);
    expect(kasayaAt(k, 0, D(100)).kasa).toBe(k);
    expect(kasayaAt(k, -5, D(100)).kasa.toNumber()).toBe(10);
  });
  it('KORUNUM: rastgele akışta atılan = kasada + taşan, kasa sınırı asla aşılmaz', () => {
    let a = 12345;
    const rnd = () => ((a = (a * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const sinir = D(777);
    let kasa = D(0);
    let atilan = 0;
    let tasan = D(0);
    let cuzdan = D(0);
    for (let i = 0; i < 2000; i++) {
      const m = Math.floor(rnd() * 40);
      atilan += m;
      const r = kasayaAt(kasa, m, sinir);
      kasa = r.kasa;
      tasan = tasan.add(r.tasan);
      expect(kasa.lte(sinir)).toBe(true);
      if (i % 300 === 299) {
        const b = kasaBosalt(kasa, cuzdan);
        kasa = b.kasa;
        cuzdan = b.cuzdan;
      }
    }
    expect(cuzdan.add(kasa).add(tasan).toNumber()).toBe(atilan);
    expect(tasan.gt(0)).toBe(true);
  });
  it('Decimal büyük sayıda da çalışır (geç oyun)', () => {
    const r = kasayaAt(D('1e40'), D('5e39'), D('1.2e40'));
    expect(r.kasa.eq(D('1.2e40'))).toBe(true);
    expect(r.tasan.eq(D('3e39'))).toBe(true);
  });
});

describe('kasaBosalt / doluluk', () => {
  it('kasa cüzdana birebir boşalır', () => {
    const b = kasaBosalt(D(640), D(1000));
    expect(b.kasa.toNumber()).toBe(0);
    expect(b.cuzdan.toNumber()).toBe(1640);
    expect(b.bosalan.toNumber()).toBe(640);
  });
  it('doluluk 0..1; sınırsız kasa hiç dolmaz', () => {
    expect(kasaDoluluk(D(250), D(500))).toBe(0.5);
    expect(kasaDoluluk(D(900), D(500))).toBe(1);
    expect(kasaDoluluk(D(900), null)).toBe(0);
    expect(kasaDolu(D(500), D(500))).toBe(true);
    expect(kasaDolu(D(499), D(500))).toBe(false);
    expect(kasaDolu(D(1e9), null)).toBe(false);
  });
});

describe('kasaBosaltilir — iki kol', () => {
  const yer = [3.5, -9.2] as const;
  it('iniş kolu: yalnız Kat 1\'e indiği anda', () => {
    expect(kasaBosaltilir('inis', { kat: 1, indi: true, x: 0, z: 10 }, yer, 1)).toBe(true);
    expect(kasaBosaltilir('inis', { kat: 1, indi: false, x: 3.5, z: -9.2 }, yer, 1)).toBe(false);
    expect(kasaBosaltilir('inis', { kat: 2, indi: true, x: 0, z: 0 }, yer, 1)).toBe(false);
  });
  it('yürüme kolu: Kat 1\'de kasanın erişiminde', () => {
    expect(kasaBosaltilir('yurume', { kat: 1, indi: false, x: 3.0, z: -9.0 }, yer, 1)).toBe(true);
    expect(kasaBosaltilir('yurume', { kat: 1, indi: true, x: 0, z: -8.4 }, yer, 1)).toBe(false);
    expect(kasaBosaltilir('yurume', { kat: 2, indi: false, x: 3.5, z: -9.2 }, yer, 1)).toBe(false);
  });
});
