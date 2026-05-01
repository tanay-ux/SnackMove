import UIKit
import Capacitor
import UserNotifications

private let snackAlarmCategoryId = "SNACK_ALARM"
private let pendingSnackStartKey = "SnackAlarmPendingStart"

private func snackStartFromUserInfo(_ userInfo: [AnyHashable: Any]) -> Bool {
    guard let v = userInfo["SNACK_START"] else { return false }
    if let b = v as? Bool { return b }
    if let n = v as? NSNumber { return n.boolValue }
    return false
}

private func registerSnackAlarmCategory() {
    let category = UNNotificationCategory(
        identifier: snackAlarmCategoryId,
        actions: [],
        intentIdentifiers: [],
        options: []
    )
    UNUserNotificationCenter.current().setNotificationCategories([category])
}

private func applySnackAlarmAttributes(_ content: UNMutableNotificationContent) {
    content.categoryIdentifier = snackAlarmCategoryId
    content.threadIdentifier = "snack-workout"
    if #available(iOS 15.0, *) {
        content.interruptionLevel = .timeSensitive
        content.relevanceScore = 1.0
    }
}

private func applySnackAlarmSound(_ content: UNMutableNotificationContent, vibrateOnly: Bool) {
    if vibrateOnly {
        content.sound = nil
        return
    }
    if #available(iOS 17.0, *) {
        content.sound = UNNotificationSound.ringtoneSoundNamed(UNNotificationSoundName("Alarm"))
    } else {
        content.sound = .default
    }
}

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        registerSnackAlarmCategory()
        print("[SnackAlarm][iOS] App didFinishLaunching")
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        print("[SnackAlarm][iOS] willPresent notification")
        completionHandler([.banner, .sound, .list])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        defer { completionHandler() }
        print("[SnackAlarm][iOS] didReceive notification response action=\(response.actionIdentifier)")
        guard response.actionIdentifier == UNNotificationDefaultActionIdentifier else { return }
        let userInfo = response.notification.request.content.userInfo
        guard snackStartFromUserInfo(userInfo) else { return }
        SnackAlarmLaunchState.markLaunchedFromNotification()
    }
}

@objc(BridgeViewController)
class BridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        super.capacitorDidLoad()
        if bridge?.plugin(withName: "SnackAlarm") == nil {
            bridge?.registerPluginInstance(SnackAlarmPlugin())
            CAPLog.print("[SnackAlarm][iOS] Plugin registered manually as instance in BridgeViewController")
        } else {
            CAPLog.print("[SnackAlarm][iOS] Plugin already registered")
        }
    }
}

private enum SnackAlarmLaunchState {
    private static var launchedFromNotification = false
    private static let lock = NSLock()

    static func markLaunchedFromNotification() {
        lock.lock()
        launchedFromNotification = true
        UserDefaults.standard.set(true, forKey: pendingSnackStartKey)
        lock.unlock()
    }

    static func consumeLaunchIntent() -> Bool {
        lock.lock()
        let mem = launchedFromNotification
        launchedFromNotification = false
        let persisted = UserDefaults.standard.bool(forKey: pendingSnackStartKey)
        if persisted {
            UserDefaults.standard.set(false, forKey: pendingSnackStartKey)
        }
        lock.unlock()
        return mem || persisted
    }
}

