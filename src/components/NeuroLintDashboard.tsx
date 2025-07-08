import React, { useState, useEffect } from "react";

interface AnalysisResult {
  filesAnalyzed: number;
  issuesFound: number;
  layersUsed: number[];
  timestamp: string;
  improvements: string[];
  executionTime: number;
  cacheHitRate: number;
}

interface LayerInfo {
  id: number;
  name: string;
  description: string;
  icon: string;
  status: "idle" | "running" | "complete" | "error";
}

const NeuroLintDashboard: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [currentLayer, setCurrentLayer] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);
  const [animatedCount, setAnimatedCount] = useState(0);

  const layers: LayerInfo[] = [
    {
      id: 1,
      name: "Configuration",
      description: "Foundation setup & optimization",
      icon: "⚙️",
      status: "idle",
    },
    {
      id: 2,
      name: "Entity Cleanup",
      description: "Pattern fixes & modernization",
      icon: "🧹",
      status: "idle",
    },
    {
      id: 3,
      name: "Components",
      description: "React/TS specific improvements",
      icon: "⚛️",
      status: "idle",
    },
    {
      id: 4,
      name: "Hydration",
      description: "SSR safety & runtime guards",
      icon: "💧",
      status: "idle",
    },
    {
      id: 5,
      name: "Next.js",
      description: "App Router optimizations",
      icon: "▲",
      status: "idle",
    },
    {
      id: 6,
      name: "Testing",
      description: "Quality & performance checks",
      icon: "🧪",
      status: "idle",
    },
  ];

  // Animate numbers
  useEffect(() => {
    if (results && animatedCount < results.filesAnalyzed) {
      const timer = setTimeout(() => {
        setAnimatedCount((prev) => Math.min(prev + 1, results.filesAnalyzed));
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [results, animatedCount]);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setProgress(0);
    setCurrentLayer(null);
    setAnimatedCount(0);

    // Simulate layer-by-layer analysis
    for (let i = 1; i <= 6; i++) {
      setCurrentLayer(i);
      setProgress(i * 16.67); // 100/6 layers

      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    // Final results
    setTimeout(() => {
      setResults({
        filesAnalyzed: 42,
        issuesFound: 8,
        layersUsed: [1, 2, 3, 4, 5, 6],
        timestamp: new Date().toISOString(),
        improvements: [
          "Fixed HTML entity quotes",
          "Added missing key props",
          "Added SSR safety guards",
          "Upgraded TypeScript target",
          "Optimized Next.js configuration",
        ],
        executionTime: 1247,
        cacheHitRate: 78,
      });
      setIsAnalyzing(false);
      setCurrentLayer(null);
      setProgress(100);
    }, 500);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-green-500/5 rounded-full blur-3xl animate-pulse delay-2000"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Hero Header */}
        <header className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl mb-8 animate-bounce">
            <span className="text-3xl">🐝</span>
          </div>

          <h1 className="text-6xl font-black text-white mb-6 tracking-tight">
            <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
              NeuroLint
            </span>
          </h1>

          <p className="text-2xl text-gray-300 mb-4 font-light">
            Advanced rule-based code analysis and transformation
          </p>

          <p className="text-lg text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Intelligent 6-layer orchestration system with AST parsing, smart
            fallbacks, and enterprise-grade error recovery. Transform your
            codebase with confidence.
          </p>

          {/* Stats Bar */}
          <div className="flex justify-center gap-8 mt-12 text-center">
            <div className="text-white">
              <div className="text-3xl font-bold text-blue-400">
                {animatedCount || "42"}
              </div>
              <div className="text-sm text-gray-400">Files Processed</div>
            </div>
            <div className="text-white">
              <div className="text-3xl font-bold text-green-400">98%</div>
              <div className="text-sm text-gray-400">Success Rate</div>
            </div>
            <div className="text-white">
              <div className="text-3xl font-bold text-purple-400">6</div>
              <div className="text-sm text-gray-400">Smart Layers</div>
            </div>
            <div className="text-white">
              <div className="text-3xl font-bold text-yellow-400">⚡</div>
              <div className="text-sm text-gray-400">Lightning Fast</div>
            </div>
          </div>
        </header>

        {/* Main Action Section */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          {/* Control Panel */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
              <span className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                🚀
              </span>
              Launch Analysis
            </h2>

            {/* Progress Bar */}
            {(isAnalyzing || progress > 0) && (
              <div className="mb-8">
                <div className="flex justify-between text-sm text-gray-300 mb-2">
                  <span>Processing Layers</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-green-500 transition-all duration-300 ease-out"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                {currentLayer && (
                  <div className="text-sm text-blue-400 mt-2 flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    Running Layer {currentLayer}:{" "}
                    {layers[currentLayer - 1]?.name}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-bold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 disabled:scale-100 shadow-2xl disabled:shadow-none flex items-center justify-center gap-3"
              >
                {isAnalyzing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Analyzing Code...
                  </>
                ) : (
                  <>
                    <span className="text-xl">🔍</span>
                    Analyze & Transform
                  </>
                )}
              </button>

              <div className="grid grid-cols-2 gap-4">
                <button className="bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 font-semibold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2">
                  <span>🛠️</span>
                  Quick Fix
                </button>

                <button className="bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/30 text-gray-300 font-semibold py-3 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2">
                  <span>⚙️</span>
                  Configure
                </button>
              </div>
            </div>
          </div>

          {/* Results Panel */}
          <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
            <h2 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
              <span className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
                📊
              </span>
              Analysis Results
            </h2>

            {results ? (
              <div className="space-y-6">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-xl">
                    <div className="text-3xl font-bold text-blue-400">
                      {animatedCount}
                    </div>
                    <div className="text-sm text-gray-400">Files Analyzed</div>
                  </div>

                  <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl">
                    <div className="text-3xl font-bold text-red-400">
                      {results.issuesFound}
                    </div>
                    <div className="text-sm text-gray-400">Issues Fixed</div>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-purple-500/10 border border-purple-500/20 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-purple-400">
                      {results.executionTime}ms
                    </div>
                    <div className="text-sm text-gray-400">Execution Time</div>
                  </div>

                  <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl">
                    <div className="text-2xl font-bold text-green-400">
                      {results.cacheHitRate}%
                    </div>
                    <div className="text-sm text-gray-400">Cache Hit Rate</div>
                  </div>
                </div>

                {/* Improvements */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">
                    Improvements Applied
                  </h4>
                  <div className="space-y-2">
                    {results.improvements.map((improvement, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-3 text-gray-300"
                      >
                        <span className="text-green-400">✓</span>
                        <span className="text-sm">{improvement}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-gray-500 pt-4 border-t border-gray-700">
                  Last run: {new Date(results.timestamp).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl text-gray-500">📈</span>
                </div>
                <div className="text-gray-400">
                  No analysis results yet. Click "Analyze & Transform" to get
                  started.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 6-Layer Architecture */}
        <div className="mb-16">
          <h2 className="text-4xl font-bold text-white text-center mb-12">
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              6-Layer Intelligence Engine
            </span>
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {layers.map((layer, index) => (
              <div
                key={layer.id}
                className={`bg-gray-800/50 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 transition-all duration-500 hover:border-blue-500/50 hover:bg-gray-800/70 ${
                  currentLayer === layer.id
                    ? "ring-2 ring-blue-500 bg-blue-500/10"
                    : ""
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex items-center gap-4 mb-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${
                      currentLayer === layer.id
                        ? "bg-blue-500 animate-pulse"
                        : "bg-gradient-to-br from-gray-700 to-gray-800"
                    }`}
                  >
                    {layer.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">
                      {layer.name}
                    </h3>
                    <div className="text-sm text-blue-400">
                      Layer {layer.id}
                    </div>
                  </div>
                </div>

                <p className="text-gray-400 text-sm leading-relaxed">
                  {layer.description}
                </p>

                {currentLayer === layer.id && (
                  <div className="mt-3 flex items-center gap-2 text-blue-400 text-sm">
                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                    Processing...
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="text-center group">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-3xl">🧠</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              AI-Powered Analysis
            </h3>
            <p className="text-gray-400 leading-relaxed">
              Advanced AST parsing with intelligent fallback strategies and
              smart layer selection
            </p>
          </div>

          <div className="text-center group">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-3xl">🛡️</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Enterprise Security
            </h3>
            <p className="text-gray-400 leading-relaxed">
              Comprehensive error recovery, rollback capabilities, and audit
              logging for compliance
            </p>
          </div>

          <div className="text-center group">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
              <span className="text-3xl">⚡</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-3">
              Lightning Performance
            </h3>
            <p className="text-gray-400 leading-relaxed">
              Intelligent caching, parallel processing, and resource
              optimization for massive codebases
            </p>
          </div>
        </div>

        {/* CLI Reference */}
        <div className="bg-black/50 backdrop-blur-xl rounded-3xl p-8 border border-gray-700/50">
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="w-8 h-8 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center">
              💻
            </span>
            Quick CLI Reference
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <code className="text-green-400 block mb-1">
                  neurolint init --layers 1,2,3,4
                </code>
                <div className="text-gray-400 text-sm">
                  Initialize with smart layer selection
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <code className="text-green-400 block mb-1">
                  neurolint analyze --smart --cache
                </code>
                <div className="text-gray-400 text-sm">
                  Intelligent analysis with performance optimization
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <code className="text-green-400 block mb-1">
                  neurolint fix --dry-run --recovery
                </code>
                <div className="text-gray-400 text-sm">
                  Safe fixes with error recovery
                </div>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                <code className="text-green-400 block mb-1">
                  neurolint test --comprehensive
                </code>
                <div className="text-gray-400 text-sm">
                  Run full orchestration test suite
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center mt-16 text-gray-500">
          <div className="flex justify-center items-center gap-4 mb-4">
            <span className="text-2xl">🐝</span>
            <span className="text-lg font-semibold">NeuroLint Enterprise</span>
          </div>
          <p className="text-sm">
            Advanced rule-based code analysis • Enterprise-grade reliability •
            Lightning performance
          </p>
        </footer>
      </div>
    </div>
  );
};

export default NeuroLintDashboard;
