/**
 * Model Configuration
 *
 * Centralized configuration for AI models used throughout the application.
 * Uses Vercel AI SDK naming convention: 'provider/model-name'
 *
 * GPT-4.1 Model Tiers:
 * - gpt-4.1-nano: Fastest, cheapest, simple tasks
 * - gpt-4.1-mini: Balanced speed and capability
 * - gpt-4.1: Full capability for complex tasks
 */

export type ModelTier = 'fast' | 'standard' | 'reasoning';

export interface ModelConfig {
  id: string;
  description: string;
  maxTokens: number;
  defaultTemperature: number;
}

/**
 * Model definitions by tier
 *
 * FAST: Quick responses, simple tasks, high volume
 * - Classification, extraction, short generations
 * - Cost-optimized for high-frequency calls
 *
 * STANDARD: Balanced performance and capability
 * - Most application logic, summaries, structured output
 * - Good default for general-purpose tasks
 *
 * REASONING: Complex analysis, multi-step thinking
 * - Planning, complex decisions, code generation
 * - Use sparingly due to cost/latency
 */
export const models: Record<ModelTier, ModelConfig> = {
  fast: {
    id: 'openai/gpt-4.1-nano',
    description: 'Fastest and cheapest for simple tasks',
    maxTokens: 1000,
    defaultTemperature: 0.2,
  },
  standard: {
    id: 'openai/gpt-4.1-mini',
    description: 'Balanced capability for most tasks',
    maxTokens: 2000,
    defaultTemperature: 0.3,
  },
  reasoning: {
    id: 'openai/gpt-4.1',
    description: 'Best for complex analysis and generation',
    maxTokens: 4000,
    defaultTemperature: 0.4,
  },
};

/**
 * Get model ID by tier
 */
export function getModel(tier: ModelTier): string {
  return models[tier].id;
}

/**
 * Get full model config by tier
 */
export function getModelConfig(tier: ModelTier): ModelConfig {
  return models[tier];
}

/**
 * Shorthand exports for common use cases
 */
export const FAST_MODEL = models.fast.id;
export const STANDARD_MODEL = models.standard.id;
export const REASONING_MODEL = models.reasoning.id;
