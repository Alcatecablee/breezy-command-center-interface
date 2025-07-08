# NeuroLint VS Code Extension

Advanced rule-based code analysis and transformation for VS Code with enterprise-grade features.

## Features

### Core Analysis

- **Multi-layer analysis system** with 6 configurable layers
- **Real-time diagnostics** with instant feedback
- **Intelligent code fixes** with preview and auto-apply
- **TypeScript and React optimization** with framework-specific rules
- **Workspace-wide analysis** with progress tracking

### Enterprise Features

- **Team Management** - Collaborate with team members and manage permissions
- **Analytics Dashboard** - Executive insights and team performance metrics
- **Compliance Reporting** - SOC2, GDPR, and ISO27001 compliance tracking
- **Audit Trail** - Complete logging for enterprise governance
- **SSO Integration** - SAML, OIDC, and OAuth2 support
- **Webhook Integration** - Real-time notifications and CI/CD integration

### Developer Experience

- **Status bar integration** with progress indicators
- **Interactive webviews** for detailed analysis results
- **Keyboard shortcuts** for quick actions
- **Customizable diagnostics** with severity levels
- **Export/import configuration** for team standardization

## Installation

### From VS Code Marketplace

1. Open VS Code
2. Go to Extensions (Ctrl+Shift+X)
3. Search for "NeuroLint"
4. Click Install

### From VSIX

1. Download the `.vsix` file
2. Open VS Code
3. Run `Extensions: Install from VSIX...` command
4. Select the downloaded file

## Quick Start

### Basic Setup

1. **Install the extension**
2. **Configure API settings**:
   ```
   Ctrl+Shift+P → "NeuroLint: Configure"
   ```
3. **Set your API key**:
   ```
   Ctrl+Shift+P → "NeuroLint: Login"
   ```
4. **Analyze your first file**:
   ```
   Ctrl+Shift+L (or right-click → "NeuroLint: Analyze Current File")
   ```

### Enterprise Setup

1. **Enable enterprise features**:
   ```json
   {
     "neurolint.enterpriseFeatures.enabled": true,
     "neurolint.enterpriseFeatures.teamId": "your-team-id"
   }
   ```
2. **Configure compliance mode** (if required):
   ```json
   {
     "neurolint.enterpriseFeatures.complianceMode": true,
     "neurolint.enterpriseFeatures.auditLogging": true
   }
   ```
3. **Access enterprise features**:
   ```
   Ctrl+Shift+P → "NeuroLint Enterprise: Dashboard"
   ```

## Configuration

### Basic Settings

| Setting                      | Description                     | Default                 |
| ---------------------------- | ------------------------------- | ----------------------- |
| `neurolint.apiUrl`           | NeuroLint API server URL        | `http://localhost:5000` |
| `neurolint.apiKey`           | API key for authentication      | `""`                    |
| `neurolint.enabledLayers`    | Analysis layers to enable (1-6) | `[1,2,3,4]`             |
| `neurolint.autoFix`          | Auto-fix on save                | `false`                 |
| `neurolint.diagnosticsLevel` | Diagnostic severity level       | `"warning"`             |

### Enterprise Settings

| Setting                                       | Description                | Default |
| --------------------------------------------- | -------------------------- | ------- |
| `neurolint.enterpriseFeatures.enabled`        | Enable enterprise features | `false` |
| `neurolint.enterpriseFeatures.teamId`         | Enterprise team ID         | `""`    |
| `neurolint.enterpriseFeatures.ssoEnabled`     | Enable SSO authentication  | `false` |
| `neurolint.enterpriseFeatures.auditLogging`   | Enable audit logging       | `false` |
| `neurolint.enterpriseFeatures.complianceMode` | Enable compliance mode     | `false` |

### Workspace Settings

| Setting                               | Description               | Default                        |
| ------------------------------------- | ------------------------- | ------------------------------ |
| `neurolint.workspace.maxFileSize`     | Maximum file size (bytes) | `10485760` (10MB)              |
| `neurolint.workspace.maxFiles`        | Maximum files to analyze  | `1000`                         |
| `neurolint.workspace.excludePatterns` | File patterns to exclude  | `["**/node_modules/**", ...]`  |
| `neurolint.workspace.includePatterns` | File patterns to include  | `["**/*.ts", "**/*.tsx", ...]` |

## Usage

### Commands