@objc(SnackAlarmPlugin)
public class SnackAlarmPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SnackAlarmPlugin"
    public let jsName = "SnackAlarm"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkNotificationPermissionStatus", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "openNotificationSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "syncSettings", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "scheduleAlarm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "cancelAlarm", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkLaunchIntent", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "testNotification", returnType: CAPPluginReturnPromise),
    ]

    private let center = UNUserNotificationCenter.current()
    private let alarmNotificationID = "snack_alarm_notification"
    private let testNotificationID = "snack_alarm_test_notification"
    private let defaultBody = "Your snack workout is ready"
    private let vibrateOnlyKey = "snack_vibrate_only"

    @objc override public func requestPermissions(_ call: CAPPluginCall) {
        CAPLog.print("[SnackAlarm][iOS] requestPermissions called")
        center.getNotificationSettings { settings in
            CAPLog.print("[SnackAlarm][iOS] current authorizationStatus: \(settings.authorizationStatus.rawValue)")
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral:
                call.resolve(["notifications": "granted"])
            case .denied:
                call.resolve(["notifications": "denied"])
            case .notDetermined:
                var opts: UNAuthorizationOptions = [.alert, .sound, .badge]
                if #available(iOS 15.0, *) {
                    opts.insert(.timeSensitive)
                }
                self.center.requestAuthorization(options: opts) { granted, error in
                    if let error = error {
                        CAPLog.print("[SnackAlarm][iOS] requestAuthorization error: \(error.localizedDescription)")
                        call.reject("Failed to request notification permissions", nil, error)
                        return
                    }
                    CAPLog.print("[SnackAlarm][iOS] requestAuthorization granted: \(granted)")
                    call.resolve(["notifications": granted ? "granted" : "denied"])
                }
            @unknown default:
                call.resolve(["notifications": "denied"])
            }
        }
    }

    @objc public func checkNotificationPermissionStatus(_ call: CAPPluginCall) {
        center.getNotificationSettings { settings in
            let status: String
            switch settings.authorizationStatus {
            case .authorized, .provisional, .ephemeral:
                status = "granted"
            case .denied:
                status = "denied"
            case .notDetermined:
                status = "prompt"
            @unknown default:
                status = "denied"
            }
            call.resolve(["notifications": status])
        }
    }

    @objc func openNotificationSettings(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            if let url = URL(string: UIApplication.openSettingsURLString) {
                UIApplication.shared.open(url, options: [:], completionHandler: nil)
            }
            call.resolve()
        }
    }

    @objc public func syncSettings(_ call: CAPPluginCall) {
        let vibrateOnly = call.getBool("vibrateOnly") ?? false
        UserDefaults.standard.set(vibrateOnly, forKey: vibrateOnlyKey)
        call.resolve(["synced": true])
    }

    @objc public func scheduleAlarm(_ call: CAPPluginCall) {
        guard let timestampMs = call.getDouble("time") else {
            call.reject("Missing required parameter: time")
            return
        }

        let title = call.getString("title") ?? "Time to move!"
        let triggerTime = Date(timeIntervalSince1970: timestampMs / 1000)
        let delay = max(1, triggerTime.timeIntervalSinceNow)
        CAPLog.print("[SnackAlarm][iOS] scheduleAlarm called title=\(title) delay=\(delay)")

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = defaultBody
        let vibrateOnly = UserDefaults.standard.bool(forKey: vibrateOnlyKey)
        applySnackAlarmSound(content, vibrateOnly: vibrateOnly)
        content.userInfo = ["SNACK_START": true]
        applySnackAlarmAttributes(content)

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: delay, repeats: false)
        let request = UNNotificationRequest(identifier: alarmNotificationID, content: content, trigger: trigger)

        center.removePendingNotificationRequests(withIdentifiers: [alarmNotificationID])
        center.removeDeliveredNotifications(withIdentifiers: [alarmNotificationID])

        center.add(request) { error in
            if let error = error {
                CAPLog.print("[SnackAlarm][iOS] scheduleAlarm error: \(error.localizedDescription)")
                call.reject("Failed to schedule alarm", nil, error)
                return
            }
            CAPLog.print("[SnackAlarm][iOS] scheduleAlarm success")
            call.resolve(["scheduled": true])
        }
    }

    @objc public func cancelAlarm(_ call: CAPPluginCall) {
        CAPLog.print("[SnackAlarm][iOS] cancelAlarm called")
        center.removePendingNotificationRequests(withIdentifiers: [alarmNotificationID])
        center.removeDeliveredNotifications(withIdentifiers: [alarmNotificationID])
        call.resolve(["cancelled": true])
    }

    @objc public func checkLaunchIntent(_ call: CAPPluginCall) {
        let launched = SnackAlarmLaunchState.consumeLaunchIntent()
        CAPLog.print("[SnackAlarm][iOS] checkLaunchIntent -> \(launched)")
        call.resolve(["snackStart": launched])
    }

    @objc public func testNotification(_ call: CAPPluginCall) {
        let title = call.getString("title") ?? "Test reminder!"
        CAPLog.print("[SnackAlarm][iOS] testNotification called title=\(title)")

        let content = UNMutableNotificationContent()
        content.title = title
        content.body = defaultBody
        let vibrateOnly = UserDefaults.standard.bool(forKey: vibrateOnlyKey)
        applySnackAlarmSound(content, vibrateOnly: vibrateOnly)
        content.userInfo = ["SNACK_START": true]
        applySnackAlarmAttributes(content)

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(identifier: testNotificationID, content: content, trigger: trigger)

        center.removePendingNotificationRequests(withIdentifiers: [testNotificationID])
        center.removeDeliveredNotifications(withIdentifiers: [testNotificationID])

        center.add(request) { error in
            if let error = error {
                CAPLog.print("[SnackAlarm][iOS] testNotification error: \(error.localizedDescription)")
                call.reject("Failed to fire test notification", nil, error)
                return
            }
            CAPLog.print("[SnackAlarm][iOS] testNotification success")
            call.resolve(["fired": true])
        }
    }
}
