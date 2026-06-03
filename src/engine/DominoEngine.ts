import type { Tile, BoardState, PlacedTile } from '../types';

/**
 * Generates a full set of 28 double-six domino tiles.
 * @returns {Tile[]} An array containing all 28 domino tiles.
 */
export function generateTiles(): Tile[] {
  const tiles: Tile[] = [];
  let counter = 0;
  for (let left = 0; left <= 6; left++) {
    for (let right = left; right <= 6; right++) {
      tiles.push({ left, right, id: `tile-${counter++}` });
    }
  }
  return tiles;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Distributes a set of tiles equally among a given number of players.
 * @param {Tile[]} tiles - The deck of tiles to deal.
 * @param {number} players - The number of players.
 * @returns {Tile[][]} An array of tile hands for each player.
 */
export function dealTiles(tiles: Tile[], players: number): Tile[][] {
  const shuffled = shuffleArray(tiles);
  const perPlayer = 7;
  const hands: Tile[][] = [];
  for (let i = 0; i < players; i++) {
    hands.push(shuffled.slice(i * perPlayer, (i + 1) * perPlayer));
  }
  return hands;
}

export function getTileSum(tile: Tile): number {
  return tile.left + tile.right;
}

export function isDouble(tile: Tile): boolean {
  return tile.left === tile.right;
}

export function hasDoubleSix(hand: Tile[]): boolean {
  return hand.some((t) => t.left === 6 && t.right === 6);
}

export function findPlayerWithDoubleSix(hands: Tile[][]): number {
  return hands.findIndex(hasDoubleSix);
}

function reverseTile(tile: Tile): Tile {
  return { left: tile.right, right: tile.left, id: tile.id };
}

export function canPlay(tile: Tile, endValue: number): boolean {
  return tile.left === endValue || tile.right === endValue;
}

/**
 * Returns a list of tiles from a hand that can be legally played on the current board.
 * @param {Tile[]} hand - The player's hand.
 * @param {BoardState} board - The current state of the board.
 * @returns {Tile[]} An array of valid tiles.
 */
export function getValidPlays(hand: Tile[], board: BoardState): Tile[] {
  if (board.leftEnd === null || board.rightEnd === null) {
    return hand;
  }
  return hand.filter(
    (t) => canPlay(t, board.leftEnd!) || canPlay(t, board.rightEnd!),
  );
}

export function getPlayableEnds(
  tile: Tile,
  board: BoardState,
): ('left' | 'right')[] {
  const ends: ('left' | 'right')[] = [];
  if (board.leftEnd === null || board.rightEnd === null) return ['left'];
  if (canPlay(tile, board.leftEnd!)) ends.push('left');
  if (canPlay(tile, board.rightEnd!)) ends.push('right');
  return ends;
}

export function isFirstMove(board: BoardState): boolean {
  return board.leftEnd === null || board.rightEnd === null;
}

export interface PlayResult {
  tile: Tile;
  position: 'left' | 'right';
  newLeftEnd: number;
  newRightEnd: number;
}

/**
 * Applies a played tile to the board and calculates the new board ends.
 * @param {Tile} tile - The tile being played.
 * @param {'left' | 'right'} position - The side of the board to play on.
 * @param {BoardState} board - The current board state.
 * @returns {PlayResult | null} The result of the play, or null if invalid.
 */
export function applyPlay(
  tile: Tile,
  position: 'left' | 'right',
  board: BoardState,
): PlayResult | null {
  if (isFirstMove(board)) {
    return {
      tile: { ...tile },
      position: 'left',
      newLeftEnd: tile.left,
      newRightEnd: tile.right,
    };
  }

  if (position === 'left') {
    if (!canPlay(tile, board.leftEnd!)) return null;
    const rotated =
      tile.right === board.leftEnd
        ? tile
        : { left: tile.right, right: tile.left, id: tile.id };
    return {
      tile: rotated,
      position: 'left',
      newLeftEnd: rotated.left === board.leftEnd ? rotated.right : rotated.left,
      newRightEnd: board.rightEnd!,
    };
  }

  if (position === 'right') {
    if (!canPlay(tile, board.rightEnd!)) return null;
    const rotated =
      tile.left === board.rightEnd
        ? tile
        : { left: tile.right, right: tile.left, id: tile.id };
    return {
      tile: rotated,
      position: 'right',
      newLeftEnd: board.leftEnd!,
      newRightEnd: rotated.right === board.rightEnd ? rotated.left : rotated.right,
    };
  }

  return null;
}

export function calculateHandScore(hand: Tile[]): number {
  return hand.reduce((sum, t) => sum + getTileSum(t), 0);
}

export function isDomino(hand: Tile[]): boolean {
  return hand.length === 0;
}

export function isTranca(hands: Tile[][], board: BoardState): boolean {
  if (isFirstMove(board)) return false;
  return hands.every(
    (h) => getValidPlays(h, board).length === 0,
  );
}

export interface RoundEndResult {
  type: 'domino' | 'tranca';
  winnerId: string | null;
  scores: { playerId: string; handScore: number }[];
  isTie?: boolean;
}

/**
 * Checks if the round has ended via Domino (empty hand) or Tranca (blocked game).
 * @param {Tile[][]} hands - All players' hands.
 * @param {string[]} playerIds - The IDs of all players.
 * @param {BoardState} board - The current state of the board.
 * @returns {RoundEndResult | null} The result of the round end, or null if ongoing.
 */
export function checkRoundEnd(
  hands: Tile[][],
  playerIds: string[],
  board: BoardState,
): RoundEndResult | null {
  for (let i = 0; i < hands.length; i++) {
    if (isDomino(hands[i])) {
      return {
        type: 'domino',
        winnerId: playerIds[i],
        scores: playerIds.map((id, idx) => ({
          playerId: id,
          handScore: calculateHandScore(hands[idx]),
        })),
      };
    }
  }

  if (!isFirstMove(board) && isTranca(hands, board)) {
    const scores = playerIds.map((id, idx) => ({
      playerId: id,
      handScore: calculateHandScore(hands[idx]),
    }));
    const minScore = Math.min(...scores.map((s) => s.handScore));
    const winners = scores.filter((s) => s.handScore === minScore);
    return {
      type: 'tranca',
      winnerId: winners.length === 1 ? winners[0].playerId : null,
      scores,
      isTie: winners.length > 1,
    };
  }

  return null;
}

export function determineFirstPlayer(
  roundNumber: number,
  hands: Tile[][],
  previousWinnerIndex: number | null,
): number {
  if (roundNumber === 1) {
    const idx = findPlayerWithDoubleSix(hands);
    return idx !== -1 ? idx : 0;
  }
  return previousWinnerIndex ?? 0;
}

export function botPlay(
  hand: Tile[],
  board: BoardState,
): { tile: Tile; position: 'left' | 'right' } | null {
  const valid = getValidPlays(hand, board);
  if (valid.length === 0) return null;

  const scored = valid.map((tile) => {
    const pips = getTileSum(tile);
    const isDbl = isDouble(tile);
    const ends = getPlayableEnds(tile, board);
    const flexible = ends.length === 2 ? 0.5 : 0;
    const doublesPenalty = isDbl ? 1.5 : 0;
    const score = pips + flexible + doublesPenalty;
    return { tile, score, ends };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  return { tile: best.tile, position: best.ends[0] };
}

export function createInitialBoard(): BoardState {
  return { leftEnd: null, rightEnd: null, chain: [] };
}

export function sortHand(hand: Tile[]): Tile[] {
  return [...hand].sort((a, b) => {
    if (a.left !== b.left) return a.left - b.left;
    return a.right - b.right;
  });
}
