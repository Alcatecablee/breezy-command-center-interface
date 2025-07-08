import * as vscode from "vscode";
import { ApiClient } from "../utils/ApiClient";

interface DiagnosticCache {
  [uri: string]: {
    version: number;
    diagnostics: vscode.Diagnostic[];
    timestamp: number;
  };
}

interface AnalysisQueue {
  [uri: string]: {
    timer: NodeJS.Timeout;
    priority: number;
  };
}

export class EnhancedDiagnosticProvider {
  private diagnosticCollection: vscode.DiagnosticCollection;
  private cache: DiagnosticCache = {};
  private analysisQueue: AnalysisQueue = {};
  private isAnalyzing = false;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private readonly DEBOUNCE_DELAY = 1000; // 1 second

  constructor(
    private apiClient: ApiClient,
    private outputChannel: vscode.OutputChannel
  ) {
    this.diagnosticCollection = vscode.languages.createDiagnosticCollection("neurolint");
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Listen for document changes with intelligent debouncing
    vscode.workspace.onDidChangeTextDocument(async (event) => {
      if (this.shouldAnalyzeDocument(event.document)) {
        await this.queueAnalysis(event.document, 1); // Normal priority
      }
    });

    // Listen for document saves with higher priority
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (this.shouldAnalyzeDocument(document)) {
        await this.queueAnalysis(document, 2); // High priority
      }
    });

    // Listen for document opens
    vscode.workspace.onDidOpenTextDocument(async (document) => {
      if (this.shouldAnalyzeDocument(document)) {
        await this.queueAnalysis(document, 1);
      }
    });

    // Clean up when documents are closed
    vscode.workspace.onDidCloseTextDocument((document) => {
      this.clearDocumentCache(document.uri.toString());
    });

    // Periodic cache cleanup
    setInterval(() => {
      this.cleanupCache();
    }, this.CACHE_TTL);
  }

  private shouldAnalyzeDocument(document: vscode.TextDocument): boolean {
    const supportedLanguages = ['typescript', 'javascript', 'typescriptreact', 'javascriptreact'];
    return (
      supportedLanguages.includes(document.languageId) &&
      document.uri.scheme === 'file' &&
      !document.uri.path.includes('node_modules') &&
      document.getText().length < 1024 * 1024 // Skip files larger than 1MB
    );
  }

  private async queueAnalysis(document: vscode.TextDocument, priority: number = 1) {
    const uri = document.uri.toString();
    
    // Cancel existing timer for this document
    if (this.analysisQueue[uri]) {
      clearTimeout(this.analysisQueue[uri].timer);
    }

    // Calculate dynamic debounce delay based on file size and priority
    const fileSize = document.getText().length;
    const dynamicDelay = Math.min(
      this.DEBOUNCE_DELAY * (fileSize > 10000 ? 2 : 1) / priority,
      5000
    );

    this.analysisQueue[uri] = {
      timer: setTimeout(async () => {
        delete this.analysisQueue[uri];
        await this.analyzeDocument(document);
      }, dynamicDelay),
      priority
    };
  }

  private async analyzeDocument(document: vscode.TextDocument): Promise<void> {
    const uri = document.uri.toString();

    // Check cache first
    const cached = this.cache[uri];
    if (cached && 
        cached.version === document.version && 
        Date.now() - cached.timestamp < this.CACHE_TTL) {
      this.diagnosticCollection.set(document.uri, cached.diagnostics);
      return;
    }

    // Prevent concurrent analysis of the same document
    if (this.isAnalyzing) {
      setTimeout(() => this.analyzeDocument(document), 100);
      return;
    }

    this.isAnalyzing = true;

    try {
      this.outputChannel.appendLine(`Analyzing: ${document.fileName}`);
      
      const result = await this.apiClient.analyzeCode({
        code: document.getText(),
        filePath: document.fileName,
        layers: this.getEnabledLayers()
      });

      const diagnostics = this.convertToDiagnostics(result.issues || []);
      
      // Update cache
      this.cache[uri] = {
        version: document.version,
        diagnostics,
        timestamp: Date.now()
      };

      // Update diagnostics
      this.diagnosticCollection.set(document.uri, diagnostics);

      this.outputChannel.appendLine(
        `Analysis complete: ${diagnostics.length} issues found`
      );

    } catch (error) {
      this.outputChannel.appendLine(`Analysis failed: ${error}`);
      
      // Clear diagnostics on error but keep old cache if available
      if (!cached) {
        this.diagnosticCollection.set(document.uri, []);
      }
    } finally {
      this.isAnalyzing = false;
    }
  }

  private convertToDiagnostics(issues: any[]): vscode.Diagnostic[] {
    return issues.map(issue => {
      const range = new vscode.Range(
        Math.max(0, (issue.line || 1) - 1),
        Math.max(0, issue.column || 0),
        Math.max(0, (issue.endLine || issue.line || 1) - 1),
        Math.max(0, issue.endColumn || (issue.column || 0) + (issue.length || 1))
      );

      const diagnostic = new vscode.Diagnostic(
        range,
        issue.message || 'NeuroLint issue',
        this.getSeverity(issue.severity)
      );

      diagnostic.source = 'NeuroLint';
      diagnostic.code = issue.rule || issue.code;
      
      // Add layer information
      if (issue.layer) {
        diagnostic.tags = [vscode.DiagnosticTag.Unnecessary];
        diagnostic.relatedInformation = [
          new vscode.DiagnosticRelatedInformation(
            new vscode.Location(vscode.Uri.file(issue.file || ''), range),
            `Layer ${issue.layer}: ${this.getLayerName(issue.layer)}`
          )
        ];
      }

      // Add fix information if available
      if (issue.fixable) {
        diagnostic.tags = [...(diagnostic.tags || []), vscode.DiagnosticTag.Deprecated];
      }

      return diagnostic;
    });
  }

  private getSeverity(severity: string): vscode.DiagnosticSeverity {
    switch (severity?.toLowerCase()) {
      case 'error':
      case 'critical':
        return vscode.DiagnosticSeverity.Error;
      case 'warning':
      case 'medium':
        return vscode.DiagnosticSeverity.Warning;
      case 'info':
      case 'low':
        return vscode.DiagnosticSeverity.Information;
      default:
        return vscode.DiagnosticSeverity.Hint;
    }
  }

  private getLayerName(layer: number): string {
    const layerNames = {
      1: 'Configuration Validation',
      2: 'Pattern & Entity Fixes',
      3: 'Component Best Practices',
      4: 'Hydration & SSR Guard',
      5: 'Next.js Optimization',
      6: 'Quality & Performance'
    };
    return layerNames[layer] || `Layer ${layer}`;
  }

  private getEnabledLayers(): number[] {
    const config = vscode.workspace.getConfiguration('neurolint');
    return config.get<number[]>('enabledLayers', [1, 2, 3, 4]);
  }

  private clearDocumentCache(uri: string) {
    delete this.cache[uri];
    if (this.analysisQueue[uri]) {
      clearTimeout(this.analysisQueue[uri].timer);
      delete this.analysisQueue[uri];
    }
  }

  private cleanupCache() {
    const now = Date.now();
    Object.keys(this.cache).forEach(uri => {
      if (now - this.cache[uri].timestamp > this.CACHE_TTL) {
        delete this.cache[uri];
      }
    });
  }

  public async forceAnalyzeWorkspace(): Promise<void> {
    const documents = vscode.workspace.textDocuments.filter(doc => 
      this.shouldAnalyzeDocument(doc)
    );

    for (const document of documents) {
      await this.queueAnalysis(document, 2); // High priority for manual analysis
    }
  }

  public clearAllDiagnostics(): void {
    this.diagnosticCollection.clear();
    this.cache = {};
    this.analysisQueue = {};
  }

  public getCacheStats() {
    return {
      cachedDocuments: Object.keys(this.cache).length,
      queuedAnalyses: Object.keys(this.analysisQueue).length,
      oldestCache: Math.min(...Object.values(this.cache).map(c => c.timestamp)),
      cacheHitRate: this.cache ? 'Available' : 'No data'
    };
  }

  dispose(): void {
    this.diagnosticCollection.dispose();
    
    // Clear all timers
    Object.values(this.analysisQueue).forEach(({ timer }) => {
      clearTimeout(timer);
    });
    
    this.cache = {};
    this.analysisQueue = {};
  }
}
