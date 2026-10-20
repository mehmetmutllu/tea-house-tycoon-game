// swift-tools-version: 5.9
import PackageDescription

// Paket adı `BulutKayit` = Capacitor CLI'nin npm adından türettiği ad ("bulut-kayit" → BulutKayit);
// `cap sync` CapApp-SPM'e `.product(name: "BulutKayit", package: "BulutKayit")` yazar.
let package = Package(
    name: "BulutKayit",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "BulutKayit",
            targets: ["BulutKayitPlugin"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", from: "8.0.0")
    ],
    targets: [
        .target(
            name: "BulutKayitPlugin",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm")
            ],
            path: "ios/Sources/BulutKayitPlugin")
    ]
)
