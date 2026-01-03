export interface FileSystemNode {
  name: string;
  type: 'file' | 'directory';
  content?: string;
  children?: FileSystemNode[];
  path: string;
}

export interface TerminalLine {
  id: string;
  type: 'input' | 'output' | 'system' | 'error' | 'success';
  text: string;
  timestamp: number;
}

export enum AppState {
  IDLE = 'IDLE',
  ANALYZING = 'ANALYZING',
  GENERATING_DOCS = 'GENERATING_DOCS',
  GENERATING_SPECS = 'GENERATING_SPECS',
  RESEARCHING = 'RESEARCHING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface SecurityAnalysisResult {
  threatLevel: string;
  vector: string;
  mitigation: string;
}

export interface SessionData {
  version: string;
  timestamp: number;
  files: FileSystemNode[];
  terminalLines: TerminalLine[];
}