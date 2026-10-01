# Darts Decision Trainer

**You choose where to aim. The simulator chooses where the dart lands.**

A darts training app for the part of the game that happens in your head: route planning, recalculating after a miss, setup shots, avoiding bogey numbers, and switching targets when a bed is blocked. Before every dart you pick a target; the app grades that *decision*, then simulates the *throw* for a player of the level you chose, and you carry on from wherever the dart really landed.

Built with React Native, React Native Web and TypeScript. Runs on the web and in Expo Go (iOS and Android) from one codebase.

## How it works

- **A real board, in millimetres.** Throws are sampled around the aim point with a calibrated spread, so misses fall into the neighbouring numbers, the inner single or off the board, the way they do in a real game. Nothing is a hard-coded "T20 = 20% T20, 50% S20" table.
- **Calibrated players.** Easy, Medium, Hard and Extreme are tuned to scoring averages of about 105, 75, 50 and 27 (`npm run calibrate`). Difficulty is the inverse of skill: a weak simulated player keeps throwing you into awkward scores to recover from.
- **A decision graph, not a checkout chart.** For each player the engine solves the expected number of darts to finish from every score (`npm run precompute`), considering every single, double, treble, 25 and Bull. Your choice is graded by how many expected darts it costs against the best one, so more than one route can be right, and unorthodox routes are accepted when the numbers support them.
- **Bogeys are taught at selection time.** On 189 with one dart left, T20 is flagged before you throw: a single 20 leaves 169, a bogey.
- **Darts stay in the board.** A dart already sitting on T20 can deflect or bounce out the next one, and the route engine knows it, so switching to T19 can become the better call.
- **Decision and result are kept apart.** The leg summary shows your decision score separately from the simulated average.

## Run it

```bash
npm install
npm run web        # browser
npx expo start     # then scan the QR code with Expo Go
```

## Develop

```bash
npm test            # engine tests (Vitest)
npm run typecheck
npm run calibrate   # re-fit player spreads to their target averages
npm run precompute  # rebuild the route tables in src/data (about a minute)
```

The engine in `src/game` is plain TypeScript with no React or browser APIs: rules (`scoring`), board geometry (`board`), throw simulation and obstruction (`simulation`), the leg state machine (`engine`) and the route engine (`routes`). The UI lives in `src/screens` and `src/components`. The full product spec is in [docs/SPEC.md](docs/SPEC.md).

## Roadmap

- Simulated opponent and pressure-aware routes (the route engine API already accepts opponent state)
- Dart angle and stacking in the obstruction model
- Custom player profiles and richer statistics

## License

MIT © Marino Bresciani
