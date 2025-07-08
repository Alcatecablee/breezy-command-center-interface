import chalk from "chalk";
import fs from "fs";
import path from "path";

class ErrorHandler {
  constructor() {
    this.errorLog = [];
    this.contextStack = [];
  }

  pushContext(context) {
    this.contextStack.push(context);
  }

  popContext() {
    return this.contextStack.pop();
  }

  getCurrentContext() {
    return this.contextStack[this.contextStack.length - 1];
  }

  handleError(error, operation = null, options = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      operation: operation || this.getCurrentContext(),
      error: {
        message: error.message,
        code: error.code,
        stack: error.stack,
      },
      ...options,
    };

    this.errorLog.push(errorInfo);

    // Enhanced error reporting based on error type
    if (error.code === "ECONNREFUSED") {
      console.error(chalk.red("❌ Connection Error"));
      console.error(chalk.yellow("The NeuroLint API server is not running."));
      console.error(chalk.gray("Solutions:"));
      console.error(chalk.gray("• Start the server: npm run dev"));
      console.error(chalk.gray("• Check your API URL in .neurolint.json"));
      console.error(chalk.gray("• Use offline mode: --offline"));
    } else if (error.code === "ENOENT") {
      console.error(chalk.red("❌ File Not Found"));
      console.error(chalk.yellow(`Cannot find: ${error.path}`));
      console.error(
        chalk.gray("Check if the file path is correct and accessible"),
      );
    } else if (error.code === "EMFILE" || error.code === "ENFILE") {
      console.error(chalk.red("❌ Too Many Open Files"));
      console.error(chalk.yellow("System file descriptor limit reached"));
      console.error(
        chalk.gray("Try reducing batch size or closing other applications"),
      );
    } else if (error.message.includes("401") || error.message.includes("403")) {
      console.error(chalk.red("❌ Authentication Error"));
      console.error(chalk.yellow("Invalid or expired API key"));
      console.error(chalk.gray("Run: neurolint login"));
    } else {
      console.error(chalk.red(`❌ ${operation || "Operation"} Failed`));
      console.error(chalk.yellow(error.message));

      if (options.verbose) {
        console.error(chalk.gray("\nStack trace:"));
        console.error(chalk.gray(error.stack));
      }
    }

    // Suggest recovery actions
    this.suggestRecovery(error, operation);
  }

  suggestRecovery(error, operation) {
    const suggestions = [];

    if (operation === "analyze" || operation === "fix") {
      suggestions.push("Try with fewer files: --layers=1,2");
      suggestions.push("Use dry-run mode: --dry-run");
    }

    if (error.code === "ECONNREFUSED") {
      suggestions.push("Enable offline mode: --offline");
    }

    if (suggestions.length > 0) {
      console.log(chalk.blue("\n💡 Suggestions:"));
      suggestions.forEach((suggestion) => {
        console.log(chalk.gray(`• ${suggestion}`));
      });
    }
  }

  saveErrorLog(filePath = ".neurolint-errors.json") {
    try {
      fs.writeFileSync(filePath, JSON.stringify(this.errorLog, null, 2));
      console.log(chalk.gray(`Error log saved to: ${filePath}`));
    } catch (err) {
      console.error(chalk.red("Failed to save error log:", err.message));
    }
  }

  getErrorSummary() {
    const summary = {
      total: this.errorLog.length,
      byType: {},
      recent: this.errorLog.slice(-5),
    };

    this.errorLog.forEach((log) => {
      const type = log.error.code || "unknown";
      summary.byType[type] = (summary.byType[type] || 0) + 1;
    });

    return summary;
  }
}

module.exports = { ErrorHandler };
