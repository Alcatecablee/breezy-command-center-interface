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
  status: "idle" | "running" | "complete" | "error";
}

const NeuroLintDashboard: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [currentLayer, setCurrentLayer] = useState<number | null>(null);
  const [progress, setProgress] = useState(0);

  const layers: LayerInfo[] = [
    {
      id: 1,
      name: "Configuration",
      description: "TypeScript and build configuration optimization",
      status: "idle",
    },
    {
      id: 2,
      name: "Entity Cleanup",
      description: "Pattern fixes and code modernization",
      status: "idle",
    },
    {
      id: 3,
      name: "Components",
      description: "React and TypeScript specific improvements",
      status: "idle",
    },
    {
      id: 4,
      name: "Hydration",
      description: "SSR safety guards and runtime protection",
      status: "idle",
    },
    {
      id: 5,
      name: "Next.js",
      description: "App Router and framework optimizations",
      status: "idle",
    },
    {
      id: 6,
      name: "Testing",
      description: "Quality assurance and performance validation",
      status: "idle",
    },
  ];

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    setProgress(0);
    setCurrentLayer(null);

    // Simulate layer-by-layer analysis
    for (let i = 1; i <= 6; i++) {
      setCurrentLayer(i);
      setProgress(i * 16.67);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    setTimeout(() => {
      setResults({
        filesAnalyzed: 127,
        issuesFound: 23,
        layersUsed: [1, 2, 3, 4, 5, 6],
        timestamp: new Date().toISOString(),
        improvements: [
          "Fixed HTML entity encoding issues",
          "Added missing React key properties",
          "Implemented SSR safety guards",
          "Upgraded TypeScript configuration",
          "Optimized Next.js App Router usage",
          "Enhanced error boundary coverage",
        ],
        executionTime: 1847,
        cacheHitRate: 84,
      });
      setIsAnalyzing(false);
      setCurrentLayer(null);
      setProgress(100);
    }, 300);
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <header className="mb-16">
          <div className="flex items-center gap-3 mb-8">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F650a7e0d23ac407b922479927bc68a9d%2F1286c7bdebf845ef9bedd75d9d3ba4c3?format=webp&width=800"
              alt="NeuroLint"
              className="w-12 h-12"
            />
            <h1 className="text-2xl font-semibold text-white">NeuroLint</h1>
          </div>

          <div className="max-w-2xl">
            <h2 className="text-4xl font-bold text-white mb-4 leading-tight">
              Enterprise Code Analysis Platform
            </h2>
            <p className="text-lg text-gray-400 leading-relaxed">
              Advanced 6-layer orchestration system for TypeScript, React, and
              Next.js codebases. Built for teams that demand reliability,
              performance, and comprehensive error recovery.
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-4 gap-8 mt-12 pt-8 border-t border-gray-800">
            <div>
              <div className="text-2xl font-bold text-white">127+</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                Files Processed
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">99.7%</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                Success Rate
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">6</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                Analysis Layers
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">1.8s</div>
              <div className="text-sm text-gray-500 uppercase tracking-wide">
                Avg Response
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {/* Analysis Control */}
          <div className="lg:col-span-1 bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">
              Run Analysis
            </h3>

            {/* Progress */}
            {(isAnalyzing || progress > 0) && (
              <div className="mb-6">
                <div className="flex justify-between text-sm text-gray-400 mb-2">
                  <span>Processing layers</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-800 rounded-full h-1">
                  <div
                    className="h-1 bg-white rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                {currentLayer && (
                  <div className="text-sm text-gray-400 mt-2">
                    Layer {currentLayer}: {layers[currentLayer - 1]?.name}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="w-full bg-white hover:bg-gray-200 disabled:bg-gray-600 text-black font-medium py-3 px-4 rounded-md transition-colors"
              >
                {isAnalyzing ? "Analyzing..." : "Start Analysis"}
              </button>

              <div className="grid grid-cols-2 gap-3">
                <button className="border border-gray-700 hover:border-gray-600 text-gray-300 font-medium py-2 px-3 rounded-md transition-colors text-sm">
                  Quick Fix
                </button>
                <button className="border border-gray-700 hover:border-gray-600 text-gray-300 font-medium py-2 px-3 rounded-md transition-colors text-sm">
                  Configure
                </button>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-2 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-white mb-6">
              Analysis Results
            </h3>

            {results ? (
              <div className="space-y-6">
                {/* Summary Metrics */}
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gray-800 rounded-md">
                    <div className="text-2xl font-bold text-white">
                      {results.filesAnalyzed}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Files
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-800 rounded-md">
                    <div className="text-2xl font-bold text-white">
                      {results.issuesFound}
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Issues Fixed
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-800 rounded-md">
                    <div className="text-2xl font-bold text-white">
                      {results.executionTime}ms
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Duration
                    </div>
                  </div>
                  <div className="text-center p-4 bg-gray-800 rounded-md">
                    <div className="text-2xl font-bold text-white">
                      {results.cacheHitRate}%
                    </div>
                    <div className="text-xs text-gray-500 uppercase tracking-wide">
                      Cache Hit
                    </div>
                  </div>
                </div>

                {/* Improvements */}
                <div>
                  <h4 className="font-medium text-white mb-3">
                    Applied Improvements
                  </h4>
                  <div className="space-y-2">
                    {results.improvements.map((improvement, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 text-sm"
                      >
                        <div className="w-1.5 h-1.5 bg-white rounded-full mt-2 flex-shrink-0"></div>
                        <span className="text-gray-400">{improvement}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-gray-500 pt-4 border-t border-gray-800">
                  Completed {new Date(results.timestamp).toLocaleString()}
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-2">No results available</div>
                <div className="text-sm text-gray-500">
                  Run an analysis to see detailed results
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
            {layers.map((layer) => (
              <div
                key={layer.id}
                className={`border rounded-lg p-4 transition-all ${
                  currentLayer === layer.id
                    ? "border-white bg-gray-800"
                    : "border-gray-800 hover:border-gray-700"
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-white">{layer.name}</h3>
                    <div className="text-xs text-gray-500">
                      Layer {layer.id}
                    </div>
                  </div>
                  {currentLayer === layer.id && (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  )}
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {layer.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Enterprise Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div>
            <h3 className="font-semibold text-white mb-3">
              AST-First Analysis
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Advanced Abstract Syntax Tree parsing with intelligent regex
              fallback strategies for comprehensive code understanding.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-3">Error Recovery</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Enterprise-grade error handling with automatic rollback,
              comprehensive logging, and detailed recovery suggestions.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-3">
              Performance Optimization
            </h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Intelligent caching, parallel processing, and resource monitoring
              for optimal performance at scale.
            </p>
          </div>
        </div>

        {/* CLI Reference */}
        <div className="border border-gray-800 rounded-lg p-6">
          <h3 className="font-semibold text-white mb-4">
            Command Line Interface
          </h3>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="bg-gray-900 rounded-md p-3 font-mono text-sm">
                <div className="text-green-400">
                  $ neurolint init --layers=1,2,3,4
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Initialize with smart layer selection
                </div>
              </div>

              <div className="bg-gray-900 rounded-md p-3 font-mono text-sm">
                <div className="text-green-400">
                  $ neurolint analyze --recursive
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Comprehensive codebase analysis
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="bg-gray-900 rounded-md p-3 font-mono text-sm">
                <div className="text-green-400">$ neurolint fix --dry-run</div>
                <div className="text-gray-400 text-xs mt-1">
                  Preview changes before applying
                </div>
              </div>

              <div className="bg-gray-900 rounded-md p-3 font-mono text-sm">
                <div className="text-green-400">
                  $ neurolint test --comprehensive
                </div>
                <div className="text-gray-400 text-xs mt-1">
                  Run full orchestration test suite
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-800 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img
              src="https://cdn.builder.io/api/v1/image/assets%2F650a7e0d23ac407b922479927bc68a9d%2F1286c7bdebf845ef9bedd75d9d3ba4c3?format=webp&width=800"
              alt="NeuroLint"
              className="w-6 h-6"
            />
            <span className="font-medium text-white">NeuroLint Enterprise</span>
          </div>
          <p className="text-sm text-gray-500">
            Advanced code analysis • Enterprise reliability • Production ready
          </p>
        </footer>
      </div>
    </div>
  );
};

export default NeuroLintDashboard;
