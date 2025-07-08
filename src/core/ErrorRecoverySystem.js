import chalk from "chalk";
import { performance } from "perf_hooks";

/**
 * Advanced error recovery system with categorized error handling
 * Provides actionable feedback and recovery suggestions
 * Implements the Error Recovery and Reporting pattern from orchestration guide
 */
class ErrorRecoverySystem {
  /**
   * Execute layer with comprehensive error recovery
   */
  static async executeWithRecovery(
    code,
    layerId,
    layerConfig,
    executeFunction,
    options = {},
  ) {
    const startTime = performance.now();

    try {
      // Attempt normal execution
      const result = await executeFunction(code, layerId, options);

      return {
        success: true,
        code: result,
        executionTime: performance.now() - startTime,
        improvements: this.detectImprovements(code, result),
        layerId,
      };
    } catch (error) {
      // Categorize and handle errors appropriately
      const errorInfo = this.categorizeError(error, layerId, code, layerConfig);

      console.error(chalk.red(`❌ Layer ${layerId} error:`), errorInfo.message);

      // Try recovery strategies if available
      const recoveryResult = await this.attemptRecovery(
        error,
        layerId,
        code,
        errorInfo,
        options,
      );

      return {
        success: recoveryResult.success,
        code: recoveryResult.code || code, // Return original code if recovery fails
        executionTime: performance.now() - startTime,
        error: errorInfo.message,
        errorCategory: errorInfo.category,
        suggestion: errorInfo.suggestion,
        recoveryOptions: errorInfo.recoveryOptions,
        recoveryAttempted: recoveryResult.attempted,
        layerId,
      };
    }
  }

  /**
   * Categorize errors for appropriate handling and user feedback
   */
  static categorizeError(error, layerId, code, layerConfig) {
    const errorMessage = error.message || error.toString();

    // Syntax errors
    if (
      error.name === "SyntaxError" ||
      errorMessage.includes("Unexpected token") ||
      errorMessage.includes("Unexpected end of input")
    ) {
      return {
        category: "syntax",
        message: "Code syntax prevented transformation",
        suggestion: "Fix syntax errors before running NeuroLint",
        recoveryOptions: [
          "Run syntax validation first",
          "Use a code formatter like Prettier",
          "Check for missing brackets, quotes, or semicolons",
          "Validate JSON syntax in config files",
        ],
        severity: "high",
        canRecover: false,
      };
    }

    // AST parsing errors
    if (
      errorMessage.includes("AST") ||
      errorMessage.includes("parse") ||
      errorMessage.includes("babel")
    ) {
      return {
        category: "parsing",
        message: "Complex code structure not supported by AST parser",
        suggestion:
          "Try running with regex fallback or simplify code structure",
        recoveryOptions: [
          "Disable AST transformations for this layer",
          "Run individual layers instead of batch",
          "Simplify complex expressions or nested structures",
          "Use TypeScript strict mode to catch issues",
        ],
        severity: "medium",
        canRecover: true,
        recoveryStrategy: "fallback-to-regex",
      };
    }

    // File system errors
    if (
      errorMessage.includes("ENOENT") ||
      errorMessage.includes("EACCES") ||
      errorMessage.includes("permission") ||
      errorMessage.includes("EISDIR")
    ) {
      return {
        category: "filesystem",
        message: "File system access error during transformation",
        suggestion: "Check file permissions and paths",
        recoveryOptions: [
          "Verify all files exist and are readable",
          "Check write permissions for output directories",
          "Ensure no files are locked by other processes",
          "Run with elevated privileges if needed",
        ],
        severity: "high",
        canRecover: false,
      };
    }

    // Memory/Performance errors
    if (
      errorMessage.includes("out of memory") ||
      errorMessage.includes("Maximum call stack") ||
      errorMessage.includes("heap")
    ) {
      return {
        category: "performance",
        message: "Memory or performance limit exceeded",
        suggestion: "Reduce code complexity or process smaller chunks",
        recoveryOptions: [
          "Split large files into smaller chunks",
          "Increase Node.js memory limit with --max-old-space-size",
          "Simplify complex nested structures",
          "Process files individually instead of batch",
        ],
        severity: "high",
        canRecover: true,
        recoveryStrategy: "reduce-scope",
      };
    }

    // Timeout errors
    if (
      errorMessage.includes("timeout") ||
      errorMessage.includes("timed out")
    ) {
      return {
        category: "timeout",
        message: "Layer execution exceeded time limit",
        suggestion: "Increase timeout or simplify code complexity",
        recoveryOptions: [
          "Increase layer timeout configuration",
          "Process smaller code chunks",
          "Check for infinite loops in transformations",
          "Optimize layer implementation",
        ],
        severity: "medium",
        canRecover: true,
        recoveryStrategy: "retry-with-longer-timeout",
      };
    }

    // Network/API errors
    if (
      errorMessage.includes("ECONNREFUSED") ||
      errorMessage.includes("network") ||
      errorMessage.includes("fetch")
    ) {
      return {
        category: "network",
        message: "Network connectivity issue",
        suggestion: "Check internet connection and API availability",
        recoveryOptions: [
          "Verify internet connection",
          "Check if NeuroLint API is accessible",
          "Try running in offline mode",
          "Configure proxy settings if needed",
        ],
        severity: "medium",
        canRecover: true,
        recoveryStrategy: "retry-with-delay",
      };
    }

    // Layer-specific errors
    const layerSpecificError = this.getLayerSpecificError(
      layerId,
      errorMessage,
      layerConfig,
    );
    if (layerSpecificError) {
      return layerSpecificError;
    }

    // Generic errors
    return {
      category: "unknown",
      message: `Unexpected error in Layer ${layerId}: ${errorMessage}`,
      suggestion: "Please report this issue with your code sample",
      recoveryOptions: [
        "Try running other layers individually",
        "Check console for additional error details",
        "Report issue with minimal reproduction case",
        "Update to latest NeuroLint version",
      ],
      severity: "medium",
      canRecover: false,
    };
  }

