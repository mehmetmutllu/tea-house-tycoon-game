/**
 * audioWeb.ts — `audio.ts`in TARAYICI arka ucu. Saf çekirdekten AYRI dosya, çünkü burada
 * `window`/`AudioContext` VAR; çekirdek testte bu dosyaya hiç dokunmaz.
 *
 * E4'TE NE DEĞİŞTİ: bu dosya artık SES ÜRETMİYOR, yalnız ÇALIYOR.
 * E3'te sentez burada, WebAudio düğüm zinciriyle kuruluydu (osilatör + kazanç rampaları). Sonuç:
 * ölçüm aracı o zinciri taklit etmek zorunda kaldı ve "ölçülen ses" ile "duyulan ses" iki ayrı
 * kod oldu; aralarındaki sapmayı hiçbir şey tutmuyordu. Artık örnekler `audioSynth.ts`te (saf,
 * deterministik) üretiliyor, burada yalnızca bir `AudioBuffer`a kopyalanıp çalınıyor. Ölçüm aracı
 * da aynı fonksiyonu çağırıyor — ölçülen şey birebir duyulan şey.
 *
 * DOSYA OPSİYONELDİR (E4 · D-013'ün sesteki karşılığı): sentez NİHAİ sestir. Bir `.ogg`
 * bırakılırsa üstüne yazar. Arka uç dosyayı bir kez denemeye çalışır; 404 alırsa o yolu "yok"
 * diye işaretler ve BİR DAHA denemez — yoksa her para toplamada başarısız bir ağ isteği çıkardı.
 */
import type { SesArkaUc, SesId } from './audio';
import { ORNEKLEME, perdele, seslendir, type Katman } from './audioSynth';

/** Yüklenmiş dosya tamponları. `null` = denendi ve YOK (bir daha denenmez). */
const dosyaTamponlari = new Map<string, AudioBuffer | null>();
/**
 * Sentezlenmiş tamponlar. Anahtar `id:yarimSes` — seri ivmesinin (D-122 · I2) her basamağı
 * AYRI bir tampondur, çünkü perdeleme örnek düzeyinde yapılır (frekans çarpanı), çalma hızıyla
 * değil: `playbackRate` kullanılsaydı perdeyle birlikte SÜRE de kısalır ve merdiven tırmandıkça
 * madenî tık giderek "cık"a dönerdi. Basamak sayısı küçük (tavan 5 → en çok 6 tampon/ses).
 */
const sentezTamponlari = new Map<string, AudioBuffer>();

/**
 * TEK BAĞLAM, modül düzeyinde. Müzik döngüsü (`musicWeb.ts`) da bunu kullanıyor: her
 * `AudioContext` mobilde kendi donanım akışını tutar ve ikinci bir bağlam açmanın gerçek bir
 * pil maliyeti var. Bağlam ilk çağrıda kurulur — import anında DEĞİL, çünkü kurulum bir
 * kullanıcı jesti beklemeyen tarayıcılarda uyarı basar.
 */
let ctx: AudioContext | null = null;

