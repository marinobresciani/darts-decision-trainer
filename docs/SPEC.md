# Darts Decision Trainer --- Application Specification

**Status:** Initial implementation specification\
**Primary target:** React Native + React Native Web\
**Game:** X01 / 501\
**Primary purpose:** Train dart-by-dart decision making rather than
physical throwing skill.

------------------------------------------------------------------------

## 1. Product Vision

Darts Decision Trainer is a simulation-based darts training application.

The trainee does **not** manually enter where a real dart landed.
Instead, before every dart, the trainee chooses the target that the
simulated player should aim at. The application then simulates the
actual landing position according to the selected simulated player's
ability, dartboard geometry, and the darts already in the board.

The core training loop is:

1.  Observe the current game state.
2.  Decide where to aim.
3.  Have that decision evaluated.
4.  Simulate the physical throw.
5.  Recalculate from the new state.
6.  Repeat for every dart.

The app should train:

-   route planning;
-   mental arithmetic and rapid recalculation;
-   checkout knowledge;
-   setup play;
-   bogey-number avoidance;
-   decision making under opponent pressure;
-   choosing between multiple legitimate routes;
-   adapting to misses;
-   adapting to blocked or crowded beds;
-   target switching;
-   understanding likely miss consequences.

The application must distinguish **decision quality** from **throw
quality**. A strategically correct choice can produce a bad physical
result, and a poor strategic choice can occasionally produce a lucky
result.

------------------------------------------------------------------------

## 2. Technical Direction

### 2.1 Client

Build the application using:

-   React Native;
-   React Native Web;
-   TypeScript.

The core gameplay and business logic must be platform-independent and
must not depend on browser-only APIs.

The same game engine should be usable by:

-   web;
-   iOS;
-   Android.

### 2.2 Recommended project structure

``` text
src/
  components/
  screens/
  game/
    engine/
    routes/
    simulation/
    board/
    scoring/
    types/
  data/
  hooks/
  state/
  utils/
```

Keep the game engine separate from UI code.

Core engine functions should preferably be deterministic pure functions
when supplied with game state, configuration, and a seeded random
source.

### 2.3 MVP persistence

The first MVP does not require accounts or a backend.

Local state/persistence is sufficient for:

-   settings;
-   selected difficulty/player profile;
-   completed-leg statistics;
-   training history.

Architecture should not prevent a backend from being added later.

------------------------------------------------------------------------

## 3. Core Game

### 3.1 Initial game mode

MVP game mode:

**501, straight in, double out.**

Each player begins on 501.

A visit contains a maximum of three darts.

Standard bust rules apply.

### 3.2 Primary gameplay state

At minimum, maintain:

``` ts
type GameState = {
  playerScore: number;
  opponentScore: number | null;

  dartsRemainingInVisit: 1 | 2 | 3;
  visitScore: number;

  dartsInBoard: SimulatedDart[];

  visitNumber: number;
  totalDartsThrown: number;

  playerProfile: PlayerProfile;

  legStatus: 'active' | 'won' | 'lost';
};
```

The actual implementation may extend this model.

------------------------------------------------------------------------

## 4. Per-Dart Interaction

Before every simulated dart, show enough information for the trainee to
make a decision.

At minimum:

-   current score;
-   darts remaining in the visit;
-   opponent score/state when opponent simulation is enabled;
-   previous darts in the current visit;
-   relevant blocked/crowded target information.

The trainee then selects an **intended target**.

The application should normally offer approximately **10 plausible
target buttons**, rather than every possible dartboard target.

Examples:

-   T20
-   T19
-   T18
-   T17
-   T16
-   S20
-   D20
-   D16
-   25
-   Bull

The exact candidates are generated dynamically from the current game
state.

After selection:

1.  evaluate the intended target strategically;
2.  give appropriate decision feedback;
3.  simulate the dart;
4.  show the actual landing result;
5.  update board and game state;
6.  request the next decision.

