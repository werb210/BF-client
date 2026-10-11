# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ---------------------------------------------------------------------------
# BF_CLIENT_ANDROID_R8_v119 - release builds run R8 (minifyEnabled true).
# Capacitor finds plugins, plugin methods and the JS bridge by reflection and
# by name from JavaScript, so anything R8 renames or strips here breaks at
# runtime only (the JS call silently resolves to "not implemented").
# ---------------------------------------------------------------------------

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,Exceptions
-keepattributes SourceFile,LineNumberTable

# Capacitor core (bridge, plugin base classes, annotations).
-keep class com.getcapacitor.** { *; }
-keep interface com.getcapacitor.** { *; }
-dontwarn com.getcapacitor.**

# Any @CapacitorPlugin class (ours and third-party) and its callable methods.
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.annotation.Permission <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
    public <init>(...);
}
-keep public class * extends com.getcapacitor.Plugin { *; }
-keepclassmembers class * {
    @com.getcapacitor.PluginMethod public <methods>;
}

# WebView JavaScript interfaces (Capacitor MessageHandler, CapacitorHttp, ...).
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Cordova compatibility layer bundled with @capacitor/android.
-keep class org.apache.cordova.** { *; }
-keep public class * extends org.apache.cordova.CordovaPlugin { *; }
-dontwarn org.apache.cordova.**

# App-local native code: plugins registered in MainActivity, the WorkManager
# worker (instantiated by class name), the FCM service and the widget provider.
-keep class com.boreal.client.** { *; }

# Installed Capacitor plugins (client-app/package.json), by Java/Kotlin package
# as found in node_modules/<plugin>/android/src/main.
# @capacitor/app
-keep class com.capacitorjs.plugins.app.** { *; }
# @capacitor/app-launcher
-keep class com.capacitorjs.plugins.applauncher.** { *; }
# @capacitor/camera
-keep class com.capacitorjs.plugins.camera.** { *; }
# @capacitor/device
-keep class com.capacitorjs.plugins.device.** { *; }
# @capacitor/filesystem
-keep class com.capacitorjs.plugins.filesystem.** { *; }
# @capacitor/keyboard
-keep class com.capacitorjs.plugins.keyboard.** { *; }
# @capacitor/network
-keep class com.capacitorjs.plugins.network.** { *; }
# @capacitor/preferences
-keep class com.capacitorjs.plugins.preferences.** { *; }
# @capacitor/push-notifications
-keep class com.capacitorjs.plugins.pushnotifications.** { *; }
# @capacitor/status-bar
-keep class com.capacitorjs.plugins.statusbar.** { *; }
# @aparajita/capacitor-biometric-auth
-keep class com.aparajita.capacitor.biometricauth.** { *; }
# @capacitor-mlkit/document-scanner
-keep class io.capawesome.capacitorjs.plugins.mlkit.documentscanner.** { *; }
# (@twilio/voice-sdk is web-only - no native code.)

# Ionic native libraries used by @capacitor/camera and @capacitor/filesystem.
-keep class io.ionic.libs.** { *; }
-dontwarn io.ionic.libs.**

# Gson (used by @capacitor/camera) serialises by reflection.
-keep class com.google.gson.** { *; }
-dontwarn com.google.gson.**

# Firebase Cloud Messaging (@capacitor/push-notifications, BorealMessagingService).
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**

# Google ML Kit document scanner and the Play services it runs through.
-keep class com.google.mlkit.** { *; }
-dontwarn com.google.mlkit.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# AndroidX Biometric (@aparajita/capacitor-biometric-auth) and WorkManager.
-keep class androidx.biometric.** { *; }
-keep class * extends androidx.work.ListenableWorker {
    public <init>(android.content.Context, androidx.work.WorkerParameters);
}
