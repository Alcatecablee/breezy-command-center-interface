/**
 * Comprehensive pipeline tracking system
 * Maintains complete state history for debugging and rollback
 */
class TransformationPipeline {
  constructor(initialCode) {
    this.states = [];
    this.metadata = [];
    this.initialCode = initialCode;

    this.states.push({
      step: 0,
      layerId: null,
      code: initialCode,
      timestamp: Date.now(),
      description: "Initial state",
    });
  }

  /**
   * Execute complete pipeline with full state tracking
   */
  async execute(layers, options = {}) {
    let current = this.initialCode;

    for (let i = 0; i < layers.length; i++) {
      const layerId = layers[i];
      const startTime = performance.now();
      const previous = current;

      try {
        // Execute layer transformation
        current = await this.executeLayer(layerId, current, options);

        // Record successful state
        this.recordState({
          step: i + 1,
          layerId,
          code: current,
          timestamp: Date.now(),
          description: `After Layer ${layerId}`,
          success: true,
          executionTime: performance.now() - startTime,
          changeCount: this.calculateChanges(previous, current),
        });

        if (options.verbose) {
          console.log(`✅ Layer ${layerId} completed successfully`);
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
          executionTime: performance.now() - startTime,
        });

        console.error(`❌ Layer ${layerId} failed:`, error.message);

        // Continue with previous code
        current = previous;
      }
    }

    return this.generateResult(current);
  }

  /**
   * Record state at each pipeline step
   */
  recordState(state) {
    this.states.push(state);

    if (state.layerId) {
      this.metadata.push({
        layerId: state.layerId,
        success: state.success || false,
        executionTime: state.executionTime || 0,
        changeCount: state.changeCount || 0,
        error: state.error,
        improvements: state.success ? this.detectImprovements(state) : [],
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
   * Rollback to specific step
   */
  rollbackTo(step) {
    const state = this.getStateAt(step);
    if (!state) {
      throw new Error(`Invalid step: ${step}`);
    }

    console.log(`🔄 Rolling back to step ${step}: ${state.description}`);
    return state.code;
  }

  /**
   * Generate comprehensive pipeline result
   */
  generateResult(finalCode) {
    return {
      finalCode,
      states: this.states,
      metadata: this.metadata,
      summary: {
        totalSteps: this.states.length - 1,
        successfulLayers: this.metadata.filter((m) => m.success).length,
        failedLayers: this.metadata.filter((m) => !m.success).length,
        totalExecutionTime: this.metadata.reduce(
          (sum, m) => sum + m.executionTime,
          0,
        ),
        totalChanges: this.metadata.reduce((sum, m) => sum + m.changeCount, 0),
      },
    };
  }

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

  detectImprovements(state) {
    return ["Transformation applied successfully"];
  }

  getState() {
    return {
      states: this.states,
      metadata: this.metadata,
    };
  }
}

export { TransformationPipeline };
