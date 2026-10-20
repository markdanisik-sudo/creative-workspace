import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.rootViewController = StudioViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

/// The app's web view, set up to sit seamlessly under the status bar.
class StudioViewController: CAPBridgeViewController {
    /// The page background (globals.css --bg), light or dark with the phone.
    private static let page = UIColor { traits in
        traits.userInterfaceStyle == .dark
            ? UIColor(red: 14 / 255, green: 14 / 255, blue: 13 / 255, alpha: 1)
            : UIColor(red: 236 / 255, green: 235 / 255, blue: 232 / 255, alpha: 1)
    }

    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        view.backgroundColor = Self.page
        webView?.backgroundColor = Self.page
        webView?.scrollView.backgroundColor = Self.page
        // iOS 26 fades the page under the status bar with its own light
        // gradient; the site draws its own bar there instead.
        if #available(iOS 26.0, *) {
            webView?.scrollView.topEdgeEffect.isHidden = true
            webView?.scrollView.bottomEdgeEffect.isHidden = true
        }
    }
}
