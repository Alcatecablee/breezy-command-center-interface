/**
 * Layer dependency system ensures proper execution order
 * Validates that required layers are included when others are selected
 */
class LayerDependencyManager {
  static DEPENDENCIES = {
    1: [], // Configuration has no dependencies
    2: [1], // Entity cleanup depends on config foundation
    3: [1, 2], // Components depend on config + cleanup
    4: [1, 2, 3], // Hydration depends on all previous layers
    5: [1, 2, 3, 4], // Next.js depends on all previous
    6: [1, 2, 3, 4, 5], // Testing depends on all previous
  };

  static LAYER_INFO = {
    1: { name: "Configuration", critical: true },
    2: { name: "Entity Cleanup", critical: false },
    3: { name: "Components", critical: false },
    4: { name: "Hydration", critical: false },
    5: { name: "Next.js", critical: false },
    6: { name: "Testing", critical: false },
  };

  /**
   * Validates and potentially auto-corrects layer selection
   */
  static validateAndCorrectLayers(requestedLayers) {
    const warnings = [];
    const autoAdded = [];
    let correctedLayers = [...requestedLayers];

    // Sort layers in execution order
    correctedLayers.sort((a, b) => a - b);

    // Check dependencies for each requested layer
    for (const layerId of requestedLayers) {
      const dependencies = this.DEPENDENCIES[layerId] || [];
      const missingDeps = dependencies.filter(
        (dep) => !correctedLayers.includes(dep),
      );

      if (missingDeps.length > 0) {
        // Auto-add missing dependencies
        correctedLayers.push(...missingDeps);
        autoAdded.push(...missingDeps);

        warnings.push(
          `Layer ${layerId} (${this.LAYER_INFO[layerId]?.name}) requires ` +
            `${missingDeps.map((dep) => `${dep} (${this.LAYER_INFO[dep]?.name})`).join(", ")}. ` +
            `Auto-added missing dependencies.`,
        );
      }
    }

    // Remove duplicates and sort
    correctedLayers = [...new Set(correctedLayers)].sort((a, b) => a - b);

    return {
      correctedLayers,
      warnings,
      autoAdded,
    };
  }

  /**
   * Suggests optimal layer combinations based on code analysis
   */
  static suggestLayers(code) {
    const recommended = [];
    const reasons = [];

    // Always recommend config layer for foundation
    recommended.push(1);
    reasons.push("Configuration layer provides essential foundation");

    // Check for HTML entities or old patterns
    if (/&quot;|&amp;|&lt;|&gt;|console\.log/.test(code)) {
      recommended.push(2);
      reasons.push("Entity cleanup needed for HTML entities and old patterns");
    }

    // Check for React components needing fixes
    if (code.includes("map(") && code.includes("<") && !code.includes("key=")) {
      recommended.push(3);
      reasons.push("Component fixes needed for missing key props");
    }

    // Check for hydration issues
    if (code.includes("localStorage") && !code.includes("typeof window")) {
      recommended.push(4);
      reasons.push("Hydration fixes needed for SSR safety");
    }

    return { recommended, reasons };
  }
}

export { LayerDependencyManager };
