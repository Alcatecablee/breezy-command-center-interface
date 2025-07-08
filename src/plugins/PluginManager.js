import fs from "fs";
import path from "path";
import chalk from "chalk";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

class PluginManager {
  constructor() {
    this.plugins = new Map();
    this.hooks = new Map();
    this.pluginDirs = [
      path.join(process.cwd(), "neurolint-plugins"),
      path.join(process.cwd(), "node_modules/@neurolint"),
      path.join(__dirname, "../plugins"),
    ];
  }

  async loadPlugins() {
    console.log(chalk.blue("🔌 Loading plugins..."));

    for (const dir of this.pluginDirs) {
      if (fs.existsSync(dir)) {
        await this.loadPluginsFromDirectory(dir);
      }
    }

    console.log(chalk.green(`✅ Loaded ${this.plugins.size} plugins`));
  }

  async loadPluginsFromDirectory(directory) {
    try {
      const entries = fs.readdirSync(directory, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() || entry.name.endsWith(".js")) {
          await this.loadPlugin(path.join(directory, entry.name));
        }
      }
    } catch (error) {
      console.warn(
        chalk.yellow(`Warning: Could not load plugins from ${directory}`),
      );
    }
  }

  async loadPlugin(pluginPath) {
    try {
      const pluginModule = require(pluginPath);
      const plugin =
        typeof pluginModule === "function" ? pluginModule() : pluginModule;

      if (!plugin.name) {
        plugin.name = path.basename(pluginPath, ".js");
      }

      // Validate plugin structure
      if (!this.validatePlugin(plugin)) {
        console.warn(chalk.yellow(`Invalid plugin: ${plugin.name}`));
        return;
      }

      this.plugins.set(plugin.name, plugin);

      // Register plugin hooks
      if (plugin.hooks) {
        Object.entries(plugin.hooks).forEach(([hookName, handler]) => {
          this.registerHook(hookName, handler, plugin.name);
        });
      }

      console.log(chalk.gray(`  • Loaded plugin: ${plugin.name}`));
    } catch (error) {
      console.warn(
        chalk.yellow(`Failed to load plugin ${pluginPath}: ${error.message}`),
      );
    }
  }

  validatePlugin(plugin) {
    return (
      plugin &&
      typeof plugin.name === "string" &&
      (plugin.analyze || plugin.fix || plugin.hooks)
    );
  }

  registerHook(hookName, handler, pluginName) {
    if (!this.hooks.has(hookName)) {
      this.hooks.set(hookName, []);
    }

    this.hooks.get(hookName).push({
      handler,
      pluginName,
    });
  }

  async executeHook(hookName, context = {}) {
    const hooks = this.hooks.get(hookName) || [];
    const results = [];

    for (const { handler, pluginName } of hooks) {
      try {
        const result = await handler(context);
        results.push({ pluginName, result });
      } catch (error) {
        console.warn(
          chalk.yellow(
            `Hook ${hookName} failed in plugin ${pluginName}: ${error.message}`,
          ),
        );
      }
    }

    return results;
  }

  async analyzeWithPlugins(files, layers) {
    const context = { files, layers };

    // Pre-analysis hook
    await this.executeHook("pre-analyze", context);

    const results = [];

    // Execute plugin analyzers
    for (const [name, plugin] of this.plugins) {
      if (plugin.analyze) {
        try {
          const result = await plugin.analyze(context);
          if (result) {
            results.push({ plugin: name, ...result });
          }
        } catch (error) {
          console.warn(
            chalk.yellow(`Plugin ${name} analysis failed: ${error.message}`),
          );
        }
      }
    }

    // Post-analysis hook
    await this.executeHook("post-analyze", { ...context, results });

    return results;
  }

  async fixWithPlugins(files, layers, options = {}) {
    const context = { files, layers, options };

    // Pre-fix hook
    await this.executeHook("pre-fix", context);

    const fixes = [];

    // Execute plugin fixers
    for (const [name, plugin] of this.plugins) {
      if (plugin.fix) {
        try {
          const result = await plugin.fix(context);
          if (result && result.fixes) {
            fixes.push(
              ...result.fixes.map((fix) => ({ ...fix, plugin: name })),
            );
          }
        } catch (error) {
          console.warn(
            chalk.yellow(`Plugin ${name} fix failed: ${error.message}`),
          );
        }
      }
    }

    // Post-fix hook
    await this.executeHook("post-fix", { ...context, fixes });

    return fixes;
  }

  getPluginInfo() {
    return Array.from(this.plugins.entries()).map(([name, plugin]) => ({
      name,
      version: plugin.version || "1.0.0",
      description: plugin.description || "No description",
      hooks: plugin.hooks ? Object.keys(plugin.hooks) : [],
      hasAnalyzer: !!plugin.analyze,
      hasFixer: !!plugin.fix,
    }));
  }

  async installPlugin(pluginName) {
    // Plugin installation logic would go here
    console.log(chalk.blue(`Installing plugin: ${pluginName}`));
    // This would typically use npm install or download from registry
  }

  unloadPlugin(pluginName) {
    if (this.plugins.has(pluginName)) {
      this.plugins.delete(pluginName);

      // Remove hooks from this plugin
      for (const [hookName, hooks] of this.hooks) {
        const filtered = hooks.filter((h) => h.pluginName !== pluginName);
        if (filtered.length === 0) {
          this.hooks.delete(hookName);
        } else {
          this.hooks.set(hookName, filtered);
        }
      }

      console.log(chalk.green(`Unloaded plugin: ${pluginName}`));
    }
  }
}

module.exports = { PluginManager };
