// BF_CLIENT_BLOCK_v205_VISIONKIT_SCANNER_v1
// @capacitor-mlkit/document-scanner is CocoaPods-only (no Package.swift), so
// `cap sync ios` skips it on this SPM project and the JS call throws at runtime.
// VisionKit gives the same edge-detect/perspective-correct UX with no third-party
// dependency. jsName + result shape match the npm package exactly, so the existing
// src/native/documentScanner.ts needs no change and Android is untouched.
import Foundation
import Capacitor
import VisionKit
import UIKit

@objc(DocumentScannerPlugin)
public class DocumentScannerPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DocumentScannerPlugin"
    public let jsName = "DocumentScanner"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "scanDocument", returnType: CAPPluginReturnPromise)
    ]

    private var pendingCall: CAPPluginCall?
    private var pageLimit: Int = 10

    @objc func scanDocument(_ call: CAPPluginCall) {
        guard VNDocumentCameraViewController.isSupported else {
            call.reject("Document scanning is not supported on this device"); return
        }
        pageLimit = max(1, call.getInt("pageLimit") ?? 10)
        pendingCall = call
        DispatchQueue.main.async { [weak self] in
            guard let self else { return }
            let scanner = VNDocumentCameraViewController()
            scanner.delegate = self
            self.bridge?.viewController?.present(scanner, animated: true)
        }
    }

    /// Writes each page to the cache dir and returns file:// URLs. The JS layer reads
    /// them back through Capacitor.convertFileSrc, matching the ML Kit contract.
    private func persist(_ scan: VNDocumentCameraScan) throws -> [String] {
        let dir = FileManager.default.temporaryDirectory.appendingPathComponent("boreal-scans", isDirectory: true)
        try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true)
        var urls: [String] = []
        for index in 0..<min(scan.pageCount, pageLimit) {
            guard let data = scan.imageOfPage(at: index).jpegData(compressionQuality: 0.9) else { continue }
            let url = dir.appendingPathComponent("page-\(UUID().uuidString).jpg")
            try data.write(to: url, options: .atomic)
            urls.append(url.absoluteString)
        }
        return urls
    }
}

extension DocumentScannerPlugin: VNDocumentCameraViewControllerDelegate {
    public func documentCameraViewController(_ controller: VNDocumentCameraViewController,
                                             didFinishWith scan: VNDocumentCameraScan) {
        let call = pendingCall; pendingCall = nil
        controller.dismiss(animated: true)
        do { call?.resolve(["scannedImages": try persist(scan)]) }
        catch { call?.reject("Unable to save scanned pages") }
    }

    public func documentCameraViewControllerDidCancel(_ controller: VNDocumentCameraViewController) {
        let call = pendingCall; pendingCall = nil
        controller.dismiss(animated: true)
        call?.resolve(["scannedImages": []])
    }

    public func documentCameraViewController(_ controller: VNDocumentCameraViewController,
                                             didFailWithError error: Error) {
        let call = pendingCall; pendingCall = nil
        controller.dismiss(animated: true)
        call?.reject("Scan failed")
    }
}
