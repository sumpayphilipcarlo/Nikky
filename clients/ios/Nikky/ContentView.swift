import SwiftUI
import WebKit

struct ContentView: View {
    var body: some View {
        NikkyWebView()
            .ignoresSafeArea()
    }
}

struct NikkyWebView: UIViewRepresentable {
    private var baseURL: URL {
        let raw = Bundle.main.object(forInfoDictionaryKey: "NIKKYBaseURL") as? String ?? "https://app.example.invalid"
        guard let url = URL(string: raw), url.scheme == "https" else {
            return URL(string: "https://app.example.invalid")!
        }
        return url
    }

    func makeCoordinator() -> Coordinator { Coordinator(origin: baseURL.host ?? "") }

    func makeUIView(context: Context) -> WKWebView {
        let config = WKWebViewConfiguration()
        config.websiteDataStore = .default()
        let web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = context.coordinator
        web.load(URLRequest(url: baseURL))
        return web
    }

    func updateUIView(_ uiView: WKWebView, context: Context) {}

    final class Coordinator: NSObject, WKNavigationDelegate {
        private let origin: String
        init(origin: String) { self.origin = origin }

        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { return decisionHandler(.cancel) }
            decisionHandler(url.scheme == "https" && url.host == origin ? .allow : .cancel)
        }
    }
}
