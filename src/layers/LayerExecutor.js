const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");
const chalk = require("chalk");

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
  }

  async executeLayer(layerNumber, files) {
    const scriptName = this.layerScripts[layerNumber];

    if (!scriptName) {
      throw new Error(`Unknown layer: ${layerNumber}`);
    }

    const scriptPath = path.join(process.cwd(), scriptName);

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Layer script not found: ${scriptPath}`);
    }

    try {
      // Execute the layer script in analysis mode
      const result = await this.runLayerScript(scriptPath, {
        mode: "analyze",
        files,
        layer: layerNumber,
      });

      return {
        layer: layerNumber,
        name: this.layerDescriptions[layerNumber],
        success: true,
        issues: result.issues || [],
        summary: result.summary || {},
        executionTime: result.executionTime || 0,
      };
    } catch (error) {
      return {
        layer: layerNumber,
        name: this.layerDescriptions[layerNumber],
        success: false,
        error: error.message,
        issues: [],
        summary: {},
        executionTime: 0,
      };
    }
  }

  async executeLayerFixes(layerNumber, files, dryRun = false) {
    const scriptName = this.layerScripts[layerNumber];

    if (!scriptName) {
      throw new Error(`Unknown layer: ${layerNumber}`);
    }

    const scriptPath = path.join(process.cwd(), scriptName);

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Layer script not found: ${scriptPath}`);
    }

    try {
      // Execute the layer script in fix mode
      const result = await this.runLayerScript(scriptPath, {
        mode: "fix",
        files,
        layer: layerNumber,
        dryRun,
      });

      return {
        layer: layerNumber,
        name: this.layerDescriptions[layerNumber],
        success: true,
        changes: result.changes || [],
        summary: result.summary || {},
        executionTime: result.executionTime || 0,
      };
    } catch (error) {
      return {
        layer: layerNumber,
        name: this.layerDescriptions[layerNumber],
        success: false,
        error: error.message,
        changes: [],
        summary: {},
        executionTime: 0,
      };
    }
  }

  async runLayerScript(scriptPath, options) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      // Prepare environment variables
      const env = {
        ...process.env,
        NEUROLINT_MODE: options.mode,
        NEUROLINT_LAYER: options.layer.toString(),
        NEUROLINT_DRY_RUN: options.dryRun ? "true" : "false",
        NEUROLINT_FILES: JSON.stringify(options.files),
      };

      // Run the script
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
            // Try to parse JSON output from the script
            const result = this.parseScriptOutput(stdout);
            result.executionTime = executionTime;
            resolve(result);
          } catch (parseError) {
            // If we can't parse as JSON, create a basic result
            resolve({
              issues: [],
              changes: [],
              summary: { stdout, stderr },
              executionTime,
            });
          }
        } else {
          reject(new Error(`Layer script failed with code ${code}: ${stderr}`));
        }
      });

      child.on("error", (error) => {
        reject(new Error(`Failed to run layer script: ${error.message}`));
      });

      // Set a timeout for layer execution
      const timeout = setTimeout(() => {
        child.kill("SIGKILL");
        reject(new Error("Layer script execution timed out"));
      }, 300000); // 5 minutes timeout

      child.on("close", () => {
        clearTimeout(timeout);
      });
    });
  }

  parseScriptOutput(stdout) {
    // Look for JSON output in stdout
    const lines = stdout.split("\n");

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          return JSON.parse(trimmed);
        } catch {
          // Continue looking for valid JSON
        }
      }
    }

    // If no JSON found, try to extract useful information
    const issues = this.extractIssuesFromText(stdout);
    const changes = this.extractChangesFromText(stdout);

    return {
      issues,
      changes,
      summary: {
        output: stdout,
        parsedFromText: true,
      },
    };
  }

  extractIssuesFromText(text) {
    const issues = [];
    const lines = text.split("\n");

    for (const line of lines) {
      // Look for common issue patterns
      if (
        line.includes("ERROR:") ||
        line.includes("WARN:") ||
        line.includes("ISSUE:")
      ) {
        issues.push({
          type: "general",
          severity: line.includes("ERROR:") ? "high" : "medium",
          message: line.trim(),
          file: "unknown",
        });
      }
    }

    return issues;
  }

  extractChangesFromText(text) {
    const changes = [];
    const lines = text.split("\n");

    for (const line of lines) {
      // Look for common change patterns
      if (
        line.includes("FIXED:") ||
        line.includes("CHANGED:") ||
        line.includes("UPDATED:")
      ) {
        changes.push({
          type: "fix",
          description: line.trim(),
          file: "unknown",
        });
      }
    }

    return changes;
  }

  async executeAllLayers(files, enabledLayers, mode = "analyze") {
    const results = {};

    for (const layer of enabledLayers) {
      try {
        if (mode === "analyze") {
          results[layer] = await this.executeLayer(layer, files);
        } else {
          results[layer] = await this.executeLayerFixes(layer, files);
        }
      } catch (error) {
        results[layer] = {
          layer,
          name: this.layerDescriptions[layer],
          success: false,
          error: error.message,
          issues: [],
          changes: [],
          summary: {},
          executionTime: 0,
        };
      }
    }

    return results;
  }

  getLayerInfo(layerNumber) {
    return {
      number: layerNumber,
      name: this.layerDescriptions[layerNumber],
      script: this.layerScripts[layerNumber],
      available: fs.existsSync(
        path.join(process.cwd(), this.layerScripts[layerNumber]),
      ),
    };
  }

  getAllLayersInfo() {
    return Object.keys(this.layerScripts).map((layer) =>
      this.getLayerInfo(parseInt(layer)),
    );
  }
}

module.exports = { LayerExecutor };
