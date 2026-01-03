import React, { useState, useEffect, useRef } from 'react';
import { TerminalLine } from '../types';

interface TerminalProps {
  lines: TerminalLine[];
  onCommand: (cmd: string) => void;
  isProcessing: boolean;
}

export const Terminal: React.FC<TerminalProps> = ({ lines, onCommand, isProcessing }) => {
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lines]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isProcessing) {
      if (input.trim()) {
        onCommand(input);
        setInput('');
      }
    }
  };

  const focusInput = () => {
    inputRef.current?.focus();
  };

  return (
    <div 
      className="h-full w-full bg-black border-2 border-[#33ff00] p-4 font-mono text-sm md:text-base overflow-hidden flex flex-col shadow-[0_0_20px_rgba(51,255,0,0.3)] relative"
      onClick={focusInput}
    >
      <div className="absolute top-0 left-0 bg-[#33ff00] text-black px-2 py-1 text-xs font-bold tracking-widest uppercase">
        TERM_V1.0 // ROOT
      </div>
      
      <div className="flex-1 overflow-y-auto mt-6 pb-2 space-y-1 custom-scrollbar">
        {lines.map((line) => (
          <div key={line.id} className={`${
            line.type === 'error' ? 'text-red-500' : 
            line.type === 'success' ? 'text-[#33ff00]' : 
            line.type === 'system' ? 'text-yellow-500' : 'text-[#33ff00]'
          } break-words whitespace-pre-wrap`}>
            {line.type === 'input' ? '> ' : ''}{line.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <div className="flex items-center text-[#33ff00] mt-2 border-t border-[#33ff00] pt-2">
        <span className="mr-2 animate-pulse">{'>'}</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isProcessing}
          className="flex-1 bg-transparent outline-none border-none text-[#33ff00] placeholder-green-900"
          placeholder={isProcessing ? "PROCESSING..." : "ENTER COMMAND"}
          autoFocus
        />
      </div>
    </div>
  );
};