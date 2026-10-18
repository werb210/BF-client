import UIKit
import Capacitor
import UserNotifications
import WidgetKit // BF_CLIENT_BLOCK_v590_HOME_WIDGET
import ActivityKit // BF_CLIENT_v823_LIVE_ACTIVITY
import EventKit // BF_CLIENT_v823_CALENDAR
import EventKitUI

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var privacyCover: UIView?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // BF_CLIENT_PUSH_ACTIONS_v144
        BorealPushCategories.register()
        // BF_CLIENT_v823_LIVE_ACTIVITY - report Live Activity tokens, including ones iOS starts from a push.
        if #available(iOS 16.2, *) { ApplicationStatusLive.shared.startObserving() }
        // Override point for customization after application launch.
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
        guard let window, privacyCover == nil else { return }
        let cover = UIView(frame: window.bounds)
        cover.backgroundColor = UIColor(red: 11/255, green: 31/255, blue: 58/255, alpha: 1)
        cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        let label = UILabel(frame: cover.bounds)
        label.text = "Boreal Financial"
        label.textColor = .white
        label.font = .boldSystemFont(ofSize: 24)
        label.textAlignment = .center
        label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        cover.addSubview(label)
        window.addSubview(cover)
        privacyCover = cover
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        privacyCover?.removeFromSuperview()
        privacyCover = nil
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

    // BF_CLIENT_BACKGROUND_UPLOAD_v307 - iOS relaunches the app to report finished background uploads.
    func application(_ application: UIApplication, handleEventsForBackgroundURLSession identifier: String, completionHandler: @escaping () -> Void) {
        if identifier == BackgroundUploader.sessionIdentifier {
            BackgroundUploader.shared.systemCompletion = completionHandler
            _ = BackgroundUploader.shared.session
        } else {
            completionHandler()
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}

// BF_CLIENT_IOS26_SCENE_v1 - iOS 26 requires the UIScene lifecycle; without it the
// Capacitor window never presents (blank/blue screen). Loads the same Main
// storyboard (CAPBridgeViewController) the app already used, so config parsing is
// unchanged. Kept in AppDelegate.swift so no Xcode project file edit is needed.
class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = (scene as? UIWindowScene) else { return }
        let window = UIWindow(windowScene: windowScene)
        let storyboard = UIStoryboard(name: "Main", bundle: nil)
        window.rootViewController = storyboard.instantiateInitialViewController()
        self.window = window
        window.makeKeyAndVisible()
        if let url = connectionOptions.urlContexts.first?.url {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
        }
        if let activity = connectionOptions.userActivities.first {
            _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: activity, restorationHandler: { _ in })
        }
        // BF_CLIENT_v823_QUICK_ACTIONS - launched from a Home Screen quick action.
        if let item = connectionOptions.shortcutItem, let url = ClientQuickActions.url(for: item.type) {
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
            }
        }
    }
    // BF_CLIENT_v823_QUICK_ACTIONS - long-press the app icon: Upload a document / Message my advisor / Book a call.
    func windowScene(_ windowScene: UIWindowScene, performActionFor shortcutItem: UIApplicationShortcutItem,
                     completionHandler: @escaping (Bool) -> Void) {
        guard let url = ClientQuickActions.url(for: shortcutItem.type) else { completionHandler(false); return }
        completionHandler(ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:]))
    }
    func sceneDidBecomeActive(_ scene: UIScene) {
        PrivacyCover.hide(on: window) // BF_CLIENT_SCENE_PRIVACY_v675
        SharedInboxDelivery.deliver() // BOREAL_SHARE_EXTENSION_v640
    }
    // BF_CLIENT_SCENE_PRIVACY_v675 - the app switcher shows the Boreal cover, not the client's documents.
    // The old AppDelegate hooks never fire under the scene lifecycle (iOS 26), so this lives here.
    func sceneWillResignActive(_ scene: UIScene) { PrivacyCover.show(on: window, title: "Boreal Financial") }
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
    }
}

