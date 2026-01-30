/**
 * Image Enrichment Service using OpenRouter
 * Uses Perplexity's web search capabilities to find accurate trail images
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Use Perplexity's sonar model for web search (updated model name)
const MODEL = 'perplexity/sonar';

interface HikeImageResult {
  images: {
    url: string;
    source: string;
    caption: string;
    verified: boolean;
  }[];
  primaryImageUrl: string | null;
}

export interface HikeInfo {
  name: string;
  parkName?: string | null;
  stateCode?: string | null;
  countryCode: string;
  city?: string | null;
  region?: string | null;
}

export async function searchHikeImages(hike: HikeInfo): Promise<HikeImageResult> {
  if (!OPENROUTER_API_KEY) {
    throw new Error('OPENROUTER_API_KEY is not set');
  }

  // Build search query with location context
  const location = [
    hike.parkName,
    hike.city,
    hike.region,
    hike.stateCode,
    hike.countryCode === 'US' ? 'USA' : hike.countryCode === 'IN' ? 'India' : hike.countryCode,
  ]
    .filter(Boolean)
    .join(', ');

  const prompt = `Find 3-5 high-quality, publicly available images of the "${hike.name}" hiking trail in ${location}.

For each image, provide:
1. The direct image URL (must be a real, accessible .jpg, .png, or .webp URL)
2. The source website (e.g., "AllTrails", "NPS", "Wikimedia Commons", "Flickr")
3. A brief caption describing what's in the image

IMPORTANT:
- Only include images that are publicly accessible and show the actual trail
- Prefer images from official sources (National Park Service, AllTrails, Wikimedia Commons)
- URLs must be direct links to images, not webpage URLs
- If you cannot find verified images of this specific trail, say "NO_IMAGES_FOUND"

Respond in this exact JSON format:
{
  "images": [
    {"url": "https://...", "source": "AllTrails", "caption": "View from the summit"},
    ...
  ]
}`;

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://hikesim.app',
        'X-Title': 'HikeSim Trail Image Enrichment',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that finds accurate trail images. Always respond with valid JSON.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse the response
    if (content.includes('NO_IMAGES_FOUND')) {
      return { images: [], primaryImageUrl: null };
    }

    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.warn(`Could not parse JSON for hike: ${hike.name}`);
      return { images: [], primaryImageUrl: null };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const images = (parsed.images || []).map((img: any) => ({
      url: img.url,
      source: img.source || 'Unknown',
      caption: img.caption || '',
      verified: false, // Will be verified by image validation
    }));

    // Validate images (check if URLs are accessible)
    const validatedImages = await validateImages(images);

    return {
      images: validatedImages,
      primaryImageUrl: validatedImages[0]?.url || null,
    };
  } catch (error) {
    console.error(`Error searching images for ${hike.name}:`, error);
    return { images: [], primaryImageUrl: null };
  }
}

async function validateImages(
  images: { url: string; source: string; caption: string; verified: boolean }[]
): Promise<{ url: string; source: string; caption: string; verified: boolean }[]> {
  const validated = [];

  for (const image of images) {
    try {
      // Quick HEAD request to check if image exists
      const response = await fetch(image.url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000),
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type') || '';
        if (contentType.startsWith('image/')) {
          validated.push({ ...image, verified: true });
        }
      }
    } catch {
      // Image not accessible, skip it
      console.log(`Image not accessible: ${image.url}`);
    }

    // Limit to 5 validated images
    if (validated.length >= 5) break;
  }

  return validated;
}

// Fallback: Generate placeholder images using Unsplash
export function getPlaceholderImages(hike: HikeInfo): HikeImageResult {
  const searchTerms = [
    'hiking trail',
    hike.parkName ? `${hike.parkName} trail` : null,
    hike.countryCode === 'IN' ? 'india mountain hiking' : 'mountain trail usa',
  ].filter(Boolean);

  const query = encodeURIComponent(searchTerms[0] || 'hiking trail');

  // Unsplash Source URLs (free, no API key needed for basic usage)
  const images = [
    {
      url: `https://source.unsplash.com/800x600/?${query},nature`,
      source: 'Unsplash',
      caption: `Scenic view of ${hike.name}`,
      verified: true,
    },
    {
      url: `https://source.unsplash.com/800x600/?hiking,trail,${hike.countryCode === 'IN' ? 'india' : 'america'}`,
      source: 'Unsplash',
      caption: 'Trail scenery',
      verified: true,
    },
  ];

  return {
    images,
    primaryImageUrl: images[0].url,
  };
}

// Cost estimation helper
export function estimateCost(hikeCount: number): {
  inputTokens: number;
  outputTokens: number;
  estimatedCost: string;
  model: string;
} {
  // Average tokens per request
  const avgInputTokens = 400;
  const avgOutputTokens = 600;

  // Perplexity sonar-small pricing (per 1M tokens)
  const inputPricePerMillion = 0.2; // $0.20 per 1M input tokens
  const outputPricePerMillion = 0.2; // $0.20 per 1M output tokens

  const totalInputTokens = hikeCount * avgInputTokens;
  const totalOutputTokens = hikeCount * avgOutputTokens;

  const inputCost = (totalInputTokens / 1_000_000) * inputPricePerMillion;
  const outputCost = (totalOutputTokens / 1_000_000) * outputPricePerMillion;
  const totalCost = inputCost + outputCost;

  return {
    inputTokens: totalInputTokens,
    outputTokens: totalOutputTokens,
    estimatedCost: `$${totalCost.toFixed(2)}`,
    model: MODEL,
  };
}
