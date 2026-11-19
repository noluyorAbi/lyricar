#if DEBUG
import Foundation

/// An invented song for screenshots and recordings (`-LyricarDemoSong` in the app).
/// Title, artist and every line were written for this project, so media made with it
/// carries no third-party lyrics. Debug builds only: release builds bundle no lyrics.
public enum DemoSong {
    public static let track = SpotifyTrack(
        id: "demo-amber-on-the-dashboard",
        name: "Amber on the Dashboard",
        artists: ["The Lyricar House Band"],
        album: "Demo Tape",
        artworkURL: nil,
        durationMs: 98_000
    )

    /// Line-synced LRC, the same shape LRCLIB returns. Empty lines are instrumental gaps.
    public static let lrc = """
    [ti:Amber on the Dashboard]
    [ar:The Lyricar House Band]
    [00:00.00]
    [00:03.80]Headlights paint the overpass
    [00:07.90]Every exit sign reads slow
    [00:12.10]Radio is half asleep
    [00:16.20]Humming songs I almost know
    [00:20.40]Keep the window down an inch
    [00:24.50]Let the city do the talking
    [00:28.70]Amber on the dashboard
    [00:32.60]Keeping time while I keep driving
    [00:37.00]
    [00:41.20]Sing it to the off-ramp
    [00:45.10]Sing it to the empty lane
    [00:49.30]Every line comes right on time
    [00:53.40]Every chorus finds its way
    [00:57.60]Amber on the dashboard
    [01:01.70]Glowing like it knows the words
    [01:05.90]Hold the note until the light
    [01:10.00]Changes and we roll again
    [01:14.30]
    [01:18.40]Park it where the streetlights end
    [01:22.60]Leave the last line on the glass
    [01:26.70]Amber on the dashboard
    [01:30.90]Fading as the minutes pass
    """

    /// An LRCLIB client that answers from `lrc` instead of the network, so the demo runs
    /// the real lookup, decoding and parsing path offline. Any other track is a miss.
    public static func client() -> LRCLibClient {
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [DemoSongProtocol.self]
        return LRCLibClient(session: URLSession(configuration: configuration))
    }
}

/// Serves `DemoSong` as an LRCLIB `/api/get` record; everything else is a 404.
final class DemoSongProtocol: URLProtocol, @unchecked Sendable {
    private struct Record: Encodable {
        let duration: Double
        let instrumental: Bool
        let syncedLyrics: String
    }

    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func stopLoading() {}

    override func startLoading() {
        let url = request.url ?? URL(string: "https://lrclib.net/api/get")!
        let name = URLComponents(url: url, resolvingAgainstBaseURL: false)?
            .queryItems?.first { $0.name == "track_name" }?.value
        var status = 404
        var body = Data()
        if url.path == "/api/get", name == DemoSong.track.name,
           let data = try? JSONEncoder().encode(Record(duration: Double(DemoSong.track.durationMs) / 1000,
                                                       instrumental: false, syncedLyrics: DemoSong.lrc)) {
            status = 200
            body = data
        }
        let response = HTTPURLResponse(url: url, statusCode: status, httpVersion: nil, headerFields: nil)!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: body)
        client?.urlProtocolDidFinishLoading(self)
    }
}
#endif
