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
  dietary?: string[]; // e.g. ["vegetarian","vegan","gluten-free"]
  michelin?: MichelinLevel;
}

export type MichelinLevel = "1-star" | "2-star" | "3-star" | "bib-gourmand";

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
  neighborhoods: string[];
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

export type DietaryRestriction =
  | "vegetarian"
  | "vegan"
  | "gluten-free"
  | "pescatarian"
  | "halal"
  | "dairy-free";

export const DIETARY_OPTIONS: { key: DietaryRestriction; label: string; icon: string }[] = [
  { key: "vegetarian", label: "Vegetarian", icon: "🥬" },
  { key: "vegan", label: "Vegan", icon: "🌱" },
  { key: "pescatarian", label: "Pescatarian", icon: "🐟" },
  { key: "gluten-free", label: "Gluten-Free", icon: "🌾" },
  { key: "halal", label: "Halal", icon: "🍖" },
  { key: "dairy-free", label: "Dairy-Free", icon: "🥛" },
];

export const MICHELIN_OPTIONS: { key: MichelinLevel; label: string; icon: string }[] = [
  { key: "3-star", label: "", icon: "✿✿✿" },
  { key: "2-star", label: "", icon: "✿✿" },
  { key: "1-star", label: "", icon: "✿" },
  { key: "bib-gourmand", label: "Bib Gourmand", icon: "😋" },
];

export interface UserSettings {
  dietary: DietaryRestriction[];
  michelin: MichelinLevel[];
}

export const DEFAULT_SETTINGS: UserSettings = {
  dietary: [],
  michelin: [],
};
