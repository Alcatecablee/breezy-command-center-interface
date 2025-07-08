import { EnhancedLayerOrchestrator } from "./EnhancedLayerOrchestrator.js";
import { ErrorRecoverySystem } from "./ErrorRecoverySystem.js";
import { EnhancedPerformanceOptimizer } from "./EnhancedPerformanceOptimizer.js";
import { LayerOrchestrationTester } from "./LayerOrchestrationTester.js";
import { SmartLayerSelector } from "../layers/SmartLayerSelector.js";
import chalk from "chalk";
import { performance } from "perf_hooks";

/**
 * Main NeuroLint Orchestrator that combines all enhanced patterns
 * Implements comprehensive orchestration following all patterns from ORCHESTRATION-IMPLEMENTATION.md
 *
 * Features:
 * - Safe Layer Execution with rollback
 * - AST vs Regex Fallback Strategy
 * - Incremental Validation System
 * - Layer Dependency Management
 * - Pipeline State Tracking
 * - Smart Layer Selection
 * - Error Recovery and Reporting
 * - Performance Optimization
 * - Comprehensive Testing
 */
class NeuroLintOrchestrator {
  constructor(options = {}) {
    this.options = {
      verbose: false,
      dryRun: false,
      useCache: true,
      skipUnnecessary: true,
      enablePerformanceOptimization: true,
      enableErrorRecovery: true,
      enableSmartSelection: true,
      maxExecutionTime: 300000, // 5 minutes
      ...options,
    };

    // Initialize components
    this.layerOrchestrator = new EnhancedLayerOrchestrator(this.options);
    this.performanceOptimizer = new EnhancedPerformanceOptimizer();
    this.tester = new LayerOrchestrationTester();

    this.executionHistory = [];
    this.globalMetrics = {
      totalExecutions: 0,
      totalExecutionTime: 0,
      totalFilesProcessed: 0,
      averageSuccessRate: 0,
    };
  }

  /**
   * Main public API - Execute NeuroLint transformation with comprehensive orchestration
   */
  async execute(code, filePath = "", options = {}) {
    const startTime = performance.now();
    const mergedOptions = { ...this.options, ...options };

    this.log("🚀 Starting NeuroLint Orchestration...", mergedOptions.verbose);

    try {
      // Step 1: Smart Layer Selection (if enabled)
      let layers = options.layers || [1, 2, 3, 4];

      if (mergedOptions.enableSmartSelection && !options.layers) {
        const recommendation = SmartLayerSelector.analyzeAndRecommend(
          code,
          filePath,
        );
        layers = recommendation.recommendedLayers;

        if (mergedOptions.verbose) {
          console.log(chalk.blue("🎯 Smart layer selection:"));
          console.log(`  Recommended layers: ${layers.join(", ")}`);
          console.log(
            `  Confidence: ${(recommendation.confidence * 100).toFixed(1)}%`,
          );
          recommendation.reasoning.forEach((reason) => {
            console.log(`  - ${reason}`);
          });
        }
      }

      // Step 2: Performance-optimized execution
      let result;

      if (mergedOptions.enablePerformanceOptimization) {
        result = await this.performanceOptimizer.executeOptimized(
          code,
          layers,
          (code, layers, opts) =>
            this.layerOrchestrator.executeLayers(code, layers, opts),
          mergedOptions,
        );
      } else {
        // Standard execution
        const executionResult = await this.layerOrchestrator.executeLayers(
          code,
          layers,
          mergedOptions,
        );
        result = {
          result: executionResult.finalCode,
          fromCache: false,
          executionTime: executionResult.executionTime,
          optimizations: [],
          layerResults: executionResult.results,
          metrics: {},
        };
      }

      // Step 3: Error recovery (if needed and enabled)
      if (
        !result.layerResults?.every((r) => r.success) &&
        mergedOptions.enableErrorRecovery
      ) {
        this.log(
          "🔄 Applying error recovery strategies...",
          mergedOptions.verbose,
        );

        const errorReport = ErrorRecoverySystem.formatErrorReport(
          result.layerResults || [],
        );
        const suggestions = ErrorRecoverySystem.generateRecoverySuggestions(
          result.layerResults || [],
        );

        result.errorReport = errorReport;
        result.recoverySuggestions = suggestions;
      }

      // Step 4: Record execution history and metrics
      this.recordExecution({
        filePath,
        layers,
        originalCode: code,
        result,
        executionTime: performance.now() - startTime,
        options: mergedOptions,
      });

      // Step 5: Format final result
      const finalResult = this.formatResult(
        result,
        code,
        layers,
        performance.now() - startTime,
      );

      this.log(
        `✅ Orchestration completed in ${finalResult.executionTime.toFixed(0)}ms`,
        mergedOptions.verbose,
      );

      return finalResult;
    } catch (error) {
      this.log(`❌ Orchestration failed: ${error.message}`, true);

      // Record failed execution
      this.recordExecution({
        filePath,
        layers: options.layers || [],
        originalCode: code,
        result: { success: false, error: error.message },
        executionTime: performance.now() - startTime,
        options: mergedOptions,
      });

      return {
        success: false,
        finalCode: code, // Return original code on failure
        error: error.message,
        executionTime: performance.now() - startTime,
        layers: [],
        summary: {
          totalLayers: 0,
          successfulLayers: 0,
          failedLayers: 0,
          totalChanges: 0,
          error: error.message,
        },
      };
    }
  }

