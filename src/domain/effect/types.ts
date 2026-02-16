// Effect types and interfaces

export type PendingEffectChoice = {
  type: string;
  selectedCards?: string[];
  selectedCardName?: string;
  confirmed?: boolean;
};
