
import * as vscode from "vscode";
import { ApiClient } from "../utils/ApiClient";

interface OrchestrationResult {
  success: boolean;
  finalCode: string;
  layers: LayerResult[];
  summary: {
    totalSteps: number;
    successfulLayers: number;
    failedLayers: number;
    totalExecutionTime: number;
    totalChanges: number;
  };
  recommendations?: string[];
}

interface LayerResult {
  layerId: number;
  success: boolean;
  executionTime: number;
  changeCount: number;
  improvements?: string[];
  error?: string;
  revertReason?: string;
}

export class NeuroLintOrchestrationProvider {
  private statusBarItem: vscode.StatusBarItem;
  private isProcessing = false;

  constructor(
    private apiClient: ApiClient,
    private outputChannel: vscode.OutputChannel
  ) {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "neurolint.showOutput";
    this.updateStatusBar("Ready");
  }

  async executeOrchestration(
    document: vscode.TextDocument,
    selectedLayers?: number[]
  ): Promise<void> {
    if (this.isProcessing) {
      vscode.window.showWarningMessage("NeuroLint is already processing another file");
      return;
    }

    this.isProcessing = true;
    this.updateStatusBar("Processing...", true);

    try {
      const config = vscode.workspace.getConfiguration("neurolint");
      const enabledLayers = selectedLayers || config.get<number[]>("enabledLayers", [1, 2, 3, 4]);

      this.outputChannel.appendLine(`🚀 Starting orchestration for: ${document.fileName}`);
      this.outputChannel.appendLine(`📋 Enabled layers: ${enabledLayers.join(", ")}`);

      // Call the orchestration API
      const result = await this.apiClient.executeOrchestration({
        code: document.getText(),
        filePath: document.fileName,
        layers: enabledLayers,
        options: {
          verbose: config.get<boolean>("verbose", false),
          dryRun: false
        }
      });

      if (result.success) {
        await this.handleSuccessfulOrchestration(document, result);
      } else {
        await this.handleFailedOrchestration(result);
      }

    } catch (error) {
      this.outputChannel.appendLine(`❌ Orchestration failed: ${error}`);
      vscode.window.showErrorMessage(`NeuroLint orchestration failed: ${error}`);
    } finally {
      this.isProcessing = false;
      this.updateStatusBar("Ready");
    }
  }

  private async handleSuccessfulOrchestration(
    document: vscode.TextDocument,
    result: OrchestrationResult
  ): Promise<void> {
    const { summary, layers } = result;

    // Show summary notification
    const message = `✅ NeuroLint completed: ${summary.successfulLayers}/${summary.totalSteps} layers succeeded, ${summary.totalChanges} changes made`;
    
    const action = await vscode.window.showInformationMessage(
      message,
      "Apply Changes",
      "Show Details",
      "Revert"
    );

    // Log detailed results
    this.outputChannel.appendLine(`\n📊 Orchestration Summary:`);
    this.outputChannel.appendLine(`   Total layers: ${summary.totalSteps}`);
    this.outputChannel.appendLine(`   Successful: ${summary.successfulLayers}`);
    this.outputChannel.appendLine(`   Failed: ${summary.failedLayers}`);
    this.outputChannel.appendLine(`   Total changes: ${summary.totalChanges}`);
    this.outputChannel.appendLine(`   Execution time: ${summary.totalExecutionTime}ms`);

    // Log individual layer results
    layers.forEach(layer => {
      const status = layer.success ? "✅" : "❌";
      const time = `${layer.executionTime.toFixed(0)}ms`;
      const changes = layer.changeCount > 0 ? ` (${layer.changeCount} changes)` : "";
      
      this.outputChannel.appendLine(`   ${status} Layer ${layer.layerId}: ${time}${changes}`);
      
      if (layer.improvements && layer.improvements.length > 0) {
        layer.improvements.forEach(improvement => {
          this.outputChannel.appendLine(`      • ${improvement}`);
        });
      }
      
      if (layer.error) {
        this.outputChannel.appendLine(`      ❌ Error: ${layer.error}`);
      }
      
      if (layer.revertReason) {
        this.outputChannel.appendLine(`      🔄 Reverted: ${layer.revertReason}`);
      }
    });

    // Handle user action
    switch (action) {
      case "Apply Changes":
        await this.applyChanges(document, result.finalCode);
        break;
      case "Show Details":
        this.showDetailedResults(result);
        break;
      case "Revert":
        this.outputChannel.appendLine("Changes reverted by user");
        break;
    }

    // Show recommendations if available
    if (result.recommendations && result.recommendations.length > 0) {
      this.showRecommendations(result.recommendations);
    }
  }

