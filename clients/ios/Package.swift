// swift-tools-version: 6.0
import PackageDescription

let package = Package(
    name: "NikkyIOS",
    platforms: [.iOS(.v17)],
    products: [.library(name: "NikkyIOS", targets: ["NikkyIOS"])],
    targets: [
        .target(name: "NikkyIOS"),
        .testTarget(name: "NikkyIOSTests", dependencies: ["NikkyIOS"])
    ]
)
