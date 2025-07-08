import * as vscode from "vscode";
import { NeuroLintProvider } from "./NeuroLintProvider";

export class CodeActionProvider implements vscode.CodeActionProvider {
  constructor(private neurolintProvider: NeuroLintProvider) {}

  async provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range | vscode.Selection,
    context: vscode.CodeActionContext,
    token: vscode.CancellationToken,
  ): Promise<vscode.CodeAction[]> {
    const actions: vscode.CodeAction[] = [];

    // Filter NeuroLint diagnostics
    const neurolintDiagnostics = context.diagnostics.filter(
      (diagnostic) => diagnostic.source === "NeuroLint",
    );

    if (neurolintDiagnostics.length === 0) {
      return actions;
    }

    // Add quick fix actions for each diagnostic
    for (const diagnostic of neurolintDiagnostics) {
      const quickFixAction = this.createQuickFixAction(document, diagnostic);
      if (quickFixAction) {
        actions.push(quickFixAction);
      }
    }

    // Add file-level actions
    actions.push(
      this.createAnalyzeFileAction(document),
      this.createFixFileAction(document),
      this.createFixFilePreviewAction(document),
    );

    // Add layer-specific actions
    actions.push(...this.createLayerActions(document));

    return actions;
  }

  private createQuickFixAction(
    document: vscode.TextDocument,
    diagnostic: vscode.Diagnostic,
  ): vscode.CodeAction | undefined {
    const action = new vscode.CodeAction(
      `Fix: ${diagnostic.message}`,
      vscode.CodeActionKind.QuickFix,
    );

    action.diagnostics = [diagnostic];
    action.isPreferred = true;

    // Create a command that will trigger the fix
    action.command = {
      command: "neurolint.quickFix",
      title: "Apply NeuroLint Quick Fix",
      arguments: [document.uri, diagnostic],
    };

    return action;
  }

  private createAnalyzeFileAction(
    document: vscode.TextDocument,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      "Analyze with NeuroLint",
      vscode.CodeActionKind.Source,
    );

    action.command = {
      command: "neurolint.analyzeFile",
      title: "Analyze current file with NeuroLint",
    };

    return action;
  }

  private createFixFileAction(
    document: vscode.TextDocument,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      "Fix all NeuroLint issues",
      vscode.CodeActionKind.SourceFixAll,
    );

    action.command = {
      command: "neurolint.fixFile",
      title: "Fix all issues in current file",
    };

    return action;
  }

  private createFixFilePreviewAction(
    document: vscode.TextDocument,
  ): vscode.CodeAction {
    const action = new vscode.CodeAction(
      "Preview NeuroLint fixes",
      vscode.CodeActionKind.Source,
    );

    action.command = {
      command: "neurolint.previewFixes",
      title: "Preview fixes for current file",
      arguments: [document.uri],
    };

    return action;
  }

  private createLayerActions(
    document: vscode.TextDocument,
  ): vscode.CodeAction[] {
    const layers = [
      {
        id: 1,
        name: "Configuration",
        description: "Analyze TypeScript and project configuration",
      },
      {
        id: 2,
        name: "Patterns",
        description: "Analyze code patterns and entities",
      },
      {
        id: 3,
        name: "Components",
        description: "Analyze React components and best practices",
      },
      {
        id: 4,
        name: "Hydration",
        description: "Analyze SSR and hydration issues",
      },
      {
        id: 5,
        name: "Next.js",
        description: "Analyze Next.js specific optimizations",
      },
      {
        id: 6,
        name: "Testing",
        description: "Analyze testing patterns and coverage",
      },
    ];

    return layers.map((layer) => {
      const action = new vscode.CodeAction(
        `Analyze Layer ${layer.id}: ${layer.name}`,
        vscode.CodeActionKind.Source,
      );

      action.command = {
        command: "neurolint.analyzeLayer",
        title: layer.description,
        arguments: [document.uri, layer.id],
      };

      return action;
    });
  }

  static registerCommands(
    context: vscode.ExtensionContext,
    provider: NeuroLintProvider,
  ): void {
    // Quick fix command
    const quickFixCommand = vscode.commands.registerCommand(
      "neurolint.quickFix",
      async (uri: vscode.Uri, diagnostic: vscode.Diagnostic) => {
        const document = await vscode.workspace.openTextDocument(uri);

        try {
          // This would ideally get a specific fix for the diagnostic
          // For now, we'll analyze and apply fixes
          await provider.fixDocument(document);
          vscode.window.showInformationMessage("Quick fix applied");
        } catch (error) {
          vscode.window.showErrorMessage(`Quick fix failed: ${error}`);
        }
      },
    );

    // Preview fixes command
    const previewFixesCommand = vscode.commands.registerCommand(
      "neurolint.previewFixes",
      async (uri: vscode.Uri) => {
        const document = await vscode.workspace.openTextDocument(uri);

        try {
          await provider.fixDocument(document, true);
        } catch (error) {
          vscode.window.showErrorMessage(`Preview failed: ${error}`);
        }
      },
    );

    // Analyze specific layer command
    const analyzeLayerCommand = vscode.commands.registerCommand(
      "neurolint.analyzeLayer",
      async (uri: vscode.Uri, layerId: number) => {
        const document = await vscode.workspace.openTextDocument(uri);

        try {
          // Temporarily set enabled layers to just this layer
          const config = vscode.workspace.getConfiguration("neurolint");
          const originalLayers = config.get<number[]>("enabledLayers");

          await config.update(
            "enabledLayers",
            [layerId],
            vscode.ConfigurationTarget.Workspace,
          );

          try {
            await provider.analyzeDocument(document);
            vscode.window.showInformationMessage(
              `Layer ${layerId} analysis complete`,
            );
          } finally {
            // Restore original layers
            await config.update(
              "enabledLayers",
              originalLayers,
              vscode.ConfigurationTarget.Workspace,
            );
          }
        } catch (error) {
          vscode.window.showErrorMessage(
            `Layer ${layerId} analysis failed: ${error}`,
          );
        }
      },
    );

    context.subscriptions.push(
      quickFixCommand,
      previewFixesCommand,
      analyzeLayerCommand,
    );
  }
}
