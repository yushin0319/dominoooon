import type { PendingEffect, PlayerState } from '../types';
import type { PendingEffectChoice } from '../domain/effect';

export function resolveAIPendingEffect(
  pendingEffect: PendingEffect,
  players: PlayerState[],
  resolvePending: (choice: PendingEffectChoice) => void,
): void {
  const targetPlayer = players.find((p) => p.id === pendingEffect.playerId);
  if (!targetPlayer) return;

  if (pendingEffect.type === 'militia') {
    // 手札が3枚以下になるまで末尾から捨てる
    const excess = targetPlayer.hand.length - 3;
    const toDiscard = targetPlayer.hand.slice(-excess).map((c) => c.instanceId);
    resolvePending({ selectedCards: toDiscard });
  } else {
    // その他のpendingEffect: 空選択で解決
    resolvePending({ selectedCards: [] });
  }
}
