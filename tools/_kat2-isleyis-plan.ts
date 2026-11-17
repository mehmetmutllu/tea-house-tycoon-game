/**
 * _kat2-isleyis-plan.ts — "Kat 2 işleyişi = Kat 1" turunun yerleşim planı (üstten, gerçek koordinatlar → SVG).
 * Kullanım: npx tsx tools/_kat2-isleyis-plan.ts > docs/kareler/kat2-isleyis-plan.svg
 */
import {
  KAT2_ALANLAR,
  KAT2_BULASIKCI_PAD,
  KAT2_GARSON_PADLER,
  KAT2_LAVABO_PAD,
  KAT2_LAVABO_YUK_YER,
  KAT2_MASALAR,
  KAT2_OCAK_YUK_YER,
  KAT2_ON_TEZGAH,
  KAT2_YIKAMA_YER,
  KUYU,
  OCAKLAR,
  OKEY_YARI,
  TAVLA_YARI,
} from '../src/game/kat';
import { kat2PadEtiket, kat2PadYeri } from '../src/game/kat2Dongu';
import { padCercevesi, servisCercevesi } from '../src/game/markerFrame';

const S = 22; // px / br
const X0 = -17.6;
const Z0 = -17.6;
const W = 35.2 * S;
const H = 35.2 * S;
const px = (x: number) => ((x - X0) * S).toFixed(1);
const pz = (z: number) => ((z - Z0) * S).toFixed(1);
const rect = (cx: number, cz: number, hw: number, hh: number, fill: string, stroke = 'none', extra = '') =>
  `<rect x="${px(cx - hw)}" y="${pz(cz - hh)}" width="${(2 * hw * S).toFixed(1)}" height="${(2 * hh * S).toFixed(1)}" fill="${fill}" stroke="${stroke}" ${extra}/>`;
const yazi = (x: number, z: number, t: string, renk = '#222', boy = 13, kalin = false) =>
  `<text x="${px(x)}" y="${pz(z)}" font-family="system-ui,sans-serif" font-size="${boy}" ${kalin ? 'font-weight="700"' : ''} fill="${renk}" text-anchor="middle" dominant-baseline="middle">${t}</text>`;

const o: string[] = [];
o.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">`);
o.push(`<rect width="100%" height="100%" fill="#f6f1e7"/>`);
const ALAN_AD = ['Merdiven salonu', 'Okey salonu', 'Tavla köşesi'];
const ALAN_RENK = ['#efe3cc', '#e5ead8', '#e3e6ef'];
KAT2_ALANLAR.forEach((a, i) => {
  o.push(rect((a.x0 + a.x1) / 2, (a.z0 + a.z1) / 2, (a.x1 - a.x0) / 2, (a.z1 - a.z0) / 2, ALAN_RENK[i], '#b9a989'));
  o.push(yazi((a.x0 + a.x1) / 2, i === 0 ? -0.9 : 16.4, ALAN_AD[i], '#7a6a4c', 14, true));
});
// mutfak bandı + kova
const t = KAT2_ON_TEZGAH;
o.push(rect((t.x0 + t.x1) / 2, (t.z0 + t.z1) / 2 - 3, (t.x1 - t.x0) / 2, 3.4, '#d9c7a6', '#a8916a'));
o.push(yazi((t.x0 + t.x1) / 2, -13.5, 'MUTFAK (ön tezgâh)', '#7a5f35', 13, true));
o.push(rect(KUYU.c[0], KUYU.c[2], KUYU.h[0], KUYU.h[1], '#cbbfae', '#8d7f69'));
o.push(yazi(KUYU.c[0], KUYU.c[2], 'merdiven', '#5d5242', 12));
// masalar
for (const m of KAT2_MASALAR) {
  const [hw, hh] = m.tur === 'tavla' ? TAVLA_YARI : [OKEY_YARI, OKEY_YARI];
  o.push(rect(m.x, m.z, hw, hh, m.tur === 'tavla' ? '#c9d3ea' : '#d7e3c0', '#8a9378', 'rx="6"'));
}
// ocaklar
for (const oc of OCAKLAR) {
  o.push(`<circle cx="${px(oc.al[0])}" cy="${pz(oc.al[1])}" r="${(oc.erisim * S).toFixed(1)}" fill="#f4b27a" fill-opacity="0.55" stroke="#c46a1c"/>`);
  o.push(yazi(oc.al[0], oc.al[1], 'ocak', '#7a3a00', 12, true));
}
// mevcut noktalar (gri) + yeni (renkli)
const nokta = (id: string, yer: readonly [number, number], c: { hw: number; hh: number }, renk: string, etiket: string, yeni: boolean) => {
  o.push(rect(yer[0], yer[1], c.hw, c.hh, renk, yeni ? '#1f1f1f' : '#777', `fill-opacity="${yeni ? 0.9 : 0.55}" stroke-width="${yeni ? 2 : 1}" rx="5"`));
  o.push(yazi(yer[0], yer[1] + c.hh + 0.55, etiket, yeni ? '#111' : '#555', 12, true));
};
nokta('ocakYuk', KAT2_OCAK_YUK_YER, servisCercevesi(), '#b8b0a2', 'ocak ↑', false);
nokta(KAT2_LAVABO_PAD, kat2PadYeri(KAT2_LAVABO_PAD), padCercevesi(kat2PadEtiket(KAT2_LAVABO_PAD)), '#b8b0a2', 'lavabo', false);
KAT2_GARSON_PADLER.forEach((id, i) => {
  const yer = kat2PadYeri(id);
  nokta(id, yer, padCercevesi(kat2PadEtiket(id)), '#2f6fd6', i === 1 ? 'garson 1 · 2 · 3' : '', true);
  o.push(yazi(yer[0], yer[1], String(i + 1), '#fff', 15, true));
});
nokta(KAT2_BULASIKCI_PAD, kat2PadYeri(KAT2_BULASIKCI_PAD), padCercevesi(kat2PadEtiket(KAT2_BULASIKCI_PAD)), '#1d9a6c', 'bulaşıkçı', true);
o.push(`<circle cx="${px(KAT2_YIKAMA_YER[0])}" cy="${pz(KAT2_YIKAMA_YER[1])}" r="${(1.6 * S).toFixed(1)}" fill="#1d9a6c" fill-opacity="0.25" stroke="#1d9a6c" stroke-width="2" stroke-dasharray="5 4"/>`);
o.push(yazi(KAT2_YIKAMA_YER[0], KAT2_YIKAMA_YER[1], 'yıkama', '#0d5a3e', 12, true));
nokta('lavaboYuk', KAT2_LAVABO_YUK_YER, servisCercevesi(), '#c2410c', 'lavabo ↑', true);
o.push(yazi(0, 17.1, 'Mavi/yeşil/turuncu = bu turun yeni noktaları · gri = bugün var · üstten, 1 kare = 1 br', '#555', 12));
o.push('</svg>');
console.log(o.join('\n'));
