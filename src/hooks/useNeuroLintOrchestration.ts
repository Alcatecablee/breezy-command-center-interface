/**
 * React Hook for NeuroLint Layer Orchestration
 * Provides state management and real-time updates for the dashboard
 */

import { useState, useEffect, useCallback, useRef } from "react";
import {
  webLayerOrchestrator,
  OrchestrationResult,
  LayerInfo,
  DetectedIssue,
  AnalysisRequest,
} from "../services/WebLayerOrchestrator";
import { createAnalysisResult, trackUsage } from "../lib/supabase";
import { useAuth } from "../lib/auth-context";

export interface UseNeuroLintOrchestrationState {
  // Analysis state
  isAnalyzing: boolean;
  analysisProgress: number;
  currentLayer: number | null;

  // Results
  lastResult: OrchestrationResult | null;
  detectedIssues: DetectedIssue[];
  recommendedLayers: number[];

  // Layer information
  layers: LayerInfo[];

  // Server status
  serverOnline: boolean;
  serverVersion?: string;

  // Error handling
  error: string | null;
  warnings: string[];
}

export interface UseNeuroLintOrchestrationActions {
  analyzeCode: (code: string, filePath?: string) => Promise<void>;
  executeAnalysis: (
    code: string,
    selectedLayers?: number[],
    options?: any,
  ) => Promise<OrchestrationResult | null>;
  clearResults: () => void;
  clearError: () => void;
  getLayerEstimatedTime: (layerId: number) => number;
  validateCode: (code: string) => Promise<boolean>;
}