------------------------------------------------------------------------

## 5. Decision Evaluation

### 5.1 Separate decision from result

Never grade a decision based solely on where the simulated dart happens
to land.

Example:

-   trainee correctly selects T19;
-   simulation produces S7;
-   strategic decision can still be rated highly.

Likewise:

-   trainee chooses a strategically poor target;
-   simulated dart happens to produce a useful score;
-   the decision remains poor.

### 5.2 Decision categories

Internally, route choices should support grades such as:

``` ts
type DecisionGrade =
  | 'preferred'
  | 'good_alternative'
  | 'acceptable'
  | 'poor'
  | 'invalid';
```

These labels do not necessarily need to be shown verbatim to the user.

### 5.3 Multiple correct answers

The engine must **not** assume every score has one canonical route.

Multiple targets can be legitimate.

The route engine should rank alternatives based on factors such as:

-   checkout probability;
-   setup quality;
-   miss consequences;
-   bogey avoidance;
-   darts remaining;
-   opponent pressure;
-   player profile;
-   board obstruction;
-   preferred doubles;
-   ability to preserve multiple routes after a miss.

A less conventional route must not automatically be considered wrong.

------------------------------------------------------------------------

## 6. Checkout and Route Engine

Do **not** implement checkout strategy as a simple:

``` text
score -> one memorized checkout sequence
```

Instead, represent checkout play as a decision graph.

At every dart, evaluate possible next targets based on the resulting
states.

### 6.1 Targets considered

The route engine must be capable of considering:

-   singles;
-   doubles;
-   trebles;
-   outer bull / 25;
-   bullseye / 50.

Doubles and bull can be valid tactical targets before the final dart.

Examples of unconventional but potentially legitimate routes include
routes using repeated doubles or bull during a combination.

### 6.2 Reference checkout tables

Provided checkout tables can be used as:

-   seed/reference data;
-   conventional route knowledge;
-   candidate generation hints.

They must **not** be treated as the complete decision engine.

The engine must support orthodox and unorthodox alternatives.

------------------------------------------------------------------------

## 7. Bogey Numbers

Bogey avoidance is a core training objective.

Important standard three-dart bogey scores include:

-   169
-   168
-   166
-   165
-   163
-   162
-   159

The engine should understand both:

-   whether the current score is a bogey;
-   whether a likely miss from the chosen target would leave a bogey.

### Example

Current score: **189**\
Darts remaining: **1**

Choosing **T20** is strategically dangerous because the common S20 miss
leaves:

**169**

169 cannot be checked out in three darts.

The app should flag this strategic problem **at target selection time**,
before simulating the physical dart.

This illustrates an important rule:

> Decision evaluation must consider the distribution of likely misses,
> not only the result of hitting the intended target.

------------------------------------------------------------------------

## 8. Opponent Pressure

Route quality may depend on the opponent's state.

Examples:

-   opponent is above checkout range;
-   opponent is on a large finish;
-   opponent is on a strong two-dart finish;
-   opponent is sitting on a preferred double.

The same player's score can therefore produce different route rankings
depending on opponent pressure.

The route engine input should include opponent state when available.

For the first MVP, opponent simulation can be implemented after the core
single-player decision loop, but the route-engine API must support it
from the beginning.

------------------------------------------------------------------------

## 9. Simulated Player Profiles

### 9.1 Difficulty concept

Difficulty is intentionally inverse to simulated player strength.

A highly skilled simulated player makes the decision exercise easier
because the actual result usually resembles the intended target.

A weak simulated player makes the exercise harder because the trainee
must continually recover from misses and unusual scores.

Example profiles:

  Training difficulty     Approx. simulated 3-dart average
  --------------------- ----------------------------------
  Easy                                            100--110
  Medium                                            70--80
  Hard                                                \~50
  Extreme                                           25--30

These numbers are starting points and require calibration.

