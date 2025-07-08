
import * as vscode from "vscode";
import { ApiClient } from "../utils/ApiClient";

interface CompletionCache {
  [key: string]: {
    items: vscode.CompletionItem[];
    timestamp: number;
  };
}

export class NeuroLintCompletionProvider implements vscode.CompletionItemProvider {
  private cache: CompletionCache = {};
  private readonly CACHE_TTL = 10 * 60 * 1000; // 10 minutes

  constructor(
    private apiClient: ApiClient,
    private outputChannel: vscode.OutputChannel
  ) {}

  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): Promise<vscode.CompletionList> {
    try {
      // Get current line and context
      const line = document.lineAt(position);
      const linePrefix = line.text.substring(0, position.character);
      const cacheKey = this.getCacheKey(document, position, linePrefix);

      // Check cache
      const cached = this.cache[cacheKey];
      if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
        return new vscode.CompletionList(cached.items, false);
      }

      // Generate completions based on context
      const completions = await this.generateCompletions(document, position, linePrefix);
      
      // Cache results
      this.cache[cacheKey] = {
        items: completions,
        timestamp: Date.now()
      };

      return new vscode.CompletionList(completions, true);
    } catch (error) {
      this.outputChannel.appendLine(`Completion error: ${error}`);
      return new vscode.CompletionList([], false);
    }
  }

  private async generateCompletions(
    document: vscode.TextDocument,
    position: vscode.Position,
    linePrefix: string
  ): Promise<vscode.CompletionItem[]> {
    const completions: vscode.CompletionItem[] = [];

    // React Hook completions
    if (linePrefix.includes('use') && document.languageId.includes('react')) {
      completions.push(...this.getReactHookCompletions());
    }

    // TypeScript completions
    if (document.languageId === 'typescript' || document.languageId === 'typescriptreact') {
      completions.push(...this.getTypeScriptCompletions(linePrefix));
    }

    // Next.js completions
    if (this.isNextJsProject(document)) {
      completions.push(...this.getNextJsCompletions(linePrefix));
    }

    // NeuroLint specific completions
    completions.push(...this.getNeuroLintCompletions(linePrefix));

    // AI-powered suggestions (if API is available)
    try {
      const aiSuggestions = await this.getAISuggestions(document, position);
      completions.push(...aiSuggestions);
    } catch (error) {
      // Fallback to static completions
    }

    return completions;
  }

  private getReactHookCompletions(): vscode.CompletionItem[] {
    const hooks = [
      {
        label: 'useState',
        insertText: new vscode.SnippetString('useState(${1:initialValue})'),
        detail: 'React Hook',
        documentation: 'Returns a stateful value and a function to update it'
      },
      {
        label: 'useEffect',
        insertText: new vscode.SnippetString('useEffect(() => {\n\t${1:// effect}\n\treturn () => {\n\t\t${2:// cleanup}\n\t};\n}, [${3:dependencies}])'),
        detail: 'React Hook',
        documentation: 'Accepts a function that contains imperative, possibly effectful code'
      },
      {
        label: 'useCallback',
        insertText: new vscode.SnippetString('useCallback(${1:fn}, [${2:dependencies}])'),
        detail: 'React Hook',
        documentation: 'Returns a memoized callback'
      },
      {
        label: 'useMemo',
        insertText: new vscode.SnippetString('useMemo(() => ${1:computation}, [${2:dependencies}])'),
        detail: 'React Hook',
        documentation: 'Returns a memoized value'
      }
    ];

    return hooks.map(hook => {
      const item = new vscode.CompletionItem(hook.label, vscode.CompletionItemKind.Function);
      item.insertText = hook.insertText;
      item.detail = hook.detail;
      item.documentation = new vscode.MarkdownString(hook.documentation);
      return item;
    });
  }

  private getTypeScriptCompletions(linePrefix: string): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];

    // Interface completions
    if (linePrefix.includes('interface')) {
      const interfaceSnippet = new vscode.CompletionItem('interface', vscode.CompletionItemKind.Interface);
      interfaceSnippet.insertText = new vscode.SnippetString('interface ${1:InterfaceName} {\n\t${2:property}: ${3:type};\n}');
      interfaceSnippet.documentation = 'TypeScript interface declaration';
      completions.push(interfaceSnippet);
    }

    // Type completions
    if (linePrefix.includes('type')) {
      const typeSnippet = new vscode.CompletionItem('type', vscode.CompletionItemKind.TypeParameter);
      typeSnippet.insertText = new vscode.SnippetString('type ${1:TypeName} = ${2:type};');
      typeSnippet.documentation = 'TypeScript type alias';
      completions.push(typeSnippet);
    }

    return completions;
  }

  private getNextJsCompletions(linePrefix: string): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];

    // Next.js specific imports
    const nextImports = [
      {
        label: 'import Image from next/image',
        insertText: "import Image from 'next/image';",
        kind: vscode.CompletionItemKind.Module
      },
      {
        label: 'import Link from next/link',
        insertText: "import Link from 'next/link';",
        kind: vscode.CompletionItemKind.Module
      },
      {
        label: 'import { useRouter } from next/router',
        insertText: "import { useRouter } from 'next/router';",
        kind: vscode.CompletionItemKind.Module
      }
    ];

    if (linePrefix.includes('import')) {
      nextImports.forEach(imp => {
        const item = new vscode.CompletionItem(imp.label, imp.kind);
        item.insertText = imp.insertText;
        completions.push(item);
      });
    }

    return completions;
  }

  private getNeuroLintCompletions(linePrefix: string): vscode.CompletionItem[] {
    const completions: vscode.CompletionItem[] = [];

    // NeuroLint disable comments
    if (linePrefix.includes('//') || linePrefix.includes('/*')) {
      const disableComment = new vscode.CompletionItem('neurolint-disable', vscode.CompletionItemKind.Snippet);
      disableComment.insertText = new vscode.SnippetString('neurolint-disable ${1:rule-name}');
      disableComment.documentation = 'Disable NeuroLint rule for next line';
      completions.push(disableComment);

      const disableNextLine = new vscode.CompletionItem('neurolint-disable-next-line', vscode.CompletionItemKind.Snippet);
      disableNextLine.insertText = new vscode.SnippetString('neurolint-disable-next-line ${1:rule-name}');
      disableNextLine.documentation = 'Disable NeuroLint rule for next line';
      completions.push(disableNextLine);
    }

    return completions;
  }

  private async getAISuggestions(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.CompletionItem[]> {
    try {
      const context = this.getCodeContext(document, position);
      const suggestions = await this.apiClient.getCompletionSuggestions({
        code: context.code,
        position: context.position,
        language: document.languageId
      });

      return suggestions.map(suggestion => {
        const item = new vscode.CompletionItem(suggestion.label, vscode.CompletionItemKind.Text);
        item.insertText = suggestion.insertText;
        item.detail = 'NeuroLint AI';
        item.documentation = suggestion.documentation;
        item.sortText = '0'; // Prioritize AI suggestions
        return item;
      });
    } catch (error) {
      return [];
    }
  }

  private getCodeContext(document: vscode.TextDocument, position: vscode.Position) {
    const startLine = Math.max(0, position.line - 10);
    const endLine = Math.min(document.lineCount - 1, position.line + 5);
    
    const lines = [];
    for (let i = startLine; i <= endLine; i++) {
      lines.push(document.lineAt(i).text);
    }

    return {
      code: lines.join('\n'),
      position: {
        line: position.line - startLine,
        character: position.character
      }
    };
  }

  private isNextJsProject(document: vscode.TextDocument): boolean {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) return false;

    // Check for Next.js indicators
    const packageJsonPath = vscode.Uri.joinPath(workspaceFolder.uri, 'package.json');
    const nextConfigPath = vscode.Uri.joinPath(workspaceFolder.uri, 'next.config.js');
    
    return vscode.workspace.fs.stat(packageJsonPath).then(() => true).catch(() => false) ||
           vscode.workspace.fs.stat(nextConfigPath).then(() => true).catch(() => false);
  }

  private getCacheKey(document: vscode.TextDocument, position: vscode.Position, linePrefix: string): string {
    return `${document.uri.toString()}:${position.line}:${linePrefix.slice(-20)}`;
  }

  dispose(): void {
    this.cache = {};
  }
}
