import type { Venue } from "../types";
import { VENUES as VANCOUVER_VENUES } from "./venues";
import { DUBLIN_VENUES } from "./dublin";
import { AMSTERDAM_VENUES } from "./amsterdam";
import { SLC_VENUES } from "./slc";

export interface CityConfig {
  key: string;
  name: string;
  country: string;
  flag: string;
  venues: Venue[];
}

export const CITIES: CityConfig[] = [
  {
    key: "amsterdam",
    name: "Amsterdam",
    country: "Netherlands",
    flag: "🇳🇱",
    venues: AMSTERDAM_VENUES,
  },
  {
    key: "dublin",
    name: "Dublin",
    country: "Ireland",
    flag: "🇮🇪",
    venues: DUBLIN_VENUES,
  },
  {
    key: "slc",
    name: "Salt Lake City",
    country: "USA",
    flag: "🇺🇸",
    venues: SLC_VENUES,
  },
  {
    key: "vancouver",
    name: "Vancouver",
    country: "Canada",
    flag: "🇨🇦",
    venues: VANCOUVER_VENUES,
  },
];

export function getCityByKey(key: string): CityConfig {
  return CITIES.find((c) => c.key === key) ?? CITIES[0];
}
