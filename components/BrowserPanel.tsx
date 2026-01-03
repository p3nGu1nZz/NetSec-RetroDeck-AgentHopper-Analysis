import React from 'react';
import { BrowserState } from '../types';

interface BrowserPanelProps {
  browserState: BrowserState;
  onNavigate: (url: string) => void;
  onClose: () => void;
  isLoading: boolean;
}

export const BrowserPanel: React.FC<BrowserPanelProps> = ({ browserState, onNavigate, onClose, isLoading }) => {
  const [urlInput, setUrlInput] = React.useState(browserState.url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate(urlInput);
  };

  return (
    <div className="h-full w-full bg-[#050510] border-2 border-cyan-400 flex flex-col shadow-[0_0_15px_rgba(34,211,238,0.3)]">
      {/* Address Bar */}
      <div className="bg-cyan-900/30 p-2 flex gap-2 border-b border-cyan-400">
        <span className="text-cyan-400 font-bold self-center">NET::WEB</span>
        <form onSubmit={handleSubmit} className="flex-1">
            <input 
                type="text" 
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full bg-black border border-cyan-600 text-cyan-300 px-2 py-1 font-mono text-sm focus:outline-none focus:border-cyan-300"
                placeholder="https://..."
            />
        </form>
        <button 
          onClick={onClose}
          className="text-cyan-400 hover:text-red-500 font-bold px-2"
        >
          [X]
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-auto p-4 font-mono text-sm leading-relaxed">
        {isLoading ? (
            <div className="text-cyan-500 animate-pulse text-center mt-10">
                CONNECTING TO NODE...<br/>
                HANDSHAKING...<br/>
                DOWNLOADING TEXT STREAM...
            </div>
        ) : (
            <>
                <div className="text-cyan-100 whitespace-pre-wrap">
                    {browserState.content || "NO SIGNAL. ENTER URL TO BEGIN."}
                </div>
            </>
        )}
      </div>

      {/* Status Bar */}
      <div className="bg-cyan-950 text-cyan-600 text-xs px-2 py-1 border-t border-cyan-800 flex justify-between">
         <span>MODE: TEXT_ONLY</span>
         <span>SECURE_PROXY: ACTIVE</span>
      </div>
    </div>
  );
};