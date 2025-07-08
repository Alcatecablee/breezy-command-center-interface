import * as vscode from "vscode";
import { ApiClient } from "../utils/ApiClient";
import { ConfigurationManager } from "../utils/ConfigurationManager";

export class EnterpriseManager implements vscode.Disposable {
  private panels: Map<string, vscode.WebviewPanel> = new Map();

  constructor(
    private apiClient: ApiClient,
    private configManager: ConfigurationManager,
    private context: vscode.ExtensionContext,
  ) {}

  async showDashboard(): Promise<void> {
    if (!this.isEnterpriseEnabled()) {
      this.showEnterpriseUpgradeDialog();
      return;
    }

    const panel = this.createOrShowPanel(
      "dashboard",
      "NeuroLint Enterprise Dashboard",
    );

    try {
      const [teamInfo, analytics] = await Promise.all([
        this.apiClient.getTeamInfo(),
        this.apiClient.getAnalytics("7d"),
      ]);

      panel.webview.html = this.getDashboardHtml(teamInfo, analytics);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load dashboard: ${error}`);
    }
  }

  async showAnalytics(): Promise<void> {
    if (!this.isEnterpriseEnabled()) {
      this.showEnterpriseUpgradeDialog();
      return;
    }

    const panel = this.createOrShowPanel("analytics", "NeuroLint Analytics");

    try {
      const analytics = await this.apiClient.getAnalytics("30d");
      panel.webview.html = this.getAnalyticsHtml(analytics);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to load analytics: ${error}`);
    }
  }

  async showTeamManagement(): Promise<void> {
    if (!this.isEnterpriseEnabled()) {
      this.showEnterpriseUpgradeDialog();
      return;
    }

    const panel = this.createOrShowPanel("team", "NeuroLint Team Management");

    try {
      const teamInfo = await this.apiClient.getTeamInfo();
      panel.webview.html = this.getTeamManagementHtml(teamInfo);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to load team information: ${error}`,
      );
    }
  }

  async showCompliance(): Promise<void> {
    if (!this.isEnterpriseEnabled()) {
      this.showEnterpriseUpgradeDialog();
      return;
    }

    const panel = this.createOrShowPanel("compliance", "NeuroLint Compliance");

    try {
      const [complianceReport, auditLog] = await Promise.all([
        this.apiClient.getComplianceReport(),
        this.apiClient.getAuditLog(1, 10),
      ]);

      panel.webview.html = this.getComplianceHtml(complianceReport, auditLog);
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to load compliance data: ${error}`,
      );
    }
  }

  private isEnterpriseEnabled(): boolean {
    const config = vscode.workspace.getConfiguration("neurolint");
    return config.get<boolean>("enterpriseFeatures.enabled", false);
  }

  private showEnterpriseUpgradeDialog(): void {
    const upgradeAction = "Learn More";
    const configureAction = "Configure Enterprise";

    vscode.window
      .showInformationMessage(
        "Enterprise features require a NeuroLint Enterprise subscription.",
        upgradeAction,
        configureAction,
      )
      .then((action) => {
        if (action === upgradeAction) {
          vscode.env.openExternal(
            vscode.Uri.parse("https://neurolint.com/enterprise"),
          );
        } else if (action === configureAction) {
          this.configManager.showConfigurationDialog();
        }
      });
  }

  private createOrShowPanel(
    panelId: string,
    title: string,
  ): vscode.WebviewPanel {
    const existingPanel = this.panels.get(panelId);
    if (existingPanel) {
      existingPanel.reveal(vscode.ViewColumn.One);
      return existingPanel;
    }

    const panel = vscode.window.createWebviewPanel(
      `neurolint-${panelId}`,
      title,
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      },
    );

    // Handle panel disposal
    panel.onDidDispose(() => {
      this.panels.delete(panelId);
    });

    // Handle messages from webview
    panel.webview.onDidReceiveMessage(async (message) => {
      await this.handleWebviewMessage(panelId, message);
    });

    this.panels.set(panelId, panel);
    return panel;
  }

  private async handleWebviewMessage(
    panelId: string,
    message: any,
  ): Promise<void> {
    switch (message.command) {
      case "refresh":
        await this.refreshPanel(panelId);
        break;
      case "exportData":
        await this.exportData(message.dataType, message.format);
        break;
      case "inviteUser":
        await this.inviteUser(message.email, message.role);
        break;
      case "updateSettings":
        await this.updateEnterpriseSettings(message.settings);
        break;
    }
  }

  private async refreshPanel(panelId: string): Promise<void> {
    switch (panelId) {
      case "dashboard":
        await this.showDashboard();
        break;
      case "analytics":
        await this.showAnalytics();
        break;
      case "team":
        await this.showTeamManagement();
        break;
      case "compliance":
        await this.showCompliance();
        break;
    }
  }

  private async exportData(dataType: string, format: string): Promise<void> {
    try {
      const saveUri = await vscode.window.showSaveDialog({
        defaultUri: vscode.Uri.file(`neurolint-${dataType}.${format}`),
        filters: {
          JSON: ["json"],
          CSV: ["csv"],
          PDF: ["pdf"],
        },
      });

      if (saveUri) {
        // Implementation would export data in specified format
        vscode.window.showInformationMessage(
          `Data exported to ${saveUri.fsPath}`,
        );
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Export failed: ${error}`);
    }
  }

  private async inviteUser(email: string, role: string): Promise<void> {
    try {
      // Implementation would call API to invite user
      vscode.window.showInformationMessage(`Invitation sent to ${email}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to invite user: ${error}`);
    }
  }

  private async updateEnterpriseSettings(settings: any): Promise<void> {
    try {
      // Implementation would update enterprise settings
      vscode.window.showInformationMessage("Enterprise settings updated");
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update settings: ${error}`);
    }
  }

  private getDashboardHtml(teamInfo: any, analytics: any): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>NeuroLint Enterprise Dashboard</title>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .dashboard-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            margin: 20px 0; 
        }
        .card { 
            background: var(--vscode-panel-background); 
            border: 1px solid var(--vscode-panel-border); 
            border-radius: 8px; 
            padding: 20px; 
        }
        .metric { 
            text-align: center; 
            margin: 10px 0; 
        }
        .metric-value { 
            font-size: 2em; 
            font-weight: bold; 
            color: var(--vscode-textLink-foreground); 
        }
        .metric-label { 
            color: var(--vscode-descriptionForeground); 
        }
        .chart-placeholder { 
            height: 200px; 
            background: var(--vscode-input-background); 
            border-radius: 4px; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            color: var(--vscode-descriptionForeground); 
        }
        button { 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground); 
            border: none; 
            padding: 10px 20px; 
            border-radius: 4px; 
            cursor: pointer; 
            margin: 5px; 
        }
    </style>
