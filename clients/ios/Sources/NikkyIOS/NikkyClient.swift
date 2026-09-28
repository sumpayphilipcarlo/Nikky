import Foundation

public struct NikkyAction: Codable, Sendable {
    public let type: String
    public let title: String?
    public let summary: String?
    public init(type: String, title: String? = nil, summary: String? = nil) {
        self.type = type
        self.title = title
        self.summary = summary
    }
}

public actor NikkyClient {
    private let baseURL: URL
    private let session: URLSession

    public init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
    }

    public func propose(_ action: NikkyAction) async throws -> Data {
        var request = URLRequest(url: baseURL.appendingPathComponent("v1/actions/propose"))
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(action)
        let (data, response) = try await session.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return data
    }
}
