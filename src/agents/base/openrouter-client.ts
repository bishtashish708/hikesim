/**
 * OpenRouter AI client for agent system
 * Uses different models for different tasks to optimize cost
 */

export interface OpenRouterMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenRouterResponse {
  id: string;
  model: string;
  choices: {
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OpenRouterConfig {
  apiKey: string;
  model: string;
  temperature?: number;
  maxTokens?: number;
}

export class OpenRouterClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Call OpenRouter API with specified model
   */
  async chat(
    messages: OpenRouterMessage[],
    model: string = 'openai/gpt-4o-mini',
    options: {
      temperature?: number;
      maxTokens?: number;
      responseFormat?: 'json_object' | 'text';
    } = {}
  ): Promise<OpenRouterResponse> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://peakprep.app',
        'X-Title': 'PeakPrep Trail Data Collection',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.3,
        max_tokens: options.maxTokens ?? 4000,
        ...(options.responseFormat === 'json_object' && {
          response_format: { type: 'json_object' }
        }),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    return await response.json();
  }

  /**
   * Extract JSON from AI response
   */
  extractJSON<T>(response: OpenRouterResponse): T {
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in response');
    }

    try {
      // Try to parse as-is first
      return JSON.parse(content);
    } catch (e1) {
      try {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }
      } catch (e2) {
        // Try to find JSON-like content between { and }
        const jsonStart = content.indexOf('{');
        const jsonEnd = content.lastIndexOf('}');
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          try {
            return JSON.parse(content.substring(jsonStart, jsonEnd + 1));
          } catch (e3) {
            // Fall through
          }
        }
      }

      // Log the actual content for debugging
      console.error('Failed to parse JSON. Response content:', content.substring(0, 500));
      throw new Error(`Could not extract JSON from response: ${(e1 as Error).message}`);
    }
  }

  /**
   * Calculate cost from usage
   * Prices per 1M tokens (as of Jan 2026)
   */
  calculateCost(usage: OpenRouterResponse['usage'], model: string): number {
    const pricing: Record<string, { input: number; output: number }> = {
      'openai/gpt-4o-mini': { input: 0.15, output: 0.60 },
      'anthropic/claude-sonnet-4-5': { input: 3.0, output: 15.0 },
      'anthropic/claude-3.5-sonnet': { input: 3.0, output: 15.0 },
    };

    const prices = pricing[model] || pricing['openai/gpt-4o-mini'];
    const inputCost = (usage.prompt_tokens / 1_000_000) * prices.input;
    const outputCost = (usage.completion_tokens / 1_000_000) * prices.output;

    return inputCost + outputCost;
  }

  /**
   * Quick helper for JSON responses
   */
  async chatJSON<T>(
    messages: OpenRouterMessage[],
    model: string = 'openai/gpt-4o-mini',
    options: { temperature?: number; maxTokens?: number } = {}
  ): Promise<{ data: T; usage: OpenRouterResponse['usage']; cost: number }> {
    const response = await this.chat(messages, model, {
      ...options,
      responseFormat: 'json_object',
    });

    const data = this.extractJSON<T>(response);
    const cost = this.calculateCost(response.usage, model);

    return { data, usage: response.usage, cost };
  }
}
