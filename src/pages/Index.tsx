
import React from 'react'
import Terminal from '../components/Terminal'

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-green-400 font-mono">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-8 text-center">
          NeuroLint CLI Dashboard
        </h1>
        <Terminal className="max-w-4xl mx-auto" />
        
        <div className="mt-8 text-center text-gray-400">
          <p className="mb-2">Advanced rule-based code analysis and transformation</p>
          <p className="text-sm">
            Built with React, TypeScript, and Vite | Version 1.0.0
          </p>
        </div>
      </div>
    </div>
  )
}

export default Index
