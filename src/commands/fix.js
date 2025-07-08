import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";
import { glob } from "glob";
import { ApiClient } from "../utils/ApiClient.js";
import { ConfigManager } from "../utils/ConfigManager.js";
import { LayerExecutor } from "../layers/LayerExecutor.js";

async function fixCommand(targetPath, options) {
  const spinner = ora("Initializing fixes...").start();

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

    // Collect files to fix
    const files = await collectFiles(targetPath, options);

    if (files.length === 0) {
      spinner.warn("No files found to fix");
      return;
    }

    spinner.succeed(`Found ${files.length} files to process`);

    // Create backups if requested
    if (options.backup && !options.dryRun) {
      await createBackups(files);
    }

    // Execute fixes
    console.log(chalk.blue("Starting NeuroLint Fixes"));
    console.log(chalk.gray("=".repeat(50)));

    if (options.dryRun) {
      console.log(chalk.yellow("DRY RUN MODE - No changes will be made"));
      console.log();
    }

    const results = await executeFixes(files, layers, options);

    // Display results
    displayFixResults(results, options);
  } catch (error) {
    spinner.fail(`Fix operation failed: ${error.message}`);
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
    ? `${targetPath}/**/*.{ts,tsx,js,jsx}`
    : `${targetPath}/*.{ts,tsx,js,jsx}`;

  const files = await glob(pattern, {
    ignore: ["node_modules/**", "dist/**", "build/**"],
  });

  return files.filter((file) => {
    const stat = fs.statSync(file);
    return stat.isFile() && stat.size < 10 * 1024 * 1024; // 10MB limit
  });
}

async function createBackups(files) {
  const backupDir = `.neurolint-backup-${Date.now()}`;

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  for (const file of files) {
    const backupPath = path.join(backupDir, file);
    const backupDirPath = path.dirname(backupPath);

    if (!fs.existsSync(backupDirPath)) {
      fs.mkdirSync(backupDirPath, { recursive: true });
    }

    fs.copyFileSync(file, backupPath);
  }

  console.log(chalk.green(`Backup created: ${backupDir}`));
}

async function executeFixes(files, layers, options) {
  const layerExecutor = new LayerExecutor();
  const results = {
    summary: {
      filesProcessed: files.length,
      layersUsed: layers,
      changesApplied: 0,
      timestamp: new Date().toISOString(),
      dryRun: options.dryRun,
    },
    changes: [],
    layers: {},
  };

  // Try API fixes first, fall back to local
  try {
    const apiClient = new ApiClient();
    const apiResults = await apiClient.fixFiles(files, layers, options.dryRun);

    if (apiResults.success) {
      results.changes = apiResults.changes || [];
      results.summary.changesApplied = results.changes.length;
      results.source = "api";

      // Apply changes if not dry run
      if (!options.dryRun) {
        await applyApiChanges(apiResults.changes);
      }

      return results;
    }
  } catch (error) {
    console.log(chalk.yellow("API unavailable, using local fixes"));
  }

  // Local fixes using layer scripts
  for (const layer of layers) {
    const spinner = ora(`Applying Layer ${layer} fixes...`).start();

    try {
      const layerResults = await layerExecutor.executeLayerFixes(
        layer,
        files,
        options.dryRun,
      );
      results.layers[layer] = layerResults;
      results.changes.push(...layerResults.changes);

      spinner.succeed(
        `Layer ${layer} completed (${layerResults.changes.length} changes)`,
      );
    } catch (error) {
      spinner.fail(`Layer ${layer} failed: ${error.message}`);
    }
  }

  results.summary.changesApplied = results.changes.length;
  results.source = "local";

  return results;
}

async function applyApiChanges(changes) {
  for (const change of changes) {
    if (change.type === "file-replace") {
      fs.writeFileSync(change.file, change.newContent);
    } else if (change.type === "file-patch") {
      // Apply patch-style changes
      const content = fs.readFileSync(change.file, "utf8");
      const newContent = applyPatch(content, change.patch);
      fs.writeFileSync(change.file, newContent);
    }
  }
}

function applyPatch(content, patch) {
  // Simple patch application - in production would use a proper patch library
  const lines = content.split("\n");

  for (const operation of patch.operations) {
    if (operation.type === "replace") {
      lines[operation.line] = operation.newText;
    } else if (operation.type === "insert") {
      lines.splice(operation.line, 0, operation.text);
    } else if (operation.type === "delete") {
      lines.splice(operation.line, 1);
    }
  }

  return lines.join("\n");
}

function displayFixResults(results, options) {
  console.log();

  const { summary, changes } = results;

  // Header
  console.log(
    chalk.bold("┌─────────────────────────────────────────────────┐"),
  );
  console.log(
    chalk.bold("│                 Fix Results                     │"),
  );
  console.log(
    chalk.bold("├────────���────────────────────────────────────────┤"),
  );
  console.log(
    `│ Files processed: ${String(summary.filesProcessed).padEnd(30)} │`,
  );
  console.log(
    `│ Changes applied: ${String(summary.changesApplied).padEnd(30)} │`,
  );
  console.log(
    `│ Layers used: [${summary.layersUsed.join(", ")}]${" ".repeat(32 - summary.layersUsed.join(", ").length)} │`,
  );

  if (summary.dryRun) {
    console.log(`│ Mode: ${chalk.yellow("DRY RUN").padEnd(41)} │`);
  }

  console.log(
    chalk.bold("└���────────────────────────────────────────────────┘"),
  );

  if (changes.length > 0) {
    console.log();
    console.log(chalk.bold("Changes Made:"));
    console.log(chalk.gray("=".repeat(50)));

    const groupedChanges = groupChangesByFile(changes);

    Object.entries(groupedChanges)
      .slice(0, 10)
      .forEach(([file, fileChanges]) => {
        console.log(`📝 ${chalk.blue(file)} (${fileChanges.length} changes)`);

        fileChanges.slice(0, 3).forEach((change) => {
          const changeType = getChangeType(change.type);
          console.log(
            `   ${changeType} ${change.description || change.rule || change.type}`,
          );
          if (change.layer) {
            console.log(`      ${chalk.gray(`Layer ${change.layer}`)}`);
          }
        });

        if (fileChanges.length > 3) {
          console.log(
            `   ${chalk.gray(`... and ${fileChanges.length - 3} more changes`)}`,
          );
        }
        console.log();
      });

    if (Object.keys(groupedChanges).length > 10) {
      console.log(
        chalk.gray(
          `... and ${Object.keys(groupedChanges).length - 10} more files`,
        ),
      );
    }

    if (options.dryRun) {
      console.log(chalk.yellow("Run without --dry-run to apply these changes"));
    } else {
      console.log(chalk.green("All fixes have been applied successfully!"));
    }
  } else {
    console.log(
      chalk.green("\nNo fixes needed! Your code is already optimized."),
    );
  }
}

function groupChangesByFile(changes) {
  return changes.reduce((groups, change) => {
    const file = change.file || "unknown";
    if (!groups[file]) {
      groups[file] = [];
    }
    groups[file].push(change);
    return groups;
  }, {});
}

function getChangeType(type) {
  switch (type) {
    case "fix":
      return "[FIX]";
    case "refactor":
      return "[REF]";
    case "optimize":
      return "[OPT]";
    case "style":
      return "[STY]";
    case "security":
      return "[SEC]";
    default:
      return "[CHG]";
  }
}

module.exports = { fixCommand };
