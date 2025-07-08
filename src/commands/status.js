const chalk = require("chalk");
const ora = require("ora");
const fs = require("fs");
const path = require("path");
const { ConfigManager } = require("../utils/ConfigManager");
const { ApiClient } = require("../utils/ApiClient");
const { getAuthData } = require("./auth");

async function statusCommand(options) {
  const spinner = ora("Checking NeuroLint status...").start();

  try {
    const status = await gatherStatus();
    spinner.succeed("Status check complete");

    displayStatus(status, options.detailed);
  } catch (error) {
    spinner.fail(`Status check failed: ${error.message}`);
    if (options.debug) {
      console.error(error.stack);
    }
  }
}

async function gatherStatus() {
  const status = {
    project: await checkProjectStatus(),
    config: await checkConfigStatus(),
    auth: await checkAuthStatus(),
    api: await checkApiStatus(),
    environment: await checkEnvironmentStatus(),
  };

  return status;
}

async function checkProjectStatus() {
  const cwd = process.cwd();
  const projectInfo = {
    path: cwd,
    name: path.basename(cwd),
    initialized: false,
    packageJson: false,
    tsconfig: false,
    nextConfig: false,
  };

  // Check if NeuroLint is initialized
  projectInfo.initialized = fs.existsSync(path.join(cwd, ".neurolint.json"));

  // Check for common project files
  projectInfo.packageJson = fs.existsSync(path.join(cwd, "package.json"));
  projectInfo.tsconfig = fs.existsSync(path.join(cwd, "tsconfig.json"));
  projectInfo.nextConfig =
    fs.existsSync(path.join(cwd, "next.config.js")) ||
    fs.existsSync(path.join(cwd, "next.config.mjs"));

  // Detect project type
  if (projectInfo.packageJson) {
    try {
      const pkg = JSON.parse(
        fs.readFileSync(path.join(cwd, "package.json"), "utf8"),
      );
      projectInfo.type = detectProjectType(pkg);
      projectInfo.dependencies = Object.keys(pkg.dependencies || {}).length;
      projectInfo.devDependencies = Object.keys(
        pkg.devDependencies || {},
      ).length;
    } catch (error) {
      projectInfo.type = "unknown";
    }
  }

  return projectInfo;
}