### 9.2 Average is not enough

Do not model a player only by a desired average.

Two players with the same average can have different miss patterns.

Use a physical **dispersion model**.

A profile may contain parameters such as:

``` ts
type PlayerProfile = {
  id: string;
  name: string;

  targetAverage: number;

  radialAccuracy: number;
  angularAccuracy: number;

  doubleAccuracyModifier: number;
  trebleAccuracyModifier: number;
  bullAccuracyModifier: number;

  largeMissProbability: number;
};
```

Exact parameters should be refined experimentally.

------------------------------------------------------------------------

## 10. Physical Dart Simulation

### 10.1 Geometry-based simulation

The simulation should model an intended point on a standard dartboard
and generate an actual landing point around it.

Conceptually:

``` text
intended target
    ↓
target coordinate
    ↓
apply player dispersion
    ↓
apply obstruction/deflection effects
    ↓
actual board coordinate
    ↓
resolve segment and multiplier
    ↓
score
```

Avoid simply assigning arbitrary probabilities such as:

``` text
T20 -> 20% T20, 50% S20, 15% S5...
```

A geometry-based model naturally produces neighboring misses and can
later support more realistic obstruction.

### 10.2 Dartboard geometry

Model:

-   numbered wedges;
-   inner single;
-   treble ring;
-   outer single;
-   double ring;
-   outer bull;
-   bullseye;
-   non-scoring area outside the double ring.

The simulator must know neighboring numbers according to real dartboard
layout.

### 10.3 Outside-board misses

When aiming at a double, especially with a weak player profile, an
outward miss can land outside the scoring area and score **0**.

Possible double-target outcomes therefore include:

-   intended double;
-   inward single;
-   neighboring double/single;
-   outside scoring area, 0.

This behavior should emerge from geometry rather than a special
hard-coded result whenever possible.

------------------------------------------------------------------------

## 11. Darts Already in the Board

Darts remain physically in the board until the visit ends.

Each simulated dart should retain at least:

``` ts
type SimulatedDart = {
  x: number;
  y: number;

  segment: number | 'bull';
  multiplier: 0 | 1 | 2 | 3;

  score: number;

  entryAngle?: number;
};
```

At the end of the visit, `dartsInBoard` is cleared.

------------------------------------------------------------------------

## 12. Obstruction and Target Switching

A dart already in the board may obstruct a later target.

This is a major training mechanic.

### 12.1 Important rule

A dart in **S20 does not automatically block T20**.

Obstruction must be based on physical position and, eventually, dart
angle.

A single dart can substantially obstruct a bed if badly positioned.

Conversely, two tightly grouped darts may still leave enough space for
another dart.

### 12.2 Effects of obstruction

If a target is partially blocked:

-   probability of cleanly reaching the intended point decreases;
-   deflection probability increases;
-   neighboring outcomes become more likely;
-   bounce-outs may eventually be modeled;
-   another target may become strategically preferable.

Example:

-   T20 is significantly obstructed;
-   T19 is clear;
-   route engine may rank T19 above T20.

If the trainee continues aiming at the blocked T20, that choice may be
graded lower and the simulation should reflect the physical
disadvantage.

### 12.3 Initial implementation

For MVP, use a simplified collision/clearance model based on distance
between the intended trajectory/landing region and existing darts.

Later versions can model:

-   barrel/flight footprint;
-   dart angle;
-   stacking;
-   deflections;
-   bounce-outs.

------------------------------------------------------------------------

## 13. Candidate Target Generation

Before each dart, generate roughly 10 meaningful choices.

Candidates should intentionally contain a mixture of:

-   preferred route;
-   strong alternative;
-   acceptable alternative;
-   tempting but strategically poor choice;
-   occasional clearly invalid choice where educationally useful.

Candidate generation should avoid obviously irrelevant targets that
provide no learning value.

Candidates depend on:

