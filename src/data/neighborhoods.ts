const NEARBY: Record<string, string[]> = {
  "Downtown": ["Coal Harbour", "Gastown", "Yaletown", "Chinatown", "Waterfront"],
  "Gastown": ["Downtown", "Chinatown", "Railtown", "Waterfront"],
  "Chinatown": ["Gastown", "Downtown", "Main Street", "Railtown"],
  "Yaletown": ["Downtown", "Fairview", "Waterfront"],
  "Coal Harbour": ["Downtown", "Waterfront", "Gastown"],
  "Waterfront": ["Downtown", "Coal Harbour", "Gastown"],
  "Kitsilano": ["Fairview", "Cambie"],
  "Fairview": ["Kitsilano", "Cambie", "Yaletown", "Main Street"],
  "Main Street": ["Chinatown", "Fairview", "Commercial Drive", "Cambie"],
  "Commercial Drive": ["Main Street", "Railtown"],
  "Cambie": ["Fairview", "Kitsilano", "Main Street"],
  "Railtown": ["Gastown", "Chinatown", "Commercial Drive"],
};

export function areNearby(n1: string, n2: string): boolean {
  if (n1 === n2) return true;
  return (NEARBY[n1] ?? []).includes(n2);
}

export function estimateWalkTime(n1: string, n2: string): string {
  if (n1 === n2) return "2 min walk";
  if (areNearby(n1, n2)) {
    // Deterministic based on neighborhood names so it doesn't change on re-render
    const seed = (n1.length * 7 + n2.length * 13) % 8;
    return `${5 + seed} min walk`;
  }
  const seed = (n1.length * 11 + n2.length * 3) % 8;
  return `${12 + seed} min · cab recommended`;
}
