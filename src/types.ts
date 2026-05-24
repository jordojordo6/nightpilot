export type VenueType = "restaurant" | "bar";

export type SwipeAction = "like" | "nope" | "save";

export interface Venue {
  id: number;
  name: string;
  type: VenueType;
  cuisine: string;
  neighborhood: string;
  price: number;
  rating: number;
  vibe: string[];
  tags: string[];
  emoji: string;
  tagline: string;
  highlights: string[];
  gradient: [string, string];
  bestFor: string;
}

export interface ScoredVenue extends Venue {
  score: number;
}

export interface TasteProfile {
  likedTags: Record<string, number>;
  savedTags: Record<string, number>;
  rejectedTags: Record<string, number>;
  neighborhoods: Record<string, number>;
  prices: Record<string, number>;
  likeCount: number;
  saveCount: number;
  rejectCount: number;
}

export const EMPTY_PROFILE: TasteProfile = {
  likedTags: {},
  savedTags: {},
  rejectedTags: {},
  neighborhoods: {},
  prices: {},
  likeCount: 0,
  saveCount: 0,
  rejectCount: 0,
};

export type PlanType = "dinner" | "drinks" | "both";

export interface NightPrefs {
  occasion: string | null;
  budget: number | null;
  neighborhood: string | null;
  planType: PlanType;
}

export interface Plan {
  name: string;
  icon: string;
  planType: PlanType;
  restaurant?: ScoredVenue;
  bar?: ScoredVenue;
  matchScore: number;
  rExplanation: string;
  bExplanation: string;
  pairingRationale: string;
  walkTime: string;
  drivingTags: string[];
  whyFitsYou: string;
}

export type Screen = "city" | "landing" | "swipe" | "nightmode" | "results" | "winelens";

export interface AnalyticsEvent {
  event: string;
  timestamp: string;
  sessionId: string;
  [key: string]: unknown;
}

export interface WineSelection {
  name: string;
  type: string;
  grape: string;
  region: string;
  rating: number; // 1-5
  timestamp: string;
}

export interface WineProfile {
  selections: WineSelection[];
  // Aggregated preferences
  preferredTypes: Record<string, number>; // red: 3, white: 2
  preferredGrapes: Record<string, number>;
  preferredRegions: Record<string, number>;
  avgRating: number;
}

export const EMPTY_WINE_PROFILE: WineProfile = {
  selections: [],
  preferredTypes: {},
  preferredGrapes: {},
  preferredRegions: {},
  avgRating: 0,
};

export interface ProfileSummary {
  vibeWords: string[];
  tasteWords: string[];
  topTags: string[];
}
