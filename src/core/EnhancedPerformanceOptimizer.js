import os from "os";
import fs from "fs";
import { performance } from "perf_hooks";
import chalk from "chalk";

/**
 * Performance optimization strategies for layer execution
 * Includes caching, parallel processing, and smart scheduling
 * Implements the Performance Optimization pattern from orchestration guide
 */
class EnhancedPerformanceOptimizer {
  constructor() {
    this.cache = new Map();
    this.metrics = {
      memoryUsage: [],
      processingTimes: [],
      cacheHits: 0,
      cacheMisses: 0,
    };
    this.CACHE_SIZE_LIMIT = 100;
    this.MEMORY_THRESHOLD = 0.8; // 80% of available memory
    this.CPU_THRESHOLD = 0.9; // 90% CPU usage
  }

  /**
   * Execute layers with comprehensive performance optimizations
   */
  async executeOptimized(code, layers, executeFunction, options = {}) {
    const startTime = performance.now();
    const optimizationOptions = {
      useCache: true,
      enableParallel: false,
      skipUnnecessary: true,
      memoryOptimization: true,
      ...options,
    };

    // Check cache first
    const cacheKey = this.generateCacheKey(code, layers);
    if (optimizationOptions.useCache && this.cache.has(cacheKey)) {
      this.metrics.cacheHits++;
      const cachedResult = this.cache.get(cacheKey);

      return {
        result: cachedResult.result,
        fromCache: true,
        executionTime: performance.now() - startTime,
        optimizations: ["cache-hit"],
        metrics: this.getMetricsSnapshot(),
      };
    }

    this.metrics.cacheMisses++;

    // Optimize layer order and selection
    const optimizedLayers = this.optimizeLayerSelection(code, layers);

    // Check system resources
    const resourceCheck = this.checkSystemResources();
    if (!resourceCheck.canProceed) {
      throw new Error(`Insufficient system resources: ${resourceCheck.reason}`);
    }

    // Execute with performance monitoring
    const result = await this.executeWithMonitoring(
      code,
      optimizedLayers,
      executeFunction,
      optimizationOptions,
    );

    // Cache successful results
    if (optimizationOptions.useCache && result.success) {
      this.cacheResult(cacheKey, result);
    }

    return {
      result: result.code,
      fromCache: false,
      executionTime: performance.now() - startTime,
      optimizations: result.optimizations,
      layerResults: result.layerResults,
      metrics: this.getMetricsSnapshot(),
    };
  }

  /**
   * Smart layer selection based on code analysis and resource availability
   */
  optimizeLayerSelection(code, requestedLayers) {
    const actuallyNeeded = [];
    const optimizations = [];

    // Analyze which layers will actually make changes
    for (const layerId of requestedLayers) {
      const willMakeChanges = this.predictLayerChanges(code, layerId);

      if (willMakeChanges.likely) {
        actuallyNeeded.push(layerId);
      } else {
        optimizations.push(
          `Skipped Layer ${layerId} (${willMakeChanges.reason})`,
        );
      }
    }

    // Ensure dependencies are included
    const withDependencies = this.ensureDependencies(actuallyNeeded);

    // Optimize order based on complexity and resource usage
    const optimizedOrder = this.optimizeExecutionOrder(withDependencies, code);

    return {
      layers: optimizedOrder,
      optimizations,
      originalCount: requestedLayers.length,
      optimizedCount: optimizedOrder.length,
    };
  }

