import axios from "axios";

class ApiClient {
  constructor(baseURL = "https://api.neurolint.dev", apiKey = null) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
    this.timeout = 60000;
    this.retries = 3;
    this._authLoaded = false;

    this._createClient();
  }

  async _loadAuth() {
    if (this._authLoaded || this.apiKey) return;

    try {
      const { getAuthData } = await import("../commands/auth.js");
      const authData = getAuthData();
      if (authData) {
        this.apiKey = authData.apiKey;
        this.baseURL = authData.apiUrl || this.baseURL;
        this._createClient(); // Recreate client with new auth
      }
    } catch (error) {
      // Ignore auth errors during initialization
    }
    this._authLoaded = true;
  }

  _createClient() {
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

  async makeRequest(config) {
    await this._loadAuth();

    let lastError;
    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        return await this.client(config);
      } catch (error) {
        lastError = error;
        if (attempt === this.retries || error.response?.status < 500) {
          throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * Math.pow(2, attempt)),
        );
      }
    }
    throw lastError;
  }

  async analyzeCode(code, layers = [1, 2, 3, 4, 5, 6], options = {}) {
    return this.makeRequest({
      method: "POST",
      url: "/analyze",
      data: {
        code,
        layers,
        options,
      },
    });
  }

  async fixCode(code, layers = [1, 2, 3, 4, 5, 6], options = {}) {
    return this.makeRequest({
      method: "POST",
      url: "/fix",
      data: {
        code,
        layers,
        options,
      },
    });
  }

  async analyzeProject(projectPath, layers = [1, 2, 3, 4, 5, 6], options = {}) {
    return this.makeRequest({
      method: "POST",
      url: "/analyze/project",
      data: {
        projectPath,
        layers,
        options,
      },
    });
  }

  async fixProject(projectPath, layers = [1, 2, 3, 4, 5, 6], options = {}) {
    return this.makeRequest({
      method: "POST",
      url: "/fix/project",
      data: {
        projectPath,
        layers,
        options,
      },
    });
  }

  async getLayerInfo() {
    return this.makeRequest({
      method: "GET",
      url: "/layers",
    });
  }

  async validateConfig(config) {
    return this.makeRequest({
      method: "POST",
      url: "/validate/config",
      data: config,
    });
  }

  async uploadPlugin(pluginData) {
    return this.makeRequest({
      method: "POST",
      url: "/plugins",
      data: pluginData,
    });
  }

  async getPlugins() {
    return this.makeRequest({
      method: "GET",
      url: "/plugins",
    });
  }

  async getStatus() {
    return this.makeRequest({
      method: "GET",
      url: "/status",
    });
  }

  async getUsage() {
    return this.makeRequest({
      method: "GET",
      url: "/usage",
    });
  }

  async authenticate(apiKey) {
    this.apiKey = apiKey;
    this._createClient();

    return this.makeRequest({
      method: "GET",
      url: "/auth/verify",
    });
  }

  async getProfile() {
    return this.makeRequest({
      method: "GET",
      url: "/profile",
    });
  }

  async updateProfile(profileData) {
    return this.makeRequest({
      method: "PUT",
      url: "/profile",
      data: profileData,
    });
  }

  async getBilling() {
    return this.makeRequest({
      method: "GET",
      url: "/billing",
    });
  }

  async getTeam() {
    return this.makeRequest({
      method: "GET",
      url: "/team",
    });
  }

  async inviteTeamMember(email, role) {
    return this.makeRequest({
      method: "POST",
      url: "/team/invite",
      data: { email, role },
    });
  }

  async removeTeamMember(memberId) {
    return this.makeRequest({
      method: "DELETE",
      url: `/team/members/${memberId}`,
    });
  }

  async getMetrics(timeRange = "24h") {
    return this.makeRequest({
      method: "GET",
      url: `/metrics?range=${timeRange}`,
    });
  }
}

export { ApiClient };
