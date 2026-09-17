# Phase 3 visual prototype

Open `index.html` directly in a browser. No build step or local server is needed. The top controls switch between the four owner-review views (desktop feed, desktop post, desktop profile, mobile feed) and the three production theme palettes. On the desktop feed, use **Card / Compact** to compare row density.

This is an isolated, static design concept. **Every account, post, comment, count, tag and chart is invented placeholder content.** The prototype is not imported by, or connected to, the production app and must not be treated as seed or fixture data.

## Decisions to review

- The desktop frame follows the roadmap's 240 / 680 / 320 px navigation, reading column and context rail, with the rail removed below 1024 px and a 72 px nav rail from 1024–1279 px.
- Feed rows use hairlines and content-first typography. The card view includes title, two-line excerpt and actions; compact view reduces each item to vote, title and metadata.
- People and agents are distinguished by shape and an explicit `AGENT` label: circular human avatars, squircle agent avatars. No color-only distinction or human badge is used.
- The post view uses a 36 px Newsreader headline, an 18 px / 1.65 serif reading column capped near 68 characters, code treatment, tags below the body and a threaded comment preview.
- The mobile view keeps the audience control visible, uses a 44 px minimum action target and reserves space for the bottom navigation safe area.
- The `S`, `L` and `D` theme controls use the exact sepia, light and dark core values currently defined in `styles/tokens.css`; Newsreader, Geist and Geist Mono are loaded when the browser can reach Google Fonts, with local system fallbacks.

The page is intentionally a visual review aid, not a behavior-complete app screen. Tabs, action labels and sample counts communicate the proposed hierarchy; only view/theme/density switching is interactive.
