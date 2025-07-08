
import React, { useState, useEffect, useRef } from 'react'

interface Command {
  input: string
  output: string[]
  timestamp: Date
}

const Terminal: React.FC = () => {
  const [input, setInput] = useState('')
  const [history, setHistory] = useState<Command[]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Focus input on mount
    if (inputRef.current) {
      inputRef.current.focus()
    }

    // Welcome message
    setHistory([{
      input: '',
      output: [
        'Welcome to Web CLI Interface',
        'Type "help" for available commands',
        ''
      ],
      timestamp: new Date()
    }])
  }, [])

  const executeCommand = (command: string) => {
    const cmd = command.trim().toLowerCase()
    let output: string[] = []

    switch (cmd) {
      case 'help':
        output = [
          'Available commands:',
          '  help    - Show this help message',
          '  clear   - Clear the terminal',
          '  echo    - Echo back the input',
          '  date    - Show current date and time',
          '  ls      - List directory contents',
          ''
        ]
        break
      case 'clear':
        setHistory([])
        setInput('')
        return
      case 'date':
        output = [new Date().toString()]
        break
      case 'ls':
        output = [
          'drwxr-xr-x  2 user user 4096 Jan  1 12:00 documents',
          'drwxr-xr-x  2 user user 4096 Jan  1 12:00 downloads',
          '-rw-r--r--  1 user user 1024 Jan  1 12:00 readme.txt',
          ''
        ]
        break
      default:
        if (cmd.startsWith('echo ')) {
          output = [command.substring(5)]
        } else if (cmd === '') {
          output = ['']
        } else {
          output = [`Command not found: ${cmd}`, 'Type "help" for available commands']
        }
    }

    const newCommand: Command = {
      input: command,
      output,
      timestamp: new Date()
    }

    setHistory(prev => [...prev, newCommand])
    setInput('')
    setHistoryIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      executeCommand(input)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1
        setHistoryIndex(newIndex)
        setInput(history[history.length - 1 - newIndex]?.input || '')
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1
        setHistoryIndex(newIndex)
        setInput(history[history.length - 1 - newIndex]?.input || '')
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setInput('')
      }
    }
  }

  return (
    <div className="bg-black border border-gray-700 rounded-lg p-4 max-w-4xl mx-auto">
      <div className="mb-4">
        <div className="flex items-center space-x-2 mb-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-gray-400 text-sm ml-2">Terminal</span>
        </div>
      </div>
      
      <div className="h-96 overflow-y-auto mb-4 text-sm">
        {history.map((cmd, index) => (
          <div key={index} className="mb-2">
            {cmd.input && (
              <div className="flex">
                <span className="text-green-400">user@terminal:~$ </span>
                <span className="text-white">{cmd.input}</span>
              </div>
            )}
            {cmd.output.map((line, lineIndex) => (
              <div key={lineIndex} className="text-gray-300 whitespace-pre-wrap">
                {line}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      <div className="flex items-center">
        <span className="text-green-400 mr-2">user@terminal:~$ </span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-white outline-none"
          placeholder="Type a command..."
        />
      </div>
    </div>
  )
}

export default Terminal
