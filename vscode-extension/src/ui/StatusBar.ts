
import * as vscode from "vscode";

export class StatusBar {
  private statusBarItem: vscode.StatusBarItem;
  private connectionItem: vscode.StatusBarItem;
  private hideTimer?: NodeJS.Timeout;

  constructor() {
    // Main status bar item
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.command = "neurolint.showOutput";
    
    // Connection status item
    this.connectionItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      99
    );
    this.connectionItem.command = "neurolint.configure";
    
    this.show("Ready");
    this.updateConnectionStatus(false); // Start as disconnected
  }

  show(text: string, spinning = false, isError = false): void {
    // Clear any existing hide timer
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }

    const icon = spinning 
      ? "$(sync~spin)"
      : isError 
        ? "$(error)"
        : "$(gear)";

    this.statusBarItem.text = `${icon} NeuroLint: ${text}`;
    this.statusBarItem.backgroundColor = isError 
      ? new vscode.ThemeColor("statusBarItem.errorBackground")
      : undefined;
    
    this.statusBarItem.show();

    // Auto-hide temporary messages after 5 seconds
    if (spinning || isError || text.includes("complete")) {
      this.hideTimer = setTimeout(() => {
        this.show("Ready");
      }, 5000);
    }
  }

  updateConnectionStatus(connected: boolean): void {
    const icon = connected ? "$(check)" : "$(x)";
    const text = connected ? "Connected" : "Disconnected";
    const color = connected ? undefined : new vscode.ThemeColor("statusBarItem.warningBackground");

    this.connectionItem.text = `${icon} ${text}`;
    this.connectionItem.backgroundColor = color;
    this.connectionItem.tooltip = connected 
      ? "Connected to NeuroLint server" 
      : "Not connected to NeuroLint server. Click to configure.";
    
    this.connectionItem.show();
  }

  hide(): void {
    this.statusBarItem.hide();
    this.connectionItem.hide();
  }

  dispose(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    this.statusBarItem.dispose();
    this.connectionItem.dispose();
  }
}
