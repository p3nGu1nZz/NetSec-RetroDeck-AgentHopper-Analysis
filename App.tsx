import React, { useState, useEffect, useRef } from 'react';
import { Terminal } from './components/Terminal';
import { FileViewer } from './components/FileViewer';
import { BrowserPanel } from './components/BrowserPanel';
import { Dashboard } from './components/Dashboard';
import { BootScreen } from './components/BootScreen';
import { AgentPanel } from './components/AgentPanel';
import { generateDocument, generateAntiVirusCode, conductDeepResearch, browseWebsite, performSystemScan, chatWithSecurityAgent } from './services/geminiService';
import { INITIAL_FILES, ASCII_ART, APP_VERSION } from './constants';
import { TerminalLine, FileSystemNode, AppState, SessionData, BrowserState, AgentMessage } from './types';
import { SOURCE_FILES } from './sourceCode';

// Helper to resolve paths
const resolvePath = (cwd: string, target: string): string => {
  if (!target) return cwd;
  if (target.startsWith('/')) return target.endsWith('/') && target.length > 1 ? target.slice(0, -1) : target;
  
  const parts = cwd.split('/').filter(Boolean);
  const targetParts = target.split('/').filter(Boolean);
  
  for (const part of targetParts) {
    if (part === '.') continue;
    if (part === '..') {
      if (parts.length > 0) parts.pop();
    } else {
      parts.push(part);
    }
  }
  
  const result = '/' + parts.join('/');
  return result;
};

// Helper to find directories
const getDirectory = (files: FileSystemNode[], path: string): FileSystemNode | null => {
    if (path === '/') return { name: 'root', type: 'directory', path: '/', children: files } as any;

    const parts = path.split('/').filter(Boolean);
    let currentChildren = files;
    let foundNode = null;

    for (const part of parts) {
        const node = currentChildren.find(n => n.name === part);
        if (!node || node.type !== 'directory') return null;
        foundNode = node;
        currentChildren = node.children || [];
    }
    return foundNode;
};

// Helper to find specific file
const getFile = (files: FileSystemNode[], path: string): FileSystemNode | null => {
    const dirPath = path.substring(0, path.lastIndexOf('/')) || '/';
    const fileName = path.substring(path.lastIndexOf('/') + 1);
    const dir = getDirectory(files, dirPath);
    if (dir && dir.children) {
        return dir.children.find(f => f.name === fileName && f.type === 'file') || null;
    }
    return null;
};

// Helper to list files
const listFiles = (nodes: FileSystemNode[]): string => {
  if (!nodes || nodes.length === 0) return '(empty)';
  return nodes.map(node => {
      const typeIndicator = node.type === 'directory' ? '[DIR]' : '[FILE]';
      return `${typeIndicator.padEnd(8)} ${node.name}`;
  }).join('\n');
};

// Recursive find
const findFiles = (name: string, nodes: FileSystemNode[], parentPath: string = ''): string[] => {
    let results: string[] = [];
    for (const node of nodes) {
        const fullPath = parentPath === '/' ? `/${node.name}` : `${parentPath}/${node.name}`;
        if (node.name.includes(name)) {
            results.push(fullPath);
        }
        if (node.children) {
            results = results.concat(findFiles(name, node.children, fullPath));
        }
    }
    return results;
};

// Helper to gather all browse data
const getBrowsingContext = (files: FileSystemNode[]): string => {
    const browseDir = getDirectory(files, '/browse');
    if (!browseDir || !browseDir.children) return "";
    
    return browseDir.children
        .filter(c => c.type === 'file')
        .map(c => `--- START OF ${c.name} ---\n${c.content}\n--- END OF ${c.name} ---`)
        .join('\n\n');
};

const incrementVersion = (v: string) => {
    const parts = v.split('.');
    if(parts.length < 3) return v + '.1';
    // Increment the patch version (3rd number) to track saves/updates
    parts[2] = (parseInt(parts[2]) + 1).toString();
    return parts.join('.');
};

