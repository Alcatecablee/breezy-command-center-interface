const chalk = require("chalk");
const ora = require("ora");
const fs = require("fs");
const path = require("path");
const { glob } = require("glob");
const { ApiClient } = require("../utils/ApiClient");
const { ConfigManager } = require("../utils/ConfigManager");
const { LayerExecutor } = require("../layers/LayerExecutor");

async function analyzeCommand(targetPath, options) {
  const spinner = ora("Initializing analysis...").start();

  try {
    // Validate target path
    if (!fs.existsSync(targetPath)) {
      spinner.fail(`Path not found: ${targetPath}`);
      return;
    }

    // Load configuration
    const config = ConfigManager.getConfig();
    const layers = options.layers.split(",").map((l) => parseInt(l.trim()));

    spinner.text = "Collecting files...";

    // Collect files to analyze
    const files = await collectFiles(targetPath, options);

    if (files.length === 0) {
      spinner.warn("No files found to analyze");
      return;
    }

    spinner.succeed(`Found ${files.length} files to analyze`);

    // Execute analysis
    console.log(chalk.blue("🔍 Starting NeuroLint Analysis"));
    console.log(chalk.gray("=".repeat(50)));

    const results = await executeAnalysis(files, layers, options);

    // Display results
    displayResults(results, options.output);
  } catch (error) {
    spinner.fail(`Analysis failed: ${error.message}`);
    if (options.debug) {
      console.error(error.stack);
    }
  }
}

async function collectFiles(targetPath, options) {
  const isDirectory = fs.statSync(targetPath).isDirectory();

  if (!isDirectory) {
    return [targetPath];
  }

  const pattern = options.recursive
    ? `${targetPath}/${options.include}`
    : `${targetPath}/*.{ts,tsx,js,jsx}`;

  const files = await glob(pattern, {
    ignore: options.exclude.split(",").map((p) => p.trim()),
  });

  return files.filter((file) => {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size < 10 * 1024 * 1024; // 10MB limit
  });
}

async function executeAnalysis(files, layers, options) {
  const layerExecutor = new LayerExecutor();
  const results = {
    summary: {
      filesAnalyzed: files.length,
      layersUsed: layers,
      issuesFound: 0,
      timestamp: new Date().toISOString(),
    },
    issues: [],
    layers: {},
  };

  // Try API analysis first, fall back to local
  try {
    const apiClient = new ApiClient();
    const apiResults = await apiClient.analyzeFiles(files, layers);

    if (apiResults.success) {
      results.issues = apiResults.issues || [];
      results.summary.issuesFound = results.issues.length;
      results.source = "api";
      return results;
    }
  } catch (error) {
    console.log(chalk.yellow("⚠️  API unavailable, using local analysis"));
  }

  // Local analysis using layer scripts
  for (const layer of layers) {
    const spinner = ora(`Running Layer ${layer}...`).start();

    try {
      const layerResults = await layerExecutor.executeLayer(layer, files);
      results.layers[layer] = layerResults;
      results.issues.push(...layerResults.issues);

      spinner.succeed(
        `Layer ${layer} completed (${layerResults.issues.length} issues)`,
      );
    } catch (error) {
      spinner.fail(`Layer ${layer} failed: ${error.message}`);
    }
  }

  results.summary.issuesFound = results.issues.length;
  results.source = "local";

  return results;
}

function displayResults(results, format) {
  console.log();

  switch (format) {
    case "json":
      console.log(JSON.stringify(results, null, 2));
      break;

    case "summary":
      displaySummary(results);
      break;

    case "table":
    default:
      displayTable(results);
      break;
  }
}

function displaySummary(results) {
  console.log(chalk.bold("📊 Analysis Summary"));
  console.log(chalk.gray("=================="));
  console.log(`Files analyzed: ${chalk.white(results.summary.filesAnalyzed)}`);
  console.log(`Issues found: ${chalk.white(results.summary.issuesFound)}`);
  console.log(
    `Layers used: ${chalk.white(results.summary.layersUsed.join(", "))}`,
  );
  console.log(`Source: ${chalk.white(results.source || "unknown")}`);

  if (results.summary.issuesFound > 0) {
    console.log(
      chalk.yellow(`\n💡 Run 'neurolint fix' to automatically fix issues`),
    );
  } else {
    console.log(chalk.green("\n✅ No issues found!"));
  }
}

function displayTable(results) {
  const { summary, issues } = results;

  // Header
  console.log(
    chalk.bold("┌─────────────────────────────────────────────────┐"),
  );
  console.log(
    chalk.bold("│                Analysis Results                 │"),
  );
  console.log(
    chalk.bold("├─────────────────────────────────────────────────┤"),
  );
  console.log(
    `│ Files analyzed: ${String(summary.filesAnalyzed).padEnd(31)} │`,
  );
  console.log(`│ Issues found: ${String(summary.issuesFound).padEnd(33)} │`);
  console.log(
    `│ Layers used: [${summary.layersUsed.join(", ")}]${" ".repeat(31 - summary.layersUsed.join(", ").length)} │`,
  );
  console.log(
    chalk.bold("└─────────────────────────────────────────────────┘"),
  );

  if (issues.length > 0) {
    console.log();
    console.log(chalk.bold("Issues Found:"));
    console.log(chalk.gray("=".repeat(50)));

    issues.slice(0, 10).forEach((issue, index) => {
      const severity = getSeverityIcon(issue.severity);
      console.log(`${severity} ${chalk.blue(issue.file)}`);
      console.log(
        `   ${chalk.yellow(issue.rule || issue.type)}: ${issue.message}`,
      );
      if (issue.layer) {
        console.log(`   ${chalk.gray(`Layer ${issue.layer}`)}`);
      }
      console.log();
    });

    if (issues.length > 10) {
      console.log(chalk.gray(`... and ${issues.length - 10} more issues`));
    }

    console.log(
      chalk.yellow(`💡 Run 'neurolint fix' to automatically fix issues`),
    );
  } else {
    console.log(chalk.green("\n✅ No issues found! Your code looks great."));
  }
}

function getSeverityIcon(severity) {
  switch (severity) {
    case "critical":
      return "🔴";
    case "high":
      return "🟠";
    case "medium":
      return "🟡";
    case "low":
      return "🟢";
    default:
      return "📝";
  }
}

module.exports = { analyzeCommand };
