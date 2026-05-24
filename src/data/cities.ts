import type { Venue } from "../types";
import { VENUES as VANCOUVER_VENUES } from "./venues";
import { DUBLIN_VENUES } from "./dublin";

export interface CityConfig {
  key: string;
  name: string;
  country: string;
  flag: string;
  venues: Venue[];
}

export const CITIES: CityConfig[] = [
  {
    key: "vancouver",
    name: "Vancouver",
    country: "Canada",
    flag: "🇨🇦",
    venues: VANCOUVER_VENUES,
  },
  {
    key: "dublin",
    name: "Dublin",
    country: "Ireland",
    flag: "🇮🇪",
    venues: DUBLIN_VENUES,
  },
];

export function getCityByKey(key: string): CityConfig {
  return CITIES.find((c) => c.key === key) ?? CITIES[0];
}
