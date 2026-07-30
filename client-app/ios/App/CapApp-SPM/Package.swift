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
        .package(url: "https://github.com/ionic-team/capacitor-swift-pm.git", exact: "8.4.0"),
        .package(name: "CapacitorApp", path: "../../../../node_modules/@capacitor/app"),
        .package(name: "CapacitorPreferences", path: "../../../../node_modules/@capacitor/preferences"),
        .package(name: "CapacitorCamera", path: "../../../../node_modules/@capacitor/camera"),
        .package(name: "CapacitorFilesystem", path: "../../../../node_modules/@capacitor/filesystem"),
        .package(name: "CapacitorPushNotifications", path: "../../../../node_modules/@capacitor/push-notifications"),
        .package(name: "CapacitorAppLauncher", path: "../../../../node_modules/@capacitor/app-launcher"),
        .package(name: "CapacitorNetwork", path: "../../../../node_modules/@capacitor/network"),
        .package(name: "CapacitorDevice", path: "../../../../node_modules/@capacitor/device"),
        .package(name: "CapacitorStatusBar", path: "../../../../node_modules/@capacitor/status-bar"),
        .package(name: "CapacitorSplashScreen", path: "../../../../node_modules/@capacitor/splash-screen"),
        .package(name: "CapacitorKeyboard", path: "../../../../node_modules/@capacitor/keyboard")
    ],
    targets: [
        .target(
            name: "CapApp-SPM",
            dependencies: [
                .product(name: "Capacitor", package: "capacitor-swift-pm"),
                .product(name: "Cordova", package: "capacitor-swift-pm"),
                .product(name: "CapacitorApp", package: "CapacitorApp"),
                .product(name: "CapacitorPreferences", package: "CapacitorPreferences"),
                .product(name: "CapacitorCamera", package: "CapacitorCamera"),
                .product(name: "CapacitorFilesystem", package: "CapacitorFilesystem"),
                .product(name: "CapacitorPushNotifications", package: "CapacitorPushNotifications"),
                .product(name: "CapacitorAppLauncher", package: "CapacitorAppLauncher"),
                .product(name: "CapacitorNetwork", package: "CapacitorNetwork"),
                .product(name: "CapacitorDevice", package: "CapacitorDevice"),
                .product(name: "CapacitorStatusBar", package: "CapacitorStatusBar"),
                .product(name: "CapacitorSplashScreen", package: "CapacitorSplashScreen"),
                .product(name: "CapacitorKeyboard", package: "CapacitorKeyboard")
            ]
        )
    ]
)
