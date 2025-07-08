import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import chalk from "chalk";
import { TransformationValidator } from "./TransformationValidator.js";
import { LayerDependencyManager } from "./LayerDependencyManager.js";
import { TransformationPipeline } from "./TransformationPipeline.js";

/**
 * Advanced Layer Executor with Safe Execution Patterns
 * Implements comprehensive error recovery, state tracking, and validation
 */
class LayerExecutor {
  constructor() {
    this.layerScripts = {
      1: "fix-layer-1-config.js",
      2: "fix-layer-2-patterns.js",
      3: "fix-layer-3-components.js",
      4: "fix-layer-4-hydration.js",
      5: "fix-layer-5-nextjs.js",
      6: "fix-layer-6-testing.js",
    };

    this.layerDescriptions = {
      1: "Configuration Validation",
      2: "Pattern & Entity Fixes",
      3: "Component Best Practices",
      4: "Hydration & SSR Guard",
      5: "Next.js App Router Optimization",
      6: "Quality & Performance",
    };

    this.layerConfig = {
      1: { supportsAST: false, critical: true, timeout: 30000 },
      2: { supportsAST: false, critical: false, timeout: 45000 },
      3: { supportsAST: true, critical: false, timeout: 60000 },
      4: { supportsAST: true, critical: false, timeout: 45000 },
      5: { supportsAST: true, critical: false, timeout: 60000 },
      6: { supportsAST: false, critical: false, timeout: 75000 },
    };
  }

