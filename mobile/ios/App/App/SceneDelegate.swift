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

/// The app's web view, set up to sit seamlessly under the status bar: page
/// colour behind it and status bar text that follows the app's theme.
class StudioViewController: CAPBridgeViewController {
    private var themeObservation: NSKeyValueObservation?

    override func capacitorDidLoad() {
        super.capacitorDidLoad()

        // iOS 26 fades the page under the status bar with its own gradient;
        // the site's frosted bar reaches up behind it instead, in both themes.
        if #available(iOS 26.0, *) {
            webView?.scrollView.topEdgeEffect.isHidden = true
            webView?.scrollView.bottomEdgeEffect.isHidden = true
        }

        // The site sets <meta name="theme-color"> to its page colour whenever
        // its theme changes (the app's own light/dark switch, not just the
        // phone's), so follow that.
        themeObservation = webView?.observe(\.themeColor, options: [.initial, .new]) { [weak self] webView, _ in
            let color = webView.themeColor
            DispatchQueue.main.async { self?.paint(color) }
        }
    }

    private func paint(_ page: UIColor?) {
        guard let page else { return }
        var white: CGFloat = 1
        page.getWhite(&white, alpha: nil)
        let dark = white < 0.5

        view.backgroundColor = page
        webView?.scrollView.backgroundColor = page
        statusBarStyle = dark ? .lightContent : .darkContent
        setNeedsStatusBarAppearanceUpdate()
    }
}