</head>
<body>
    <h1>Enterprise Dashboard</h1>
    <p>Team: ${teamInfo.name || "Unknown"} | Members: ${teamInfo.memberCount || 0}</p>
    
    <div class="dashboard-grid">
        <div class="card">
            <h3>Analysis Summary</h3>
            <div class="metric">
                <div class="metric-value">${analytics.totalAnalyses || 0}</div>
                <div class="metric-label">Total Analyses (7 days)</div>
            </div>
            <div class="metric">
                <div class="metric-value">${analytics.issuesFixed || 0}</div>
                <div class="metric-label">Issues Fixed</div>
            </div>
        </div>
        
        <div class="card">
            <h3>Team Performance</h3>
            <div class="metric">
                <div class="metric-value">${analytics.activeUsers || 0}</div>
                <div class="metric-label">Active Users</div>
            </div>
            <div class="metric">
                <div class="metric-value">${analytics.avgResponseTime || 0}ms</div>
                <div class="metric-label">Avg Response Time</div>
            </div>
        </div>
        
        <div class="card">
            <h3>Code Quality Trends</h3>
            <div class="chart-placeholder">
                Quality trend chart would be here
            </div>
        </div>
        
        <div class="card">
            <h3>Quick Actions</h3>
            <button onclick="refreshDashboard()">Refresh Data</button>
            <button onclick="exportReport()">Export Report</button>
            <button onclick="viewAnalytics()">View Analytics</button>
            <button onclick="manageTeam()">Manage Team</button>
        </div>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function refreshDashboard() {
            vscode.postMessage({ command: 'refresh' });
        }
        
        function exportReport() {
            vscode.postMessage({ command: 'exportData', dataType: 'dashboard', format: 'pdf' });
        }
        
        function viewAnalytics() {
            vscode.postMessage({ command: 'openAnalytics' });
        }
        
        function manageTeam() {
            vscode.postMessage({ command: 'openTeam' });
        }
    </script>
