/**
 * Comprehensive Transformation Validator
 * Implements incremental validation system to prevent cascading failures
 * Catches syntax errors, corruption, and logical issues
 */
class TransformationValidator {
  /**
   * Main validation entry point
   * Returns validation result with recommendations for rollback
   */
  static validateTransformation(before, after) {
    // Skip validation if no changes were made
    if (before === after) {
      return { shouldRevert: false, reason: "No changes made" };
    }

    // Check for syntax validity
    const syntaxCheck = this.validateSyntax(after);
    if (!syntaxCheck.valid) {
      return {
        shouldRevert: true,
        reason: `Syntax error: ${syntaxCheck.error}`,
        category: "syntax",
        severity: "critical",
      };
    }

    // Check for code corruption patterns
    const corruptionCheck = this.detectCorruption(before, after);
    if (corruptionCheck.detected) {
      return {
        shouldRevert: true,
        reason: `Corruption detected: ${corruptionCheck.pattern}`,
        category: "corruption",
        severity: "critical",
      };
    }

    // Check for logical issues
    const logicalCheck = this.validateLogicalIntegrity(before, after);
    if (!logicalCheck.valid) {
      return {
        shouldRevert: true,
        reason: `Logical issue: ${logicalCheck.reason}`,
        category: "logic",
        severity: "high",
      };
    }

    // Check for performance regressions
    const performanceCheck = this.validatePerformance(before, after);
    if (!performanceCheck.acceptable) {
      return {
        shouldRevert: false, // Don't revert, but warn
        reason: `Performance concern: ${performanceCheck.warning}`,
        category: "performance",
        severity: "medium",
      };
    }

    return { shouldRevert: false };
  }

  /**
   * Parse code to check for syntax errors
   * Uses multiple validation strategies for different file types
   */
  static validateSyntax(code) {
    // Detect file type based on content
    const fileType = this.detectFileType(code);

    switch (fileType) {
      case "typescript":
      case "javascript":
      case "jsx":
      case "tsx":
        return this.validateJavaScriptSyntax(code);

      case "json":
        return this.validateJSONSyntax(code);

      default:
        // For unknown types, do basic validation
        return this.validateGenericSyntax(code);
    }
  }

  /**
   * Validate JavaScript/TypeScript syntax
   */
  static validateJavaScriptSyntax(code) {
    try {
      // Use a simple syntax checker for basic validation
      // In a real implementation, you would use @babel/parser

      // Basic bracket matching
      const brackets = this.validateBrackets(code);
      if (!brackets.valid) {
        return { valid: false, error: brackets.error };
      }

      // Check for common syntax issues
      const commonIssues = this.checkCommonSyntaxIssues(code);
      if (commonIssues.found) {
        return { valid: false, error: commonIssues.error };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : "Unknown syntax error",
      };
    }
  }

