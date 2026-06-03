import { useCallback, useEffect } from 'react';
import useGameStore from '../store/gameStore';
import { getValidPlays, getPlayableEnds, isFirstMove } from '../engine/DominoEngine';

export function useGame() {
  const store = useGameStore();

  const currentPlayer = store.players[store.currentTurnIndex];
  const isLocalTurn = currentPlayer?.type === 'local';
  const isBotTurn = currentPlayer?.type === 'bot';

  const localPlayer = store.players.find((p) => p.type === 'local');
  const localHand = localPlayer?.hand ?? [];

  const validPlays = currentPlayer
    ? getValidPlays(currentPlayer.hand, store.board)
    : [];
  const canCurrentPlayerPlay = currentPlayer ? validPlays.length > 0 : false;
  const isBoardEmpty = isFirstMove(store.board);

  const handlePlay = useCallback(
    (tileId: string, position: 'left' | 'right') => {
      if (!isLocalTurn || !currentPlayer) return false;
      return store.playTile(currentPlayer.id, tileId, position);
    },
    [store, isLocalTurn, currentPlayer],
  );

  const handleDragEnd = useCallback(
    (
      info: {
        point: { x: number; y: number };
        offset: { x: number; y: number };
      },
      dragTile: { id: string }
    ) => {
      if (!isLocalTurn || !currentPlayer) return;

      const { x, y } = info.point;

      if (isBoardEmpty) {
        const centerElem = document.getElementById('drop-zone-center');
        if (centerElem) {
          const rect = centerElem.getBoundingClientRect();
          const margin = 50;
          if (
            x >= rect.left - margin &&
            x <= rect.right + margin &&
            y >= rect.top - margin &&
            y <= rect.bottom + margin
          ) {
            store.playTile(currentPlayer.id, dragTile.id, 'left');
            return;
          }
        }
        // Fallback rápido
        const tile = currentPlayer.hand.find((t) => t.id === dragTile.id);
        if (tile) store.playTile(currentPlayer.id, dragTile.id, 'left');
        return;
      }

      const fullTile = currentPlayer.hand.find((t) => t.id === dragTile.id);
      if (!fullTile) return;

      const ends = getPlayableEnds(fullTile, store.board);
      const leftElem = document.getElementById('drop-zone-left');
      const rightElem = document.getElementById('drop-zone-right');

      let droppedLeft = false;
      let droppedRight = false;
      const margin = 60; // Tolerancia en pixeles alrededor del drop zone

      if (leftElem && ends.includes('left')) {
        const rect = leftElem.getBoundingClientRect();
        if (
          x >= rect.left - margin &&
          x <= rect.right + margin &&
          y >= rect.top - margin &&
          y <= rect.bottom + margin
        ) {
          droppedLeft = true;
        }
      }

      if (rightElem && ends.includes('right')) {
        const rect = rightElem.getBoundingClientRect();
        if (
          x >= rect.left - margin &&
          x <= rect.right + margin &&
          y >= rect.top - margin &&
          y <= rect.bottom + margin
        ) {
          droppedRight = true;
        }
      }

      if (droppedLeft && droppedRight) {
        // Desempate por distancia al centro del drop-zone
        const leftRect = leftElem!.getBoundingClientRect();
        const rightRect = rightElem!.getBoundingClientRect();
        const distLeft = Math.hypot(x - (leftRect.left + leftRect.width / 2), y - (leftRect.top + leftRect.height / 2));
        const distRight = Math.hypot(x - (rightRect.left + rightRect.width / 2), y - (rightRect.top + rightRect.height / 2));
        if (distLeft < distRight) {
          store.playTile(currentPlayer.id, dragTile.id, 'left');
        } else {
          store.playTile(currentPlayer.id, dragTile.id, 'right');
        }
      } else if (droppedLeft) {
        store.playTile(currentPlayer.id, dragTile.id, 'left');
      } else if (droppedRight) {
        store.playTile(currentPlayer.id, dragTile.id, 'right');
      } else {
        // Fallback a detección por deslizamiento (swipe)
        const dx = info.offset.x;
        const dy = info.offset.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
          if (dx < 0 && ends.includes('left')) {
            store.playTile(currentPlayer.id, dragTile.id, 'left');
          } else if (dx > 0 && ends.includes('right')) {
            store.playTile(currentPlayer.id, dragTile.id, 'right');
          }
        }
      }
    },
    [store, isLocalTurn, currentPlayer, isBoardEmpty],
  );

  const handlePass = useCallback(() => {
    if (!isLocalTurn || !currentPlayer) return;
    store.pass(currentPlayer.id);
  }, [store, isLocalTurn, currentPlayer]);

  const handleTap = useCallback(
    (tileId: string) => {
      if (!isLocalTurn || !currentPlayer) return;
      if (isBoardEmpty) {
        store.playTile(currentPlayer.id, tileId, 'left');
        return;
      }
      if (!store.board.leftEnd || !store.board.rightEnd) return;

      const tile = currentPlayer.hand.find((t) => t.id === tileId);
      if (!tile) return;

      const ends = getPlayableEnds(tile, store.board);
      if (ends.length === 0) return;
      store.playTile(currentPlayer.id, tileId, ends[0]);
    },
    [store, isLocalTurn, currentPlayer, isBoardEmpty],
  );

  const showTurnOverlay =
    isLocalTurn &&
    store.gameState === 'playing' &&
    !!currentPlayer;

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return {
    ...store,
    currentPlayer,
    localPlayer,
    localHand,
    isLocalTurn,
    isBotTurn,
    validPlays,
    canCurrentPlayerPlay,
    isBoardEmpty,
    handlePlay,
    handleDragEnd,
    handlePass,
    handleTap,
    showTurnOverlay,
  };
}
