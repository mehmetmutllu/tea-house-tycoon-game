import Foundation
import Capacitor

/// iCloud Key-Value Storage köprüsü (Sprint A). Oyun kaydı tek anahtarda, zarflı metin olarak durur;
/// hangi kaydın kazanacağına JS karar verir (`src/game/bulut.ts` · `kayitIleriMi`) — burada mantık yok.
///
/// Gereken: `App.entitlements` → `com.apple.developer.ubiquity-kvstore-identifier` ve Apple
/// portalında App ID'de iCloud kutusu (CloudKit'siz). Entitlement yoksa KVS yalnız yerelde kalır;
/// uygulama çökmez, kayıt da cihazlar arası gitmez.
@objc(BulutKayitPlugin)
public class BulutKayitPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BulutKayitPlugin"
    public let jsName = "BulutKayit"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "varMi", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "oku", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "yaz", returnType: CAPPluginReturnPromise)
    ]

    private let depo = NSUbiquitousKeyValueStore.default
    /// KVS sınırı: toplam 1 MB, değer başına da 1 MB. Kayıt ~1-9 KB; sınırı aşan yazım reddedilir.
    private let enBuyuk = 1_000_000

    override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(disaridanDegisti(_:)),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: depo)
        // Açılışta buluttaki son hâli çek (iOS bunu kendisi de yapar; çağrı yalnız hızlandırır).
        depo.synchronize()
    }

    /// iCloud hesabı yoksa da KVS yerelde çalışır (zararsız) — `hesap` bilgi içindir.
    @objc func varMi(_ call: CAPPluginCall) {
        call.resolve(["var": true, "hesap": FileManager.default.ubiquityIdentityToken != nil])
    }

    @objc func oku(_ call: CAPPluginCall) {
        guard let anahtar = call.getString("anahtar") else {
            call.reject("anahtar yok")
            return
        }
        if let veri = depo.string(forKey: anahtar) {
            call.resolve(["veri": veri])
        } else {
            call.resolve(["veri": NSNull()])
        }
    }

    @objc func yaz(_ call: CAPPluginCall) {
        guard let anahtar = call.getString("anahtar"), let veri = call.getString("veri") else {
            call.reject("anahtar ya da veri yok")
            return
        }
        guard veri.utf8.count < enBuyuk else {
            call.reject("kayit KVS sinirini asiyor")
            return
        }
        depo.set(veri, forKey: anahtar)
        depo.synchronize()
        call.resolve()
    }

    /// Başka cihaz yazdı ya da ilk indirme geldi. JS bugün yalnız açılışta eşitler; olay dinlemek isteyene açık.
    @objc private func disaridanDegisti(_ bildirim: Notification) {
        let neden = (bildirim.userInfo?[NSUbiquitousKeyValueStoreChangeReasonKey] as? Int) ?? -1
        notifyListeners("degisti", data: ["neden": neden])
    }
}
