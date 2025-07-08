/**
 * Enhanced NeuroLint API Server for Web Dashboard Integration
 * Provides REST endpoints for the React dashboard to interact with CLI layers
 */

import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EnhancedNeuroLintApiServer {
  constructor(port = 8001) {
    this.app = express();
    this.port = port;
    this.executionHistory = [];
    this.cache = new Map();

    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    // CORS configuration for web dashboard
    this.app.use(
      cors({
        origin: [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://127.0.0.1:3000",
          process.env.FRONTEND_URL,
        ].filter(Boolean),
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      }),
    );

    // Body parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });

    // Error handling middleware
    this.app.use((error, req, res, next) => {
      console.error("Server error:", error);
      res.status(500).json({
        error: "Internal server error",
        message: error.message,
        timestamp: new Date().toISOString(),
      });
    });
  }

  setupRoutes() {
    // Health check endpoint
    this.app.get("/api/health", (req, res) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        uptime: process.uptime(),
      });
    });

    // Analyze code and get layer recommendations
    this.app.post("/api/analyze", async (req, res) => {
      try {
        const { code, filePath, options = {} } = req.body;

        if (!code || !code.trim()) {
          return res.status(400).json({
            error: "Code is required",
            message: "Please provide code to analyze",
          });
        }

        console.log("🔍 Analyzing code for recommendations...");

        // Analyze code and detect issues
        const analysis = this.analyzeCodeForIssues(code, filePath);

        // Generate layer recommendations
        const recommendations = this.generateLayerRecommendations(
          analysis.issues,
        );

        const result = {
          recommendedLayers: recommendations.layers,
          detectedIssues: analysis.issues,
          confidence: this.calculateConfidence(analysis.issues),
          estimatedImpact: this.estimateImpact(analysis.issues),
          reasons: recommendations.reasons,
          analysisTime: Date.now() - req.startTime || 0,
          timestamp: new Date().toISOString(),
        };

        console.log(
          `✅ Analysis complete: ${analysis.issues.length} issues found, ${recommendations.layers.length} layers recommended`,
        );

        res.json(result);
      } catch (error) {
        console.error("Analysis error:", error);
        res.status(500).json({
          error: "Analysis failed",
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Execute layers with orchestration
    this.app.post("/api/execute", async (req, res) => {
      try {
        const { code, layers = [1, 2, 3, 4], options = {} } = req.body;

        if (!code || !code.trim()) {
          return res.status(400).json({
            error: "Code is required",
            message: "Please provide code to execute layers on",
          });
        }

        console.log(`🚀 Executing layers [${layers.join(", ")}]...`);

        // Check cache first
        const cacheKey = this.generateCacheKey(code, layers);
        if (options.useCache && this.cache.has(cacheKey)) {
          console.log("📦 Using cached result");
          const cachedResult = this.cache.get(cacheKey);
          return res.json({
            ...cachedResult,
            fromCache: true,
            timestamp: new Date().toISOString(),
          });
        }

        // Execute layers using CLI tools
        const result = await this.executeLayersWithCLI(code, layers, options);

        // Cache successful results
        if (result.success && options.useCache) {
          this.cacheResult(cacheKey, result);
        }

        // Store in execution history
        this.addToHistory({
          timestamp: new Date().toISOString(),
          layers,
          success: result.success,
          totalChanges: result.summary.totalChanges,
          executionTime: result.summary.totalExecutionTime,
          improvements: result.results.flatMap((r) => r.improvements || []),
        });

        console.log(
          `✅ Execution complete: ${result.summary.totalChanges} changes made`,
        );

        res.json({
          ...result,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Execution error:", error);
        res.status(500).json({
          error: "Execution failed",
          message: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    });

    // Get layer information
    this.app.get("/api/layers", (req, res) => {
      try {
        const layerInfo = {
          layers: [
            {
              id: 1,
              name: "Configuration",
              description: "TypeScript and build configuration optimization",
              dependencies: [],
            },
            {
              id: 2,
              name: "Entity Cleanup",
              description: "Pattern fixes and code modernization",
              dependencies: [1],
            },
            {
              id: 3,
              name: "Components",
              description: "React and TypeScript specific improvements",
              dependencies: [1, 2],
            },
            {
              id: 4,
              name: "Hydration",
              description: "SSR safety guards and runtime protection",
              dependencies: [1, 2, 3],
            },
            {
              id: 5,
              name: "Next.js",
              description: "App Router and framework optimizations",
              dependencies: [1, 2, 3, 4],
            },
            {
              id: 6,
              name: "Testing",
              description: "Quality assurance and performance validation",
              dependencies: [1, 2, 3, 4, 5],
            },
          ],
          availableOptions: {
            verbose: "Enable detailed logging",
            dryRun: "Preview changes without applying",
            useCache: "Use cached results when possible",
            skipUnnecessary: "Skip layers that won't make changes",
          },
        };

        res.json(layerInfo);
      } catch (error) {
        console.error("Layer info error:", error);
        res.status(500).json({
          error: "Failed to get layer info",
          message: error.message,
        });
      }
    });

    // Validate code syntax
    this.app.post("/api/validate", async (req, res) => {
      try {
        const { code } = req.body;

        if (!code) {
          return res.status(400).json({
            error: "Code is required",
            message: "Please provide code to validate",
          });
        }

        const validation = this.validateCodeSyntax(code);

        res.json({
          valid: validation.valid,
          error: validation.error || null,
          suggestions: validation.suggestions || [],
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Validation error:", error);
        res.status(500).json({
          error: "Validation failed",
          message: error.message,
        });
      }
    });

    // Get execution history
    this.app.get("/api/history", (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 10;
        const history = this.executionHistory.slice(-limit).reverse(); // Most recent first

        const stats = this.calculateStats();

        res.json({
          history,
          stats,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        console.error("History error:", error);
        res.status(500).json({
          error: "Failed to get history",
          message: error.message,
        });
      }
    });

    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: "Not found",
        message: `Endpoint ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Analyze code and detect issues for layer recommendations
   */
  analyzeCodeForIssues(code, filePath) {
    const issues = [];

    // Configuration issues
    if (
      filePath &&
      (filePath.includes("tsconfig") || filePath.includes("next.config"))
    ) {
      if (code.includes('"target": "es5"')) {
        issues.push({
          type: "config",
          severity: "high",
          description: "Outdated TypeScript target detected",
          fixedByLayer: 1,
          pattern: "TypeScript configuration",
        });
      }
    }

    // Entity and pattern issues
    const htmlEntities = code.match(/&(quot|amp|lt|gt|#x27);/g);
    if (htmlEntities) {
      issues.push({
        type: "pattern",
        severity: "medium",
        description: `${htmlEntities.length} HTML entities found`,
        fixedByLayer: 2,
        pattern: "HTML entities",
        count: htmlEntities.length,
      });
    }

    const consoleUsage = code.match(/console\.log\(/g);
    if (consoleUsage) {
      issues.push({
        type: "pattern",
        severity: "low",
        description: `${consoleUsage.length} console.log statements found`,
        fixedByLayer: 2,
        pattern: "Console statements",
        count: consoleUsage.length,
      });
    }

    // Component issues
    const mapWithoutKey = code.match(
      /\.map\s*\([^)]*\)\s*=>\s*<[^>]*(?!.*key=)/g,
    );
    if (mapWithoutKey) {
      issues.push({
        type: "component",
        severity: "high",
        description: `${mapWithoutKey.length} missing key props in map operations`,
        fixedByLayer: 3,
        pattern: "Missing key props",
        count: mapWithoutKey.length,
      });
    }

    const imgWithoutAlt = code.match(/<img(?![^>]*alt=)[^>]*>/g);
    if (imgWithoutAlt) {
      issues.push({
        type: "component",
        severity: "medium",
        description: `${imgWithoutAlt.length} images missing alt attributes`,
        fixedByLayer: 3,
        pattern: "Accessibility issues",
        count: imgWithoutAlt.length,
      });
    }

    // Hydration issues
    if (code.includes("localStorage") && !code.includes("typeof window")) {
      const localStorageUsage = code.match(/localStorage\./g);
      issues.push({
        type: "hydration",
        severity: "high",
        description: `${localStorageUsage?.length || 1} unguarded localStorage usage`,
        fixedByLayer: 4,
        pattern: "SSR safety",
        count: localStorageUsage?.length || 1,
      });
    }

    return { issues };
  }

  /**
   * Generate layer recommendations based on detected issues
   */
  generateLayerRecommendations(issues) {
    const layers = new Set([1]); // Always include foundation layer
    const reasons = ["Configuration layer provides essential foundation"];

    // Group issues by layer
    const issuesByLayer = issues.reduce((acc, issue) => {
      if (!acc[issue.fixedByLayer]) acc[issue.fixedByLayer] = [];
      acc[issue.fixedByLayer].push(issue);
      return acc;
    }, {});

    // Add layers based on detected issues
    Object.entries(issuesByLayer).forEach(([layerId, layerIssues]) => {
      const id = parseInt(layerId);
      layers.add(id);

      const criticalCount = layerIssues.filter(
        (i) => i.severity === "high",
      ).length;
      const mediumCount = layerIssues.filter(
        (i) => i.severity === "medium",
      ).length;

      if (criticalCount > 0) {
        reasons.push(`Layer ${id}: ${criticalCount} critical issues detected`);
      } else if (mediumCount > 0) {
        reasons.push(
          `Layer ${id}: ${mediumCount} medium priority issues detected`,
        );
      }
    });

    return {
      layers: Array.from(layers).sort(),
      reasons,
    };
  }

  /**
   * Execute layers using CLI tools
   */
  async executeLayersWithCLI(code, layers, options) {
    const startTime = Date.now();
    const results = [];
    let currentCode = code;

    // Save code to temporary file
    const tempFile = `/tmp/neurolint-${Date.now()}.js`;
    fs.writeFileSync(tempFile, code);

    try {
      for (const layerId of layers) {
        const layerStartTime = Date.now();
        const previousCode = currentCode;

        try {
          // Execute individual layer
          const layerFile = path.join(
            __dirname,
            `../../fix-layer-${layerId}-*.js`,
          );
          const layerResult = await this.executeLayerFile(
            layerFile,
            tempFile,
            options,
          );

          if (layerResult.success) {
            currentCode = layerResult.code;

            results.push({
              layerId,
              success: true,
              code: currentCode,
              executionTime: Date.now() - layerStartTime,
              changeCount: this.calculateChanges(previousCode, currentCode),
              improvements: layerResult.improvements || [
                `Layer ${layerId} transformations applied`,
              ],
            });
          } else {
            results.push({
              layerId,
              success: false,
              code: previousCode,
              executionTime: Date.now() - layerStartTime,
              changeCount: 0,
              improvements: [],
              error: layerResult.error,
            });
          }
        } catch (error) {
          results.push({
            layerId,
            success: false,
            code: previousCode,
            executionTime: Date.now() - layerStartTime,
            changeCount: 0,
            improvements: [],
            error: error.message,
          });
        }
      }

      // Calculate summary
      const totalExecutionTime = Date.now() - startTime;
      const successfulLayers = results.filter((r) => r.success).length;
      const totalChanges = results.reduce((sum, r) => sum + r.changeCount, 0);

      return {
        success: successfulLayers > 0,
        finalCode: currentCode,
        originalCode: code,
        results,
        summary: {
          totalLayers: layers.length,
          successfulLayers,
          failedLayers: layers.length - successfulLayers,
          totalExecutionTime,
          totalChanges,
          cacheHitRate: 0,
        },
      };
    } finally {
      // Clean up temporary file
      try {
        fs.unlinkSync(tempFile);
      } catch (err) {
        console.warn("Failed to clean up temp file:", err.message);
      }
    }
  }

  /**
   * Execute a single layer file
   */
  async executeLayerFile(layerFile, inputFile, options) {
    return new Promise((resolve) => {
      // For now, return a simulated result
      // In production, this would execute the actual layer scripts
      const code = fs.readFileSync(inputFile, "utf8");

      // Simulate layer transformations
      let transformedCode = code;
      const improvements = [];

      // Simple transformations for demo
      if (code.includes("&quot;")) {
        transformedCode = transformedCode.replace(/&quot;/g, '"');
        improvements.push("Fixed HTML quote entities");
      }

      if (code.includes("console.log")) {
        transformedCode = transformedCode.replace(
          /console\.log/g,
          "console.debug",
        );
        improvements.push("Upgraded console statements");
      }

      if (code.includes(".map(") && !code.includes("key=")) {
        transformedCode = transformedCode.replace(
          /(\w+)\.map\s*\(\s*\(([^)]+)\)\s*=>\s*<(\w+)([^>]*?)>/g,
          "$1.map(($2, index) => <$3 key={index}$4>",
        );
        improvements.push("Added missing key props");
      }

      if (code.includes("localStorage") && !code.includes("typeof window")) {
        transformedCode = transformedCode.replace(
          /(const|let|var)\s+(\w+)\s*=\s*localStorage\./g,
          '$1 $2 = typeof window !== "undefined" ? localStorage.',
        );
        improvements.push("Added SSR safety guards");
      }

      // Write transformed code back to file
      fs.writeFileSync(inputFile, transformedCode);

      resolve({
        success: true,
        code: transformedCode,
        improvements,
      });
    });
  }

  /**
   * Validate code syntax
   */
  validateCodeSyntax(code) {
    try {
      // Basic validation
      const openBraces = (code.match(/{/g) || []).length;
      const closeBraces = (code.match(/}/g) || []).length;
      const openParens = (code.match(/\(/g) || []).length;
      const closeParens = (code.match(/\)/g) || []).length;

      const suggestions = [];

      if (Math.abs(openBraces - closeBraces) > 0) {
        suggestions.push("Check for unmatched curly braces");
      }

      if (Math.abs(openParens - closeParens) > 0) {
        suggestions.push("Check for unmatched parentheses");
      }

      return {
        valid: suggestions.length === 0,
        error:
          suggestions.length > 0 ? "Potential syntax issues detected" : null,
        suggestions,
      };
    } catch (error) {
      return {
        valid: false,
        error: error.message,
        suggestions: ["Fix syntax errors and try again"],
      };
    }
  }

  /**
   * Utility methods
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

  calculateConfidence(issues) {
    if (issues.length === 0) return 0.5;
    const criticalCount = issues.filter((i) => i.severity === "high").length;
    return Math.min(0.95, 0.6 + (criticalCount / issues.length) * 0.35);
  }

  estimateImpact(issues) {
    const totalIssues = issues.length;
    const criticalCount = issues.filter((i) => i.severity === "high").length;

    if (criticalCount > 5)
      return "High impact - significant improvements possible";
    if (criticalCount > 2)
      return "Medium impact - notable improvements expected";
    if (totalIssues > 0) return "Low impact - minor optimizations available";
    return "Minimal impact - code appears well-structured";
  }

  generateCacheKey(code, layers) {
    const hash = require("crypto")
      .createHash("md5")
      .update(code.slice(0, 1000))
      .digest("hex");
    return `${hash}-${layers.join(",")}`;
  }

  cacheResult(key, result) {
    if (this.cache.size >= 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, result);
  }

  addToHistory(execution) {
    this.executionHistory.push(execution);
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(-100);
    }
  }

  calculateStats() {
    if (this.executionHistory.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        averageChanges: 0,
        averageExecutionTime: 0,
      };
    }

    const successful = this.executionHistory.filter((h) => h.success);
    const totalChanges = this.executionHistory.reduce(
      (sum, h) => sum + h.totalChanges,
      0,
    );
    const totalTime = this.executionHistory.reduce(
      (sum, h) => sum + h.executionTime,
      0,
    );

    return {
      totalExecutions: this.executionHistory.length,
      successRate: (successful.length / this.executionHistory.length) * 100,
      averageChanges: totalChanges / this.executionHistory.length,
      averageExecutionTime: totalTime / this.executionHistory.length,
    };
  }

  start() {
    this.app.listen(this.port, "0.0.0.0", () => {
      console.log(
        `🚀 Enhanced NeuroLint API Server running on port ${this.port}`,
      );
      console.log(`📡 Health check: http://localhost:${this.port}/api/health`);
      console.log(`🌐 Web dashboard integration ready`);
    });
  }
}

// Start server if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new EnhancedNeuroLintApiServer();
  server.start();
}

export { EnhancedNeuroLintApiServer };
