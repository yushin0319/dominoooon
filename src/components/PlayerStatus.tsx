import { ChevronDown, ChevronRight } from 'lucide-react';
import { memo, useId, useRef, useState } from 'react';
import { useDialogKeyboard } from '../hooks/useDialogKeyboard';
import {
  type CardKind,
  getPlayerStatus,
  groupCards,
} from '../lib/playerStatus';
import { cn } from '../lib/utils';
import type { PlayerState } from '../types';

const TITLE = '山札・捨て札・勝利点';

// 捨て札の一覧の色（サプライのカードの色に合わせる）
const kindClass: Record<CardKind, string> = {
  treasure: 'border-amber-500/60 bg-amber-500/15 text-amber-100',
  victory: 'border-emerald-500/60 bg-emerald-500/15 text-emerald-100',
  curse: 'border-purple-500/60 bg-purple-500/15 text-purple-100',
  action: 'border-slate-400/60 bg-slate-500/20 text-slate-100',
};

interface PlayerStatusProps {
  players: PlayerState[];
}

/**
 * 両者の山札・捨て札の枚数と勝利点。山札が少なければもうすぐ切り直し、勝利点でどちらが勝っているかが分かる。
 * 捨て札の枚数を押すと、その人の捨て札の中身を下に出す（もう一度押すと閉じる）
 */
const PlayerStatus = memo(function PlayerStatus({
  players,
}: PlayerStatusProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const listTitleId = useId();
  const listId = useId();

  const rows = players.map((player) => ({
    player,
    ...getPlayerStatus(player),
  }));
  const topVp = Math.max(...rows.map((r) => r.vp));
  // 勝っている人が 1 人だけのときだけ印を付ける（同点なら付けない）
  const hasLeader = rows.filter((r) => r.vp === topVp).length === 1;
  // 捨て札が空の間（切り直した直後）は一覧を出さない。開いたままにした人の一覧は、捨て札が増えたらまた出る
  const openPlayer = players.find(
    (p) => p.id === openId && p.discard.length > 0,
  );

  return (
    <div className="text-slate-200">
      <table className="w-full text-xs">
        <caption className="sr-only">{TITLE}</caption>
        <thead>
          <tr className="text-[10px] text-slate-400">
            <th scope="col" className="font-medium text-left">
              <span className="sr-only">プレイヤー</span>
            </th>
            <th scope="col" className="font-medium">
              山札
            </th>
            <th scope="col" className="font-medium">
              捨て札
            </th>
            <th scope="col" className="font-medium">
              勝利点
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ player, deck, discard, vp }) => {
            const leading = hasLeader && vp === topVp;
            const isOpen = openPlayer?.id === player.id;
            return (
              <tr key={player.id} className="h-11 text-center">
                <th
                  scope="row"
                  className="py-0.5 pr-1 text-left font-bold text-white whitespace-nowrap"
                >
                  {player.name}
                </th>
                <td data-testid="status-deck" className="text-sm font-bold">
                  {deck}
                </td>
                <td data-testid="status-discard" className="text-sm font-bold">
                  {discard > 0 ? (
                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : player.id)}
                      aria-expanded={isOpen}
                      aria-controls={isOpen ? listId : undefined}
                      aria-label={`${player.name}の捨て札 ${discard} 枚を見る`}
                      className={cn(
                        'min-h-11 min-w-11 px-2 inline-flex items-center justify-center gap-0.5 rounded-md border transition-colors',
                        isOpen
                          ? 'border-sky-400 bg-sky-500/20 text-white'
                          : 'border-slate-500 bg-slate-700/60 hover:bg-slate-600',
                      )}
                    >
                      {discard}
                      <ChevronDown
                        aria-hidden="true"
                        className={cn(
                          'w-3.5 h-3.5 transition-transform',
                          isOpen && 'rotate-180',
                        )}
                      />
                    </button>
                  ) : (
                    discard
                  )}
                </td>
                <td
                  data-testid="status-vp"
                  data-leading={leading ? 'true' : undefined}
                  className={cn(
                    'text-sm font-bold',
                    leading && 'text-emerald-300 font-black',
                  )}
                >
                  {vp}
                  {leading && <span className="sr-only">（リード）</span>}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {openPlayer && (
        <div id={listId} className="mt-2 pt-2 border-t border-slate-600">
          <p
            id={listTitleId}
            className="mb-1.5 text-[11px] font-bold text-slate-300"
          >
            {openPlayer.name}の捨て札（{openPlayer.discard.length} 枚）
          </p>
          <ul
            aria-labelledby={listTitleId}
            className="flex flex-wrap gap-1 max-h-40 overflow-y-auto"
          >
            {groupCards(openPlayer.discard).map((g) => (
              <li
                key={g.name}
                className={cn(
                  'px-1.5 py-0.5 rounded border text-xs',
                  kindClass[g.kind],
                )}
              >
                <span>{g.nameJa}</span>
                <span className="ml-0.5 font-bold">×{g.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});

export default PlayerStatus;

interface PlayerStatusButtonProps {
  players: PlayerState[];
  onOpen: () => void;
  className?: string;
}

/** 狭い画面用: 両者の勝利点を出すボタン。押すと山札・捨て札・勝利点を開く */
export function PlayerStatusButton({
  players,
  onOpen,
  className,
}: PlayerStatusButtonProps) {
  const summary = players
    .map((p) => `${p.name} ${getPlayerStatus(p).vp}点`)
    .join(' / ');
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        // 見出しの高さ（ログの見える行数）を変えないよう上下を詰め、押せる範囲は上下に広げて 44px にする
        // （上はログ欄の枠で切れるので 10px、下に 16px。広げた所はログの行に重なるが、ログの行は押せないので困らない）
        "relative shrink-0 -my-0.5 inline-flex items-center gap-1 px-2 py-px rounded-md border border-slate-500 bg-slate-700/80 text-[11px] leading-4 font-bold text-slate-100 whitespace-nowrap hover:bg-slate-600 transition-colors before:absolute before:inset-x-0 before:-top-2.5 before:-bottom-4 before:content-['']",
        className,
      )}
    >
      <span>{summary}</span>
      <span className="sr-only">（山札・捨て札を見る）</span>
      <ChevronRight aria-hidden="true" className="w-3.5 h-3.5" />
    </button>
  );
}

interface PlayerStatusDialogProps {
  players: PlayerState[];
  onClose: () => void;
}

/** 狭い画面用: 山札・捨て札・勝利点を重ねて出す（外を押す・「閉じる」・Esc で閉じる） */
export function PlayerStatusDialog({
  players,
  onClose,
}: PlayerStatusDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useDialogKeyboard(dialogRef, onClose);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 外を押したら閉じる（読み上げ・Tab では「閉じる」ボタンを使う） */}
      <button
        type="button"
        aria-hidden="true"
        tabIndex={-1}
        onClick={onClose}
        className="absolute inset-0 w-full h-full bg-black/60 cursor-default"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-sm p-4 bg-slate-800 border border-slate-600 rounded-lg shadow-xl"
      >
        <h2 id={titleId} className="mb-3 text-base font-bold text-slate-100">
          {TITLE}
        </h2>
        <PlayerStatus players={players} />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-4 text-sm font-medium text-slate-200 bg-slate-700 border border-slate-600 rounded hover:bg-slate-600 transition-colors"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
