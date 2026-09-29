// BF_CLIENT_BLOCK_v590_HOME_WIDGET + BF_CLIENT_WIDGET_BRAND_v631
// Home-screen and lock-screen widget: Boreal Financial branding (navy, mountain mark),
// the application's stage, and a plain action line - "Upload 1 document", "Fill in 1 form"
// or "Nothing to do". The app writes the snapshot (ClientWidgetPlugin) every time the
// "What you need to do" panel refreshes.
import SwiftUI
import WidgetKit

struct ClientWidgetSnapshot: Codable {
    var applicationId: String?
    var stage: String?
    var todo: Int?
    var business: String?
    var action: String?
    var updatedAt: Double?

    static let group = "group.com.boreal.client"
    static let key = "boreal.client.widget"

    static func load() -> ClientWidgetSnapshot? {
        guard let data = UserDefaults(suiteName: group)?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(ClientWidgetSnapshot.self, from: data)
    }
}

struct ClientEntry: TimelineEntry {
    let date: Date
    let snapshot: ClientWidgetSnapshot?
}

struct ClientProvider: TimelineProvider {
    func placeholder(in context: Context) -> ClientEntry {
        ClientEntry(date: Date(), snapshot: ClientWidgetSnapshot(applicationId: nil, stage: "In Review", todo: 1, business: "Your business", action: "Upload 1 document", updatedAt: nil))
    }
    func getSnapshot(in context: Context, completion: @escaping (ClientEntry) -> Void) {
        completion(ClientEntry(date: Date(), snapshot: ClientWidgetSnapshot.load() ?? placeholder(in: context).snapshot))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<ClientEntry>) -> Void) {
        // BF_CLIENT_WIDGET_SELF_REFRESH_v675 - fetch the stage and to-do list from the server every
        // 30 minutes, so a new request shows up without opening the app.
        Task {
            let snapshot = await ClientWidgetRefresher.refresh(ClientWidgetSnapshot.load())
            completion(Timeline(entries: [ClientEntry(date: Date(), snapshot: snapshot)], policy: .after(Date().addingTimeInterval(30 * 60))))
        }
    }
}

/// "additional_steps_required" -> "Additional Steps Required"
func stageLabel(_ raw: String?) -> String {
    let s = (raw ?? "").trimmingCharacters(in: .whitespaces)
    if s.isEmpty { return "Your application" }
    return s.replacingOccurrences(of: "_", with: " ").split(separator: " ")
        .map { $0.prefix(1).uppercased() + $0.dropFirst().lowercased() }
        .joined(separator: " ")
}

/// The app sends the action line; older snapshots only have a count.
func actionText(_ s: ClientWidgetSnapshot?) -> String {
    if let a = s?.action, !a.isEmpty { return a }
    guard let n = s?.todo else { return "Open to check" }
    if n <= 0 { return "Nothing to do" }
    return n == 1 ? "1 thing to do" : "\(n) things to do"
}

func hasWork(_ s: ClientWidgetSnapshot?) -> Bool { (s?.todo ?? 0) > 0 }

func openURL(_ s: ClientWidgetSnapshot?) -> URL {
    if let id = s?.applicationId?.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed), !id.isEmpty,
       let url = URL(string: "borealclient://application/\(id)") { return url }
    return URL(string: "borealclient://home")!
}

// Boreal Financial brand colours (portal / client header navy, CMP gold).
let borealNavy = Color(red: 11 / 255, green: 31 / 255, blue: 58 / 255)
let borealGold = Color(red: 201 / 255, green: 162 / 255, blue: 74 / 255)
let borealGreen = Color(red: 134 / 255, green: 219 / 255, blue: 157 / 255)

struct BrandRow: View {
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "mountain.2.fill").font(.caption.bold())
            Text("Boreal Financial").font(.caption.bold())
        }
        .foregroundStyle(Color.white)
    }
}