``` text
score
+ darts remaining
+ opponent state
+ player profile
+ darts already in board
+ blocked/crowded targets
```

------------------------------------------------------------------------

## 14. Feedback

Feedback should be immediate but concise.

### Correct/strong choice

Examples:

-   `Good route.`
-   `Strong alternative.`
-   `Good switch — T20 is obstructed.`

### Strategic problem

Examples:

-   `Risky: a single 20 leaves 169, a bogey.`
-   `T20 is heavily obstructed; T19 gives a cleaner route.`

The application should explain **why** when the decision has educational
value.

Do not overwhelm the player with route theory after every obvious
scoring dart.

------------------------------------------------------------------------

## 15. Visit and Leg Flow

### Per dart

``` text
Display state
→ Generate candidate targets
→ User selects intended target
→ Evaluate strategic choice
→ Simulate physical dart
→ Resolve score
→ Update board state
→ Check bust / checkout
→ Continue or end visit
```

### End of visit

After the third dart, or earlier after a bust/checkout:

-   show visit total;
-   show remaining score;
-   clear physical darts from board;
-   update opponent if enabled;
-   begin next visit.

Do not unnecessarily reveal/repeat the recalculated remaining score
after every dart if the chosen training presentation mode is intended to
exercise arithmetic. The UI can support a setting for this later.

------------------------------------------------------------------------

## 16. Checkout Rules

Standard double-out behavior:

A leg is won only if the player's score reaches exactly 0 and the final
scoring dart is a double, including bullseye.

Bust occurs if the visit causes:

-   score below 0;
-   score to become 1;
-   score to reach 0 without finishing on a double.

On bust:

-   restore score to the value at the start of the visit;
-   end the visit.

------------------------------------------------------------------------

## 17. Statistics

Track at least:

-   darts thrown;
-   visits;
-   actual three-dart average;
-   target simulated average;
-   checkout darts;
-   checkout percentage where meaningful;
-   decision-grade counts;
-   preferred-route percentage;
-   bogey mistakes;
-   obstruction-related decisions;
-   average decision quality.

Important:

The **actual scoring average** measures what the simulator happened to
throw.

The **decision score** measures the trainee.

These must remain separate.

------------------------------------------------------------------------

## 18. Simulation Calibration

The simulator must be testable statistically.

For each player profile, automated simulations should run many
legs/visits and measure:

-   achieved three-dart average;
-   treble hit rate;
-   double hit rate;
-   single hit rate;
-   neighbor miss distribution;
-   zero/outside-board rate;
-   checkout rate.

A profile labeled approximately `50 average` should converge near that
level over a sufficiently large sample.

A single leg may vary substantially.

The two manual prototype legs demonstrated why calibration is required:
nominal 50-average simulation produced approximately 71.57 and 62.63 in
individual legs.

Do not tune the model to force every individual leg to exactly match the
target average.

------------------------------------------------------------------------

## 19. Randomness and Testing

Support seeded randomness.

Example:

``` ts
simulateDart({
  target,
  playerProfile,
  boardState,
  rng
})
```

This allows:

-   reproducible unit tests;
-   replaying problematic legs;
-   deterministic coding-agent tests;
-   calibration.

------------------------------------------------------------------------

## 20. Core Engine Interfaces

Suggested conceptual APIs:

``` ts
generateTargetCandidates(
  gameState: GameState
): TargetCandidate[];

evaluateTargetChoice(
  gameState: GameState,
  target: DartTarget
): DecisionEvaluation;

simulateDart(
  gameState: GameState,
  target: DartTarget,
  rng: RandomSource
): SimulatedDart;

applyDartResult(
  gameState: GameState,
  dart: SimulatedDart
): GameState;

calculateObstruction(
  target: DartTarget,
  dartsInBoard: SimulatedDart[]
): ObstructionResult;
```

Keep route evaluation and physical simulation separate.

------------------------------------------------------------------------