const updateOrAddNode = (children: FileSystemNode[], newNode: FileSystemNode) => {
    const index = children.findIndex(n => n.name === newNode.name);
    if (index !== -1) {
        children[index] = { ...children[index], ...newNode };
    } else {
        children.push(newNode);
    }
};

const App: React.FC = () => {
  const [isBooting, setIsBooting] = useState(true);
  const [bootLogs, setBootLogs] = useState<string[] | undefined>(undefined);

  const [terminalLines, setTerminalLines] = useState<TerminalLine[]>([
    { id: 'init', type: 'system', text: `BOOT SEQUENCE INITIATED...\nVERSION: ${APP_VERSION}\nMOUNTING VIRTUAL FS...`, timestamp: Date.now() },
    { id: 'welcome', type: 'success', text: ASCII_ART, timestamp: Date.now() + 10 }
  ]);
  const [files, setFiles] = useState<FileSystemNode[]>(INITIAL_FILES);
  const [activeFile, setActiveFile] = useState<FileSystemNode | null>(null);
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [currentPath, setCurrentPath] = useState<string>('/');
  const [sessionVersion, setSessionVersion] = useState<string>(APP_VERSION);
  const [loadedFilename, setLoadedFilename] = useState<string>('');
  const [browserState, setBrowserState] = useState<BrowserState>({ url: '', content: '', links: [], history: [] });
  const [activePanel, setActivePanel] = useState<'none' | 'file' | 'browser'>('none');
  const [agentMessages, setAgentMessages] = useState<AgentMessage[]>([
    { id: '1', role: 'model', text: 'NETSEC AGENT ONLINE. READY TO ASSIST WITH THREAT ANALYSIS AND KERNEL MODIFICATIONS.', timestamp: Date.now() }
  ]);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize Source Code directory on mount (only if empty)
  useEffect(() => {
    const initSource = () => {
        const newFiles = JSON.parse(JSON.stringify(INITIAL_FILES));
        let srcDir = newFiles.find((f: any) => f.name === 'src');
        if (!srcDir) {
            srcDir = { name: 'src', type: 'directory', path: '/src', children: [] };
            newFiles.push(srcDir);
        }
        SOURCE_FILES.forEach(sf => {
            updateOrAddNode(srcDir.children, {
                name: sf.name,
                type: 'file',
                path: `/src/${sf.name}`,
                content: sf.content
            });
        });
        setFiles(prev => {
            const currentSrc = prev.find(f => f.name === 'src');
            if (!currentSrc || !currentSrc.children || currentSrc.children.length === 0) return newFiles;
            return prev;
        });
    };
    initSource();
  }, []);

  const addLine = (text: string, type: TerminalLine['type'] = 'output') => {
    setTerminalLines(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      text,
      type,
      timestamp: Date.now()
    }]);
  };

  // --- Agent Tool Execution Logic ---
  const executeAgentTool = (name: string, args: any) => {
    if (name === 'listFiles') {
        const path = args.path || '/';
        const dir = getDirectory(files, path);
        if (!dir || !dir.children) return `Error: Directory ${path} not found.`;
        return `Files in ${path}:\n` + dir.children.map(c => `${c.type === 'directory' ? '[DIR]' : '[FILE]'} ${c.name}`).join('\n');
    }
    
    if (name === 'readFile') {
        const path = args.path;
        const file = getFile(files, path);
        if (!file) return `Error: File ${path} not found.`;
        return file.content || '';
    }

    if (name === 'writeFile') {
        const path = args.path;
        const content = args.content;
        
        // This tool requires deep update of 'files' state
        // We can't synchronously return the result of state update, so we'll do it optimistically/functionally
        
        let success = false;
        setFiles(prev => {
            const newFiles = JSON.parse(JSON.stringify(prev));
            const dirPath = path.substring(0, path.lastIndexOf('/')) || '/';
            const fileName = path.substring(path.lastIndexOf('/') + 1);
            
            // Ensure directory exists
            // For simplicity, only support creating in existing directories or simple paths
            let dir = getDirectory(newFiles, dirPath);
            if (!dir) {
                // If it's a deep path, this simple lookup fails if intermediate dirs missing.
                // Fallback: Assume root if fails or simple error
                 return prev;
            }
            
            if (dir && dir.children) {
                updateOrAddNode(dir.children, {
                    name: fileName,
                    type: 'file',
                    path: path,
                    content: content
                });
                success = true;
                return newFiles;
            }
            return prev;
        });
        
        // Note: 'success' var here is closure scoped to render time, won't reflect inside setFiles immediately
        // But for the agent feedback, we assume success if path was valid format
        return `Successfully wrote to ${path}`;
    }

    return `Error: Unknown tool ${name}`;
  };

  const handleAgentMessage = async (msg: string) => {
    const newMessage: AgentMessage = { id: Date.now().toString(), role: 'user', text: msg, timestamp: Date.now() };
    setAgentMessages(prev => [...prev, newMessage]);
    setIsAgentThinking(true);

    try {
        // We pass the messages but filter out system/tools for simplicity if needed, 
        // or just pass pure text history? The service converts them.
        const response = await chatWithSecurityAgent(agentMessages, msg);
        
        let agentText = response.text || "";
        const toolCalls = response.functionCalls;

        if (toolCalls && toolCalls.length > 0) {
            for (const call of toolCalls) {
                const result = executeAgentTool(call.name, call.args);
                agentText += `\n\n[TOOL EXEC: ${call.name}]\nResult: ${result.substring(0, 200)}...`;
                
                // Add tool result to chat for visibility (optional)
                setAgentMessages(prev => [...prev, { 
                    id: Date.now().toString() + 'tool', 
                    role: 'system', 
                    text: `EXECUTED ${call.name}: ${result.substring(0, 100)}...`, 
                    timestamp: Date.now() 
                }]);
            }
            agentText += "\n\n(Tasks completed)";
        }

        setAgentMessages(prev => [...prev, { 
            id: (Date.now() + 1).toString(), 
            role: 'model', 
            text: agentText, 
            timestamp: Date.now() 
        }]);

    } catch (e) {
        setAgentMessages(prev => [...prev, { 
            id: Date.now().toString(), 
            role: 'system', 
            text: `ERROR: ${(e as Error).message}`, 
            timestamp: Date.now() 
        }]);
    } finally {
        setIsAgentThinking(false);
    }
  };

  const executeAnalysis = async () => {
    try {
      setAppState(AppState.ANALYZING);
      addLine('INITIATING HEURISTIC ANALYSIS ENGINE...', 'system');
      
      const browsingContext = getBrowsingContext(files);
      if (browsingContext) addLine('LOADING BROWSING CONTEXT FOR ANALYSIS...', 'system');

      // Load existing context
      const existingDoc = getFile(files, '/docs/agent_hopper_analysis.md')?.content || "";
      const existingSpec = getFile(files, '/docs/specs/defense_architecture.md')?.content || "";
      const existingAv = getFile(files, '/agent_killer.py')?.content || "";

      if (existingDoc) addLine('DETECTED EXISTING ANALYSIS DATA. RUNNING INCREMENTAL UPDATE...', 'system');

      setAppState(AppState.GENERATING_DOCS);
      addLine('PROCESSING RESEARCH DOCUMENTATION...', 'system');
      const researchDoc = await generateDocument(
          'research_analysis.md', 
          'Comprehensive analysis of AgentHopper exploit mechanics.',
          existingDoc,
          browsingContext
      );
      
      setAppState(AppState.GENERATING_SPECS);
      addLine('PROCESSING DEFENSE ARCHITECTURE SPECS...', 'system');
      const specDoc = await generateDocument(
          'defense_architecture.md', 
          'Defense architecture specification against autonomous AI agents.',
          existingSpec,
          browsingContext
      );
      
      addLine('OPTIMIZING ANTI-VIRUS COUNTERMEASURES...', 'system');
      const avCode = await generateAntiVirusCode(existingAv, browsingContext);

      // Deep clone to safely mutate
      const newFiles = JSON.parse(JSON.stringify(files));
      
      // Ensure docs dir exists
      let docsDir = newFiles.find((f: any) => f.name === 'docs');
      if (!docsDir) {
          docsDir = { name: 'docs', type: 'directory', path: '/docs', children: [] };
          newFiles.push(docsDir);
      }
      if (!docsDir.children) docsDir.children = [];

      updateOrAddNode(docsDir.children, {
          name: 'agent_hopper_analysis.md', type: 'file', path: '/docs/agent_hopper_analysis.md', content: researchDoc
      });

      let specsDir = docsDir.children.find((c: any) => c.name === 'specs');
      if (!specsDir) {
          specsDir = { name: 'specs', type: 'directory', path: '/docs/specs', children: [] };
          docsDir.children.push(specsDir);
      }
      if (!specsDir.children) specsDir.children = [];

      updateOrAddNode(specsDir.children, {
          name: 'defense_architecture.md', type: 'file', path: '/docs/specs/defense_architecture.md', content: specDoc
      });

      updateOrAddNode(newFiles, {
          name: 'agent_killer.py', type: 'file', path: '/agent_killer.py', content: avCode
      });

      setFiles(newFiles);
      setAppState(AppState.COMPLETE);
      addLine('ANALYSIS SEQUENCE COMPLETE.', 'success');
      if (existingDoc && researchDoc === existingDoc) addLine('NOTICE: No significant changes detected in analysis.', 'system');

    } catch (e) {
      setAppState(AppState.ERROR);
      const msg = (e as Error).message;
      if (msg.includes('MISSING_API_KEY')) {
         addLine(`ERROR: API KEY REQUIRED.\nRun 'setkey <YOUR_GEMINI_API_KEY>' to configure the agent.`, 'error');
      } else {
         addLine(`ANALYSIS FAILED: ${msg}`, 'error');
      }
    }
  };

  const executeResearch = async () => {
    try {
      setAppState(AppState.RESEARCHING);
      
      const logger = (msg: string) => addLine(msg, 'system');
      
      const browsingContext = getBrowsingContext(files);
      if (browsingContext) logger('INTEGRATING LOCAL BROWSE DATA INTO INTELLIGENCE MATRIX...');

      const existingIntel = getFile(files, '/docs/deep_dive_intel.md')?.content || "";
      const { report, artifacts, isUpdate } = await conductDeepResearch(logger, existingIntel, browsingContext);
      
      const newFiles = JSON.parse(JSON.stringify(files));
      
      let docsDir = newFiles.find((f: any) => f.name === 'docs');
      if (!docsDir) {
         docsDir = { name: 'docs', type: 'directory', path: '/docs', children: [] };
         newFiles.push(docsDir);
      }
      if(!docsDir.children) docsDir.children = [];
      
      updateOrAddNode(docsDir.children, {
             name: 'deep_dive_intel.md', type: 'file', path: '/docs/deep_dive_intel.md', content: report
      });

      if (artifacts && artifacts.length > 0) {
        let exploitsDir = newFiles.find((f: any) => f.name === 'exploits');
        if (!exploitsDir) {
            exploitsDir = { name: 'exploits', type: 'directory', path: '/exploits', children: [] };
            newFiles.push(exploitsDir);
        }
        if (!exploitsDir.children) exploitsDir.children = [];

        artifacts.forEach(artifact => {
            updateOrAddNode(exploitsDir.children, {
                name: artifact.name,
                type: 'file',
                path: `/exploits/${artifact.name}`,
                content: artifact.content
            });
            logger(`GENERATED EXPLOIT/TOOL: /exploits/${artifact.name}`);
        });
      }
      
      setFiles(newFiles);
      setAppState(AppState.COMPLETE);
      addLine(`RESEARCH ${isUpdate ? 'UPDATE' : 'COMPLETE'}. INTEL SAVED.`, 'success');
      
    } catch (e) {
      setAppState(AppState.ERROR);
      const msg = (e as Error).message;
      if (msg.includes('MISSING_API_KEY')) {
         addLine(`ERROR: API KEY REQUIRED.\nRun 'setkey <YOUR_GEMINI_API_KEY>'.`, 'error');
      } else {
         addLine(`RESEARCH FAILED: ${msg}`, 'error');
      }
    }
  };

  const handleBrowse = async (url: string) => {
      setAppState(AppState.BROWSING);
      setActivePanel('browser');
      setBrowserState(prev => ({ ...prev, url, content: '' }));
      
      const logger = (msg: string) => addLine(msg, 'system');
      
      try {
          const result = await browseWebsite(url, logger);
          setBrowserState(prev => ({
              ...prev,
              content: result.content,
              links: result.links,
              history: [...prev.history, url]
          }));
          addLine(`LOADED: ${url}`, 'success');

          // Save to VFS
          const newFiles = JSON.parse(JSON.stringify(files));
          let browseDir = newFiles.find((f: any) => f.name === 'browse');
          if (!browseDir) {
              browseDir = { name: 'browse', type: 'directory', path: '/browse', children: [] };
              newFiles.push(browseDir);
          }
          if (!browseDir.children) browseDir.children = [];

          const safeFilename = url.replace(/[^a-z0-9]/gi, '_').substring(0, 50) + '.md';
          const fileContent = `Source: ${url}\nFetched: ${new Date().toISOString()}\n\n${result.content}`;

          updateOrAddNode(browseDir.children, {
              name: safeFilename,
              type: 'file',
              path: `/browse/${safeFilename}`,
              content: fileContent
          });
          setFiles(newFiles);
          addLine(`CACHED: /browse/${safeFilename}`, 'system');

      } catch (e) {
          setBrowserState(prev => ({ ...prev, content: `Error: ${(e as Error).message}` }));
          addLine(`BROWSE FAILED: ${(e as Error).message}`, 'error');
      } finally {
          setAppState(AppState.IDLE);
      }
  };

  const handleScan = async () => {
      setAppState(AppState.SCANNING);
      const exploitsDir = getDirectory(files, '/exploits');
      const exploitFiles = exploitsDir?.children?.map(c => c.name) || [];
      
      const logger = (msg: string) => addLine(msg, 'system');
      
      try {
          const report = await performSystemScan(exploitFiles, logger);
          addLine("--- SCAN REPORT ---");
          addLine(report, report.includes("VULNERABLE") ? 'error' : 'success');
          setAppState(AppState.COMPLETE);
      } catch (e) {
        addLine(`SCAN ERROR: ${(e as Error).message}`, 'error');
        setAppState(AppState.ERROR);
      }
  };

  const executeExport = () => {
    try {
      const newVersion = incrementVersion(sessionVersion);
      setSessionVersion(newVersion);
      
      // Ensure current source is captured if modified in VFS
      const sessionData: SessionData = {
        version: newVersion,
        timestamp: Date.now(),
        files: files,
        terminalLines: terminalLines
      };
      
      const blob = new Blob([JSON.stringify(sessionData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Generate Unique Filename with Timestamp
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `retrodeck_v${newVersion}_${dateStr}.json`;
      a.download = filename;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      addLine(`SESSION EXPORTED: ${filename}`, 'success');
    } catch (e) {
      addLine(`EXPORT FAILED: ${(e as Error).message}`, 'error');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoadedFilename(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = event.target?.result as string;
        const data = JSON.parse(json) as SessionData;
        const loadedVer = data.version;
        const currentVer = APP_VERSION;

        let mergedFiles = JSON.parse(JSON.stringify(data.files));
        
        // Version Evaluation Logic
        // If the loaded session is older than the current app version, we might want to 
        // upgrade the 'src' files to the new definitions, UNLESS the user has custom edits.
        // For safety/preservation of edits, we will prioritize what's in the save file 
        // but verify 'src' exists.
        
        let srcDir = mergedFiles.find((f: any) => f.name === 'src');
        let updateMsg = "SOURCE INTEGRITY: VERIFIED (USER EDITS PRESERVED)";

        if (!srcDir) {
             // If save file has no source, inject current defaults
             srcDir = { name: 'src', type: 'directory', path: '/src', children: [] };
             mergedFiles.push(srcDir);
             SOURCE_FILES.forEach(sf => {
                srcDir.children.push({
                    name: sf.name,
                    type: 'file',
                    path: `/src/${sf.name}`,
                    content: sf.content
                });
            });
            updateMsg = "SOURCE INTEGRITY: RESTORED DEFAULTS (MISSING)";
        } else {
            // We have a src dir. 
            // If loaded version is significantly older (e.g. 1.0 vs 1.1), we might warn 
            // or we could force update core files while keeping others. 
            // For this requirement, we assume "eval the source code loaded" means trust the load.
        }

        // Setup boot sequence
        setBootLogs([
            "INITIATING SYSTEM RESTORE...",
            `READING IMAGE: ${file.name}`,
            `SNAPSHOT VERSION: ${loadedVer}`,
            `CURRENT KERNEL: ${currentVer}`,
            updateMsg,
            "RE-COMPILING VIRTUAL ASSETS...",
            "MOUNTING USER DATA PARTITIONS...",
            "SYSTEM REBOOT IN PROGRESS..."
        ]);
        setIsBooting(true);

        setTimeout(() => {
            setFiles(mergedFiles);
            setTerminalLines(data.terminalLines);
            setSessionVersion(data.version);
            setAppState(AppState.IDLE); 
            setCurrentPath('/');
            // No extra log here, the boot screen handles the visual feedback
        }, 1000);

      } catch (err) {
        addLine(`LOAD FAILED: ${(err as Error).message}`, 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleCommand = async (cmd: string) => {
    try {
        addLine(cmd, 'input');
        const args = cmd.trim().split(/\s+/);
        const command = args[0].toLowerCase();

        switch (command) {
        case 'help':
            addLine('AVAILABLE COMMANDS:\n' + 
            '  ls, cd, mkdir, cat, find - File System Ops\n' +
            '  analyze  - Heuristic Threat Analysis (Incremental)\n' +
            '  research - Deep Web Recon & Exploit Gen\n' +
            '  scan     - Vulnerability Scanner\n' +
            '  browse   - Text-Based Web Browser\n' +
            '  run      - Execute Scripts\n' +
            '  export   - Save Session & Source\n' +
            '  load     - Restore Session\n' +
            '  about    - App Info\n' +
            '  version  - Check Version');
            break;
        case 'about':
            addLine('NetSec RetroDeck [CLASSIFIED]\nA unified threat analysis and rapid prototyping environment for AgentHopper class vectors.\nIncludes: AI-driven Research, Heuristics Engine, Virtual FS, and Text-Web Proxy.', 'system');
            break;
        case 'version':
            addLine(`CURRENT VERSION: ${sessionVersion}`, 'system');
            if (loadedFilename) addLine(`LOADED IMAGE: ${loadedFilename}`, 'system');
            break;
        case 'clear':
            setTerminalLines([]);
            break;
        case 'ls':
            const dirNode = getDirectory(files, currentPath);
            if (dirNode && dirNode.children) addLine(listFiles(dirNode.children));
            else addLine('Access denied.', 'error');
            break;
        case 'cd':
            if (args.length < 2) { setCurrentPath('/'); return; }
            const targetPath = resolvePath(currentPath, args[1]);
            const targetDir = getDirectory(files, targetPath);
            if (targetDir && targetDir.type === 'directory') setCurrentPath(targetPath);
            else addLine(`cd: no such directory: ${args[1]}`, 'error');
            break;
        case 'mkdir':
            if (args.length < 2) { addLine('Usage: mkdir [name]', 'error'); return; }
            const newFilesMkdir = JSON.parse(JSON.stringify(files));
            const currentDirNode = getDirectory(newFilesMkdir, currentPath);
            if (currentDirNode?.children) {
                if (currentDirNode.children.find((c: any) => c.name === args[1])) {
                    addLine(`mkdir: exists: ${args[1]}`, 'error');
                } else {
                    currentDirNode.children.push({
                        name: args[1], type: 'directory', 
                        path: currentPath === '/' ? `/${args[1]}` : `${currentPath}/${args[1]}`, 
                        children: [] 
                    });
                    setFiles(newFilesMkdir);
                    addLine(`Created: ${args[1]}`, 'success');
                }
            }
            break;
        case 'find':
            if (args.length < 2) { addLine('Usage: find [name]', 'error'); return; }
            const results = findFiles(args[1], files, '/');
            if (results.length > 0) addLine(results.join('\n'));
            else addLine('No matches found.', 'system');
            break;
        case 'status':
            const envKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined;
            const localKey = localStorage.getItem('gemini_api_key');
            addLine(`STATE: ${appState}\nVER: ${sessionVersion}\nCWD: ${currentPath}\nKEY: ${envKey ? 'ENV' : (localKey ? 'LOCAL' : 'MISSING')}`);
            break;
        case 'setkey':
            if (args.length < 2) addLine('Usage: setkey <KEY>', 'error');
            else {
                localStorage.setItem('gemini_api_key', args[1]);
                addLine('KEY UPDATED.', 'success');
            }
            break;
        case 'cat':
            if (args.length < 2) { addLine('Usage: cat [file]', 'error'); return; }
            const catPath = resolvePath(currentPath, args[1]);
            const parentDir = catPath.substring(0, catPath.lastIndexOf('/')) || '/';
            const fileName = catPath.substring(catPath.lastIndexOf('/') + 1);
            const pDirNode = getDirectory(files, parentDir);
            const targetFile = pDirNode?.children?.find((c: any) => c.name === fileName);
            if (targetFile?.type === 'file') {
                setActiveFile(targetFile);
                setActivePanel('file');
                addLine(`READING ${targetFile.name}...`, 'success');
            } else addLine(`cat: not found: ${args[1]}`, 'error');
            break;
        case 'run':
            if (args.length < 2) { addLine('Usage: run [script]', 'error'); return; }
            const runPath = resolvePath(currentPath, args[1]);
            const rParentDir = runPath.substring(0, runPath.lastIndexOf('/')) || '/';
            const rFileName = runPath.substring(runPath.lastIndexOf('/') + 1);
            const rPDirNode = getDirectory(files, rParentDir);
            const rScript = rPDirNode?.children?.find((c: any) => c.name === rFileName);
            if (rScript?.type === 'file' && rScript.name.endsWith('.py')) {
                addLine(`SPAWNING PYTHON PROCESS: ${rScript.name}`, 'system');
                setTimeout(() => addLine(`[PROC] PID 1337 started.`, 'system'), 300);
                setTimeout(() => addLine(`[PROC] Importing modules...`, 'system'), 800);
                setTimeout(() => addLine(`[STDOUT] Execution complete.`, 'success'), 1500);
            } else addLine(`run: invalid target: ${args[1]}`, 'error');
            break;
        case 'analyze':
            if (appState !== AppState.IDLE && appState !== AppState.COMPLETE) addLine('BUSY.', 'error');
            else await executeAnalysis();
            break;
        case 'research':
            if (appState !== AppState.IDLE && appState !== AppState.COMPLETE) addLine('BUSY.', 'error');
            else await executeResearch();
            break;
        case 'scan':
            await handleScan();
            break;
        case 'browse':
            if (args.length < 2) addLine('Usage: browse [url]', 'error');
            else handleBrowse(args[1]);
            break;
        case 'export':
            executeExport();
            break;
        case 'load':
            fileInputRef.current?.click();
            break;
        default:
            addLine(`Unknown command: ${command}`, 'error');
        }
    } catch (e) {
        addLine(`CRITICAL ERROR: ${(e as Error).message}`, 'error');
    }
  };

  if (isBooting) {
    return <BootScreen onComplete={() => { setIsBooting(false); setBootLogs(undefined); }} logs={bootLogs} />;
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6 flex flex-col md:flex-row gap-4 max-w-[1920px] mx-auto h-screen overflow-hidden">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".json"/>

      {/* Left Column: Dashboard (20%) */}
      <div className="w-full md:w-[20%] flex flex-col gap-4 min-h-[300px]">
        <div className="flex-1 h-full overflow-hidden">
          <Dashboard appState={appState} files={files} />
        </div>
        <div className="flex flex-col gap-2 shrink-0">
            <button onClick={() => handleCommand('analyze')} disabled={appState !== AppState.IDLE && appState !== AppState.COMPLETE} 
             className={`py-3 px-2 border-2 font-bold text-sm tracking-widest ${appState === AppState.ANALYZING ? 'border-yellow-500 text-yellow-500 bg-yellow-900/20' : 'border-red-600 text-red-600 hover:bg-red-600 hover:text-black'}`}>
             {appState === AppState.ANALYZING ? 'ANALYZING...' : 'INITIATE ANALYSIS'}
            </button>
            <button onClick={() => handleCommand('research')} disabled={appState !== AppState.IDLE && appState !== AppState.COMPLETE}
             className={`py-3 px-2 border-2 font-bold text-sm tracking-widest ${appState === AppState.RESEARCHING ? 'border-cyan-500 text-cyan-500 bg-cyan-900/20' : 'border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-black'}`}>
             {appState === AppState.RESEARCHING ? 'SCANNING WEB...' : 'DEEP RESEARCH'}
            </button>
        </div>
      </div>

      {/* Center Column: Terminal & Viewer (50%) */}
      <div className="w-full md:w-[50%] flex flex-col gap-4 h-full relative">
        <div className={`relative z-10 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${activePanel !== 'none' ? 'h-[50%]' : 'h-full'}`}>
          <Terminal lines={terminalLines} onCommand={handleCommand} isProcessing={appState !== AppState.IDLE && appState !== AppState.COMPLETE && appState !== AppState.BROWSING} currentPath={currentPath} fileSystem={files} />
        </div>
        
        {/* Bottom Panel (File Viewer or Browser) */}
        <div className={`relative z-10 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] overflow-hidden ${activePanel !== 'none' ? 'h-[50%] opacity-100' : 'h-0 opacity-0'}`}>
          {activePanel === 'file' && activeFile && (
             <FileViewer activeFile={activeFile} onClose={() => setActivePanel('none')} />
          )}
          {activePanel === 'browser' && (
              <BrowserPanel 
                browserState={browserState} 
                onNavigate={handleBrowse} 
                onClose={() => setActivePanel('none')} 
                isLoading={appState === AppState.BROWSING}
              />
          )}
        </div>
      </div>

      {/* Right Column: AI Agent Panel (30%) */}
      <div className="w-full md:w-[30%] h-full flex flex-col">
          <AgentPanel 
            messages={agentMessages} 
            onSendMessage={handleAgentMessage} 
            isProcessing={isAgentThinking} 
          />
      </div>
    </div>
  );
};

export default App;