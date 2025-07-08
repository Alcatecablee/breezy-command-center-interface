/**
 * NeuroLint API Server
 * Express server that provides API endpoints for the orchestration system
 */

const express = require('express');
const cors = require('cors');
const { LayerOrchestrator } = require('../core/LayerOrchestrator');
const { SmartLayerSelector } = require('../core/SmartLayerSelector');

class NeuroLintApiServer {
  constructor(port = 8001) {
    this.app = express();
    this.port = port;
    this.orchestrator = new LayerOrchestrator();
    this.executionHistory = [];
    
    this.setupMiddleware();
    this.setupRoutes();
  }
  
  setupMiddleware() {
    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || ['http://localhost:3000', 'http://localhost:3001'],
      credentials: true
    }));
    
    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
      next();
    });
  }
  
  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });
    
    // Analyze code and get recommendations
    this.app.post('/api/analyze', async (req, res) => {
      try {
        const { code, options = {} } = req.body;
        
        if (!code) {
          return res.status(400).json({
            error: 'Code is required',
            message: 'Please provide code to analyze'
          });
        }
        
        console.log('🔍 Analyzing code...');
        
        // Use smart layer selector for recommendations
        const analysis = SmartLayerSelector.analyzeAndRecommend(code);
        
        // Also run a quick orchestration analysis
        const orchestrationAnalysis = await this.orchestrator.executeLayers(code, analysis.recommendedLayers, {
          ...options,
          dryRun: true,
          verbose: true
        });
        
        const result = {
          analysis,
          orchestrationPreview: {
            estimatedChanges: orchestrationAnalysis.summary.totalChanges,
            estimatedTime: orchestrationAnalysis.summary.totalExecutionTime,
            layersToExecute: analysis.recommendedLayers
          },
          timestamp: new Date().toISOString()
        };
        
        console.log(`✅ Analysis complete: ${analysis.detectedIssues.length} issues found`);
        
        res.json(result);
      } catch (error) {
        console.error('Analysis error:', error);
        res.status(500).json({
          error: 'Analysis failed',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Execute layers with orchestration
    this.app.post('/api/execute', async (req, res) => {
      try {
        const { code, layers = [1, 2, 3, 4], options = {} } = req.body;
        
        if (!code) {
          return res.status(400).json({
            error: 'Code is required',
            message: 'Please provide code to execute layers on'
          });
        }
        
        console.log(`🚀 Executing layers [${layers.join(', ')}]...`);
        
        // Execute with orchestration
        const result = await this.orchestrator.executeLayers(code, layers, {
          verbose: true,
          ...options
        });
        
        // Store in execution history
        this.addToHistory({
          timestamp: new Date().toISOString(),
          layers,
          success: result.success,
          totalChanges: result.summary.totalChanges,
          executionTime: result.summary.totalExecutionTime,
          improvements: result.improvements
        });
        
        console.log(`✅ Execution complete: ${result.summary.totalChanges} changes made`);
        
        res.json({
          ...result,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Execution error:', error);
        res.status(500).json({
          error: 'Execution failed',
          message: error.message,
          timestamp: new Date().toISOString()
        });
      }
    });
    
    // Get layer information
    this.app.get('/api/layers', (req, res) => {
      try {
        const layerInfo = {
          layers: this.orchestrator.LAYER_EXECUTION_ORDER,
          dependencies: this.orchestrator.DEPENDENCIES,
          availableOptions: {
            verbose: 'Enable detailed logging',
            dryRun: 'Preview changes without applying',
            useCache: 'Use cached results when possible',
            skipUnnecessary: 'Skip layers that won\'t make changes'
          }
        };
        
        res.json(layerInfo);
      } catch (error) {
        console.error('Layer info error:', error);
        res.status(500).json({
          error: 'Failed to get layer info',
          message: error.message
        });
      }
    });
    
    // Validate code syntax
    this.app.post('/api/validate', async (req, res) => {
      try {
        const { code } = req.body;
        
        if (!code) {
          return res.status(400).json({
            error: 'Code is required',
            message: 'Please provide code to validate'
          });
        }
        
        // Use orchestrator's validation method
        const validation = this.orchestrator.validateSyntax(code);
        
        res.json({
          valid: validation.valid,
          error: validation.error || null,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Validation error:', error);
        res.status(500).json({
          error: 'Validation failed',
          message: error.message
        });
      }
    });
    
    // Get execution history
    this.app.get('/api/history', (req, res) => {
      try {
        const limit = parseInt(req.query.limit) || 10;
        const history = this.executionHistory
          .slice(-limit)
          .reverse(); // Most recent first
        
        const stats = this.calculateStats();
        
        res.json({
          history,
          stats,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('History error:', error);
        res.status(500).json({
          error: 'Failed to get history',
          message: error.message
        });
      }
    });
    
    // Error handling
    this.app.use((error, req, res, next) => {
      console.error('Unhandled error:', error);
      res.status(500).json({
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString()
      });
    });
    
    // 404 handler
    this.app.use((req, res) => {
      res.status(404).json({
        error: 'Not found',
        message: `Endpoint ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  addToHistory(execution) {
    this.executionHistory.push(execution);
    
    // Keep only last 100 executions
    if (this.executionHistory.length > 100) {
      this.executionHistory = this.executionHistory.slice(-100);
    }
  }
  
  calculateStats() {
    if (this.executionHistory.length === 0) {
      return {
        totalExecutions: 0,
        successRate: 0,
        averageChanges: 0,
        averageExecutionTime: 0
      };
    }
    
    const successful = this.executionHistory.filter(h => h.success);
    const totalChanges = this.executionHistory.reduce((sum, h) => sum + h.totalChanges, 0);
    const totalTime = this.executionHistory.reduce((sum, h) => sum + h.executionTime, 0);
    
    return {
      totalExecutions: this.executionHistory.length,
      successRate: (successful.length / this.executionHistory.length) * 100,
      averageChanges: totalChanges / this.executionHistory.length,
      averageExecutionTime: totalTime / this.executionHistory.length
    };
  }
  
  start() {
    this.app.listen(this.port, '0.0.0.0', () => {
      console.log(`🚀 NeuroLint API Server running on port ${this.port}`);
      console.log(`📡 Health check: http://localhost:${this.port}/api/health`);
    });
  }
}

// Start server if this file is run directly
if (require.main === module) {
  const server = new NeuroLintApiServer();
  server.start();
}

module.exports = { NeuroLintApiServer };