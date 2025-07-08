const chalk = require("chalk");
const readline = require("readline");
const { analyzeCommand } = require("./analyze");
const { fixCommand } = require("./fix");
const { statusCommand } = require("./status");
const { configCommand } = require("./config");

async function interactiveCommand(options) {
  console.log(chalk.bold.blue("🚀 NeuroLint Interactive Mode"));
  console.log(chalk.gray("=============================="));
  console.log();
  console.log(chalk.yellow("Available commands:"));
  console.log("  1. analyze [path]     - Analyze code");
  console.log("  2. fix [path]         - Fix issues");
  console.log("  3. status             - Check status");
  console.log("  4. config             - Manage config");
  console.log("  5. help               - Show commands");
  console.log("  6. exit               - Exit interactive mode");
  console.log();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: chalk.blue("neurolint> "),
  });

  rl.prompt();

  rl.on("line", async (input) => {
    const line = input.trim();

    if (!line) {
      rl.prompt();
      return;
    }

    const [command, ...args] = line.split(" ");

    try {
      switch (command.toLowerCase()) {
        case "analyze":
        case "a":
          await handleAnalyze(args);
          break;

        case "fix":
        case "f":
          await handleFix(args);
          break;

        case "status":
        case "s":
          await handleStatus(args);
          break;

        case "config":
        case "c":
          await handleConfig(args);
          break;

        case "help":
        case "h":
        case "?":
          showHelp();
          break;

        case "exit":
        case "quit":
        case "q":
          console.log(chalk.green("👋 Goodbye!"));
          rl.close();
          return;

        case "clear":
          console.clear();
          console.log(chalk.bold.blue("🚀 NeuroLint Interactive Mode"));
          console.log(chalk.gray("=============================="));
          break;

        default:
          console.log(chalk.red(`❌ Unknown command: ${command}`));
          console.log(chalk.gray('Type "help" for available commands'));
          break;
      }
    } catch (error) {
      console.log(chalk.red(`❌ Error: ${error.message}`));
    }

    console.log();
    rl.prompt();
  });

  rl.on("close", () => {
    console.log(chalk.green("\n👋 Exiting NeuroLint interactive mode"));
    process.exit(0);
  });

  // Handle Ctrl+C gracefully
  rl.on("SIGINT", () => {
    console.log();
    rl.question(chalk.yellow("Exit NeuroLint? (y/N): "), (answer) => {
      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
        console.log(chalk.green("👋 Goodbye!"));
        rl.close();
      } else {
        console.log();
        rl.prompt();
      }
    });
  });
}

async function handleAnalyze(args) {
  const path = args[0] || ".";
  const options = {
    recursive: args.includes("--recursive") || args.includes("-r"),
    layers: extractOption(args, "--layers") || "1,2,3,4,5,6",
    output: extractOption(args, "--output") || "table",
    include: extractOption(args, "--include") || "**/*.{ts,tsx,js,jsx}",
    exclude:
      extractOption(args, "--exclude") || "node_modules/**,dist/**,build/**",
  };

  await analyzeCommand(path, options);
}

async function handleFix(args) {
  const path = args[0] || ".";
  const options = {
    dryRun: args.includes("--dry-run"),
    backup: args.includes("--backup"),
    recursive: args.includes("--recursive") || args.includes("-r"),
    layers: extractOption(args, "--layers") || "1,2,3,4,5,6",
  };

  await fixCommand(path, options);
}

async function handleStatus(args) {
  const options = {
    detailed: args.includes("--detailed") || args.includes("-d"),
  };

  await statusCommand(options);
}

async function handleConfig(args) {
  const options = {
    show: args.includes("--show"),
    set: extractOption(args, "--set"),
    reset: args.includes("--reset"),
  };

  await configCommand(options);
}

function extractOption(args, option) {
  const index = args.findIndex((arg) => arg.startsWith(option));
  if (index === -1) return null;

  const arg = args[index];
  if (arg.includes("=")) {
    return arg.split("=")[1];
  }

  return args[index + 1];
}

function showHelp() {
  console.log(chalk.bold("📚 Interactive Commands"));
  console.log(chalk.gray("======================"));
  console.log();

  const commands = [
    {
      cmd: "analyze [path]",
      alias: "a",
      desc: "Analyze code files",
      examples: [
        "analyze",
        "analyze src/",
        "analyze --layers 1,2,3",
        "analyze --output json",
      ],
    },
    {
      cmd: "fix [path]",
      alias: "f",
      desc: "Fix code issues",
      examples: ["fix", "fix src/", "fix --dry-run", "fix --backup"],
    },
    {
      cmd: "status",
      alias: "s",
      desc: "Check project status",
      examples: ["status", "status --detailed"],
    },
    {
      cmd: "config",
      alias: "c",
      desc: "Manage configuration",
      examples: [
        "config --show",
        "config --set api.url=http://localhost:3000",
        "config --reset",
      ],
    },
  ];

  commands.forEach(({ cmd, alias, desc, examples }) => {
    console.log(`${chalk.yellow(cmd)} ${chalk.gray(`(${alias})`)}`);
    console.log(`  ${chalk.white(desc)}`);
    console.log(`  Examples:`);
    examples.forEach((example) => {
      console.log(`    ${chalk.cyan(example)}`);
    });
    console.log();
  });

  console.log(chalk.bold("🔧 General Commands:"));
  console.log(
    `${chalk.yellow("help")} ${chalk.gray("(h, ?)")} - Show this help`,
  );
  console.log(`${chalk.yellow("clear")} - Clear the screen`);
  console.log(
    `${chalk.yellow("exit")} ${chalk.gray("(quit, q)")} - Exit interactive mode`,
  );
  console.log();

  console.log(chalk.bold("💡 Tips:"));
  console.log("• Use Tab completion for commands");
  console.log("• Press Ctrl+C to exit or get prompted");
  console.log("• Add --dry-run to preview changes");
  console.log("• Use --help with any command for more options");
}

module.exports = { interactiveCommand };