export function sesBaglami(): AudioContext | null {
  if (ctx) return ctx;
  if (typeof window === 'undefined') return null;
  const Ctor = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
    .AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

/**
 * Bağlamı her dokunuşta UYANDIR — motorların `kilidiAc`ı yalnız İLK dokunuşta çalışır, ama iOS
 * WebView'u bağlamı sonradan da durdurur: telefon çağrısı, Siri, arka plana geçiş bağlamı
 * `interrupted` (Safari'ye özgü durum) ya da `suspended` yapar ve kendiliğinden geri açmaz.
 * Bağlam henüz kurulmadıysa hiçbir şey yapmaz (kurulumu ilk ses çağrısı yapar).
 */
export function sesiUyandir(): void {
  if (sesDuraklatildi()) return;
  if (ctx && ctx.state !== 'running' && ctx.state !== 'closed') void ctx.resume().catch(() => {});
}

/**
 * SUSTURMA NEDENLERİ (Sprint A · perf #5): uygulama arka planda (`gizli`) ya da ekranda tam ekran
 * reklam var (`reklam`). Herhangi biri sürdükçe bağlam ASKIDA: müzik döngüsü yerinde durur, olay
 * sesleri çalınmaz (dönüşte birikmiş sesler bir anda patlamasın), Android'de arka planda ses/pil
 * harcanmaz. Son neden kalkınca bağlam — yalnız onu BİZ askıya aldıysak — kaldığı yerden sürer.
 */
export type SusturmaNedeni = 'gizli' | 'reklam';
const susturma = new Set<SusturmaNedeni>();
let bizAskiyaAldik = false;

export const sesDuraklatildi = (): boolean => susturma.size > 0;

export function sesDuraklat(neden: SusturmaNedeni, aktif: boolean): void {
  if (aktif) susturma.add(neden);
  else susturma.delete(neden);
  if (!ctx || ctx.state === 'closed') return;
  if (susturma.size > 0) {
    if (ctx.state !== 'suspended') {
      bizAskiyaAldik = true;
      void ctx.suspend().catch(() => {});
    }
  } else if (bizAskiyaAldik) {
    bizAskiyaAldik = false;
    void ctx.resume().catch(() => {});
  }
}

export function webSesArkaUcu<K extends string = SesId>(): SesArkaUc<K> {
  const baglam = sesBaglami;

  /**
   * Tamponu çal. Sesin KENDİ kazancı katmanlarda zaten var; buradaki `gain` oyuncunun ayardan
   * seçtiği SEVİYE (0..1). Ayrı bir düğümle uygulanıyor, tamponu yeniden üretmeden — aksi
   * halde her seviye değişiminde bütün önbellek çöpe giderdi.
   */
  const calTampon = (c: AudioContext, tampon: AudioBuffer, hiz = 1, gain = 1): void => {
    const src = c.createBufferSource();
    src.buffer = tampon;
    if (hiz !== 1) src.playbackRate.value = hiz;
    if (gain >= 1) {
      src.connect(c.destination);
    } else {
      const g = c.createGain();
      g.gain.value = gain;
      src.connect(g);
      g.connect(c.destination);
    }
    src.start();
  };

  /** Dosyayı arka planda getirip önbelleğe koyar. İlk çağrıda çalmaz — o an sentez çalar. */
  const yukle = (yol: string): void => {
    if (dosyaTamponlari.has(yol)) return;
    dosyaTamponlari.set(yol, null); // "deneniyor / yok" — ikinci bir istek çıkmasın
    const c = baglam();
    if (!c) return;
    fetch(yol)
      .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error('yok'))))
      .then((buf) => c.decodeAudioData(buf))
      .then((b) => { dosyaTamponlari.set(yol, b); })
      .catch(() => { /* dosya yok → sentez kalıcı olarak çalar (nihai ses zaten o) */ });
  };

  return {
    simdi: () => (baglam()?.currentTime ?? performance.now() / 1000),

    kilidiAc() {
      if (sesDuraklatildi()) return;
      const c = baglam();
      if (c && c.state !== 'running' && c.state !== 'closed') void c.resume().catch(() => {});
    },

    dosyaCal(yol, gain, yarimSes) {
      if (sesDuraklatildi()) return true; // susturuldu: ne dosya ne sentez
      const c = baglam();
      if (!c) return false;
      const buf = dosyaTamponlari.get(yol);
      if (!buf) {
        yukle(yol);
        return false; // bu sefer sentez çalacak
      }
      // Dosyada perdeleme ancak çalma hızıyla yapılabilir (örnekler hazır, katman yok).
      // Sentezdeki `perdele` ile AYNI oranı uygular — S17 §5: basamak kaynaktan bağımsızdır.
      calTampon(c, buf, Math.pow(2, yarimSes / 12), gain);
      return true;
    },

    sentezCal(id: K, katmanlar: readonly Katman[], yarimSes: number, gain: number) {
      if (sesDuraklatildi()) return;
      const c = baglam();
      if (!c) return;
      const anahtar = `${id}:${yarimSes}`;
      let tampon = sentezTamponlari.get(anahtar);
      if (!tampon) {
        const ornekler = seslendir(perdele(katmanlar, yarimSes));
        // Bağlamın örnekleme hızı cihazdan cihaza değişir (44100/48000). Tampon KENDİ hızıyla
        // yaratılır; WebAudio çalarken yeniden örnekler. Sesin perdesi böylece cihaza göre
        // kaymaz — sabit hız yazılsaydı 48 kHz'lik bir cihazda her ses tizleşirdi.
        tampon = c.createBuffer(1, ornekler.length, ORNEKLEME);
        tampon.getChannelData(0).set(ornekler);
        sentezTamponlari.set(anahtar, tampon);
      }
      calTampon(c, tampon, 1, gain);
    },
  };
}
