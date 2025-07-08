import * as vscode from "vscode";
import { ApiClient, Issue } from "../utils/ApiClient";

export class DiagnosticProvider implements vscode.Disposable {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private debounceTimer: NodeJS.Timeout | undefined;
  private readonly debounceDelay = 1000;

  constructor(
    private apiClient: ApiClient,
    private outputChannel: vscode.OutputChannel,
  ) {
    this.diagnosticCollection =
      vscode.languages.createDiagnosticCollection("neurolint");
  }

  async updateDiagnostics(document: vscode.TextDocument): Promise<void> {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Debounce updates to avoid excessive API calls
    this.debounceTimer = setTimeout(async () => {
      try {
        await this.performDiagnosticUpdate(document);
      } catch (error) {
        this.outputChannel.appendLine(`Diagnostic update failed: ${error}`);
      }
    }, this.getDebounceDelay(document));
  }

  private async performDiagnosticUpdate(
    document: vscode.TextDocument,
  ): Promise<void> {
    if (!this.shouldAnalyzeDocument(document)) {
      return;
    }

    try {
      const config = vscode.workspace.getConfiguration("neurolint");
      const enabledLayers = config.get<number[]>("enabledLayers", [1, 2, 3, 4]);

      const result = await this.apiClient.analyzeCode({
        code: document.getText(),
        filePath: document.fileName,
        layers: enabledLayers,
      });

      if (result.success) {
        const diagnostics = this.convertIssuesToDiagnostics(result.issues);
        this.diagnosticCollection.set(document.uri, diagnostics);

        this.outputChannel.appendLine(
          `Updated diagnostics for ${document.fileName}: ${diagnostics.length} issues`,
        );
      }
    } catch (error) {
      // Clear diagnostics on error but don't show error messages
      this.diagnosticCollection.set(document.uri, []);
      this.outputChannel.appendLine(
        `Diagnostic analysis failed for ${document.fileName}: ${error}`,
      );
    }
  }

  private convertIssuesToDiagnostics(issues: Issue[]): vscode.Diagnostic[] {
    const config = vscode.workspace.getConfiguration("neurolint");
    const diagnosticsLevel = config.get<string>("diagnosticsLevel", "warning");

    return issues
      .filter((issue) => this.shouldIncludeIssue(issue, diagnosticsLevel))
      .map((issue) => {
        const range = new vscode.Range(
          new vscode.Position(
            Math.max(0, issue.line),
            Math.max(0, issue.column),
          ),
          new vscode.Position(
            Math.max(0, issue.line),
            Math.max(0, issue.column + 1),
          ),
        );

        const diagnostic = new vscode.Diagnostic(
          range,
          issue.message,
          this.getSeverity(issue.severity),
        );

        diagnostic.source = "NeuroLint";
        diagnostic.code = issue.rule;
        diagnostic.tags = this.getDiagnosticTags(issue);

        // Add additional information
        diagnostic.relatedInformation = [
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(vscode.Uri.file(issue.rule), range),
            `Layer ${issue.layer}: ${issue.rule}`,
          ),
        ];

        return diagnostic;
      });
  }

  private shouldIncludeIssue(issue: Issue, diagnosticsLevel: string): boolean {
    const severityOrder = { error: 3, warning: 2, info: 1 };
    const configuredLevel =
      severityOrder[diagnosticsLevel as keyof typeof severityOrder] || 2;
    const issueLevel = severityOrder[issue.severity] || 1;

    return issueLevel >= configuredLevel;
  }

  private getSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity) {
      case "error":
        return vscode.DiagnosticSeverity.Error;
      case "warning":
        return vscode.DiagnosticSeverity.Warning;
      case "info":
        return vscode.DiagnosticSeverity.Information;
      default:
        return vscode.DiagnosticSeverity.Warning;
    }
  }

  private getDiagnosticTags(issue: Issue): vscode.DiagnosticTag[] {
    const tags: vscode.DiagnosticTag[] = [];

    // Add tags based on rule type
    if (issue.rule.includes("deprecated")) {
      tags.push(vscode.DiagnosticTag.Deprecated);
    }

    if (issue.rule.includes("unused")) {
      tags.push(vscode.DiagnosticTag.Unnecessary);
    }

    return tags;
  }

  private shouldAnalyzeDocument(document: vscode.TextDocument): boolean {
    // Only analyze supported file types
    const supportedLanguages = [
      "typescript",
      "javascript",
      "typescriptreact",
      "javascriptreact",
    ];
    if (!supportedLanguages.includes(document.languageId)) {
      return false;
    }

    // Only analyze files in workspace
    if (document.uri.scheme !== "file") {
      return false;
    }

    // Check file size limits
    const config = vscode.workspace.getConfiguration("neurolint");
    const maxFileSize = config.get<number>("workspace.maxFileSize", 10485760);

    if (document.getText().length > maxFileSize) {
      this.outputChannel.appendLine(
        `Skipping large file: ${document.fileName} (${document.getText().length} bytes)`,
      );
      return false;
    }

    return true;
  }

  private getDebounceDelay(document: vscode.TextDocument): number {
    const baseDelay = this.debounceDelay;
    const textLength = document.getText().length;

    // Increase delay for larger files
    if (textLength > 50000) {
      return baseDelay * 2;
    } else if (textLength > 10000) {
      return baseDelay * 1.5;
    }

    return baseDelay;
  }

  clearDiagnostics(document?: vscode.TextDocument): void {
    if (document) {
      this.diagnosticCollection.set(document.uri, []);
    } else {
      this.diagnosticCollection.clear();
    }
  }

  dispose(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.diagnosticCollection.dispose();
  }
}
