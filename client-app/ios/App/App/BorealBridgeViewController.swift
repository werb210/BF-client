import Capacitor

@objc(BorealBridgeViewController)
final class BorealBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SecureCredentialsPlugin())
        // BF_CLIENT_NATIVE_WIRING_v236 - the scanner was compiled but never registered.
        bridge?.registerPluginInstance(DocumentScannerPlugin())
    }
}
