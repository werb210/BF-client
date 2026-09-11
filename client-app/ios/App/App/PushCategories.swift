import Foundation
import UserNotifications

// BF_CLIENT_PUSH_ACTIONS_v144
// Registers the notification categories BF-Server stamps onto each push.
// Without this, iOS ignores aps.category entirely and the notification renders
// with no buttons — which is the state the applicant apps have been in.
//
// Identifiers must match BF-Server src/services/push/pushCategories.ts exactly.
// The applicant-facing subset only: MISSED_CALL and TASK_DUE are staff
// categories and are deliberately not registered here.

@objc final class BorealPushCategories: NSObject {

    @objc static func register() {
        let uploadNow = UNNotificationAction(
            identifier: "UPLOAD_NOW",
            title: "Upload Now",
            options: [.foreground, .authenticationRequired]
        )
        let openApplication = UNNotificationAction(
            identifier: "OPEN_APPLICATION",
            title: "Open Application",
            options: [.foreground, .authenticationRequired]
        )
        let viewOffer = UNNotificationAction(
            identifier: "VIEW_OFFER",
            title: "View Offer",
            options: [.foreground, .authenticationRequired]
        )

        let documentRequest = UNNotificationCategory(
            identifier: "DOCUMENT_REQUEST",
            actions: [uploadNow, openApplication],
            intentIdentifiers: [],
            options: []
        )
        let applicationUpdate = UNNotificationCategory(
            identifier: "APPLICATION_UPDATE",
            actions: [openApplication],
            intentIdentifiers: [],
            options: []
        )
        let offerReady = UNNotificationCategory(
            identifier: "OFFER_READY",
            actions: [viewOffer, openApplication],
            intentIdentifiers: [],
            options: []
        )
        let generic = UNNotificationCategory(
            identifier: "GENERIC",
            actions: [],
            intentIdentifiers: [],
            options: []
        )

        UNUserNotificationCenter.current().setNotificationCategories([
            documentRequest,
            applicationUpdate,
            offerReady,
            generic
        ])
    }
}
