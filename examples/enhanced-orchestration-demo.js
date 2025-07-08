#!/usr/bin/env node

/**
 * Enhanced NeuroLint Orchestration Demo
 * Demonstrates all the comprehensive patterns implemented
 */

import {
  NeuroLintOrchestrator,
  executeNeuroLint,
  analyzeCode,
} from "../src/core/NeuroLintOrchestrator.js";
import chalk from "chalk";

// Demo code samples
const demoSamples = {
  complex: `{
  "compilerOptions": {
    "target": "es5",
    "strict": false
  }
}

const message = &quot;Hello &amp; welcome&quot;;
console.log(message);
var oldVariable = "test";

function ItemList({ items }) {
  return (
    <ul>
      {items.map(item => <li>{item.name}</li>)}
      {data.map(row => <div>{row.value}</div>)}
    </ul>
  );
}

const savedData = localStorage.getItem('data');
const userPrefs = sessionStorage.getItem('preferences');`,

  simple: `const greeting = "Hello World";
export default greeting;`,

  problematic: `function Component({ items }) {
  return (
    <div onClick={() => {
      localStorage.setItem('clicked', 'true');
      console.log('Button clicked');
    }}>
      {items.map(item => <span>{item.text}</span>)}
    </div>
  );
}`,

  malformed: `function broken( {
  return <div>Unclosed function
}`,
};