struct ClientWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: ClientEntry

    var body: some View {
        let s = entry.snapshot
        switch family {
        case .accessoryCircular:
            VStack(spacing: 0) {
                Text("\(max(0, s?.todo ?? 0))").font(.title2.bold())
                Text("to do").font(.system(size: 9))
            }
        case .accessoryRectangular:
            VStack(alignment: .leading, spacing: 1) {
                Text("Boreal Financial").font(.headline)
                Text(stageLabel(s?.stage)).lineLimit(1)
                Text(actionText(s)).lineLimit(1)
            }.frame(maxWidth: .infinity, alignment: .leading)
        default:
            VStack(alignment: .leading, spacing: 6) {
                BrandRow()
                if s == nil {
                    Spacer(minLength: 0)
                    Text("Sign in to see your application").font(.subheadline).foregroundStyle(Color.white)
                } else {
                    Text("STAGE").font(.system(size: 10, weight: .semibold)).foregroundStyle(Color.white.opacity(0.6)).padding(.top, 4)
                    Text(stageLabel(s?.stage)).font(.headline).foregroundStyle(Color.white).lineLimit(2)
                    if family != .systemSmall, let b = s?.business, !b.isEmpty {
                        Text(b).font(.caption).foregroundStyle(Color.white.opacity(0.7)).lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    HStack(spacing: 6) {
                        Image(systemName: hasWork(s) ? "arrow.up.doc.fill" : "checkmark.circle.fill")
                        Text(actionText(s)).lineLimit(2)
                    }
                    .font(.subheadline.bold())
                    .foregroundStyle(hasWork(s) ? borealGold : borealGreen)
                }
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
        }
    }
}

struct ClientStageWidget: Widget {
    let kind = "BorealClientStage"
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ClientProvider()) { entry in
            ClientWidgetView(entry: entry)
                .widgetURL(openURL(entry.snapshot))
                .containerBackground(borealNavy, for: .widget)
        }
        .configurationDisplayName("My application")
        .description("Your stage and what you need to do next.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}

@main
struct ClientWidgetBundle: WidgetBundle {
    var body: some Widget { ClientStageWidget() }
}

// BF_CLIENT_WIDGET_SELF_REFRESH_v675 - the widget's own server check (action centre + stage).
struct ClientWidgetAuth: Codable {
    var token: String
    var apiBase: String
    static let key = "boreal.client.widget.auth"
    static func load() -> ClientWidgetAuth? {
        guard let data = UserDefaults(suiteName: ClientWidgetSnapshot.group)?.data(forKey: key) else { return nil }
        return try? JSONDecoder().decode(ClientWidgetAuth.self, from: data)
    }
}

enum ClientWidgetRefresher {
    /// "Upload 2 documents · Fill in 1 form" - the same words the app uses.
    static func actionLine(_ items: [[String: Any]]) -> String {
        let docs = items.filter { ($0["kind"] as? String) == "document" }.count
        let forms = items.filter { ($0["kind"] as? String) == "form" }.count
        let steps = items.count - docs - forms
        var parts: [String] = []
        if docs > 0 { parts.append(docs == 1 ? "Upload 1 document" : "Upload \(docs) documents") }
        if forms > 0 { parts.append(forms == 1 ? "Fill in 1 form" : "Fill in \(forms) forms") }
        if steps > 0 { parts.append(steps == 1 ? "Complete 1 step" : "Complete \(steps) steps") }
        return parts.isEmpty ? "Nothing to do" : parts.joined(separator: " \u{00B7} ")
    }

    static func get(_ url: String, token: String) async -> (status: Int, json: [String: Any]?) {
        guard let u = URL(string: url) else { return (0, nil) }
        var req = URLRequest(url: u, timeoutInterval: 10)
        req.setValue("Bearer " + token, forHTTPHeaderField: "Authorization")
        guard let result = try? await URLSession.shared.data(for: req) else { return (0, nil) }
        let (data, resp) = result
        let status = (resp as? HTTPURLResponse)?.statusCode ?? 0
        return (status, try? JSONSerialization.jsonObject(with: data) as? [String: Any])
    }

    static func refresh(_ snapshot: ClientWidgetSnapshot?) async -> ClientWidgetSnapshot? {
        guard var s = snapshot, let id = s.applicationId, !id.isEmpty, let auth = ClientWidgetAuth.load() else { return snapshot }
        var base = auth.apiBase
        while base.hasSuffix("/") { base.removeLast() }
        let q = id.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? id
        async let center = get(base + "/api/client/documents-needed/action-center?applicationId=" + q, token: auth.token)
        async let stage = get(base + "/api/client/application-stage?applicationId=" + q, token: auth.token)
        let (c, st) = await (center, stage)
        if c.status == 401 || st.status == 401 {
            UserDefaults(suiteName: ClientWidgetSnapshot.group)?.removeObject(forKey: ClientWidgetAuth.key)
            return s
        }
        var changed = false
        if c.status == 200, let outstanding = c.json?["outstanding"] as? [[String: Any]] {
            s.todo = min(99, outstanding.count)
            s.action = actionLine(outstanding)
            changed = true
        }
        if st.status == 200, let obj = st.json {
            let data = (obj["data"] as? [String: Any]) ?? obj
            if let p = data["pipeline_state"] as? String, !p.isEmpty { s.stage = p; changed = true }
        }
        if changed {
            s.updatedAt = Date().timeIntervalSince1970
            if let data = try? JSONEncoder().encode(s) { UserDefaults(suiteName: ClientWidgetSnapshot.group)?.set(data, forKey: ClientWidgetSnapshot.key) }
        }
        return s
    }
}