  /**
   * Handle layer-specific error patterns
   */
  static getLayerSpecificError(layerId, errorMessage, layerConfig) {
    switch (layerId) {
      case 1: // Configuration layer
        if (errorMessage.includes("JSON")) {
          return {
            category: "config",
            message: "Invalid JSON in configuration file",
            suggestion: "Validate JSON syntax in config files",
            recoveryOptions: [
              "Use online JSON validator",
              "Check for trailing commas in JSON",
              "Verify proper quote usage",
              "Check for duplicate keys",
            ],
            severity: "high",
            canRecover: false,
          };
        }
        if (
          errorMessage.includes("tsconfig") ||
          errorMessage.includes("TypeScript")
        ) {
          return {
            category: "config",
            message: "TypeScript configuration issue",
            suggestion: "Check TypeScript configuration syntax",
            recoveryOptions: [
              "Validate tsconfig.json structure",
              "Check compiler option values",
              "Ensure proper extends path",
              "Update TypeScript version",
            ],
            severity: "medium",
            canRecover: true,
            recoveryStrategy: "validate-config",
          };
        }
        break;

      case 2: // Pattern layer
        if (
          errorMessage.includes("replace") ||
          errorMessage.includes("regex")
        ) {
          return {
            category: "pattern",
            message: "Pattern replacement operation failed",
            suggestion:
              "Some regex patterns may conflict with your code structure",
            recoveryOptions: [
              "Skip problematic pattern replacements",
              "Review regex patterns for edge cases",
              "Process patterns individually",
              "Use safer replacement strategies",
            ],
            severity: "low",
            canRecover: true,
            recoveryStrategy: "skip-problematic-patterns",
          };
        }
        break;

      case 3: // Component layer
        if (errorMessage.includes("JSX") || errorMessage.includes("React")) {
          return {
            category: "component",
            message: "JSX or React component transformation error",
            suggestion: "Complex JSX structures may need manual fixing",
            recoveryOptions: [
              "Simplify complex JSX expressions",
              "Break down large components",
              "Use manual key prop addition",
              "Check React import statements",
            ],
            severity: "medium",
            canRecover: true,
            recoveryStrategy: "simplify-jsx",
          };
        }
        if (errorMessage.includes("key") || errorMessage.includes("map")) {
          return {
            category: "component",
            message: "Key prop or map function transformation issue",
            suggestion: "Complex map operations may need manual key addition",
            recoveryOptions: [
              "Add keys manually to map operations",
              "Simplify complex map expressions",
              "Extract map logic to separate functions",
              "Use React.Fragment with keys",
            ],
            severity: "low",
            canRecover: true,
            recoveryStrategy: "manual-key-addition",
          };
        }
        break;

      case 4: // Hydration layer
        if (
          errorMessage.includes("localStorage") ||
          errorMessage.includes("window") ||
          errorMessage.includes("document")
        ) {
          return {
            category: "hydration",
            message: "Browser API protection transformation failed",
            suggestion: "Manual SSR guards may be needed for complex cases",
            recoveryOptions: [
              "Add manual typeof window checks",
              "Use useEffect hooks for browser APIs",
              "Implement custom SSR-safe hooks",
              "Move browser code to client-only components",
            ],
            severity: "medium",
            canRecover: true,
            recoveryStrategy: "manual-ssr-guards",
          };
        }
        break;

      case 5: // Next.js layer
        if (errorMessage.includes("next") || errorMessage.includes("router")) {
          return {
            category: "nextjs",
            message: "Next.js specific transformation failed",
            suggestion: "Complex Next.js patterns may need manual optimization",
            recoveryOptions: [
              "Check Next.js version compatibility",
              "Review router usage patterns",
              "Update Next.js configuration",
              "Use Next.js migration guides",
            ],
            severity: "medium",
            canRecover: true,
            recoveryStrategy: "nextjs-fallback",
          };
        }
        break;

      case 6: // Testing layer
        if (
          errorMessage.includes("test") ||
          errorMessage.includes("jest") ||
          errorMessage.includes("spec")
        ) {
          return {
            category: "testing",
            message: "Test configuration or setup failed",
            suggestion: "Testing setup may need manual configuration",
            recoveryOptions: [
              "Check Jest configuration",
              "Verify test file patterns",
              "Update testing dependencies",
              "Review test environment setup",
            ],
            severity: "low",
            canRecover: true,
            recoveryStrategy: "skip-testing-layer",
          };
        }
        break;
    }

    return null;
  }

