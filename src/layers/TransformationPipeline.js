/**
 * Comprehensive Pipeline Tracking System
 * Maintains complete state history for debugging and rollback
 * Tracks every transformation step with metadata
 */
class TransformationPipeline {
  constructor(initialCode) {
    this.states = [];
    this.metadata = [];
    this.initialCode = initialCode;
    this.currentIndex = 0;

    // Record initial state
    this.recordState({
      step: 0,
      layerId: null,
      code: initialCode,
      timestamp: Date.now(),
      description: "Initial state",
      success: true,
      hash: this.hashCode(initialCode),
    });
  }

  /**
   * Execute complete pipeline with full state tracking
   */
  async execute(layers, executor, options = {}) {
    let current = this.initialCode;
    const startTime = performance.now();

    console.log(
      `🔄 Starting transformation pipeline with ${layers.length} layers`,
    );

    for (let i = 0; i < layers.length; i++) {
      const layerId = layers[i];
      const layerStartTime = performance.now();
      const previous = current;

      try {
        // Execute layer transformation
        current = await executor.executeLayer(layerId, current, options);

        // Record successful state
        this.recordState({
          step: i + 1,
          layerId,
          code: current,
          timestamp: Date.now(),
          description: `After Layer ${layerId}`,
          success: true,
          executionTime: performance.now() - layerStartTime,
          changeCount: this.calculateChanges(previous, current),
          hash: this.hashCode(current),
          improvements: this.detectImprovements(previous, current, layerId),
        });

        this.currentIndex = this.states.length - 1;

        if (options.verbose) {
          console.log(`Layer ${layerId} completed successfully`);
        }
      } catch (error) {
        // Record failed state (keep previous code)
        this.recordState({
          step: i + 1,
          layerId,
          code: previous, // Keep previous safe state
          timestamp: Date.now(),
          description: `Layer ${layerId} failed`,
          success: false,
          error: error.message,
          executionTime: performance.now() - layerStartTime,
          hash: this.hashCode(previous),
        });

        console.error(`Layer ${layerId} failed: ${error.message}`);

        // Continue with previous code
        current = previous;
      }
    }

    const totalTime = performance.now() - startTime;

    return {
      finalCode: current,
      states: this.states,
      metadata: this.metadata,
      totalExecutionTime: totalTime,
      summary: this.generateSummary(),
    };
  }

  /**
   * Record state at each pipeline step
   */
  recordState(state) {
    this.states.push({
      ...state,
      index: this.states.length,
      parentIndex: this.states.length > 0 ? this.states.length - 1 : null,
    });

    if (state.layerId) {
      this.metadata.push({
        layerId: state.layerId,
        success: state.success || false,
        executionTime: state.executionTime || 0,
        changeCount: state.changeCount || 0,
        error: state.error,
        improvements: state.improvements || [],
        hash: state.hash,
        timestamp: state.timestamp,
      });
    }
  }

  /**
   * Get state at specific step for debugging
   */
  getStateAt(step) {
    return this.states[step] || null;
  }

  /**
   * Get current state
   */
  getCurrentState() {
    return (
      this.states[this.currentIndex] || this.states[this.states.length - 1]
    );
  }

  /**
   * Rollback to specific step
   */
  rollbackTo(step) {
    const state = this.getStateAt(step);
    if (!state) {
      throw new Error(`Invalid step: ${step}`);
    }

    console.log(`🔄 Rolling back to step ${step}: ${state.description}`);
    this.currentIndex = step;

    // Record rollback action
    this.recordState({
      step: this.states.length,
      layerId: null,
      code: state.code,
      timestamp: Date.now(),
      description: `Rollback to step ${step}`,
      success: true,
      rollbackTo: step,
      hash: state.hash,
    });

    return state.code;
  }

  /**
   * Get differences between two states
   */
  getDiff(fromStep, toStep) {
    const fromState = this.getStateAt(fromStep);
    const toState = this.getStateAt(toStep);

    if (!fromState || !toState) {
      throw new Error("Invalid step numbers for diff");
    }

    return {
      from: {
        step: fromStep,
        description: fromState.description,
        hash: fromState.hash,
      },
      to: {
        step: toStep,
        description: toState.description,
        hash: toState.hash,
      },
      changes: this.calculateDetailedChanges(fromState.code, toState.code),
      summary: `${this.calculateChanges(fromState.code, toState.code)} lines changed`,
    };
  }