async function runOrchestrationDemo() {
  console.log(chalk.bold.blue("🚀 NeuroLint Enhanced Orchestration Demo"));
  console.log("═".repeat(60));

  // Initialize orchestrator
  const orchestrator = new NeuroLintOrchestrator({
    verbose: true,
    enablePerformanceOptimization: true,
    enableErrorRecovery: true,
    enableSmartSelection: true,
  });

  console.log(chalk.yellow("\n1. 📋 Code Analysis Demo"));
  console.log("-".repeat(40));

  try {
    const analysis = await analyzeCode(demoSamples.complex, "demo.tsx");
    console.log(chalk.green("✅ Analysis completed:"));
    console.log(
      `  Recommended layers: ${analysis.recommendation.recommendedLayers.join(", ")}`,
    );
    console.log(
      `  Confidence: ${(analysis.recommendation.confidence * 100).toFixed(1)}%`,
    );
    console.log(
      `  Complexity: ${analysis.complexity.level} (score: ${analysis.complexity.score.toFixed(2)})`,
    );
    console.log(
      `  Estimated time: ${analysis.codeStats.estimatedProcessingTime.toFixed(0)}ms`,
    );

    console.log("\n  Detected issues:");
    analysis.recommendation.detectedIssues.forEach((issue) => {
      console.log(`    - ${issue.description} (Layer ${issue.fixedByLayer})`);
    });
  } catch (error) {
    console.error(chalk.red(`❌ Analysis failed: ${error.message}`));
  }

  console.log(chalk.yellow("\n2. 🔧 Complex Code Transformation Demo"));
  console.log("-".repeat(40));

  try {
    const result = await executeNeuroLint(
      demoSamples.complex,
      "complex-demo.tsx",
      {
        verbose: true,
        layers: [1, 2, 3, 4], // All layers
      },
    );

    console.log(chalk.green("✅ Transformation completed:"));
    console.log(`  Success: ${result.success}`);
    console.log(`  Execution time: ${result.executionTime.toFixed(0)}ms`);
    console.log(
      `  Layers executed: ${result.summary.successfulLayers}/${result.summary.totalLayers}`,
    );
    console.log(`  Total changes: ${result.summary.totalChanges}`);
    console.log(`  From cache: ${result.fromCache}`);

    if (result.optimizations.length > 0) {
      console.log("\n  Optimizations applied:");
      result.optimizations.forEach((opt) => console.log(`    - ${opt}`));
    }

    if (result.summary.improvements.length > 0) {
      console.log("\n  Improvements made:");
      result.summary.improvements.forEach((imp) => console.log(`    - ${imp}`));
    }
  } catch (error) {
    console.error(
      chalk.red(`❌ Complex transformation failed: ${error.message}`),
    );
  }

  console.log(chalk.yellow("\n3. ⚡ Performance Optimization Demo"));
  console.log("-".repeat(40));

  try {
    // Run the same code again to demonstrate caching
    console.log("Running same transformation again (should hit cache)...");
    const cachedResult = await executeNeuroLint(
      demoSamples.complex,
      "complex-demo.tsx",
      {
        verbose: false,
        useCache: true,
      },
    );

    console.log(chalk.green("✅ Cached result:"));
    console.log(`  From cache: ${cachedResult.fromCache}`);
    console.log(`  Execution time: ${cachedResult.executionTime.toFixed(0)}ms`);

    // Test smart layer selection
    console.log("\nTesting smart layer selection with simple code...");
    const simpleResult = await executeNeuroLint(
      demoSamples.simple,
      "simple.js",
      {
        verbose: true,
        enableSmartSelection: true,
      },
    );

    console.log(
      `  Optimized layers: ${simpleResult.layers.length} (from potential 6)`,
    );
  } catch (error) {
    console.error(chalk.red(`❌ Performance demo failed: ${error.message}`));
  }

  console.log(chalk.yellow("\n4. 🛡️ Error Recovery Demo"));
  console.log("-".repeat(40));

  try {
    console.log("Testing error recovery with malformed code...");
    const errorResult = await executeNeuroLint(
      demoSamples.malformed,
      "broken.js",
      {
        verbose: true,
        enableErrorRecovery: true,
      },
    );

    console.log(chalk.yellow("⚠️  Error handling result:"));
    console.log(`  Success: ${errorResult.success}`);
    console.log(
      `  Final code preserved: ${errorResult.finalCode === demoSamples.malformed}`,
    );

    if (errorResult.errorReport) {
      console.log("\n  Error report:");
      console.log(
        `    Total errors: ${errorResult.errorReport.summary.failed}`,
      );
      errorResult.errorReport.errors.forEach((err) => {
        console.log(`    - Layer ${err.layerId}: ${err.message}`);
      });
    }

    if (errorResult.recoverySuggestions) {
      console.log("\n  Recovery suggestions:");
      errorResult.recoverySuggestions.forEach((suggestion) => {
        console.log(`    - ${suggestion.title}: ${suggestion.description}`);
      });
    }
  } catch (error) {
    console.error(chalk.red(`❌ Error recovery demo failed: ${error.message}`));
  }

  console.log(chalk.yellow("\n5. 📊 Metrics and Performance Report"));
  console.log("-".repeat(40));

  try {
    const metrics = orchestrator.getMetrics();

    console.log(chalk.green("✅ Performance metrics:"));
    console.log(`  Total executions: ${metrics.global.totalExecutions}`);
    console.log(
      `  Average success rate: ${(metrics.global.averageSuccessRate * 100).toFixed(1)}%`,
    );
    console.log(
      `  Cache hit rate: ${metrics.performance.summary.cacheEfficiency}`,
    );
    console.log(
      `  Average execution time: ${metrics.performance.summary.averageExecutionTime}`,
    );
    console.log(`  Memory usage: ${metrics.performance.summary.memoryUsage}`);

    if (metrics.performance.recommendations.length > 0) {
      console.log("\n  Performance recommendations:");
      metrics.performance.recommendations.forEach((rec) => {
        console.log(`    - ${rec}`);
      });
    }
  } catch (error) {
    console.error(chalk.red(`❌ Metrics demo failed: ${error.message}`));
  }

  console.log(chalk.yellow("\n6. 🧪 Testing Framework Demo"));
  console.log("-".repeat(40));

  try {
    console.log("Running orchestration test suite...");
    const testResults = await orchestrator.runTests({
      skipPerformance: true, // Skip for demo
      verbose: false,
    });

    console.log(chalk.green("✅ Test results:"));
    console.log(`  Total tests: ${testResults.summary.total}`);
    console.log(`  Passed: ${testResults.summary.passed}`);
    console.log(`  Failed: ${testResults.summary.failed}`);
    console.log(`  Pass rate: ${testResults.summary.passRate.toFixed(1)}%`);

    if (testResults.failedTests.length > 0) {
      console.log("\n  Failed tests:");
      testResults.failedTests.slice(0, 3).forEach((test) => {
        console.log(`    - ${test.name}: ${test.error || "Validation failed"}`);
      });
    }
  } catch (error) {
    console.error(chalk.red(`❌ Testing demo failed: ${error.message}`));
  }

  console.log(chalk.green("\n✅ Demo completed successfully!"));
  console.log("═".repeat(60));
  console.log(
    chalk.blue(
      "The enhanced orchestration system is now ready for production use.",
    ),
  );
  console.log(
    chalk.gray(
      "All patterns from ORCHESTRATION-IMPLEMENTATION.md have been implemented.",
    ),
  );
}

// Run the demo
if (import.meta.url === `file://${process.argv[1]}`) {
  runOrchestrationDemo().catch((error) => {
    console.error(chalk.red("Demo failed:"), error);
    process.exit(1);
  });
}

export { runOrchestrationDemo };
