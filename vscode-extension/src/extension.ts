
import * as vscode from "vscode";
import { ApiClient } from "./utils/ApiClient";
import { ConfigurationManager } from "./utils/ConfigurationManager";
import { NeuroLintProvider } from "./providers/NeuroLintProvider";
import { EnhancedDiagnosticProvider } from "./providers/EnhancedDiagnosticProvider";
import { CodeActionProvider } from "./providers/CodeActionProvider";
import { HoverProvider } from "./providers/HoverProvider";
import { CompletionProvider } from "./providers/CompletionProvider";
import { NeuroLintOrchestrationProvider } from "./providers/NeuroLintOrchestrationProvider";
import { StatusBar } from "./ui/StatusBar";
import { EnterpriseManager } from "./enterprise/EnterpriseManager";

let apiClient: ApiClient;
let configManager: ConfigurationManager;
let orchestrationProvider: NeuroLintOrchestrationProvider;
let diagnosticProvider: EnhancedDiagnosticProvider;
let statusBar: StatusBar;
let outputChannel: vscode.OutputChannel;

export async function activate(context: vscode.ExtensionContext) {
  console.log("NeuroLint extension activating...");

  try {
    // Initialize output channel
    outputChannel = vscode.window.createOutputChannel("NeuroLint");
    outputChannel.appendLine("🚀 NeuroLint extension starting...");

    // Initialize configuration manager
    configManager = new ConfigurationManager();
    await configManager.initialize();

    // Initialize API client
    const config = vscode.workspace.getConfiguration("neurolint");
    const apiUrl = config.get<string>("apiUrl", "http://localhost:5000");
    const apiKey = config.get<string>("apiKey", "");
    
    apiClient = new ApiClient(apiUrl, apiKey);

    // Test connection in background
    apiClient.checkConnection().then(connected => {
      if (connected) {
        outputChannel.appendLine("✅ Connected to NeuroLint server");
        statusBar?.updateConnectionStatus(true);
      } else {
        outputChannel.appendLine("⚠️  Could not connect to NeuroLint server");
        statusBar?.updateConnectionStatus(false);
      }
    });

    // Initialize status bar
    statusBar = new StatusBar();

    // Initialize orchestration provider
    orchestrationProvider = new NeuroLintOrchestrationProvider(apiClient, outputChannel);

    // Initialize diagnostic provider
    diagnosticProvider = new EnhancedDiagnosticProvider(apiClient, outputChannel);

    // Initialize other providers
    const neuroLintProvider = new NeuroLintProvider(apiClient, outputChannel);
    const codeActionProvider = new CodeActionProvider(apiClient);
    const hoverProvider = new HoverProvider(apiClient);
    const completionProvider = new CompletionProvider(apiClient);

    // Register providers
    const supportedLanguages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
    
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(supportedLanguages, codeActionProvider),
      vscode.languages.registerHoverProvider(supportedLanguages, hoverProvider),
      vscode.languages.registerCompletionItemProvider(supportedLanguages, completionProvider),
      
      // Register document change listeners
      vscode.workspace.onDidChangeTextDocument(async (event) => {
        if (supportedLanguages.includes(event.document.languageId)) {
          await diagnosticProvider.updateDiagnostics(event.document);
        }
      }),
      
      vscode.workspace.onDidSaveTextDocument(async (document) => {
        if (supportedLanguages.includes(document.languageId)) {
          await diagnosticProvider.updateDiagnostics(document);
        }
      })
    );

    // Register commands
    registerCommands(context);

    // Initialize enterprise features if enabled
    const enterpriseEnabled = config.get<boolean>("enterpriseFeatures.enabled", false);
    if (enterpriseEnabled) {
      const enterpriseManager = new EnterpriseManager(apiClient, outputChannel);
      await enterpriseManager.initialize();
      context.subscriptions.push(enterpriseManager);
    }

    outputChannel.appendLine("✅ NeuroLint extension activated successfully");
    statusBar?.show("Ready");

  } catch (error) {
    const errorMessage = `Failed to activate NeuroLint: ${error}`;
    outputChannel?.appendLine(`❌ ${errorMessage}`);
    vscode.window.showErrorMessage(errorMessage);
    console.error("NeuroLint activation error:", error);
  }
}