  /**
   * Find states where specific changes occurred
   */
  findStatesWithChanges(searchPattern) {
    const matches = [];

    for (let i = 1; i < this.states.length; i++) {
      const current = this.states[i];
      const previous = this.states[i - 1];

      if (
        current.code.includes(searchPattern) &&
        !previous.code.includes(searchPattern)
      ) {
        matches.push({
          step: i,
          layerId: current.layerId,
          description: `${searchPattern} added in ${current.description}`,
          state: current,
        });
      } else if (
        !current.code.includes(searchPattern) &&
        previous.code.includes(searchPattern)
      ) {
        matches.push({
          step: i,
          layerId: current.layerId,
          description: `${searchPattern} removed in ${current.description}`,
          state: current,
        });
      }
    }

    return matches;
  }

  /**
   * Get performance metrics for the pipeline
   */
  getPerformanceMetrics() {
    if (this.metadata.length === 0) {
      return {
        totalExecutionTime: 0,
        averageLayerTime: 0,
        successfulLayers: 0,
        failedLayers: 0,
        slowestLayer: null,
        layerTimes: [],
        stateCount: this.states.length,
        totalChanges: 0,
      };
    }

    const totalTime = this.metadata.reduce(
      (sum, m) => sum + m.executionTime,
      0,
    );
    const successfulLayers = this.metadata.filter((m) => m.success).length;
    const failedLayers = this.metadata.filter((m) => !m.success).length;

    const layerTimes = this.metadata.map((m) => ({
      layerId: m.layerId,
      executionTime: m.executionTime,
      success: m.success,
    }));

    const slowestLayer =
      layerTimes.length > 0
        ? layerTimes.reduce((slowest, current) =>
            current.executionTime > slowest.executionTime ? current : slowest,
          )
        : null;

    return {
      totalExecutionTime: totalTime,
      averageLayerTime: totalTime / this.metadata.length,
      successfulLayers,
      failedLayers,
      slowestLayer,
      layerTimes,
      stateCount: this.states.length,
      totalChanges: this.metadata.reduce((sum, m) => sum + m.changeCount, 0),
    };
  }

  /**
   * Generate comprehensive pipeline summary
   */
  generateSummary() {
    const metrics = this.getPerformanceMetrics();
    const finalState = this.getCurrentState();
    const initialState = this.states[0];

    return {
      pipeline: {
        totalSteps: this.states.length - 1,
        successfulLayers: metrics.successfulLayers,
        failedLayers: metrics.failedLayers,
        totalExecutionTime: metrics.totalExecutionTime,
        totalChanges: metrics.totalChanges,
      },
      transformation: {
        initialHash: initialState.hash,
        finalHash: finalState.hash,
        codeChanged: initialState.hash !== finalState.hash,
        sizeChange: finalState.code.length - initialState.code.length,
        changeRatio:
          this.calculateChanges(initialState.code, finalState.code) /
          Math.max(initialState.code.split("\n").length, 1),
      },
      recommendations: this.generateRecommendations(),
    };
  }

  /**
   * Generate recommendations based on pipeline execution
   */
  generateRecommendations() {
    const recommendations = [];
    const metrics = this.getPerformanceMetrics();

    // Performance recommendations
    if (metrics.slowestLayer && metrics.slowestLayer.executionTime > 5000) {
      recommendations.push({
        type: "performance",
        priority: "medium",
        message: `Layer ${metrics.slowestLayer.layerId} was slow (${metrics.slowestLayer.executionTime}ms). Consider optimization.`,
      });
    }

    // Failure recommendations
    if (metrics.failedLayers > 0) {
      recommendations.push({
        type: "reliability",
        priority: "high",
        message: `${metrics.failedLayers} layers failed. Review error messages and consider running layers individually.`,
      });
    }

    // Change recommendations
    if (metrics.totalChanges === 0) {
      recommendations.push({
        type: "optimization",
        priority: "low",
        message:
          "No changes were made. Consider analyzing code first to determine if transformations are needed.",
      });
    } else if (metrics.totalChanges > 100) {
      recommendations.push({
        type: "validation",
        priority: "medium",
        message: `Many changes were made (${metrics.totalChanges}). Consider reviewing changes carefully before deployment.`,
      });
    }

    return recommendations;
  }