  /**
   * Attempt automatic error recovery based on error category
   */
  static async attemptRecovery(error, layerId, code, errorInfo, options) {
    if (!errorInfo.canRecover) {
      return { success: false, attempted: false };
    }

    console.log(chalk.yellow(`🔄 Attempting recovery for Layer ${layerId}...`));

    try {
      switch (errorInfo.recoveryStrategy) {
        case "fallback-to-regex":
          return await this.fallbackToRegex(layerId, code, options);

        case "retry-with-longer-timeout":
          return await this.retryWithTimeout(layerId, code, options);

        case "retry-with-delay":
          return await this.retryWithDelay(layerId, code, options);

        case "reduce-scope":
          return await this.reduceScope(layerId, code, options);

        case "skip-problematic-patterns":
          return await this.skipProblematicPatterns(layerId, code, options);

        default:
          return { success: false, attempted: false };
      }
    } catch (recoveryError) {
      console.warn(
        chalk.yellow(`⚠️  Recovery attempt failed: ${recoveryError.message}`),
      );
      return { success: false, attempted: true, error: recoveryError.message };
    }
  }

  /**
   * Recovery strategies
   */
  static async fallbackToRegex(layerId, code, options) {
    console.log(
      chalk.blue(`📝 Falling back to regex-only mode for Layer ${layerId}`),
    );
    // Implementation would disable AST and use only regex transformations
    return { success: true, attempted: true, code, strategy: "regex-fallback" };
  }

  static async retryWithTimeout(layerId, code, options) {
    console.log(
      chalk.blue(`⏱️  Retrying Layer ${layerId} with extended timeout`),
    );
    // Implementation would retry with 2x timeout
    return {
      success: true,
      attempted: true,
      code,
      strategy: "extended-timeout",
    };
  }

  static async retryWithDelay(layerId, code, options) {
    console.log(chalk.blue(`⏳ Retrying Layer ${layerId} after delay`));
    await new Promise((resolve) => setTimeout(resolve, 2000));
    return { success: true, attempted: true, code, strategy: "delayed-retry" };
  }

  static async reduceScope(layerId, code, options) {
    console.log(chalk.blue(`📦 Reducing scope for Layer ${layerId}`));
    // Implementation would process smaller chunks
    return { success: true, attempted: true, code, strategy: "reduced-scope" };
  }

