export const config = {
  api: {
    bodyParser: {
      sizeLimit: "10mb",
    },
  },
};

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const SYSTEM_PROMPT = `You are an expert sommelier and wine advisor built into the NightPilot app. A user has photographed a wine list at a restaurant. Your job is to analyze the wine list and provide personalized recommendations.

You MUST respond with valid JSON only — no markdown, no backticks, no explanation outside the JSON.

Response format:
{
  "wines": [
    {
      "name": "Wine name as shown on the list",
      "type": "red | white | rosé | sparkling | orange | dessert",
      "grape": "Primary grape or blend",
      "region": "Region/country",
      "price": "Price as shown on list",
      "glass": true or false if available by the glass,
      "recommendation": "best_match | best_value | adventurous | crowd_pleaser",
      "confidence": 1-5 how confident this is a good pick,
      "why": "One sentence explanation of why this wine fits",
      "pairsWith": "Brief food pairing suggestion"
    }
  ],
  "avoid": [
    {
      "name": "Wine name",
      "why": "Brief reason to skip this one"
    }
  ],
  "listSummary": "One sentence summary of the wine list style/quality",
  "tip": "One helpful tip about this wine list or ordering strategy"
}

Rules:
- Return exactly 4 wines in the "wines" array: best_match, best_value, adventurous, crowd_pleaser
- Return 1-2 wines in the "avoid" array (ones that are overpriced or likely disappointing)
- If you can't read the wine list clearly, still do your best with what you can see
- Keep "why" explanations conversational and confident, not stuffy
- Consider price-to-value ratio in your recommendations
- If the user has taste preferences, factor those in heavily`;

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key not configured" });
  }

  const { image, mediaType, images, tasteContext } = req.body;

  // Support both single image (legacy) and multiple images
  const imageList: { image: string; mediaType: string }[] = images
    ? images
    : image
      ? [{ image, mediaType: mediaType || "image/jpeg" }]
      : [];

  if (imageList.length === 0) {
    return res.status(400).json({ error: "No image provided" });
  }

  const pageNote =
    imageList.length > 1
      ? `Here are ${imageList.length} photos of a wine list (multiple pages). `
      : `Here is a photo of a wine list. `;

  const userPrompt = tasteContext
    ? `${pageNote}The user's taste preferences: ${tasteContext}. Based on this wine list and their preferences, recommend wines.`
    : `${pageNote}Recommend wines from this list.`;

  // Build content array with all images + text prompt
  const content: any[] = imageList.map((img: any) => ({
    type: "image",
    source: {
      type: "base64",
      media_type: img.mediaType || "image/jpeg",
      data: img.image,
    },
  }));
  content.push({ type: "text", text: userPrompt });

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Anthropic API error:", errorText);
      return res.status(response.status).json({ error: "AI service error" });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text ?? "";

    // Strip markdown code fences if present
    const cleaned = text
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```\s*$/, "")
      .trim();

    try {
      const parsed = JSON.parse(cleaned);
      return res.status(200).json(parsed);
    } catch {
      console.error("Failed to parse Claude response:", text);
      return res.status(500).json({ error: "Failed to parse wine recommendations" });
    }
  } catch (err) {
    console.error("Wine lens error:", err);
    return res.status(500).json({ error: "Failed to analyze wine list" });
  }
}
