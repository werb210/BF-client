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
        // BF_CLIENT_v823_LARGE_TEXT - follow the iPhone's text size (Settings > Display & Brightness > Text Size).
        applyTextSize()
        NotificationCenter.default.addObserver(self, selector: #selector(textSizeChanged),
                                               name: UIContentSizeCategory.didChangeNotification, object: nil)
    }

    // BF_CLIENT_v823_LARGE_TEXT - the web pages use fixed pixel sizes, so the whole page is zoomed in step with the
    // system text size (Large, the default, = 100%; up to 140% for the accessibility sizes). Layout reflows; nothing
    // is cut off because the page width shrinks to match.
    static func zoom(for category: UIContentSizeCategory) -> CGFloat {
        switch category {
        case .extraSmall: return 0.9
        case .small: return 0.95
        case .medium: return 0.97
        case .large: return 1.0
        case .extraLarge: return 1.08
        case .extraExtraLarge: return 1.16
        case .extraExtraExtraLarge: return 1.24
        case .accessibilityMedium: return 1.3
        case .accessibilityLarge: return 1.34
        default: return category.isAccessibilityCategory ? 1.4 : 1.0
        }
    }

    private func applyTextSize() {
        guard #available(iOS 14.0, *) else { return }
        webView?.pageZoom = Self.zoom(for: traitCollection.preferredContentSizeCategory)
    }

    @objc private func textSizeChanged() {
        applyTextSize()
    }
}