  /**
   * Validate JSON syntax
   */
  static validateJSONSyntax(code) {
    try {
      JSON.parse(code);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `JSON syntax error: ${error.message}`,
      };
    }
  }

  /**
   * Generic syntax validation for unknown file types
   */
  static validateGenericSyntax(code) {
    // Basic checks for severely malformed content
    if (code.includes("\x00") || code.includes("\uFFFD")) {
      return { valid: false, error: "Binary or corrupted content detected" };
    }

    return { valid: true };
  }

  /**
   * Validate bracket/parentheses matching
   */
  static validateBrackets(code) {
    const stack = [];
    const pairs = { "(": ")", "[": "]", "{": "}" };
    const openBrackets = Object.keys(pairs);
    const closeBrackets = Object.values(pairs);

    // Simple string state tracking to avoid brackets in strings/comments
    let inString = false;
    let inComment = false;
    let stringChar = null;

    for (let i = 0; i < code.length; i++) {
      const char = code[i];
      const prev = code[i - 1];
      const next = code[i + 1];

      // Handle string states
      if (!inComment && (char === '"' || char === "'" || char === "`")) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar && prev !== "\\") {
          inString = false;
          stringChar = null;
        }
        continue;
      }

      // Handle comment states
      if (!inString) {
        if (char === "/" && next === "/") {
          inComment = "line";
          continue;
        }
        if (char === "/" && next === "*") {
          inComment = "block";
          continue;
        }
        if (inComment === "line" && char === "\n") {
          inComment = false;
          continue;
        }
        if (inComment === "block" && char === "*" && next === "/") {
          inComment = false;
          i++; // Skip next char
          continue;
        }
      }

      // Skip if in string or comment
      if (inString || inComment) continue;

      // Check brackets
      if (openBrackets.includes(char)) {
        stack.push(char);
      } else if (closeBrackets.includes(char)) {
        const last = stack.pop();
        if (!last || pairs[last] !== char) {
          return {
            valid: false,
            error: `Unmatched bracket: expected '${pairs[last] || "opening bracket"}' but found '${char}' at position ${i}`,
          };
        }
      }
    }

    if (stack.length > 0) {
      return {
        valid: false,
        error: `Unclosed brackets: ${stack.join(", ")}`,
      };
    }

    return { valid: true };
  }

  /**
   * Check for common JavaScript syntax issues
   */
  static checkCommonSyntaxIssues(code) {
    const issues = [
      {
        pattern: /\bfunction\s+\(/,
        error: "Invalid function declaration syntax",
      },
      {
        pattern: /\bif\s*\(/,
        validate: (match, index) => {
          // Check if if statement is properly closed
          const remaining = code.slice(index);
          const parenMatch = remaining.match(/if\s*\([^)]*\)/);
          return parenMatch ? null : "Malformed if statement";
        },
      },
      {
        pattern: /import\s*{\s*$|import\s*{\s*\n\s*import/m,
        error: "Corrupted import statement",
      },
    ];

    for (const issue of issues) {
      if (issue.pattern.test(code)) {
        if (issue.validate) {
          const matches = [
            ...code.matchAll(new RegExp(issue.pattern.source, "g")),
          ];
          for (const match of matches) {
            const error = issue.validate(match, match.index);
            if (error) {
              return { found: true, error };
            }
          }
        } else {
          return { found: true, error: issue.error };
        }
      }
    }

    return { found: false };
  }

  /**
   * Detect file type based on content patterns
   */
  static detectFileType(code) {
    if (code.trim().startsWith("{") && code.trim().endsWith("}")) {
      try {
        JSON.parse(code);
        return "json";
      } catch {
        // Not valid JSON, continue checking
      }
    }

    if (
      code.includes("import ") ||
      code.includes("export ") ||
      code.includes("interface ") ||
      code.includes(": string")
    ) {
      return code.includes("<") && code.includes("/>") ? "tsx" : "typescript";
    }

    if (
      code.includes("<") &&
      code.includes("/>") &&
      (code.includes("React") || code.includes("function "))
    ) {
      return "jsx";
    }

    if (
      code.includes("function ") ||
      code.includes("const ") ||
      code.includes("var ")
    ) {
      return "javascript";
    }

    return "unknown";
  }

  /**
   * Detect common corruption patterns introduced by faulty transformations
   */
  static detectCorruption(before, after) {
    const corruptionPatterns = [
      {
        name: "Double function calls",
        regex: /onClick=\{[^}]*\([^)]*\)\s*=>\s*\(\)\s*=>/g,
        description: "Malformed event handler with double calls",
      },
      {
        name: "Malformed event handlers",
        regex: /onClick=\{[^}]*\)\([^)]*\)$/g,
        description: "Event handler with incorrect parentheses",
      },
      {
        name: "Invalid JSX attributes",
        regex: /\w+=\{[^}]*\)[^}]*\}/g,
        description: "JSX attribute with mismatched braces",
      },
      {
        name: "Broken import statements",
        regex: /import\s*{\s*\n\s*import\s*{/g,
        description: "Duplicated or malformed import statements",
      },
      {
        name: "Nested function corruption",
        regex: /function\s+\w+\s*\([^)]*\)\s*{\s*function\s+\w+\s*\(/g,
        description: "Improperly nested function declarations",
      },
      {
        name: "String concatenation errors",
        regex: /['"]\s*\+\s*undefined\s*\+\s*['"]/g,
        description: "String concatenation with undefined values",
      },
    ];

    for (const pattern of corruptionPatterns) {
      // Check if pattern exists in after but not before
      const beforeMatches = (before.match(pattern.regex) || []).length;
      const afterMatches = (after.match(pattern.regex) || []).length;

      if (afterMatches > beforeMatches) {
        return {
          detected: true,
          pattern: pattern.name,
          description: pattern.description,
          newOccurrences: afterMatches - beforeMatches,
        };
      }
    }

    return { detected: false };
  }

  /**
   * Validate logical integrity of transformations
   */
  static validateLogicalIntegrity(before, after) {
    // Check that essential imports weren't accidentally removed
    const beforeImports = this.extractImports(before);
    const afterImports = this.extractImports(after);

    const removedImports = beforeImports.filter(
      (imp) => !afterImports.includes(imp),
    );
    const criticalImports = ["React", "useState", "useEffect", "Component"];

    const removedCritical = removedImports.filter((imp) =>
      criticalImports.some((critical) => imp.includes(critical)),
    );

    if (removedCritical.length > 0) {
      return {
        valid: false,
        reason: `Critical imports removed: ${removedCritical.join(", ")}`,
      };
    }

    // Check that function signatures weren't accidentally changed
    const beforeFunctions = this.extractFunctionSignatures(before);
    const afterFunctions = this.extractFunctionSignatures(after);

    const removedFunctions = beforeFunctions.filter(
      (fn) => !afterFunctions.includes(fn),
    );
    if (removedFunctions.length > 0) {
      return {
        valid: false,
        reason: `Function signatures changed: ${removedFunctions.slice(0, 3).join(", ")}`,
      };
    }

    // Check for excessive changes that might indicate corruption
    const changeRatio = this.calculateChangeRatio(before, after);
    if (changeRatio > 0.5) {
      // More than 50% of content changed
      return {
        valid: false,
        reason: `Excessive changes detected (${Math.round(changeRatio * 100)}% of content modified)`,
      };
    }

    return { valid: true };
  }

  /**
   * Validate performance implications of transformations
   */
  static validatePerformance(before, after) {
    const warnings = [];

    // Check for size increase
    const sizeDelta = after.length - before.length;
    const sizeIncrease = sizeDelta / before.length;

    if (sizeIncrease > 0.2) {
      // 20% size increase
      warnings.push(
        `Code size increased by ${Math.round(sizeIncrease * 100)}%`,
      );
    }

    // Check for complexity increase (rough heuristic)
    const beforeComplexity = this.estimateComplexity(before);
    const afterComplexity = this.estimateComplexity(after);
    const complexityIncrease =
      (afterComplexity - beforeComplexity) / beforeComplexity;

    if (complexityIncrease > 0.3) {
      // 30% complexity increase
      warnings.push(`Code complexity increased significantly`);
    }

    return {
      acceptable: warnings.length === 0,
      warning: warnings.join("; "),
    };
  }

  /**
   * Extract import statements for comparison
   */
  static extractImports(code) {
    const importRegex = /import\s+.*?\s+from\s+['"][^'"]+['"]/g;
    return code.match(importRegex) || [];
  }

  /**
   * Extract function signatures for comparison
   */
  static extractFunctionSignatures(code) {
    const functionRegex =
      /(function\s+\w+\s*\([^)]*\)|const\s+\w+\s*=\s*\([^)]*\)\s*=>|export\s+function\s+\w+\s*\([^)]*\))/g;
    return code.match(functionRegex) || [];
  }

  /**
   * Calculate ratio of changed content
   */
  static calculateChangeRatio(before, after) {
    const beforeLines = before.split("\n").filter((line) => line.trim());
    const afterLines = after.split("\n").filter((line) => line.trim());

    let changedLines = 0;
    const maxLines = Math.max(beforeLines.length, afterLines.length);

    for (let i = 0; i < maxLines; i++) {
      const beforeLine = beforeLines[i] || "";
      const afterLine = afterLines[i] || "";

      if (beforeLine.trim() !== afterLine.trim()) {
        changedLines++;
      }
    }

    return changedLines / Math.max(beforeLines.length, 1);
  }

  /**
   * Estimate code complexity (rough heuristic)
   */
  static estimateComplexity(code) {
    const complexityFactors = [
      { pattern: /if\s*\(/g, weight: 1 },
      { pattern: /for\s*\(/g, weight: 2 },
      { pattern: /while\s*\(/g, weight: 2 },
      { pattern: /function\s+/g, weight: 3 },
      { pattern: /=>\s*{/g, weight: 2 },
      { pattern: /try\s*{/g, weight: 3 },
      { pattern: /catch\s*\(/g, weight: 3 },
    ];

    return complexityFactors.reduce((complexity, factor) => {
      const matches = code.match(factor.pattern) || [];
      return complexity + matches.length * factor.weight;
    }, 0);
  }
}

module.exports = { TransformationValidator };
