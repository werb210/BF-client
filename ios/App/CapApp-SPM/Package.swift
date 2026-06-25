// swift-tools-version: 5.9
import PackageDescription

// DO NOT MODIFY THIS FILE - managed by Capacitor CLI commands
let package = Package(
    name: "CapApp-SPM",
    platforms: [.iOS(.v15)],
    products: [
        .library(
            name: "CapApp-SPM",
            targets: ["CapApp-SPM"])
    ],
    dependencies: [
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.1.0"),
        .package(name: "capacitor-camera", path: "../../../../node_modules/@capacitor/camera"),
        .package(name: "capacitor-filesystem", path: "../../../../node_modules/@capacitor/filesystem"),
        .package(name: "capacitor-push-notifications", path: "../../../../node_modules/@capacitor/push-notifications"),
        .package(name: "capacitor-app-launcher", path: "../../../../node_modules/@capacitor/app-launcher"),
        .package(name: "capacitor-network", path: "../../../../node_modules/@capacitor/network"),
        .package(name: "capacitor-device", path: "../../../../node_modules/@capacitor/device"),
        .package(name: "capacitor-status-bar", path: "../../../../node_modules/@capacitor/status-bar"),
        .package(name: "capacitor-splash-screen", path: "../../../../node_modules/@capacitor/splash-screen"),
        .package(name: "capacitor-keyboard", path: "../../../../node_modules/@capacitor/keyboard")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorCamera", package: "capacitor-camera"),
                .product(name: "CapacitorFilesystem", package: "capacitor-filesystem"),
                .product(name: "CapacitorPushNotifications", package: "capacitor-push-notifications"),
                .product(name: "CapacitorAppLauncher", package: "capacitor-app-launcher"),
                .product(name: "CapacitorNetwork", package: "capacitor-network"),
                .product(name: "CapacitorDevice", package: "capacitor-device"),
                .product(name: "CapacitorStatusBar", package: "capacitor-status-bar"),
                .product(name: "CapacitorSplashScreen", package: "capacitor-splash-screen"),
                .product(name: "CapacitorKeyboard", package: "capacitor-keyboard")
            ]
        )
    ]
)
