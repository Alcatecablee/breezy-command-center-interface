
import React, { useState, useEffect, useRef } from 'react';

interface TerminalProps {
  className?: string;
}

const Terminal: React.FC<TerminalProps> = ({ className }) => {
  const [output, setOutput] = useState<string[]>([
    'NeuroLint CLI Dashboard v1.0.0',
    'Type "help" for available commands',
    ''
  ]);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleCommand = (command: string) => {
    const newOutput = [...output, `$ ${command}`];
    
    switch (command.toLowerCase().trim()) {
      case 'help':
        newOutput.push(
          'Available commands:',
          '  help     - Show this help message',
          '  clear    - Clear the terminal',
          '  status   - Show system status',
          '  analyze  - Run code analysis',
          '  config   - Show configuration',
          ''
        );
        break;
      case 'clear':
        setOutput([]);
        return;
      case 'status':
        newOutput.push(
          'System Status:',
          '  API Server: Running',
          '  Analysis Engine: Ready',
          '  Configuration: Loaded',
          ''
        );
        break;
      case 'analyze':
        newOutput.push(
          'Running code analysis...',
          'Analysis complete. No issues found.',
          ''
        );
        break;
      case 'config':
        newOutput.push(
          'Configuration:',
          '  API URL: http://localhost:5000',
          '  Enabled Layers: 1,2,3,4',
          '  Auto-fix: Disabled',
          ''
        );
        break;
      default:
        newOutput.push(`Command not found: ${command}`, 'Type "help" for available commands', '');
    }
    
    setOutput(newOutput);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim()) {
      setHistory([...history, input]);
      setHistoryIndex(-1);
      handleCommand(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[history.length - 1 - newIndex]);
      } else if (historyIndex === 0) {
        setHistoryIndex(-1);
        setInput('');
      }
    }
  };

  return (
    <div className={`bg-gray-900 text-green-400 p-4 rounded-lg font-mono ${className}`}>
      <div className="h-96 overflow-y-auto mb-4 border border-gray-700 p-4 rounded">
        <div className="whitespace-pre-wrap">
          {output.map((line, index) => (
            <div key={index} className="mb-1">
              {line}
            </div>
          ))}
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="flex items-center">
        <span className="text-green-400 mr-2">$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent border-none outline-none text-green-400"
          placeholder="Enter command..."
        />
      </form>
    </div>
  );
};

export default Terminal;