// BF_CLIENT_v823_QUICK_ACTIONS - Info.plist UIApplicationShortcutItems types -> the app's borealclient:// links.
enum ClientQuickActions {
    static func url(for type: String) -> URL? {
        switch type {
        case "com.borealfinancial.client.upload": return URL(string: "borealclient://documents")
        case "com.borealfinancial.client.message": return URL(string: "borealclient://messages")
        case "com.borealfinancial.client.book": return URL(string: "borealclient://book-call")
        default: return nil
        }
    }
}

// BF_CLIENT_SCENE_PRIVACY_v675 - navy cover with the brand name while the app is not active.
enum PrivacyCover {
    static let tag = 0x0B0EA1
    static func show(on window: UIWindow?, title: String) {
        guard let window, window.viewWithTag(tag) == nil else { return }
        let cover = UIView(frame: window.bounds)
        cover.tag = tag
        cover.backgroundColor = UIColor(red: 11 / 255, green: 31 / 255, blue: 58 / 255, alpha: 1)
        cover.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        let label = UILabel(frame: cover.bounds)
        label.text = title
        label.textColor = .white
        label.font = .boldSystemFont(ofSize: 24)
        label.textAlignment = .center
        label.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        cover.addSubview(label)
        window.addSubview(cover)
    }
    static func hide(on window: UIWindow?) {
        window?.viewWithTag(tag)?.removeFromSuperview()
    }
}

// BF_CLIENT_BACKGROUND_UPLOAD_v307
// A background URLSession lets iOS finish uploads after the app closes or the
// phone locks, then records the outcome for the web layer to reconcile.
final class BackgroundUploader: NSObject, URLSessionTaskDelegate {
    static let shared = BackgroundUploader()
    static let sessionIdentifier = "com.boreal.client.background-upload"
    var systemCompletion: (() -> Void)?

    private let resultsKey = "boreal.backgroundUpload.results"
    private let lock = NSLock()

    lazy var session: URLSession = {
        let config = URLSessionConfiguration.background(withIdentifier: BackgroundUploader.sessionIdentifier)
        config.sessionSendsLaunchEvents = true
        config.isDiscretionary = false
        return URLSession(configuration: config, delegate: self, delegateQueue: nil)
    }()

    private var directory: URL {
        let base = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        let dir = base.appendingPathComponent("BackgroundUploads", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    func enqueue(id: String, url: URL, fileData: Data, fileName: String, mimeType: String, fields: [String: String], headers: [String: String]) throws {
        let boundary = "Boundary-\(UUID().uuidString)"
        let safeName = fileName.replacingOccurrences(of: "\"", with: "")
        var body = Data()
        for (key, value) in fields {
            body.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"\(key)\"\r\n\r\n\(value)\r\n".utf8))
        }
        body.append(Data("--\(boundary)\r\nContent-Disposition: form-data; name=\"file\"; filename=\"\(safeName)\"\r\nContent-Type: \(mimeType)\r\n\r\n".utf8))
        body.append(fileData)
        body.append(Data("\r\n--\(boundary)--\r\n".utf8))
        let bodyFile = directory.appendingPathComponent("\(id).body")
        try body.write(to: bodyFile, options: .atomic)

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        for (key, value) in headers { request.setValue(value, forHTTPHeaderField: key) }
        let task = session.uploadTask(with: request, fromFile: bodyFile)
        task.taskDescription = id
        task.resume()
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
        guard let id = task.taskDescription else { return }
        let status = (task.response as? HTTPURLResponse)?.statusCode ?? 0
        record(id: id, status: error == nil ? status : 0, error: error?.localizedDescription)
        try? FileManager.default.removeItem(at: directory.appendingPathComponent("\(id).body"))
    }

    func urlSessionDidFinishEvents(forBackgroundURLSession session: URLSession) {
        DispatchQueue.main.async {
            self.systemCompletion?()
            self.systemCompletion = nil
        }
    }

    private func record(id: String, status: Int, error: String?) {
        lock.lock(); defer { lock.unlock() }
        var all = UserDefaults.standard.dictionary(forKey: resultsKey) ?? [:]
        all[id] = ["status": status, "error": error ?? ""]
        UserDefaults.standard.set(all, forKey: resultsKey)
    }

