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

  const { image, mediaType, tasteContext } = req.body;

  if (!image) {
    return res.status(400).json({ error: "No image provided" });
  }

  const userPrompt = tasteContext
    ? `Here is a photo of a wine list. The user's taste preferences: ${tasteContext}. Based on this wine list and their preferences, recommend wines.`
    : `Here is a photo of a wine list. Recommend wines from this list.`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1500,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: mediaType || "image/jpeg",
                  data: image,
                },
              },
              {
                type: "text",
                text: userPrompt,
              },
            ],
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

    const parsed = JSON.parse(text);
    return res.status(200).json(parsed);
  } catch (err) {
    console.error("Wine lens error:", err);
    return res.status(500).json({ error: "Failed to analyze wine list" });
  }
}