  /**
   * Export pipeline state for debugging
   */
  exportDebugInfo() {
    return {
      pipeline: {
        states: this.states.map((state) => ({
          step: state.step,
          layerId: state.layerId,
          description: state.description,
          success: state.success,
          timestamp: new Date(state.timestamp).toISOString(),
          changeCount: state.changeCount,
          hash: state.hash,
        })),
        metadata: this.metadata,
        summary: this.generateSummary(),
      },
      diagnostics: {
        stateCount: this.states.length,
        memoryUsage: this.estimateMemoryUsage(),
        codeSize: this.getCurrentState().code.length,
        performanceMetrics: this.getPerformanceMetrics(),
      },
    };
  }

  /**
   * Calculate changes between two code versions
   */
  calculateChanges(before, after) {
    if (before === after) return 0;

    const beforeLines = before.split("\n").filter((line) => line.trim());
    const afterLines = after.split("\n").filter((line) => line.trim());

    let changes = Math.abs(beforeLines.length - afterLines.length);
    const minLength = Math.min(beforeLines.length, afterLines.length);

    for (let i = 0; i < minLength; i++) {
      if (beforeLines[i].trim() !== afterLines[i].trim()) {
        changes++;
      }
    }

    return changes;
  }

  /**
   * Calculate detailed changes for diff view
   */
  calculateDetailedChanges(before, after) {
    const beforeLines = before.split("\n");
    const afterLines = after.split("\n");
    const changes = [];

    let i = 0,
      j = 0;

    while (i < beforeLines.length || j < afterLines.length) {
      if (i >= beforeLines.length) {
        changes.push({
          type: "added",
          lineNumber: j + 1,
          content: afterLines[j],
        });
        j++;
      } else if (j >= afterLines.length) {
        changes.push({
          type: "removed",
          lineNumber: i + 1,
          content: beforeLines[i],
        });
        i++;
      } else if (beforeLines[i] === afterLines[j]) {
        i++;
        j++;
      } else {
        changes.push({
          type: "modified",
          lineNumber: i + 1,
          before: beforeLines[i],
          after: afterLines[j],
        });
        i++;
        j++;
      }
    }

    return changes;
  }

  /**
   * Detect improvements between code versions
   */
  detectImprovements(before, after, layerId) {
    const improvements = [];

    // Layer-specific improvement detection
    switch (layerId) {
      case 1:
        if (
          before.includes('"target": "es5"') &&
          after.includes('"target": "es2022"')
        ) {
          improvements.push("Upgraded TypeScript target to ES2022");
        }
        break;

      case 2:
        const entityBefore = (before.match(/&quot;|&amp;|&lt;|&gt;/g) || [])
          .length;
        const entityAfter = (after.match(/&quot;|&amp;|&lt;|&gt;/g) || [])
          .length;
        if (entityBefore > entityAfter) {
          improvements.push(
            `Fixed ${entityBefore - entityAfter} HTML entity issues`,
          );
        }
        break;

      case 3:
        const keysBefore = (before.match(/key=/g) || []).length;
        const keysAfter = (after.match(/key=/g) || []).length;
        if (keysAfter > keysBefore) {
          improvements.push(
            `Added ${keysAfter - keysBefore} missing key props`,
          );
        }
        break;

      case 4:
        const guardsBefore = (before.match(/typeof window/g) || []).length;
        const guardsAfter = (after.match(/typeof window/g) || []).length;
        if (guardsAfter > guardsBefore) {
          improvements.push(`Added ${guardsAfter - guardsBefore} SSR guards`);
        }
        break;
    }

    return improvements;
  }

  /**
   * Generate hash for code content
   */
  hashCode(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Estimate memory usage of pipeline state
   */
  estimateMemoryUsage() {
    const totalCodeSize = this.states.reduce(
      (sum, state) => sum + state.code.length,
      0,
    );
    const metadataSize = JSON.stringify(this.metadata).length;

    return {
      totalCodeSize,
      metadataSize,
      stateCount: this.states.length,
      estimatedBytes: totalCodeSize * 2 + metadataSize, // Rough estimate
    };
  }

  /**
   * Get current pipeline state for external use
   */
  getState() {
    return {
      currentIndex: this.currentIndex,
      stateCount: this.states.length,
      currentCode: this.getCurrentState().code,
      summary: this.generateSummary(),
    };
  }
}

module.exports = { TransformationPipeline };
