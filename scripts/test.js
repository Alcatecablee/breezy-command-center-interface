#!/usr/bin/env node

/**
 * NeuroLint CLI Test Script
 * Comprehensive testing suite for CLI functionality
 */

const fs = require("fs");
const path = require("path");
const { execSync, spawn } = require("child_process");
const chalk = require("chalk");

console.log(chalk.bold.blue("🧪 NeuroLint CLI Test Suite"));
console.log(chalk.gray("============================"));

// Test configuration
const testConfig = {
  cliPath: path.join(__dirname, "..", "dist", "cli-production.js"),
  testDir: path.join(__dirname, "..", "test-temp"),
  timeout: 30000,
};

// Test results
const testResults = {
  passed: 0,
  failed: 0,
  tests: [],
};

async function runTests() {
  try {
    // Setup test environment
    await setupTestEnvironment();

    // Run test suites
    await testBasicCommands();
    await testConfigurationCommands();
    await testAnalysisCommands();
    await testErrorHandling();

    // Cleanup
    await cleanupTestEnvironment();

    // Report results
    reportResults();
  } catch (error) {
    console.error(chalk.red("❌ Test suite failed:"), error.message);
    process.exit(1);
  }
}

async function setupTestEnvironment() {
  console.log(chalk.yellow("📁 Setting up test environment..."));

  // Check if CLI exists
  if (!fs.existsSync(testConfig.cliPath)) {
    throw new Error('CLI not built. Run "npm run build" first.');
  }

  // Create test directory
  if (fs.existsSync(testConfig.testDir)) {
    fs.rmSync(testConfig.testDir, { recursive: true });
  }
  fs.mkdirSync(testConfig.testDir, { recursive: true });

  // Create test files
  createTestFiles();

  console.log(chalk.green("✅ Test environment ready"));
}

function createTestFiles() {
  const testFiles = [
    {
      path: "test.ts",
      content: `
const component = () => {
  return <div>Hello World</div>;
};
export default component;
`,
    },
    {
      path: "test.js",
      content: `
function hello() {
  console.log("Hello World");
}
module.exports = hello;
`,
    },
    {
      path: "package.json",
      content: JSON.stringify(
        {
          name: "test-project",
          version: "1.0.0",
          dependencies: {
            react: "18.0.0",
          },
        },
        null,
        2,
      ),
    },
  ];

  testFiles.forEach((file) => {
    const filePath = path.join(testConfig.testDir, file.path);
    fs.writeFileSync(filePath, file.content);
  });
}

async function testBasicCommands() {
  console.log(chalk.yellow("\n🔧 Testing basic commands..."));

  const basicTests = [
    {
      name: "Version command",
      command: ["--version"],
      expectExit: 0,
      expectOutput: /\d+\.\d+\.\d+/,
    },
    {
      name: "Help command",
      command: ["--help"],
      expectExit: 0,
      expectOutput: /Usage:/,
    },
    {
      name: "Help alias",
      command: ["help"],
      expectExit: 0,
      expectOutput: /NeuroLint CLI/,
    },
    {
      name: "Invalid command",
      command: ["invalid-command"],
      expectExit: 1,
      expectOutput: /Unknown command/,
    },
  ];

  for (const test of basicTests) {
    await runTest(test);
  }
}

async function testConfigurationCommands() {
  console.log(chalk.yellow("\n⚙️  Testing configuration commands..."));

  // Change to test directory
  const originalCwd = process.cwd();
  process.chdir(testConfig.testDir);

  const configTests = [
    {
      name: "Init command",
      command: ["init"],
      expectExit: 0,
      expectOutput: /initialized successfully/,
      setup: () => {
        // Remove any existing config
        const configPath = path.join(testConfig.testDir, ".neurolint.json");
        if (fs.existsSync(configPath)) {
          fs.unlinkSync(configPath);
        }
      },
      verify: () => {
        const configPath = path.join(testConfig.testDir, ".neurolint.json");
        return fs.existsSync(configPath);
      },
    },
    {
      name: "Status command",
      command: ["status"],
      expectExit: 0,
      expectOutput: /Status Report/,
    },
    {
      name: "Config show",
      command: ["config", "--show"],
      expectExit: 0,
      expectOutput: /Configuration/,
    },
  ];

  for (const test of configTests) {
    await runTest(test);
  }

  // Restore original directory
  process.chdir(originalCwd);
}

