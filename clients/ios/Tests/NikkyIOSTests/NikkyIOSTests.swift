import XCTest
@testable import NikkyIOS

final class NikkyIOSTests: XCTestCase {
    func testActionEncoding() throws {
        let action = NikkyAction(type: "ride.book", title: "Book ride", summary: "Airport")
        let data = try JSONEncoder().encode(action)
        let decoded = try JSONDecoder().decode(NikkyAction.self, from: data)
        XCTAssertEqual(decoded.type, "ride.book")
        XCTAssertEqual(decoded.title, "Book ride")
    }

    func testCapabilityReport() {
        let report = NikkyCapabilityReport(capabilities: [.notifications, .appIntents])
        XCTAssertTrue(report.capabilities.contains(.notifications))
        XCTAssertTrue(report.capabilities.contains(.appIntents))
    }
}
