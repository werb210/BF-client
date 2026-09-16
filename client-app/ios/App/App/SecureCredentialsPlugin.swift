import Foundation
import Security
import Capacitor

// BF_CLIENT_FACE_ID_SIGN_IN_v297 - optional "key" selects the Keychain entry; default is the session token.
@objc(SecureCredentialsPlugin)
public class SecureCredentialsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SecureCredentialsPlugin"
    public let jsName = "SecureCredentials"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "set", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise)
    ]
    private let service = "com.boreal.client.credentials"
    private let defaultAccount = "bearer-token"

    private func query(_ call: CAPPluginCall) -> [String: Any] {
        let account = call.getString("key") ?? defaultAccount
        return [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account
        ]
    }

    @objc func set(_ call: CAPPluginCall) {
        guard let value = call.getString("value"), let data = value.data(using: .utf8) else {
            call.reject("value required"); return
        }
        let base = query(call)
        SecItemDelete(base as CFDictionary)
        var item = base
        item[kSecValueData as String] = data
        item[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        let status = SecItemAdd(item as CFDictionary, nil)
        status == errSecSuccess ? call.resolve() : call.reject("Keychain write failed (\(status))")
    }

    @objc func get(_ call: CAPPluginCall) {
        var item = query(call)
        item[kSecReturnData as String] = true
        item[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(item as CFDictionary, &result)
        if status == errSecItemNotFound { call.resolve(["value": NSNull()]); return }
        guard status == errSecSuccess, let data = result as? Data, let value = String(data: data, encoding: .utf8) else {
            call.reject("Keychain read failed (\(status))"); return
        }
        call.resolve(["value": value])
    }

    @objc func clear(_ call: CAPPluginCall) {
        let status = SecItemDelete(query(call) as CFDictionary)
        (status == errSecSuccess || status == errSecItemNotFound) ? call.resolve() : call.reject("Keychain clear failed (\(status))")
    }
}
