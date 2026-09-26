import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var privacyCover: UIView?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        // BF_CLIENT_PUSH_ACTIONS_v144
        BorealPushCategories.register()
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
    }
    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url else { return }
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, open: url, options: [:])
    }
    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        _ = ApplicationDelegateProxy.shared.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
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