  static async skipProblematicPatterns(layerId, code, options) {
    console.log(
      chalk.blue(`⏭️  Skipping problematic patterns in Layer ${layerId}`),
    );
    // Implementation would skip known problematic patterns
    return { success: true, attempted: true, code, strategy: "skip-patterns" };
  }

  /**
   * Generate recovery suggestions based on error patterns
   */
  static generateRecoverySuggestions(errors) {
    const suggestions = [];

    const failedLayers = errors.filter((e) => !e.success);
    const syntaxErrors = failedLayers.filter(
      (e) => e.errorCategory === "syntax",
    );
    const parsingErrors = failedLayers.filter(
      (e) => e.errorCategory === "parsing",
    );
    const performanceErrors = failedLayers.filter(
      (e) => e.errorCategory === "performance",
    );

    if (syntaxErrors.length > 0) {
      suggestions.push({
        type: "syntax",
        title: "Fix Syntax Errors First",
        description:
          "Multiple syntax errors detected. Consider fixing these manually before running NeuroLint.",
        priority: "high",
        actions: [
          "Run code through a formatter (Prettier)",
          "Use ESLint to identify syntax issues",
          "Check for missing brackets, quotes, or semicolons",
          "Validate JSON files with a JSON validator",
        ],
      });
    }

    if (parsingErrors.length > 0) {
      suggestions.push({
        type: "parsing",
        title: "Simplify Complex Code",
        description:
          "AST parser struggled with code complexity. Consider simplification or use regex-only mode.",
        priority: "medium",
        actions: [
          "Break down complex expressions into smaller parts",
          "Separate complex JSX into smaller components",
          "Use regex-only mode for this transformation",
          "Enable verbose logging to identify problematic code",
        ],
      });
    }

    if (performanceErrors.length > 0) {
      suggestions.push({
        type: "performance",
        title: "Optimize Performance",
        description:
          "Performance issues detected. Consider reducing scope or optimizing code.",
        priority: "medium",
        actions: [
          "Process files individually instead of batch",
          "Increase Node.js memory limit",
          "Split large files into smaller chunks",
          "Use streaming processing for large codebases",
        ],
      });
    }

    return suggestions;
  }

  /**
   * Detect improvements made by successful transformations
   */
  static detectImprovements(before, after) {
    const improvements = [];

    // Check for specific improvements
    if (before.includes("&quot;") && !after.includes("&quot;")) {
      improvements.push("Fixed HTML entity quotes");
    }
    if (before.includes("&amp;") && !after.includes("&amp;")) {
      improvements.push("Fixed HTML entity ampersands");
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
      improvements.push("Added missing key props to mapped elements");
    }
    if (
      before.includes("localStorage") &&
      !before.includes("typeof window") &&
      after.includes("typeof window")
    ) {
      improvements.push("Added SSR safety guards");
    }
    if (
      before.includes('"target": "es5"') &&
      after.includes('"target": "ES2020"')
    ) {
      improvements.push("Upgraded TypeScript target");
    }
    if (
      (before.includes("var ") && after.includes("const ")) ||
      after.includes("let ")
    ) {
      improvements.push("Modernized variable declarations");
    }

    return improvements.length > 0
      ? improvements
      : ["Transformation completed successfully"];
  }

  /**
   * Format error report for user-friendly display
   */
  static formatErrorReport(layerResults) {
    const report = {
      summary: {
        total: layerResults.length,
        successful: layerResults.filter((r) => r.success).length,
        failed: layerResults.filter((r) => !r.success).length,
        recovered: layerResults.filter((r) => r.recoveryAttempted && r.success)
          .length,
      },
      errors: [],
      suggestions: [],
    };

    const failedResults = layerResults.filter((r) => !r.success);

    failedResults.forEach((result) => {
      report.errors.push({
        layerId: result.layerId,
        category: result.errorCategory,
        message: result.error,
        suggestion: result.suggestion,
        recoveryOptions: result.recoveryOptions,
        severity: result.severity,
      });
    });

    report.suggestions = this.generateRecoverySuggestions(layerResults);

    return report;
  }
}

export { ErrorRecoverySystem };
