const fs = require("fs");
const path = require("path");

class ConfigManager {
  static getConfigPath() {
    return path.join(process.cwd(), ".neurolint.json");
  }

  static getConfig() {
    const configPath = this.getConfigPath();

    if (!fs.existsSync(configPath)) {
      throw new Error('NeuroLint not initialized. Run "neurolint init" first.');
    }

    try {
      const configContent = fs.readFileSync(configPath, "utf8");
      const config = JSON.parse(configContent);

      // Validate and migrate config if needed
      return this.validateAndMigrate(config);
    } catch (error) {
      throw new Error(`Invalid configuration file: ${error.message}`);
    }
  }

  static saveConfig(config) {
    const configPath = this.getConfigPath();

    try {
      // Validate config before saving
      this.validateConfig(config);

      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      throw new Error(`Failed to save configuration: ${error.message}`);
    }
  }

  static validateConfig(config) {
    // Check required fields
    if (!config.version) {
      throw new Error("Missing version in configuration");
    }

    if (!config.layers || !config.layers.enabled) {
      throw new Error("Missing layers configuration");
    }

    if (!Array.isArray(config.layers.enabled)) {
      throw new Error("layers.enabled must be an array");
    }

    // Validate layer numbers
    const validLayers = [1, 2, 3, 4, 5, 6];
    const invalidLayers = config.layers.enabled.filter(
      (layer) => !validLayers.includes(layer),
    );

    if (invalidLayers.length > 0) {
      throw new Error(
        `Invalid layers: ${invalidLayers.join(", ")}. Valid layers are: ${validLayers.join(", ")}`,
      );
    }

    // Validate file patterns
    if (!config.files || !config.files.include || !config.files.exclude) {
      throw new Error("Missing file pattern configuration");
    }

    if (
      !Array.isArray(config.files.include) ||
      !Array.isArray(config.files.exclude)
    ) {
      throw new Error("File patterns must be arrays");
    }

    // Validate API configuration
    if (!config.api || !config.api.url) {
      throw new Error("Missing API configuration");
    }

    try {
      new URL(config.api.url);
    } catch {
      throw new Error("Invalid API URL");
    }

    return true;
  }

  static validateAndMigrate(config) {
    // Migrate from older versions
    if (config.version === "0.9.0") {
      config = this.migrateFromV09(config);
    }

    // Ensure all required fields exist with defaults
    const defaultConfig = this.getDefaultConfig();

    return this.mergeWithDefaults(config, defaultConfig);
  }

  static migrateFromV09(config) {
    // Example migration from version 0.9.0 to 1.0.0
    if (!config.advanced) {
      config.advanced = {
        enableExperimentalFeatures: false,
        customRulesPath: null,
        integrations: {
          eslint: false,
          prettier: false,
          typescript: true,
        },
      };
    }

    config.version = "1.0.0";
    return config;
  }

  static mergeWithDefaults(config, defaults) {
    const merged = { ...defaults };

    // Deep merge, preserving user preferences
    Object.keys(config).forEach((key) => {
      if (
        typeof config[key] === "object" &&
        config[key] !== null &&
        !Array.isArray(config[key])
      ) {
        merged[key] = { ...defaults[key], ...config[key] };
      } else {
        merged[key] = config[key];
      }
    });

    return merged;
  }

  static getDefaultConfig() {
    return {
      version: "1.0.0",
      layers: {
        enabled: [1, 2, 3, 4],
        config: {
          1: {
            name: "Configuration Validation",
            description:
              "Validates TypeScript, Next.js, and package.json configurations",
            timeout: 30000,
            enabled: true,
          },
          2: {
            name: "Pattern & Entity Fixes",
            description:
              "Fixes HTML entities, import patterns, and legacy code patterns",
            timeout: 45000,
            enabled: true,
          },
          3: {
            name: "Component Best Practices",
            description:
              "Enforces React component best practices and accessibility",
            timeout: 60000,
            enabled: true,
          },
          4: {
            name: "Hydration & SSR Guard",
            description: "Prevents hydration mismatches and SSR issues",
            timeout: 45000,
            enabled: true,
          },
          5: {
            name: "Next.js App Router Optimization",
            description:
              "Optimizes for Next.js App Router patterns and performance",
            timeout: 60000,
            enabled: false,
          },
          6: {
            name: "Quality & Performance",
            description:
              "Adds error handling, testing, and performance optimizations",
            timeout: 75000,
            enabled: false,
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

  static createConfig(options = {}) {
    const config = this.getDefaultConfig();

    // Apply user options
    if (options.layers) {
      config.layers.enabled = options.layers;
    }

    if (options.apiUrl) {
      config.api.url = options.apiUrl;
    }

    if (options.outputFormat) {
      config.output.format = options.outputFormat;
    }

    return config;
  }

  static isInitialized() {
    return fs.existsSync(this.getConfigPath());
  }

  static getLayerConfig(layerNumber) {
    const config = this.getConfig();
    return config.layers.config[layerNumber.toString()];
  }

  static isLayerEnabled(layerNumber) {
    const config = this.getConfig();
    return config.layers.enabled.includes(layerNumber);
  }

  static enableLayer(layerNumber) {
    const config = this.getConfig();

    if (!config.layers.enabled.includes(layerNumber)) {
      config.layers.enabled.push(layerNumber);
      config.layers.enabled.sort((a, b) => a - b);
    }

    if (config.layers.config[layerNumber.toString()]) {
      config.layers.config[layerNumber.toString()].enabled = true;
    }

    this.saveConfig(config);
  }

  static disableLayer(layerNumber) {
    const config = this.getConfig();

    config.layers.enabled = config.layers.enabled.filter(
      (layer) => layer !== layerNumber,
    );

    if (config.layers.config[layerNumber.toString()]) {
      config.layers.config[layerNumber.toString()].enabled = false;
    }

    this.saveConfig(config);
  }
}

module.exports = { ConfigManager };
