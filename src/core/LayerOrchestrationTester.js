import chalk from "chalk";
import { performance } from "perf_hooks";
import { EnhancedLayerOrchestrator } from "./EnhancedLayerOrchestrator.js";
import { ErrorRecoverySystem } from "./ErrorRecoverySystem.js";

/**
 * Testing framework for layer orchestration system
 * Includes unit tests, integration tests, and regression testing
 * Implements the Testing Strategies pattern from orchestration guide
 */
class LayerOrchestrationTester {
  constructor() {
    this.testResults = [];
    this.orchestrator = new EnhancedLayerOrchestrator({ verbose: false });
  }

  /**
   * Run comprehensive test suite
   */
  async runTestSuite(options = {}) {
    const {
      skipUnit = false,
      skipIntegration = false,
      skipRegression = false,
      skipPerformance = false,
      verbose = false,
    } = options;

    console.log(
      chalk.bold.blue("🧪 Running NeuroLint Layer Orchestration Test Suite..."),
    );

    const startTime = performance.now();

    try {
      // Unit tests for individual layers
      if (!skipUnit) {
        await this.runUnitTests(verbose);
      }

      // Integration tests for layer combinations
      if (!skipIntegration) {
        await this.runIntegrationTests(verbose);
      }

      // Regression tests with known problematic code
      if (!skipRegression) {
        await this.runRegressionTests(verbose);
      }

      // Performance tests
      if (!skipPerformance) {
        await this.runPerformanceTests(verbose);
      }

      const totalTime = performance.now() - startTime;
      const summary = this.generateSummary(totalTime);

      this.displayResults(summary);

      return summary;
    } catch (error) {
      console.error(chalk.red("❌ Test suite failed:"), error.message);
      throw error;
    }
  }

  /**
   * Test individual layers in isolation
   */
  async runUnitTests(verbose = false) {
    console.log(chalk.blue("\n📋 Running Unit Tests..."));

    const unitTests = [
      {
        name: "Layer 1: TypeScript Config Upgrade",
        input: JSON.stringify(
          {
            compilerOptions: {
              target: "es5",
              strict: false,
              noImplicitAny: false,
            },
          },
          null,
          2,
        ),
        expectedChanges: ["target upgraded", "strict mode enabled"],
        layer: 1,
        category: "config",
      },
      {
        name: "Layer 2: HTML Entity Cleanup",
        input: `const msg = &quot;Hello &amp; Welcome&quot;;
console.log(&lt;div&gt;test&lt;/div&gt;);
var oldVariable = "test";`,
        expectedChanges: [
          "HTML entities converted",
          "console.log removed",
          "var replaced",
        ],
        layer: 2,
        category: "patterns",
      },
      {
        name: "Layer 3: Missing Key Props",
        input: `function ItemList({ items }) {
  return (
    <ul>
      {items.map(item => <li>{item.name}</li>)}
      {data.map(row => <div>{row.value}</div>)}
    </ul>
  );
}`,
        expectedChanges: ["key prop added"],
        layer: 3,
        category: "components",
      },
      {
        name: "Layer 4: SSR Guards",
        input: `const value = localStorage.getItem("key");
const item = sessionStorage.getItem("data");
const width = window.innerWidth;`,
        expectedChanges: ["SSR guard added"],
        layer: 4,
        category: "hydration",
      },
      {
        name: "Layer 5: Next.js Optimizations",
        input: `import { useRouter } from 'next/router';
export default function Page() {
  const router = useRouter();
  return <div>Page</div>;
}`,
        expectedChanges: ["Next.js optimization applied"],
        layer: 5,
        category: "nextjs",
      },
      {
        name: "Layer 6: Testing Setup",
        input: `function sum(a, b) {
  return a + b;
}

// No tests exist
export { sum };`,
        expectedChanges: ["test setup added"],
        layer: 6,
        category: "testing",
      },
    ];

    for (const test of unitTests) {
      await this.runSingleTest(test, verbose);
    }
  }

