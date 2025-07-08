import * as vscode from "vscode";
import { NeuroLintProvider } from "./providers/NeuroLintProvider";
import { DiagnosticProvider } from "./providers/DiagnosticProvider";
import { CodeActionProvider } from "./providers/CodeActionProvider";
import { HoverProvider } from "./providers/HoverProvider";
import { StatusBar } from "./ui/StatusBar";
import { ConfigurationManager } from "./utils/ConfigurationManager";
import { ApiClient } from "./utils/ApiClient";
import { EnterpriseManager } from "./enterprise/EnterpriseManager";

let outputChannel: vscode.OutputChannel;
let statusBar: StatusBar;
let diagnosticProvider: DiagnosticProvider;
let enterpriseManager: EnterpriseManager;

export async function activate(context: vscode.ExtensionContext) {
  console.log("NeuroLint extension is being activated");

  // Initialize output channel
  outputChannel = vscode.window.createOutputChannel("NeuroLint");
  context.subscriptions.push(outputChannel);

  // Initialize status bar
  statusBar = new StatusBar();
  context.subscriptions.push(statusBar);

  // Initialize configuration manager
  const configManager = new ConfigurationManager();

  // Initialize API client
  const apiClient = new ApiClient(configManager);

  // Initialize core provider
  const neurolintProvider = new NeuroLintProvider(apiClient, outputChannel);

  // Initialize diagnostic provider
  diagnosticProvider = new DiagnosticProvider(apiClient, outputChannel);
  context.subscriptions.push(diagnosticProvider);

  // Initialize code action provider
  const codeActionProvider = new CodeActionProvider(neurolintProvider);
  const codeActionDisposable = vscode.languages.registerCodeActionsProvider(
    { scheme: "file", language: "typescript" },
    codeActionProvider,
  );
  context.subscriptions.push(codeActionDisposable);

  // Initialize hover provider
  const hoverProvider = new HoverProvider(neurolintProvider);
  const hoverDisposable = vscode.languages.registerHoverProvider(
    ["typescript", "javascript", "typescriptreact", "javascriptreact"],
    hoverProvider,
  );
  context.subscriptions.push(hoverDisposable);

  // Initialize enterprise manager
  enterpriseManager = new EnterpriseManager(apiClient, configManager, context);

  // Register commands
  registerCommands(context, neurolintProvider, apiClient, configManager);

  // Setup event listeners
  setupEventListeners(context);

  // Test connection on startup
  await testConnection(apiClient);

  statusBar.updateStatus("ready", "NeuroLint ready");
  outputChannel.appendLine("NeuroLint extension activated successfully");
}