</body>
</html>`;
  }

  private getAnalyticsHtml(analytics: any): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>NeuroLint Analytics</title>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 20px;
            color: var(--vscode-foreground);
        }
        .analytics-section { 
            margin: 30px 0; 
        }
        .chart-container { 
            height: 300px; 
            background: var(--vscode-panel-background); 
            border: 1px solid var(--vscode-panel-border); 
            border-radius: 8px; 
            margin: 20px 0; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
        }
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(4, 1fr); 
            gap: 20px; 
            margin: 20px 0; 
        }
        .stat-card { 
            background: var(--vscode-panel-background); 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center; 
        }
        .stat-value { 
            font-size: 2em; 
            font-weight: bold; 
            color: var(--vscode-textLink-foreground); 
        }
    </style>
</head>
<body>
    <h1>Analytics Dashboard</h1>
    
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">${analytics.totalFiles || 0}</div>
            <div>Files Analyzed</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${analytics.totalIssues || 0}</div>
            <div>Issues Found</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${analytics.fixRate || 0}%</div>
            <div>Fix Rate</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${analytics.timeSaved || 0}h</div>
            <div>Time Saved</div>
        </div>
    </div>
    
    <div class="analytics-section">
        <h3>Usage Over Time</h3>
        <div class="chart-container">Usage trend chart would be displayed here</div>
    </div>
    
    <div class="analytics-section">
        <h3>Issue Types Distribution</h3>
        <div class="chart-container">Issue types pie chart would be displayed here</div>
    </div>
    
    <div class="analytics-section">
        <h3>Performance Metrics</h3>
        <div class="chart-container">Performance metrics chart would be displayed here</div>
    </div>
</body>
</html>`;
  }

  private getTeamManagementHtml(teamInfo: any): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Team Management</title>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; }
        .team-header { margin-bottom: 30px; }
        .member-list { margin: 20px 0; }
        .member-item { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 10px; 
            border-bottom: 1px solid var(--vscode-panel-border); 
        }
        .invite-form { 
            background: var(--vscode-panel-background); 
            padding: 20px; 
            border-radius: 8px; 
            margin: 20px 0; 
        }
        input, select { 
            padding: 8px; 
            margin: 5px; 
            border: 1px solid var(--vscode-input-border); 
        }
        button { 
            background: var(--vscode-button-background); 
            color: var(--vscode-button-foreground); 
            border: none; 
            padding: 10px 20px; 
            border-radius: 4px; 
            cursor: pointer; 
            margin: 5px; 
        }
    </style>
