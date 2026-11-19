import Foundation
import Testing
@testable import LyricsKit

/// The invented demo song stands in for a real track in screenshots and recordings,
/// so it has to behave like real LRCLIB data on every surface.
@Suite struct DemoSongTests {
    @Test func parsesAsSortedLineSyncedLyricsInsideTheTrack() {
        let document = LRCParser.parse(DemoSong.lrc, provider: "LRCLIB")
        #expect(document.syncType == .lineSynced)
        let starts = document.lines.map(\.startMs)
        #expect(starts == starts.sorted())
        #expect(starts.allSatisfy { $0 < DemoSong.track.durationMs })
        // Enough sung lines for the karaoke sheet and CarPlay list, plus instrumental gaps.
        #expect(document.lines.filter { !$0.isInstrumental }.count >= 16)
        #expect(document.lines.contains { $0.isInstrumental })
        #expect(document.lines.first { !$0.isInstrumental }?.text == "Headlights paint the overpass")
    }

    @Test func demoClientServesTheSongThroughTheRealLookup() async throws {
        let document = try #require(try await DemoSong.client().lyrics(for: DemoSong.track))
        #expect(document == LRCParser.parse(DemoSong.lrc, provider: "LRCLIB"))
    }

    @Test func demoClientNeverInventsLyricsForAnotherTrack() async throws {
        let other = SpotifyTrack(id: "x", name: "Some Other Song", artists: ["Someone"], album: "",
                                 artworkURL: nil, durationMs: 200_000)
        #expect(try await DemoSong.client().lyrics(for: other) == nil)
    }
}
