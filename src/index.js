#!/usr/bin/env node

/**
 * NeuroLint CLI - Enhanced Main Application
 * Advanced rule-based code analysis and transformation tool
 */

import { Command } from "commander";
import chalk from "chalk";
import boxen from "boxen";
import { ErrorHandler } from "./utils/ErrorHandler.js";
import { PluginManager } from "./plugins/PluginManager.js";
import { VSCodeBridge } from "./integration/VSCodeBridge.js";

// Import commands
import { analyzeCommand } from "./commands/analyze.js";
import { fixCommand } from "./commands/fix.js";
import { initCommand } from "./commands/init.js";
import { statusCommand } from "./commands/status.js";
import { loginCommand } from "./commands/auth.js";
import { configCommand } from "./commands/config.js";
import { interactiveCommand } from "./commands/interactive.js";

// Import package.json
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const packageJson = require("../package.json");

const program = new Command();

// Initialize global components
const errorHandler = new ErrorHandler();
const pluginManager = new PluginManager();
const vscodeBackground = new VSCodeBridge();

// CLI Configuration
program
  .name("neurolint")
  .description(
    "Advanced rule-based code analysis and transformation tool using AST parsing and sophisticated pattern matching",
  )
  .version(packageJson.version)
  .helpOption("-h, --help", "display help for command");

// Global options with enhanced error handling
program
  .option("-v, --verbose", "enable verbose output")
  .option("--debug", "enable debug mode")
  .option("--offline", "work in offline mode")
  .option("--plugins", "load custom plugins")
  .option("--vscode-bridge", "start VS Code integration bridge")
  .option("--api-url <url>", "API server URL", "https://api.neurolint.dev");

// Enhanced commands with error handling
program
  .command("init")
  .description("Initialize NeuroLint in your project")
  .option("-f, --force", "overwrite existing configuration")
  .option(
    "--layers <layers>",
    "comma-separated list of layers to enable",
    "1,2,3,4",
  )
  .action(async (options) => {
    errorHandler.pushContext("init");
    try {
      await initCommand(options);
    } catch (error) {
      errorHandler.handleError(error, "init", options);
      process.exit(1);
    } finally {
      errorHandler.popContext();
    }
  });

program
  .command("analyze")
  .alias("scan")
  .description("Analyze code using NeuroLint layers")
  .argument("[path]", "path to analyze", ".")
  .option("-r, --recursive", "analyze recursively")
  .option(
    "-l, --layers <layers>",
    "comma-separated layers to use",
    "1,2,3,4,5,6",
  )
  .option(
    "-o, --output <format>",
    "output format (table|json|summary)",
    "table",
  )
  .option(
    "-i, --include <pattern>",
    "include file pattern",
    "**/*.{ts,tsx,js,jsx}",
  )
  .option(
    "-e, --exclude <pattern>",
    "exclude file pattern",
    "node_modules/**,dist/**,build/**",
  )
  .action(async (path, options) => {
    errorHandler.pushContext("analyze");
    try {
      // Load plugins if requested
      if (program.opts().plugins) {
        await pluginManager.loadPlugins();
      }

      await analyzeCommand(path, { ...options, ...program.opts() });
    } catch (error) {
      errorHandler.handleError(error, "analyze", options);
      process.exit(1);
    } finally {
      errorHandler.popContext();
    }
  });

program
  .command("fix")
  .description("Fix issues automatically using NeuroLint layers")
  .argument("[path]", "path to fix", ".")
  .option("--dry-run", "preview changes without applying them")
  .option("--backup", "create backup files before fixing")
  .option(
    "-l, --layers <layers>",
    "comma-separated layers to use",
    "1,2,3,4,5,6",
  )
  .option("-r, --recursive", "fix recursively")
  .action(async (path, options) => {
    errorHandler.pushContext("fix");
    try {
      if (program.opts().plugins) {
        await pluginManager.loadPlugins();
      }

      await fixCommand(path, { ...options, ...program.opts() });
    } catch (error) {
      errorHandler.handleError(error, "fix", options);
      process.exit(1);
    } finally {
      errorHandler.popContext();
    }
  });

program
  .command("status")
  .description("Check project NeuroLint status")
  .option("-d, --detailed", "show detailed status information")
  .action(statusCommand);

program
  .command("login")
  .description("Authenticate with NeuroLint API")
  .option("--api-key <key>", "API key for authentication")
  .option("--url <url>", "custom API server URL")
  .action(loginCommand);

