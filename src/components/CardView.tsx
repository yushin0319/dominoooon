import { motion } from 'framer-motion';
import {
  memo,
  type RefObject,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import type { CardStatus } from '../lib/cardStatus';
import {
  isHoverPointer,
  isLongPressCancelled,
  LONG_PRESS_MS,
  shouldShowDetailOnTap,
} from '../lib/pointer';
import { getTooltipPosition, type TooltipPosition } from '../lib/tooltip';
import { cn, getEffectText } from '../lib/utils';
import type { CardDef, CardInstance, CardType } from '../types';

interface CardViewProps {
  card: CardInstance | CardDef;
  onClick?: () => void;
  selected?: boolean;
  small?: boolean;
  remaining?: number; // 残数バッジ用
  /** 今使えるか（available = 光る枠 / unavailable = 暗く表示）。見分ける場面でなければ付けない */
  status?: CardStatus;
  /** 指でタップしたとき、押した処理と一緒に説明も出す（選択画面: 1 回目のタップで選んで説明、確定はボタン） */
  detailOnTap?: boolean;
}

function getDef(card: CardInstance | CardDef): CardDef {
  return 'def' in card ? card.def : card;
}

function getTypeGradient(types: CardType[]): string {
  if (types.includes('Attack' as CardType)) return 'from-red-600 to-red-800';
  if (types.includes('Reaction' as CardType))
    return 'from-blue-600 to-blue-800';
  if (types.includes('Treasure' as CardType))
    return 'from-amber-600 to-amber-800';
  if (types.includes('Victory' as CardType))
    return 'from-green-600 to-green-800';
  if (types.includes('Curse' as CardType))
    return 'from-purple-600 to-purple-800';
  return 'from-gray-600 to-gray-800';
}

function getBorderColor(types: CardType[]): string {
  if (types.includes('Attack' as CardType)) return 'border-red-500';
  if (types.includes('Reaction' as CardType)) return 'border-blue-500';
  if (types.includes('Treasure' as CardType)) return 'border-amber-400';
  if (types.includes('Victory' as CardType)) return 'border-green-400';
  if (types.includes('Curse' as CardType)) return 'border-purple-500';
  if (types.includes('Action' as CardType)) return 'border-gray-400';
  return 'border-gray-500';
}

function getTextColor(types: CardType[]): string {
  if (types.includes('Attack' as CardType)) return 'text-red-400';
  if (types.includes('Reaction' as CardType)) return 'text-blue-400';
  if (types.includes('Treasure' as CardType)) return 'text-amber-300';
  if (types.includes('Victory' as CardType)) return 'text-green-300';
  if (types.includes('Curse' as CardType)) return 'text-purple-400';
  if (types.includes('Action' as CardType)) return 'text-gray-300';
  return 'text-gray-400';
}

function typeNameJa(type: CardType): string {
  const map: Record<string, string> = {
    Action: 'アクション',
    Treasure: '財宝',
    Victory: '勝利点',
    Curse: '呪い',
    Attack: 'アタック',
    Reaction: 'リアクション',
  };
  return map[type] ?? type;
}

/**
 * カードの説明（ツールチップ）。
 * body 直下に画面固定で出す。手札の傾き・選択画面の枠・スクロール領域の影響を受けず、切れない。
 * 一度見えない状態で描いて大きさを測り、カードの位置から置き場所（上 / 下）を決める。
 */
function CardTooltip({
  def,
  anchorRef,
  id,
}: {
  def: CardDef;
  anchorRef: RefObject<HTMLDivElement | null>;
  id: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<TooltipPosition | null>(null);
  const textColor = getTextColor(def.types);
  const effects = getEffectText(def);

  useLayoutEffect(() => {
    const el = ref.current;
    const anchor = anchorRef.current;
    if (!el || !anchor) return;
    const size = el.getBoundingClientRect();
    setPos(
      getTooltipPosition(
        anchor.getBoundingClientRect(),
        { width: size.width, height: size.height },
        { width: window.innerWidth, height: window.innerHeight },
      ),
    );
  }, [anchorRef]);

  return createPortal(
    <div
      ref={ref}
      id={id}
      role="tooltip"
      data-placement={pos?.placement}
      style={{
        position: 'fixed',
        left: pos ? pos.left : 0,
        top: pos ? pos.top : 0,
        visibility: pos ? undefined : 'hidden',
      }}
      className="z-[60] w-64 p-3 bg-slate-900 border-2 border-slate-600 rounded-lg shadow-2xl text-white text-sm pointer-events-none motion-safe:animate-fade-in"
    >
      <div className="font-bold text-base mb-2">{def.nameJa}</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="shrink-0 whitespace-nowrap text-slate-400">
            コスト:
          </span>
          <span className="font-semibold">{def.cost}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="shrink-0 whitespace-nowrap text-slate-400">
            種類:
          </span>
          <span className={cn('font-semibold', textColor)}>
            {def.types.map(typeNameJa).join(' / ')}
          </span>
        </div>
        {effects && (
          <div className="flex items-start gap-2">
            <span className="shrink-0 whitespace-nowrap text-slate-400">
              効果:
            </span>
            <span>{effects}</span>
          </div>
        )}
        {def.vpValue !== undefined && (
          <div className="flex items-center gap-2">
            <span className="shrink-0 whitespace-nowrap text-slate-400">
              勝利点:
            </span>
            <span className="font-semibold">{def.vpValue}</span>
          </div>
        )}
      </div>
      {/* 矢印（カードの中心を指す。カードの上に置いたときは下向き、下に置いたときは上向き） */}
      {pos && (
        <div
          className={cn(
            'absolute -translate-x-1/2',
            pos.placement === 'top' ? 'top-full -mt-px' : 'bottom-full -mb-px',
          )}
          style={{ left: pos.arrowLeft }}
        >
          <div
            className={cn(
              'border-8 border-transparent',
              pos.placement === 'top'
                ? 'border-t-slate-600'
                : 'border-b-slate-600',
            )}
          />
        </div>
      )}
    </div>,
    document.body,
  );
}

const CardView = memo(function CardView({
  card,
  onClick,
  selected,
  small,
  remaining,
  status,
  detailOnTap = false,
}: CardViewProps) {
  const def = getDef(card);
  const gradient = getTypeGradient(def.types);
  const borderColor = getBorderColor(def.types);
  const textColor = getTextColor(def.types);
  const effects = getEffectText(def);
  const tooltipId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  // hover = マウスのホバーで表示中 / pinned = 指のタップ・長押しで表示中（ほかの場所を押すまで出しておく）
  const [tooltip, setTooltip] = useState<'hover' | 'pinned' | null>(null);
  // 直前に押した入力の種類（長押しで出る端末のメニューを、指のときだけ止めるため）
  const pointerTypeRef = useRef<string | null>(null);
  const pressRef = useRef<{ timer: number; x: number; y: number } | null>(null);
  // 長押しで説明を出した直後のクリック（指を離したときのもの）を、押した処理に届けない
  const suppressClickRef = useRef(false);

  function cancelPress() {
    if (pressRef.current) {
      window.clearTimeout(pressRef.current.timer);
      pressRef.current = null;
    }
  }

  // 外したときに長押しの待ちを止める（ref は描画で変わらないので依存なし）
  useEffect(
    () => () => {
      if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    },
    [],
  );

  // 表示中の説明を閉じる条件: 指で出したものはほかの場所を押したとき、どちらもスクロール・画面サイズ変更のとき
  useEffect(() => {
    if (!tooltip) return;
    const root = rootRef.current;
    const close = () => setTooltip(null);
    const onPointerDown = (e: PointerEvent) => {
      if (
        tooltip === 'pinned' &&
        root &&
        !(e.target instanceof Node && root.contains(e.target))
      ) {
        close();
      }
    };
    const onScroll = (e: Event) => {
      const t = e.target;
      if (root && (t === document || (t instanceof Node && t.contains(root)))) {
        close();
      }
    };
    document.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', close);
    };
  }, [tooltip]);

  function handlePointerEnter(e: React.PointerEvent) {
    // 指で触れたときは出さない（互換の mouseenter で出していたのが「出たまま残る」原因だった）
    if (isHoverPointer(e.pointerType)) {
      setTooltip((t) => t ?? 'hover');
    }
  }

  function handlePointerLeave(e: React.PointerEvent) {
    if (isHoverPointer(e.pointerType)) {
      setTooltip((t) => (t === 'hover' ? null : t));
    } else {
      cancelPress();
    }
  }

  function handlePointerDown(e: React.PointerEvent) {
    pointerTypeRef.current = e.pointerType;
    suppressClickRef.current = false;
    if (isHoverPointer(e.pointerType)) {
      // クリックしたら説明は閉じる（選択画面・確認画面などの上に残さない）
      setTooltip((t) => (t === 'hover' ? null : t));
      return;
    }
    // 指: 長押しで説明を出す
    cancelPress();
    const timer = window.setTimeout(() => {
      pressRef.current = null;
      suppressClickRef.current = true;
      setTooltip('pinned');
    }, LONG_PRESS_MS);
    pressRef.current = { timer, x: e.clientX, y: e.clientY };
  }

  function handlePointerMove(e: React.PointerEvent) {
    const press = pressRef.current;
    if (press && isLongPressCancelled(press, { x: e.clientX, y: e.clientY })) {
      cancelPress();
    }
  }

  function handleClickCapture(e: React.MouseEvent) {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      e.stopPropagation();
      e.preventDefault();
    }
  }

  // 指を離したとき: 長押しになる前で、ほとんど動いていなければタップ
  function handlePointerUp(e: React.PointerEvent) {
    const press = pressRef.current;
    cancelPress();
    // マウス（press なし）・長押しで説明を出した後・指が動いた後はタップとして扱わない
    if (!press || isLongPressCancelled(press, { x: e.clientX, y: e.clientY })) {
      return;
    }
    if (
      shouldShowDetailOnTap({
        pointerType: e.pointerType,
        clickable: onClick !== undefined,
        detailOnTap,
      })
    ) {
      // 押しても何も起きないカードはタップのたびに開け閉め、選択画面のカードは選ぶたびに出す
      setTooltip((t) => (t === 'pinned' && !detailOnTap ? null : 'pinned'));
    }
  }

  function handleContextMenu(e: React.MouseEvent) {
    // 長押しで出る端末のメニューを止める（指のときだけ）
    const type = pointerTypeRef.current;
    if (type !== null && !isHoverPointer(type)) e.preventDefault();
  }

  return (
    // 指の長押しで文字選択・端末のメニューが出ないようにする
    <div
      ref={rootRef}
      data-card-root=""
      className="relative select-none [-webkit-touch-callout:none]"
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={cancelPress}
      onClickCapture={handleClickCapture}
      onContextMenu={handleContextMenu}
    >
      {tooltip && <CardTooltip def={def} anchorRef={rootRef} id={tooltipId} />}

      <motion.div
        onClick={onClick}
        data-status={status}
        aria-describedby={tooltip ? tooltipId : undefined}
        whileHover={
          onClick
            ? {
                scale: 1.05,
                y: -2,
              }
            : undefined
        }
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        className={cn(
          'relative rounded-lg border-2 overflow-hidden flex flex-col transition-[box-shadow,filter] duration-200',
          'bg-gradient-to-br',
          gradient,
          borderColor,
          small ? 'w-20 h-28 p-1' : 'w-[120px] h-[170px]',
          onClick ? 'cursor-pointer hover:shadow-2xl' : 'cursor-default',
          selected
            ? 'ring-4 ring-yellow-400 shadow-2xl shadow-yellow-400/50'
            : status === 'available'
              ? // 使える・買えるカード: 光る枠
                'ring-2 ring-emerald-300 shadow-[0_0_14px_2px_rgba(110,231,183,0.55)]'
              : 'shadow-xl',
          // 使えない・買えないカード: 暗く（透明にすると重なった手札の下のカードが透けて見えるので、明るさで落とす）
          status === 'unavailable' && 'brightness-50 saturate-50',
        )}
      >
        {/* Card Header。小さいカードは 2 行まで折り返し、残り枚数のバッジの分だけ右を空ける */}
        <div
          className={cn(
            'px-2 py-1 font-bold text-white bg-black/20 text-[11px]',
            small ? 'line-clamp-2 leading-tight' : 'truncate',
            small && remaining !== undefined && 'pr-[25px]',
          )}
        >
          {def.nameJa}
        </div>

        {/* Card Content。コストの丸（左下）に文字が重ならないよう、丸の分だけ下を空ける */}
        {!small && (
          <div className="flex-1 min-h-0 px-2 pt-1 pb-10 flex flex-col justify-center gap-1">
            <div className={cn('text-xs font-semibold', textColor)}>
              {def.types.map(typeNameJa).join(' / ')}
            </div>
            {effects && (
              <div className="text-xs text-white/80 leading-tight">
                {effects}
              </div>
            )}
          </div>
        )}

        {/* Cost Badge - Absolute positioned at bottom-left */}
        <div
          className={cn(
            'absolute bg-slate-800/90 rounded-full flex items-center justify-center font-bold text-white border-2',
            borderColor,
            small
              ? 'bottom-1 left-1 w-4 h-4 text-[11px]'
              : 'bottom-2 left-2 w-8 h-8 text-xs',
          )}
        >
          {def.cost}
        </div>

        {/* 残数バッジ（右上に絶対配置） */}
        {remaining !== undefined && (
          <div className="absolute top-1 right-1 bg-slate-700 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border border-white/20 shadow-md">
            {remaining}
          </div>
        )}
      </motion.div>
    </div>
  );
});

export default CardView;
