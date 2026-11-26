import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { safeFetchJson } from '../lib/apiClient';

export type FeatureKey =
  | 'routine'
  | 'courses'
  | 'retake_courses'
  | 'exams'
  | 'announcements'
  | 'question_bank'
  | 'faq'
  | 'notices'
  | 'faculty'
  | 'cgpa'
  | 'chatbot'
  | 'bug_report'
  | 'cr_routine_requests';

export type FeatureCategory = 'ACADEMIC' | 'TOOLS_AI' | 'RESOURCES' | 'MANAGEMENT';

export interface FeatureFlagItem {
  key: FeatureKey;
  name: string;
  description: string;
  category: FeatureCategory;
  routePaths: string[];
  enabled: boolean;
  disabledMessage: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface FeatureFlagContextType {
  features: FeatureFlagItem[];
  isLoading: boolean;
  isFeatureEnabled: (key: FeatureKey) => boolean;
  getFeature: (key: FeatureKey) => FeatureFlagItem | undefined;
  refreshFeatures: () => Promise<void>;
  setFeaturesDirect: (next: FeatureFlagItem[]) => void;
}

const FeatureFlagContext = createContext<FeatureFlagContextType | undefined>(undefined);

export const FeatureFlagProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [features, setFeatures] = useState<FeatureFlagItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refreshFeatures = useCallback(async () => {
    try {
      const json = await safeFetchJson('/api/features', {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (json && Array.isArray(json.data)) {
        setFeatures(json.data);
      }
    } catch (err) {
      console.warn('Could not load feature flags, defaulting to enabled:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFeatures();
  }, [refreshFeatures]);

  const featureMap = useMemo(() => {
    const map = new Map<FeatureKey, FeatureFlagItem>();
    for (const f of features) {
      map.set(f.key, f);
    }
    return map;
  }, [features]);

  const isFeatureEnabled = useCallback(
    (key: FeatureKey): boolean => {
      const found = featureMap.get(key);
      return found ? found.enabled : true;
    },
    [featureMap]
  );

  const getFeature = useCallback(
    (key: FeatureKey): FeatureFlagItem | undefined => {
      return featureMap.get(key);
    },
    [featureMap]
  );

  const setFeaturesDirect = useCallback((next: FeatureFlagItem[]) => {
    setFeatures(next);
  }, []);

  const value = useMemo(
    () => ({
      features,
      isLoading,
      isFeatureEnabled,
      getFeature,
      refreshFeatures,
      setFeaturesDirect,
    }),
    [features, isLoading, isFeatureEnabled, getFeature, refreshFeatures, setFeaturesDirect]
  );

  return <FeatureFlagContext.Provider value={value}>{children}</FeatureFlagContext.Provider>;
};

export function useFeatureFlags(): FeatureFlagContextType {
  const ctx = useContext(FeatureFlagContext);
  if (!ctx) {
    return {
      features: [],
      isLoading: false,
      isFeatureEnabled: () => true,
      getFeature: () => undefined,
      refreshFeatures: async () => {},
      setFeaturesDirect: () => {},
    };
  }
  return ctx;
}
