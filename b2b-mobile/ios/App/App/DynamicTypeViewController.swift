import UIKit
import Capacitor

class DynamicTypeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        super.capacitorDidLoad()
        bridge?.registerPluginInstance(DynamicTypePlugin())
    }
}

@objc(DynamicTypePlugin)
public class DynamicTypePlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "DynamicTypePlugin"
    public let jsName = "DynamicType"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "getCurrent", returnType: CAPPluginReturnPromise)
    ]
    private var observers: [NSObjectProtocol] = []

    public override func load() {
        for name in [UIContentSizeCategory.didChangeNotification, UIApplication.didBecomeActiveNotification] {
            observers.append(NotificationCenter.default.addObserver(forName: name, object: nil, queue: .main) { [weak self] _ in
                guard let self = self else { return }
                self.notifyListeners("change", data: self.current(), retainUntilConsumed: true)
            })
        }
    }

    deinit {
        observers.forEach { NotificationCenter.default.removeObserver($0) }
    }

    @objc func getCurrent(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            call.resolve(self.current())
        }
    }

    private func current() -> [String: Any] {
        let category = UIApplication.shared.preferredContentSizeCategory
        return ["category": category.rawValue, "scale": scale(for: category)]
    }

    private func scale(for category: UIContentSizeCategory) -> Double {
        switch category {
        case .extraLarge: return 1.05
        case .extraExtraLarge: return 1.10
        case .extraExtraExtraLarge: return 1.15
        case .accessibilityMedium: return 1.20
        case .accessibilityLarge: return 1.225
        case .accessibilityExtraLarge: return 1.25
        case .accessibilityExtraExtraLarge: return 1.275
        case .accessibilityExtraExtraExtraLarge: return 1.30
        default: return 1.0
        }
    }
}
