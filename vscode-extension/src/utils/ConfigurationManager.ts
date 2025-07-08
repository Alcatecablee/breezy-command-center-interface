import * as vscode from "vscode";

export class ConfigurationManager {
  private static readonly API_KEY_REGEX = /^nl_[a-zA-Z0-9]{32}$/;

  async showConfigurationDialog(): Promise<void> {
    const panel = vscode.window.createWebviewPanel(
      "neurolintConfig",
      "NeuroLint Configuration",
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    panel.webview.html = this.getConfigurationWebviewContent();

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case "saveConfig":
            await this.saveConfiguration(message.config);
            vscode.window.showInformationMessage(
              "Configuration saved successfully",
            );
            break;
          case "testConnection":
            await this.testConnection(message.apiUrl, message.apiKey);
            break;
          case "loadConfig":
            const config = this.getCurrentConfiguration();
            panel.webview.postMessage({ command: "configLoaded", config });
            break;
        }
      },
      undefined,
      [],
    );
  }

  async showLoginDialog(): Promise<void> {
    const apiKey = await vscode.window.showInputBox({
      prompt: "Enter your NeuroLint API Key",
      password: true,
      validateInput: (value) => {
        if (!value) {
          return "API key is required";
        }
        if (!ConfigurationManager.API_KEY_REGEX.test(value)) {
          return "Invalid API key format. Expected format: nl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx";
        }
        return null;
      },
    });

    if (apiKey) {
      const config = vscode.workspace.getConfiguration("neurolint");
      await config.update("apiKey", apiKey, vscode.ConfigurationTarget.Global);

      // Test the connection
      try {
        await this.testConnection(config.get("apiUrl", ""), apiKey);
        vscode.window.showInformationMessage(
          "Successfully authenticated with NeuroLint",
        );
      } catch (error) {
        vscode.window.showErrorMessage(`Authentication failed: ${error}`);
      }
    }
  }

  private async saveConfiguration(configData: any): Promise<void> {
    const config = vscode.workspace.getConfiguration("neurolint");

    // Basic settings
    if (configData.apiUrl) {
      await config.update(
        "apiUrl",
        configData.apiUrl,
        vscode.ConfigurationTarget.Global,
      );
    }
    if (configData.apiKey) {
      await config.update(
        "apiKey",
        configData.apiKey,
        vscode.ConfigurationTarget.Global,
      );
    }
    if (configData.enabledLayers) {
      await config.update(
        "enabledLayers",
        configData.enabledLayers,
        vscode.ConfigurationTarget.Workspace,
      );
    }
    if (configData.autoFix !== undefined) {
      await config.update(
        "autoFix",
        configData.autoFix,
        vscode.ConfigurationTarget.Workspace,
      );
    }
    if (configData.diagnosticsLevel) {
      await config.update(
        "diagnosticsLevel",
        configData.diagnosticsLevel,
        vscode.ConfigurationTarget.Workspace,
      );
    }

    // Enterprise settings
    if (configData.enterpriseFeatures) {
      const ef = configData.enterpriseFeatures;
      if (ef.enabled !== undefined) {
        await config.update(
          "enterpriseFeatures.enabled",
          ef.enabled,
          vscode.ConfigurationTarget.Global,
        );
      }
      if (ef.teamId) {
        await config.update(
          "enterpriseFeatures.teamId",
          ef.teamId,
          vscode.ConfigurationTarget.Global,
        );
      }
      if (ef.auditLogging !== undefined) {
        await config.update(
          "enterpriseFeatures.auditLogging",
          ef.auditLogging,
          vscode.ConfigurationTarget.Global,
        );
      }
      if (ef.complianceMode !== undefined) {
        await config.update(
          "enterpriseFeatures.complianceMode",
          ef.complianceMode,
          vscode.ConfigurationTarget.Global,
        );
      }
    }

    // Workspace settings
    if (configData.workspace) {
      const ws = configData.workspace;
      if (ws.maxFileSize) {
        await config.update(
          "workspace.maxFileSize",
          ws.maxFileSize,
          vscode.ConfigurationTarget.Workspace,
        );
      }
      if (ws.maxFiles) {
        await config.update(
          "workspace.maxFiles",
          ws.maxFiles,
          vscode.ConfigurationTarget.Workspace,
        );
      }
      if (ws.excludePatterns) {
        await config.update(
          "workspace.excludePatterns",
          ws.excludePatterns,
          vscode.ConfigurationTarget.Workspace,
        );
      }
      if (ws.includePatterns) {
        await config.update(
          "workspace.includePatterns",
          ws.includePatterns,
          vscode.ConfigurationTarget.Workspace,
        );
      }
    }
  }

  private getCurrentConfiguration(): any {
    const config = vscode.workspace.getConfiguration("neurolint");

    return {
      apiUrl: config.get("apiUrl"),
      apiKey: config.get("apiKey"),
      enabledLayers: config.get("enabledLayers"),
      autoFix: config.get("autoFix"),
      diagnosticsLevel: config.get("diagnosticsLevel"),
      timeout: config.get("timeout"),
      enterpriseFeatures: {
        enabled: config.get("enterpriseFeatures.enabled"),
        teamId: config.get("enterpriseFeatures.teamId"),
        auditLogging: config.get("enterpriseFeatures.auditLogging"),
        complianceMode: config.get("enterpriseFeatures.complianceMode"),
      },
      workspace: {
        maxFileSize: config.get("workspace.maxFileSize"),
        maxFiles: config.get("workspace.maxFiles"),
        excludePatterns: config.get("workspace.excludePatterns"),
        includePatterns: config.get("workspace.includePatterns"),
      },
    };
  }

  private async testConnection(apiUrl: string, apiKey: string): Promise<void> {
    try {
      const axios = require("axios");
      const response = await axios.get(`${apiUrl}/health`, {
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
        timeout: 10000,
      });

      if (response.status === 200) {
        vscode.window.showInformationMessage("Connection successful");
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Connection failed: ${error}`);
      throw error;
    }
  }

  private getConfigurationWebviewContent(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>NeuroLint Configuration</title>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .section { 
            margin: 20px 0; 
            padding: 15px;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
        }
        .section h3 { 
            margin-top: 0; 
            color: var(--vscode-textPreformat-foreground);
        }
        .form-group { 
            margin: 10px 0; 
        }
        label { 
            display: block; 
            margin-bottom: 5px;
            font-weight: bold;
        }
        input, select, textarea { 
            width: 100%; 
            padding: 8px;
            border: 1px solid var(--vscode-input-border);
            background-color: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border-radius: 3px;
        }
        input[type="checkbox"] { 
            width: auto; 
        }
        button { 
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 3px;
            cursor: pointer;
            margin: 5px;
        }
        button:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .checkbox-group {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
        }
        .checkbox-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
    </style>
</head>
<body>
    <h2>NeuroLint Configuration</h2>
    
    <div class="section">
        <h3>API Settings</h3>
        <div class="form-group">
            <label for="apiUrl">API URL:</label>
            <input type="text" id="apiUrl" placeholder="http://localhost:5000" />
        </div>
        <div class="form-group">
            <label for="apiKey">API Key:</label>
            <input type="password" id="apiKey" placeholder="nl_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" />
        </div>
        <button onclick="testConnection()">Test Connection</button>
    </div>

    <div class="section">
        <h3>Analysis Settings</h3>
        <div class="form-group">
            <label>Enabled Layers:</label>
            <div class="checkbox-group">
                <div class="checkbox-item">
                    <input type="checkbox" id="layer1" value="1" />
                    <label for="layer1">Layer 1: Configuration</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="layer2" value="2" />
                    <label for="layer2">Layer 2: Patterns</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="layer3" value="3" />
                    <label for="layer3">Layer 3: Components</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="layer4" value="4" />
                    <label for="layer4">Layer 4: Hydration</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="layer5" value="5" />
                    <label for="layer5">Layer 5: Next.js</label>
                </div>
                <div class="checkbox-item">
                    <input type="checkbox" id="layer6" value="6" />
                    <label for="layer6">Layer 6: Testing</label>
                </div>
            </div>
        </div>
        <div class="form-group">
            <label for="diagnosticsLevel">Diagnostics Level:</label>
            <select id="diagnosticsLevel">
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
            </select>
        </div>
        <div class="form-group">
            <input type="checkbox" id="autoFix" />
            <label for="autoFix">Auto-fix on save</label>
        </div>
    </div>

    <div class="section">
        <h3>Enterprise Features</h3>
        <div class="form-group">
            <input type="checkbox" id="enterpriseEnabled" />
            <label for="enterpriseEnabled">Enable Enterprise Features</label>
        </div>
        <div class="form-group">
            <label for="teamId">Team ID:</label>
            <input type="text" id="teamId" placeholder="your-team-id" />
        </div>
        <div class="form-group">
            <input type="checkbox" id="auditLogging" />
            <label for="auditLogging">Enable Audit Logging</label>
        </div>
        <div class="form-group">
            <input type="checkbox" id="complianceMode" />
            <label for="complianceMode">Enable Compliance Mode</label>
        </div>
    </div>

    <div class="section">
        <button onclick="saveConfiguration()">Save Configuration</button>
        <button onclick="loadConfiguration()">Load Current Settings</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function loadConfiguration() {
            vscode.postMessage({ command: 'loadConfig' });
        }

        function saveConfiguration() {
            const enabledLayers = [];
            for (let i = 1; i <= 6; i++) {
                if (document.getElementById('layer' + i).checked) {
                    enabledLayers.push(i);
                }
            }

            const config = {
                apiUrl: document.getElementById('apiUrl').value,
                apiKey: document.getElementById('apiKey').value,
                enabledLayers: enabledLayers,
                autoFix: document.getElementById('autoFix').checked,
                diagnosticsLevel: document.getElementById('diagnosticsLevel').value,
                enterpriseFeatures: {
                    enabled: document.getElementById('enterpriseEnabled').checked,
                    teamId: document.getElementById('teamId').value,
                    auditLogging: document.getElementById('auditLogging').checked,
                    complianceMode: document.getElementById('complianceMode').checked
                }
            };

            vscode.postMessage({ command: 'saveConfig', config: config });
        }

        function testConnection() {
            const apiUrl = document.getElementById('apiUrl').value;
            const apiKey = document.getElementById('apiKey').value;
            vscode.postMessage({ command: 'testConnection', apiUrl: apiUrl, apiKey: apiKey });
        }

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'configLoaded') {
                const config = message.config;
                document.getElementById('apiUrl').value = config.apiUrl || '';
                document.getElementById('apiKey').value = config.apiKey || '';
                document.getElementById('autoFix').checked = config.autoFix || false;
                document.getElementById('diagnosticsLevel').value = config.diagnosticsLevel || 'warning';

                // Set enabled layers
                const enabledLayers = config.enabledLayers || [];
                for (let i = 1; i <= 6; i++) {
                    document.getElementById('layer' + i).checked = enabledLayers.includes(i);
                }

                // Set enterprise settings
                if (config.enterpriseFeatures) {
                    document.getElementById('enterpriseEnabled').checked = config.enterpriseFeatures.enabled || false;
                    document.getElementById('teamId').value = config.enterpriseFeatures.teamId || '';
                    document.getElementById('auditLogging').checked = config.enterpriseFeatures.auditLogging || false;
                    document.getElementById('complianceMode').checked = config.enterpriseFeatures.complianceMode || false;
                }
            }
        });

        // Load configuration on startup
        loadConfiguration();
    </script>
</body>
</html>`;
  }
}
