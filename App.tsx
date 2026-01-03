import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from './components/Terminal';
import { FileViewer } from './components/FileViewer';
import { Dashboard } from './components/Dashboard';
import { generateDocument, generateAntiVirusCode, conductDeepResearch } from './services/geminiService';
import { INITIAL_FILES, ASCII_ART, APP_VERSION } from './constants';
import { TerminalLine, FileSystemNode, AppState, SessionData } from './types';

// Helper to flatten FS for easier searching
const findFile = (path: string, nodes: FileSystemNode[]): FileSystemNode | null => {
  for (const node of nodes) {
    if (node.path === path) return node;
    if (node.children) {
      const found = findFile(path, node.children);
      if (found) return found;
    }
  }
  return null;
};

// Helper to list files
const listFiles = (nodes: FileSystemNode[], indent = 0): string => {
  let output = '';
  nodes.forEach(node => {
    output += `${' '.repeat(indent)}${node.type === 'directory' ? '[DIR] ' : ''}${node.name}\n`;
    if (node.children) {
      output += listFiles(node.children, indent + 2);
    }
  });
  return output;
};

const App: React.FC = () => {
  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { id: 'init', type: 'system', text: `BOOT SEQUENCE INITIATED...\nVERSION: ${APP_VERSION}\nMOUNTING VIRTUAL FS...`, timestamp: Date.now() },
    { id: 'welcome', type: 'success', text: ASCII_ART, timestamp: Date.now() + 10 }
  ]);
  const [files, setFiles] = useState<FileSystemNode[]>(INITIAL_FILES);
  const [activeFile, setActiveFile] = useState<FileSystemNode | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLine = (text: string, type: TerminalLine['type'] = 'output') => {
    setTerminalLines(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      text,
      type,
      timestamp: Date.now()
    }]);
  };

  const executeAnalysis = async () => {
    try {
      setAppState(AppState.ANALYZING);
      addLine('INITIATING AGENT_HOPPER HEURISTIC ANALYSIS...', 'system');
      
      setTimeout(() => addLine('Phase 1: Scanning Attack Vectors...', 'system'), 1000);
      setTimeout(() => addLine('Phase 2: Analyzing LLM Interaction Patterns...', 'system'), 2500);

      setAppState(AppState.GENERATING_DOCS);
      addLine('GENERATING RESEARCH DOCUMENTATION...', 'system');
      const researchDoc = await generateDocument('research_analysis.md', 'Comprehensive analysis of AgentHopper exploit, how it uses tools, and its lateral movement strategy.');
      
      setAppState(AppState.GENERATING_SPECS);
      addLine('COMPILING DEFENSE ARCHITECTURE SPECS...', 'system');
      const specDoc = await generateDocument('defense_architecture.md', 'Technical specification for a defense architecture against autonomous AI agents. Include "The Cage" isolation concept.');
      
      addLine('SYNTHESIZING ANTI-VIRUS COUNTERMEASURES...', 'system');
      const avCode = await generateAntiVirusCode();

      const newFiles = [...files];
      const docsDir = newFiles.find(f => f.name === 'docs');
      
      if (docsDir) {
        if (!docsDir.children) docsDir.children = [];
        
        // Check if exists to avoid dupe or overwrite
        const exists = docsDir.children.find(c => c.name === 'agent_hopper_analysis.md');
        if(!exists) {
            docsDir.children.push({
              name: 'agent_hopper_analysis.md',
              type: 'file',
              path: '/docs/agent_hopper_analysis.md',
              content: researchDoc
            });
        }

        const specsDirIndex = docsDir.children.findIndex(c => c.name === 'specs');
        if (specsDirIndex === -1) {
            docsDir.children.push({
                name: 'specs',
                type: 'directory',
                path: '/docs/specs',
                children: [
                {
                    name: 'defense_architecture.md',
                    type: 'file',
                    path: '/docs/specs/defense_architecture.md',
                    content: specDoc
                }
                ]
            });
        } else {
             // Append to specs if exists
             const specsDir = docsDir.children[specsDirIndex];
             if(!specsDir.children) specsDir.children = [];
             specsDir.children.push({
                name: 'defense_architecture.md',
                type: 'file',
                path: '/docs/specs/defense_architecture.md',
                content: specDoc
             })
        }

        // Add AV Code to root
        newFiles.push({
          name: 'agent_killer.py',
          type: 'file',
          path: '/agent_killer.py',
          content: avCode
        });
      }

      setFiles(newFiles);
      setAppState(AppState.COMPLETE);
      addLine('ANALYSIS COMPLETE. NEW FILES GENERATED.', 'success');
    } catch (e) {
      setAppState(AppState.ERROR);
      addLine(`ANALYSIS FAILED: ${(e as Error).message}`, 'error');
    }
  };

  const executeResearch = async () => {
    try {
      setAppState(AppState.RESEARCHING);
      addLine('INITIATING DEEP WEB RESEARCH PROTOCOL...', 'system');
      addLine('CONNECTING TO GLOBAL THREAT INTELLIGENCE GRID...', 'system');
      
      const deepDiveContent = await conductDeepResearch();
      
      const newFiles = [...files];
      const docsDir = newFiles.find(f => f.name === 'docs');
      
      if (docsDir) {
         if(!docsDir.children) docsDir.children = [];
         docsDir.children.push({
             name: 'deep_dive_intel.md',
             type: 'file',
             path: '/docs/deep_dive_intel.md',
             content: deepDiveContent
         });
      }
      
      setFiles(newFiles);
      setAppState(AppState.COMPLETE);
      addLine('RESEARCH COMPLETE. INTEL SAVED TO /docs/deep_dive_intel.md', 'success');
      
    } catch (e) {
      setAppState(AppState.ERROR);
      addLine(`RESEARCH FAILED: ${(e as Error).message}`, 'error');
    }
  };

  const executeExport = () => {
    try {
      const sessionData: SessionData = {
        version: APP_VERSION,
        timestamp: Date.now(),
        files: files,
        terminalLines: terminalLines
      };
      
      const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `retrodeck_session_v${APP_VERSION}_${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addLine('SESSION EXPORT SUCCESSFUL.', 'success');
    } catch (e) {
      addLine(`EXPORT FAILED: ${(e as Error).message}`, 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const data = JSON.parse(json) as SessionData;
        
        if (!data.version || !data.files) {
          throw new Error('Invalid session file format');
        }

        setFiles(data.files);
        setTerminalLines(data.terminalLines);
        // Reset state to IDLE or COMPLETE depending on loaded data, default to IDLE for safety
        setAppState(AppState.IDLE); 
        
        setTerminalLines(prev => [...prev, {
            id: 'sys_load', 
            type: 'success', 
            text: `SESSION LOADED. VERSION: ${data.version}`, 
            timestamp: Date.now()
        }]);

      } catch (err) {
        addLine(`LOAD FAILED: ${(err as Error).message}`, 'error');
      }
    };
    reader.readAsText(file);
    // Reset value so same file can be loaded again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCommand = async (cmd: string) => {
    try {
        addLine(cmd, 'input');
        const args = cmd.trim().split(' ');
        const command = args[0].toLowerCase();

        switch (command) {
        case 'help':
            addLine('AVAILABLE COMMANDS:\n  ls            - List directory contents\n  cat [file]    - Read file content\n  analyze       - Start AI Threat Analysis\n  research      - Deep Web Threat Recon\n  export        - Save Session\n  load          - Load Session\n  clear         - Clear terminal\n  status        - Show system status');
            break;
        case 'clear':
            setTerminalLines([]);
            break;
        case 'ls':
            addLine(listFiles(files));
            break;
        case 'status':
            addLine(`SYSTEM STATE: ${appState}\nVERSION: ${APP_VERSION}\nFILES MOUNTED: ${files.length + (files.find(f=>f.name==='docs')?.children?.length || 0)}`);
            break;
        case 'cat':
            if (args.length < 2) {
            addLine('Usage: cat [filename]', 'error');
            return;
            }
            const targetName = args[1].replace(/^\/+/, ''); // remove leading slash
            // Simple robust finder that handles deep nesting somewhat better or just flat search by name
            const findRecursive = (name: string, nodes: FileSystemNode[]): FileSystemNode | null => {
                for (const node of nodes) {
                    if (node.name === name || node.path === '/' + name || node.path === name) return node;
                    if (node.children) {
                        const found = findRecursive(name, node.children);
                        if (found) return found;
                    }
                }
                return null;
            };
            
            const file = findRecursive(targetName, files);

            if (file && file.type === 'file') {
                setActiveFile(file);
                addLine(`OPENING ${file.name}...`, 'success');
            } else {
                addLine(`File not found: ${args[1]}`, 'error');
            }
            break;
        case 'analyze':
            if (appState !== AppState.IDLE && appState !== AppState.COMPLETE) {
            addLine('PROCESS ALREADY RUNNING', 'error');
            } else {
            await executeAnalysis();
            }
            break;
        case 'research':
            if (appState !== AppState.IDLE && appState !== AppState.COMPLETE) {
                addLine('PROCESS ALREADY RUNNING', 'error');
            } else {
                await executeResearch();
            }
            break;
        case 'export':
            executeExport();
            break;
        case 'load':
            fileInputRef.current?.click();
            break;
        default:
            addLine(`Command not found: ${command}`, 'error');
        }
    } catch (e) {
        addLine(`EXECUTION ERROR: ${(e as Error).message}`, 'error');
    }
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8 flex flex-col md:flex-row gap-4 max-w-[1600px] mx-auto h-screen">
      
      {/* Hidden File Input for Load Command */}
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        className="hidden" 
        accept=".json"
      />

      {/* Left Column: Dashboard & Controls */}
      <div className="w-full md:w-1/4 flex flex-col gap-4 min-h-[300px]">
        <div className="flex-1 h-full overflow-hidden">
          <Dashboard appState={appState} files={files} />
        </div>
        
        <div className="flex flex-col gap-2">
            <button
            onClick={() => handleCommand('analyze')}
            disabled={appState !== AppState.IDLE && appState !== AppState.COMPLETE}
            className={`
                py-3 px-6 border-2 font-bold text-lg tracking-widest transition-all
                ${appState === AppState.ANALYZING 
                ? 'border-yellow-500 text-yellow-500 bg-yellow-900/20 cursor-wait' 
                : 'border-red-600 text-red-600 hover:bg-red-600 hover:text-black cursor-pointer shadow-[0_0_20px_rgba(220,38,38,0.5)]'}
            `}
            >
            {appState === AppState.ANALYZING ? 'ANALYZING...' : 'INITIATE ANALYSIS'}
            </button>
            <button
            onClick={() => handleCommand('research')}
            disabled={appState !== AppState.IDLE && appState !== AppState.COMPLETE}
            className={`
                py-3 px-6 border-2 font-bold text-lg tracking-widest transition-all
                ${appState === AppState.RESEARCHING
                ? 'border-cyan-500 text-cyan-500 bg-cyan-900/20 cursor-wait' 
                : 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-black cursor-pointer shadow-[0_0_20px_rgba(37,99,235,0.5)]'}
            `}
            >
            {appState === AppState.RESEARCHING ? 'SCANNING WEB...' : 'DEEP RESEARCH'}
            </button>
        </div>
      </div>

      {/* Right Column: Terminal & File Viewer */}
      <div className="w-full md:w-3/4 flex flex-col gap-4 h-full relative">
        <div className="h-[60%] md:h-[65%] relative z-10">
          <Terminal 
            lines={terminalLines} 
            onCommand={handleCommand} 
            isProcessing={appState !== AppState.IDLE && appState !== AppState.COMPLETE} 
          />
        </div>
        
        <div className="h-[40%] md:h-[35%] relative z-10">
          {activeFile ? (
            <FileViewer activeFile={activeFile} onClose={() => setActiveFile(null)} />
          ) : (
            <div className="h-full border-2 border-[#333] flex items-center justify-center text-[#333] font-mono">
              [ NO FILE LOADED ]
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;