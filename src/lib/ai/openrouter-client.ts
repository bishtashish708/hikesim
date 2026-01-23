import OpenAI from 'openai';

/**
 * OpenRouter.ai Client
 *
 * Uses OpenAI SDK format to interact with OpenRouter.ai
 * Provides cost-effective AI plan generation using GPT-4o Mini
 */

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const DEFAULT_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

// Cost per 1M tokens (as of 2026)
const MODEL_COSTS = {
  'openai/gpt-4o-mini': {
    input: 0.15,  // $0.15 per 1M input tokens
    output: 0.60, // $0.60 per 1M output tokens
  },
  'openai/gpt-4o': {
    input: 2.50,
    output: 10.00,
  },
} as const;

export type AIModel = keyof typeof MODEL_COSTS;

interface GenerationMetadata {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUSD: number;
  timestamp: string;
  durationMs: number;
}

interface AIResponse<T = unknown> {
  data: T;
  metadata: GenerationMetadata;
  rawResponse: string;
}

class OpenRouterClient {
  private client: OpenAI;
  private model: string;

  constructor(model: string = DEFAULT_MODEL) {
    if (!OPENROUTER_API_KEY) {
      throw new Error('OPENROUTER_API_KEY is not set in environment variables');
    }

    this.client = new OpenAI({
      baseURL: OPENROUTER_BASE_URL,
      apiKey: OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
        'X-Title': 'HikeSim Training Plan Generator',
      },
    });

    this.model = model;
  }

  /**
   * Generate completion with cost tracking
   */
  async generateCompletion(
    prompt: string,
    options: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      jsonMode?: boolean;
    } = {}
  ): Promise<AIResponse<string>> {
    const startTime = Date.now();

    const {
      systemPrompt = 'You are an expert hiking trainer and exercise physiologist.',
      temperature = 0.7,
      maxTokens = 4000,
      jsonMode = false,
    } = options;

    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      });

      const durationMs = Date.now() - startTime;
      const content = completion.choices[0]?.message?.content || '';
      const usage = completion.usage;

      if (!usage) {
        throw new Error('No usage data returned from OpenRouter');
      }

      const metadata: GenerationMetadata = {
        model: this.model,
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
        totalTokens: usage.total_tokens,
        costUSD: this.calculateCost(usage.prompt_tokens, usage.completion_tokens),
        timestamp: new Date().toISOString(),
        durationMs,
      };

      return {
        data: content,
        metadata,
        rawResponse: content,
      };
    } catch (error) {
      console.error('OpenRouter API error:', error);
      throw new Error(`Failed to generate completion: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate JSON completion (ensures JSON response)
   */
  async generateJSON<T = unknown>(
    prompt: string,
    options: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    } = {}
  ): Promise<AIResponse<T>> {
    const response = await this.generateCompletion(prompt, {
      ...options,
      jsonMode: true,
    });

    try {
      const data = JSON.parse(response.rawResponse) as T;
      return {
        ...response,
        data,
      };
    } catch (error) {
      console.error('Failed to parse JSON response:', response.rawResponse);
      throw new Error('AI returned invalid JSON response');
    }
  }

  /**
   * Calculate cost based on token usage
   */
  private calculateCost(promptTokens: number, completionTokens: number): number {
    const modelKey = this.model as AIModel;
    const costs = MODEL_COSTS[modelKey] || MODEL_COSTS['openai/gpt-4o-mini'];

    const inputCost = (promptTokens / 1_000_000) * costs.input;
    const outputCost = (completionTokens / 1_000_000) * costs.output;

    return inputCost + outputCost;
  }

  /**
   * Get model information
   */
  getModelInfo(): { model: string; costs: typeof MODEL_COSTS[AIModel] } {
    const modelKey = this.model as AIModel;
    return {
      model: this.model,
      costs: MODEL_COSTS[modelKey] || MODEL_COSTS['openai/gpt-4o-mini'],
    };
  }

  /**
   * Set model for this client
   */
  setModel(model: string): void {
    this.model = model;
  }
}

// Singleton instance
let clientInstance: OpenRouterClient | null = null;

/**
 * Get or create OpenRouter client instance
 */
export function getOpenRouterClient(model?: string): OpenRouterClient {
  if (!clientInstance) {
    clientInstance = new OpenRouterClient(model);
  } else if (model && clientInstance.getModelInfo().model !== model) {
    clientInstance.setModel(model);
  }
  return clientInstance;
}

/**
 * Export types
 */
export type { GenerationMetadata, AIResponse };
export { OpenRouterClient };
