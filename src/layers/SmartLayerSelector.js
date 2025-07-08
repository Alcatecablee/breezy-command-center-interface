/**
 * Intelligent Layer Selection based on Code Analysis
 * Automatically determines which layers are needed based on code content
 * Recommends optimal layer combinations for specific issues
 */
class SmartLayerSelector {
  /**
   * Analyze code and suggest appropriate layers
   */
  static analyzeAndRecommend(code, filePath) {
    const issues = this.detectIssues(code, filePath);
    const recommendations = this.generateRecommendations(issues);

    return {
      recommendedLayers: recommendations.layers,
      detectedIssues: issues,
      reasoning: recommendations.reasons,
      confidence: this.calculateConfidence(issues),
      estimatedImpact: this.estimateImpact(issues),
      priorityOrder: this.prioritizeIssues(issues),
    };
  }

  /**
   * Detect specific issues in code that layers can fix
   */
  static detectIssues(code, filePath = "") {
    const issues = [];

    // Layer 1: Configuration issues
    if (this.isConfigurationFile(filePath)) {
      const configIssues = this.detectConfigurationIssues(code, filePath);
      issues.push(...configIssues);
    }

    // Layer 2: Entity and pattern issues
    const patternIssues = this.detectPatternIssues(code);
    issues.push(...patternIssues);

    // Layer 3: Component issues (if React/JSX code)
    if (this.isReactComponent(code)) {
      const componentIssues = this.detectComponentIssues(code);
      issues.push(...componentIssues);
    }

    // Layer 4: Hydration issues
    const hydrationIssues = this.detectHydrationIssues(code);
    issues.push(...hydrationIssues);

    // Layer 5: Next.js specific issues
    if (this.isNextJsCode(code, filePath)) {
      const nextjsIssues = this.detectNextJsIssues(code);
      issues.push(...nextjsIssues);
    }

    // Layer 6: Quality and performance issues
    const qualityIssues = this.detectQualityIssues(code);
    issues.push(...qualityIssues);

    return issues;
  }

  /**
   * Detect configuration file issues (Layer 1)
   */
  static detectConfigurationIssues(code, filePath) {
    const issues = [];

    if (filePath.includes("tsconfig")) {
      if (code.includes('"target": "es5"')) {
        issues.push({
          type: "config",
          severity: "high",
          description: "Outdated TypeScript target (ES5)",
          fixedByLayer: 1,
          pattern: "TypeScript target upgrade needed",
          location: "tsconfig.json",
          impact: "performance",
        });
      }

      if (!code.includes('"strict": true')) {
        issues.push({
          type: "config",
          severity: "medium",
          description: "TypeScript strict mode not enabled",
          fixedByLayer: 1,
          pattern: "TypeScript strict mode",
          location: "tsconfig.json",
          impact: "code-quality",
        });
      }
    }

    if (filePath.includes("next.config")) {
      if (code.includes("reactStrictMode: false")) {
        issues.push({
          type: "config",
          severity: "medium",
          description: "React strict mode disabled",
          fixedByLayer: 1,
          pattern: "React strict mode",
          location: "next.config.js",
          impact: "development",
        });
      }
    }

    return issues;
  }