async function testAnalysisCommands() {
  console.log(chalk.yellow("\n🔍 Testing analysis commands..."));

  // Change to test directory
  const originalCwd = process.cwd();
  process.chdir(testConfig.testDir);

  const analysisTests = [
    {
      name: "Analyze help",
      command: ["analyze", "--help"],
      expectExit: 0,
      expectOutput: /Analyze code/,
    },
    {
      name: "Fix help",
      command: ["fix", "--help"],
      expectExit: 0,
      expectOutput: /Fix issues/,
    },
    {
      name: "Analyze dry run",
      command: ["analyze", "test.ts", "--output", "json"],
      expectExit: 0,
      expectOutput: /{.*}/,
      timeout: 10000,
    },
  ];

  for (const test of analysisTests) {
    await runTest(test);
  }

  // Restore original directory
  process.chdir(originalCwd);
}

async function testErrorHandling() {
  console.log(chalk.yellow("\n❌ Testing error handling..."));

  const errorTests = [
    {
      name: "Invalid option",
      command: ["analyze", "--invalid-option"],
      expectExit: 1,
      expectOutput: /error|unknown/i,
    },
    {
      name: "Non-existent file",
      command: ["analyze", "non-existent-file.ts"],
      expectExit: 1,
      expectOutput: /not found|does not exist/i,
    },
  ];

  for (const test of errorTests) {
    await runTest(test);
  }
}

async function runTest(test) {
  try {
    // Run setup if provided
    if (test.setup) {
      test.setup();
    }

    const result = await executeCommand(
      test.command,
      test.timeout || testConfig.timeout,
    );

    // Check exit code
    if (test.expectExit !== undefined && result.exitCode !== test.expectExit) {
      throw new Error(
        `Expected exit code ${test.expectExit}, got ${result.exitCode}`,
      );
    }

    // Check output
    if (test.expectOutput) {
      const output = result.stdout + result.stderr;
      if (!test.expectOutput.test(output)) {
        throw new Error(
          `Output doesn't match expected pattern: ${test.expectOutput}`,
        );
      }
    }

    // Run verification if provided
    if (test.verify && !test.verify()) {
      throw new Error("Verification failed");
    }

    console.log(chalk.green(`  ✅ ${test.name}`));
    testResults.passed++;
    testResults.tests.push({ name: test.name, status: "passed" });
  } catch (error) {
    console.log(chalk.red(`  ❌ ${test.name}: ${error.message}`));
    testResults.failed++;
    testResults.tests.push({
      name: test.name,
      status: "failed",
      error: error.message,
    });
  }
}

function executeCommand(args, timeout = testConfig.timeout) {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [testConfig.cliPath, ...args], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    child.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    child.on("close", (code) => {
      resolve({
        exitCode: code,
        stdout,
        stderr,
      });
    });

    child.on("error", (error) => {
      reject(error);
    });

    // Set timeout
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error("Command timed out"));
    }, timeout);

    child.on("close", () => {
      clearTimeout(timer);
    });
  });
}

async function cleanupTestEnvironment() {
  console.log(chalk.yellow("\n🧹 Cleaning up test environment..."));

  if (fs.existsSync(testConfig.testDir)) {
    fs.rmSync(testConfig.testDir, { recursive: true });
  }

  console.log(chalk.green("✅ Cleanup completed"));
}

function reportResults() {
  console.log(chalk.bold("\n📊 Test Results"));
  console.log(chalk.gray("================"));

  const total = testResults.passed + testResults.failed;
  const passRate = Math.round((testResults.passed / total) * 100);

  console.log(`Total tests: ${chalk.white(total)}`);
  console.log(`Passed: ${chalk.green(testResults.passed)}`);
  console.log(`Failed: ${chalk.red(testResults.failed)}`);
  console.log(
    `Pass rate: ${passRate >= 90 ? chalk.green(passRate + "%") : chalk.yellow(passRate + "%")}`,
  );

  if (testResults.failed > 0) {
    console.log(chalk.yellow("\n❌ Failed Tests:"));
    testResults.tests
      .filter((test) => test.status === "failed")
      .forEach((test) => {
        console.log(`  • ${test.name}: ${chalk.red(test.error)}`);
      });
  }

  console.log();
  if (testResults.failed === 0) {
    console.log(
      chalk.green("🎉 All tests passed! CLI is ready for distribution."),
    );
  } else {
    console.log(
      chalk.red("❌ Some tests failed. Please fix issues before distribution."),
    );
    process.exit(1);
  }
}

// Run the test suite
runTests().catch((error) => {
  console.error(chalk.red("❌ Test suite error:"), error.message);
  process.exit(1);
});