async function checkConfigStatus() {
  try {
    const config = ConfigManager.getConfig();
    return {
      valid: true,
      config,
      enabledLayers: config.layers?.enabled || [],
      filePatterns: {
        include: config.files?.include?.length || 0,
        exclude: config.files?.exclude?.length || 0,
      },
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}

async function checkAuthStatus() {
  const authData = getAuthData();

  if (!authData) {
    return {
      authenticated: false,
    };
  }

  return {
    authenticated: true,
    user: authData.user?.name || "Unknown",
    email: authData.user?.email || "Unknown",
    plan: authData.user?.plan || "Unknown",
    apiUrl: authData.apiUrl,
  };
}

async function checkApiStatus() {
  try {
    const apiClient = new ApiClient();
    const healthCheck = await apiClient.healthCheck();

    return {
      available: true,
      status: healthCheck.status,
      version: healthCheck.version,
      responseTime: healthCheck.responseTime,
    };
  } catch (error) {
    return {
      available: false,
      error: error.message,
    };
  }
}

async function checkEnvironmentStatus() {
  const nodeVersion = process.version;
  const platform = process.platform;
  const arch = process.arch;
  const memory = process.memoryUsage();

  return {
    node: {
      version: nodeVersion,
      compatible: satisfiesNodeVersion(nodeVersion),
    },
    system: {
      platform,
      arch,
      memory: {
        used: Math.round(memory.heapUsed / 1024 / 1024),
        total: Math.round(memory.heapTotal / 1024 / 1024),
      },
    },
  };
}

function detectProjectType(packageJson) {
  const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

  if (deps.next) return "Next.js";
  if (deps.react) return "React";
  if (deps.vue) return "Vue.js";
  if (deps.svelte) return "Svelte";
  if (deps.typescript) return "TypeScript";
  if (deps.express || deps.fastify || deps.koa) return "Node.js API";

  return "JavaScript";
}

function satisfiesNodeVersion(version) {
  const major = parseInt(version.slice(1).split(".")[0]);
  return major >= 16;
}

function displayStatus(status, detailed) {
  console.log();
  console.log(chalk.bold("NeuroLint Status Report"));
  console.log(chalk.gray("=========================="));

  // Project Status
  console.log();
  console.log(chalk.bold("Project"));
  console.log(`   Path: ${chalk.blue(status.project.path)}`);
  console.log(`   Type: ${chalk.white(status.project.type || "Unknown")}`);
  console.log(
    `   NeuroLint: ${status.project.initialized ? chalk.green("Initialized") : chalk.red("Not initialized")}`,
  );

  if (detailed) {
    console.log(
      `   Package.json: ${status.project.packageJson ? chalk.green("Yes") : chalk.red("No")}`,
    );
    console.log(
      `   TypeScript: ${status.project.tsconfig ? chalk.green("Yes") : chalk.red("No")}`,
    );
    console.log(
      `   Next.js: ${status.project.nextConfig ? chalk.green("Yes") : chalk.red("No")}`,
    );
    if (status.project.dependencies) {
      console.log(
        `   Dependencies: ${chalk.white(status.project.dependencies)} prod, ${chalk.white(status.project.devDependencies)} dev`,
      );
    }
  }

  // Configuration Status
  console.log();
  console.log(chalk.bold("Configuration"));
  if (status.config.valid) {
    console.log(`   Status: ${chalk.green("Valid")}`);
    console.log(
      `   Enabled Layers: ${chalk.white(status.config.enabledLayers.join(", "))}`,
    );
    if (detailed) {
      console.log(
        `   Include Patterns: ${chalk.white(status.config.filePatterns.include)}`,
      );
      console.log(
        `   Exclude Patterns: ${chalk.white(status.config.filePatterns.exclude)}`,
      );
    }
  } else {
    console.log(`   Status: ${chalk.red("Invalid")}`);
    console.log(`   Error: ${chalk.red(status.config.error)}`);
  }

  // Authentication Status
  console.log();
  console.log(chalk.bold("Authentication"));
  if (status.auth.authenticated) {
    console.log(`   Status: ${chalk.green("Authenticated")}`);
    console.log(`   User: ${chalk.white(status.auth.user)}`);
    console.log(`   Plan: ${chalk.white(status.auth.plan)}`);
    if (detailed) {
      console.log(`   Email: ${chalk.white(status.auth.email)}`);
      console.log(`   API URL: ${chalk.white(status.auth.apiUrl)}`);
    }
  } else {
    console.log(`   Status: ${chalk.yellow("Not authenticated")}`);
    console.log(`   Note: ${chalk.gray("Some features may be limited")}`);
  }

  // API Status
  console.log();
  console.log(chalk.bold("API Connection"));
  if (status.api.available) {
    console.log(`   Status: ${chalk.green("Available")}`);
    console.log(`   Version: ${chalk.white(status.api.version || "Unknown")}`);
    if (detailed && status.api.responseTime) {
      console.log(
        `   Response Time: ${chalk.white(status.api.responseTime)}ms`,
      );
    }
  } else {
    console.log(`   Status: ${chalk.red("Unavailable")}`);
    console.log(`   Error: ${chalk.red(status.api.error)}`);
    console.log(`   Note: ${chalk.gray("Local analysis will be used")}`);
  }

  // Environment Status
  if (detailed) {
    console.log();
    console.log(chalk.bold("Environment"));
    console.log(
      `   Node.js: ${status.environment.node.compatible ? chalk.green("Compatible") : chalk.red("Incompatible")} ${status.environment.node.version}`,
    );
    console.log(
      `   Platform: ${chalk.white(status.environment.system.platform)} (${status.environment.system.arch})`,
    );
    console.log(
      `   Memory: ${chalk.white(status.environment.system.memory.used)}MB / ${chalk.white(status.environment.system.memory.total)}MB`,
    );
  }

  // Recommendations
  console.log();
  console.log(chalk.bold("Recommendations"));

  if (!status.project.initialized) {
    console.log(`   Run ${chalk.cyan("neurolint init")} to set up NeuroLint`);
  }

  if (!status.auth.authenticated) {
    console.log(
      `   Run ${chalk.cyan("neurolint login")} for advanced features`,
    );
  }

  if (!status.api.available) {
    console.log(`   Check internet connection for API features`);
  }

  if (!status.environment.node.compatible) {
    console.log(`   Upgrade Node.js to version 16 or higher`);
  }

  if (
    status.project.initialized &&
    status.config.valid &&
    status.config.enabledLayers.length > 0
  ) {
    console.log(
      `   Your setup looks good! Try ${chalk.cyan("neurolint analyze")}`,
    );
  }
}

module.exports = { statusCommand };
