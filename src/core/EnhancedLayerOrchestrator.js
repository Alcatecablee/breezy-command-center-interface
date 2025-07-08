import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { performance } from "perf_hooks";
import { parse } from "@babel/parser";
import chalk from "chalk";
import { TransformationValidator } from "../layers/TransformationValidator.js";
import { LayerDependencyManager } from "../layers/LayerDependencyManager.js";

/**
 * Enhanced Layer Orchestrator following comprehensive orchestration patterns
 * Implements all patterns from ORCHESTRATION-IMPLEMENTATION.md
 */
class EnhancedLayerOrchestrator {
  constructor(options = {}) {
    this.options = {
      verbose: false,
      dryRun: false,
      useCache: true,
      skipUnnecessary: true,
      preProcess: true,
      postProcess: true,
      ...options,
    };

    this.states = [];
    this.metadata = [];
    this.cache = new Map();
    this.CACHE_SIZE_LIMIT = 100;

    // Layer execution order and configuration
    this.LAYER_EXECUTION_ORDER = [
      {
        id: 1,
        name: "Configuration",
        description: "Foundation setup",
        file: "fix-layer-1-config.js",
        supportsAST: false,
        critical: true,
        timeout: 30000,
      },
      {
        id: 2,
        name: "Entity Cleanup",
        description: "Preprocessing patterns",
        file: "fix-layer-2-patterns.js",
        supportsAST: false,
        critical: false,
        timeout: 45000,
      },
      {
        id: 3,
        name: "Components",
        description: "React/TS specific fixes",
        file: "fix-layer-3-components.js",
        supportsAST: true,
        critical: false,
        timeout: 60000,
      },
      {
        id: 4,
        name: "Hydration",
        description: "Runtime safety guards",
        file: "fix-layer-4-hydration.js",
        supportsAST: true,
        critical: false,
        timeout: 45000,
      },
      {
        id: 5,
        name: "Next.js",
        description: "Next.js optimizations",
        file: "fix-layer-5-nextjs.js",
        supportsAST: true,
        critical: false,
        timeout: 60000,
      },
      {
        id: 6,
        name: "Testing",
        description: "Quality & performance",
        file: "fix-layer-6-testing.js",
        supportsAST: false,
        critical: false,
        timeout: 75000,
      },
    ];
  }

  /**
   * Main orchestration entry point - executes layers with comprehensive safety
   * Implements the Safe Layer Execution Pattern
   */
  async executeLayers(code, enabledLayers = [1, 2, 3, 4], options = {}) {
    const startTime = performance.now();
    const mergedOptions = { ...this.options, ...options };

    this.log(
      "🚀 Starting Enhanced NeuroLint Layer Orchestration...",
      mergedOptions.verbose,
    );

    try {
      // Step 1: Validate and correct layer dependencies
      const layerValidation =
        LayerDependencyManager.validateAndCorrectLayers(enabledLayers);
      const correctedLayers = layerValidation.correctedLayers;

      if (layerValidation.warnings.length > 0) {
        layerValidation.warnings.forEach((warning) =>
          this.log(`⚠️  ${warning}`, mergedOptions.verbose),
        );
      }

      // Step 2: Smart layer selection optimization
      if (mergedOptions.skipUnnecessary) {
        const optimizedLayers = this.optimizeLayerSelection(
          code,
          correctedLayers,
        );
        this.log(
          `🎯 Optimized layers: ${optimizedLayers.join(",")} (from ${correctedLayers.join(",")})`,
          mergedOptions.verbose,
        );
      }

      // Step 3: Check cache
      const cacheKey = this.generateCacheKey(code, correctedLayers);
      if (mergedOptions.useCache && this.cache.has(cacheKey)) {
        this.log(
          "⚡ Cache hit - returning cached result",
          mergedOptions.verbose,
        );
        return {
          finalCode: this.cache.get(cacheKey),
          fromCache: true,
          executionTime: performance.now() - startTime,
          layers: [],
          summary: { cached: true },
        };
      }

      // Step 4: Execute layers with comprehensive safety
      const result = await this.executeLayersWithSafety(
        code,
        correctedLayers,
        mergedOptions,
      );

      // Step 5: Cache successful results
      if (mergedOptions.useCache && result.success) {
        this.cacheResult(cacheKey, result.finalCode);
      }

      return {
        ...result,
        executionTime: performance.now() - startTime,
        optimizations: result.optimizations || [],
      };
    } catch (error) {
      this.log(`❌ Orchestration failed: ${error.message}`, true);
      return {
        finalCode: code,
        success: false,
        error: error.message,
        executionTime: performance.now() - startTime,
        layers: [],
        summary: { failed: true, error: error.message },
      };
    }
  }

