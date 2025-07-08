import * as vscode from "vscode";

export type StatusBarState =
  | "ready"
  | "analyzing"
  | "fixing"
  | "error"
  | "offline";

export class StatusBar implements vscode.Disposable {
  private statusBarItem: vscode.StatusBarItem;
  private currentState: StatusBarState = "ready";
  private hideTimer: NodeJS.Timeout | undefined;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100,
    );

    this.statusBarItem.command = "neurolint.showOutput";
    this.statusBarItem.tooltip = "Click to show NeuroLint output";
    this.statusBarItem.show();

    this.updateStatus("ready", "NeuroLint ready");
  }

  updateStatus(
    state: StatusBarState,
    message?: string,
    autoHide?: boolean,
  ): void {
    this.currentState = state;

    const config = this.getStatusConfig(state);
    this.statusBarItem.text = `$(${config.icon}) ${message || config.defaultMessage}`;
    this.statusBarItem.color = config.color;
    this.statusBarItem.backgroundColor = config.backgroundColor;

    // Clear any existing timer
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = undefined;
    }

    // Auto-hide temporary messages
    if (autoHide && state !== "error") {
      this.hideTimer = setTimeout(() => {
        this.updateStatus("ready", "NeuroLint ready");
      }, 3000);
    }
  }

  showProgress(message: string, increment?: number): void {
    if (increment !== undefined) {
      const progressText = `${message} (${increment}%)`;
      this.updateStatus("analyzing", progressText);
    } else {
      this.updateStatus("analyzing", message);
    }
  }

  showSuccess(message: string): void {
    this.updateStatus("ready", message, true);
  }

  showError(message: string): void {
    this.updateStatus("error", message);
  }

  showOffline(): void {
    this.updateStatus("offline", "NeuroLint offline");
  }

  private getStatusConfig(state: StatusBarState): {
    icon: string;
    defaultMessage: string;
    color?: vscode.ThemeColor;
    backgroundColor?: vscode.ThemeColor;
  } {
    switch (state) {
      case "ready":
        return {
          icon: "check",
          defaultMessage: "NeuroLint ready",
          color: new vscode.ThemeColor("statusBarItem.foreground"),
        };

      case "analyzing":
        return {
          icon: "sync~spin",
          defaultMessage: "NeuroLint analyzing...",
          color: new vscode.ThemeColor("statusBarItem.foreground"),
        };

      case "fixing":
        return {
          icon: "tools",
          defaultMessage: "NeuroLint fixing...",
          color: new vscode.ThemeColor("statusBarItem.foreground"),
        };

      case "error":
        return {
          icon: "error",
          defaultMessage: "NeuroLint error",
          color: new vscode.ThemeColor("statusBarItem.errorForeground"),
          backgroundColor: new vscode.ThemeColor(
            "statusBarItem.errorBackground",
          ),
        };

      case "offline":
        return {
          icon: "cloud-offline",
          defaultMessage: "NeuroLint offline",
          color: new vscode.ThemeColor("statusBarItem.warningForeground"),
          backgroundColor: new vscode.ThemeColor(
            "statusBarItem.warningBackground",
          ),
        };

      default:
        return {
          icon: "question",
          defaultMessage: "NeuroLint unknown",
        };
    }
  }

  getCurrentState(): StatusBarState {
    return this.currentState;
  }

  dispose(): void {
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
    }
    this.statusBarItem.dispose();
  }
}
