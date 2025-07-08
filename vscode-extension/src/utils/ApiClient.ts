import axios, { AxiosInstance, AxiosResponse } from "axios";
import * as vscode from "vscode";
import { ConfigurationManager } from "./ConfigurationManager";

export interface AnalysisRequest {
  code: string;
  filePath: string;
  layers: number[];
}

export interface AnalysisResult {
  success: boolean;
  issues: Issue[];
  fixes: Fix[];
  summary: AnalysisSummary;
}

export interface Issue {
  line: number;
  column: number;
  severity: "error" | "warning" | "info";
  message: string;
  rule: string;
  layer: number;
}

export interface Fix {
  line: number;
  column: number;
  newText: string;
  description: string;
}

export interface AnalysisSummary {
  totalIssues: number;
  fixableIssues: number;
  layersUsed: number[];
  executionTime: number;
}

export class ApiClient {
  private client: AxiosInstance;
  private retryCount = 3;
  private retryDelay = 1000;

  constructor(private configManager: ConfigurationManager) {
    this.client = this.createClient();
    this.setupInterceptors();
  }

  private createClient(): AxiosInstance {
    const config = vscode.workspace.getConfiguration("neurolint");

    return axios.create({
      baseURL: config.get<string>("apiUrl", "http://localhost:5000"),
      timeout: config.get<number>("timeout", 30000),
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "NeuroLint-VSCode/1.0.0",
      },
    });
  }

  private setupInterceptors(): void {
    // Request interceptor for auth
    this.client.interceptors.request.use(
      (config) => {
        const apiKey = vscode.workspace
          .getConfiguration("neurolint")
          .get<string>("apiKey");
        if (apiKey) {
          config.headers.Authorization = `Bearer ${apiKey}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          vscode.window.showErrorMessage(
            "Authentication failed. Please check your API key.",
          );
          await this.configManager.showLoginDialog();
        } else if (error.response?.status === 429) {
          vscode.window.showWarningMessage(
            "Rate limit exceeded. Please try again later.",
          );
        } else if (error.code === "ECONNREFUSED") {
          vscode.window.showErrorMessage(
            "Cannot connect to NeuroLint API. Please check the server URL.",
          );
        }
        return Promise.reject(error);
      },
    );
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get("/health");
      return response.status === 200;
    } catch (error) {
      throw new Error(`Connection test failed: ${error}`);
    }
  }

  async analyzeCode(request: AnalysisRequest): Promise<AnalysisResult> {
    return this.withRetry(async () => {
      const response: AxiosResponse<AnalysisResult> = await this.client.post(
        "/analyze",
        request,
      );
      return response.data;
    });
  }

  async fixCode(request: AnalysisRequest): Promise<AnalysisResult> {
    return this.withRetry(async () => {
      const response: AxiosResponse<AnalysisResult> = await this.client.post(
        "/fix",
        request,
      );
      return response.data;
    });
  }

  async analyzeWorkspace(
    files: string[],
    layers: number[],
  ): Promise<AnalysisResult> {
    return this.withRetry(async () => {
      const response: AxiosResponse<AnalysisResult> = await this.client.post(
        "/analyze/workspace",
        {
          files,
          layers,
        },
      );
      return response.data;
    });
  }

  async getAnalysisHistory(limit: number = 10): Promise<any[]> {
    return this.withRetry(async () => {
      const response = await this.client.get(`/history?limit=${limit}`);
      return response.data.history || [];
    });
  }

  async getUserInfo(): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.get("/user");
      return response.data;
    });
  }

  // Enterprise methods
  async getTeamInfo(): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.get("/enterprise/team");
      return response.data;
    });
  }

  async getAnalytics(timeRange: string = "30d"): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.get(
        `/enterprise/analytics?range=${timeRange}`,
      );
      return response.data;
    });
  }

  async getComplianceReport(): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.get("/enterprise/compliance");
      return response.data;
    });
  }

  async getAuditLog(page: number = 1, limit: number = 50): Promise<any> {
    return this.withRetry(async () => {
      const response = await this.client.get(
        `/enterprise/audit?page=${page}&limit=${limit}`,
      );
      return response.data;
    });
  }

  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.retryCount; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt === this.retryCount) {
          break;
        }

        // Don't retry on certain errors
        if (error.response?.status === 401 || error.response?.status === 403) {
          break;
        }

        // Exponential backoff
        const delay = this.retryDelay * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }

  updateConfiguration(): void {
    this.client = this.createClient();
    this.setupInterceptors();
  }
}
