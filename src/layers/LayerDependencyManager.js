/**
 * Layer Dependency Management System
 * Ensures layers execute in the correct order with proper dependencies
 * Validates that required layers are included when others are selected
 */
class LayerDependencyManager {
  static DEPENDENCIES = {
    1: [], // Configuration has no dependencies
    2: [1], // Entity cleanup depends on config foundation
    3: [1, 2], // Components depend on config + cleanup
    4: [1, 2, 3], // Hydration depends on all previous layers
    5: [1, 2, 3, 4], // Next.js depends on all foundation layers
    6: [1, 2, 3, 4, 5], // Testing depends on complete setup
  };

  static LAYER_INFO = {
    1: { name: "Configuration", critical: true, category: "foundation" },
    2: { name: "Entity Cleanup", critical: false, category: "preprocessing" },
    3: { name: "Components", critical: false, category: "react" },
    4: { name: "Hydration", critical: false, category: "ssr" },
    5: { name: "Next.js Optimization", critical: false, category: "framework" },
    6: {
      name: "Quality & Performance",
      critical: false,
      category: "optimization",
    },
  };

  /**
   * Validates and potentially auto-corrects layer selection
   * Returns corrected layers with warnings and explanations
   */
  static validateAndCorrectLayers(requestedLayers) {
    const warnings = [];
    const autoAdded = [];
    let correctedLayers = [...requestedLayers];

    // Remove invalid layers
    const validLayers = correctedLayers.filter(
      (layer) => layer >= 1 && layer <= 6,
    );
    const invalidLayers = correctedLayers.filter(
      (layer) => layer < 1 || layer > 6,
    );

    if (invalidLayers.length > 0) {
      warnings.push(`Invalid layers removed: ${invalidLayers.join(", ")}`);
      correctedLayers = validLayers;
    }

    // Sort layers in execution order
    correctedLayers.sort((a, b) => a - b);

    // Check dependencies for each requested layer
    for (const layerId of [...correctedLayers]) {
      const dependencies = this.DEPENDENCIES[layerId] || [];
      const missingDeps = dependencies.filter(
        (dep) => !correctedLayers.includes(dep),
      );

      if (missingDeps.length > 0) {
        // Auto-add missing dependencies
        correctedLayers.push(...missingDeps);
        autoAdded.push(...missingDeps);

        const layerName = this.LAYER_INFO[layerId]?.name || `Layer ${layerId}`;
        const depNames = missingDeps
          .map((dep) => `${dep} (${this.LAYER_INFO[dep]?.name || "Unknown"})`)
          .join(", ");

        warnings.push(
          `${layerName} requires ${depNames}. Auto-added missing dependencies.`,
        );
      }
    }

    // Remove duplicates and sort again
    correctedLayers = [...new Set(correctedLayers)].sort((a, b) => a - b);

    // Validate execution order
    const orderValidation = this.validateExecutionOrder(correctedLayers);
    if (!orderValidation.valid) {
      warnings.push(orderValidation.warning);
    }

    return {
      correctedLayers,
      warnings,
      autoAdded,
      recommendations: this.generateRecommendations(correctedLayers),
    };
  }

  /**
   * Validates that layers can be executed in the given order
   */
  static validateExecutionOrder(layers) {
    for (let i = 0; i < layers.length; i++) {
      const currentLayer = layers[i];
      const dependencies = this.DEPENDENCIES[currentLayer] || [];

      for (const dep of dependencies) {
        const depIndex = layers.indexOf(dep);
        if (depIndex >= i) {
          return {
            valid: false,
            warning: `Layer ${currentLayer} depends on Layer ${dep} but it appears later in execution order`,
          };
        }
      }
    }

    return { valid: true };
  }