  private async handleFailedOrchestration(result: any): Promise<void> {
    this.outputChannel.appendLine(`❌ Orchestration failed completely`);
    
    if (result.error) {
      this.outputChannel.appendLine(`Error: ${result.error}`);
    }

    if (result.layers) {
      result.layers.forEach((layer: LayerResult) => {
        if (!layer.success && layer.error) {
          this.outputChannel.appendLine(`❌ Layer ${layer.layerId}: ${layer.error}`);
        }
      });
    }

    vscode.window.showErrorMessage("NeuroLint orchestration failed. Check output for details.");
  }

  private async applyChanges(document: vscode.TextDocument, newCode: string): Promise<void> {
    const edit = new vscode.WorkspaceEdit();
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(document.getText().length)
    );
    
    edit.replace(document.uri, fullRange, newCode);
    
    const success = await vscode.workspace.applyEdit(edit);
    
    if (success) {
      this.outputChannel.appendLine("✅ Changes applied successfully");
      vscode.window.showInformationMessage("NeuroLint changes applied");
    } else {
      this.outputChannel.appendLine("❌ Failed to apply changes");
      vscode.window.showErrorMessage("Failed to apply NeuroLint changes");
    }
  }

  private showDetailedResults(result: OrchestrationResult): void {
    // Create and show detailed results in a new document
    const content = this.generateDetailedReport(result);
    
    vscode.workspace.openTextDocument({
      content,
      language: "markdown"
    }).then(doc => {
      vscode.window.showTextDocument(doc);
    });
  }

  private generateDetailedReport(result: OrchestrationResult): string {
    let report = "# NeuroLint Orchestration Report\n\n";
    
    report += "## Summary\n";
    report += `- **Total Layers**: ${result.summary.totalSteps}\n`;
    report += `- **Successful**: ${result.summary.successfulLayers}\n`;
    report += `- **Failed**: ${result.summary.failedLayers}\n`;
    report += `- **Total Changes**: ${result.summary.totalChanges}\n`;
    report += `- **Execution Time**: ${result.summary.totalExecutionTime}ms\n\n`;

    report += "## Layer Details\n\n";
    
    result.layers.forEach(layer => {
      const status = layer.success ? "✅ Success" : "❌ Failed";
      report += `### Layer ${layer.layerId} - ${status}\n`;
      report += `- **Execution Time**: ${layer.executionTime.toFixed(0)}ms\n`;
      report += `- **Changes Made**: ${layer.changeCount}\n`;
      
      if (layer.improvements && layer.improvements.length > 0) {
        report += "- **Improvements**:\n";
        layer.improvements.forEach(improvement => {
          report += `  - ${improvement}\n`;
        });
      }
      
      if (layer.error) {
        report += `- **Error**: ${layer.error}\n`;
      }
      
      if (layer.revertReason) {
        report += `- **Reverted**: ${layer.revertReason}\n`;
      }
      
      report += "\n";
    });

    if (result.recommendations && result.recommendations.length > 0) {
      report += "## Recommendations\n\n";
      result.recommendations.forEach(rec => {
        report += `- ${rec}\n`;
      });
    }

    return report;
  }

  private showRecommendations(recommendations: string[]): void {
    const message = `NeuroLint has ${recommendations.length} recommendations for your code`;
    
    vscode.window.showInformationMessage(
      message,
      "Show Recommendations"
    ).then(action => {
      if (action === "Show Recommendations") {
        const content = "# NeuroLint Recommendations\n\n" + 
          recommendations.map(rec => `- ${rec}`).join("\n");
        
        vscode.workspace.openTextDocument({
          content,
          language: "markdown"
        }).then(doc => {
          vscode.window.showTextDocument(doc);
        });
      }
    });
  }

  async suggestOptimalLayers(document: vscode.TextDocument): Promise<void> {
    try {
      this.outputChannel.appendLine(`🔍 Analyzing code for optimal layers: ${document.fileName}`);

      const result = await this.apiClient.suggestLayers({
        code: document.getText(),
        filePath: document.fileName
      });

      if (result.success && result.recommendations) {
        const { recommended, reasons } = result.recommendations;
        
        this.outputChannel.appendLine(`📋 Recommended layers: ${recommended.join(", ")}`);
        reasons.forEach(reason => {
          this.outputChannel.appendLine(`   • ${reason}`);
        });

        const message = `Recommended layers: ${recommended.join(", ")}`;
        const action = await vscode.window.showInformationMessage(
          message,
          "Use Recommended",
          "Show Details"
        );

        if (action === "Use Recommended") {
          await this.executeOrchestration(document, recommended);
        } else if (action === "Show Details") {
          this.outputChannel.show();
        }
      }

    } catch (error) {
      this.outputChannel.appendLine(`❌ Layer suggestion failed: ${error}`);
    }
  }

  private updateStatusBar(text: string, spinning = false): void {
    this.statusBarItem.text = spinning ? `$(sync~spin) ${text}` : `$(gear) ${text}`;
    this.statusBarItem.show();
  }

  dispose(): void {
    this.statusBarItem.dispose();
  }
}