  /**
   * Execute layers with comprehensive safety and rollback capability
   * Implements the Safe Layer Execution Pattern from the orchestration guide
   */
  async executeLayersWithSafety(code, enabledLayers, options) {
    let current = code;
    const results = [];
    const states = [
      { step: 0, code, description: "Initial state", timestamp: Date.now() },
    ];
    const optimizations = [];

    for (let i = 0; i < enabledLayers.length; i++) {
      const layerId = enabledLayers[i];
      const layerConfig = this.getLayerConfig(layerId);
      const previous = current;
      const startTime = performance.now();

      this.log(
        `🔧 Executing Layer ${layerId} (${layerConfig.name})...`,
        options.verbose,
      );

      try {
        // Skip if layer won't make changes (optimization)
        if (
          options.skipUnnecessary &&
          !this.layerWillMakeChanges(current, layerId)
        ) {
          optimizations.push(`Skipped Layer ${layerId} (no changes needed)`);
          this.log(
            `⏭️  Skipped Layer ${layerId} - no changes needed`,
            options.verbose,
          );
          continue;
        }

        // Apply transformation with fallback strategy
        const transformed = await this.transformWithFallback(
          current,
          layerConfig,
          options,
        );

        // Validate transformation safety
        const validation = TransformationValidator.validateTransformation(
          previous,
          transformed,
        );

        if (validation.shouldRevert) {
          this.log(
            `⚠️  Reverting Layer ${layerId}: ${validation.reason}`,
            true,
          );
          current = previous; // Rollback to safe state

          results.push({
            layerId,
            success: false,
            code: previous,
            executionTime: performance.now() - startTime,
            changeCount: 0,
            revertReason: validation.reason,
          });
        } else {
          current = transformed; // Accept changes
          const changeCount = this.calculateChanges(previous, transformed);

          states.push({
            step: i + 1,
            layerId,
            code: current,
            description: `After Layer ${layerId}`,
            timestamp: Date.now(),
            success: true,
            changeCount,
          });

          results.push({
            layerId,
            success: true,
            code: current,
            executionTime: performance.now() - startTime,
            changeCount,
            improvements: this.detectImprovements(previous, transformed),
          });

          this.log(
            `✅ Layer ${layerId} completed successfully (${changeCount} changes)`,
            options.verbose,
          );
        }
      } catch (error) {
        const errorInfo = this.categorizeError(error, layerId, current);
        this.log(`❌ Layer ${layerId} failed: ${errorInfo.message}`, true);

        results.push({
          layerId,
          success: false,
          code: previous, // Keep previous safe state
          executionTime: performance.now() - startTime,
          changeCount: 0,
          error: errorInfo.message,
          errorCategory: errorInfo.category,
          suggestion: errorInfo.suggestion,
          recoveryOptions: errorInfo.recoveryOptions,
        });

        // Continue with previous code for non-critical layers
        if (!layerConfig.critical) {
          current = previous;
        } else {
          throw new Error(
            `Critical layer ${layerId} failed: ${errorInfo.message}`,
          );
        }
      }
    }

    return {
      finalCode: current,
      success: results.every((r) => r.success),
      results,
      states,
      optimizations,
      summary: this.generateExecutionSummary(results),
    };
  }

  /**
   * Smart transformation strategy with AST preference and regex fallback
   * Implements AST vs Regex Fallback Strategy
   */
  async transformWithFallback(code, layerConfig, options) {
    // Layers 1-2: Always use regex (config files, simple patterns)
    if (!layerConfig.supportsAST) {
      this.log(
        `📝 Using regex transformation for ${layerConfig.name}`,
        options.verbose,
      );
      return await this.executeLayerScript(layerConfig.id, code, options);
    }

    // Layers 3-6: Try AST first, fallback to regex
    try {
      this.log(
        `🌳 Attempting AST transformation for ${layerConfig.name}`,
        options.verbose,
      );
      return await this.transformWithAST(code, layerConfig, options);
    } catch (astError) {
      this.log(
        `⚠️  AST failed for ${layerConfig.name}, using regex fallback: ${astError.message}`,
        options.verbose,
      );

      // AST failed, use regex-based transformation
      return await this.executeLayerScript(layerConfig.id, code, options);
    }
  }

  /**
   * AST transformation wrapper with error handling
   */
  async transformWithAST(code, layerConfig, options) {
    try {
      // Parse code to AST
      const ast = parse(code, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
        allowImportExportEverywhere: true,
        strictMode: false,
      });

      if (!ast) {
        throw new Error("Failed to parse code to AST");
      }

      // For now, fallback to script execution but with AST validation
      // In a full implementation, this would apply AST transformations
      const result = await this.executeLayerScript(
        layerConfig.id,
        code,
        options,
      );

      // Validate the result can still be parsed
      parse(result, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
        allowImportExportEverywhere: true,
        strictMode: false,
      });

