import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self
        print("[SnackAlarm][iOS] App didFinishLaunching")
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
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

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        print("[SnackAlarm][iOS] willPresent notification")
        completionHandler([.banner, .sound, .list])
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        print("[SnackAlarm][iOS] didReceive notification response")
        if let snackStart = response.notification.request.content.userInfo["SNACK_START"] as? Bool, snackStart {
            SnackAlarmLaunchState.markLaunchedFromNotification()
        }
        completionHandler()
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
        lock.unlock()
    }

    static func consumeLaunchIntent() -> Bool {
        lock.lock()
        let value = launchedFromNotification
        launchedFromNotification = false
        lock.unlock()
        return value
    }
}

@objc(SnackAlarmPlugin)
public class SnackAlarmPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "SnackAlarmPlugin"
    public let jsName = "SnackAlarm"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestPermissions", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "checkNotificationPermissionStatus", returnType: CAPPluginReturnPromise),
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
                self.center.requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
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
        if !vibrateOnly {
            content.sound = .default
        }
        content.userInfo = ["SNACK_START": true]

        if #available(iOS 15.0, *) {
            content.interruptionLevel = .timeSensitive
        }

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
        if !vibrateOnly {
            content.sound = .default
        }
        content.userInfo = ["SNACK_START": true]

        if #available(iOS 15.0, *) {
            content.interruptionLevel = .timeSensitive
        }

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