    func results() -> [[String: Any]] {
        lock.lock(); defer { lock.unlock() }
        let all = UserDefaults.standard.dictionary(forKey: resultsKey) ?? [:]
        return all.compactMap { key, value in
            guard let entry = value as? [String: Any] else { return nil }
            return ["id": key, "status": entry["status"] as? Int ?? 0, "error": entry["error"] as? String ?? ""]
        }
    }

    func acknowledge(_ ids: [String]) {
        lock.lock(); defer { lock.unlock() }
        var all = UserDefaults.standard.dictionary(forKey: resultsKey) ?? [:]
        for id in ids { all.removeValue(forKey: id) }
        UserDefaults.standard.set(all, forKey: resultsKey)
    }

    func cancelAll() {
        session.getAllTasks { tasks in tasks.forEach { $0.cancel() } }
        try? FileManager.default.removeItem(at: directory)
        lock.lock(); defer { lock.unlock() }
        UserDefaults.standard.removeObject(forKey: resultsKey)
    }
}

@objc(BackgroundUploadPlugin)
public class BackgroundUploadPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BackgroundUploadPlugin"
    public let jsName = "BackgroundUpload"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "enqueue", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "results", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "acknowledge", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAll", returnType: CAPPluginReturnPromise)
    ]

    @objc func enqueue(_ call: CAPPluginCall) {
        guard let id = call.getString("id"),
              let urlString = call.getString("url"), let url = URL(string: urlString),
              let base64 = call.getString("fileBase64"), let fileData = Data(base64Encoded: base64),
              let fileName = call.getString("fileName") else {
            call.reject("id, url, fileBase64 and fileName are required"); return
        }
        let mimeType = call.getString("mimeType") ?? "application/octet-stream"
        let fields = (call.getObject("fields") ?? [:]).compactMapValues { $0 as? String }
        let headers = (call.getObject("headers") ?? [:]).compactMapValues { $0 as? String }
        do {
            try BackgroundUploader.shared.enqueue(id: id, url: url, fileData: fileData, fileName: fileName, mimeType: mimeType, fields: fields, headers: headers)
            call.resolve()
        } catch {
            call.reject("Could not start the background upload")
        }
    }

    @objc func results(_ call: CAPPluginCall) {
        call.resolve(["results": BackgroundUploader.shared.results()])
    }

    @objc func acknowledge(_ call: CAPPluginCall) {
        BackgroundUploader.shared.acknowledge(call.getArray("ids", String.self) ?? [])
        call.resolve()
    }

    @objc func cancelAll(_ call: CAPPluginCall) {
        BackgroundUploader.shared.cancelAll()
        call.resolve()
    }
}

// BF_CLIENT_BLOCK_v553_APP_BADGE - app icon shows the client's to-do count.
@objc(AppBadgePlugin)
public class AppBadgePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "AppBadgePlugin"
    public let jsName = "AppBadge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise)
    ]

    @objc func set(_ call: CAPPluginCall) {
        let count = max(0, call.getInt("count") ?? 0)
        DispatchQueue.main.async {
            if #available(iOS 16.0, *) {
                UNUserNotificationCenter.current().setBadgeCount(count) { _ in call.resolve() }
            } else {
                UIApplication.shared.applicationIconBadgeNumber = count
                call.resolve()
            }
        }
    }
}

// BF_CLIENT_BLOCK_v590_HOME_WIDGET - hands the portal's stage + to-do count to the widget.

