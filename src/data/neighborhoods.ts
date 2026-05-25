const NEARBY: Record<string, string[]> = {
  // Vancouver + Salt Lake City (shared key — safe because recs are always within one city)
  "Downtown": ["Coal Harbour", "Gastown", "Yaletown", "Chinatown", "Waterfront", "Capitol Hill", "Central 9th", "Marmalade", "The Avenues"],
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
  // Dublin
  "Dawson Street": ["South William Street", "South Anne Street", "Fade Street", "College Green", "Fitzwilliam Place"],
  "South William Street": ["Dawson Street", "South Anne Street", "Fade Street", "Wexford Street", "Aungier Street"],
  "South Anne Street": ["Dawson Street", "South William Street", "College Green"],
  "Fade Street": ["South William Street", "Dawson Street", "Wexford Street", "Aungier Street", "Dame Street"],
  "College Green": ["Dawson Street", "South Anne Street", "Dame Street", "Temple Bar"],
  "Temple Bar": ["College Green", "Dame Street", "Christchurch"],
  "Dame Street": ["Temple Bar", "College Green", "Fade Street", "South William Street", "Christchurch"],
  "Christchurch": ["Dame Street", "Temple Bar", "Aungier Street"],
  "Aungier Street": ["Fade Street", "Wexford Street", "South William Street", "Camden Street", "Christchurch"],
  "Wexford Street": ["Camden Street", "Aungier Street", "Fade Street", "South William Street"],
  "Camden Street": ["Wexford Street", "Aungier Street", "Harcourt Street", "Ranelagh"],
  "Harcourt Street": ["Camden Street", "Stephen Street", "Ranelagh"],
  "Stephen Street": ["Harcourt Street", "South William Street", "Aungier Street"],
  "Ranelagh": ["Camden Street", "Harcourt Street", "Baggot Street"],
  "Baggot Street": ["Ranelagh", "Fitzwilliam Place", "Poolbeg Street"],
  "Fitzwilliam Place": ["Baggot Street", "Dawson Street", "Harcourt Street"],
  "Poolbeg Street": ["Baggot Street", "College Green"],
  "Parnell Square": ["Smithfield", "Stoneybatter", "Green Street"],
  "Smithfield": ["Parnell Square", "Stoneybatter", "Queen Street"],
  "Stoneybatter": ["Smithfield", "Parnell Square", "Queen Street"],
  "Queen Street": ["Smithfield", "Stoneybatter"],
  "Green Street": ["Parnell Square", "Smithfield"],
  "South Circular Road": ["Camden Street", "Wexford Street"],
  "Nassau Street": ["College Green", "Dawson Street"],
  "South Great Georges Street": ["Dame Street", "Fade Street", "Aungier Street"],
  // Amsterdam
  "Centrum": ["Grachtengordel", "Jordaan", "Reguliersdwarsstraat", "Nine Streets"],
  "Jordaan": ["Centrum", "Grachtengordel", "Nine Streets", "Oud-West"],
  "Nine Streets": ["Jordaan", "Centrum", "Grachtengordel"],
  "Grachtengordel": ["Centrum", "Jordaan", "Nine Streets", "Reguliersdwarsstraat", "De Pijp"],
  "Reguliersdwarsstraat": ["Centrum", "Grachtengordel", "De Pijp"],
  "De Pijp": ["Grachtengordel", "Reguliersdwarsstraat", "Oost", "Amstel", "Plantage"],
  "Oud-West": ["Jordaan", "Centrum"],
  "Oost": ["De Pijp", "Plantage", "Amstel"],
  "Plantage": ["Oost", "Centrum", "De Pijp", "Amstel"],
  "Amstel": ["Plantage", "De Pijp", "Oost", "Grachtengordel"],
  // Salt Lake City
  "Capitol Hill": ["Downtown", "Marmalade", "The Avenues"],
  "Marmalade": ["Capitol Hill", "Downtown"],
  "The Avenues": ["Downtown", "Capitol Hill"],
  "Central 9th": ["Downtown", "9th & 9th", "Sugar House"],
  "9th & 9th": ["Central 9th", "Sugar House", "Downtown"],
  "Sugar House": ["9th & 9th", "Central 9th"],
  "Millcreek Canyon": [],
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
