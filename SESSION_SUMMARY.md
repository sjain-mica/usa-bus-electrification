# VIP MVP v5 — Session Summary

## Overview
v5 extends v3/v4 with a refined animated hook section and a new cost overlay that appears after the buses settle into the US map. The existing 4-section scrollytelling dashboard follows.

---

## Stack
Plain HTML + CSS + JS (ES Modules), D3.js v7, TopoJSON, served via `python3 -m http.server 8000`

---

## Sections

| # | Section | Question |
|---|---------|----------|
| Hook | Animated entry | 29,803 bus rects tile screen → animate into US map → cost overlay slides up |
| 1 | Scale *(hidden)* | How big is the diesel school bus problem? |
| 2 | Impact | Is the harm equal nationwide? |
| 3 | Catch-all? | Is electrification always better? |
| 4 | Priority | Where should we electrify first? |

Section 1 is currently hidden (`display:none` in index.html) — easy to restore.

---

## Hook Section (Most Complex)

### Scroll Timeline
`#hook-scroller` height: **350vh** (scrollable = 250vh)

| Constant | Value | Pixel distance |
|----------|-------|---------------|
| TEXT_FADE_END | 0.09 | ~22.5vh |
| BUS_ANIM_START | 0.048 | ~12vh |
| BUS_ANIM_END | 0.528 | ~132vh |
| OVERLAY_START | 0.60 | ~150vh |
| OVERLAY_END | 0.88 | ~220vh |

Constants were rescaled from the original 250vh (150vh scrollable) design to preserve the same pixel-scroll feel after extending to 350vh.

### Cost Overlay (`#hook-overlay`)
After buses settle into the map, a centered card slides up from below to vertically center in the viewport:
- **Headline**: "Annually, these buses drive 495 million miles costing $179 million"
- **Bar chart**: Horizontal bars for Climate vs Health cost breakdown
  - Climate: `#00894b` (~89%, $159M)
  - Health: `#2a8cb7` (~11%, $20M)
  - Percentages rendered inside each bar, font size scaled dynamically to fit
- **Card style**: 30vw wide, centered, solid black background (`#000`), 1px solid white border
- **Animation**: `translate(-50%, calc(-50% + Xvh))` — slides from off-screen to viewport center
- **Data**: `national_costs.json` (copied from v4, fetched in main.js, passed to initHook)

### Files Added/Modified (v5)

```
v5/
  index.html          — added #hook-overlay inside #hook-sticky; section-1 hidden
  css/style.css       — hook-scroller 350vh; #hook-overlay, .hook-headline styles
  js/hook.js          — rescaled constants; overlay animation; drawCostChart() with D3 SVG
  js/main.js          — fetches national_costs.json, passes to initHook()
  js/section2.js      — climate color → #00894b, health color → #2a8cb7
  national_costs.json — new: { total_impact, health_impact, climate_impact }
```

---

## Color Palette (established in v5)
| Category | Color |
|----------|-------|
| Climate impact | `#00894b` (green) |
| Health impact | `#2a8cb7` (blue) |
| Bus / accent | `rgb(255, 214, 0)` (school bus yellow) |

---

## How to Run

```bash
cd "/Users/sonaljain/CLAUDE PROJECTS/vip-mvp/v5"
python3 -m http.server 8000
# Open http://localhost:8000
```

---

## Open Items / Next Steps

- [ ] Restore / redesign Section 1 (currently hidden)
- [ ] Dark → light background transition from hook into the next visible section
- [ ] Map outline animation on scroll completion (currently disabled — `mapAlpha` removed)
- [ ] Section 5 — National vs County Level comparison
- [ ] Mobile/tablet responsiveness
- [ ] Scroll transitions or animations between sections
- [ ] Axis value units/labels confirmation
- [ ] Diverging map legend midpoint label clarity
- [ ] Apply `#00894b` / `#2a8cb7` color palette consistently across all sections