@objc(ClientWidgetPlugin)
public class ClientWidgetPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ClientWidgetPlugin"
    public let jsName = "ClientWidget"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise)
    ]
    private let group = "group.com.borealfinancial.client" // BF_CLIENT_v812_COMPANY_BUNDLE_ID - company team 76VAY7UJKJ, app com.borealfinancial.client
    private let key = "boreal.client.widget"

    @objc func update(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: group) else { call.resolve(); return }
        var current: [String: Any] = [:]
        if let data = defaults.data(forKey: key),
           let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] { current = obj }
        let incomingId = call.getString("applicationId")
        // A different application replaces the old snapshot instead of mixing the two.
        if let id = incomingId, let old = current["applicationId"] as? String, old != id { current = [:] }
        if let id = incomingId { current["applicationId"] = id }
        if let stage = call.getString("stage") { current["stage"] = stage }
        if let business = call.getString("business") { current["business"] = business }
        if let todo = call.getInt("todo") { current["todo"] = max(0, todo) }
        if let action = call.getString("action") { current["action"] = action } // BF_CLIENT_WIDGET_BRAND_v631
        // BF_CLIENT_WIDGET_SELF_REFRESH_v675 - the widget asks the server itself between app launches.
        if let token = call.getString("token"), !token.isEmpty {
            let auth: [String: Any] = ["token": token, "apiBase": call.getString("apiBase") ?? "https://server.boreal.financial"]
            if let data = try? JSONSerialization.data(withJSONObject: auth) { defaults.set(data, forKey: "boreal.client.widget.auth") }
        }
        current["updatedAt"] = Date().timeIntervalSince1970
        if let data = try? JSONSerialization.data(withJSONObject: current) { defaults.set(data, forKey: key) }
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func clear(_ call: CAPPluginCall) {
        UserDefaults(suiteName: group)?.removeObject(forKey: key)
        UserDefaults(suiteName: group)?.removeObject(forKey: "boreal.client.widget.auth") // BF_CLIENT_WIDGET_SELF_REFRESH_v675
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}

// BOREAL_SHARE_EXTENSION_v640 - files saved by the share extension (Photos, Files, Mail...)
// are handed to the app's existing "shared file" screen the same way iOS delivers an
// "Open in" file. Called whenever the app comes to the front. The first delivery after a
// launch waits a moment so the web layer is listening.
enum SharedInboxDelivery {
    static var deliveredOnce = false
    static func deliver() {
        let fm = FileManager.default
        guard let base = fm.containerURL(forSecurityApplicationGroupIdentifier: "group.com.borealfinancial.client") else { return }
        let inbox = base.appendingPathComponent("SharedInbox", isDirectory: true)
        guard let folders = try? fm.contentsOfDirectory(at: inbox, includingPropertiesForKeys: nil), !folders.isEmpty else { return }
        let outDir = fm.temporaryDirectory.appendingPathComponent("Shared", isDirectory: true)
        try? fm.createDirectory(at: outDir, withIntermediateDirectories: true)
        var moved: [URL] = []
        for folder in folders {
            let files = (try? fm.contentsOfDirectory(at: folder, includingPropertiesForKeys: nil)) ?? []
            for file in files {
                let destFolder = outDir.appendingPathComponent(folder.lastPathComponent, isDirectory: true)
                try? fm.createDirectory(at: destFolder, withIntermediateDirectories: true)
                let dest = destFolder.appendingPathComponent(file.lastPathComponent)
                try? fm.removeItem(at: dest)
                if (try? fm.moveItem(at: file, to: dest)) != nil { moved.append(dest) }
            }
            try? fm.removeItem(at: folder)
        }
        if moved.isEmpty { return }
        let delay: Double = deliveredOnce ? 0.4 : 2.5
        deliveredOnce = true
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            for url in moved { _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:]) }
        }
    }
}

// BF_CLIENT_v823_LIVE_ACTIVITY
// The application's stage on the lock screen and in the Dynamic Island ("Offer · step 6 of 7 · Review your offer").
// The app starts or refreshes it whenever it reads the stage; BF-Server pushes changes while the app is closed
// (APNs liveactivity pushes, BF-Server v823). iOS ends an activity after 8 hours, so the phone also hands the server
// a push-to-start token (iOS 17.2+) and the next stage change starts a new one. Tokens go to
// POST /api/client/application-status/watch using the sign-in the home-screen widget already keeps in the App Group,
// so they are sent even when iOS starts the activity with the app in the background.
// ApplicationStatusAttributes is declared identically in ClientWidget.swift (the widget draws it).

