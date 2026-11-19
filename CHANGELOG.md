<!--
  Rules that keep this file useful:
    1. Write for the person deciding whether to upgrade, not for the person who
       wrote the commit.
    2. Every user visible change gets a line under Unreleased at the time it is
       merged. Reconstructing it at release time always misses something.
    3. Never edit a released section. It is a record.
    4. Keep the link definitions at the bottom in step with the versions.

  Release checklist:
    1. Rename Unreleased to the new version with today's date.
    2. Add a fresh empty Unreleased above it.
    3. Update the link definitions at the bottom.
    4. Bump MARKETING_VERSION in project.yml.
    5. Commit, tag "vX.Y.Z", push the tag, and publish a GitHub release.
-->

# Changelog

All notable changes to Lyricar are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- When only the Lock Screen Live Activity shows lyrics, or the app is in the
  background, Lyricar now asks Spotify for the playback position every 3 s.
  Before, a Live Activity counted as a visible screen and polled every second,
  and the background polled every 2 s while playing. On a locked phone that
  earned a 98 minute rate limit from Spotify. Lines still change on time: the
  local clock carries them between polls, and the poll at the end of a track
  still catches the next song. The phone in front and CarPlay keep 1 s polls.

### Added

- The diagnostics log records empty and failed polls, rate limits with their
  Retry-After included, so `scripts/pull-diagnostics.sh` can tell a stalled
  poll loop from nothing playing.
- Debug builds: `-LyricarDemoSong`, together with `-LyricarDemo`, plays an
  invented song with lyrics written for this project, offline. Use it for
  screenshots and recordings.

## [0.1.0] - 2026-10-21

First public release.

### Added

- Synced lyrics for the track currently playing on your Spotify account,
  fetched at runtime from LRCLIB.
- iPhone views: karaoke, focus and verse.
- Lock Screen Live Activity and Dynamic Island, advancing with every line.
- Home Screen and Lock Screen widgets: Lyric Line, Verse, Up Next and Remote.
- CarPlay templates: Karaoke, Focus, Stage and Track. Running CarPlay on a real
  device needs Apple's CarPlay entitlement; the Simulator works without it.
- Eight styles, chosen app-wide or per widget.
- Playback controls (previous, play and pause, next) and tap-to-seek on a
  lyric line. Both need Spotify Premium.
- Per-track sync nudge for lyrics that run early or late, remembered per track.

[Unreleased]: https://github.com/noluyorAbi/lyricar/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/noluyorAbi/lyricar/releases/tag/v0.1.0