      return result;
    } catch (error) {
      throw new Error(`AST transformation failed: ${error.message}`);
    }
  }

  /**
   * Execute layer script with proper error handling and timeouts
   */
  async executeLayerScript(layerId, code, options) {
    const layerConfig = this.getLayerConfig(layerId);
    const scriptPath = path.resolve(layerConfig.file);

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Layer script not found: ${scriptPath}`);
    }

    return new Promise((resolve, reject) => {
      // Create temporary input file
      const tempInputFile = path.join(
        process.cwd(),
        `.neurolint-temp-input-${layerId}-${Date.now()}.txt`,
      );
      fs.writeFileSync(tempInputFile, code);

      const timeout = setTimeout(() => {
        reject(
          new Error(
            `Layer ${layerId} timed out after ${layerConfig.timeout}ms`,
          ),
        );
      }, layerConfig.timeout);

      const child = spawn("node", [scriptPath], {
        stdio: ["pipe", "pipe", "pipe"],
        env: { ...process.env, NEUROLINT_INPUT_FILE: tempInputFile },
      });

      let stdout = "";
      let stderr = "";

      child.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      child.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      child.on("close", (code) => {
        clearTimeout(timeout);

        // Cleanup temp file
        if (fs.existsSync(tempInputFile)) {
          fs.unlinkSync(tempInputFile);
        }

        if (code === 0) {
          // Read the transformed code (layers should write to stdout or modify input)
          if (fs.existsSync(tempInputFile + ".output")) {
            const result = fs.readFileSync(tempInputFile + ".output", "utf8");
            fs.unlinkSync(tempInputFile + ".output");
            resolve(result);
          } else {
            // Use stdout as result
            resolve(stdout || code);
          }
        } else {
          reject(
            new Error(
              `Layer ${layerId} failed with exit code ${code}: ${stderr}`,
            ),
          );
        }
      });

      child.on("error", (error) => {
        clearTimeout(timeout);
        if (fs.existsSync(tempInputFile)) {
          fs.unlinkSync(tempInputFile);
        }
        reject(error);
      });
    });
  }

  /**
   * Categorize errors for appropriate handling and user feedback
   * Implements Error Recovery and Reporting pattern
   */
  categorizeError(error, layerId, code) {
    const errorMessage = error.message || error.toString();

    // Syntax errors
    if (
      error.name === "SyntaxError" ||
      errorMessage.includes("Unexpected token")
    ) {
      return {
        category: "syntax",
        message: "Code syntax prevented transformation",
        suggestion: "Fix syntax errors before running NeuroLint",
        recoveryOptions: [
          "Run syntax validation first",
          "Use a code formatter",
          "Check for missing brackets or semicolons",
        ],
        severity: "high",
      };
    }

    // AST parsing errors
    if (errorMessage.includes("AST") || errorMessage.includes("parse")) {
      return {
        category: "parsing",
        message: "Complex code structure not supported by AST parser",
        suggestion:
          "Try running with regex fallback or simplify code structure",
        recoveryOptions: [
          "Disable AST transformations",
          "Run individual layers",
          "Simplify complex expressions",
        ],
        severity: "medium",
      };
    }

    // File system errors
    if (
      errorMessage.includes("ENOENT") ||
      errorMessage.includes("permission")
    ) {
      return {
        category: "filesystem",
        message: "File system access error",
        suggestion: "Check file permissions and paths",
        recoveryOptions: [
          "Verify file exists",
          "Check write permissions",
          "Run with elevated privileges if needed",
        ],
        severity: "high",
      };
    }

    // Layer-specific errors
    const layerSpecificError = this.getLayerSpecificError(
      layerId,
      errorMessage,
    );
    if (layerSpecificError) {
      return layerSpecificError;
    }

    // Generic errors
    return {
      category: "unknown",
      message: `Unexpected error in Layer ${layerId}`,
      suggestion: "Please report this issue with your code sample",
      recoveryOptions: [
        "Try running other layers individually",
        "Check console for additional details",
        "Report issue with minimal reproduction case",
      ],
      severity: "medium",
    };
  }

  /**
   * Handle layer-specific error patterns
   */
  getLayerSpecificError(layerId, errorMessage) {
    const layerConfig = this.getLayerConfig(layerId);

    switch (layerId) {
      case 1: // Configuration layer
        if (errorMessage.includes("JSON")) {
          return {
            category: "config",
            message: "Invalid JSON in configuration file",
            suggestion: "Validate JSON syntax in config files",
            recoveryOptions: [
              "Use JSON validator",
              "Check for trailing commas",
            ],
            severity: "high",
          };
        }
        break;

      case 2: // Pattern layer
        if (errorMessage.includes("replace")) {
          return {
            category: "pattern",
            message: "Pattern replacement failed",
            suggestion: "Some patterns may conflict with your code structure",
            recoveryOptions: [
              "Skip pattern layer",
              "Review conflicting patterns",
            ],
            severity: "low",
          };
        }
        break;

      case 3: // Component layer
        if (errorMessage.includes("JSX")) {
          return {
            category: "component",
            message: "JSX transformation error",
            suggestion: "Complex JSX structures may need manual fixing",
            recoveryOptions: ["Simplify JSX", "Use manual key addition"],
            severity: "medium",
          };
        }
        break;

      case 4: // Hydration layer
        if (
          errorMessage.includes("localStorage") ||
          errorMessage.includes("window")
        ) {
          return {
            category: "hydration",
            message: "Browser API protection failed",
            suggestion: "Manual SSR guards may be needed for complex cases",
            recoveryOptions: [
              "Add manual typeof window checks",
              "Use useEffect hooks",
            ],
            severity: "medium",
          };
        }
        break;
    }

    return null;
  }

  /**
   * Performance optimization: predict if a layer will make changes
   */
  layerWillMakeChanges(code, layerId) {
    switch (layerId) {
      case 1: // Config
        return (
          code.includes("tsconfig") ||
          code.includes("next.config") ||
          code.includes("package.json")
        );

      case 2: // Patterns
        return /&quot;|&amp;|&lt;|&gt;|console\.log|var\s+/.test(code);

      case 3: // Components
        return (
          code.includes("map(") ||
          (code.includes("<img") && !code.includes("alt=")) ||
          (code.includes("useState") && !code.includes("import { useState"))
        );

      case 4: // Hydration
        return code.includes("localStorage") && !code.includes("typeof window");

      case 5: // Next.js
        return (
          code.includes("next/") ||
          code.includes("app/") ||
          code.includes("pages/")
        );

      case 6: // Testing
        return (
          code.includes("test(") ||
          code.includes("describe(") ||
          code.includes("it(")
        );

      default:
        return true; // Conservative default
    }
  }

  /**
   * Smart layer selection based on code analysis
   */
  optimizeLayerSelection(code, requestedLayers) {
    const actuallyNeeded = [];

    for (const layerId of requestedLayers) {
      if (this.layerWillMakeChanges(code, layerId)) {
        actuallyNeeded.push(layerId);
      }
    }

    // Always include layer 1 if any layers are needed
    if (actuallyNeeded.length > 0 && !actuallyNeeded.includes(1)) {
      actuallyNeeded.unshift(1);
    }

    return actuallyNeeded.sort((a, b) => a - b);
  }

  /**
   * Cache management with LRU eviction
   */
  cacheResult(key, result) {
    if (this.cache.size >= this.CACHE_SIZE_LIMIT) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, result);
  }

  generateCacheKey(code, layers) {
    const codeHash = this.simpleHash(code);
    const layerKey = layers.sort().join(",");
    return `${codeHash}-${layerKey}`;
  }

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
   * Helper methods
   */
  getLayerConfig(layerId) {
    return (
      this.LAYER_EXECUTION_ORDER.find((layer) => layer.id === layerId) || {}
    );
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

  detectImprovements(before, after) {
    const improvements = [];

    // Check for specific improvements
    if (before.includes("&quot;") && !after.includes("&quot;")) {
      improvements.push("Fixed HTML entity quotes");
    }
    if (before.includes("console.log") && !after.includes("console.log")) {
      improvements.push("Removed console.log statements");
    }
    if (
      before.includes(".map(") &&
      before.includes("<") &&
      !before.includes("key=") &&
      after.includes("key=")
    ) {
      improvements.push("Added missing key props");
    }
    if (
      before.includes("localStorage") &&
      !before.includes("typeof window") &&
      after.includes("typeof window")
    ) {
      improvements.push("Added SSR guards");
    }

    return improvements.length > 0
      ? improvements
      : ["Code transformation completed"];
  }

  generateExecutionSummary(results) {
    return {
      totalLayers: results.length,
      successfulLayers: results.filter((r) => r.success).length,
      failedLayers: results.filter((r) => !r.success).length,
      totalChanges: results.reduce((sum, r) => sum + (r.changeCount || 0), 0),
      totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0),
      improvements: results.flatMap((r) => r.improvements || []),
    };
  }

  log(message, verbose = false) {
    if (verbose) {
      console.log(message);
    }
  }
}

export { EnhancedLayerOrchestrator };