  /**
   * Test layer combinations and orchestration
   */
  async runIntegrationTests(verbose = false) {
    console.log(chalk.blue("\n🔗 Running Integration Tests..."));

    const integrationTests = [
      {
        name: "Sequential Layer Execution (1,2,3,4)",
        input: this.getComplexTestCode(),
        layers: [1, 2, 3, 4],
        expectedResults: {
          minChanges: 5,
          shouldSucceed: true,
          layersExecuted: 4,
        },
        category: "full-pipeline",
      },
      {
        name: "Partial Layer Execution (2,3)",
        input: this.getComponentTestCode(),
        layers: [2, 3],
        expectedResults: {
          minChanges: 2,
          shouldSucceed: true,
          layersExecuted: 3, // Should auto-add layer 1 dependency
        },
        category: "dependency-resolution",
      },
      {
        name: "Error Recovery Test",
        input: this.getMalformedCode(),
        layers: [1, 2, 3, 4],
        expectedResults: {
          shouldSucceed: false,
          shouldRevert: true,
          finalCodeSameAsInput: true,
        },
        category: "error-handling",
      },
      {
        name: "Smart Layer Selection",
        input: this.getMinimalCode(),
        layers: [1, 2, 3, 4, 5, 6],
        expectedResults: {
          shouldOptimize: true,
          maxLayersExecuted: 2,
        },
        category: "optimization",
      },
    ];

    for (const test of integrationTests) {
      await this.runIntegrationTest(test, verbose);
    }
  }

  /**
   * Test with previously problematic code samples
   */
  async runRegressionTests(verbose = false) {
    console.log(chalk.blue("\n🐛 Running Regression Tests..."));

    const regressionTests = [
      {
        name: "Complex onClick Handler (Regression)",
        input: `<button onClick={(e) => {
  e.preventDefault();
  handleClick(data.id, () => {
    console.log("clicked");
  });
}}>Click</button>`,
        layers: [2, 3],
        shouldNotCorrupt: true,
        category: "jsx-handling",
      },
      {
        name: "Nested Map with Keys (Regression)",
        input: `function NestedList({ data }) {
  return (
    <div>
      {data.map(group => (
        <div key={group.id}>
          {group.items.map(item => <Item key={item.id} data={item} />)}
        </div>
      ))}
    </div>
  );
}`,
        layers: [3],
        shouldPreserveExistingKeys: true,
        category: "key-preservation",
      },
      {
        name: "Complex TypeScript Generics",
        input: `interface ApiResponse<T extends Record<string, any>> {
  data: T[];
  meta: {
    total: number;
    page: number;
  };
}

function useApi<T extends Record<string, any>>(): ApiResponse<T> | null {
  return null;
}`,
        layers: [1, 3],
        shouldPreserveTypes: true,
        category: "typescript-handling",
      },
      {
        name: "Large File Performance",
        input: this.generateLargeTestFile(500), // 500 lines
        layers: [1, 2, 3, 4],
        maxExecutionTime: 5000, // 5 seconds
        category: "performance",
      },
    ];

    for (const test of regressionTests) {
      await this.runRegressionTest(test, verbose);
    }
  }

  /**
   * Performance and load testing
   */
  async runPerformanceTests(verbose = false) {
    console.log(chalk.blue("\n⚡ Running Performance Tests..."));

    const performanceTests = [
      {
        name: "Large File Processing",
        input: this.generateLargeTestFile(1000), // 1000 lines
        layers: [1, 2, 3, 4],
        maxExecutionTime: 10000, // 10 seconds
        category: "large-file",
      },
      {
        name: "Multiple Small Files",
        inputs: Array(20).fill(this.getSmallTestCode()), // 20 small files
        layers: [2, 3],
        maxTotalTime: 15000, // 15 seconds
        category: "batch-processing",
      },
      {
        name: "Cache Efficiency Test",
        input: this.getSmallTestCode(),
        layers: [1, 2, 3],
        repetitions: 5,
        expectedCacheHits: 4, // Should cache after first run
        category: "caching",
      },
      {
        name: "Memory Usage Test",
        input: this.generateLargeTestFile(2000),
        layers: [1, 2, 3, 4, 5, 6],
        maxMemoryIncrease: 100 * 1024 * 1024, // 100MB
        category: "memory",
      },
    ];

    for (const test of performanceTests) {
      await this.runPerformanceTest(test, verbose);
    }
  }

  /**
   * Execute a single unit test case
   */
  async runSingleTest(test, verbose = false) {
    const startTime = performance.now();

    try {
      if (verbose) {
        console.log(chalk.gray(`  Running: ${test.name}`));
      }

      const result = await this.orchestrator.executeLayers(
        test.input,
        [test.layer],
        { verbose: false, dryRun: false },
      );

      const executionTime = performance.now() - startTime;
      const success = this.validateUnitTestResult(result, test);

      this.testResults.push({
        name: test.name,
        type: "unit",
        category: test.category,
        success,
        executionTime,
        details: {
          input: test.input,
          output: result.finalCode,
          expectedChanges: test.expectedChanges,
          actualChanges: result.summary?.improvements || [],
          layersExecuted: result.results?.length || 0,
        },
      });

      const status = success ? chalk.green("✅") : chalk.red("❌");
      console.log(`  ${status} ${test.name} (${executionTime.toFixed(0)}ms)`);
    } catch (error) {
      this.testResults.push({
        name: test.name,
        type: "unit",
        category: test.category,
        success: false,
        executionTime: performance.now() - startTime,
        error: error.message,
      });

      console.log(chalk.red(`  ❌ ${test.name} - ERROR: ${error.message}`));
    }
  }

