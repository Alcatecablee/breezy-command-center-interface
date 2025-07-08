/**
 * NeuroLint Service - Frontend API service for orchestration system
 * Provides interface between React dashboard and Node.js orchestration backend
 */

class NeuroLintService {
  constructor() {
    this.baseUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';
  }
  
  /**
   * Analyze code and get layer recommendations
   */
  async analyzeCode(code, options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          options: {
            smartDetection: true,
            ...options
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Analysis error:', error);
      throw error;
    }
  }
  
  /**
   * Execute layers with orchestration
   */
  async executeLayers(code, layers = [1, 2, 3, 4], options = {}) {
    try {
      const response = await fetch(`${this.baseUrl}/api/execute`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          layers,
          options: {
            verbose: true,
            dryRun: false,
            useCache: true,
            skipUnnecessary: true,
            ...options
          }
        })
      });
      
      if (!response.ok) {
        throw new Error(`Execution failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Execution error:', error);
      throw error;
    }
  }
  
  /**
   * Get layer information and dependencies
   */
  async getLayerInfo() {
    try {
      const response = await fetch(`${this.baseUrl}/api/layers`);
      
      if (!response.ok) {
        throw new Error(`Failed to get layer info: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Layer info error:', error);
      throw error;
    }
  }
  
  /**
   * Validate code syntax
   */
  async validateSyntax(code) {
    try {
      const response = await fetch(`${this.baseUrl}/api/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code })
      });
      
      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Validation error:', error);
      throw error;
    }
  }
  
  /**
   * Get execution history and stats
   */
  async getExecutionHistory(limit = 10) {
    try {
      const response = await fetch(`${this.baseUrl}/api/history?limit=${limit}`);
      
      if (!response.ok) {
        throw new Error(`Failed to get history: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('History error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const neurolintService = new NeuroLintService();
export default neurolintService;