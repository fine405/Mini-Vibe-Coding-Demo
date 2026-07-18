# Theme media sources

The Summer files are temporary local-demo assets copied from dany.works on
2026-07-18. The source site does not publish a reuse license for them. Obtain
permission from the author or replace those files with licensed media before
any public deployment, distribution, or commercial use. Drizzle permission is
recorded separately with its asset below. Snow provenance is recorded from the
user-provided file metadata; no reuse license was provided.

## `summer-leaves.mp4`

- Source: <https://dany.works/leaves.mp4>
- SHA-256: `79adbb7e31e20085e974b278b60b52c4bb5f8132beeee6aa38a6eac682ed3d75`
- File: 348,250 bytes; 720 × 1280; 30 fps; 12 seconds; H.264
- Handling: original file; no cropping, crossfade, or transcoding

## `summer-forest.mp3`

- Source: <https://dany.works/forest.mp3>
- SHA-256: `db189a28c237a74f071b5dfa99463daac3cfdf9decd623e2f6e32d1d35141bec`
- File: 1,961,805 bytes; 196.152 seconds; 24 kHz mono; 80 kbps MP3
- Handling: original file; no trimming or transcoding

## `drizzle-rain.mp3`

- Source: <https://www.youtube.com/watch?v=dGwbIjhDhOE>
- Source title: `✅世界公認最佳放鬆雷雨聲，樹林自然白噪音放鬆睡眠音樂雷雨聲…`
- Author/channel: `自然音樂` (`@whitenoiseforsleeping`)
- Permission: the user confirmed on 2026-07-18 that they obtained the
  author's permission to use this excerpt
- SHA-256: `ccc714cfcaa8e836b74468c9ebf2538e25c1eca2ea9939a59abb42b2c48f47c1`
- File: 1,441,468 bytes; 60.029 seconds; 44.1 kHz stereo; 192 kbps MP3
- Handling: source audio `0:00–1:00` only; transcoded from YouTube AAC to
  MP3 with a 1 dB gain reduction to prevent clipping; no other source content
  is included
- Application playback: volume `0.5` (approximately 6 dB below the asset)
- Thunder ranges, relative to the clip:
  - `12.0–17.4s`
  - `22.3–25.0s`
  - `26.0–38.0s`
  - `44.9–60.0s` (continues beyond the clip boundary)
- Detection: 100 ms frames comparing energy below 250 Hz with energy above
  500 Hz, smoothed over 500 ms and verified against a 20–800 Hz spectrogram.
  The same ranges are exported by `src/modules/theme/drizzleAudio.ts` for
  synchronized effects.

## `snow-christmas.mp3`

- Source: user-provided local file `Christmas.mp3` on 2026-07-18
- Embedded artist: `SchisMatiC`
- Embedded title: `圣诞结（纯钢琴伴奏）`
- Embedded album: `Christmas 2025`
- Permission: no reuse license or permission record was provided
- SHA-256: `af9a64a8287e1bf75d328cb9dc90e0b2b9a3c9f7a6f878dd029edaaf0ec22091`
- File: 8,133,469 bytes; 201.195 seconds; 44.1 kHz stereo; 320 kbps MP3
- Handling: original file; no trimming or transcoding
- Application playback: volume `0.5`

## Snow theme visual effect

- Inspiration: layered parallax snowfall from
  <https://www.shadertoy.com/view/Mdt3Df> ("Snow (as shown in sweden)" by
  Emil) and its sky-blue gradient palette (vec4(0.4, 0.8, 1.0) ≈ #66CCFF)
- Implementation: original code, no source assets copied — the effect is a
  procedural three.js particle system with sixteen crystal types generated
  from stock primitives; the wintry theme palette is derived from the
  reference gradient
- Crystal taxonomy, ids, names, and spawn weights: product snow crystal
  data table (see `src/modules/theme/snowflakes.ts`)
