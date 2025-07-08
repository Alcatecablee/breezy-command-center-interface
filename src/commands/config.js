import chalk from "chalk";
import fs from "fs";
import path from "path";
import { ConfigManager } from "../utils/ConfigManager.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

async function configCommand(options) {
  try {
    if (options.show) {
      await showConfig();
    } else if (options.set) {
      await setConfig(options.set);
    } else if (options.reset) {
      await resetConfig();
    } else {
      await interactiveConfig();
    }
  } catch (error) {
    console.error(chalk.red("Config error:"), error.message);
    if (options.debug) {
      console.error(error.stack);
    }
  }
}

async function showConfig() {
  try {
    const config = ConfigManager.getConfig();

    console.log(chalk.bold("⚙️  NeuroLint Configuration"));
    console.log(chalk.gray("============================"));
    console.log();

    // Basic Info
    console.log(chalk.yellow("📋 Basic Information:"));
    console.log(`   Version: ${chalk.white(config.version)}`);
    console.log(
      `   Enabled Layers: ${chalk.white(config.layers.enabled.join(", "))}`,
    );
    console.log();

    // Layer Details
    console.log(chalk.yellow("Layer Configuration:"));
    config.layers.enabled.forEach((layer) => {
      const layerConfig = config.layers.config[layer];
      if (layerConfig) {
        console.log(`   ${chalk.green(layer)}. ${layerConfig.name}`);
        console.log(`      ${chalk.gray(layerConfig.description)}`);
        console.log(`      Timeout: ${chalk.white(layerConfig.timeout)}ms`);
      }
    });
    console.log();

    // File Patterns
    console.log(chalk.yellow("File Patterns:"));
    console.log(`   Include: ${chalk.white(config.files.include.join(", "))}`);
    console.log(`   Exclude: ${chalk.white(config.files.exclude.join(", "))}`);
    console.log();

    // Output Settings
    console.log(chalk.yellow("Output Settings:"));
    console.log(`   Format: ${chalk.white(config.output.format)}`);
    console.log(`   Verbose: ${chalk.white(config.output.verbose)}`);
    console.log();

    // API Settings
    console.log(chalk.yellow("🌐 API Settings:"));
    console.log(`   URL: ${chalk.white(config.api.url)}`);
    console.log(`   Timeout: ${chalk.white(config.api.timeout)}ms`);
    console.log(`   Retries: ${chalk.white(config.api.retries)}`);
  } catch (error) {
    console.log(
      chalk.red("No configuration found. Run `neurolint init` first."),
    );
  }
}

async function setConfig(keyValue) {
  const [key, value] = keyValue.split("=");

  if (!key || value === undefined) {
    console.log(chalk.red("Invalid format. Use: --set key=value"));
    return;
  }

  try {
    const config = ConfigManager.getConfig();

    // Set the value using dot notation
    setNestedValue(config, key, parseValue(value));

    // Save updated config
    ConfigManager.saveConfig(config);

    console.log(chalk.green(`Configuration updated: ${key} = ${value}`));
  } catch (error) {
    console.log(chalk.red(`Failed to update configuration: ${error.message}`));
  }
}

async function resetConfig() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await new Promise((resolve) => {
    rl.question(
      chalk.yellow("⚠️  Reset configuration to defaults? (y/N): "),
      resolve,
    );
  });
  rl.close();

  if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
    try {
      const configPath = path.join(process.cwd(), ".neurolint.json");
      if (fs.existsSync(configPath)) {
        fs.unlinkSync(configPath);
      }

      console.log(
        chalk.green(
          "Configuration reset. Run `neurolint init` to create new config.",
        ),
      );
    } catch (error) {
      console.log(chalk.red(`Failed to reset configuration: ${error.message}`));
    }
  } else {
    console.log(chalk.gray("Configuration reset cancelled."));
  }
}

async function interactiveConfig() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(chalk.bold("⚙️  NeuroLint Interactive Configuration"));
  console.log(chalk.gray("======================================="));
  console.log();

  try {
    const config = ConfigManager.getConfig();

    // Layer selection
    console.log(chalk.yellow("Layer Configuration:"));
    console.log("Available layers:");
    Object.entries(config.layers.config).forEach(([num, layer]) => {
      const enabled = config.layers.enabled.includes(parseInt(num));
      const status = enabled ? chalk.green("[ON]") : chalk.gray("[OFF]");
      console.log(`   ${status} ${num}. ${layer.name}`);
    });

    const layerAnswer = await new Promise((resolve) => {
      rl.question(
        "\nEnter layers to enable (comma-separated, e.g., 1,2,3): ",
        resolve,
      );
    });

    if (layerAnswer.trim()) {
      const newLayers = layerAnswer
        .split(",")
        .map((l) => parseInt(l.trim()))
        .filter((l) => !isNaN(l));
      config.layers.enabled = newLayers;
      console.log(chalk.green(`Enabled layers: ${newLayers.join(", ")}`));
    }

    // Output format
    const formatAnswer = await new Promise((resolve) => {
      rl.question(
        `\nOutput format (table/json/summary) [${config.output.format}]: `,
        resolve,
      );
    });

    if (formatAnswer.trim()) {
      config.output.format = formatAnswer.trim();
      console.log(chalk.green(`Output format: ${config.output.format}`));
    }

    // API URL
    const apiAnswer = await new Promise((resolve) => {
      rl.question(`\nAPI URL [${config.api.url}]: `, resolve);
    });

    if (apiAnswer.trim()) {
      config.api.url = apiAnswer.trim();
      console.log(chalk.green(`API URL: ${config.api.url}`));
    }

    // Save configuration
    ConfigManager.saveConfig(config);
    console.log();
    console.log(chalk.green("Configuration saved successfully!"));
  } catch (error) {
    console.log(chalk.red(`Configuration error: ${error.message}`));
  }

  rl.close();
}

function setNestedValue(obj, path, value) {
  const keys = path.split(".");
  let current = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }

  current[keys[keys.length - 1]] = value;
}

function parseValue(value) {
  // Try to parse as JSON first
  try {
    return JSON.parse(value);
  } catch {
    // If that fails, return as string
    return value;
  }
}

module.exports = { configCommand };