export function useNeuroLintOrchestration(): UseNeuroLintOrchestrationState &
  UseNeuroLintOrchestrationActions {
  const { user } = useAuth();
  const [state, setState] = useState<UseNeuroLintOrchestrationState>({
    isAnalyzing: false,
    analysisProgress: 0,
    currentLayer: null,
    lastResult: null,
    detectedIssues: [],
    recommendedLayers: [],
    layers: [],
    serverOnline: false,
    error: null,
    warnings: [],
  });

  const progressTimerRef = useRef<NodeJS.Timeout>();
  const analysisStartTimeRef = useRef<number>();

  // Initialize orchestration system
  useEffect(() => {
    const initializeOrchestrator = async () => {
      try {
        // Get layer information
        const layers = webLayerOrchestrator.getLayerInfo();

        // Check server status
        const serverStatus = await webLayerOrchestrator.getServerStatus();

        setState((prev) => ({
          ...prev,
          layers,
          serverOnline: serverStatus.online,
          serverVersion: serverStatus.version,
        }));

        console.log("🔧 NeuroLint Orchestration initialized", {
          layers: layers.length,
          serverOnline: serverStatus.online,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          error: `Failed to initialize orchestration: ${error.message}`,
        }));
      }
    };

    initializeOrchestrator();
  }, []);

  /**
   * Analyze code and get recommendations
   */
  const analyzeCode = useCallback(
    async (code: string, filePath?: string) => {
      if (!code.trim()) {
        setState((prev) => ({
          ...prev,
          error: "Please provide code to analyze",
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        isAnalyzing: true,
        analysisProgress: 0,
        error: null,
        warnings: [],
      }));

      try {
        // Track usage (skip in demo mode)
        if (user) {
          await trackUsage(user.id, "analysis_started", {
            codeLength: code.length,
            filePath,
          });
        }

        // Perform analysis
        const analysisRequest: AnalysisRequest = { code, filePath };
        const analysis =
          await webLayerOrchestrator.analyzeCode(analysisRequest);

        setState((prev) => ({
          ...prev,
          detectedIssues: analysis.detectedIssues,
          recommendedLayers: analysis.recommendedLayers,
          isAnalyzing: false,
          analysisProgress: 100,
        }));

        console.log("📊 Analysis completed:", {
          issues: analysis.detectedIssues.length,
          recommended: analysis.recommendedLayers,
          confidence: analysis.confidence,
        });
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          error: `Analysis failed: ${error.message}`,
        }));
        console.error("Analysis error:", error);
      }
    },
    [user],
  );

  /**
   * Execute layer orchestration with real-time progress
   */
  const executeAnalysis = useCallback(
    async (
      code: string,
      selectedLayers?: number[],
      options: any = {},
    ): Promise<OrchestrationResult | null> => {
      if (!code.trim()) {
        setState((prev) => ({
          ...prev,
          error: "Please provide code to analyze",
        }));
        return null;
      }

      analysisStartTimeRef.current = Date.now();

      setState((prev) => ({
        ...prev,
        isAnalyzing: true,
        analysisProgress: 0,
        currentLayer: null,
        error: null,
        warnings: [],
        lastResult: null,
      }));

      try {
        // Track usage start (skip in demo mode)
        if (user) {
          await trackUsage(user.id, "execution_started", {
            selectedLayers,
            codeLength: code.length,
            options,
          });
        }

        // Start progress simulation
        const totalLayers = selectedLayers?.length || 4;
        let currentLayerIndex = 0;

        progressTimerRef.current = setInterval(() => {
          setState((prev) => {
            const baseProgress = (currentLayerIndex / totalLayers) * 100;
            const layerProgress = Math.min(
              25,
              (Date.now() - analysisStartTimeRef.current!) / 200,
            );
            const totalProgress = Math.min(95, baseProgress + layerProgress);

            return {
              ...prev,
              analysisProgress: totalProgress,
              currentLayer:
                selectedLayers?.[currentLayerIndex] || currentLayerIndex + 1,
            };
          });
        }, 100);

        // Execute orchestration
        const analysisRequest: AnalysisRequest = {
          code,
          selectedLayers,
          options: {
            verbose: true,
            useCache: true,
            skipUnnecessary: true,
            ...options,
          },
        };

        // Simulate layer-by-layer execution for better UX
        const result =
          await webLayerOrchestrator.executeLayers(analysisRequest);

        // Clear progress timer
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = undefined;
        }

        // Update state with results
        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          analysisProgress: 100,
          currentLayer: null,
          lastResult: result,
          warnings: result.recommendations || [],
        }));

        // Save to database if successful
        if (result.success && user) {
          try {
            const analysisData = {
              user_id: user.id,
              files_analyzed: 1,
              issues_found: state.detectedIssues.length,
              issues_fixed: result.summary.totalChanges,
              layers_used: selectedLayers || [1, 2, 3, 4],
              improvements: result.results.flatMap((r) => r.improvements),
              execution_time: result.summary.totalExecutionTime,
              cache_hit_rate: Math.round(result.summary.cacheHitRate),
            };

            await createAnalysisResult(analysisData);

            // Track completion
            await trackUsage(user.id, "execution_completed", {
              success: true,
              executionTime: result.summary.totalExecutionTime,
              changesApplied: result.summary.totalChanges,
              layersExecuted: result.summary.successfulLayers,
            });
          } catch (dbError) {
            console.warn("Failed to save analysis result:", dbError);
          }
        }

        console.log("✅ Orchestration completed:", {
          success: result.success,
          layers: result.summary.successfulLayers,
          changes: result.summary.totalChanges,
          time: `${result.summary.totalExecutionTime}ms`,
        });

        return result;
      } catch (error) {
        // Clear progress timer
        if (progressTimerRef.current) {
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = undefined;
        }

        setState((prev) => ({
          ...prev,
          isAnalyzing: false,
          error: `Execution failed: ${error.message}`,
        }));

        // Track failure
        if (user) {
          await trackUsage(user.id, "execution_failed", {
            error: error.message,
            selectedLayers,
          });
        }

        console.error("Execution error:", error);
        return null;
      }
    },
    [user, state.detectedIssues.length],
  );

  /**
   * Validate code syntax
   */
  const validateCode = useCallback(async (code: string): Promise<boolean> => {
    try {
      // Basic client-side validation
      if (!code.trim()) return false;

      // Check for basic syntax issues
      const openBraces = (code.match(/{/g) || []).length;
      const closeBraces = (code.match(/}/g) || []).length;
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;

      if (
        Math.abs(openBraces - closeBraces) > 1 ||
        Math.abs(openParens - closeParens) > 1
      ) {
        setState((prev) => ({
          ...prev,
          warnings: [
            "⚠️ Potential syntax issues detected (unmatched brackets)",
          ],
        }));
        return false;
      }

      return true;
    } catch (error) {
      setState((prev) => ({
        ...prev,
        error: `Validation failed: ${error.message}`,
      }));
      return false;
    }
  }, []);

  /**
   * Clear results and reset state
   */
  const clearResults = useCallback(() => {
    setState((prev) => ({
      ...prev,
      lastResult: null,
      detectedIssues: [],
      recommendedLayers: [],
      analysisProgress: 0,
      currentLayer: null,
      error: null,
      warnings: [],
    }));
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  /**
   * Get estimated time for a layer
   */
  const getLayerEstimatedTime = useCallback(
    (layerId: number): number => {
      const layer = state.layers.find((l) => l.id === layerId);
      return layer?.estimatedTime || 3000;
    },
    [state.layers],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
      }
    };
  }, []);

  // Auto-clear errors after 10 seconds
  useEffect(() => {
    if (state.error) {
      const timer = setTimeout(() => {
        setState((prev) => ({ ...prev, error: null }));
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [state.error]);

  return {
    ...state,
    analyzeCode,
    executeAnalysis,
    clearResults,
    clearError,
    getLayerEstimatedTime,
    validateCode,
  };
}

export default useNeuroLintOrchestration;
