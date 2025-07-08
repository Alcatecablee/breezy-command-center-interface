
import axios, { AxiosInstance, AxiosRequestConfig } from "axios";

export interface Issue {
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  message: string;
  severity: "error" | "warning" | "info";
  rule: string;
  layer: number;
  file?: string;
  length?: number;
}

export interface AnalysisResult {
  success: boolean;
  issues: Issue[];
  suggestions?: string[];
  metadata?: {
    executionTime: number;
    layersAnalyzed: number[];
  };
}

export interface OrchestrationRequest {
  code: string;
  filePath: string;
  layers: number[];
  options?: {
    verbose?: boolean;
    dryRun?: boolean;
  };
}

export interface LayerSuggestionRequest {
  code: string;
  filePath: string;
}

export interface LayerSuggestionResult {
  success: boolean;
  recommendations?: {
    recommended: number[];
    reasons: string[];
    confidence: number;
  };
}

export class ApiClient {
  private client: AxiosInstance;
  private isConnected = false;
  private lastConnectionCheck = 0;
  private readonly CONNECTION_CHECK_INTERVAL = 30000; // 30 seconds

  constructor(private baseURL: string, private apiKey?: string) {
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('API Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        this.isConnected = true;
        return response;
      },
      (error) => {
        this.isConnected = false;
        console.error('API Response Error:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
          throw new Error('Cannot connect to NeuroLint server. Please ensure the server is running.');
        }
        
        if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please check your API key.');
        }
        
        throw error;
      }
    );
  }

  async checkConnection(): Promise<boolean> {
    const now = Date.now();
    
    // Rate limit connection checks
    if (now - this.lastConnectionCheck < this.CONNECTION_CHECK_INTERVAL) {
      return this.isConnected;
    }

    try {
      await this.client.get('/health');
      this.isConnected = true;
      this.lastConnectionCheck = now;
      return true;
    } catch (error) {
      this.isConnected = false;
      this.lastConnectionCheck = now;
      return false;
    }
  }

  async analyzeCode(request: {
    code: string;
    filePath: string;
    layers: number[];
  }): Promise<AnalysisResult> {
    try {
      const response = await this.client.post('/analyze', request);
      return response.data;
    } catch (error) {
      console.error('Analysis failed:', error);
      throw new Error(`Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async executeOrchestration(request: OrchestrationRequest): Promise<any> {
    try {
      const response = await this.client.post('/orchestrate', request);
      return response.data;
    } catch (error) {
      console.error('Orchestration failed:', error);
      throw new Error(`Orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async suggestLayers(request: LayerSuggestionRequest): Promise<LayerSuggestionResult> {
    try {
      const response = await this.client.post('/suggest-layers', request);
      return response.data;
    } catch (error) {
      console.error('Layer suggestion failed:', error);
      throw new Error(`Layer suggestion failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async fixCode(request: {
    code: string;
    filePath: string;
    layers: number[];
    dryRun?: boolean;
  }): Promise<any> {
    try {
      const response = await this.client.post('/fix', request);
      return response.data;
    } catch (error) {
      console.error('Fix failed:', error);
      throw new Error(`Fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  updateConfig(baseURL: string, apiKey?: string): void {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    
    this.client.defaults.baseURL = baseURL;
    this.client.defaults.headers.common['Authorization'] = 
      apiKey ? `Bearer ${apiKey}` : undefined;
    
    // Reset connection status
    this.isConnected = false;
    this.lastConnectionCheck = 0;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