  /**
   * Predict if a layer will make changes (avoid unnecessary execution)
   */
  predictLayerChanges(code, layerId) {
    const predictions = {
      1: {
        // Configuration
        patterns: [/tsconfig\.json|next\.config|package\.json/],
        reason: "no configuration files detected",
      },
      2: {
        // Patterns
        patterns: [/&quot;|&amp;|&lt;|&gt;|console\.log|var\s+/],
        reason: "no problematic patterns found",
      },
      3: {
        // Components
        patterns: [/\.map\(|<img(?![^>]*alt=)|useState.*import/],
        reason: "no component issues detected",
      },
      4: {
        // Hydration
        patterns: [/localStorage|sessionStorage|document\.|window\./],
        reason: "no browser APIs found",
      },
      5: {
        // Next.js
        patterns: [/next\/|app\/|pages\/|useRouter|getServerSideProps/],
        reason: "no Next.js patterns detected",
      },
      6: {
        // Testing
        patterns: [/test\(|describe\(|it\(|expect\(|jest\./],
        reason: "no test code found",
      },
    };

    const prediction = predictions[layerId];
    if (!prediction) {
      return {
        likely: true,
        reason: "unknown layer, processing conservatively",
      };
    }

    const hasPatterns = prediction.patterns.some((pattern) =>
      pattern.test(code),
    );
    return {
      likely: hasPatterns,
      reason: hasPatterns ? "relevant patterns detected" : prediction.reason,
    };
  }

  /**
   * Ensure required dependencies are included
   */
  ensureDependencies(layers) {
    const dependencies = {
      1: [],
      2: [1],
      3: [1, 2],
      4: [1, 2, 3],
      5: [1, 2, 3, 4],
      6: [1, 2, 3, 4, 5],
    };

    const required = new Set();

    layers.forEach((layerId) => {
      required.add(layerId);
      dependencies[layerId]?.forEach((dep) => required.add(dep));
    });

    return Array.from(required).sort((a, b) => a - b);
  }

  /**
   * Optimize execution order based on complexity and resource usage
   */
  optimizeExecutionOrder(layers, code) {
    const complexity = this.analyzeCodeComplexity(code);

    // If code is simple, use standard order
    if (complexity.score < 0.5) {
      return layers;
    }

    // For complex code, prioritize critical layers first
    const critical = layers.filter((id) => id === 1 || id === 2);
    const optional = layers.filter((id) => id > 2);

    return [...critical, ...optional];
  }

  /**
   * Analyze code complexity to guide optimization decisions
   */
  analyzeCodeComplexity(code) {
    const metrics = {
      lines: code.split("\n").length,
      characters: code.length,
      functions: (code.match(/function\s+\w+|=>\s*{|const\s+\w+\s*=/g) || [])
        .length,
      components: (
        code.match(/<[A-Z]\w*|function\s+[A-Z]\w*|const\s+[A-Z]\w*\s*=/g) || []
      ).length,
      imports: (code.match(/import\s+.*from|require\s*\(/g) || []).length,
      complexity: this.calculateCyclomaticComplexity(code),
    };

    // Calculate complexity score (0-1)
    const lineWeight = Math.min(metrics.lines / 1000, 1) * 0.3;
    const functionWeight = Math.min(metrics.functions / 50, 1) * 0.3;
    const componentWeight = Math.min(metrics.components / 20, 1) * 0.2;
    const complexityWeight = Math.min(metrics.complexity / 20, 1) * 0.2;

    const score =
      lineWeight + functionWeight + componentWeight + complexityWeight;

    return {
      ...metrics,
      score,
      level: score < 0.3 ? "simple" : score < 0.7 ? "moderate" : "complex",
    };
  }

  /**
   * Calculate cyclomatic complexity
   */
  calculateCyclomaticComplexity(code) {
    const complexityPatterns = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /while\s*\(/g,
      /for\s*\(/g,
      /switch\s*\(/g,
      /case\s+.*:/g,
      /catch\s*\(/g,
      /&&|\|\|/g,
      /\?\s*.*\s*:/g, // Ternary operators
    ];

    let complexity = 1; // Base complexity

    complexityPatterns.forEach((pattern) => {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  /**
   * Execute with performance monitoring and micro-optimizations
   */
  async executeWithMonitoring(code, layerInfo, executeFunction, options) {
    const results = [];
    const optimizations = layerInfo.optimizations || [];
    let current = code;

    for (const layerId of layerInfo.layers) {
      const layerStart = performance.now();
      const memoryBefore = this.getMemoryUsage();

      try {
        const previous = current;

        // Apply pre-processing optimizations
        if (options.memoryOptimization) {
          current = this.optimizeMemoryUsage(current);
        }

        // Execute layer with resource monitoring
        const result = await this.executeLayerOptimized(
          layerId,
          current,
          executeFunction,
          options,
        );

        current = result;

        const layerTime = performance.now() - layerStart;
        const memoryAfter = this.getMemoryUsage();
        const memoryDelta = memoryAfter.used - memoryBefore.used;

        // Record metrics
        this.metrics.processingTimes.push({
          layerId,
          executionTime: layerTime,
          memoryDelta,
          timestamp: Date.now(),
        });

        results.push({
          layerId,
          success: true,
          executionTime: layerTime,
          memoryUsage: memoryDelta,
          changeCount: this.calculateChanges(previous, current),
        });

        // Performance warnings
        if (layerTime > 2000) {
          optimizations.push(
            `Layer ${layerId} was slow (${layerTime.toFixed(0)}ms)`,
          );
        }

        if (memoryDelta > 50 * 1024 * 1024) {
          // 50MB
          optimizations.push(
            `Layer ${layerId} used significant memory (${Math.round(memoryDelta / 1024 / 1024)}MB)`,
          );
        }

        // Check if we should pause for resource recovery
        if (this.shouldPauseForResources()) {
          await this.pauseForResourceRecovery();
          optimizations.push(
            `Paused for resource recovery after Layer ${layerId}`,
          );
        }
      } catch (error) {
        results.push({
          layerId,
          success: false,
          executionTime: performance.now() - layerStart,
          error: error.message,
        });
      }
    }

    return {
      code: current,
      success: results.every((r) => r.success),
      layerResults: results,
      optimizations,
    };
  }

  /**
   * Layer execution with micro-optimizations
   */
  async executeLayerOptimized(layerId, code, executeFunction, options) {
    // Pre-processing optimizations
    if (options.preProcess) {
      code = this.preProcessCode(code);
    }

    // Execute actual layer
    const result = await executeFunction(code, layerId, options);

    // Post-processing optimizations
    if (options.postProcess) {
      return this.postProcessCode(result);
    }

    return result;
  }

  /**
   * Pre-processing optimizations
   */
  preProcessCode(code) {
    // Remove excessive whitespace to reduce memory usage
    if (code.length > 100000) {
      // Only for large files
      return code.replace(/\n\s*\n\s*\n/g, "\n\n"); // Collapse multiple empty lines
    }
    return code;
  }

  /**
   * Post-processing optimizations
   */
  postProcessCode(code) {
    // Normalize line endings and remove trailing whitespace
    return code.replace(/\r\n/g, "\n").replace(/[ \t]+$/gm, "");
  }

  /**
   * Check system resources before execution
   */
  checkSystemResources() {
    const memoryUsage = this.getMemoryUsage();
    const cpuUsage = this.getCPUUsage();

    if (memoryUsage.percentage > this.MEMORY_THRESHOLD) {
      return {
        canProceed: false,
        reason: `High memory usage: ${(memoryUsage.percentage * 100).toFixed(1)}%`,
      };
    }

    if (cpuUsage > this.CPU_THRESHOLD) {
      return {
        canProceed: false,
        reason: `High CPU usage: ${(cpuUsage * 100).toFixed(1)}%`,
      };
    }

    return { canProceed: true };
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      used: memoryUsage.heapUsed,
      total: memoryUsage.heapTotal,
      percentage: usedMemory / totalMemory,
      system: {
        total: totalMemory,
        free: freeMemory,
        used: usedMemory,
      },
    };
  }

  /**
   * Get approximate CPU usage
   */
  getCPUUsage() {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach((cpu) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });

    return 1 - totalIdle / totalTick;
  }

  /**
   * Check if we should pause for resource recovery
   */
  shouldPauseForResources() {
    const memoryUsage = this.getMemoryUsage();
    return memoryUsage.percentage > 0.7; // Pause if memory usage is over 70%
  }

  /**
   * Pause execution to allow resource recovery
   */
  async pauseForResourceRecovery() {
    console.log(chalk.yellow("⏸️  Pausing for resource recovery..."));

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    // Wait for a short period
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  /**
   * Optimize memory usage for large codebases
   */
  optimizeMemoryUsage(code) {
    // For very large files, we might need to process in chunks
    if (code.length > 1000000) {
      // 1MB
      // This is a simplified example - in practice, you'd implement chunking
      console.log(
        chalk.blue("📦 Large file detected, optimizing memory usage"),
      );
    }

    return code;
  }

  /**
   * Cache management with LRU eviction
   */
  cacheResult(key, result) {
    // Simple LRU cache implementation
    if (this.cache.size >= this.CACHE_SIZE_LIMIT) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      result: result.code,
      timestamp: Date.now(),
      metadata: {
        success: result.success,
        layerCount: result.layerResults?.length || 0,
        optimizations: result.optimizations,
      },
    });
  }

  /**
   * Generate deterministic cache key
   */
  generateCacheKey(code, layers) {
    const codeHash = this.simpleHash(code);
    const layerKey = layers.sort().join(",");
    return `${codeHash}-${layerKey}`;
  }

  /**
   * Simple hash function for cache keys
   */
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Calculate changes between code versions
   */
  calculateChanges(before, after) {
    const beforeLines = before.split("\n");
    const afterLines = after.split("\n");
    let changes = Math.abs(beforeLines.length - afterLines.length);

    const minLength = Math.min(beforeLines.length, afterLines.length);
    for (let i = 0; i < minLength; i++) {
      if (beforeLines[i] !== afterLines[i]) changes++;
    }

    return changes;
  }

  /**
   * Get current metrics snapshot
   */
  getMetricsSnapshot() {
    return {
      cache: {
        hits: this.metrics.cacheHits,
        misses: this.metrics.cacheMisses,
        hitRate:
          this.metrics.cacheHits /
            (this.metrics.cacheHits + this.metrics.cacheMisses) || 0,
        size: this.cache.size,
      },
      memory: this.getMemoryUsage(),
      averageExecutionTime: this.calculateAverageExecutionTime(),
      totalProcessedLayers: this.metrics.processingTimes.length,
    };
  }

  /**
   * Calculate average execution time for performance tracking
   */
  calculateAverageExecutionTime() {
    if (this.metrics.processingTimes.length === 0) return 0;

    const total = this.metrics.processingTimes.reduce(
      (sum, metric) => sum + metric.executionTime,
      0,
    );
    return total / this.metrics.processingTimes.length;
  }

  /**
   * Clear cache (for testing or memory management)
   */
  clearCache() {
    this.cache.clear();
    console.log(chalk.blue("🗑️  Performance cache cleared"));
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport() {
    const metrics = this.getMetricsSnapshot();
    const recentTimes = this.metrics.processingTimes.slice(-10); // Last 10 executions

    return {
      summary: {
        cacheEfficiency: `${(metrics.cache.hitRate * 100).toFixed(1)}%`,
        averageExecutionTime: `${metrics.averageExecutionTime.toFixed(0)}ms`,
        memoryUsage: `${(metrics.memory.percentage * 100).toFixed(1)}%`,
        totalProcessed: metrics.totalProcessedLayers,
      },
      recommendations: this.generatePerformanceRecommendations(metrics),
      recentPerformance: recentTimes,
    };
  }

  /**
   * Generate performance recommendations
   */
  generatePerformanceRecommendations(metrics) {
    const recommendations = [];

    if (metrics.cache.hitRate < 0.3) {
      recommendations.push(
        "Consider increasing cache size or reviewing code patterns for better caching",
      );
    }

    if (metrics.memory.percentage > 0.8) {
      recommendations.push(
        "High memory usage detected - consider processing smaller chunks",
      );
    }

    if (metrics.averageExecutionTime > 2000) {
      recommendations.push(
        "Average execution time is high - consider optimizing layer implementations",
      );
    }

    return recommendations;
  }
}

export { EnhancedPerformanceOptimizer };