  /**
   * Suggests optimal layer combinations based on code analysis
   */
  static suggestLayers(code, filePath) {
    const recommended = [];
    const reasons = [];
    const confidence = { overall: 0, factors: [] };

    // Always recommend config layer for foundation
    recommended.push(1);
    reasons.push("Configuration layer provides essential foundation");
    confidence.factors.push({
      layer: 1,
      score: 1.0,
      reason: "Always recommended",
    });

    // Analyze code for specific issues
    const analysis = this.analyzeCodeIssues(code, filePath);

    // Layer 2: Pattern and entity issues
    if (analysis.hasEntityIssues || analysis.hasPatternIssues) {
      recommended.push(2);
      const issueCount = analysis.entityCount + analysis.patternCount;
      reasons.push(`Entity cleanup needed: ${issueCount} issues detected`);
      confidence.factors.push({
        layer: 2,
        score: Math.min(0.9, 0.5 + issueCount / 10),
        reason: `${issueCount} pattern/entity issues`,
      });
    }

    // Layer 3: Component issues
    if (analysis.hasComponentIssues) {
      recommended.push(3);
      reasons.push(
        `Component fixes needed: ${analysis.componentIssues.join(", ")}`,
      );
      confidence.factors.push({
        layer: 3,
        score: 0.8,
        reason: `${analysis.componentIssues.length} component issues`,
      });
    }

    // Layer 4: Hydration issues
    if (analysis.hasHydrationIssues) {
      recommended.push(4);
      reasons.push(
        `Hydration fixes needed: ${analysis.hydrationIssues.join(", ")}`,
      );
      confidence.factors.push({
        layer: 4,
        score: 0.9,
        reason: `${analysis.hydrationIssues.length} SSR safety issues`,
      });
    }

    // Layer 5: Next.js specific
    if (analysis.isNextJsProject) {
      recommended.push(5);
      reasons.push("Next.js optimizations recommended for this project");
      confidence.factors.push({
        layer: 5,
        score: 0.7,
        reason: "Next.js project detected",
      });
    }

    // Layer 6: Quality improvements
    if (analysis.hasQualityIssues || code.length > 1000) {
      recommended.push(6);
      reasons.push("Quality and performance improvements recommended");
      confidence.factors.push({
        layer: 6,
        score: 0.6,
        reason: "Large codebase or quality issues detected",
      });
    }

    // Calculate overall confidence
    confidence.overall =
      confidence.factors.length > 0
        ? confidence.factors.reduce((sum, f) => sum + f.score, 0) /
          confidence.factors.length
        : 0.5;

    return {
      recommended,
      reasons,
      confidence,
      analysis,
    };
  }