## 21. MVP Screens

### Home

-   Start training
-   Select simulated player/difficulty
-   Statistics
-   Settings

### New Training Leg

-   difficulty/player profile;
-   starting score: 501 for MVP;
-   opponent mode, if implemented.

### Game Screen

Prominently display:

-   current score;
-   darts remaining;
-   opponent score/state;
-   target-choice buttons;
-   result of last dart;
-   current-visit darts;
-   strategic feedback.

A graphical dartboard is desirable, especially for displaying dart
positions and obstruction, but the first functional MVP may begin with
target buttons plus a simplified board visualization.

### Leg Summary

Display:

-   darts used;
-   three-dart average;
-   decision performance;
-   mistakes;
-   checkout;
-   notable bogey/setup decisions.

------------------------------------------------------------------------

## 22. Responsive UI Requirements

The application must work well on:

-   mobile portrait;
-   tablet;
-   desktop web.

Target buttons must be large enough for rapid interaction.

Desktop web should not simply stretch a mobile column across the entire
screen.

Suggested desktop layout:

``` text
+----------------+---------------------------+
| Score / state  |                           |
| Opponent       |       Dartboard           |
| Visit info     |                           |
+----------------+---------------------------+
|        Target choices / feedback           |
+--------------------------------------------+
```

Mobile can stack these areas vertically.

------------------------------------------------------------------------

## 23. MVP Implementation Phases

### Phase 1 --- Deterministic darts game engine

Implement:

-   501 state;
-   scoring;
-   visits;
-   double-out;
-   bust;
-   target model;
-   unit tests.

### Phase 2 --- Physical dartboard simulator

Implement:

-   dartboard geometry;
-   target coordinates;
-   player dispersion;
-   segment resolution;
-   outside-board misses;
-   seeded RNG;
-   statistical calibration tools.

### Phase 3 --- Route engine

Implement:

-   checkout/reference data;
-   bogey detection;
-   candidate target generation;
-   route alternatives;
-   decision grading;
-   likely-miss evaluation.

### Phase 4 --- React Native Web gameplay UI

Implement:

-   game screen;
-   target buttons;
-   score/visit state;
-   feedback;
-   responsive web/mobile layout.

### Phase 5 --- Board obstruction

Implement:

-   physical dart positions;
-   target clearance;
-   obstruction penalties;
-   route switching.

### Phase 6 --- Opponent and advanced training

Implement:

-   simulated opponent;
-   pressure-aware route ranking;
-   richer statistics;
-   custom player profiles.

------------------------------------------------------------------------

## 24. MVP Acceptance Criteria

The first usable version is successful when:

1.  A user can start a 501 leg.
2.  Before every dart, the user chooses an intended target.
3.  The app generates a physical result from a configurable player
    profile.
4.  Misses correspond sensibly to dartboard geometry.
5.  Double attempts can miss outside the scoring area for zero.
6.  The game correctly handles visits, busts, checkout, and double-out.
7.  The route engine can distinguish preferred, acceptable, poor, and
    invalid decisions.
8.  Multiple legitimate routes can receive positive evaluation.
9.  The engine detects important bogey/setup mistakes.
10. Darts remain in the board for the current visit and can obstruct
    later targets.
11. Obstruction can change route preference.
12. The simulation and decision evaluation are independent.
13. A completed leg reports actual three-dart average separately from
    decision performance.
14. A seeded simulation can reproduce the same leg.
15. The application runs from one React Native codebase on web and is
    architected for iOS/Android.

------------------------------------------------------------------------

## 25. Key Design Principle

The central product rule is:

> **The user chooses the decision; the simulator chooses the outcome.**

Everything in the architecture should preserve that distinction.

The application is not primarily a checkout-table quiz and not primarily
a virtual darts game. It is a **decision-making simulator** that
repeatedly forces the trainee to recalculate and choose a strong target
under realistic uncertainty.