  /**
   * Execute layers with comprehensive safety and rollback capability
   * Implements the Safe Layer Execution Pattern from the orchestration guide
   */
  async executeLayers(code, enabledLayers, options = {}) {
    const { dryRun = false, verbose = false } = options;

    // Validate and correct layer dependencies
    const { correctedLayers, warnings } =
      LayerDependencyManager.validateAndCorrectLayers(enabledLayers);

    if (warnings.length > 0 && verbose) {
      warnings.forEach((warning) =>
        console.log(chalk.yellow(`⚠️  ${warning}`)),
      );
    }

    // Create transformation pipeline for state tracking
    const pipeline = new TransformationPipeline(code);

    let current = code;
    const results = [];
    const states = [code]; // Track all intermediate states

    console.log(
      chalk.blue(
        `Executing ${correctedLayers.length} layers with safety validation`,
      ),
    );

    for (let i = 0; i < correctedLayers.length; i++) {
      const layerId = correctedLayers[i];
      const previous = current;
      const startTime = performance.now();

      if (verbose) {
        console.log(`\nLayer ${layerId}: ${this.layerDescriptions[layerId]}`);
      }

      try {
        // Execute transformation with fallback strategy
        const transformed = await this.executeLayerWithFallback(
          layerId,
          current,
          options,
        );

        // Validate transformation safety
        const validation = TransformationValidator.validateTransformation(
          previous,
          transformed,
        );

        if (validation.shouldRevert) {
          console.warn(
            chalk.yellow(
              `⚠️  Reverting Layer ${layerId}: ${validation.reason}`,
            ),
          );
          current = previous; // Rollback to safe state

          results.push({
            layerId,
            success: false,
            code: previous,
            executionTime: performance.now() - startTime,
            changeCount: 0,
            revertReason: validation.reason,
            name: this.layerDescriptions[layerId],
          });
        } else {
          current = transformed; // Accept changes
          states.push(current);

          const changeCount = this.calculateChanges(previous, transformed);
          const improvements = this.detectImprovements(
            previous,
            transformed,
            layerId,
          );

          results.push({
            layerId,
            success: true,
            code: current,
            executionTime: performance.now() - startTime,
            changeCount,
            improvements,
            name: this.layerDescriptions[layerId],
          });

          if (verbose) {
            console.log(chalk.green(`Applied ${changeCount} changes`));
            if (improvements.length > 0) {
              improvements.slice(0, 3).forEach((imp) => {
                console.log(chalk.gray(`   ${imp}`));
              });
            }
          }
        }
      } catch (error) {
        console.error(chalk.red(`Layer ${layerId} failed: ${error.message}`));

        results.push({
          layerId,
          success: false,
          code: previous, // Keep previous safe state
          executionTime: performance.now() - startTime,
          changeCount: 0,
          error: error.message,
          name: this.layerDescriptions[layerId],
        });

        // Continue with previous code (don't break the chain)
        current = previous;
      }
    }

    return {
      finalCode: current,
      results,
      states,
      totalExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0),
      successfulLayers: results.filter((r) => r.success).length,
      totalChanges: results.reduce((sum, r) => sum + r.changeCount, 0),
      pipeline: pipeline.getState(),
    };
  }

  /**
   * Execute layer with AST vs Regex fallback strategy
   * Implements intelligent transformation with graceful degradation
   */
  async executeLayerWithFallback(layerId, code, options = {}) {
    const layerConfig = this.layerConfig[layerId];
    const scriptPath = path.join(process.cwd(), this.layerScripts[layerId]);

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Layer script not found: ${scriptPath}`);
    }

    // For layers 3-4, try AST first, fallback to regex
    if (layerConfig.supportsAST && this.shouldUseAST(code)) {
      try {
        if (options.verbose) {
          console.log(chalk.gray(`   Using AST transformation`));
        }
        return await this.runLayerScript(scriptPath, code, {
          ...options,
          mode: "ast",
        });
      } catch (astError) {
        console.warn(
          chalk.yellow(
            `   AST failed, using regex fallback: ${astError.message}`,
          ),
        );
        return await this.runLayerScript(scriptPath, code, {
          ...options,
          mode: "regex",
        });
      }
    } else {
      // Layers 1-2 or when AST not suitable: use regex
      if (options.verbose && layerConfig.supportsAST) {
        console.log(
          chalk.gray(`   Using regex transformation (complex code structure)`),
        );
      }
      return await this.runLayerScript(scriptPath, code, {
        ...options,
        mode: "regex",
      });
    }
  }

  /**
   * Determine if code is suitable for AST transformation
   */
  shouldUseAST(code) {
    // Skip AST for very large files or files with syntax issues
    if (code.length > 100000) return false; // 100KB limit

    // Basic syntax check - if this fails, AST will definitely fail
    try {
      // Simple checks for common syntax issues
      const brackets =
        (code.match(/\{/g) || []).length - (code.match(/\}/g) || []).length;
      const parens =
        (code.match(/\(/g) || []).length - (code.match(/\)/g) || []).length;

      return Math.abs(brackets) <= 1 && Math.abs(parens) <= 1; // Allow minor mismatches
    } catch {
      return false;
    }
  }

  /**
   * Run layer script with comprehensive error handling and timeout
   */
  async runLayerScript(scriptPath, code, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const timeout = this.layerConfig[options.layer]?.timeout || 60000;

      // Prepare environment
      const env = {
        ...process.env,
        NEUROLINT_MODE: options.mode || "analyze",
        NEUROLINT_LAYER: options.layer?.toString() || "1",
        NEUROLINT_DRY_RUN: options.dryRun ? "true" : "false",
        NEUROLINT_INPUT_CODE: Buffer.from(code).toString("base64"), // Safe transfer
      };

      const child = spawn("node", [scriptPath], {
        env,
        stdio: ["pipe", "pipe", "pipe"],
        cwd: process.cwd(),
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
        const executionTime = Date.now() - startTime;

        if (code === 0) {
          try {
            // Parse script output
            const result = this.parseScriptOutput(stdout);
            resolve(result.transformedCode || result.code || code);
          } catch (parseError) {
            // If parsing fails, try to extract code from stdout
            const extractedCode = this.extractCodeFromOutput(stdout);
            resolve(extractedCode || code); // Fallback to original
          }
        } else {
          reject(
            new Error(
              `Layer script failed with code ${code}: ${stderr || "Unknown error"}`,
            ),
          );
        }
      });

      child.on("error", (error) => {
        reject(new Error(`Failed to run layer script: ${error.message}`));
      });

      // Set timeout
      const timer = setTimeout(() => {
        child.kill("SIGKILL");
        reject(
          new Error(`Layer script execution timed out after ${timeout}ms`),
        );
      }, timeout);

      child.on("close", () => {
        clearTimeout(timer);
      });

      // Send input code to script
      if (child.stdin) {
        child.stdin.write(code);
        child.stdin.end();
      }
    });
  }

  /**
   * Parse script output with multiple fallback strategies
   */
  parseScriptOutput(stdout) {
    const lines = stdout.split("\n");

    // Look for JSON output first
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          return JSON.parse(trimmed);
        } catch {
          continue;
        }
      }
    }

    // Look for base64 encoded output
    for (const line of lines) {
      if (line.startsWith("NEUROLINT_OUTPUT:")) {
        try {
          const encoded = line.replace("NEUROLINT_OUTPUT:", "");
          return { transformedCode: Buffer.from(encoded, "base64").toString() };
        } catch {
          continue;
        }
      }
    }

    // Fallback: return original structure
    return {
      transformedCode: stdout,
      changes: this.extractChangesFromText(stdout),
      summary: { output: stdout, parsedFromText: true },
    };
  }

  /**
   * Extract code from mixed output
   */
  extractCodeFromOutput(output) {
    // Look for code blocks or return the last substantial content
    const lines = output.split("\n");
    let codeStart = -1;

    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes("TRANSFORMED_CODE_START")) {
        codeStart = i + 1;
        break;
      }
    }

    if (codeStart >= 0) {
      const codeLines = [];
      for (let i = codeStart; i < lines.length; i++) {
        if (lines[i].includes("TRANSFORMED_CODE_END")) break;
        codeLines.push(lines[i]);
      }
      return codeLines.join("\n");
    }

    return null;
  }

  /**
   * Extract changes from text output for reporting
   */
  extractChangesFromText(text) {
    const changes = [];
    const lines = text.split("\n");

    for (const line of lines) {
      if (
        line.includes("FIXED:") ||
        line.includes("CHANGED:") ||
        line.includes("UPDATED:")
      ) {
        changes.push({
          type: "fix",
          description: line.trim(),
          file: "current",
        });
      }
    }

    return changes;
  }

  /**
   * Calculate meaningful changes between code versions
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
   * Detect specific improvements made by layer
   */
  detectImprovements(before, after, layerId) {
    const improvements = [];

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
        const entityCount =
          (before.match(/&quot;|&amp;|&lt;|&gt;/g) || []).length -
          (after.match(/&quot;|&amp;|&lt;|&gt;/g) || []).length;
        if (entityCount > 0) {
          improvements.push(`Fixed ${entityCount} HTML entity corruptions`);
        }
        break;

      case 3:
        const keyCount =
          (after.match(/key=/g) || []).length -
          (before.match(/key=/g) || []).length;
        if (keyCount > 0) {
          improvements.push(`Added ${keyCount} missing key props`);
        }
        break;

      case 4:
        const guardCount =
          (after.match(/typeof window/g) || []).length -
          (before.match(/typeof window/g) || []).length;
        if (guardCount > 0) {
          improvements.push(`Added ${guardCount} SSR guards`);
        }
        break;
    }

    return improvements;
  }

  /**
   * Get comprehensive layer information
   */
  getLayerInfo(layerNumber) {
    return {
      number: layerNumber,
      name: this.layerDescriptions[layerNumber],
      script: this.layerScripts[layerNumber],
      available: fs.existsSync(
        path.join(process.cwd(), this.layerScripts[layerNumber]),
      ),
      config: this.layerConfig[layerNumber],
      supportsAST: this.layerConfig[layerNumber]?.supportsAST || false,
      critical: this.layerConfig[layerNumber]?.critical || false,
    };
  }

  /**
   * Get all available layers with their current status
   */
  getAllLayersInfo() {
    return Object.keys(this.layerScripts).map((layer) =>
      this.getLayerInfo(parseInt(layer)),
    );
  }
}

export { LayerExecutor };
