# Gravi

A browser-based 3D exploration game where changing gravity opens new routes and awakens a small forest.

[Play the game](https://gravi.eduardosalomonm.chatgpt.site/) · [Case study](https://eduardosalomon.eilvi.com/projects/gravi) · [Portfolio](https://eduardosalomon.eilvi.com/)

![Gravi gameplay screenshot](https://raw.githubusercontent.com/eduardosalomonm/eduardosalomonm/main/assets/gravi.webp)

## Engineering focus

- A spherical world with gravity directed toward the planet centre.
- Fixed-step movement, jumping, collision handling, and camera-relative input.
- Ten forest challenges, progressive hints, a map, and locally saved progress.
- Touch and keyboard controls, reduced-motion support, and browser-based audio.

## Run locally

Use Node.js 22.13 or newer (Node 24 LTS recommended).

```sh
npm ci
npm run dev -- --host 127.0.0.1
```

Open the local URL printed by the development server. No production credentials are needed. Keep the server running while playing.

## Verification

```sh
npm test
npm run lint
npm run build
```

Browser suites require Playwright and a running local preview. See the scripts in `package.json` for the available gameplay and integration checks.

## Project layout

- `app/` — interfaces, routes, and interaction.
- `lib/` — game rules, state, persistence, and supporting logic.
- `tests/` — domain checks and regression coverage.
- `public/` — bundled public assets.

## Scope

The game uses WebGL2. Progress stays in the browser and does not sync across devices. The game interface is in Spanish.

This public source edition is based on the published v20 snapshot (`f8982c2`). Deployment identity and internal handoff notes are excluded. Local Vite configuration uses generic bindings. This repository is independent of the hosted game's deployment.
