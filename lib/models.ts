export interface ModelOption {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  tier: 'small' | 'medium' | 'large';
}

export const MODEL_OPTIONS: ModelOption[] = [
  // Small tier (fast, cheap)
  {
    id: 'openai/gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    provider: 'openai',
    tier: 'small',
  },
  {
    id: 'anthropic/claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    provider: 'anthropic',
    tier: 'small',
  },

  // Medium tier (balanced)
  {
    id: 'openai/gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    provider: 'openai',
    tier: 'medium',
  },
  {
    id: 'anthropic/claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    tier: 'medium',
  },

  // Large tier (powerful)
  {
    id: 'openai/gpt-5',
    name: 'GPT-5',
    provider: 'openai',
    tier: 'large',
  },
  {
    id: 'anthropic/claude-opus-4-5',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    tier: 'large',
  },
];

export type ModelTier = 'small' | 'medium' | 'large';

export interface ModelSettings {
  small: string;
  medium: string;
  large: string;
}

export const DEFAULT_MODELS: ModelSettings = {
  small: 'openai/gpt-4.1-nano',
  medium: 'openai/gpt-4.1-mini',
  large: 'openai/gpt-5',
};

// Helper to get models by tier
export function getModelsByTier(tier: ModelTier): ModelOption[] {
  return MODEL_OPTIONS.filter((m) => m.tier === tier);
}

// Helper to get model display name by ID
export function getModelName(modelId: string): string {
  const model = MODEL_OPTIONS.find((m) => m.id === modelId);
  return model?.name ?? modelId;
}
