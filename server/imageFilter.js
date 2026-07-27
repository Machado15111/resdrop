/**
 * Best-effort filter that drops hotel photos where a PERSON is a prominent
 * subject, so galleries show the property — not random guests. Google Hotels
 * mixes guest snapshots into a hotel's photo set and tags none of them, so the
 * only reliable signal is looking at the pixels.
 *
 * Uses OpenAI vision (a small, cheap model) when OPENAI_API_KEY is set; otherwise
 * returns the input unchanged. Designed to run ONCE per hotel at cache time, so
 * cost and latency are bounded. It never returns an empty list — if every image
 * is flagged, or anything fails, it returns the original set (imagery beats a
 * blank gallery).
 */

const VISION_MODEL = process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';

export function imageFilterConfigured() {
  return !!process.env.OPENAI_API_KEY;
}

export async function filterOutPeopleImages(imageUrls, { timeoutMs = 12000 } = {}) {
  const urls = (Array.isArray(imageUrls) ? imageUrls : []).filter(u => typeof u === 'string' && u);
  if (urls.length <= 1 || !process.env.OPENAI_API_KEY) return urls;

  const subset = urls.slice(0, 12); // extraction already caps at 12
  const content = [
    {
      type: 'text',
      text:
        'These are candidate photos for a HOTEL gallery, 0-indexed in the order given. ' +
        'Flag an image only when a PERSON is a prominent subject — a clearly visible face, ' +
        'or a person in the foreground (guest selfies, staff/guest portraits, children). ' +
        'Do NOT flag tiny/incidental distant figures, silhouettes by a pool, or empty rooms. ' +
        'Reply with ONLY a JSON object like {"people":[1,4]} listing the 0-based indices to flag. No prose.',
    },
    ...subset.map(u => ({ type: 'image_url', image_url: { url: u, detail: 'low' } })),
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: VISION_MODEL,
        messages: [{ role: 'user', content }],
        max_tokens: 120,
        temperature: 0,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return urls;
    const json = await res.json();
    const text = json.choices?.[0]?.message?.content || '';
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return urls;
    const parsed = JSON.parse(match[0]);
    const flagged = new Set(
      (Array.isArray(parsed.people) ? parsed.people : []).filter(n => Number.isInteger(n) && n >= 0)
    );
    if (flagged.size === 0) return urls;
    const kept = urls.filter((_, i) => !flagged.has(i));
    // Never end up with an empty gallery.
    return kept.length > 0 ? kept : urls;
  } catch {
    return urls; // best-effort: any failure → serve the original set
  } finally {
    clearTimeout(timer);
  }
}
