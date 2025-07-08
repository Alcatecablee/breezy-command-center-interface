import fs from "fs";
import path from "path";
import WebSocket from "ws";
import chalk from "chalk";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

class VSCodeBridge {
  constructor() {
    this.server = null;
    this.clients = new Set();
    this.port = 8765;
    this.isRunning = false;
  }

  async start() {
    if (this.isRunning) return;

    try {
      this.server = new WebSocket.Server({ port: this.port });
      this.setupEventHandlers();
      this.isRunning = true;

      console.log(chalk.blue(`🔗 VS Code Bridge started on port ${this.port}`));
    } catch (error) {
      console.error(
        chalk.red("Failed to start VS Code Bridge:", error.message),
      );
    }
  }

  setupEventHandlers() {
    this.server.on("connection", (ws) => {
      this.clients.add(ws);
      console.log(chalk.gray("VS Code extension connected"));

      ws.on("message", async (data) => {
        try {
          const message = JSON.parse(data.toString());
          await this.handleMessage(ws, message);
        } catch (error) {
          this.sendError(ws, "Invalid message format");
        }
      });

      ws.on("close", () => {
        this.clients.delete(ws);
        console.log(chalk.gray("VS Code extension disconnected"));
      });

      ws.on("error", (error) => {
        console.warn(chalk.yellow("WebSocket error:", error.message));
        this.clients.delete(ws);
      });

      // Send welcome message
      this.send(ws, {
        type: "welcome",
        data: {
          message: "Connected to NeuroLint CLI",
          version: require("../../package.json").version,
        },
      });
    });

    this.server.on("error", (error) => {
      console.error(chalk.red("WebSocket server error:", error.message));
    });
  }

  async handleMessage(ws, message) {
    const { type, data } = message;

    switch (type) {
      case "analyze":
        await this.handleAnalyzeRequest(ws, data);
        break;

      case "fix":
        await this.handleFixRequest(ws, data);
        break;

      case "status":
        await this.handleStatusRequest(ws, data);
        break;

      case "config":
        await this.handleConfigRequest(ws, data);
        break;

      default:
        this.sendError(ws, `Unknown message type: ${type}`);
    }
  }

  async handleAnalyzeRequest(ws, data) {
    try {
      const { files, layers, options = {} } = data;

      this.send(ws, {
        type: "analysis-started",
        data: { files: files.length, layers },
      });

      // Import and use the analyze command
      const { analyzeCommand } = await import("../commands/analyze.js");

      // Capture results by overriding console methods temporarily
      const originalLog = console.log;
      const results = [];

      console.log = (...args) => {
        results.push(args.join(" "));
        originalLog(...args);
      };

      await analyzeCommand(files[0] || ".", {
        layers: layers.join(","),
        output: "json",
        ...options,
      });

      console.log = originalLog;

      this.send(ws, {
        type: "analysis-complete",
        data: { results },
      });
    } catch (error) {
      this.sendError(ws, `Analysis failed: ${error.message}`);
    }
  }

  async handleFixRequest(ws, data) {
    try {
      const { files, layers, options = {} } = data;

      this.send(ws, {
        type: "fix-started",
        data: { files: files.length, layers },
      });

      const { fixCommand } = await import("../commands/fix.js");

      await fixCommand(files[0] || ".", {
        layers: layers.join(","),
        dryRun: options.preview || false,
        backup: options.backup !== false,
        ...options,
      });

      this.send(ws, {
        type: "fix-complete",
        data: { message: "Fixes applied successfully" },
      });
    } catch (error) {
      this.sendError(ws, `Fix failed: ${error.message}`);
    }
  }

  async handleStatusRequest(ws, data) {
    try {
      const { statusCommand } = await import("../commands/status.js");
      const { ConfigManager } = await import("../utils/ConfigManager.js");

      const config = ConfigManager.getConfig();
      const status = {
        configured: !!config,
        apiUrl: config?.api?.url || "Not configured",
        layers: config?.layers?.enabled || [],
        lastAnalysis: this.getLastAnalysisTime(),
      };

      this.send(ws, {
        type: "status-response",
        data: status,
      });
    } catch (error) {
      this.sendError(ws, `Status check failed: ${error.message}`);
    }
  }

  async handleConfigRequest(ws, data) {
    try {
      const { ConfigManager } = await import("../utils/ConfigManager.js");

      if (data.action === "get") {
        const config = ConfigManager.getConfig();
        this.send(ws, {
          type: "config-response",
          data: config,
        });
      } else if (data.action === "set") {
        ConfigManager.setConfig(data.config);
        this.send(ws, {
          type: "config-updated",
          data: { message: "Configuration updated" },
        });
      }
    } catch (error) {
      this.sendError(ws, `Config operation failed: ${error.message}`);
    }
  }

  send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  sendError(ws, error) {
    this.send(ws, {
      type: "error",
      data: { error },
    });
  }

  broadcast(message) {
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  getLastAnalysisTime() {
    try {
      const logPath = path.join(process.cwd(), ".neurolint-log.json");
      if (fs.existsSync(logPath)) {
        const log = JSON.parse(fs.readFileSync(logPath, "utf8"));
        return log.lastAnalysis || null;
      }
    } catch (error) {
      // Ignore errors
    }
    return null;
  }

  stop() {
    if (this.server) {
      this.clients.forEach((client) => {
        client.close();
      });
      this.server.close();
      this.isRunning = false;
      console.log(chalk.gray("VS Code Bridge stopped"));
    }
  }
}

export { VSCodeBridge };