@available(iOS 16.1, *)
struct ApplicationStatusAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var stage: String
        var step: Int
        var totalSteps: Int
        var action: String
    }
    var applicationId: String
    var business: String
}

@available(iOS 16.2, *)
@MainActor
final class ApplicationStatusLive {
    static let shared = ApplicationStatusLive()
    private var observing = false
    private var watchedActivities = Set<String>()

    /// Called at launch: report push tokens of activities iOS starts or rotates, and the push-to-start token.
    func startObserving() {
        guard !observing else { return }
        observing = true
        for activity in Activity<ApplicationStatusAttributes>.activities { watch(activity) }
        Task {
            for await activity in Activity<ApplicationStatusAttributes>.activityUpdates { self.watch(activity) }
        }
        if #available(iOS 17.2, *) {
            Task {
                for await data in Activity<ApplicationStatusAttributes>.pushToStartTokenUpdates {
                    let token = data.map { String(format: "%02x", $0) }.joined()
                    UserDefaults(suiteName: ClientAppGroup.id)?.set(token, forKey: "boreal.client.liveActivity.startToken")
                    if let applicationId = self.knownApplicationId() {
                        await self.register(applicationId: applicationId, activityToken: nil, startToken: token)
                    }
                }
            }
        }
    }

    private func watch(_ activity: Activity<ApplicationStatusAttributes>) {
        guard !watchedActivities.contains(activity.id) else { return }
        watchedActivities.insert(activity.id)
        let applicationId = activity.attributes.applicationId
        Task {
            for await data in activity.pushTokenUpdates {
                let token = data.map { String(format: "%02x", $0) }.joined()
                await self.register(applicationId: applicationId, activityToken: token, startToken: self.storedStartToken())
            }
        }
    }

    func sync(applicationId: String, business: String, state: ApplicationStatusAttributes.ContentState, final: Bool) async -> Bool {
        let existing = Activity<ApplicationStatusAttributes>.activities.first { $0.attributes.applicationId == applicationId }
        let content = ActivityContent(state: state, staleDate: nil)
        if final {
            await existing?.end(content, dismissalPolicy: .default)
            return false
        }
        if let existing {
            await existing.update(content)
            return true
        }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            // Live Activities are off for Boreal: still give the server the start token for later.
            if let start = storedStartToken() { await register(applicationId: applicationId, activityToken: nil, startToken: start) }
            return false
        }
        // Only one Boreal application on the lock screen at a time.
        for other in Activity<ApplicationStatusAttributes>.activities { await other.end(nil, dismissalPolicy: .immediate) }
        do {
            let activity = try Activity.request(attributes: ApplicationStatusAttributes(applicationId: applicationId, business: business),
                                                content: content, pushType: .token)
            watch(activity)
            return true
        } catch {
            return false
        }
    }

    func end(applicationId: String?) async {
        for activity in Activity<ApplicationStatusAttributes>.activities where applicationId == nil || activity.attributes.applicationId == applicationId {
            await activity.end(nil, dismissalPolicy: .immediate)
        }
    }

    private func storedStartToken() -> String? {
        UserDefaults(suiteName: ClientAppGroup.id)?.string(forKey: "boreal.client.liveActivity.startToken")
    }

    /// The application the home-screen widget shows (the app writes it on every refresh).
    private func knownApplicationId() -> String? {
        guard let data = UserDefaults(suiteName: ClientAppGroup.id)?.data(forKey: "boreal.client.widget"),
              let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let id = object["applicationId"] as? String, !id.isEmpty else { return nil }
        return id
    }

    func register(applicationId: String, activityToken: String?, startToken: String?) async {
        guard activityToken != nil || startToken != nil,
              let data = UserDefaults(suiteName: ClientAppGroup.id)?.data(forKey: "boreal.client.widget.auth"),
              let auth = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let token = auth["token"] as? String, !token.isEmpty else { return }
        var base = (auth["apiBase"] as? String) ?? "https://server.boreal.financial"
        while base.hasSuffix("/") { base.removeLast() }
        guard let url = URL(string: base + "/api/client/application-status/watch") else { return }
        var body: [String: Any] = ["applicationId": applicationId, "platform": "ios", "environment": ClientAppGroup.apnsEnvironment]
        if let activityToken { body["activityToken"] = activityToken }
        if let startToken { body["startToken"] = startToken }
        var request = URLRequest(url: url, timeoutInterval: 15)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        _ = try? await URLSession.shared.data(for: request)
    }
}

