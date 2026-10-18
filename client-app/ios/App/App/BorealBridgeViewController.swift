import Capacitor
import UIKit

@objc(BorealBridgeViewController)
final class BorealBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(SecureCredentialsPlugin())
        // BF_CLIENT_NATIVE_WIRING_v236 - the scanner was compiled but never registered.
        bridge?.registerPluginInstance(DocumentScannerPlugin())
        bridge?.registerPluginInstance(BackgroundUploadPlugin()) // BF_CLIENT_BACKGROUND_UPLOAD_v307
        bridge?.registerPluginInstance(AppBadgePlugin()) // BF_CLIENT_BLOCK_v553_APP_BADGE
        bridge?.registerPluginInstance(ClientWidgetPlugin()) // BF_CLIENT_BLOCK_v590_HOME_WIDGET
        bridge?.registerPluginInstance(ApplicationStatusPlugin()) // BF_CLIENT_v823_LIVE_ACTIVITY
        bridge?.registerPluginInstance(CalendarEventPlugin()) // BF_CLIENT_v823_CALENDAR
        // BF_CLIENT_v824_PAGE_FIT - v823 zoomed the whole page with the iPhone's text size (pageZoom), but the
        // page kept its full width, so with larger text everything ran off the right edge. The page is shown at its
        // normal size again so it always fits the screen.
        if #available(iOS 14.0, *) { webView?.pageZoom = 1.0 }
    }
}