program
  .command("logout")
  .description("Logout from NeuroLint API")
  .action(async () => {
    const { logout } = await import("./commands/auth.js");
    logout();
  });

program
  .command("config")
  .description("Manage NeuroLint configuration")
  .option("--show", "show current configuration")
  .option("--set <key=value>", "set configuration value")
  .option("--reset", "reset to default configuration")
  .action(configCommand);

program
  .command("interactive")
  .alias("i")
  .description("Start interactive mode")
  .action(interactiveCommand);

// Plugin management commands
program
  .command("plugins")
  .description("Manage NeuroLint plugins")
  .option("--list", "list installed plugins")
  .option("--install <name>", "install a plugin")
  .option("--uninstall <name>", "uninstall a plugin")
  .action(async (options) => {
    try {
      await pluginManager.loadPlugins();

      if (options.list) {
        const plugins = pluginManager.getPluginInfo();
        console.log(chalk.blue("Installed Plugins:"));
        plugins.forEach((plugin) => {
          console.log(`  ${chalk.white(plugin.name)} v${plugin.version}`);
          console.log(`    ${chalk.gray(plugin.description)}`);
        });
      } else if (options.install) {
        await pluginManager.installPlugin(options.install);
      } else if (options.uninstall) {
        pluginManager.unloadPlugin(options.uninstall);
      }
    } catch (error) {
      errorHandler.handleError(error, "plugins", options);
    }
  });

// VS Code integration command
program
  .command("vscode")
  .description("VS Code integration utilities")
  .option("--start-bridge", "start the VS Code integration bridge")
  .option("--stop-bridge", "stop the VS Code integration bridge")
  .action(async (options) => {
    try {
      if (options.startBridge) {
        await vscodeBackground.start();
        console.log(
          chalk.green("VS Code bridge started. Keep this terminal open."),
        );

        // Keep process alive
        process.on("SIGINT", () => {
          vscodeBackground.stop();
          process.exit(0);
        });

        // Prevent exit
        setInterval(() => {}, 1000);
      } else if (options.stopBridge) {
        vscodeBackground.stop();
      }
    } catch (error) {
      errorHandler.handleError(error, "vscode", options);
    }
  });

// Enhanced error handling and global setup
program.exitOverride();

// Initialize components
async function initialize() {
  try {
    // Start VS Code bridge if requested
    if (program.opts().vscodeBridge) {
      await vscodeBackground.start();
    }

    // Load plugins if requested
    if (program.opts().plugins) {
      await pluginManager.loadPlugins();
    }
  } catch (error) {
    console.warn(chalk.yellow("Warning during initialization:", error.message));
  }
}

// Parse and handle
(async () => {
  try {
    await initialize();
    program.parse();
  } catch (err) {
    if (err.code === "commander.helpDisplayed") {
      process.exit(0);
    }

    errorHandler.handleError(err, "main");

    if (program.opts().debug) {
      console.error(chalk.gray(err.stack));
    }

    // Save error log
    errorHandler.saveErrorLog();
    process.exit(1);
  }

  // If no command provided, show welcome
  if (process.argv.length <= 2) {
    displayWelcome();
    program.help();
  }
})();

function displayWelcome() {
  const welcome = boxen(
    chalk.bold("NeuroLint CLI Enhanced") +
      "\n\n" +
      chalk.gray("Advanced rule-based code analysis and transformation tool") +
      "\n" +
      chalk.gray("Version: ") +
      chalk.white(packageJson.version) +
      "\n\n" +
      chalk.white("Quick Start:") +
      "\n" +
      chalk.white("  neurolint init          ") +
      chalk.gray("Initialize project") +
      "\n" +
      chalk.white("  neurolint analyze       ") +
      chalk.gray("Analyze code") +
      "\n" +
      chalk.white("  neurolint fix --dry-run ") +
      chalk.gray("Preview fixes") +
      "\n" +
      chalk.white("  neurolint plugins --list") +
      chalk.gray("List plugins") +
      "\n" +
      chalk.white("  neurolint vscode --start-bridge") +
      chalk.gray("VS Code integration"),
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "blue",
    },
  );

  console.log(welcome);
}

// Graceful shutdown
process.on("SIGINT", () => {
  console.log(chalk.yellow("\nShutting down gracefully..."));
  vscodeBackground.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  vscodeBackground.stop();
  process.exit(0);
});

export { program, errorHandler, pluginManager };
