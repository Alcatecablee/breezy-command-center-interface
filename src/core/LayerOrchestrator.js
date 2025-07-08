/**
 * NeuroLint Layer Orchestration System
 * Implements comprehensive layer execution with safety, validation, and recovery
 * Following the implementation patterns from ORCHESTRATION-IMPLEMENTATION.md
 */

const { parser } = require('@babel/parser');
const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');

class LayerOrchestrator {
  constructor(options = {}) {
    this.options = {
      verbose: false,
      dryRun: false,
      useCache: true,
      skipUnnecessary: true,
      ...options
    };
    
    this.states = [];
    this.metadata = [];
    this.cache = new Map();
    
    // Layer execution order and configuration
    this.LAYER_EXECUTION_ORDER = [
      { id: 1, name: 'Configuration', description: 'Foundation setup', file: '../fix-layer-1-config.js' },
      { id: 2, name: 'Entity Cleanup', description: 'Preprocessing patterns', file: '../fix-layer-2-patterns.js' },
      { id: 3, name: 'Components', description: 'React/TS specific fixes', file: '../fix-layer-3-components.js' },
      { id: 4, name: 'Hydration', description: 'Runtime safety guards', file: '../fix-layer-4-hydration.js' }
    ];
    
    this.DEPENDENCIES = {
      1: [], // Configuration has no dependencies
      2: [1], // Entity cleanup depends on config foundation  
      3: [1, 2], // Components depend on config + cleanup
      4: [1, 2, 3], // Hydration depends on all previous layers
    };
  }
  
  /**
   * Main orchestration entry point - executes layers with comprehensive safety
   */
  async executeLayers(code, enabledLayers = [1, 2, 3, 4], options = {}) {
    const startTime = performance.now();
    const mergedOptions = { ...this.options, ...options };
    
    this.log('🚀 Starting NeuroLint Layer Orchestration...');
    
    // Initialize pipeline state
    this.recordState({
      step: 0,
      layerId: null,
      code: code,
      timestamp: Date.now(),
      description: 'Initial state'
    });
    
    // Validate and correct layer selection
    const correctedLayers = this.validateAndCorrectLayers(enabledLayers);
    
    if (correctedLayers.warnings.length > 0) {
      correctedLayers.warnings.forEach(warning => this.log(`⚠️  ${warning}`));
    }
    
    let current = code;
    const results = [];
    
    // Execute layers sequentially with safety checks
    for (let i = 0; i < correctedLayers.correctedLayers.length; i++) {
      const layerId = correctedLayers.correctedLayers[i];
      const previous = current;
      const stepStartTime = performance.now();
      
      this.log(`🔧 Executing Layer ${layerId} (${this.getLayerName(layerId)})...`);
      
      try {
        // Check cache first
        const cacheKey = this.generateCacheKey(current, layerId);
        if (mergedOptions.useCache && this.cache.has(cacheKey)) {
          current = this.cache.get(cacheKey);
          this.log(`📦 Using cached result for Layer ${layerId}`);
          
          results.push({
            layerId,
            success: true,
            code: current,
            executionTime: performance.now() - stepStartTime,
            changeCount: this.calculateChanges(previous, current),
            fromCache: true
          });
          continue;
        }
        
        // Skip if layer won't make changes
        if (mergedOptions.skipUnnecessary && !this.layerWillMakeChanges(current, layerId)) {
          this.log(`⏭️  Skipping Layer ${layerId} (no changes needed)`);
          continue;
        }
        
        // Execute layer transformation
        const transformed = await this.executeLayer(layerId, current, mergedOptions);
        
        // Validate transformation safety
        const validation = this.validateTransformation(previous, transformed);
        
        if (validation.shouldRevert) {
          this.log(`🔄 Reverting Layer ${layerId}: ${validation.reason}`);
          current = previous; // Rollback to safe state
          
          results.push({
            layerId,
            success: false,
            code: previous,
            executionTime: performance.now() - stepStartTime,
            changeCount: 0,
            revertReason: validation.reason
          });
        } else {
          current = transformed; // Accept changes
          
          // Cache successful result
          if (mergedOptions.useCache) {
            this.cacheResult(cacheKey, transformed);
          }
          
          results.push({
            layerId,
            success: true,
            code: current,
            executionTime: performance.now() - stepStartTime,
            changeCount: this.calculateChanges(previous, transformed),
            improvements: this.detectImprovements(previous, transformed)
          });
          
          this.log(`✅ Layer ${layerId} completed successfully`);
        }
        
        // Record state after each layer
        this.recordState({
          step: i + 1,
          layerId,
          code: current,
          timestamp: Date.now(),
          description: `After Layer ${layerId}`,
          success: results[results.length - 1].success,
          executionTime: performance.now() - stepStartTime,
          changeCount: this.calculateChanges(previous, current)
        });
        
      } catch (error) {
        this.log(`❌ Layer ${layerId} failed:`, error.message);
        
        const errorInfo = this.categorizeError(error, layerId, current);
        
        results.push({
          layerId,
          success: false,
          code: previous, // Keep previous safe state
          executionTime: performance.now() - stepStartTime,
          changeCount: 0,
          error: error.message,
          errorCategory: errorInfo.category,
          suggestion: errorInfo.suggestion,
          recoveryOptions: errorInfo.recoveryOptions
        });
        
        // Record failed state
        this.recordState({
          step: i + 1,
          layerId,
          code: previous,
          timestamp: Date.now(),
          description: `Layer ${layerId} failed`,
          success: false,
          error: error.message,
          executionTime: performance.now() - stepStartTime
        });
        
        // Continue with previous code
        current = previous;
      }
    }
    
    const totalExecutionTime = performance.now() - startTime;
    
    return this.generateResult(current, results, totalExecutionTime);
  }
  
