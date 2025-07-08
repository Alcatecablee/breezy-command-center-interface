// Quick demo to test CLI components
const chalk = require("chalk");

console.log(chalk.blue("🚀 NeuroLint CLI Demo Test"));
console.log(chalk.gray("=========================="));

try {
  // Test imports
  const { ConfigManager } = require("./src/utils/ConfigManager");
  const { ApiClient } = require("./src/utils/ApiClient");
  const { LayerExecutor } = require("./src/layers/LayerExecutor");

  console.log(chalk.green("✅ All core modules import successfully"));

  // Test layer info
  const executor = new LayerExecutor();
  const layersInfo = executor.getAllLayersInfo();

  console.log(chalk.yellow("\n📋 Available Layers:"));
  layersInfo.forEach((layer) => {
    const status = layer.available ? chalk.green("✅") : chalk.red("❌");
    console.log(`   ${status} Layer ${layer.number}: ${layer.name}`);
  });

  // Test default config
  console.log(chalk.yellow("\n⚙️  Default Configuration:"));
  const defaultConfig = ConfigManager.getDefaultConfig();
  console.log(`   Version: ${chalk.white(defaultConfig.version)}`);
  console.log(
    `   Enabled Layers: ${chalk.white(defaultConfig.layers.enabled.join(", "))}`,
  );
  console.log(`   API URL: ${chalk.white(defaultConfig.api.url)}`);

  console.log(chalk.green("\n🎉 CLI structure is ready!"));
  console.log(chalk.gray("Ready for: neurolint init, analyze, fix, etc."));
} catch (error) {
  console.error(chalk.red("❌ Demo test failed:"), error.message);
}
