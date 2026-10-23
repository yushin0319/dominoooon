// Effect types and interfaces

export type PendingEffectChoice = {
  selectedCards?: string[];
  selectedCardName?: string;
  confirmed?: boolean;
  /** 歩哨: 捨て札に置くカード（selectedCards は廃棄するカード） */
  discardCards?: string[];
  /** 歩哨: 山札に戻すカードの順番（先頭が山札の一番上） */
  orderedCards?: string[];
};
