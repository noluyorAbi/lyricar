# Landing page

The site at [lyricar.adatepe.dev](https://lyricar.adatepe.dev). Static HTML, CSS and a little
vanilla JavaScript: no framework, no build step, no npm dependency, and no request to a third
party host. The committed files are what Vercel serves (project `lyricar`, see `.vercel/`).

```
python3 -m http.server 4321 --bind 127.0.0.1 --directory landing   # or: sh landing/preview.sh
```

## What the page is

The hero is the app's now playing screen rebuilt in HTML: Karaoke, Focus and Verse views, the
mode picker, transport and progress, with the line advancing on a clock. The surfaces below it
(Dynamic Island, Lock Screen Live Activity, widgets, CarPlay) and the eight style cards all run on
that same clock, the way one `LyricsEngine` feeds every surface in the app. Picking a style
restyles the whole page.

The song, "Amber on the Dashboard" by The Lyricar House Band, is invented. Its lines and timings
match `DemoSong` in `Packages/LyricsKit`, so the page, the demo video and the screenshots show the
same lyrics and none of them shows a real song's lyrics.

## Where the look comes from

| On the page | In the app |
|---|---|
| Style tokens in `styles.css` (`[data-style="..."]`) | `Shared/LyricTheme.swift`: background, base, accent, stripe, ink, dim (0.38 or 0.45), faint (0.16), lyric and label faces, progress style |
| Karaoke sheet: current line at 32 % of the view, others scaled to 0.96, faded mask top and bottom | `KaraokeView` in `Lyricar/UI/LyricModes.swift` |
| Focus: new line rises 40 px, old line leaves upward | `FocusView` |
| Motion curve `cubic-bezier(0.16, 1, 0.3, 1)`, 0.45 s | `Theme.settle` in `Shared/Theme.swift` |
| Mode picker pill sliding between segments | `ModePicker` in `NowPlayingView.swift` |
| Motorsport badge, gradient line, accent glyph | `StripeMark` and `StyleMark` |
| CarPlay list that starts at the current line | `CarPlayLyricsController` |

Change a style in the app, change the matching block here.

## Rules

- **No inline anything.** `vercel.json` sends `script-src 'self'; style-src 'self'`. No
  `<style>`, no `style=` attributes (inline SVG included), no inline scripts or `on*` handlers.
  Runtime styling goes through the CSSOM (`el.style.transform`, `setProperty`), which the policy
  allows.
- **Content in the HTML.** Every word, every lyric line and every link is in `index.html`, so
  crawlers and agents read the page without running `app.js`. The lyrics for the clock are read
  from the karaoke list.
- **Motion has a way out.** With `prefers-reduced-motion: reduce` the song starts paused, lines
  change by a short crossfade, nothing slides. The clock only runs while a live section is on
  screen and the tab is visible, and the play button pauses it everywhere.
- **No horizontal scroll at 390 px.** Every single-column grid uses `minmax(0, 1fr)`.
- **Fonts are self-hosted.** `fonts/` holds Latin subsets of the Barlow faces the app bundles
  (SIL Open Font License, `fonts/OFL-Barlow.txt`). The rounded, serif and mono styles use system
  faces (`ui-rounded`, `ui-serif`, `ui-monospace`) with fallbacks.
- **Outbound links to the repository carry `utm_source=landing`** and a `utm_medium` naming the
  slot (`nav`, `hero-primary`, `footer-repo`, ...).

## Files

| File | What it is |
|---|---|
| `index.html` | The page |
| `styles.css` | Style tokens and layout |
| `app.js` | The clock, line rendering for every surface, modes, styles, copy buttons |
| `fonts/` | Barlow subsets and their license |
| `assets/demo.mp4`, `assets/demo-poster.jpg` | The demo video (same file as `docs/media/demo.mp4`) and its first frame |
| `assets/og.png` | Social card, 1200 by 630, composed from Simulator screenshots of the demo song |
| `assets/favicon.svg` | The app icon: three lines, the current one in amber |
| `llms.txt`, `robots.txt`, `sitemap.xml`, `.well-known/security.txt`, `site.webmanifest` | For crawlers, agents and browsers |
| `vercel.json` | Security headers, caching, and redirects from the `vercel.app` aliases to the domain |
