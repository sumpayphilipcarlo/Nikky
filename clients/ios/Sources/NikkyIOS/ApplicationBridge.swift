import Foundation

public struct InstalledCapability: Codable, Sendable {
    public let id: String
    public let name: String
    public let capabilities: [String]
    public init(id: String, name: String, capabilities: [String]) {
        self.id = id
        self.name = name
        self.capabilities = capabilities
    }
}

public protocol ApplicationOpening: Sendable {
    func canOpen(_ url: URL) async -> Bool
    func open(_ url: URL) async -> Bool
}

public actor ApplicationBridge {
    private let opener: ApplicationOpening

    public init(opener: ApplicationOpening) {
        self.opener = opener
    }

    public func probe(name: String, urls: [URL]) async -> [InstalledCapability] {
        var out: [InstalledCapability] = []
        for url in urls where await opener.canOpen(url) {
            out.append(InstalledCapability(id: url.scheme ?? url.absoluteString, name: name, capabilities: ["app.open"]))
        }
        return out
    }

    public func open(_ url: URL) async -> Bool {
        await opener.open(url)
    }
}
