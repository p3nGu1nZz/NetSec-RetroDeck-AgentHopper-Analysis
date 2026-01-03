import React, { useState, useEffect, useRef } from 'react';
import { TerminalLine, FileSystemNode } from '../types';

interface TerminalProps {
  lines: TerminalLine[];
  onCommand: (cmd: string) => void;
  isProcessing: boolean;
  availableCommands?: string[];
  currentPath?: string;
  fileSystem?: FileSystemNode[];
}

const resolveNodes = (root: FileSystemNode[], currentPath: string, relativeDir: string): FileSystemNode[] => {
    // 1. Construct absolute path tokens
    let tokens: string[] = [];
    
    if (relativeDir.startsWith('/')) {
        tokens = relativeDir.split('/').filter(Boolean);
    } else {
        const base = currentPath === '/' ? [] : currentPath.split('/').filter(Boolean);
        const rel = relativeDir.split('/').filter(Boolean);
        
        // rudimentary path resolution
        const combined = relativeDir === '' ? base : [...base, ...rel];
        
        for (const t of combined) {
            if (t === '..') { if (tokens.length > 0) tokens.pop(); }
            else if (t === '.') { /* no-op */ }
            else { tokens.push(t); }
        }
    }

    // 2. Traverse
    let current = root;
    for (const token of tokens) {
        const found = current.find(n => n.name === token && n.type === 'directory');
        if (!found || !found.children) return []; // Path doesn't exist
        current = found.children;
    }
    
    return current;
};

export const Terminal: React.FC<TerminalProps> = ({ 
  lines, 
  onCommand, 
  isProcessing,
  availableCommands = [
    'help', 'ls', 'cat', 'analyze', 'research', 'export', 
    'load', 'clear', 'status', 'setkey', 'cd', 'mkdir', 
    'find', 'run', 'browse', 'scan', 'about', 'version'
  ],
  currentPath = '/',
  fileSystem = []
}) => {
  const [input, setInput] = useState('');
  const [ghostText, setGhostText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInput(val);

    if (!val || isProcessing) {
        setGhostText('');
        return;
    }

    // Split input into command and arguments
    const parts = val.split(' ');
    
    // Command Autocomplete (First word)
    if (parts.length === 1) {
        const cmd = parts[0].toLowerCase();
        const match = availableCommands.find(c => c.startsWith(cmd));
        if (match && cmd.length < match.length) {
            setGhostText(match.slice(cmd.length));
        } else {
            setGhostText('');
        }
        return;
    }

    // File/Dir Autocomplete (Last word)
    const partialPath = parts[parts.length - 1];
    
    // Determine directory to search and prefix to match
    let dirToSearch = '';
    let matchPrefix = partialPath;
    
    if (partialPath.includes('/')) {
        const lastSlash = partialPath.lastIndexOf('/');
        dirToSearch = partialPath.slice(0, lastSlash);
        matchPrefix = partialPath.slice(lastSlash + 1);
    }

    // Get candidate nodes in the target directory
    const siblings = resolveNodes(fileSystem, currentPath, dirToSearch);
    
    // Find a match that starts with the prefix
    const match = siblings.find(n => n.name.startsWith(matchPrefix));
    
    if (match) {
        let suffix = match.name.slice(matchPrefix.length);
        if (match.type === 'directory') suffix += '/';
        setGhostText(suffix);
    } else {
        setGhostText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      if (ghostText) {
        setInput(input + ghostText);
        setGhostText('');
      }
    } else if (e.key === 'Enter' && !isProcessing) {
      if (input.trim()) {
        onCommand(input);
        setInput('');
        setGhostText('');
      }
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div 
      className="h-full w-full bg-black border-2 border-[#33ff00] p-4 font-mono text-sm md:text-base overflow-hidden flex flex-col shadow-[0_0_20px_rgba(51,255,0,0.3)] relative group"
      onClick={focusInput}
    >
      <style>
        {`
          @keyframes textFlicker {
            0% { opacity: 0.95; text-shadow: 0 0 2px rgba(51, 255, 0, 0.5); }
            50% { opacity: 0.8; text-shadow: 0 0 4px rgba(51, 255, 0, 0.3); }
            100% { opacity: 0.95; text-shadow: 0 0 2px rgba(51, 255, 0, 0.5); }
          }
          .retro-line {
            animation: textFlicker 3s infinite alternate;
          }
        `}
      </style>

      <div className="absolute top-0 left-0 bg-[#33ff00] text-black px-2 py-1 text-xs font-bold tracking-widest uppercase z-20">
        TERM_V1.1 // {currentPath === '/' ? 'ROOT' : currentPath}
      </div>
      
      <div className="flex-1 overflow-y-auto mt-6 pb-2 space-y-1 custom-scrollbar z-10">
        {lines.map((line) => (
          <div key={line.id} className={`${
            line.type === 'error' ? 'text-red-500' : 
            line.type === 'success' ? 'text-[#33ff00]' : 
            line.type === 'system' ? 'text-yellow-500' : 'text-[#33ff00]'
          } break-words whitespace-pre-wrap retro-line`}>
            {line.type === 'input' ? <span className="opacity-70 mr-2">{'>'}</span> : ''}{line.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex items-center text-[#33ff00] mt-2 border-t border-[#33ff00] pt-2 relative">
        <span className="mr-2 animate-pulse font-bold">{currentPath} {'>'}</span>
        
        <div className="relative flex-1">
          {/* Input Element */}
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isProcessing}
            className="w-full bg-transparent outline-none border-none text-[#33ff00] placeholder-green-900 z-10 relative retro-line"
            placeholder={isProcessing ? "PROCESSING..." : ""}
            autoFocus
            autoComplete="off"
            spellCheck="false"
          />
          
          {/* Ghost Text Overlay - positioned absolutely to match input text flow */}
          {!isProcessing && ghostText && (
            <div className="absolute top-0 left-0 pointer-events-none flex whitespace-pre font-inherit overflow-hidden w-full h-full">
               {/* Invisible span to push ghost text to correct position */}
               <span className="opacity-0">{input}</span>
               <span className="opacity-40 retro-line">{ghostText}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};