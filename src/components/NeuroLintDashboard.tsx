
import React, { useState } from 'react'

interface AnalysisResult {
  filesAnalyzed: number
  issuesFound: number
  layersUsed: number[]
  timestamp: string
}

const NeuroLintDashboard: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<AnalysisResult | null>(null)

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    
    // Simulate analysis
    setTimeout(() => {
      setResults({
        filesAnalyzed: 42,
        issuesFound: 8,
        layersUsed: [1, 2, 3, 4],
        timestamp: new Date().toISOString()
      })
      setIsAnalyzing(false)
    }, 2000)
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          NeuroLint CLI Dashboard
        </h1>
        <p className="text-xl text-gray-600">
          Advanced rule-based code analysis and transformation tool
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Quick Actions</h2>
          
          <div className="space-y-4">
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Code'}
            </button>
            
            <button className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
              Fix Issues
            </button>
            
            <button className="w-full bg-gray-600 hover:bg-gray-700 text-white font-medium py-3 px-4 rounded-lg transition-colors">
              View Configuration
            </button>
          </div>
        </div>

        {/* Analysis Results */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-semibold mb-4">Latest Results</h2>
          
          {results ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{results.filesAnalyzed}</div>
                  <div className="text-sm text-gray-600">Files Analyzed</div>
                </div>
                
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{results.issuesFound}</div>
                  <div className="text-sm text-gray-600">Issues Found</div>
                </div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-gray-600 mb-2">Layers Used</div>
                <div className="flex flex-wrap gap-2">
                  {results.layersUsed.map(layer => (
                    <span key={layer} className="bg-green-200 text-green-800 px-2 py-1 rounded text-sm">
                      Layer {layer}
                    </span>
                  ))}
                </div>
              </div>
              
              <div className="text-xs text-gray-500">
                Last run: {new Date(results.timestamp).toLocaleString()}
              </div>
            </div>
          ) : (
            <div className="text-gray-500 text-center py-8">
              No analysis results yet. Click "Analyze Code" to get started.
            </div>
          )}
        </div>
      </div>

      {/* Feature Overview */}
      <div className="mt-12 bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-semibold mb-6">NeuroLint Features</h2>
        
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔍</span>
            </div>
            <h3 className="font-semibold mb-2">6-Layer Analysis</h3>
            <p className="text-gray-600 text-sm">Comprehensive code analysis with configurable layer selection</p>
          </div>
          
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🛠️</span>
            </div>
            <h3 className="font-semibold mb-2">Smart Fixes</h3>
            <p className="text-gray-600 text-sm">Automatic issue detection and safe code transformations</p>
          </div>
          
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏢</span>
            </div>
            <h3 className="font-semibold mb-2">Enterprise Ready</h3>
            <p className="text-gray-600 text-sm">Team collaboration, SSO, and compliance reporting</p>
          </div>
        </div>
      </div>

      {/* CLI Commands Reference */}
      <div className="mt-8 bg-gray-900 rounded-lg p-6 text-white">
        <h3 className="text-xl font-semibold mb-4">Quick CLI Reference</h3>
        <div className="grid md:grid-cols-2 gap-4 text-sm font-mono">
          <div>
            <div className="text-green-400">neurolint init</div>
            <div className="text-gray-400 mb-2">Initialize NeuroLint in project</div>
            
            <div className="text-green-400">neurolint analyze src/</div>
            <div className="text-gray-400 mb-2">Analyze code in src directory</div>
          </div>
          <div>
            <div className="text-green-400">neurolint fix --dry-run</div>
            <div className="text-gray-400 mb-2">Preview fixes without applying</div>
            
            <div className="text-green-400">neurolint status</div>
            <div className="text-gray-400 mb-2">Check project status</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default NeuroLintDashboard
