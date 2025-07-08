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

## Quick Start

1. Install the extension from the VS Code Marketplace
2. Configure your API settings: `Ctrl+Shift+P` → "NeuroLint: Configure"
3. Set your API key: `Ctrl+Shift+P` → "NeuroLint: Login"
4. Analyze your first file: `Ctrl+Shift+L`

## Commands

| Command                         | Keyboard Shortcut | Description               |
| ------------------------------- | ----------------- | ------------------------- |
| NeuroLint: Analyze Current File | `Ctrl+Shift+L`    | Analyze the active file   |
| NeuroLint: Fix Current File     | `Ctrl+Shift+F`    | Fix issues in active file |
| NeuroLint: Analyze Workspace    | `Ctrl+Shift+W`    | Analyze entire workspace  |
| NeuroLint: Configure            | -                 | Open configuration dialog |

## Configuration

Configure NeuroLint through VS Code settings or the configuration dialog:

```json
{
  "neurolint.apiUrl": "http://localhost:5000",
  "neurolint.apiKey": "your-api-key-here",
  "neurolint.enabledLayers": [1, 2, 3, 4],
  "neurolint.autoFix": false,
  "neurolint.diagnosticsLevel": "warning"
}
```

## Analysis Layers

1. **Configuration Validation** - TypeScript config and project setup
2. **Pattern & Entity Analysis** - Code patterns and relationships
3. **Component Best Practices** - React component optimization
4. **Hydration & SSR Guards** - Next.js SSR compatibility
5. **Next.js Optimization** - Framework-specific enhancements
6. **Testing Integration** - Test coverage and patterns

## Enterprise Features

Enable enterprise features in settings:

```json
{
  "neurolint.enterpriseFeatures.enabled": true,
  "neurolint.enterpriseFeatures.teamId": "your-team-id"
}
```

Access enterprise features through:

- `Ctrl+Shift+P` → "NeuroLint Enterprise: Dashboard"
- `Ctrl+Shift+P` → "NeuroLint Enterprise: Analytics"
- `Ctrl+Shift+P` → "NeuroLint Enterprise: Team"

## Requirements

- VS Code 1.74.0 or higher
- Node.js 16.0.0 or higher
- NeuroLint API server (local or cloud)

## Support

- [Documentation](https://docs.neurolint.com)
- [GitHub Issues](https://github.com/neurolint/neurolint-vscode/issues)
- Enterprise Support: enterprise@neurolint.com

## License

MIT License - see LICENSE file for details.
