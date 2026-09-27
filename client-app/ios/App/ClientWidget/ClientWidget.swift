// BF_CLIENT_BLOCK_v590_HOME_WIDGET
// Home-screen and lock-screen widget: where the application is and how many things the
// client still has to do. The app writes the snapshot (ClientWidgetPlugin) whenever the
// client portal loads; until push exists it refreshes when the app is opened.
import SwiftUI
import WidgetKit

struct ClientWidgetSnapshot: Codable {
    var applicationId: String?
    var stage: String?
    var todo: Int?
    var business: String?
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
        ClientEntry(date: Date(), snapshot: ClientWidgetSnapshot(applicationId: nil, stage: "In Review", todo: 1, business: "Your business", updatedAt: nil))
    }
    func getSnapshot(in context: Context, completion: @escaping (ClientEntry) -> Void) {
        completion(ClientEntry(date: Date(), snapshot: ClientWidgetSnapshot.load() ?? placeholder(in: context).snapshot))
    }
    func getTimeline(in context: Context, completion: @escaping (Timeline<ClientEntry>) -> Void) {
        let entry = ClientEntry(date: Date(), snapshot: ClientWidgetSnapshot.load())
        completion(Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60 * 60))))
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

func todoLine(_ n: Int?) -> String {
    guard let n = n else { return "Open to check" }
    if n <= 0 { return "Nothing to do" }
    return n == 1 ? "1 thing to do" : "\(n) things to do"
}

func openURL(_ s: ClientWidgetSnapshot?) -> URL {
    if let id = s?.applicationId?.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed), !id.isEmpty,
       let url = URL(string: "borealclient://application/\(id)") { return url }
    return URL(string: "borealclient://home")!
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
                Text("Boreal").font(.headline)
                Text(stageLabel(s?.stage)).lineLimit(1)
                Text(todoLine(s?.todo)).lineLimit(1)
            }.frame(maxWidth: .infinity, alignment: .leading)
        default:
            VStack(alignment: .leading, spacing: 6) {
                Text("Boreal").font(.caption.bold()).foregroundStyle(.secondary)
                if s == nil {
                    Text("Sign in to see your application").font(.subheadline)
                } else {
                    Text(stageLabel(s?.stage)).font(.headline).lineLimit(2)
                    if family != .systemSmall, let b = s?.business, !b.isEmpty {
                        Text(b).font(.subheadline).foregroundStyle(.secondary).lineLimit(1)
                    }
                    Spacer(minLength: 0)
                    Text(todoLine(s?.todo))
                        .font(.subheadline.bold())
                        .foregroundStyle((s?.todo ?? 0) > 0 ? Color.orange : Color.green)
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
                .containerBackground(.background, for: .widget)
        }
        .configurationDisplayName("My application")
        .description("Where your application is and what you still need to do.")
        .supportedFamilies([.systemSmall, .systemMedium, .accessoryRectangular, .accessoryCircular])
    }
}

@main
struct ClientWidgetBundle: WidgetBundle {
    var body: some Widget { ClientStageWidget() }
}
