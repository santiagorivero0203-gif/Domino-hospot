# Dominoes Hotspot 🎲

PWA móvil de **Dominó Doble Seis** con físicas fluidas, multijugador local (Pass & Play) y conectividad P2P descentralizada vía WebRTC + QR (sin internet).

---

## Stack

| Tecnología | Uso |
|---|---|
| React 18 + Vite 5 | Framework y bundler |
| TypeScript | Tipado estático |
| Tailwind CSS | Estilos utility-first |
| Framer Motion | Drag & drop, animaciones, layout |
| Zustand | Estado global reactivo |
| WebRTC | P2P sin servidor de señalización |
| QRCode React + html5-qrcode | Señalización offline vía QR |
| vite-plugin-pwa | Service worker offline |

---

## Estructura

```
src/
├── engine/
│   └── DominoEngine.ts      # Lógica pura (0 dependencias React)
├── store/
│   └── gameStore.ts          # Estado global (Zustand)
├── types/
│   └── index.ts              # Interfaces compartidas
├── components/
│   ├── Tile.tsx              # Ficha con drag & drop
│   ├── TileFace.tsx          # Pips visuales
│   ├── PlayerHand.tsx        # Mano del jugador
│   ├── Board.tsx             # Tablero con pan/zoom
│   ├── TurnOverlay.tsx       # "Pasa el teléfono"
│   ├── ScoreBoard.tsx        # Marcador
│   ├── GameSetup.tsx         # Pantalla de inicio
│   └── QRConnectionArea.tsx  # Conexión P2P vía QR
├── network/
│   └── WebRTCManager.ts      # WebRTC DataChannel
├── hooks/
│   └── useGame.ts            # Hook de lógica de juego
├── App.tsx                   # Orquestador
├── main.tsx                  # Entry point
└── index.css                 # Estilos globales
```

---

## Fases de Desarrollo (Completadas)

### ✅ FASE 1 — Core Engine
Archivo TypeScript puro en `src/engine/DominoEngine.ts`:
- Generación de 28 fichas `[0|0]` a `[6|6]`
- Validación de jugadas en extremos del tablero
- Condiciones de victoria: Dominó y Tranca (juego cerrado)
- Heurística de bot: prioriza fichas pesadas, bota la pinta
- Determinación de primer jugador por ronda

### ✅ FASE 2 — Estado Global
Store Zustand en `src/store/gameStore.ts`:
- Players, board, turn, gameState, scores
- Acciones startGame, playTile, pass, nextTurn, setRoundWinner
- Bots automáticos con delay simulado

### ✅ FASE 3 — UI y Animaciones
Componentes con Framer Motion:
- Drag & drop de fichas con snap a extremos válidos
- Pan y zoom en el tablero
- Layout serpiente al llegar al borde
- Overlay de "Pasa el teléfono" para Pass & Play
- PWA offline con vite-plugin-pwa

### ✅ FASE 4 — Multijugador LAN
WebRTC + QR signaling:
- Host genera Offer SDP → QR
- Client escanea → genera Answer SDP → QR
- Host escanea Answer → DataChannel establecido
- Eventos de juego transmitidos P2P

---

## Instalación

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

---

## Cómo Jugar

1. Abrir `http://localhost:5173` (o la IP local en otro dispositivo)
2. **Inicio**: Elige "Jugar vs Bots" (Singleplayer) o "Multijugador"
3. **Singleplayer**: Juega contra 3 bots. Arrrastra fichas al tablero.
4. **Multijugador LAN**: Un dispositivo es Host (genera QR), otro escanea.
5. **Pass & Play Local**: Pasa el teléfono entre turnos.
6. **Gana**: El primero en quedarse sin fichas (Dominó) o el de menor puntuación al cerrarse el juego (Tranca).

---

## Estado Actual

Completado: Fases 1, 2, 3 y 4.
Próximo: Testing en browser, ajustes de UI, despliegue.