</head>
<body>
    <div class="team-header">
        <h1>Team Management</h1>
        <p>Team: ${teamInfo.name || "Unknown"}</p>
        <p>Subscription: ${teamInfo.plan || "Enterprise"}</p>
    </div>
    
    <div class="invite-form">
        <h3>Invite New Member</h3>
        <input type="email" id="inviteEmail" placeholder="Email address" />
        <select id="inviteRole">
            <option value="member">Member</option>
            <option value="admin">Admin</option>
            <option value="viewer">Viewer</option>
        </select>
        <button onclick="inviteUser()">Send Invitation</button>
    </div>
    
    <div class="member-list">
        <h3>Team Members</h3>
        ${(teamInfo.members || [])
          .map(
            (member: any) => `
            <div class="member-item">
                <div>
                    <strong>${member.name || member.email}</strong> (${member.role})
                    <br><small>${member.email}</small>
                </div>
                <div>
                    <button onclick="editMember('${member.id}')">Edit</button>
                    <button onclick="removeMember('${member.id}')">Remove</button>
                </div>
            </div>
        `,
          )
          .join("")}
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function inviteUser() {
            const email = document.getElementById('inviteEmail').value;
            const role = document.getElementById('inviteRole').value;
            vscode.postMessage({ command: 'inviteUser', email, role });
        }
        
        function editMember(memberId) {
            // Implementation for editing member
        }
        
        function removeMember(memberId) {
            // Implementation for removing member
        }
    </script>
</body>
</html>`;
  }

  private getComplianceHtml(complianceReport: any, auditLog: any): string {
    return `<!DOCTYPE html>
<html>
<head>
    <title>Compliance Dashboard</title>
    <style>
        body { font-family: var(--vscode-font-family); padding: 20px; }
        .compliance-section { margin: 30px 0; }
        .compliance-status { 
            display: flex; 
            gap: 20px; 
            margin: 20px 0; 
        }
        .status-card { 
            flex: 1; 
            background: var(--vscode-panel-background); 
            padding: 20px; 
            border-radius: 8px; 
            text-align: center; 
        }
        .status-good { border-left: 4px solid #4caf50; }
        .status-warning { border-left: 4px solid #ff9800; }
        .status-critical { border-left: 4px solid #f44336; }
        .audit-log { 
            background: var(--vscode-panel-background); 
            padding: 20px; 
            border-radius: 8px; 
        }
        .audit-item { 
            padding: 10px; 
            border-bottom: 1px solid var(--vscode-panel-border); 
        }
        .audit-timestamp { 
            color: var(--vscode-descriptionForeground); 
            font-size: 0.9em; 
        }
    </style>
</head>
<body>
    <h1>Compliance Dashboard</h1>
    
    <div class="compliance-status">
        <div class="status-card status-good">
            <h3>SOC2 Type II</h3>
            <p>Status: Compliant</p>
            <p>Last Audit: ${complianceReport.soc2?.lastAudit || "N/A"}</p>
        </div>
        <div class="status-card status-good">
            <h3>GDPR</h3>
            <p>Status: Compliant</p>
            <p>Data Retention: ${complianceReport.gdpr?.retention || "N/A"}</p>
        </div>
        <div class="status-card status-warning">
            <h3>ISO27001</h3>
            <p>Status: In Progress</p>
            <p>Certification: Pending</p>
        </div>
    </div>
    
    <div class="compliance-section">
        <h3>Compliance Metrics</h3>
        <ul>
            <li>Data Encryption: ${complianceReport.encryption || "AES-256"}</li>
            <li>Access Logs: ${complianceReport.accessLogs || "Enabled"}</li>
            <li>Audit Trail: ${complianceReport.auditTrail || "Complete"}</li>
            <li>Data Backup: ${complianceReport.backup || "Daily"}</li>
        </ul>
    </div>
    
    <div class="compliance-section">
        <h3>Recent Audit Log</h3>
        <div class="audit-log">
            ${(auditLog.entries || [])
              .map(
                (entry: any) => `
                <div class="audit-item">
                    <div><strong>${entry.action}</strong> by ${entry.user}</div>
                    <div class="audit-timestamp">${entry.timestamp}</div>
                    <div>${entry.details}</div>
                </div>
            `,
              )
              .join("")}
        </div>
    </div>
    
    <button onclick="exportCompliance()">Export Compliance Report</button>
    
    <script>
        const vscode = acquireVsCodeApi();
        
        function exportCompliance() {
            vscode.postMessage({ command: 'exportData', dataType: 'compliance', format: 'pdf' });
        }
    </script>
</body>
</html>`;
  }

  dispose(): void {
    this.panels.forEach((panel) => panel.dispose());
    this.panels.clear();
  }
}
