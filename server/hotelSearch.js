/**
 * Hotel autocomplete matching.
 *
 * The endpoint used to be `name.toLowerCase().includes(query)`, which fails the
 * two things people actually type:
 *
 *   "paris"            → returned only hotels with "Paris" in the NAME, so
 *                        Le Meurice and Plaza Athénée — both in Paris — were
 *                        missing while Novotel Paris Centre was not.
 *   "citizenm paris"   → nothing, because no single field contains that exact
 *                        string even when the hotel is in the list.
 *
 * Matching is now per word across name AND destination, so word order does not
 * matter and a city name is a valid thing to type. Accents are folded because
 * the catalogue spells it "Franca" while a keyboard produces "França".
 *
 * Pure and catalogue-agnostic: it takes the list to search, which is what makes
 * it testable and what will let a bigger catalogue drop in later.
 */

export function normalizeForSearch(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')  // strip diacritics: "frança" → "franca"
    .replace(/[^a-z0-9]+/g, ' ')      // punctuation is noise: "shangri-la" → "shangri la"
    .trim();
}

/**
 * Rank a match. A hotel whose NAME carries every word beats one that only
 * qualifies because the city matched — typing "fasano sao paulo" should put
 * Hotel Fasano São Paulo above every other São Paulo hotel.
 */
function score(hotel, tokens) {
  const name = normalizeForSearch(hotel.name);
  let points = 0;
  if (tokens.every(t => name.includes(t))) points += 100;
  if (name.startsWith(tokens[0])) points += 40;
  // A whole-word hit is worth more than a fragment ("inn" inside "Inniskillin").
  const words = new Set(name.split(' '));
  points += tokens.filter(t => words.has(t)).length * 5;
  points += Number(hotel.stars) || 0;
  return points;
}

export function searchHotels(catalog, query, limit = 8) {
  const tokens = normalizeForSearch(query).split(' ').filter(Boolean);
  if (tokens.length === 0) return [];

  const matches = [];
  for (const hotel of Array.isArray(catalog) ? catalog : []) {
    if (!hotel || !hotel.name) continue;
    const haystack = `${normalizeForSearch(hotel.name)} ${normalizeForSearch(hotel.destination)}`;
    // Every word must appear somewhere. "paris" alone matches every Paris
    // hotel; adding "meurice" narrows it rather than widening it.
    if (!tokens.every(t => haystack.includes(t))) continue;
    matches.push(hotel);
  }

  return matches
    .sort((a, b) => score(b, tokens) - score(a, tokens) || a.name.localeCompare(b.name))
    .slice(0, limit);
}
