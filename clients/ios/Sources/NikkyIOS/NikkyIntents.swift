import Foundation

public enum NikkyNativeCapability: String, Codable, CaseIterable, Sendable {
    case notifications
    case appIntents
    case files
    case location
    case contacts
    case speechInput
}

public struct NikkyCapabilityReport: Codable, Sendable {
    public let capabilities: Set<NikkyNativeCapability>
    public init(capabilities: Set<NikkyNativeCapability>) {
        self.capabilities = capabilities
    }
}