  /**
   * Detect pattern and entity issues (Layer 2)
   */
  static detectPatternIssues(code) {
    const issues = [];

    const entityPatterns = [
      { pattern: /&quot;/g, name: "HTML quote entities", severity: "high" },
      { pattern: /&amp;/g, name: "HTML ampersand entities", severity: "high" },
      {
        pattern: /&lt;|&gt;/g,
        name: "HTML bracket entities",
        severity: "medium",
      },
      {
        pattern: /&apos;/g,
        name: "HTML apostrophe entities",
        severity: "medium",
      },
    ];

    entityPatterns.forEach(({ pattern, name, severity }) => {
      const matches = code.match(pattern);
      if (matches) {
        issues.push({
          type: "pattern",
          severity,
          description: `${name} found (${matches.length} occurrences)`,
          fixedByLayer: 2,
          pattern: name,
          count: matches.length,
          impact: "readability",
        });
      }
    });

    const codePatterns = [
      {
        pattern: /console\.log\(/g,
        name: "Console.log statements",
        severity: "medium",
      },
      {
        pattern: /\bvar\s+/g,
        name: "Var declarations (should use let/const)",
        severity: "low",
      },
      {
        pattern: /==(?!=)/g,
        name: "Loose equality operators",
        severity: "medium",
      },
      { pattern: /debugger;/g, name: "Debugger statements", severity: "high" },
    ];

    codePatterns.forEach(({ pattern, name, severity }) => {
      const matches = code.match(pattern);
      if (matches) {
        issues.push({
          type: "pattern",
          severity,
          description: `${name} found (${matches.length} occurrences)`,
          fixedByLayer: 2,
          pattern: name,
          count: matches.length,
          impact: "code-quality",
        });
      }
    });

    return issues;
  }

  /**
   * Detect React component issues (Layer 3)
   */
  static detectComponentIssues(code) {
    const issues = [];

    // Missing key props in map functions
    const mapWithoutKeyRegex = /\.map\s*\([^)]*\)\s*=>\s*<[^>]*(?!.*key=)/g;
    const mapMatches = code.match(mapWithoutKeyRegex);
    if (mapMatches) {
      issues.push({
        type: "component",
        severity: "high",
        description: `Missing key props in ${mapMatches.length} map operations`,
        fixedByLayer: 3,
        pattern: "Missing key props",
        count: mapMatches.length,
        impact: "performance",
      });
    }

    // Missing React imports
    const hasHooks =
      /useState|useEffect|useContext|useReducer|useMemo|useCallback/.test(code);
    if (hasHooks && !code.includes("import { ")) {
      issues.push({
        type: "component",
        severity: "high",
        description: "Missing React hook imports",
        fixedByLayer: 3,
        pattern: "Missing imports",
        impact: "functionality",
      });
    }

    // Accessibility issues
    const accessibilityIssues = [
      {
        pattern: /<img(?![^>]*alt=)[^>]*>/g,
        name: "Images missing alt attributes",
      },
      {
        pattern: /<button(?![^>]*aria-label)[^>]*>.*?<\/button>/g,
        name: "Buttons missing aria-label",
      },
      {
        pattern: /<input(?![^>]*aria-label)(?![^>]*id=)[^>]*>/g,
        name: "Form inputs missing labels",
      },
    ];

    accessibilityIssues.forEach(({ pattern, name }) => {
      const matches = code.match(pattern);
      if (matches) {
        issues.push({
          type: "component",
          severity: "medium",
          description: `${matches.length} accessibility issues: ${name}`,
          fixedByLayer: 3,
          pattern: "Accessibility issues",
          count: matches.length,
          impact: "accessibility",
        });
      }
    });

    // Performance issues
    if (code.includes(".map(") && code.includes(".filter(")) {
      const chainedOps = code.match(
        /\.(?:map|filter|reduce)\s*\([^)]*\)\s*\.(?:map|filter|reduce)/g,
      );
      if (chainedOps && chainedOps.length > 2) {
        issues.push({
          type: "component",
          severity: "medium",
          description:
            "Multiple chained array operations may impact performance",
          fixedByLayer: 3,
          pattern: "Performance optimization",
          count: chainedOps.length,
          impact: "performance",
        });
      }
    }

