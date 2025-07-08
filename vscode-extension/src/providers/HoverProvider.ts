import * as vscode from "vscode";
import { NeuroLintProvider } from "./NeuroLintProvider";

export class HoverProvider implements vscode.HoverProvider {
  constructor(private neurolintProvider: NeuroLintProvider) {}

  async provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Promise<vscode.Hover | undefined> {
    // Get diagnostics for the current position
    const diagnostics = vscode.languages.getDiagnostics(document.uri);
    const neurolintDiagnostics = diagnostics.filter(
      (diagnostic) =>
        diagnostic.source === "NeuroLint" &&
        diagnostic.range.contains(position),
    );

    if (neurolintDiagnostics.length === 0) {
      return undefined;
    }

    const contents: vscode.MarkdownString[] = [];

    for (const diagnostic of neurolintDiagnostics) {
      const markdown = new vscode.MarkdownString();
      markdown.isTrusted = true;

      // Add main diagnostic information
      markdown.appendMarkdown(`**NeuroLint: ${diagnostic.message}**\n\n`);

      // Add rule information
      if (diagnostic.code) {
        markdown.appendMarkdown(`**Rule:** \`${diagnostic.code}\`\n\n`);

        // Add rule description if available
        const ruleDescription = this.getRuleDescription(
          diagnostic.code.toString(),
        );
        if (ruleDescription) {
          markdown.appendMarkdown(`${ruleDescription}\n\n`);
        }
      }

      // Add severity badge
      const severityBadge = this.getSeverityBadge(diagnostic.severity);
      markdown.appendMarkdown(`${severityBadge}\n\n`);

      // Add layer information from related information
      if (
        diagnostic.relatedInformation &&
        diagnostic.relatedInformation.length > 0
      ) {
        const layerInfo = diagnostic.relatedInformation[0].message;
        markdown.appendMarkdown(`**${layerInfo}**\n\n`);
      }

      // Add action buttons
      markdown.appendMarkdown(
        `[Quick Fix](command:neurolint.quickFix?${encodeURIComponent(JSON.stringify([document.uri, diagnostic]))}) | `,
      );
      markdown.appendMarkdown(
        `[Analyze File](command:neurolint.analyzeFile) | `,
      );
      markdown.appendMarkdown(
        `[Show Rule Info](command:neurolint.showRuleInfo?${encodeURIComponent(JSON.stringify([diagnostic.code]))})`,
      );

      contents.push(markdown);
    }

    const range = new vscode.Range(position, position);
    return new vscode.Hover(contents, range);
  }

  private getRuleDescription(rule: string): string | undefined {
    const ruleDescriptions: { [key: string]: string } = {
      "typescript-target":
        "TypeScript compilation target should be ES2020 or higher for better performance and modern features.",
      "react-key-missing":
        "React elements in arrays should have a unique `key` prop for optimal rendering performance.",
      "html-entity-corruption":
        "HTML entities like `&quot;` should be replaced with proper quotes for better readability.",
      "ssr-unsafe-access":
        'Browser APIs like `localStorage` should be guarded with `typeof window !== "undefined"` for SSR compatibility.',
      "missing-alt-text":
        "Images should have descriptive `alt` attributes for accessibility.",
      "console-log-detected":
        "Console.log statements should be removed from production code.",
      "deprecated-react-api":
        "This React API is deprecated and should be updated to the modern equivalent.",
      "nextjs-image-optimization":
        "Use `next/image` component for automatic image optimization.",
      "missing-error-boundary":
        "Components that may error should be wrapped in error boundaries.",
      "performance-anti-pattern":
        "This pattern may cause performance issues and should be optimized.",
    };

    return ruleDescriptions[rule];
  }

