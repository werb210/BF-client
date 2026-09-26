import Capacitor

@objc(BorealBridgeViewController)
final class BorealBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SecureCredentialsPlugin())
        // BF_CLIENT_NATIVE_WIRING_v236 - the scanner was compiled but never registered.
        bridge?.registerPluginInstance(DocumentScannerPlugin())
        bridge?.registerPluginInstance(BackgroundUploadPlugin()) // BF_CLIENT_BACKGROUND_UPLOAD_v307
        bridge?.registerPluginInstance(AppBadgePlugin()) // BF_CLIENT_BLOCK_v553_APP_BADGE
    }
}
