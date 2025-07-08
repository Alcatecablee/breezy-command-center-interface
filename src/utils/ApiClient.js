const axios = require("axios");

class ApiClient {
  constructor(baseURL = "https://api.neurolint.dev", apiKey = null) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.timeout = 60000;
    this.retries = 3;

    // Try to get auth data if no API key provided
    if (!this.apiKey) {
      try {
        const { getAuthData } = require("../commands/auth");
        const authData = getAuthData();
        if (authData) {
          this.apiKey = authData.apiKey;
          this.baseURL = authData.apiUrl || this.baseURL;
        }
      } catch (error) {
        // Ignore auth errors during initialization
      }
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "NeuroLint-CLI/1.0.0",
      },
    });

    // Add auth header if available
    if (this.apiKey) {
      this.client.defaults.headers.common["Authorization"] =
        `Bearer ${this.apiKey}`;
    }

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          throw new Error(
            'Authentication failed. Please run "neurolint login"',
          );
        }
        if (error.response?.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later");
        }
        if (error.code === "ECONNREFUSED") {
          throw new Error(
            "Cannot connect to NeuroLint API. Check your connection",
          );
        }
        throw error;
      },
    );
  }

  async healthCheck() {
    const startTime = Date.now();

    try {
      const response = await this.client.get("/health");
      const responseTime = Date.now() - startTime;

      return {
        status: response.data?.status || "ok",
        version: response.data?.version,
        responseTime,
      };
    } catch (error) {
      throw new Error(`Health check failed: ${error.message}`);
    }
  }

  async authenticate() {
    try {
      const response = await this.client.post("/auth/verify");

      return {
        success: true,
        user: response.data.user,
        expiresAt: response.data.expiresAt,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async analyzeFiles(files, layers) {
    try {
      const response = await this.client.post("/analyze", {
        files: files.map((file) => ({
          path: file,
          // In a real implementation, we'd send file content or just paths
          // depending on the API design
        })),
        layers,
        options: {
          format: "detailed",
        },
      });

      return {
        success: true,
        issues: response.data.issues || [],
        summary: response.data.summary || {},
      };
    } catch (error) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
  }

  async fixFiles(files, layers, dryRun = false) {
    try {
      const response = await this.client.post("/fix", {
        files: files.map((file) => ({
          path: file,
          // In a real implementation, we'd send file content
        })),
        layers,
        options: {
          dryRun,
          backup: true,
        },
      });

      return {
        success: true,
        changes: response.data.changes || [],
        summary: response.data.summary || {},
      };
    } catch (error) {
      throw new Error(`Fix operation failed: ${error.message}`);
    }
  }

  async uploadProject(projectPath) {
    try {
      // This would implement project upload for cloud analysis
      const response = await this.client.post("/projects/upload", {
        path: projectPath,
      });

      return {
        success: true,
        projectId: response.data.projectId,
        uploadUrl: response.data.uploadUrl,
      };
    } catch (error) {
      throw new Error(`Project upload failed: ${error.message}`);
    }
  }

  async getAnalysisHistory(limit = 10) {
    try {
      const response = await this.client.get("/history", {
        params: { limit },
      });

      return {
        success: true,
        history: response.data.history || [],
      };
    } catch (error) {
      throw new Error(`Failed to get history: ${error.message}`);
    }
  }

  async getUserStats() {
    try {
      const response = await this.client.get("/user/stats");

      return {
        success: true,
        stats: response.data,
      };
    } catch (error) {
      throw new Error(`Failed to get user stats: ${error.message}`);
    }
  }

  // Retry mechanism for failed requests
  async withRetry(operation, maxRetries = this.retries) {
    let lastError;

    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (i === maxRetries) break;

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, i), 10000);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw lastError;
  }
}

module.exports = { ApiClient };