| Command                           | Keyboard Shortcut | Description                 |
| --------------------------------- | ----------------- | --------------------------- |
| `NeuroLint: Analyze Current File` | `Ctrl+Shift+L`    | Analyze the active file     |
| `NeuroLint: Fix Current File`     | `Ctrl+Shift+F`    | Fix issues in active file   |
| `NeuroLint: Analyze Workspace`    | `Ctrl+Shift+W`    | Analyze entire workspace    |
| `NeuroLint: Configure`            | -                 | Open configuration dialog   |
| `NeuroLint: Show Output`          | -                 | Show NeuroLint output panel |

### Enterprise Commands

| Command                            | Description               |
| ---------------------------------- | ------------------------- |
| `NeuroLint Enterprise: Dashboard`  | Open enterprise dashboard |
| `NeuroLint Enterprise: Analytics`  | View team analytics       |
| `NeuroLint Enterprise: Team`       | Manage team members       |
| `NeuroLint Enterprise: Compliance` | View compliance reports   |
| `NeuroLint Enterprise: Audit`      | View audit trail          |

### Analysis Layers

1. **Configuration Validation** - TypeScript config and project setup
2. **Pattern & Entity Analysis** - Code patterns and relationships
3. **Component Best Practices** - React component optimization
4. **Hydration & SSR Guards** - Next.js SSR compatibility
5. **Next.js Optimization** - Framework-specific enhancements
6. **Testing Integration** - Test coverage and patterns

### File Support

- **TypeScript** (`.ts`, `.tsx`)
- **JavaScript** (`.js`, `.jsx`)
- **React components** with JSX/TSX
- **Next.js applications**
- **Node.js projects**

## Enterprise Features

### Team Management

- **User roles**: Admin, Member, Viewer
- **Permission control** for analysis and fixes
- **Team analytics** and performance tracking
- **Centralized configuration** management

### Compliance & Auditing

- **SOC2 Type II** compliance tracking
- **GDPR** data protection compliance
- **ISO27001** security standards
- **Audit trail** with detailed logging
- **Compliance reports** with evidence

### Analytics & Reporting

- **Executive dashboards** with KPIs
- **Team performance** metrics
- **Code quality trends** over time
- **ROI analysis** and cost savings
- **Export capabilities** (JSON, CSV, PDF)

### Integration & Automation

- **Webhook support** for CI/CD
- **SSO integration** with enterprise identity
- **API access** for custom integrations
- **Bulk operations** for large codebases

## Troubleshooting

### Common Issues

**Connection Problems**

```
Error: Cannot connect to NeuroLint API
```

- Check API URL in settings
- Verify NeuroLint server is running
- Check network connectivity

**Authentication Issues**

```
Error: Authentication failed
```

- Verify API key is correct
- Check if enterprise authentication is required
- Ensure user has proper permissions

**Performance Issues**

```
Analysis is slow or timing out
```

- Reduce `maxFiles` in workspace settings
- Increase `timeout` setting
- Exclude large directories (node_modules, dist)

### Enterprise Issues

**Team Access Problems**

```
Error: Team not found or access denied
```

- Verify team ID is correct
- Check user permissions in team
- Contact team administrator

**Compliance Mode Issues**

```
Compliance features not available
```

- Enable compliance mode in settings
- Verify enterprise subscription
- Check audit logging configuration

### Log Analysis

1. **Open output panel**: `NeuroLint: Show Output`
2. **Check log entries** for error details
3. **Enable audit logging** for enterprise debugging
4. **Export logs** for support analysis

## Support

### Documentation

- [Official Documentation](https://docs.neurolint.com)
- [API Reference](https://api.neurolint.com/docs)
- [Enterprise Guide](https://docs.neurolint.com/enterprise)

### Community

- [GitHub Issues](https://github.com/neurolint/neurolint-vscode/issues)
- [Discussion Forum](https://github.com/neurolint/neurolint-vscode/discussions)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/neurolint)

### Enterprise Support

- **Email**: enterprise@neurolint.com
- **Slack**: Enterprise customers get dedicated Slack channel
- **Phone**: Available for Enterprise Pro customers
- **SLA**: Response times based on subscription level

## Contributing

1. **Fork the repository**
2. **Create feature branch**: `git checkout -b feature/amazing-feature`
3. **Commit changes**: `git commit -m 'Add amazing feature'`
4. **Push branch**: `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Development Setup

```bash
# Clone repository
git clone https://github.com/neurolint/neurolint-vscode.git

# Install dependencies
npm install

# Start development
npm run watch

# Test extension
F5 (Launch Extension Development Host)
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for release history and updates.