  /**
   * Execute an integration test
   */
  async runIntegrationTest(test, verbose = false) {
    const startTime = performance.now();

    try {
      if (verbose) {
        console.log(chalk.gray(`  Running: ${test.name}`));
      }

      const result = await this.orchestrator.executeLayers(
        test.input,
        test.layers,
        { verbose: false, dryRun: false },
      );

      const executionTime = performance.now() - startTime;
      const success = this.validateIntegrationTestResult(result, test);

      this.testResults.push({
        name: test.name,
        type: "integration",
        category: test.category,
        success,
        executionTime,
        details: {
          expectedResults: test.expectedResults,
          actualResults: {
            succeeded: result.success,
            layersExecuted: result.results?.length || 0,
            totalChanges: result.summary?.totalChanges || 0,
            finalCodeSameAsInput: result.finalCode === test.input,
          },
        },
      });

      const status = success ? chalk.green("✅") : chalk.red("❌");
      console.log(`  ${status} ${test.name} (${executionTime.toFixed(0)}ms)`);
    } catch (error) {
      this.testResults.push({
        name: test.name,
        type: "integration",
        category: test.category,
        success: false,
        executionTime: performance.now() - startTime,
        error: error.message,
      });

      console.log(chalk.red(`  ❌ ${test.name} - ERROR: ${error.message}`));
    }
  }

  /**
   * Execute a regression test
   */
  async runRegressionTest(test, verbose = false) {
    const startTime = performance.now();

    try {
      if (verbose) {
        console.log(chalk.gray(`  Running: ${test.name}`));
      }

      const result = await this.orchestrator.executeLayers(
        test.input,
        test.layers,
        { verbose: false, dryRun: false },
      );

      const executionTime = performance.now() - startTime;
      const success = this.validateRegressionTestResult(result, test);

      this.testResults.push({
        name: test.name,
        type: "regression",
        category: test.category,
        success,
        executionTime,
        details: {
          shouldNotCorrupt: test.shouldNotCorrupt,
          shouldPreserveExistingKeys: test.shouldPreserveExistingKeys,
          shouldPreserveTypes: test.shouldPreserveTypes,
          maxExecutionTime: test.maxExecutionTime,
          actualExecutionTime: executionTime,
        },
      });

      const status = success ? chalk.green("✅") : chalk.red("❌");
      console.log(`  ${status} ${test.name} (${executionTime.toFixed(0)}ms)`);
    } catch (error) {
      this.testResults.push({
        name: test.name,
        type: "regression",
        category: test.category,
        success: false,
        executionTime: performance.now() - startTime,
        error: error.message,
      });

      console.log(chalk.red(`  ❌ ${test.name} - ERROR: ${error.message}`));
    }
  }

  /**
   * Execute a performance test
   */
  async runPerformanceTest(test, verbose = false) {
    const startTime = performance.now();
    const memoryBefore = process.memoryUsage();

    try {
      if (verbose) {
        console.log(chalk.gray(`  Running: ${test.name}`));
      }

      let success = true;
      let details = {};

      if (test.repetitions) {
        // Cache efficiency test
        let cacheHits = 0;
        for (let i = 0; i < test.repetitions; i++) {
          const result = await this.orchestrator.executeLayers(
            test.input,
            test.layers,
            { verbose: false, useCache: true },
          );
          if (result.fromCache) cacheHits++;
        }

        details.cacheHits = cacheHits;
        details.expectedCacheHits = test.expectedCacheHits;
        success = cacheHits >= test.expectedCacheHits;
      } else if (test.inputs) {
        // Multiple files test
        const results = [];
        for (const input of test.inputs) {
          const result = await this.orchestrator.executeLayers(
            input,
            test.layers,
            { verbose: false },
          );
          results.push(result);
        }

        const totalTime = performance.now() - startTime;
        details.totalTime = totalTime;
        details.maxTotalTime = test.maxTotalTime;
        details.filesProcessed = test.inputs.length;
        success = totalTime <= test.maxTotalTime;
      } else {
        // Single file test
        const result = await this.orchestrator.executeLayers(
          test.input,
          test.layers,
          { verbose: false },
        );

        const executionTime = performance.now() - startTime;
        const memoryAfter = process.memoryUsage();
        const memoryIncrease = memoryAfter.heapUsed - memoryBefore.heapUsed;

        details.executionTime = executionTime;
        details.memoryIncrease = memoryIncrease;
        details.maxExecutionTime = test.maxExecutionTime;
        details.maxMemoryIncrease = test.maxMemoryIncrease;

        success =
          (!test.maxExecutionTime || executionTime <= test.maxExecutionTime) &&
          (!test.maxMemoryIncrease || memoryIncrease <= test.maxMemoryIncrease);
      }

      this.testResults.push({
        name: test.name,
        type: "performance",
        category: test.category,
        success,
        executionTime: performance.now() - startTime,
        details,
      });

      const status = success ? chalk.green("✅") : chalk.red("❌");
      console.log(
        `  ${status} ${test.name} (${(performance.now() - startTime).toFixed(0)}ms)`,
      );
    } catch (error) {
      this.testResults.push({
        name: test.name,
        type: "performance",
        category: test.category,
        success: false,
        executionTime: performance.now() - startTime,
        error: error.message,
      });

      console.log(chalk.red(`  ❌ ${test.name} - ERROR: ${error.message}`));
    }
  }

