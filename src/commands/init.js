const chalk = require("chalk");
const ora = require("ora");
const fs = require("fs");
const path = require("path");
const { ConfigManager } = require("../utils/ConfigManager");

async function initCommand(options) {
  const spinner = ora("Initializing NeuroLint...").start();

  try {
    const configPath = path.join(process.cwd(), ".neurolint.json");

    // Check if config already exists
    if (fs.existsSync(configPath) && !options.force) {
      spinner.warn(
        "NeuroLint is already initialized. Use --force to overwrite.",
      );
      return;
    }

    // Create default configuration
    const layers = options.layers.split(",").map((l) => parseInt(l.trim()));
    const config = createDefaultConfig(layers);

    // Write configuration file
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Create additional files if they don't exist
    await createAdditionalFiles();

    spinner.succeed("NeuroLint initialized successfully!");

    // Display next steps
    displayNextSteps(config);
  } catch (error) {
    spinner.fail(`Initialization failed: ${error.message}`);
    if (options.debug) {
      console.error(error.stack);
    }
  }
}

function createDefaultConfig(enabledLayers) {
  return {
    version: "1.0.0",
    layers: {
      enabled: enabledLayers,
      config: {
        1: {
          name: "Configuration Validation",
          description:
            "Validates TypeScript, Next.js, and package.json configurations",
          timeout: 30000,
          enabled: enabledLayers.includes(1),
        },
        2: {
          name: "Pattern & Entity Fixes",
          description:
            "Fixes HTML entities, import patterns, and legacy code patterns",
          timeout: 45000,
          enabled: enabledLayers.includes(2),
        },
        3: {
          name: "Component Best Practices",
          description:
            "Enforces React component best practices and accessibility",
          timeout: 60000,
          enabled: enabledLayers.includes(3),
        },
        4: {
          name: "Hydration & SSR Guard",
          description: "Prevents hydration mismatches and SSR issues",
          timeout: 45000,
          enabled: enabledLayers.includes(4),
        },
        5: {
          name: "Next.js App Router Optimization",
          description:
            "Optimizes for Next.js App Router patterns and performance",
          timeout: 60000,
          enabled: enabledLayers.includes(5),
        },
        6: {
          name: "Quality & Performance",
          description:
            "Adds error handling, testing, and performance optimizations",
          timeout: 75000,
          enabled: enabledLayers.includes(6),
        },
      },
    },
    files: {
      include: [
        "**/*.{ts,tsx,js,jsx}",
        "**/*.{vue,svelte}",
        "**/tsconfig.json",
        "**/next.config.js",
        "**/package.json",
      ],
      exclude: [
        "node_modules/**",
        "dist/**",
        "build/**",
        "out/**",
        ".next/**",
        "coverage/**",
        "**/*.min.js",
        "**/*.d.ts",
      ],
    },
    output: {
      format: "table",
      verbose: false,
      showSuccessfulLayers: true,
    },
    api: {
      url: "https://api.neurolint.dev",
      timeout: 60000,
      retries: 3,
    },
    performance: {
      maxFileSize: 10485760,
      maxFiles: 1000,
      parallelProcessing: true,
    },
    advanced: {
      enableExperimentalFeatures: false,
      customRulesPath: null,
      integrations: {
        eslint: false,
        prettier: false,
        typescript: true,
      },
    },
  };
}

async function createAdditionalFiles() {
  const files = [
    {
      path: ".neurolintignore",
      content: `# NeuroLint ignore patterns
node_modules/
dist/
build/
out/
.next/
coverage/
*.min.js
*.d.ts

# OS generated files
.DS_Store
Thumbs.db

# IDE files
.vscode/
.idea/
*.swp
*.swo

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*`,
    },
    {
      path: ".env.neurolint.example",
      content: `# NeuroLint Environment Configuration
# Copy this file to .env.neurolint and configure your settings

# API Configuration
NEUROLINT_API_KEY=your_api_key_here
NEUROLINT_API_URL=https://api.neurolint.dev

# Debug and Development
NEUROLINT_DEBUG=false
NEUROLINT_VERBOSE=false

# Performance Tuning
NEUROLINT_MAX_FILE_SIZE=10485760
NEUROLINT_MAX_FILES=1000
NEUROLINT_TIMEOUT=60000`,
    },
  ];

  for (const file of files) {
    const filePath = path.join(process.cwd(), file.path);
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, file.content);
    }
  }
}

function displayNextSteps(config) {
  console.log();
  console.log(chalk.bold("🎉 NeuroLint Setup Complete!"));
  console.log(chalk.gray("=".repeat(50)));

  console.log(chalk.yellow("📋 Configuration created:"));
  console.log(`   ${chalk.blue(".neurolint.json")} - Main configuration`);
  console.log(`   ${chalk.blue(".neurolintignore")} - File ignore patterns`);
  console.log(
    `   ${chalk.blue(".env.neurolint.example")} - Environment template`,
  );

  console.log();
  console.log(chalk.yellow("🔧 Enabled Layers:"));
  config.layers.enabled.forEach((layer) => {
    const layerConfig = config.layers.config[layer];
    if (layerConfig) {
      console.log(`   ${chalk.green(layer)}. ${layerConfig.name}`);
      console.log(`      ${chalk.gray(layerConfig.description)}`);
    }
  });

  console.log();
  console.log(chalk.yellow("🚀 Next Steps:"));
  console.log(
    `   1. ${chalk.white("neurolint login")} - Authenticate for advanced features`,
  );
  console.log(
    `   2. ${chalk.white("neurolint status")} - Check project health`,
  );
  console.log(`   3. ${chalk.white("neurolint analyze")} - Analyze your code`);
  console.log(
    `   4. ${chalk.white("neurolint fix --dry-run")} - Preview fixes`,
  );

  console.log();
  console.log(
    chalk.green("💡 Tip: Run `neurolint help` for full command reference"),
  );
}

module.exports = { initCommand };
