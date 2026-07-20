# Prompt card image set

This directory contains 18 light-theme and 18 dark-theme prompt-card images. Each final asset is an individual 640×480 WebP so it can be cached, lazy-loaded, theme-switched, and replaced independently.

## Light-theme generation prompt

Use the shared prompt below, followed by one `Primary request` from the subject table.

```text
Use case: stylized-concept
Asset type: 4:3 prompt-card thumbnail for an AI coding or trading prompt gallery
Input images: when supplied, Image 1 is a style reference only; do not edit it and do not copy its exact subject
Scene/backdrop: warm pearl-white studio field with a very subtle cool-blue atmospheric gradient
Style/medium: premium miniature 3D editorial illustration, simplified geometric forms, subtle glassmorphism, cohesive product-design asset
Composition/framing: landscape 4:3, centered compact subject occupying about 70–75 percent, full bleed, generous clean margins, instantly readable at thumbnail size
Lighting/mood: soft diffuse daylight, polished and calm, gentle blue ambient glow
Color palette: pearl white, mist gray, cobalt blue, periwinkle, tiny cyan accents; avoid red-green market clichés
Materials/textures: frosted glass, satin ceramic, soft matte metal, wide feathered shadows
Constraints: create a new subject while preserving the shared visual language; no text, letters, numbers, labels, logos, watermark, people, screenshot border, or baked rounded card frame
Avoid: clutter, photorealism, sharp black outlines, purple dominance, overly bright glow
Primary request: <subject from the table below>
```

The first `review-ux`, `project-health-dashboard`, and `candlestick-moving-averages` images established the style. Later light images used one of those images only as a style reference.

## Subject prompts

| Tab | ID | Primary request |
| --- | --- | --- |
| Starter | `review-ux` | A magnifying glass carefully inspecting a layered collection of compact interface panels, with one panel brought into clear focus. |
| Starter | `add-feature` | A modular interface system receiving one useful new cobalt feature block that fits cleanly into the existing structure. |
| Starter | `fix-problems` | A large precision wrench repairing a broken connection between interface nodes, with the repaired flow glowing softly. |
| Starter | `improve-accessibility` | A universal accessibility figure inside a clear focus ring, accompanied by a large target and cursor control. |
| Starter | `add-tests` | A central checklist and protective shield connected to several interface modules, communicating systematic test coverage. |
| Starter | `simplify-architecture` | Several tangled translucent data paths converging through a compact processor into one clean, understandable pipeline. |
| Generative UI | `project-health-dashboard` | A compact health dashboard sculpture with a donut metric, rising line chart, gauge, data grid, and vertical bars. |
| Generative UI | `release-readiness` | A rising readiness curve above a horizontal sequence of completed stages leading to a final release control. |
| Generative UI | `agent-architecture` | A left-to-right agent pipeline made from five connected processing modules, flowing from request orb to safe interface output. |
| Generative UI | `product-comparison` | Two balanced product dashboard towers connected through a central comparison spine, with charts, sliders, and metrics. |
| Generative UI | `incident-review` | A timeline beneath a performance curve that peaks, falls, and stabilizes, with inspect, protect, repair, and verify nodes. |
| Generative UI | `weather-outlook` | Three floating weather forecast panels for sun, rain, and partly cloudy conditions connected by a simple three-step timeline. |
| Trading | `candlestick-moving-averages` | A clean candlestick price series staged on translucent glass with one smooth moving-average curve crossing the candles. |
| Trading | `volume-macd` | An aligned financial dashboard with candlesticks and price curve, translucent volume bars, two momentum curves, and a centered histogram. |
| Trading | `rsi-momentum` | A two-tier market momentum scene with candlesticks and a trend curve above, plus an oscillator moving between two translucent boundary bands below. |
| Trading | `equity-benchmark` | Two distinct rising performance ribbons beginning at one shared origin and diverging across a translucent comparison stage. |
| Trading | `drawdown-analysis` | A performance path descending into a clearly modeled translucent trough and then recovering, emphasizing depth and recovery. |
| Trading | `multi-asset-comparison` | Three normalized performance curves in cobalt, periwinkle, and cyan beginning from one common baseline and diverging across a comparison stage. |

## Dark-theme edit prompt

Each dark asset was edited from its matching light image with the complete prompt below.

```text
Use case: lighting-weather
Asset type: 4:3 prompt-card thumbnail, dark-theme counterpart
Input images: Image 1 is the exact light-theme composition to preserve
Primary request: convert only the palette, materials, backdrop, and lighting into a polished dark-theme counterpart
Scene/backdrop: deep graphite-navy studio field with a subtle cobalt and cyan ambient bloom
Style/medium: preserve the same premium miniature 3D editorial illustration and simplified geometric forms
Composition/framing: preserve the exact subject identity, geometry, camera angle, framing, scale, object count, and spatial relationships from Image 1
Lighting/mood: low-key soft studio lighting with crisp readable silhouettes at thumbnail size, controlled luminous edges, no crushed blacks
Color palette: ink navy, charcoal glass, electric cobalt, cyan, restrained periwinkle, and cool silver highlights
Materials/textures: smoked frosted glass, dark satin ceramic, matte graphite metal, broad soft shadows
Constraints: change only theme treatment and lighting; no text, letters, numbers, labels, logos, watermark, people, new objects, removed objects, crop, reframe, screenshot border, or baked rounded card frame
Avoid: neon overload, pure black voids, red-green market colors, purple dominance, glare that obscures the subject
```

## Output pipeline

- Built-in ImageGen mode; no local image API key or CLI was used.
- Generated PNG masters: 1448×1086, exact 4:3.
- Runtime assets: `cwebp -q 82 -m 6 -resize 640 480`.
- Runtime files live in `light/` and `dark/`; generated masters remain in the local Codex image output directory.
