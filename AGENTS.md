# AGENTS.md

Guide for coding agents (and humans) working on Lyricar, an iOS 26 app that shows line-synced
lyrics for whatever is playing on your Spotify, on the iPhone, the Lock Screen, the Dynamic
Island, widgets and CarPlay.

## Read first

- `README.md` explains what the app does, how sync works and every measured fix behind it
  (the "Staying in sync" table). Read it before touching the engine.
- `CONTRIBUTING.md` has the setup, the code style and the commit message format.
- `ROADMAP.md` lists what comes next and the limits that are known today.

## Build and test

Requires Xcode 26 with an iOS 26 Simulator and XcodeGen (`brew install xcodegen`).

```bash
cp Config/Local.xcconfig.example Config/Local.xcconfig   # or scripts/setup.sh
xcodegen generate                                        # Lyricar.xcodeproj is generated, never committed
cd Packages/LyricsKit && swift test && cd ../..          # unit tests, macOS, no Simulator
xcodebuild -project Lyricar.xcodeproj -scheme Lyricar \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  -configuration Debug CODE_SIGNING_ALLOWED=NO build     # the app build, as CI runs it
```

| Check | What it proves |
|---|---|
| `swift test` in `Packages/LyricsKit` | parser, clock, line lookup, widget timeline, Spotify decoding, LRCLIB fallback, sync precision, background recovery, the demo song |
| `xcodebuild ... build` | the app, the widget extension and CarPlay compile for the Simulator |
| `xcodebuild test ... -only-testing:LyricarUITests` | CarPlay, widget and widget-button tours with screenshots; needs CarPlay and External Displays on in the Simulator, a German Simulator for `WidgetTourTests`, and `scripts/sign-simulator-build.sh` for the button tests |
| `scripts/pull-diagnostics.sh` | on a real iPhone: poll gaps while locked and every keep-alive event |

CI (`.github/workflows/ci.yml`) runs the first two on every push and pull request. The UI tours
and the device diagnostics are manual.

Launch arguments for Debug builds (the app reads them inside `#if DEBUG`, so Release ignores
them):

- `-LyricarDemo`: a fake playback clock instead of Spotify; lyrics come from LRCLIB.
- `-LyricarDemoSong`: with `-LyricarDemo`, an invented song with lyrics written for this
  project, served offline (`DemoSong` in LyricsKit). Use it for every screenshot or video that
  gets published. `-LyricarDemoStart <seconds>` sets where the song starts.
- `-LyricarTheme <raw value>` forces a style; the raw values are the `LyricTheme` cases in
  `Shared/LyricTheme.swift`.
- `-LyricarLiveActivity` starts the Live Activity at launch, `-LyricarRenderGallery` renders
  every style and widget size to `Documents/gallery`.

`-lyricMode Karaoke|Focus|Verse` picks the phone view. It is a plain UserDefaults key
(`@AppStorage` in `NowPlayingView`), so it works in every build, Release included.

## Layout

```
Lyricar/LyricarApp.swift  app entry; registers the playback command handler at launch
Lyricar/Services          AppModel (the one engine), Spotify PKCE sign-in and loopback redirect,
                          silent-audio keep-alive, Live Activity, widget bridge, diagnostics,
                          demo source, style gallery
Lyricar/UI                SwiftUI phone screens: connect, now playing, Karaoke, Focus, Verse
Lyricar/CarPlay           CarPlay scene and its four templates: Karaoke, Focus, Stage, Track
LyricarWidgets            widget extension: the widgets and the Live Activity
Shared                    compiled into app and extension: LyricTheme (the eight styles),
                          widget and activity views, playback intents, Barlow fonts
Packages/LyricsKit        engine, playback clock, Spotify and LRCLIB clients, LRC parser,
                          widget snapshot, demo song; unit tests (Swift Testing)
LyricarUITests            Simulator tours (XCTest)
scripts                   setup, device install, diagnostics, signing helpers
landing                   static site for lyricar.adatepe.dev
```

## Rules that keep the app correct

- **One engine per process.** `AppModel.shared.engine` feeds the phone scene, the CarPlay scene,
  the Live Activity and the widget snapshot. A second engine means two clocks that disagree.
- **A network failure is never cached as "no lyrics".** `LRCLibClient` throws when every attempt
  failed and returns nil only on a definitive miss. Keep that split.
- **Poll fast only while someone looks.** 1 s while the phone is in front or CarPlay is
  connected (`pollsFast`), 3 s otherwise, and always honor `Retry-After`. 1 s polls behind the
  lock screen earned a 98 minute rate limit on 21 Oct 2026.
- **The clock moves on precision, not on recency.** A sample only replaces the current estimate
  when it is more precise, or when its uncertainty cannot explain the difference (a seek).
  `SyncPrecisionTests` holds this to 60 ms.
- **Widgets never wake the app.** A timeline carries one entry per line (up to 200) and asks for
  a fresh one after the last. Widget buttons are `AudioPlaybackIntent`s, so iOS runs them in the
  app even when it is terminated.
- **Styles live in `Shared/LyricTheme.swift`.** A change to a style must hold on every surface:
  run `-LyricarRenderGallery` and look at all eight sheets before committing.
- **No third-party lyrics in the source.** Lyrics are fetched from LRCLIB at runtime. Every
  lyric line in the repository was written for this project: the widget placeholder
  (`LyricsSnapshot.placeholder`), the demo song (`DemoSong`, wrapped in `#if DEBUG`) and the
  test fixtures.
- **Published media never shows real song lyrics.** Record and screenshot with
  `-LyricarDemo -LyricarDemoSong`.
- **Never weaken, skip or delete a test to make it pass.** Change a test only when the
  requirement changed, and say why in the commit.
- **No new dependency.** LyricsKit and the app use Apple frameworks only.
- **Secrets stay local.** `Config/Local.xcconfig` and `Config/Secrets.xcconfig` are gitignored;
  `project.yml` is the source of the Xcode project.
- **English everywhere, no emoji, no em dash or en dash.**

## License

Apache License 2.0. See `LICENSE` and `NOTICE`. Contributions are accepted under the same
license.
