# TAKE A SEAT

A small chair with very big ambitions. A complete browser arcade game built with Three.js and Vite. All scene geometry is original and procedural.

## Play

WASD or arrow keys move relative to the camera. Hold Space while standing still near a glowing pedestrian to charm them into sitting. VIPs take longer and award double points. Each successful sit adds four seconds; consecutive sits multiply points up to 5x. Shift dashes, with a three-second recharge. Cleaning robots cost seven seconds and break your combo. P pauses. Touch controls appear on touch devices. Sound is opt-in.

Complete three escalating shifts (3, 5, then 7 sitters). Local best scores persist on this browser. No accounts or server required.

## Development

Requires Node.js 22.12+ (Node 24 recommended).

```
npm ci
npm run dev
npm test
npm run build
npm run preview
```

## Deploy to Vercel

Import `mosrvs2025/chairgame` in Vercel. Use the repository root, Vite framework preset, `npm run build`, and output directory `dist`. `vercel.json` includes these settings. No environment variables, database, paid services, or API keys are needed. Google Fonts is optional; system fallbacks work offline.

## Implementation

- `src/main.js`: procedural plaza, character animation, input, AI, state transitions, audio, and rendering.
- `src/rules.js`: scoring, shift definitions, collision and movement helpers.
- `src/style.css`: responsive title, gameplay HUD, mobile controls and dialogs.
- `src/rules.test.js`: scoring, bounds, and progression checks.

Renderer pixel ratio is capped at 1.7, geometry uses low polygon counts, materials are shared, and hidden tabs pause gameplay. Reduced-motion preference disables title chair motion. WebGL is required; failure leaves an explanatory message. This is a polished arcade foundation, not a large-studio AAA production.
