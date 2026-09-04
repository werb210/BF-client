import Capacitor

@objc(BorealBridgeViewController)
final class BorealBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SecureCredentialsPlugin())
    }
}
