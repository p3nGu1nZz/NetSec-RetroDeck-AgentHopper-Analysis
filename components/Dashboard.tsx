import React from 'react';
import { AppState, FileSystemNode } from '../types';

interface DashboardProps {
  appState: AppState;
  files: FileSystemNode[];
}

const FileTreeNode: React.FC<{ node: FileSystemNode; depth: number }> = ({ node, depth }) => {
  return (
    <div className="font-mono text-sm leading-tight">
      <div style={{ paddingLeft: `${depth * 12}px` }} className={`py-1 ${node.type === 'directory' ? 'text-amber-500 font-bold' : 'text-cyan-300'}`}>
        {node.type === 'directory' ? `[+] ${node.name}` : `> ${node.name}`}
      </div>
      {node.children && node.children.map((child, i) => (
        <FileTreeNode key={i} node={child} depth={depth + 1} />
      ))}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ appState, files }) => {
  const fileCount = files.length + (files.find(f => f.name === 'docs')?.children?.length || 0);

  return (
    <div className="border-2 border-cyan-500 p-4 bg-[#000808] text-cyan-500 font-mono shadow-[0_0_15px_rgba(6,182,212,0.3)] h-full flex flex-col justify-between overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <h2 className="text-xl font-bold border-b border-cyan-500 mb-4 pb-1">SYSTEM STATUS</h2>
        
        <div className="space-y-4 mb-6">
          <div className="flex justify-between items-center">
            <span>CORE_STATE:</span>
            <span className={`font-bold ${
              appState === AppState.ERROR ? 'text-red-500 animate-pulse' : 
              appState === AppState.IDLE ? 'text-cyan-500' : 'text-yellow-400 animate-pulse'
            }`}>
              {appState}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span>THREAT_DEF:</span>
            <span className="text-red-500 font-bold blink">ACTIVE</span>
          </div>
        </div>

        <div className="border border-cyan-500/50 flex-1 flex flex-col overflow-hidden bg-black/50">
           <div className="bg-cyan-900/30 px-2 py-1 text-xs font-bold border-b border-cyan-500/30">VIRTUAL FILE SYSTEM</div>
           <div className="p-2 overflow-y-auto custom-scrollbar flex-1">
             {files.map((node, i) => (
               <FileTreeNode key={i} node={node} depth={0} />
             ))}
           </div>
        </div>

        <div className="mt-4 border border-cyan-500/30 p-2">
          <div className="text-xs opacity-70 mb-1">TARGET_ANALYSIS</div>
          <div className="text-lg font-bold">AgentHopper</div>
          <div className="text-xs text-red-400 mt-1">CLASS: AI-WORM-POC</div>
        </div>
      </div>
    </div>
  );
};