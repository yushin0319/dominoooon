/**
 * 最後の操作がキーボードか（マウス・指で押したら false）。画面をまたいで覚えておく
 * （セットアップ画面の「対戦開始」を Enter で押してゲームが始まったときも、キーボードで遊んでいると分かるように）
 */
const modality = {
  keyboard: false,
  /** Tab を押した直後か */
  tabKey: false,
  /** Tab で最後の要素から画面の外（ブラウザのアドレス欄など）へ出たあと、画面の中にフォーカスが戻るまで */
  tabbedOut: false,
};

if (typeof document !== 'undefined') {
  document.addEventListener(
    'keydown',
    (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      modality.keyboard = true;
      if (e.key === 'Tab') {
        modality.tabKey = true;
        window.setTimeout(() => {
          modality.tabKey = false;
        }, 0);
      }
    },
    true,
  );
  document.addEventListener(
    'pointerdown',
    () => {
      modality.keyboard = false;
    },
    true,
  );
  document.addEventListener('focusout', (e) => {
    if (modality.tabKey && e.relatedTarget === null) modality.tabbedOut = true;
  });
  document.addEventListener('focusin', () => {
    modality.tabbedOut = false;
  });
}

/** 最後の操作がキーボードか（マウス・指で押したら false） */
export function isKeyboardModality(): boolean {
  return modality.keyboard;
}

/** Tab で画面の外へ出たあと（画面の中にフォーカスが戻るまで）か */
export function isTabbedOut(): boolean {
  return modality.tabbedOut;
}