  /**
   * Validation methods for different test types
   */
  validateUnitTestResult(result, test) {
    if (!result.success) return false;

    // Check if expected changes were made
    const improvements = result.summary?.improvements || [];
    return test.expectedChanges.every((expected) =>
      improvements.some((improvement) =>
        improvement.toLowerCase().includes(expected.toLowerCase()),
      ),
    );
  }

  validateIntegrationTestResult(result, test) {
    const expected = test.expectedResults;

    if (expected.shouldSucceed && !result.success) return false;
    if (expected.shouldSucceed === false && result.success) return false;

    if (
      expected.minChanges &&
      (result.summary?.totalChanges || 0) < expected.minChanges
    )
      return false;
    if (
      expected.layersExecuted &&
      (result.results?.length || 0) !== expected.layersExecuted
    )
      return false;
    if (expected.finalCodeSameAsInput && result.finalCode !== test.input)
      return false;
    if (expected.shouldOptimize && result.optimizations?.length === 0)
      return false;
    if (
      expected.maxLayersExecuted &&
      (result.results?.length || 0) > expected.maxLayersExecuted
    )
      return false;

    return true;
  }

  validateRegressionTestResult(result, test) {
    if (test.shouldNotCorrupt && !result.success) return false;
    if (
      test.shouldPreserveExistingKeys &&
      result.finalCode.includes("key=") &&
      !test.input.includes("key=")
    )
      return false;
    if (
      test.shouldPreserveTypes &&
      !result.finalCode.includes("interface") &&
      test.input.includes("interface")
    )
      return false;
    if (test.maxExecutionTime && result.executionTime > test.maxExecutionTime)
      return false;

    return true;
  }

  /**
   * Generate test code samples
   */
  getComplexTestCode() {
    return `{
  "compilerOptions": {
    "target": "es5",
    "strict": false
  }
}

const message = &quot;Hello &amp; welcome&quot;;
console.log(message);

function ItemList({ items }) {
  return (
    <ul>
      {items.map(item => <li>{item.name}</li>)}
    </ul>
  );
}

const savedData = localStorage.getItem('data');`;
  }

  getComponentTestCode() {
    return `const title = &quot;My Component&quot;;

function MyComponent({ data }) {
  return (
    <div>
      {data.map(item => <span>{item.text}</span>)}
    </div>
  );
}`;
  }

  getMalformedCode() {
    return `function broken( {
  return <div>Unclosed function
}`;
  }

  getMinimalCode() {
    return `const greeting = "Hello World";
export default greeting;`;
  }

  getSmallTestCode() {
    return `const data = &quot;test&quot;;
function Component() {
  return <div>{data}</div>;
}`;
  }

  generateLargeTestFile(lines) {
    const components = [];
    for (let i = 0; i < lines / 10; i++) {
      components.push(`
function Component${i}({ data }) {
  const message = &quot;Component ${i}&quot;;
  console.log("Rendering component ${i}");
  
  return (
    <div>
      {data.map(item => <span>{item.text}</span>)}
      <button onClick={() => localStorage.setItem('key', 'value')}>
        Click me
      </button>
    </div>
  );
}`);
    }
    return components.join("\n");
  }

