export type RecipeItem = { id: string; name: string; imageUrl: string };
export type RecipePiece = {
  key: string;
  item: RecipeItem;
  state: 'ready' | 'accepted' | 'rejected';
};
export type RecipeHistory = {
  target: RecipeItem;
  stage: string;
  status: 'crafted' | 'revealed' | 'timeout';
  ingredients: RecipeItem[];
  mistakes: number;
};
export type RecipeRound = {
  id: string;
  day: string;
  practice: boolean;
  finished: boolean;
  won: boolean;
  rewardOffer: number;
  rewardAvailable: number;
  rewardPaid: number;
  deadlineAt: string | null;
  serverTime: string;
  version: string;
  index: number;
  total: number;
  mistakes: number;
  crafted: number;
  current: {
    target: RecipeItem;
    stage: string;
    slots: number;
    tray: RecipePiece[];
    accepted: { key: string; item: RecipeItem }[];
  } | null;
  history: RecipeHistory[];
};
export type RecipeAction =
  | { action: 'add'; index: number; pieceKey: string }
  | { action: 'reveal'; index: number }
  | { action: 'sync' };
