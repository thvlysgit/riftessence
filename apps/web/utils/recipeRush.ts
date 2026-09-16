export type RecipeItem = { id: string; name: string; imageUrl: string };
export type RecipePiece = {
  key: string;
  item: RecipeItem;
  state: 'ready' | 'accepted' | 'rejected';
  used: number;
};
export type RecipeCraft = {
  target: RecipeItem;
  status: 'crafted' | 'revealed' | 'timeout';
  ingredients: RecipeItem[];
};
export type RecipeHistory = {
  target: RecipeItem;
  stage: string;
  status: 'crafted' | 'revealed' | 'timeout';
  ingredients: RecipeItem[];
  mistakes: number;
  preparations: RecipeCraft[];
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
    finalTarget: RecipeItem;
    step: number;
    stepCount: number;
    revision: number;
    reusable: boolean;
    completedSteps: RecipeCraft[];
    stage: string;
    slots: number;
    tray: RecipePiece[];
    accepted: { key: string; item: RecipeItem }[];
  } | null;
  history: RecipeHistory[];
};
export type RecipeAction =
  | { action: 'add'; index: number; pieceKey: string; step: number; revision: number }
  | { action: 'reveal'; index: number }
  | { action: 'sync' };