    return issues;
  }

  /**
   * Detect hydration and SSR issues (Layer 4)
   */
  static detectHydrationIssues(code) {
    const issues = [];

    const browserAPIPatterns = [
      {
        pattern: /localStorage\.(?!clear\(\))/g,
        name: "localStorage usage without SSR guard",
        severity: "high",
      },
      {
        pattern: /sessionStorage\./g,
        name: "sessionStorage usage without SSR guard",
        severity: "high",
      },
      {
        pattern: /window\.(?!addEventListener|removeEventListener)/g,
        name: "window object access without guard",
        severity: "medium",
      },
      {
        pattern: /document\.(?!addEventListener|removeEventListener)/g,
        name: "document object access without guard",
        severity: "medium",
      },
      {
        pattern: /navigator\./g,
        name: "navigator object access without guard",
        severity: "medium",
      },
    ];

    browserAPIPatterns.forEach(({ pattern, name, severity }) => {
      const matches = code.match(pattern);
      if (matches && !code.includes("typeof window")) {
        issues.push({
          type: "hydration",
          severity,
          description: `${name} (${matches.length} occurrences)`,
          fixedByLayer: 4,
          pattern: "SSR safety",
          count: matches.length,
          impact: "ssr-compatibility",
        });
      }
    });

    // Check for theme providers without hydration protection
    if (code.includes("ThemeProvider") && !code.includes("mounted")) {
      issues.push({
        type: "hydration",
        severity: "high",
        description: "Theme provider without hydration protection",
        fixedByLayer: 4,
        pattern: "Theme hydration",
        impact: "ssr-compatibility",
      });
    }

    return issues;
  }

  /**
   * Detect Next.js specific issues (Layer 5)
   */
  static detectNextJsIssues(code) {
    const issues = [];

    // App Router migration issues
    if (code.includes("pages/") && code.includes("app/")) {
      issues.push({
        type: "nextjs",
        severity: "medium",
        description: "Mixed Pages and App Router usage",
        fixedByLayer: 5,
        pattern: "App Router migration",
        impact: "architecture",
      });
    }

    // Image optimization
    if (code.includes("<img") && !code.includes("next/image")) {
      const imgCount = (code.match(/<img/g) || []).length;
      issues.push({
        type: "nextjs",
        severity: "medium",
        description: `${imgCount} unoptimized images (not using next/image)`,
        fixedByLayer: 5,
        pattern: "Image optimization",
        count: imgCount,
        impact: "performance",
      });
    }

    // Font optimization
    if (code.includes("font-family:") && !code.includes("next/font")) {
      issues.push({
        type: "nextjs",
        severity: "low",
        description: "Fonts not optimized with next/font",
        fixedByLayer: 5,
        pattern: "Font optimization",
        impact: "performance",
      });
    }

    return issues;
  }

  /**
   * Detect quality and performance issues (Layer 6)
   */
  static detectQualityIssues(code) {
    const issues = [];

    const qualityPatterns = [
      {
        pattern: /try\s*{[^}]*}\s*catch\s*\(\s*\)\s*{[\s]*}/g,
        name: "Empty catch blocks",
        severity: "medium",
      },
      {
        pattern: /TODO|FIXME|HACK/gi,
        name: "TODO/FIXME comments",
        severity: "low",
      },
      {
        pattern: /function\s+\w+\s*\([^)]{50,}\)/g,
        name: "Functions with many parameters",
        severity: "medium",
      },
      {
        pattern:
          /if\s*\([^)]*\)\s*{[^}]*}\s*else\s*if\s*\([^)]*\)\s*{[^}]*}\s*else\s*if/g,
        name: "Long if-else chains",
        severity: "medium",
      },
    ];

    qualityPatterns.forEach(({ pattern, name, severity }) => {
      const matches = code.match(pattern);
      if (matches) {
        issues.push({
          type: "quality",
          severity,
          description: `${name} found (${matches.length} occurrences)`,
          fixedByLayer: 6,
          pattern: name,
          count: matches.length,
          impact: "maintainability",
        });
      }
    });

    // Code complexity analysis
    const complexity = this.calculateComplexity(code);
    if (complexity.score > 15) {
      issues.push({
        type: "quality",
        severity: "medium",
        description: `High code complexity (score: ${complexity.score})`,
        fixedByLayer: 6,
        pattern: "Code complexity",
        impact: "maintainability",
      });
    }

    return issues;
  }

  /**
   * Generate layer recommendations based on detected issues
   */
  static generateRecommendations(issues) {
    const layers = new Set();
    const reasons = [];

    // Group issues by layer
    const issuesByLayer = issues.reduce((acc, issue) => {
      if (!acc[issue.fixedByLayer]) {
        acc[issue.fixedByLayer] = [];
      }
      acc[issue.fixedByLayer].push(issue);
      return acc;
    }, {});

    // Always include layer 1 for foundation unless no issues at all
    if (issues.length > 0) {
      layers.add(1);
      reasons.push("Configuration layer provides essential foundation");
    }

    // Add layers based on detected issues
    Object.entries(issuesByLayer).forEach(([layerId, layerIssues]) => {
      const id = parseInt(layerId);
      layers.add(id);

      const criticalCount = layerIssues.filter(
        (i) => i.severity === "high",
      ).length;
      const mediumCount = layerIssues.filter(
        (i) => i.severity === "medium",
      ).length;
      const lowCount = layerIssues.filter((i) => i.severity === "low").length;

      let reason = `Layer ${id}: `;
      const reasonParts = [];

      if (criticalCount > 0)
        reasonParts.push(`${criticalCount} critical issues`);
      if (mediumCount > 0) reasonParts.push(`${mediumCount} medium issues`);
      if (lowCount > 0) reasonParts.push(`${lowCount} minor issues`);

      reason += reasonParts.join(", ");
      reasons.push(reason);
    });

    // Ensure dependency order
    const sortedLayers = Array.from(layers).sort((a, b) => a - b);

    return {
      layers: sortedLayers,
      reasons,
    };
  }

  /**
   * Calculate confidence in recommendations
   */
  static calculateConfidence(issues) {
    if (issues.length === 0) return 0.5; // Neutral when no issues

    const severityWeights = { high: 1.0, medium: 0.7, low: 0.4 };
    const totalWeight = issues.reduce(
      (sum, issue) => sum + (severityWeights[issue.severity] || 0.5),
      0,
    );

    const maxPossibleWeight = issues.length * 1.0;
    const confidence = Math.min(
      0.95,
      0.5 + (totalWeight / maxPossibleWeight) * 0.45,
    );

    return {
      overall: confidence,
      factors: {
        issueCount: issues.length,
        highSeverityCount: issues.filter((i) => i.severity === "high").length,
        weightedScore: totalWeight,
        maxScore: maxPossibleWeight,
      },
    };
  }

  /**
   * Estimate impact of applying recommended layers
   */
  static estimateImpact(issues) {
    const impactCategories = {
      performance: 0,
      "code-quality": 0,
      accessibility: 0,
      "ssr-compatibility": 0,
      maintainability: 0,
      functionality: 0,
    };

    issues.forEach((issue) => {
      if (issue.impact && impactCategories.hasOwnProperty(issue.impact)) {
        const weight =
          issue.severity === "high" ? 3 : issue.severity === "medium" ? 2 : 1;
        impactCategories[issue.impact] += weight;
      }
    });

    const totalImpact = Object.values(impactCategories).reduce(
      (sum, val) => sum + val,
      0,
    );
    const primaryImpact = Object.entries(impactCategories).reduce(
      (max, [category, score]) =>
        score > max.score ? { category, score } : max,
      { category: "general", score: 0 },
    );

    return {
      level: totalImpact > 10 ? "high" : totalImpact > 5 ? "medium" : "low",
      primaryCategory: primaryImpact.category,
      categories: impactCategories,
      estimatedFixTime: this.estimateFixTime(issues),
      description: this.generateImpactDescription(issues, totalImpact),
    };
  }

  /**
   * Prioritize issues for fixing order
   */
  static prioritizeIssues(issues) {
    const priorityOrder = [];

    // Critical issues first
    const critical = issues.filter((i) => i.severity === "high");
    if (critical.length > 0) {
      priorityOrder.push({
        priority: "critical",
        count: critical.length,
        layers: [...new Set(critical.map((i) => i.fixedByLayer))].sort(),
        description: "Critical issues that may break functionality",
      });
    }

    // Performance issues
    const performance = issues.filter((i) => i.impact === "performance");
    if (performance.length > 0) {
      priorityOrder.push({
        priority: "performance",
        count: performance.length,
        layers: [...new Set(performance.map((i) => i.fixedByLayer))].sort(),
        description: "Performance optimizations for better user experience",
      });
    }

    // Code quality issues
    const quality = issues.filter(
      (i) => i.impact === "code-quality" || i.impact === "maintainability",
    );
    if (quality.length > 0) {
      priorityOrder.push({
        priority: "quality",
        count: quality.length,
        layers: [...new Set(quality.map((i) => i.fixedByLayer))].sort(),
        description: "Code quality improvements for better maintainability",
      });
    }

    return priorityOrder;
  }

  /**
   * Helper methods
   */
  static isConfigurationFile(filePath) {
    return (
      filePath.includes("tsconfig") ||
      filePath.includes("next.config") ||
      filePath.includes("package.json")
    );
  }

  static isReactComponent(code) {
    return (
      code.includes("import React") ||
      code.includes("import { ") ||
      code.includes("JSX") ||
      (code.includes("<") && code.includes("/>")) ||
      (code.includes("function ") && code.includes("return (")) ||
      (code.includes("const ") && code.includes("=> ("))
    );
  }

  static isNextJsCode(code, filePath) {
    return (
      code.includes("next/") ||
      filePath.includes("next.config") ||
      code.includes("getServerSideProps") ||
      code.includes("getStaticProps") ||
      code.includes("useRouter") ||
      filePath.includes("app/") ||
      filePath.includes("pages/")
    );
  }

  static calculateComplexity(code) {
    const complexityFactors = [
      { pattern: /if\s*\(/g, weight: 1 },
      { pattern: /for\s*\(/g, weight: 2 },
      { pattern: /while\s*\(/g, weight: 2 },
      { pattern: /function\s+/g, weight: 3 },
      { pattern: /=>\s*{/g, weight: 2 },
      { pattern: /try\s*{/g, weight: 3 },
      { pattern: /catch\s*\(/g, weight: 3 },
      { pattern: /switch\s*\(/g, weight: 2 },
    ];

    const score = complexityFactors.reduce((total, factor) => {
      const matches = code.match(factor.pattern) || [];
      return total + matches.length * factor.weight;
    }, 0);

    return {
      score,
      level: score > 20 ? "high" : score > 10 ? "medium" : "low",
    };
  }

  static estimateFixTime(issues) {
    const timeEstimates = {
      high: 5, // 5 minutes per high severity issue
      medium: 2, // 2 minutes per medium severity issue
      low: 1, // 1 minute per low severity issue
    };

    const totalMinutes = issues.reduce((total, issue) => {
      return total + (timeEstimates[issue.severity] || 2);
    }, 0);

    if (totalMinutes < 60) {
      return `${totalMinutes} minutes`;
    } else {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return `${hours}h ${minutes}m`;
    }
  }

  static generateImpactDescription(issues, totalImpact) {
    const criticalCount = issues.filter((i) => i.severity === "high").length;

    if (criticalCount > 5) {
      return `Major improvements needed: ${issues.length} total issues, ${criticalCount} critical`;
    } else if (criticalCount > 0) {
      return `Moderate improvements: ${issues.length} total issues, ${criticalCount} critical`;
    } else {
      return `Minor improvements: ${issues.length} quality and optimization issues`;
    }
  }
}

module.exports = { SmartLayerSelector };
