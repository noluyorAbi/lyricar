# Roadmap

Ideas for where Lyricar goes next. Nothing here is promised or scheduled; the order is the
order the work makes sense in. Each idea says why it matters, how it would be built, roughly
how big it is, and when it counts as done.

Sizes: S is a day or two, M is about a week, L is several weeks.

## Now: prove the slower background polling on the road

The last two changes slowed polling behind the lock screen from 1 s to 3 s, after a locked phone
with a Live Activity polled every second for hours and Spotify answered with a 98 minute
`Retry-After`. The unit tests cover the cadence; a real evening with the phone locked does not
exist yet.

- Play music for two hours with the phone locked and the Live Activity on, once on Wi-Fi and
  once on cellular, then run `scripts/pull-diagnostics.sh`.
- Do the same with CarPlay connected, where 1 s polling stays on.
- Every gap the diagnostics show becomes a `BackgroundRecoveryTests` case before it is fixed.

Done when: two locked sessions of two hours show no poll gap longer than 30 s and no
`Retry-After` longer than the 30 s window, and the Live Activity line never trails the music by
more than one line.

## Next

### 1. A second lyrics source behind one protocol (S)

`LyricsEngine` takes a concrete `LRCLibClient`. The data model is already the common shape for
synced lyrics, so another source only needs a seam.

- A `LyricsSource` protocol with `lyrics(for:)`, adopted by `LRCLibClient` and by the demo song.
- Local LRC files dropped into the app's Documents folder, matched by title, artist and
  duration, for songs LRCLIB lacks.
- Keep the rule that a network failure is never cached as a miss, for every source.

Done when: a local LRC file wins over LRCLIB for its track and the existing fallback tests pass
unchanged.

### 2. Apple Music (M)

The engine only needs a track and a playback position, so Spotify is one source among possible
others. The FAQ in the README already invites this.

- A `NowPlayingSource` built on MusicKit's `ApplicationMusicPlayer` or the system player's
  now-playing state, with the same precision-weighted clock.
- Playback controls through MusicKit, so widgets and CarPlay keep working.
- Sign-in picks the source; nothing else in the UI changes.

Done when: a song playing in Apple Music shows synced lyrics on the phone, the Lock Screen,
a widget and CarPlay, with the same sync tests passing for the new source.

### 3. UI tours that run on any Simulator language (S)

`WidgetTourTests` taps SpringBoard by its German labels ("Bearbeiten", "hinzufügen"), so the
tours only run on a German Simulator and stay out of CI.

- Look up SpringBoard's labels for the Simulator's locale, or find elements by identifier
  where SpringBoard offers one.
- Script the CarPlay and External Displays setup so a fresh Simulator needs no clicks.

Done when: the tours pass on an English and a German Simulator from one command.

### 4. Word timing where the lyrics have it (M)

LRCLIB lyrics are line-synced. Some LRC files carry word timestamps in the enhanced LRC format
(`<mm:ss.xx>` inside a line); today those stamps would show up as raw text in the line.

- Parse word stamps into `LyricLine` when present, and never show them as text.
- Karaoke and Focus sweep the highlight across the line; widgets and CarPlay stay line-based,
  since their update budget cannot follow single words.

Done when: an enhanced LRC file sweeps word by word on the phone, and every line-synced file
renders exactly as before.

## Later

### 5. A build that App Review could accept (L)

Lyricar is build-it-yourself for three reasons: Spotify's Development Mode caps an app at five
users, extended Spotify access needs a registered business, and App Review rejects the
silent-audio keep-alive.

- Replace the keep-alive with ActivityKit push updates from a small server that knows the
  track start and the line times, so the Live Activity advances without the app running.
- That server would see what users listen to, which breaks the "no backend" promise. It would
  have to be optional and self-hostable.

This only makes sense once a lyrics source other than Spotify exists (item 2).

### 6. CarPlay on real cars (process, not code)

Without Apple's CarPlay audio entitlement, real cars show the Live Activity and the small
widgets but not the Lyricar app. Request the grant with a paid membership; Apple may refuse it,
since Lyricar plays no audio itself.

### 7. Widget reload budget (S)

WidgetKit grants roughly 40 to 70 background reloads a day. A long session with many skips can
use them up, and the widget then shows the previous song until iOS allows the next reload.

- Count reloads per day in the diagnostics log.
- Coalesce reloads during a burst of skips, so five skips in ten seconds cost one reload.

Done when: a logged day of normal listening stays under 40 reloads.

## Giving back to LRCLIB

Lyricar reads every line from LRCLIB, a community database, and its users notice where that
data is wrong.

- **Timing fixes.** The per-track nudge already measures how far a file is off. Offer to submit
  the corrected timing to LRCLIB, only on the user's explicit action and with a preview.
- **Missing songs.** When a track has no lyrics, link straight to LRCLIB's contribution flow
  with the title, artist, album and duration filled in.

## Ideas without a plan yet

- Shortcuts actions: show the current line, nudge the timing, toggle the Live Activity.
- A StandBy layout for the phone on its side at night.
- A translation line under the current line, for songs in another language.
- An Apple Watch view beyond the Smart Stack card iOS 26 already shows.

Suggestions are welcome as GitHub issues.
