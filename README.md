# Twist — a colour-and-number card game

A web card game built following the code architecture and libraries of [little-fuck](https://github.com/GregorioFornetti/little-fuck/tree/vibe-code).

## Rules

- 108-card deck: four colours (red, yellow, green, blue), each with one 0, two each of 1–9, and two each of Skip, Reverse and Draw Two; plus four Wild and four Wild Draw Four.
- Each player is dealt 7 cards. Match the discard top by colour, number or symbol, or play a Wild.
- Skip: next player loses a turn. Reverse: direction flips (acts as Skip with 2 players). Draw Two: next player draws 2 and loses a turn. Wild: choose the next colour. Wild Draw Four: next player draws 4 and loses a turn — playable only with no matching colour; the victim may challenge (offender draws 4 if guilty, challenger draws 6 if not).
- No playable card: draw 1; play it if possible, otherwise pass.
- Empty your hand to win it and score the cards left with opponents (numbers at face value, Skip/Reverse/Draw Two 20, Wild/Wild Draw Four 50). First to the target score (100–500, leader's choice, default 500) wins.

## Architecture (mirroring little-fuck)

| Layer | Little-fuck pattern | Twist |
|---|---|---|
| Backend | Express + Socket.IO + TypeScript, authoritative state in `global.ts` | `backend/` — same layout |
| Events | `events/<domain>/{eventsEmitter,eventsHandlers,handlers,functions}`, an `Emitter` aggregating domain emitters over `EmitterBase` (`emitToUser`/`emitToLobby`/`emitToSpecificLobbyPlayers`) | Lobby, Game and General domains; every play is validated server-side |
| Shared state | `interfaces/Lobby.ts` mirrored on the client, with a per-player client view (`buildClientLobby`) that hides other hands | Same — clients only ever receive their own cards |
| Frontend | Vue 3 + Vite + Tailwind + vue-i18n, Socket.IO client with a stable `playerId` in `localStorage`, `connection.ts`, `events/` emitter/listener-adder classes, pages Home/Lobby/Game/End | Same, plus `PlayingCard` with the classic colour oval |
| Players | Lobbies with codes, ready/leader flow, bots, reconnect by stable id | 2–10 players, 6-letter room codes, leader-added bots, reconnect restores your seat |
| Tests | Jest + ts-jest under `src/__tests__` | Deck composition, matching, action cards, Wild Draw Four challenge, scoring |

Game-flow notes: the starter card follows the standard handling (Wild Draw Four is reshuffled; Skip/Reverse/Draw Two starters apply to the first player; a Wild starter is reflipped so the first turn always has a definite colour). A final Draw Two / Wild Draw Four still forces its draws before scoring. When the draw pile runs out, the discard pile is reshuffled.

## Run in development

Requires Node.js. Two terminals, mirroring little-fuck:

```powershell
cd backend; npm install; npm run dev    # http://localhost:3000
cd frontend; npm install; npm run dev   # http://localhost:5173
```

Open http://localhost:5173 in your browser, create a room, add bots (or share the invite link / 6-letter code), ready up and start. Friends can join either by opening the invite link (for example `http://localhost:3000/join/ABC123`, which pre-fills the room code) or by entering the 6-letter code manually.

In the room, open **Options** to change the game settings. The leader can set the target score, the time each player has per turn (10-60 seconds, or no limit; running out of time draws/passes automatically), and customize the deck: recolour or rename the four colours with the colour picker, add up to four more colours, choose which numbers each colour has and how many copies of each card are in the deck with a 1-99 integer input (the card being changed is shown above the input), and do the same for the special cards inside each colour (Skip / Reverse / Draw Two in that colour), with the Wild and Wild Draw Four cards set outside the colours. Other players can open Options to view the current settings.

Options also include house rules the leader can toggle: stacking Draw Two / Wild Draw Four penalties onto the next player instead of drawing, drawing until you find a playable card, and swapping hands when you play a 7 — plus a **Random deck** button that generates a legal random deck. The deck editor can also add extra special cards per colour (Draw One, Skip All, Reverse Draw, Swap Card, Peek, Gift, Shield, Discard Colour, Colour Lock) and colourless cards (Wild Draw Two, Copycat, Bomb, Shuffle Hands), each with its own 0-99 count. The interface is available in English and Português (switcher at the bottom right, also following your browser language). Joining with a link or code while a game is running makes you a spectator: you watch the current hand and are dealt in from the next hand. In game you can toggle sound effects (synthesized in the browser) and use **Exit game**, which asks for confirmation because leaving mid-game is irreversible — your cards are removed and the turn moves on. When a game ends, the leader can start a **Rematch** with the same room and options in one click, or go back to the room.

## Production

```powershell
cd frontend; npm run build
cd backend; npm run build; npm start    # serves the built frontend on PORT (default 3000)
```

## Tests

```powershell
cd backend; npm test
cd frontend; npm run build   # includes vue-tsc type-check
```