  /**
   * Execute individual layer with AST/Regex fallback strategy
   */
  async executeLayer(layerId, code, options = {}) {
    const layer = this.LAYER_EXECUTION_ORDER.find(l => l.id === layerId);
    if (!layer) {
      throw new Error(`Layer ${layerId} not found`);
    }
    
    // For layers 1-2: Always use the existing regex-based scripts
    if (layerId <= 2) {
      return await this.executeRegexLayer(layerId, code, options);
    }
    
    // For layers 3-4: Try AST first, fallback to regex
    try {
      if (this.canUseAST(code)) {
        this.log(`🌳 Using AST transformation for Layer ${layerId}`);
        return await this.executeASTLayer(layerId, code, options);
      }
    } catch (astError) {
      this.log(`⚠️  AST failed for Layer ${layerId}, using regex fallback:`, astError.message);
    }
    
    // Fallback to regex-based transformation
    return await this.executeRegexLayer(layerId, code, options);
  }
  
  /**
   * Execute layer using existing regex-based scripts
   */
  async executeRegexLayer(layerId, code, options = {}) {
    const layer = this.LAYER_EXECUTION_ORDER.find(l => l.id === layerId);
    
    // For now, we'll simulate the layer execution
    // In a real implementation, you would require and execute the layer files
    switch (layerId) {
      case 1:
        return this.simulateLayer1(code);
      case 2:
        return this.simulateLayer2(code);
      case 3:
        return this.simulateLayer3(code);
      case 4:
        return this.simulateLayer4(code);
      default:
        return code;
    }
  }
  
  /**
   * Execute layer using AST transformation
   */
  async executeASTLayer(layerId, code, options = {}) {
    try {
      const ast = parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
        allowImportExportEverywhere: true
      });
      
