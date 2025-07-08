
import React from 'react'
import Terminal from '../components/Terminal'

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900 text-green-400 font-mono">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Web CLI Interface</h1>
        <Terminal />
      </div>
    </div>
  )
}

export default Index