function registerCommands(context: vscode.ExtensionContext) {
  // Core analysis commands
  context.subscriptions.push(
    vscode.commands.registerCommand("neurolint.analyzeFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor");
        return;
      }
      
      statusBar?.show("Analyzing...", true);
      try {
        await diagnosticProvider.updateDiagnostics(editor.document);
        statusBar?.show("Analysis complete");
      } catch (error) {
        statusBar?.show("Analysis failed", false, true);
        vscode.window.showErrorMessage(`Analysis failed: ${error}`);
      }
    }),

    vscode.commands.registerCommand("neurolint.fixFile", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor");
        return;
      }
      
      await orchestrationProvider.executeOrchestration(editor.document);
    }),

    vscode.commands.registerCommand("neurolint.suggestLayers", async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor");
        return;
      }
      
      await orchestrationProvider.suggestOptimalLayers(editor.document);
    }),

    vscode.commands.registerCommand("neurolint.analyzeWorkspace", async () => {
      statusBar?.show("Analyzing workspace...", true);
      try {
        await diagnosticProvider.forceAnalyzeWorkspace();
        statusBar?.show("Workspace analysis complete");
      } catch (error) {
        statusBar?.show("Workspace analysis failed", false, true);
        vscode.window.showErrorMessage(`Workspace analysis failed: ${error}`);
      }
    }),

    // Configuration commands
    vscode.commands.registerCommand("neurolint.configure", async () => {
      await configManager.openConfigurationUI();
    }),

    vscode.commands.registerCommand("neurolint.login", async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: "Enter your NeuroLint API key",
        password: true,
        placeHolder: "API key"
      });
      
      if (apiKey) {
        const config = vscode.workspace.getConfiguration("neurolint");
        await config.update("apiKey", apiKey, vscode.ConfigurationTarget.Global);
        apiClient.updateConfig(apiClient['baseURL'], apiKey);
        vscode.window.showInformationMessage("API key updated successfully");
      }
    }),

    // Utility commands
    vscode.commands.registerCommand("neurolint.showOutput", () => {
      outputChannel.show();
    }),

    vscode.commands.registerCommand("neurolint.clearDiagnostics", () => {
      diagnosticProvider.clearAllDiagnostics();
      vscode.window.showInformationMessage("NeuroLint diagnostics cleared");
    })
  );

  // Enterprise commands
  const config = vscode.workspace.getConfiguration("neurolint");
  if (config.get<boolean>("enterpriseFeatures.enabled", false)) {
    context.subscriptions.push(
      vscode.commands.registerCommand("neurolint.enterprise.dashboard", () => {
        vscode.window.showInformationMessage("Enterprise Dashboard (Coming Soon)");
      }),

      vscode.commands.registerCommand("neurolint.enterprise.analytics", () => {
        vscode.window.showInformationMessage("Enterprise Analytics (Coming Soon)");
      }),

      vscode.commands.registerCommand("neurolint.enterprise.team", () => {
        vscode.window.showInformationMessage("Team Management (Coming Soon)");
      }),

      vscode.commands.registerCommand("neurolint.enterprise.compliance", () => {
        vscode.window.showInformationMessage("Compliance Dashboard (Coming Soon)");
      })
    );
  }
}

export function deactivate() {
  console.log("NeuroLint extension deactivating...");
  
  // Clean up resources
  orchestrationProvider?.dispose();
  diagnosticProvider?.dispose();
  statusBar?.dispose();
  outputChannel?.dispose();
  
  console.log("NeuroLint extension deactivated");
}