      // Apply layer-specific AST transformations
      switch (layerId) {
        case 3:
          return this.applyComponentTransformations(code, ast);
        case 4:
          return this.applyHydrationTransformations(code, ast);
        default:
          throw new Error(`AST not supported for layer ${layerId}`);
      }
    } catch (error) {
      throw new Error(`AST transformation failed: ${error.message}`);
    }
  }
  
  /**
   * Validate transformation safety
   */
  validateTransformation(before, after) {
    // Skip validation if no changes were made
    if (before === after) {
      return { shouldRevert: false, reason: 'No changes made' };
    }
    
    // Check for syntax validity
    const syntaxCheck = this.validateSyntax(after);
    if (!syntaxCheck.valid) {
      return { 
        shouldRevert: true, 
        reason: `Syntax error: ${syntaxCheck.error}` 
      };
    }
    
    // Check for code corruption patterns
    const corruptionCheck = this.detectCorruption(before, after);
    if (corruptionCheck.detected) {
      return { 
        shouldRevert: true, 
        reason: `Corruption detected: ${corruptionCheck.pattern}` 
      };
    }
    
    // Check for logical issues
    const logicalCheck = this.validateLogicalIntegrity(before, after);
    if (!logicalCheck.valid) {
      return { 
        shouldRevert: true, 
        reason: `Logical issue: ${logicalCheck.reason}` 
      };
    }
    
    return { shouldRevert: false };
  }
  
  /**
   * Parse code to check for syntax errors
   */
  validateSyntax(code) {
    try {
      parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
        allowImportExportEverywhere: true,
        strictMode: false
      });
      return { valid: true };
    } catch (error) {
      return { 
        valid: false, 
        error: error instanceof Error ? error.message : 'Unknown syntax error' 
      };
    }
  }
  
  /**
   * Detect common corruption patterns
   */
  detectCorruption(before, after) {
    const corruptionPatterns = [
      {
        name: 'Double function calls',
        regex: /onClick=\{[^}]*\([^)]*\)\s*=>\s*\(\)\s*=>/g
      },
      {
        name: 'Malformed event handlers',
        regex: /onClick=\{[^}]*\)\([^)]*\)$/g
      },
      {
        name: 'Invalid JSX attributes',
        regex: /\w+=\{[^}]*\)[^}]*\}/g
      },
      {
        name: 'Broken import statements',
        regex: /import\s*{\s*\n\s*import\s*{/g
      }
    ];
    
    for (const pattern of corruptionPatterns) {
      if (pattern.regex.test(after) && !pattern.regex.test(before)) {
        return { 
          detected: true, 
          pattern: pattern.name 
        };
      }
    }
    
    return { detected: false };
  }
  
  /**
   * Validate logical integrity of transformations
   */
  validateLogicalIntegrity(before, after) {
    // Check that essential imports weren't accidentally removed
    const beforeImports = this.extractImports(before);
    const afterImports = this.extractImports(after);
    
    const removedImports = beforeImports.filter(imp => !afterImports.includes(imp));
    const criticalImports = ['React', 'useState', 'useEffect'];
    
    const removedCritical = removedImports.filter(imp => 
      criticalImports.some(critical => imp.includes(critical))
    );
    
    if (removedCritical.length > 0) {
      return {
        valid: false,
        reason: `Critical imports removed: ${removedCritical.join(', ')}`
      };
    }
    
    return { valid: true };
  }
  
  /**
   * Extract imports from code
   */
  extractImports(code) {
    const importRegex = /import\s+.*?\s+from\s+['"][^'"]+['"]/g;
    return code.match(importRegex) || [];
  }
  
  /**
   * Validate and correct layer selection with dependencies
   */
  validateAndCorrectLayers(requestedLayers) {
    const warnings = [];
    const autoAdded = [];
    let correctedLayers = [...requestedLayers];
    
    // Sort layers in execution order
    correctedLayers.sort((a, b) => a - b);
    
    // Check dependencies for each requested layer
    for (const layerId of requestedLayers) {
      const dependencies = this.DEPENDENCIES[layerId] || [];
      const missingDeps = dependencies.filter(dep => !correctedLayers.includes(dep));
      
      if (missingDeps.length > 0) {
        correctedLayers.push(...missingDeps);
        autoAdded.push(...missingDeps);
        
        warnings.push(
          `Layer ${layerId} (${this.getLayerName(layerId)}) requires ` +
          `${missingDeps.map(dep => `${dep} (${this.getLayerName(dep)})`).join(', ')}. ` +
          `Auto-added missing dependencies.`
        );
      }
    }
    
    // Remove duplicates and sort
    correctedLayers = [...new Set(correctedLayers)].sort((a, b) => a - b);
    
    return {
      correctedLayers,
      warnings,
      autoAdded
    };
  }
  
  /**
   * Predict if a layer will make changes
   */
  layerWillMakeChanges(code, layerId) {
    switch (layerId) {
      case 1: // Config
        return code.includes('tsconfig') || code.includes('next.config') || code.includes('package.json');
      
      case 2: // Patterns  
        return /&quot;|&amp;|&lt;|&gt;|console\.log|var\s+/.test(code);
      
      case 3: // Components
        return code.includes('map(') || 
               code.includes('<img') && !code.includes('alt=') ||
               code.includes('useState') && !code.includes('import { useState');
      
      case 4: // Hydration
        return code.includes('localStorage') && !code.includes('typeof window');
      
      default:
        return true; // Conservative default
    }
  }
  
  /**
   * Categorize errors for appropriate handling
   */
  categorizeError(error, layerId, code) {
    const errorMessage = error.message || error.toString();
    
    // Syntax errors
    if (error.name === 'SyntaxError' || errorMessage.includes('Unexpected token')) {
      return {
        category: 'syntax',
        message: 'Code syntax prevented transformation',
        suggestion: 'Fix syntax errors before running NeuroLint',
        recoveryOptions: [
          'Run syntax validation first',
          'Use a code formatter',
          'Check for missing brackets or semicolons'
        ],
        severity: 'high'
      };
    }
    
    // AST parsing errors
    if (errorMessage.includes('AST') || errorMessage.includes('parse')) {
      return {
        category: 'parsing',
        message: 'Complex code structure not supported by AST parser',
        suggestion: 'Try running with regex fallback or simplify code structure',
        recoveryOptions: [
          'Disable AST transformations',
          'Run individual layers',
          'Simplify complex expressions'
        ],
        severity: 'medium'
      };
    }
    
    // Generic errors
    return {
      category: 'unknown',
      message: `Unexpected error in Layer ${layerId}`,
      suggestion: 'Please report this issue with your code sample',
      recoveryOptions: [
        'Try running other layers individually',
        'Check console for additional details',
        'Report issue with minimal reproduction case'
      ],
      severity: 'medium'
    };
  }
  
  // Utility methods
  recordState(state) {
    this.states.push(state);
  }
  
  calculateChanges(before, after) {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    let changes = Math.abs(beforeLines.length - afterLines.length);
    
    const minLength = Math.min(beforeLines.length, afterLines.length);
    for (let i = 0; i < minLength; i++) {
      if (beforeLines[i] !== afterLines[i]) changes++;
    }
    
    return changes;
  }
  
  detectImprovements(before, after) {
    const improvements = [];
    
    // Detect specific improvements
    if (before.includes('&quot;') && !after.includes('&quot;')) {
      improvements.push('Fixed HTML entity quotes');
    }
    
    if (before.includes('console.log') && !after.includes('console.log')) {
      improvements.push('Removed console.log statements');
    }
    
    if (before.includes('.map(') && after.includes('key=')) {
      improvements.push('Added missing key props');
    }
    
    if (before.includes('localStorage') && after.includes('typeof window')) {
      improvements.push('Added SSR safety guards');
    }
    
    return improvements.length > 0 ? improvements : ['Transformation applied successfully'];
  }
  
  canUseAST(code) {
    try {
      parser.parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx'],
        allowImportExportEverywhere: true
      });
      return true;
    } catch {
      return false;
    }
  }
  
  getLayerName(layerId) {
    const layer = this.LAYER_EXECUTION_ORDER.find(l => l.id === layerId);
    return layer ? layer.name : `Layer ${layerId}`;
  }
  
  generateCacheKey(code, layerId) {
    const hash = this.simpleHash(code);
    return `${hash}-${layerId}`;
  }
  
  simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
  
  cacheResult(key, result) {
    if (this.cache.size >= 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, result);
  }
  
  log(message, ...args) {
    if (this.options.verbose) {
      console.log(message, ...args);
    }
  }
  
  generateResult(finalCode, results, totalExecutionTime) {
    return {
      finalCode,
      results,
      states: this.states,
      metadata: this.metadata,
      summary: {
        totalSteps: this.states.length - 1,
        successfulLayers: results.filter(r => r.success).length,
        failedLayers: results.filter(r => !r.success).length,
        totalExecutionTime,
        totalChanges: results.reduce((sum, r) => sum + r.changeCount, 0)
      },
      success: results.every(r => r.success || r.revertReason),
      improvements: results.flatMap(r => r.improvements || [])
    };
  }
  
  // Simulation methods for testing (to be replaced with actual layer execution)
  simulateLayer1(code) {
    // Simulate config fixes
    if (code.includes('"target": "es5"')) {
      return code.replace('"target": "es5"', '"target": "ES2020"');
    }
    return code;
  }
  
  simulateLayer2(code) {
    // Simulate pattern fixes
    return code
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/console\.log\(/g, 'console.debug(');
  }
  
  simulateLayer3(code) {
    // Simulate component fixes
    if (code.includes('.map(') && !code.includes('key=')) {
      return code.replace(/\.map\(\(([^,)]+)(?:,\s*(\w+))?\)\s*=>\s*<(\w+)/g, 
        (match, item, index, component) => {
          const keyProp = index ? `key={${index}}` : `key={${item}.id || ${item}}`;
          return match.replace(`<${component}`, `<${component} ${keyProp}`);
        });
    }
    return code;
  }
  
  simulateLayer4(code) {
    // Simulate hydration fixes
    return code
      .replace(/localStorage\.getItem\(/g, 'typeof window !== "undefined" && localStorage.getItem(')
      .replace(/window\.matchMedia\(/g, 'typeof window !== "undefined" && window.matchMedia(');
  }
  
  applyComponentTransformations(code, ast) {
    // Placeholder for AST-based component transformations
    return this.simulateLayer3(code);
  }
  
  applyHydrationTransformations(code, ast) {
    // Placeholder for AST-based hydration transformations
    return this.simulateLayer4(code);
  }
}

module.exports = { LayerOrchestrator };