function registerCommands(
  context: vscode.ExtensionContext,
  provider: NeuroLintProvider,
  apiClient: ApiClient,
  configManager: ConfigurationManager,
) {
  // Core commands
  const analyzeFileCommand = vscode.commands.registerCommand(
    "neurolint.analyzeFile",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor found");
        return;
      }

      statusBar.updateStatus("analyzing", "Analyzing file...");
      try {
        await provider.analyzeDocument(editor.document);
        statusBar.updateStatus("ready", "Analysis complete");
      } catch (error) {
        statusBar.updateStatus("error", "Analysis failed");
        vscode.window.showErrorMessage(`Analysis failed: ${error}`);
      }
    },
  );

  const fixFileCommand = vscode.commands.registerCommand(
    "neurolint.fixFile",
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage("No active editor found");
        return;
      }

      statusBar.updateStatus("fixing", "Applying fixes...");
      try {
        await provider.fixDocument(editor.document);
        statusBar.updateStatus("ready", "Fixes applied");
      } catch (error) {
        statusBar.updateStatus("error", "Fix failed");
        vscode.window.showErrorMessage(`Fix failed: ${error}`);
      }
    },
  );

  const analyzeWorkspaceCommand = vscode.commands.registerCommand(
    "neurolint.analyzeWorkspace",
    async () => {
      if (!vscode.workspace.workspaceFolders) {
        vscode.window.showWarningMessage("No workspace found");
        return;
      }

      statusBar.updateStatus("analyzing", "Analyzing workspace...");
      try {
        await provider.analyzeWorkspace();
        statusBar.updateStatus("ready", "Workspace analysis complete");
      } catch (error) {
        statusBar.updateStatus("error", "Workspace analysis failed");
        vscode.window.showErrorMessage(`Workspace analysis failed: ${error}`);
      }
    },
  );

  const configureCommand = vscode.commands.registerCommand(
    "neurolint.configure",
    async () => {
      await configManager.showConfigurationDialog();
    },
  );

  const loginCommand = vscode.commands.registerCommand(
    "neurolint.login",
    async () => {
      await configManager.showLoginDialog();
    },
  );

  const showOutputCommand = vscode.commands.registerCommand(
    "neurolint.showOutput",
    () => {
      outputChannel.show();
    },
  );

  // Enterprise commands
  const enterpriseDashboardCommand = vscode.commands.registerCommand(
    "neurolint.enterprise.dashboard",
    async () => {
      await enterpriseManager.showDashboard();
    },
  );

  const enterpriseAnalyticsCommand = vscode.commands.registerCommand(
    "neurolint.enterprise.analytics",
    async () => {
      await enterpriseManager.showAnalytics();
    },
  );

  const enterpriseTeamCommand = vscode.commands.registerCommand(
    "neurolint.enterprise.team",
    async () => {
      await enterpriseManager.showTeamManagement();
    },
  );

  const enterpriseComplianceCommand = vscode.commands.registerCommand(
    "neurolint.enterprise.compliance",
    async () => {
      await enterpriseManager.showCompliance();
    },
  );

  // Register all commands
  context.subscriptions.push(
    analyzeFileCommand,
    fixFileCommand,
    analyzeWorkspaceCommand,
    configureCommand,
    loginCommand,
    showOutputCommand,
    enterpriseDashboardCommand,
    enterpriseAnalyticsCommand,
    enterpriseTeamCommand,
    enterpriseComplianceCommand,
  );
}

function setupEventListeners(context: vscode.ExtensionContext) {
  // Listen for document changes
  const documentChangeListener = vscode.workspace.onDidChangeTextDocument(
    async (event) => {
      if (isAnalyzableDocument(event.document)) {
        await diagnosticProvider.updateDiagnostics(event.document);
      }
    },
  );

  // Listen for document saves
  const documentSaveListener = vscode.workspace.onDidSaveTextDocument(
    async (document) => {
      const config = vscode.workspace.getConfiguration("neurolint");
      if (config.get("autoFix") && isAnalyzableDocument(document)) {
        try {
          const provider = new NeuroLintProvider(
            new ApiClient(new ConfigurationManager()),
            outputChannel,
          );
          await provider.fixDocument(document);
        } catch (error) {
          outputChannel.appendLine(`Auto-fix failed: ${error}`);
        }
      }
    },
  );

  // Listen for configuration changes
  const configChangeListener = vscode.workspace.onDidChangeConfiguration(
    (event) => {
      if (event.affectsConfiguration("neurolint")) {
        outputChannel.appendLine("NeuroLint configuration changed");
        statusBar.updateStatus("ready", "Configuration updated");
      }
    },
  );

  context.subscriptions.push(
    documentChangeListener,
    documentSaveListener,
    configChangeListener,
  );
}

function isAnalyzableDocument(document: vscode.TextDocument): boolean {
  const supportedLanguages = [
    "typescript",
    "javascript",
    "typescriptreact",
    "javascriptreact",
  ];
  return (
    supportedLanguages.includes(document.languageId) &&
    document.uri.scheme === "file"
  );
}

async function testConnection(apiClient: ApiClient): Promise<void> {
  try {
    await apiClient.testConnection();
    outputChannel.appendLine("Successfully connected to NeuroLint API");
  } catch (error) {
    outputChannel.appendLine(`Failed to connect to NeuroLint API: ${error}`);
    vscode.window.showWarningMessage(
      "NeuroLint API connection failed. Extension will work in offline mode.",
    );
  }
}

export function deactivate() {
  outputChannel?.appendLine("NeuroLint extension deactivated");
  statusBar?.dispose();
  diagnosticProvider?.dispose();
  enterpriseManager?.dispose();
}
