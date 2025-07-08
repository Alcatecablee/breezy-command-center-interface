import React, { useState, useEffect } from "react";
import { useAuth } from "../lib/auth-context";
import { getAnalysisResults } from "../lib/supabase";
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import {
  getPayPalConfig,
  paypalPlans,
  createPayPalSubscription,
  formatPrice,
  getPriceForCurrency,
  detectUserCurrency,
  currencyLocaleMap,
} from "../lib/paypal";
import type { AnalysisResult } from "../lib/supabase";
import useNeuroLintOrchestration from "../hooks/useNeuroLintOrchestration";

interface CodeInputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (code: string, selectedLayers: number[]) => void;
  recommendedLayers: number[];
  detectedIssues: any[];
  isAnalyzing: boolean;
}

// Code Input Modal Component
const CodeInputModal: React.FC<CodeInputModalProps> = ({
  isOpen,
  onClose,
  onAnalyze,
  recommendedLayers,
  detectedIssues,
  isAnalyzing,
}) => {
  const [code, setCode] = useState("");
  const [selectedLayers, setSelectedLayers] = useState<number[]>([]);
  const [activeTab, setActiveTab] = useState<"input" | "analysis">("input");

  useEffect(() => {
    if (recommendedLayers.length > 0) {
      setSelectedLayers(recommendedLayers);
      setActiveTab("analysis");
    }
  }, [recommendedLayers]);

  const handleLayerToggle = (layerId: number) => {
    setSelectedLayers((prev) =>
      prev.includes(layerId)
        ? prev.filter((id) => id !== layerId)
        : [...prev, layerId].sort(),
    );
  };

  const handleAnalyze = () => {
    if (code.trim() && selectedLayers.length > 0) {
      onAnalyze(code, selectedLayers);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <h3 className="text-xl font-semibold text-white">
            NeuroLint Code Analysis
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="flex border-b border-gray-800">
          <button
            onClick={() => setActiveTab("input")}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === "input"
                ? "text-white border-b-2 border-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Code Input
          </button>
          <button
            onClick={() => setActiveTab("analysis")}
            className={`px-6 py-3 text-sm font-medium ${
              activeTab === "analysis"
                ? "text-white border-b-2 border-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Analysis & Layers
          </button>
        </div>

        <div className="p-6 max-h-[60vh] overflow-y-auto">
          {activeTab === "input" && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Paste your TypeScript/React code:
                </label>
                <textarea
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="// Paste your code here...&#10;function MyComponent() {&#10;  return <div>Hello World</div>;&#10;}"
                  className="w-full h-64 bg-gray-800 border border-gray-700 rounded-md p-3 text-white font-mono text-sm resize-none focus:outline-none focus:border-white"
                />
              </div>
              {code && (
                <div className="flex justify-end">
                  <button
                    onClick={() => setActiveTab("analysis")}
                    className="bg-white text-black px-4 py-2 rounded-md font-medium hover:bg-gray-200"
                  >
                    Analyze Code →
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === "analysis" && (
            <div className="space-y-6">
              {detectedIssues.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">
                    Detected Issues
                  </h4>
                  <div className="space-y-2">
                    {detectedIssues.map((issue, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded-md border ${
                          issue.severity === "high"
                            ? "bg-red-900/20 border-red-600/30 text-red-400"
                            : issue.severity === "medium"
                              ? "bg-yellow-900/20 border-yellow-600/30 text-yellow-400"
                              : "bg-blue-900/20 border-blue-600/30 text-blue-400"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="font-medium">
                              {issue.description}
                            </div>
                            <div className="text-sm opacity-75">
                              Fixed by Layer {issue.fixedByLayer}
                            </div>
                          </div>
                          <span className="text-xs uppercase px-2 py-1 rounded bg-black/20">
                            {issue.severity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-lg font-semibold text-white mb-3">
                  Select Layers to Execute
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((layerId) => {
                    const layerNames = {
                      1: "Configuration",
                      2: "Entity Cleanup",
                      3: "Components",
                      4: "Hydration",
                      5: "Next.js",
                      6: "Testing",
                    };

                    const isRecommended = recommendedLayers.includes(layerId);
                    const isSelected = selectedLayers.includes(layerId);

                    return (
                      <label
                        key={layerId}
                        className={`flex items-center p-3 rounded-md border cursor-pointer ${
                          isSelected
                            ? "bg-white/10 border-white"
                            : "bg-gray-800 border-gray-700 hover:border-gray-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleLayerToggle(layerId)}
                          className="mr-3"
                        />
                        <div>
                          <div className="text-white font-medium">
                            Layer {layerId}: {layerNames[layerId]}
                          </div>
                          {isRecommended && (
                            <div className="text-xs text-blue-400">
                              Recommended
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-800 flex justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleAnalyze}
            disabled={
              !code.trim() || selectedLayers.length === 0 || isAnalyzing
            }
            className="bg-white text-black px-6 py-2 rounded-md font-medium hover:bg-gray-200 disabled:bg-gray-600 disabled:text-gray-400"
          >
            {isAnalyzing ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>
      </div>
    </div>
  );
};

const EnhancedNeuroLintDashboard: React.FC = () => {
  const { user, profile, subscription, loading } = useAuth();
  const [results, setResults] = useState<AnalysisResult[]>([]);
  const [showBilling, setShowBilling] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [userCurrency, setUserCurrency] =
    useState<keyof typeof currencyLocaleMap>("USD");

  // Real orchestration hook
  const {
    isAnalyzing,
    analysisProgress,
    currentLayer,
    lastResult,
    detectedIssues,
    recommendedLayers,
    layers,
    serverOnline,
    error,
    warnings,
    analyzeCode,
    executeAnalysis,
    clearResults,
    clearError,
  } = useNeuroLintOrchestration();

  // Load analysis results and detect currency on component mount
  useEffect(() => {
    if (user) {
      loadAnalysisResults();
    }

    // Detect user's preferred currency
    const detectedCurrency = detectUserCurrency();
    setUserCurrency(detectedCurrency);
  }, [user]);

  // Update results when new analysis completes
  useEffect(() => {
    if (lastResult && lastResult.success) {
      loadAnalysisResults();
    }
  }, [lastResult]);

  const loadAnalysisResults = async () => {
    if (!user) return;

    const { data, error } = await getAnalysisResults(user.id, 5);
    if (data && !error) {
      setResults(data);
    }
  };

  const handleCodeAnalysis = async (code: string, selectedLayers: number[]) => {
    if (!user) return;

    try {
      // First analyze the code to get recommendations
      await analyzeCode(code);

      // Then execute the selected layers
      const result = await executeAnalysis(code, selectedLayers, {
        dryRun: false,
        useCache: true,
        skipUnnecessary: true,
      });

      if (result && result.success) {
        setShowCodeInput(false);
        console.log("✅ Analysis completed successfully");
      }
    } catch (error) {
      console.error("Analysis failed:", error);
    }
  };

  const handleQuickAnalysis = () => {
    if (!canRunAnalysis()) {
      setShowBilling(true);
      return;
    }
    setShowCodeInput(true);
  };

  // Check subscription limits
  const canRunAnalysis = () => {
    if (!user) return false;

    // For now, allow all authenticated users to run analysis
    // In production, you can enforce subscription limits here
    return true;
  };

  const getSubscriptionMessage = () => {
    if (!subscription) {
      return "Free tier - Limited analyses available";
    }
    if (subscription.status !== "active") {
      return "Please update your payment method to continue using NeuroLint";
    }
    return "";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading NeuroLint...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-2xl font-bold mb-4">
            Please sign in to access NeuroLint
          </h1>
          <p className="text-gray-400">
            Authentication required to use the platform
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Demo Mode Banner */}
      {!user && (
        <div className="bg-blue-600 text-white text-center py-2 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2">
            <span className="text-sm font-medium">🚀 Demo Mode Active</span>
            <span className="text-sm opacity-90">
              Experience full NeuroLint functionality without registration
            </span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header with User Info */}
        <header className="mb-16">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <img
                src="https://cdn.builder.io/api/v1/image/assets%2F650a7e0d23ac407b922479927bc68a9d%2F1286c7bdebf845ef9bedd75d9d3ba4c3?format=webp&width=800"
                alt="NeuroLint"
                className="w-12 h-12"
              />
              <h1 className="text-2xl font-semibold text-white">NeuroLint</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-white font-medium">{user.email}</div>
                <div className="text-gray-400 text-sm">
                  {subscription
                    ? `${subscription.plan_name} Plan`
                    : "Free Tier"}
                </div>
              </div>
              <button
                onClick={() => setShowBilling(!showBilling)}
                className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
              >
                {subscription ? "Manage Billing" : "Upgrade"}
              </button>
            </div>
          </div>

          <div className="max-w-2xl">
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Welcome to NeuroLint{" "}
              {user ? `back, ${profile?.company || "Developer"}` : "Demo"}
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              {user
                ? "Global enterprise code analysis platform with PayPal billing support worldwide. Advanced 6-layer orchestration for TypeScript, React, and Next.js codebases."
                : "Experience the power of advanced 6-layer code analysis and transformation for TypeScript, React, and Next.js. Try the full functionality in demo mode!"}
            </p>
          </div>

          {/* Subscription Status */}
          {!canRunAnalysis() && (
            <div className="mt-8 p-4 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
              <div className="text-yellow-400 font-medium">
                {getSubscriptionMessage()}
              </div>
            </div>
          )}
        </header>

        {/* Global Billing Section */}
        {showBilling && (
          <div className="mb-16 bg-gray-900 border border-gray-800 rounded-lg p-8">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-white">
                Choose Your Plan - Global Pricing
              </h3>

              {/* Currency Selector */}
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-sm">Currency:</span>
                <select
                  value={userCurrency}
                  onChange={(e) =>
                    setUserCurrency(
                      e.target.value as keyof typeof currencyLocaleMap,
                    )
                  }
                  className="bg-gray-800 border border-gray-700 rounded px-3 py-1 text-white text-sm"
                >
                  <option value="USD">🇺🇸 USD ($)</option>
                  <option value="EUR">🇪🇺 EUR (€)</option>
                  <option value="GBP">🇬🇧 GBP (£)</option>
                  <option value="ZAR">🇿🇦 ZAR (R)</option>
                  <option value="AUD">🇦🇺 AUD (AU$)</option>
                  <option value="CAD">🇨🇦 CAD (CA$)</option>
                  <option value="JPY">🇯🇵 JPY (¥)</option>
                  <option value="INR">🇮🇳 INR (₹)</option>
                </select>
              </div>
            </div>

            <div className="mb-4 text-center">
              <div className="text-blue-400 text-sm">
                💳 Powered by PayPal - Available worldwide with local currency
                support
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {paypalPlans.map((plan) => {
                const price = getPriceForCurrency(plan, userCurrency);
                return (
                  <div
                    key={plan.id}
                    className={`border rounded-lg p-6 ${
                      plan.popular
                        ? "border-white bg-gray-800"
                        : "border-gray-700"
                    }`}
                  >
                    {plan.popular && (
                      <div className="text-center mb-4">
                        <span className="bg-white text-black px-3 py-1 rounded-full text-sm font-medium">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="text-center mb-6">
                      <h4 className="text-xl font-bold text-white mb-2">
                        {plan.name}
                      </h4>
                      <div className="text-3xl font-bold text-white mb-1">
                        {formatPrice(price, userCurrency)}
                      </div>
                      <div className="text-gray-400 text-sm">
                        per {plan.interval}
                      </div>
                    </div>

                    <ul className="space-y-2 mb-6">
                      {plan.features.map((feature, index) => (
                        <li
                          key={index}
                          className="flex items-start gap-2 text-sm text-gray-300"
                        >
                          <div className="w-1.5 h-1.5 bg-white rounded-full mt-2 flex-shrink-0"></div>
                          {feature}
                        </li>
                      ))}
                    </ul>

                    <PayPalScriptProvider
                      options={getPayPalConfig(
                        userCurrency,
                        currencyLocaleMap[userCurrency],
                      )}
                    >
                      <PayPalButtons
                        createSubscription={async (data, actions) => {
                          const { subscription } =
                            await createPayPalSubscription(plan.id, user.id);
                          return actions.subscription.create({
                            plan_id: plan.id,
                            custom_id: subscription.id,
                          });
                        }}
                        onApprove={async (data, actions) => {
                          console.log("PayPal subscription approved:", data);
                          await loadAnalysisResults(); // Refresh data
                          setShowBilling(false);
                        }}
                        onError={(err) => {
                          console.error("PayPal error:", err);
                        }}
                        style={{
                          layout: "vertical",
                          color: "black",
                          shape: "rect",
                          label: "subscribe",
                        }}
                      />
                    </PayPalScriptProvider>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Analysis Control */}
          <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Run Analysis</h3>
              <div className="flex items-center gap-2">
                <div
                  className={`w-2 h-2 rounded-full ${serverOnline ? "bg-green-400" : "bg-red-400"}`}
                ></div>
                <span className="text-xs text-gray-400">
                  {serverOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-4 p-3 bg-red-900/20 border border-red-600/30 rounded-md">
                <div className="flex justify-between items-start">
                  <div className="text-red-400 text-sm">{error}</div>
                  <button
                    onClick={clearError}
                    className="text-red-400 hover:text-red-300 ml-2"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}

            {/* Warnings Display */}
            {warnings.length > 0 && (
              <div className="mb-4 p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-md">
                {warnings.map((warning, index) => (
                  <div key={index} className="text-yellow-400 text-sm">
                    {warning}
                  </div>
                ))}
              </div>
            )}

            {/* Progress */}
            {isAnalyzing && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Processing layers</span>
                  <span>{Math.round(analysisProgress)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1">
                  <div
                    className="h-1 bg-white rounded-full transition-all duration-300"
                    style={{ width: `${analysisProgress}%` }}
                  ></div>
                </div>
                {currentLayer && (
                  <div className="text-sm text-gray-400 mt-2">
                    Layer {currentLayer}:{" "}
                    {layers.find((l) => l.id === currentLayer)?.name}
                  </div>
                )}
              </div>
            )}

            {/* Last Result Summary */}
            {lastResult && !isAnalyzing && (
              <div className="mb-6 p-4 bg-gray-800 rounded-lg">
                <div className="text-sm text-gray-400 mb-2">Last Analysis:</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-white">
                    {lastResult.summary.totalChanges} changes
                  </div>
                  <div className="text-white">
                    {lastResult.summary.successfulLayers}/
                    {lastResult.summary.totalLayers} layers
                  </div>
                  <div className="text-gray-400">
                    {lastResult.summary.totalExecutionTime}ms
                  </div>
                  <div className="text-gray-400">
                    {lastResult.summary.cacheHitRate.toFixed(0)}% cached
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleQuickAnalysis}
                disabled={isAnalyzing || !canRunAnalysis()}
                className="w-full bg-white hover:bg-gray-200 disabled:bg-gray-600 text-black font-medium py-3 px-4 rounded-md transition-colors"
              >
                {isAnalyzing ? "Analyzing..." : "Analyze Code"}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowCodeInput(true)}
                  disabled={!canRunAnalysis()}
                  className="border border-gray-700 hover:border-gray-600 disabled:border-gray-800 text-gray-300 disabled:text-gray-600 font-medium py-2 px-3 rounded-md transition-colors text-sm"
                >
                  Quick Fix
                </button>
                <button
                  onClick={clearResults}
                  className="border border-gray-700 hover:border-gray-600 text-gray-300 font-medium py-2 px-3 rounded-md transition-colors text-sm"
                >
                  Clear Results
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">
              Recent Analysis Results
            </h3>

            {results.length > 0 ? (
              <div className="space-y-4">
                {results.map((result) => (
                  <div key={result.id} className="bg-gray-800 rounded-lg p-4">
                    <div className="grid grid-cols-4 gap-4 mb-4">
                      <div className="text-center">
                        <div className="text-xl font-bold text-white">
                          {result.files_analyzed}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          Files
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-white">
                          {result.issues_fixed}
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          Fixed
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-white">
                          {result.execution_time}ms
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          Duration
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-xl font-bold text-white">
                          {result.cache_hit_rate}%
                        </div>
                        <div className="text-xs text-gray-500 uppercase tracking-wide">
                          Cache Hit
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-gray-500">
                      {new Date(result.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">
                  No analysis results yet
                </div>
                <div className="text-sm text-gray-500">
                  Run your first analysis to see results here
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Layer Architecture */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-white mb-8">
            6-Layer Architecture
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {layers.map((layer) => {
              const isActive = currentLayer === layer.id;
              const wasExecuted = lastResult?.results.find(
                (r) => r.layerId === layer.id,
              );
              const isRecommended = recommendedLayers.includes(layer.id);

              return (
                <div
                  key={layer.id}
                  className={`border rounded-lg p-4 transition-all ${
                    isActive
                      ? "border-white bg-gray-800"
                      : wasExecuted?.success
                        ? "border-green-600 bg-green-900/20"
                        : wasExecuted && !wasExecuted.success
                          ? "border-red-600 bg-red-900/20"
                          : isRecommended
                            ? "border-blue-600 bg-blue-900/20"
                            : "border-gray-800 hover:border-gray-700"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-white">{layer.name}</h3>
                      <div className="text-xs text-gray-500">
                        Layer {layer.id}
                        {isRecommended && (
                          <span className="text-blue-400 ml-2">
                            • Recommended
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                      )}
                      {wasExecuted?.success && (
                        <div className="text-green-400 text-sm">✓</div>
                      )}
                      {wasExecuted && !wasExecuted.success && (
                        <div className="text-red-400 text-sm">✗</div>
                      )}
                    </div>
                  </div>
                  <p className="text-sm text-gray-400 leading-relaxed mb-2">
                    {layer.description}
                  </p>
                  {wasExecuted && (
                    <div className="text-xs text-gray-500">
                      {wasExecuted.success
                        ? `${wasExecuted.changeCount} changes in ${wasExecuted.executionTime.toFixed(0)}ms`
                        : `Failed: ${wasExecuted.error}`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Code Input Modal */}
        <CodeInputModal
          isOpen={showCodeInput}
          onClose={() => setShowCodeInput(false)}
          onAnalyze={handleCodeAnalysis}
          recommendedLayers={recommendedLayers}
          detectedIssues={detectedIssues}
          isAnalyzing={isAnalyzing}
        />
      </div>
    </div>
  );
};

export default EnhancedNeuroLintDashboard;
