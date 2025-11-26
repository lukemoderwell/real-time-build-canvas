'use client';

import { useState, useEffect, useCallback } from 'react';
import { DEFAULT_MODELS, type ModelSettings, type ModelTier } from '@/lib/models';

const STORAGE_KEY = 'model-settings';

export function useModelSettings() {
  const [models, setModels] = useState<ModelSettings>(DEFAULT_MODELS);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as Partial<ModelSettings>;
          setModels({
            small: parsed.small ?? DEFAULT_MODELS.small,
            medium: parsed.medium ?? DEFAULT_MODELS.medium,
            large: parsed.large ?? DEFAULT_MODELS.large,
          });
        } catch {
          // Invalid JSON, use defaults
        }
      }
      setIsLoaded(true);
    }
  }, []);

  const updateModel = useCallback((tier: ModelTier, modelId: string) => {
    setModels((prev) => {
      const updated = { ...prev, [tier]: modelId };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setModels(DEFAULT_MODELS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_MODELS));
  }, []);

  return {
    models,
    updateModel,
    resetToDefaults,
    isLoaded,
  };
}
