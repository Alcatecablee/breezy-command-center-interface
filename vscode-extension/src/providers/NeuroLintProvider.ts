import * as vscode from "vscode";
import { ApiClient, AnalysisRequest, AnalysisResult } from "../utils/ApiClient";

export class NeuroLintProvider {
  private cache: Map<string, AnalysisResult> = new Map();
  private pendingRequests: Map<string, Promise<AnalysisResult>> = new Map();

  constructor(
    private apiClient: ApiClient,
    private outputChannel: vscode.OutputChannel,
  ) {}

  async analyzeDocument(
    document: vscode.TextDocument,
  ): Promise<AnalysisResult> {
    const cacheKey = this.getCacheKey(document);

    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    // Check if request is already pending
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    // Create new analysis request
    const request: AnalysisRequest = {
      code: document.getText(),
      filePath: document.fileName,
      layers: this.getEnabledLayers(),
    };

    const analysisPromise = this.performAnalysis(request, document);
    this.pendingRequests.set(cacheKey, analysisPromise);

    try {
      const result = await analysisPromise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  async fixDocument(
    document: vscode.TextDocument,
    preview: boolean = false,
  ): Promise<AnalysisResult> {
    const request: AnalysisRequest = {
      code: document.getText(),
      filePath: document.fileName,
      layers: this.getEnabledLayers(),
    };

    try {
      this.outputChannel.appendLine(`Fixing document: ${document.fileName}`);
      const result = await this.apiClient.fixCode(request);

      if (result.success && result.fixes.length > 0) {
        if (preview) {
          await this.showFixPreview(document, result);
        } else {
          await this.applyFixes(document, result);
        }
      } else {
        vscode.window.showInformationMessage(
          "No fixes available for this file",
        );
      }

      return result;
    } catch (error) {
      this.outputChannel.appendLine(`Fix failed: ${error}`);
      throw error;
    }
  }

  async analyzeWorkspace(): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      throw new Error("No workspace folder found");
    }

    const config = vscode.workspace.getConfiguration("neurolint");
    const includePatterns = config.get<string[]>("workspace.includePatterns", [
      "**/*.ts",
      "**/*.tsx",
      "**/*.js",
      "**/*.jsx",
    ]);
    const excludePatterns = config.get<string[]>("workspace.excludePatterns", [
      "**/node_modules/**",
    ]);
    const maxFiles = config.get<number>("workspace.maxFiles", 1000);
    const maxFileSize = config.get<number>("workspace.maxFileSize", 10485760);

    // Find all files to analyze
    const files: string[] = [];
    for (const pattern of includePatterns) {
      const foundFiles = await vscode.workspace.findFiles(
        pattern,
        `{${excludePatterns.join(",")}}`,
      );
      for (const file of foundFiles) {
        if (files.length >= maxFiles) break;

        try {
          const stat = await vscode.workspace.fs.stat(file);
          if (stat.size <= maxFileSize) {
            files.push(file.fsPath);
          }
        } catch (error) {
          this.outputChannel.appendLine(
            `Skipping file ${file.fsPath}: ${error}`,
          );
        }
      }
    }

    if (files.length === 0) {
      vscode.window.showInformationMessage("No files found to analyze");
      return;
    }

    // Show progress
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Analyzing workspace",
        cancellable: true,
      },
      async (progress, token) => {
        progress.report({
          increment: 0,
          message: `Found ${files.length} files`,
        });

        try {
          const result = await this.apiClient.analyzeWorkspace(
            files,
            this.getEnabledLayers(),
          );

          if (token.isCancellationRequested) {
            return;
          }

          progress.report({ increment: 100, message: "Analysis complete" });

          // Show results
          await this.showWorkspaceResults(result);
        } catch (error) {
          this.outputChannel.appendLine(`Workspace analysis failed: ${error}`);
          throw error;
        }
      },
    );
  }

  private async performAnalysis(
    request: AnalysisRequest,
    document: vscode.TextDocument,
  ): Promise<AnalysisResult> {
    try {
      this.outputChannel.appendLine(`Analyzing: ${document.fileName}`);
      const result = await this.apiClient.analyzeCode(request);

      this.outputChannel.appendLine(
        `Analysis complete: ${result.summary.totalIssues} issues found in ${result.summary.executionTime}ms`,
      );

      return result;
    } catch (error) {
      this.outputChannel.appendLine(`Analysis failed: ${error}`);
      throw error;
    }
  }

  private async showFixPreview(
    document: vscode.TextDocument,
    result: AnalysisResult,
  ): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      "neurolintPreview",
      "NeuroLint Fix Preview",
      vscode.ViewColumn.Beside,
      { enableScripts: true },
    );

    panel.webview.html = this.getFixPreviewHtml(document.getText(), result);

    panel.webview.onDidReceiveMessage(async (message) => {
      if (message.command === "applyFixes") {
        await this.applyFixes(document, result);
        panel.dispose();
        vscode.window.showInformationMessage("Fixes applied successfully");
      }
    });
  }

  private async applyFixes(
    document: vscode.TextDocument,
    result: AnalysisResult,
  ): Promise<void> {
    const edit = new vscode.WorkspaceEdit();

    // Sort fixes by position (reverse order to avoid offset issues)
    const sortedFixes = result.fixes.sort((a, b) => {
      if (a.line !== b.line) return b.line - a.line;
      return b.column - a.column;
    });

    for (const fix of sortedFixes) {
      const position = new vscode.Position(fix.line, fix.column);
      const range = new vscode.Range(position, position);
      edit.replace(document.uri, range, fix.newText);
    }

    await vscode.workspace.applyEdit(edit);
  }

  private async showWorkspaceResults(result: AnalysisResult): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      "neurolintWorkspace",
      "NeuroLint Workspace Analysis",
      vscode.ViewColumn.One,
      { enableScripts: true },
    );

    panel.webview.html = this.getWorkspaceResultsHtml(result);
  }

  private getEnabledLayers(): number[] {
    const config = vscode.workspace.getConfiguration("neurolint");
    return config.get<number[]>("enabledLayers", [1, 2, 3, 4]);
  }

  private getCacheKey(document: vscode.TextDocument): string {
    return `${document.fileName}:${document.version}`;
  }

  private getFixPreviewHtml(
    originalCode: string,
    result: AnalysisResult,
  ): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Fix Preview</title>
    <style>
        body { font-family: 'Courier New', monospace; padding: 20px; }
        .diff { background: #f5f5f5; padding: 10px; margin: 10px 0; }
        .fix { background: #e8f5e8; border-left: 3px solid #4caf50; padding: 5px; margin: 5px 0; }
        .summary { background: #e3f2fd; padding: 15px; margin-bottom: 20px; }
        button { padding: 10px 20px; background: #007acc; color: white; border: none; cursor: pointer; }
        pre { background: #f8f8f8; padding: 10px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="summary">
        <h3>Fix Summary</h3>
        <p>Total fixes: ${result.fixes.length}</p>
        <p>Execution time: ${result.summary.executionTime}ms</p>
    </div>
    
    <h3>Fixes to be applied:</h3>
    ${result.fixes
      .map(
        (fix) => `
        <div class="fix">
            <strong>Line ${fix.line + 1}, Column ${fix.column + 1}:</strong> ${fix.description}
            <pre>${fix.newText}</pre>
        </div>
    `,
      )
      .join("")}
    
    <button onclick="applyFixes()">Apply All Fixes</button>
    
    <script>
        const vscode = acquireVsCodeApi();
        function applyFixes() {
            vscode.postMessage({ command: 'applyFixes' });
        }
    </script>
</body>
</html>`;
  }

  private getWorkspaceResultsHtml(result: AnalysisResult): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Workspace Analysis Results</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .summary { background: #e3f2fd; padding: 20px; margin-bottom: 20px; border-radius: 5px; }
        .issue { background: #fff3e0; padding: 10px; margin: 5px 0; border-left: 3px solid #ff9800; }
        .error { border-left-color: #f44336; background: #ffebee; }
        .warning { border-left-color: #ff9800; background: #fff3e0; }
        .info { border-left-color: #2196f3; background: #e3f2fd; }
        .stats { display: flex; gap: 20px; margin: 20px 0; }
        .stat { background: #f5f5f5; padding: 15px; border-radius: 5px; text-align: center; }
    </style>
</head>
<body>
    <div class="summary">
        <h2>Workspace Analysis Complete</h2>
        <div class="stats">
            <div class="stat">
                <div><strong>${result.summary.totalIssues}</strong></div>
                <div>Total Issues</div>
            </div>
            <div class="stat">
                <div><strong>${result.summary.fixableIssues}</strong></div>
                <div>Fixable Issues</div>
            </div>
            <div class="stat">
                <div><strong>${result.summary.layersUsed.length}</strong></div>
                <div>Layers Used</div>
            </div>
            <div class="stat">
                <div><strong>${result.summary.executionTime}ms</strong></div>
                <div>Execution Time</div>
            </div>
        </div>
    </div>
    
    <h3>Issues Found:</h3>
    ${result.issues
      .map(
        (issue) => `
        <div class="issue ${issue.severity}">
            <strong>${issue.severity.toUpperCase()}:</strong> ${issue.message}
            <br><small>Rule: ${issue.rule} | Layer: ${issue.layer}</small>
        </div>
    `,
      )
      .join("")}
</body>
</html>`;
  }

  dispose(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }
}