  /**
   * Analyze code to detect issues that specific layers can fix
   */
  static analyzeCodeIssues(code, filePath = "") {
    const analysis = {
      hasEntityIssues: false,
      hasPatternIssues: false,
      hasComponentIssues: false,
      hasHydrationIssues: false,
      hasQualityIssues: false,
      isNextJsProject: false,
      entityCount: 0,
      patternCount: 0,
      componentIssues: [],
      hydrationIssues: [],
      qualityIssues: [],
    };

    // Entity issues (Layer 2)
    const entityPatterns = [/&quot;/g, /&amp;/g, /&lt;/g, /&gt;/g, /&apos;/g];

    entityPatterns.forEach((pattern) => {
      const matches = code.match(pattern);
      if (matches) {
        analysis.hasEntityIssues = true;
        analysis.entityCount += matches.length;
      }
    });

    // Pattern issues (Layer 2)
    const patternIssues = [
      { pattern: /console\.log\(/g, name: "console.log statements" },
      { pattern: /\bvar\s+/g, name: "var declarations" },
      { pattern: /==(?!=)/g, name: "loose equality operators" },
    ];

    patternIssues.forEach(({ pattern, name }) => {
      const matches = code.match(pattern);
      if (matches) {
        analysis.hasPatternIssues = true;
        analysis.patternCount += matches.length;
      }
    });

    // Component issues (Layer 3)
    if (this.isReactComponent(code)) {
      // Missing key props
      const mapWithoutKey = /\.map\s*\([^)]*\)\s*=>\s*<[^>]*(?!.*key=)/g;
      if (mapWithoutKey.test(code)) {
        analysis.hasComponentIssues = true;
        analysis.componentIssues.push("missing key props in map operations");
      }

      // Missing React imports
      if (code.includes("useState") && !code.includes("import { useState")) {
        analysis.hasComponentIssues = true;
        analysis.componentIssues.push("missing React hook imports");
      }

      // Accessibility issues
      if (/<img(?![^>]*alt=)[^>]*>/g.test(code)) {
        analysis.hasComponentIssues = true;
        analysis.componentIssues.push("images missing alt attributes");
      }
    }

    // Hydration issues (Layer 4)
    const hydrationPatterns = [
      {
        pattern: /localStorage\.(?!clear)/g,
        name: "localStorage usage without SSR guard",
      },
      {
        pattern: /sessionStorage\./g,
        name: "sessionStorage usage without SSR guard",
      },
      { pattern: /window\./g, name: "window object access without guard" },
      { pattern: /document\./g, name: "document object access without guard" },
    ];

    hydrationPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(code) && !code.includes("typeof window")) {
        analysis.hasHydrationIssues = true;
        analysis.hydrationIssues.push(name);
      }
    });

    // Next.js project detection
    analysis.isNextJsProject =
      code.includes("next/") ||
      filePath.includes("next.config") ||
      code.includes("getServerSideProps") ||
      code.includes("getStaticProps") ||
      code.includes("useRouter");

    // Quality issues (Layer 6)
    const qualityPatterns = [
      {
        pattern: /try\s*{[^}]*}\s*catch\s*\(\s*\)\s*{/g,
        name: "empty catch blocks",
      },
      { pattern: /TODO|FIXME|HACK/gi, name: "TODO/FIXME comments" },
      {
        pattern: /function\s+\w+\s*\([^)]{50,}\)/g,
        name: "functions with many parameters",
      },
    ];

    qualityPatterns.forEach(({ pattern, name }) => {
      if (pattern.test(code)) {
        analysis.hasQualityIssues = true;
        analysis.qualityIssues.push(name);
      }
    });

    return analysis;
  }

  /**
   * Check if code appears to be a React component
   */
  static isReactComponent(code) {
    return (
      code.includes("import React") ||
      code.includes("import { ") ||
      (code.includes("function ") && code.includes("return (")) ||
      (code.includes("const ") && code.includes("=> (")) ||
      code.includes("JSX") ||
      (code.includes("<") && code.includes("/>"))
    );
  }

  /**
   * Generate recommendations based on layer selection
   */
  static generateRecommendations(layers) {
    const recommendations = [];

    // Check for missing foundation
    if (layers.length > 0 && !layers.includes(1)) {
      recommendations.push({
        type: "foundation",
        message:
          "Consider including Layer 1 (Configuration) for better foundation",
        priority: "high",
      });
    }

    // Check for incomplete sequences
    if (layers.includes(4) && !layers.includes(3)) {
      recommendations.push({
        type: "sequence",
        message: "Layer 4 (Hydration) works best with Layer 3 (Components)",
        priority: "medium",
      });
    }

    // Check for advanced layers without foundation
    if ((layers.includes(5) || layers.includes(6)) && layers.length < 3) {
      recommendations.push({
        type: "foundation",
        message:
          "Advanced layers work best with complete foundation (Layers 1-3)",
        priority: "medium",
      });
    }

    return recommendations;
  }

  /**
   * Get dependency tree for a specific layer
   */
  static getDependencyTree(layerId) {
    const tree = { layer: layerId, dependencies: [] };
    const deps = this.DEPENDENCIES[layerId] || [];

    deps.forEach((dep) => {
      tree.dependencies.push(this.getDependencyTree(dep));
    });

    return tree;
  }

  /**
   * Get all layers that depend on a specific layer
   */
  static getDependents(layerId) {
    const dependents = [];

    Object.entries(this.DEPENDENCIES).forEach(([layer, deps]) => {
      if (deps.includes(layerId)) {
        dependents.push(parseInt(layer));
      }
    });

    return dependents;
  }

  /**
   * Check if a layer combination is safe to execute
   */
  static isSafeCombination(layers) {
    const issues = [];

    // Check for dependency violations
    for (const layer of layers) {
      const deps = this.DEPENDENCIES[layer] || [];
      const missingDeps = deps.filter((dep) => !layers.includes(dep));

      if (missingDeps.length > 0) {
        issues.push({
          layer,
          type: "missing_dependencies",
          missing: missingDeps,
        });
      }
    }

    // Check for order violations
    for (let i = 0; i < layers.length; i++) {
      const currentLayer = layers[i];
      const dependencies = this.DEPENDENCIES[currentLayer] || [];

      for (const dep of dependencies) {
        const depIndex = layers.indexOf(dep);
        if (depIndex > i) {
          issues.push({
            layer: currentLayer,
            type: "order_violation",
            dependency: dep,
          });
        }
      }
    }

    return {
      safe: issues.length === 0,
      issues,
    };
  }
}

module.exports = { LayerDependencyManager };