  /**
   * Generate comprehensive test summary
   */
  generateSummary(totalTime) {
    const total = this.testResults.length;
    const passed = this.testResults.filter((r) => r.success).length;
    const failed = total - passed;

    const byType = this.testResults.reduce((acc, result) => {
      acc[result.type] = acc[result.type] || { total: 0, passed: 0 };
      acc[result.type].total++;
      if (result.success) acc[result.type].passed++;
      return acc;
    }, {});

    const byCategory = this.testResults.reduce((acc, result) => {
      if (result.category) {
        acc[result.category] = acc[result.category] || { total: 0, passed: 0 };
        acc[result.category].total++;
        if (result.success) acc[result.category].passed++;
      }
      return acc;
    }, {});

    const averageExecutionTime =
      this.testResults.reduce((sum, r) => sum + r.executionTime, 0) / total;

    return {
      summary: {
        total,
        passed,
        failed,
        passRate: (passed / total) * 100,
        averageExecutionTime,
        totalTime,
      },
      byType,
      byCategory,
      failedTests: this.testResults.filter((r) => !r.success),
      recommendations: this.generateRecommendations(),
    };
  }

  generateRecommendations() {
    const recommendations = [];
    const failedTests = this.testResults.filter((r) => !r.success);

    if (failedTests.length === 0) {
      recommendations.push(
        "✅ All tests passing! Orchestration system is working correctly.",
      );
    } else {
      recommendations.push(
        `❌ ${failedTests.length} tests failing. Review error messages and fix issues.`,
      );

      // Specific recommendations based on failure patterns
      const syntaxErrors = failedTests.filter((t) =>
        t.error?.includes("Syntax"),
      );
      if (syntaxErrors.length > 0) {
        recommendations.push(
          "🔧 Multiple syntax errors detected. Improve input validation.",
        );
      }

      const performanceIssues = failedTests.filter(
        (t) => t.executionTime > 5000,
      );
      if (performanceIssues.length > 0) {
        recommendations.push(
          "⚡ Performance issues detected. Consider optimization strategies.",
        );
      }

      const regressionFailures = failedTests.filter(
        (t) => t.type === "regression",
      );
      if (regressionFailures.length > 0) {
        recommendations.push(
          "🐛 Regression detected. Check recent changes to layer implementations.",
        );
      }
    }

    return recommendations;
  }

  /**
   * Display formatted test results
   */
  displayResults(summary) {
    console.log("\n" + chalk.bold.blue("📊 Test Results Summary"));
    console.log("═".repeat(50));

    const passRate = summary.summary.passRate.toFixed(1);
    const passRateColor =
      passRate >= 90 ? chalk.green : passRate >= 70 ? chalk.yellow : chalk.red;

    console.log(`Total Tests: ${chalk.white(summary.summary.total)}`);
    console.log(`Passed: ${chalk.green(summary.summary.passed)}`);
    console.log(`Failed: ${chalk.red(summary.summary.failed)}`);
    console.log(`Pass Rate: ${passRateColor(passRate + "%")}`);
    console.log(
      `Average Execution Time: ${chalk.cyan(summary.summary.averageExecutionTime.toFixed(0) + "ms")}`,
    );
    console.log(
      `Total Time: ${chalk.cyan(summary.summary.totalTime.toFixed(0) + "ms")}`,
    );

    // Display by type
    console.log("\n" + chalk.bold("By Test Type:"));
    Object.entries(summary.byType).forEach(([type, stats]) => {
      const rate = ((stats.passed / stats.total) * 100).toFixed(1);
      console.log(`  ${type}: ${stats.passed}/${stats.total} (${rate}%)`);
    });

    // Display by category
    if (Object.keys(summary.byCategory).length > 0) {
      console.log("\n" + chalk.bold("By Category:"));
      Object.entries(summary.byCategory).forEach(([category, stats]) => {
        const rate = ((stats.passed / stats.total) * 100).toFixed(1);
        console.log(`  ${category}: ${stats.passed}/${stats.total} (${rate}%)`);
      });
    }

    // Display failed tests
    if (summary.failedTests.length > 0) {
      console.log("\n" + chalk.bold.red("Failed Tests:"));
      summary.failedTests.forEach((test) => {
        console.log(`  ❌ ${test.name} - ${test.error || "Validation failed"}`);
      });
    }

    // Display recommendations
    if (summary.recommendations.length > 0) {
      console.log("\n" + chalk.bold("Recommendations:"));
      summary.recommendations.forEach((rec) => {
        console.log(`  ${rec}`);
      });
    }

    console.log("═".repeat(50));
  }
}

export { LayerOrchestrationTester };
