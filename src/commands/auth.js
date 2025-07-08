import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";
import os from "os";
import { ApiClient } from "../utils/ApiClient.js";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const AUTH_FILE = path.join(os.homedir(), ".neurolint-auth.json");

async function loginCommand(options) {
  const spinner = ora("Authenticating...").start();

  try {
    let apiKey = options.apiKey;
    let apiUrl = options.url || "https://api.neurolint.dev";

    // Interactive login if no API key provided
    if (!apiKey) {
      spinner.stop();
      apiKey = await promptForApiKey();
      spinner.start("Verifying credentials...");
    }

    // Validate API key format
    if (!isValidApiKey(apiKey)) {
      spinner.fail("Invalid API key format");
      console.log(
        chalk.yellow(
          "API keys should be in format: nl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
        ),
      );
      return;
    }

    // Test authentication
    const apiClient = new ApiClient(apiUrl, apiKey);
    const authResult = await apiClient.authenticate();

    if (!authResult.success) {
      spinner.fail(`Authentication failed: ${authResult.error}`);
      return;
    }

    // Save credentials
    const authData = {
      apiKey,
      apiUrl,
      user: authResult.user,
      timestamp: new Date().toISOString(),
      expiresAt: authResult.expiresAt,
    };

    fs.writeFileSync(AUTH_FILE, JSON.stringify(authData, null, 2), {
      mode: 0o600,
    });

    spinner.succeed("Authentication successful!");

    // Display user info
    displayUserInfo(authResult.user);
  } catch (error) {
    spinner.fail(`Login failed: ${error.message}`);
    if (options.debug) {
      console.error(error.stack);
    }
  }
}

async function logout() {
  const spinner = ora("Logging out...").start();

  try {
    if (fs.existsSync(AUTH_FILE)) {
      fs.unlinkSync(AUTH_FILE);
      spinner.succeed("Logged out successfully");
    } else {
      spinner.info("Not currently logged in");
    }
  } catch (error) {
    spinner.fail(`Logout failed: ${error.message}`);
  }
}

async function promptForApiKey() {
  const readline = require("readline");
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log(chalk.blue("🔐 NeuroLint Authentication"));
  console.log(chalk.gray("==========================="));
  console.log();
  console.log("To get your API key:");
  console.log(`1. Visit ${chalk.cyan("https://api.neurolint.dev/dashboard")}`);
  console.log("2. Go to Settings → API Keys");
  console.log("3. Create a new API key");
  console.log();

  return new Promise((resolve) => {
    rl.question("Enter your API key: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function isValidApiKey(apiKey) {
  // NeuroLint API keys start with 'nl_' and are 34 characters total
  return /^nl_[a-zA-Z0-9]{32}$/.test(apiKey);
}

function displayUserInfo(user) {
  console.log();
  console.log(chalk.bold("👤 User Information"));
  console.log(chalk.gray("=================="));
  console.log(`Name: ${chalk.white(user.name || "Unknown")}`);
  console.log(`Email: ${chalk.white(user.email || "Unknown")}`);
  console.log(`Plan: ${chalk.white(user.plan || "Free")}`);
  console.log(
    `Usage: ${chalk.white(user.usage || "0")}/${chalk.white(user.limit || "Unlimited")} requests`,
  );

  if (user.features) {
    console.log();
    console.log(chalk.yellow("🎯 Available Features:"));
    user.features.forEach((feature) => {
      console.log(`   ${feature}`);
    });
  }

  console.log();
  console.log(chalk.green("You can now use advanced NeuroLint features!"));
}

function getAuthData() {
  try {
    if (fs.existsSync(AUTH_FILE)) {
      const data = JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));

      // Check if auth is expired
      if (data.expiresAt && new Date() > new Date(data.expiresAt)) {
        fs.unlinkSync(AUTH_FILE);
        return null;
      }

      return data;
    }
  } catch (error) {
    // Ignore errors, just return null
  }

  return null;
}

function isAuthenticated() {
  const authData = getAuthData();
  return authData && authData.apiKey;
}

module.exports = {
  loginCommand,
  logout,
  getAuthData,
  isAuthenticated,
};