enum ClientAppGroup {
    static let id = "group.com.borealfinancial.client"
    /// Xcode debug builds get sandbox push tokens; TestFlight / App Store builds production ones.
    static var apnsEnvironment: String {
#if DEBUG
        return "sandbox"
#else
        return "production"
#endif
    }
}

@objc(ApplicationStatusPlugin)
public class ApplicationStatusPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ApplicationStatusPlugin"
    public let jsName = "ApplicationStatus"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "sync", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    @objc func sync(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(["shown": false]); return }
        guard let applicationId = call.getString("applicationId"), !applicationId.isEmpty else {
            call.reject("applicationId is required")
            return
        }
        let state = ApplicationStatusAttributes.ContentState(
            stage: call.getString("stage") ?? "Received",
            step: max(1, call.getInt("step") ?? 1),
            totalSteps: max(1, call.getInt("totalSteps") ?? 7),
            action: call.getString("action") ?? ""
        )
        let business = call.getString("business") ?? ""
        let final = call.getBool("final") ?? false
        Task {
            let shown = await ApplicationStatusLive.shared.sync(applicationId: applicationId, business: business, state: state, final: final)
            call.resolve(["shown": shown])
        }
    }

    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        let applicationId = call.getString("applicationId")
        Task {
            await ApplicationStatusLive.shared.end(applicationId: applicationId)
            call.resolve()
        }
    }
}

// BF_CLIENT_v823_CALENDAR - "Add to calendar" after booking a call. The system's own event editor, already filled
// in; on iOS 17+ it needs no calendar permission because the person saves the event themselves.

@objc(CalendarEventPlugin)
public class CalendarEventPlugin: CAPPlugin, CAPBridgedPlugin, EKEventEditViewDelegate {
    public let identifier = "CalendarEventPlugin"
    public let jsName = "CalendarEvent"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "add", returnType: CAPPluginReturnPromise)
    ]
    private let store = EKEventStore()
    private var pending: CAPPluginCall?

    @objc func add(_ call: CAPPluginCall) {
        guard let title = call.getString("title"), let startMs = call.getDouble("startMs"), let endMs = call.getDouble("endMs"),
              endMs > startMs else {
            call.reject("title, startMs and endMs are required")
            return
        }
        // iOS 17+ saves from the editor without calendar access; older versions need it first.
        if #available(iOS 17.0, *) {
            present(call: call, title: title, startMs: startMs, endMs: endMs)
        } else {
            store.requestAccess(to: .event) { _, _ in
                self.present(call: call, title: title, startMs: startMs, endMs: endMs)
            }
        }
    }

    private func present(call: CAPPluginCall, title: String, startMs: Double, endMs: Double) {
        DispatchQueue.main.async {
            let event = EKEvent(eventStore: self.store)
            event.title = title
            event.startDate = Date(timeIntervalSince1970: startMs / 1000)
            event.endDate = Date(timeIntervalSince1970: endMs / 1000)
            event.location = call.getString("location")
            event.notes = call.getString("notes")
            if let link = call.getString("url"), let url = URL(string: link) { event.url = url }
            event.addAlarm(EKAlarm(relativeOffset: -15 * 60))
            let editor = EKEventEditViewController()
            editor.eventStore = self.store
            editor.event = event
            editor.editViewDelegate = self
            self.pending = call
            self.bridge?.viewController?.present(editor, animated: true)
        }
    }

    public func eventEditViewController(_ controller: EKEventEditViewController, didCompleteWith action: EKEventEditViewAction) {
        controller.dismiss(animated: true)
        pending?.resolve(["saved": action == .saved])
        pending = nil
    }
}
