import React from 'react';
import { FileSystemNode } from '../types';

interface FileViewerProps {
  activeFile: FileSystemNode | null;
  onClose: () => void;
}

export const FileViewer: React.FC<FileViewerProps> = ({ activeFile, onClose }) => {
  if (!activeFile) return null;

  return (
    <div className="h-full w-full bg-[#0a0a0a] border-2 border-amber-500 flex flex-col shadow-[0_0_15px_rgba(245,158,11,0.3)]">
      <div className="bg-amber-500 text-black px-2 py-1 flex justify-between items-center">
        <span className="font-bold font-mono truncate">{activeFile.name.toUpperCase()}</span>
        <button 
          onClick={onClose}
          className="hover:bg-black hover:text-amber-500 px-2 font-bold transition-colors"
        >
          [X]
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 text-amber-500 font-mono whitespace-pre-wrap text-sm leading-relaxed">
        {activeFile.content}
      </div>
    </div>
  );
};