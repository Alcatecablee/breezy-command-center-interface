#!/usr/bin/env node

/**
 * NeuroLint CLI - Main Application
 * Advanced rule-based code analysis and transformation tool
 */

const { Command } = require("commander");
const chalk = require("chalk");
const boxen = require("boxen");
const ora = require("ora");
const fs = require("fs");
const path = require("path");

// Import commands
const { analyzeCommand } = require("./commands/analyze");
const { fixCommand } = require("./commands/fix");
const { initCommand } = require("./commands/init");
const { statusCommand } = require("./commands/status");
const { loginCommand } = require("./commands/auth");
const { configCommand } = require("./commands/config");
const { interactiveCommand } = require("./commands/interactive");

const program = new Command();
const packageJson = require("../package.json");

// CLI Configuration
program
  .name("neurolint")
  .description(
    "Advanced rule-based code analysis and transformation tool using AST parsing and sophisticated pattern matching",
  )
  .version(packageJson.version)
  .helpOption("-h, --help", "display help for command");

// Global options
program
  .option("-v, --verbose", "enable verbose output")
  .option("--debug", "enable debug mode")
  .option("--api-url <url>", "API server URL", "https://api.neurolint.dev");

// Commands
program
  .command("init")
  .description("Initialize NeuroLint in your project")
  .option("-f, --force", "overwrite existing configuration")
  .option(
    "--layers <layers>",
    "comma-separated list of layers to enable",
    "1,2,3,4",
  )
  .action(initCommand);

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
  .action(analyzeCommand);

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
  .action(fixCommand);

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
  .action(() => {
    const { logout } = require("./commands/auth");
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

// Help command
program
  .command("help")
  .description("Display help information")
  .argument("[command]", "command to get help for")
  .action((command) => {
    if (command) {
      program.help();
    } else {
      displayWelcome();
      program.help();
    }
  });

// Error handling
program.exitOverride();

try {
  program.parse();
} catch (err) {
  if (err.code === "commander.helpDisplayed") {
    process.exit(0);
  }

  console.error(chalk.red("❌ Error:"), err.message);

  if (program.opts().debug) {
    console.error(chalk.gray(err.stack));
  }

  process.exit(1);
}

// If no command provided, show welcome
if (process.argv.length <= 2) {
  displayWelcome();
  program.help();
}

function displayWelcome() {
  const welcome = boxen(
    chalk.bold.blue("NeuroLint CLI") +
      "\n\n" +
      chalk.gray("Advanced rule-based code analysis and transformation tool") +
      "\n" +
      chalk.gray("Version: ") +
      chalk.white(packageJson.version) +
      "\n\n" +
      chalk.yellow("Quick Start:") +
      "\n" +
      chalk.white("  neurolint init          ") +
      chalk.gray("# Initialize project") +
      "\n" +
      chalk.white("  neurolint analyze       ") +
      chalk.gray("# Analyze code") +
      "\n" +
      chalk.white("  neurolint fix --dry-run ") +
      chalk.gray("# Preview fixes") +
      "\n" +
      chalk.white("  neurolint login         ") +
      chalk.gray("# Authenticate"),
    {
      padding: 1,
      margin: 1,
      borderStyle: "round",
      borderColor: "blue",
      backgroundColor: "black",
    },
  );

  console.log(welcome);
}

module.exports = { program };