  /**
   * Batch processing for multiple files
   */
  async executeBatch(files, options = {}) {
    const startTime = performance.now();
    const results = [];

    this.log(
      `📦 Starting batch processing of ${files.length} files...`,
      options.verbose,
    );

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        this.log(
          `Processing ${file.path} (${i + 1}/${files.length})...`,
          options.verbose,
        );

        const result = await this.execute(file.content, file.path, {
          ...options,
          verbose: false, // Reduce noise in batch mode
        });

        results.push({
          filePath: file.path,
          ...result,
        });
      } catch (error) {
        results.push({
          filePath: file.path,
          success: false,
          error: error.message,
          finalCode: file.content,
        });
      }
    }

    const totalTime = performance.now() - startTime;
    const successful = results.filter((r) => r.success).length;

    this.log(
      `📊 Batch completed: ${successful}/${files.length} successful in ${totalTime.toFixed(0)}ms`,
      true,
    );

    return {
      results,
      summary: {
        totalFiles: files.length,
        successful,
        failed: files.length - successful,
        totalExecutionTime: totalTime,
        averageTimePerFile: totalTime / files.length,
      },
    };
  }

  /**
   * Analyze code without executing transformations
   */
  async analyze(code, filePath = "", options = {}) {
    this.log("🔍 Analyzing code...", options.verbose);

    const recommendation = SmartLayerSelector.analyzeAndRecommend(
      code,
      filePath,
    );
    const complexity = this.performanceOptimizer.analyzeCodeComplexity(code);

    return {
      recommendation,
      complexity,
      filePath,
      codeStats: {
        lines: code.split("\n").length,
        characters: code.length,
        estimatedProcessingTime: this.estimateProcessingTime(
          code,
          recommendation.recommendedLayers,
        ),
      },
    };
  }

  /**
   * Run comprehensive tests on the orchestration system
   */
  async runTests(options = {}) {
    this.log("🧪 Running orchestration tests...", true);
    return await this.tester.runTestSuite(options);
  }

  /**
   * Get performance metrics and statistics
   */
  getMetrics() {
    const performanceMetrics =
      this.performanceOptimizer.generatePerformanceReport();

    return {
      global: this.globalMetrics,
      performance: performanceMetrics,
      history: this.executionHistory.slice(-10), // Last 10 executions
      cache: {
        size: this.performanceOptimizer.cache.size,
        hits: this.performanceOptimizer.metrics.cacheHits,
        misses: this.performanceOptimizer.metrics.cacheMisses,
      },
    };
  }

  /**
   * Clear caches and reset metrics
   */
  reset() {
    this.performanceOptimizer.clearCache();
    this.executionHistory = [];
    this.globalMetrics = {
      totalExecutions: 0,
      totalExecutionTime: 0,
      totalFilesProcessed: 0,
      averageSuccessRate: 0,
    };

    this.log("🗑️  Orchestrator reset completed", true);
  }

  /**
   * Helper methods
   */
  recordExecution(execution) {
    this.executionHistory.push({
      ...execution,
      timestamp: Date.now(),
    });

    // Keep only last 100 executions
    if (this.executionHistory.length > 100) {
      this.executionHistory.shift();
    }

    // Update global metrics
    this.globalMetrics.totalExecutions++;
    this.globalMetrics.totalExecutionTime += execution.executionTime;
    this.globalMetrics.totalFilesProcessed++;

    const successfulExecutions = this.executionHistory.filter(
      (e) => e.result.success !== false,
    ).length;
    this.globalMetrics.averageSuccessRate =
      successfulExecutions / this.executionHistory.length;
  }

  formatResult(result, originalCode, layers, totalTime) {
    return {
      success: result.layerResults?.every((r) => r.success) !== false,
      finalCode: result.result || originalCode,
      originalCode,
      executionTime: totalTime,
      fromCache: result.fromCache || false,
      layers: result.layerResults || [],
      optimizations: result.optimizations || [],
      summary: {
        totalLayers: layers.length,
        successfulLayers:
          result.layerResults?.filter((r) => r.success).length || 0,
        failedLayers:
          result.layerResults?.filter((r) => !r.success).length || 0,
        totalChanges:
          result.layerResults?.reduce(
            (sum, r) => sum + (r.changeCount || 0),
            0,
          ) || 0,
        improvements:
          result.layerResults?.flatMap((r) => r.improvements || []) || [],
        totalExecutionTime:
          result.layerResults?.reduce((sum, r) => sum + r.executionTime, 0) ||
          0,
      },
      metrics: result.metrics || {},
      errorReport: result.errorReport,
      recoverySuggestions: result.recoverySuggestions,
    };
  }

  estimateProcessingTime(code, layers) {
    const baseTime = 100; // Base processing time in ms
    const codeComplexity =
      this.performanceOptimizer.analyzeCodeComplexity(code);
    const layerMultiplier = layers.length * 200; // 200ms per layer
    const complexityMultiplier = codeComplexity.score * 1000; // Up to 1s for complex code

    return baseTime + layerMultiplier + complexityMultiplier;
  }

  log(message, verbose = false) {
    if (verbose) {
      console.log(message);
    }
  }
}

/**
 * Convenience function for simple usage
 */
async function executeNeuroLint(code, filePath = "", options = {}) {
  const orchestrator = new NeuroLintOrchestrator(options);
  return await orchestrator.execute(code, filePath, options);
}

/**
 * Convenience function for batch processing
 */
async function executeBatchNeuroLint(files, options = {}) {
  const orchestrator = new NeuroLintOrchestrator(options);
  return await orchestrator.executeBatch(files, options);
}

/**
 * Convenience function for code analysis
 */
async function analyzeCode(code, filePath = "", options = {}) {
  const orchestrator = new NeuroLintOrchestrator(options);
  return await orchestrator.analyze(code, filePath, options);
}

export {
  NeuroLintOrchestrator,
  executeNeuroLint,
  executeBatchNeuroLint,
  analyzeCode,
};
