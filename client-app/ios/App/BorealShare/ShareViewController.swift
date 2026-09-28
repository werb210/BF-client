// BOREAL_SHARE_EXTENSION_v640
// Appears in the iOS share sheet (Photos, Files, Mail, Safari...). Copies the shared photos
// and documents into the app group's SharedInbox folder, then tells the person to open the
// app. When the app next comes to the front it hands each file to its existing
// "shared file" screen (the same path "Open in" already uses).
import UIKit
import UniformTypeIdentifiers

@objc(ShareViewController)
final class ShareViewController: UIViewController {
    private let appGroup = "group.com.boreal.client"
    private let appName = "Boreal Financial"
    private let label = UILabel()
    private let button = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 11 / 255, green: 31 / 255, blue: 58 / 255, alpha: 1)
        label.textColor = .white
        label.numberOfLines = 0
        label.textAlignment = .center
        label.font = .preferredFont(forTextStyle: .headline)
        label.text = "Saving to " + appName + "..."
        button.setTitle("Done", for: .normal)
        button.tintColor = .white
        button.titleLabel?.font = .preferredFont(forTextStyle: .headline)
        button.addTarget(self, action: #selector(done), for: .touchUpInside)
        button.isHidden = true
        let stack = UIStackView(arrangedSubviews: [label, button])
        stack.axis = .vertical
        stack.spacing = 20
        stack.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(stack)
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stack.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 24),
            stack.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -24),
        ])
        saveAll()
    }

    private func inboxURL() -> URL? {
        guard let base = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroup) else { return nil }
        let dir = base.appendingPathComponent("SharedInbox", isDirectory: true)
        try? FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        return dir
    }

    /// Prefer a PDF, then an image, then any file.
    private func typeToLoad(_ provider: NSItemProvider) -> String? {
        for t in [UTType.pdf.identifier, UTType.image.identifier, UTType.data.identifier] where provider.hasItemConformingToTypeIdentifier(t) {
            return t
        }
        return nil
    }

    private func saveAll() {
        guard let inbox = inboxURL() else { finish(saved: 0, message: "Couldn't save here. Please try again from the " + appName + " app."); return }
        let items = (extensionContext?.inputItems as? [NSExtensionItem]) ?? []
        let providers = items.flatMap { $0.attachments ?? [] }
        let group = DispatchGroup()
        let lock = NSLock()
        var saved = 0
        for provider in providers {
            guard let type = typeToLoad(provider) else { continue }
            group.enter()
            provider.loadFileRepresentation(forTypeIdentifier: type) { url, _ in
                defer { group.leave() }
                guard let url = url else { return }
                let name = url.lastPathComponent.isEmpty ? "shared-file" : url.lastPathComponent
                // One folder per file keeps the original name intact for the app.
                let folder = inbox.appendingPathComponent(UUID().uuidString, isDirectory: true)
                let dest = folder.appendingPathComponent(name)
                do {
                    try FileManager.default.createDirectory(at: folder, withIntermediateDirectories: true)
                    try FileManager.default.copyItem(at: url, to: dest)
                    lock.lock(); saved += 1; lock.unlock()
                } catch {
                    // Skip this one; the others still go through.
                }
            }
        }
        group.notify(queue: .main) { [weak self] in
            guard let self = self else { return }
            if saved == 0 {
                self.finish(saved: 0, message: "Nothing could be saved. Please try again from the " + self.appName + " app.")
            } else {
                let what = saved == 1 ? "1 file" : String(saved) + " files"
                self.finish(saved: saved, message: "Saved " + what + " to " + self.appName + ".\nOpen the " + self.appName + " app to choose where it goes.")
            }
        }
    }

    private func finish(saved: Int, message: String) {
        label.text = message
        button.isHidden = false
    }

    @objc private func done() {
        extensionContext?.completeRequest(returningItems: nil, completionHandler: nil)
    }
}