  private getSeverityBadge(severity: vscode.DiagnosticSeverity): string {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return "![Error](https://img.shields.io/badge/Severity-Error-red)";
      case vscode.DiagnosticSeverity.Warning:
        return "![Warning](https://img.shields.io/badge/Severity-Warning-orange)";
      case vscode.DiagnosticSeverity.Information:
        return "![Info](https://img.shields.io/badge/Severity-Info-blue)";
      default:
        return "![Hint](https://img.shields.io/badge/Severity-Hint-green)";
    }
  }

  static registerCommands(context: vscode.ExtensionContext): void {
    const showRuleInfoCommand = vscode.commands.registerCommand(
      "neurolint.showRuleInfo",
      async (rule: string) => {
        const panel = vscode.window.createWebviewPanel(
          "neurolintRuleInfo",
          `NeuroLint Rule: ${rule}`,
          vscode.ViewColumn.Beside,
          { enableScripts: true },
        );

        panel.webview.html = this.getRuleInfoHtml(rule);
      },
    );

    context.subscriptions.push(showRuleInfoCommand);
  }

  private static getRuleInfoHtml(rule: string): string {
    const ruleInfo = this.getDetailedRuleInfo(rule);

    return `<!DOCTYPE html>
<html>
<head>
    <title>NeuroLint Rule: ${rule}</title>
    <style>
        body { 
            font-family: var(--vscode-font-family); 
            padding: 20px;
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
        }
        .rule-header { 
            border-bottom: 2px solid var(--vscode-panel-border); 
            padding-bottom: 10px; 
            margin-bottom: 20px; 
        }
        .section { 
            margin: 20px 0; 
        }
        .example { 
            background-color: var(--vscode-textBlockQuote-background); 
            padding: 15px; 
            border-left: 4px solid var(--vscode-textBlockQuote-border);
            margin: 10px 0;
        }
        .good { border-left-color: #4caf50; }
        .bad { border-left-color: #f44336; }
        pre { 
            background-color: var(--vscode-textPreformat-background); 
            padding: 10px; 
            border-radius: 4px;
            overflow-x: auto;
        }
        .severity-badge {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            color: white;
        }
        .error { background-color: #f44336; }
        .warning { background-color: #ff9800; }
        .info { background-color: #2196f3; }
    </style>
</head>
<body>
    <div class="rule-header">
        <h1>Rule: ${rule}</h1>
        <span class="severity-badge ${ruleInfo.severity}">${ruleInfo.severity.toUpperCase()}</span>
        <p><strong>Layer:</strong> ${ruleInfo.layer}</p>
    </div>

    <div class="section">
        <h3>Description</h3>
        <p>${ruleInfo.description}</p>
    </div>

    <div class="section">
        <h3>Why This Matters</h3>
        <p>${ruleInfo.rationale}</p>
    </div>

    ${
      ruleInfo.badExample
        ? `
    <div class="section">
        <h3>Problem Example</h3>
        <div class="example bad">
            <pre><code>${ruleInfo.badExample}</code></pre>
        </div>
    </div>
    `
        : ""
    }

    ${
      ruleInfo.goodExample
        ? `
    <div class="section">
        <h3>Solution Example</h3>
        <div class="example good">
            <pre><code>${ruleInfo.goodExample}</code></pre>
        </div>
    </div>
    `
        : ""
    }

    <div class="section">
        <h3>How to Fix</h3>
        <ul>
            ${ruleInfo.fixSteps.map((step) => `<li>${step}</li>`).join("")}
        </ul>
    </div>

    <div class="section">
        <h3>Learn More</h3>
        <ul>
            ${ruleInfo.resources.map((resource) => `<li><a href="${resource.url}">${resource.title}</a></li>`).join("")}
        </ul>
    </div>
</body>
</html>`;
  }

  private static getDetailedRuleInfo(rule: string): any {
    const ruleInfoMap: { [key: string]: any } = {
      "typescript-target": {
        severity: "warning",
        layer: "Layer 1: Configuration",
        description:
          "TypeScript compilation target should be ES2020 or higher for better performance and modern features.",
        rationale:
          "Modern TypeScript targets provide better performance, smaller bundle sizes, and access to native JavaScript features without polyfills.",
        badExample: `// tsconfig.json
{
  "compilerOptions": {
    "target": "es5"
  }
}`,
        goodExample: `// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020"
  }
}`,
        fixSteps: [
          "Update tsconfig.json target to ES2020 or higher",
          "Remove unnecessary polyfills",
          "Test your application in target browsers",
        ],
        resources: [
          {
            title: "TypeScript Compiler Options",
            url: "https://www.typescriptlang.org/tsconfig#target",
          },
          {
            title: "ES2020 Features",
            url: "https://262.ecma-international.org/11.0/",
          },
        ],
      },
      "react-key-missing": {
        severity: "error",
        layer: "Layer 3: Components",
        description:
          "React elements in arrays should have a unique key prop for optimal rendering performance.",
        rationale:
          "Keys help React identify which items have changed, are added, or are removed, leading to better performance and preventing rendering bugs.",
        badExample: `items.map(item => (
  <div>{item.name}</div>
))`,
        goodExample: `items.map(item => (
  <div key={item.id}>{item.name}</div>
))`,
        fixSteps: [
          "Add a unique key prop to each element in the array",
          "Use a stable identifier like id or index as last resort",
          "Avoid using array index when items can be reordered",
        ],
        resources: [
          {
            title: "React Keys Documentation",
            url: "https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key",
          },
          {
            title: "Why Keys Matter",
            url: "https://react.dev/learn/preserving-and-resetting-state#different-components-at-the-same-position-reset-state",
          },
        ],
      },
    };

    return (
      ruleInfoMap[rule] || {
        severity: "info",
        layer: "Unknown",
        description: `Rule ${rule} needs documentation.`,
        rationale: "This rule helps improve code quality.",
        fixSteps: ["Refer to NeuroLint documentation"],
        resources: [
          {
            title: "NeuroLint Documentation",
            url: "https://docs.neurolint.com",
          },
        ],
      }
    );
  }
}
