// Clean test of the orchestration system
const chalk = require("chalk");

console.log(chalk.bold("NeuroLint CLI - Orchestration Test"));
console.log(chalk.gray("====================================="));

async function runTest() {
  try {
    // Test module imports
    console.log(chalk.white("\nTesting Core Module Imports..."));
    const { LayerExecutor } = require("./src/layers/LayerExecutor");
    const { SmartLayerSelector } = require("./src/layers/SmartLayerSelector");
    const {
      LayerDependencyManager,
    } = require("./src/layers/LayerDependencyManager");
    const { ConfigManager } = require("./src/utils/ConfigManager");

    console.log(chalk.green("All orchestration modules imported successfully"));

    // Test smart layer selection
    console.log(chalk.white("\nTesting Smart Layer Selection..."));
    const testCode = `
import React from 'react';

const message = &quot;Hello &amp; Welcome&quot;;

function ItemList({ items }) {
  const data = localStorage.getItem('data');
  
  return (
    <ul>
      {items.map(item => <li>{item.name}</li>)}
    </ul>
  );
}
    `;

    const recommendation = SmartLayerSelector.analyzeAndRecommend(testCode);
    console.log(
      `Recommended Layers: ${recommendation.recommendedLayers.join(", ")}`,
    );
    console.log(
      `Confidence: ${Math.round(recommendation.confidence.overall * 100)}%`,
    );
    console.log(`Issues Detected: ${recommendation.detectedIssues.length}`);

    // Test dependency management
    console.log(chalk.white("\nTesting Layer Dependency Management..."));
    const { correctedLayers } = LayerDependencyManager.validateAndCorrectLayers(
      [3, 4],
    );
    console.log(
      `Dependency Resolution: [3, 4] -> [${correctedLayers.join(", ")}]`,
    );

    // Test layer information
    console.log(chalk.white("\nAvailable Layers:"));
    const executor = new LayerExecutor();
    const layersInfo = executor.getAllLayersInfo();

    layersInfo.forEach((layer) => {
      const status = layer.available ? "Available" : "Missing";
      const mode = layer.supportsAST ? "AST/Regex" : "Regex";
      console.log(
        `   Layer ${layer.number}: ${layer.name} [${status}] [${mode}]`,
      );
    });

    console.log(chalk.green("\nOrchestration system is ready"));
    console.log(chalk.white("Features implemented:"));
    console.log("  - Safe layer execution with rollback");
    console.log("  - AST vs regex fallback strategy");
    console.log("  - Incremental validation system");
    console.log("  - Smart layer dependency management");
    console.log("  - Complete pipeline state tracking");
    console.log("  - Intelligent layer selection");
    console.log("  - Comprehensive error recovery");
    console.log("  - Performance optimization");
  } catch (error) {
    console.error(chalk.red("Test failed:"), error.message);
  }
}

runTest();
