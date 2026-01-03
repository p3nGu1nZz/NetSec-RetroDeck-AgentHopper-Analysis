import React from 'react';
import { FileSystemNode } from '../types';

interface FileViewerProps {
  activeFile: FileSystemNode | null;
  onClose: () => void;
}

const MarkdownRenderer: React.FC<{ content: string }> = ({ content }) => {
  if (!content) return null;
  
  const lines = content.split('\n');
  const renderedLines: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockContent: string[] = [];

  const parseInline = (text: string) => {
    // Simple inline parser for **bold** and [link](url)
    // We split by capturing groups to keep the delimiters for processing
    const parts = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\)|`.*?`)/g);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={i} className="text-amber-300 font-bold">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return <code key={i} className="bg-amber-900/30 px-1 text-amber-200">{part.slice(1, -1)}</code>;
        }
        if (part.startsWith('[') && part.includes('](') && part.endsWith(')')) {
             const match = part.match(/\[(.*?)\]\((.*?)\)/);
             if (match) {
                 return <a key={i} href={match[2]} target="_blank" rel="noopener noreferrer" className="underline decoration-amber-700 hover:text-amber-300 cursor-pointer">{match[1]}</a>
             }
        }
        return part;
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        renderedLines.push(
          <div key={`code-${i}`} className="bg-black/50 border border-amber-900/50 p-3 my-2 font-mono text-xs text-green-400 whitespace-pre overflow-x-auto custom-scrollbar shadow-inner">
            {codeBlockContent.join('\n')}
          </div>
        );
        codeBlockContent = [];
        inCodeBlock = false;
      } else {
        // Start code block
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockContent.push(line);
      continue;
    }

    // Headers
    if (line.startsWith('# ')) {
        renderedLines.push(<h1 key={i} className="text-2xl font-bold mt-6 mb-3 border-b border-amber-800/50 pb-2 text-amber-400 tracking-wide">{parseInline(line.slice(2))}</h1>);
    } else if (line.startsWith('## ')) {
        renderedLines.push(<h2 key={i} className="text-xl font-bold mt-5 mb-2 text-amber-400/90">{parseInline(line.slice(3))}</h2>);
    } else if (line.startsWith('### ')) {
        renderedLines.push(<h3 key={i} className="text-lg font-bold mt-4 mb-2 text-amber-500">{parseInline(line.slice(4))}</h3>);
    }
    // List items
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        renderedLines.push(
            <div key={i} className="flex ml-4 mb-1">
                <span className="mr-2 text-amber-700 font-bold">{'>'}</span>
                <span>{parseInline(trimmed.slice(2))}</span>
            </div>
        );
    }
    // Blockquotes
    else if (trimmed.startsWith('> ')) {
        renderedLines.push(
            <div key={i} className="border-l-4 border-amber-700 pl-4 my-2 italic text-amber-500/80 bg-amber-900/10 py-1">
                {parseInline(trimmed.slice(2))}
            </div>
        );
    }
    // Normal text
    else if (trimmed === '') {
        renderedLines.push(<div key={i} className="h-4" />);
    } else {
        renderedLines.push(<div key={i} className="mb-1 leading-relaxed">{parseInline(line)}</div>);
    }
  }

  return <div className="markdown-body">{renderedLines}</div>;
};

export const FileViewer: React.FC<FileViewerProps> = ({ activeFile, onClose }) => {
  if (!activeFile) return null;

  const isMarkdown = activeFile.name.endsWith('.md') || activeFile.name.endsWith('.txt');

  return (
    <div className="h-full w-full bg-[#0a0a0a] border-2 border-amber-500 flex flex-col shadow-[0_0_15px_rgba(245,158,11,0.3)]">
      <div className="bg-amber-500 text-black px-2 py-1 flex justify-between items-center shrink-0">
        <span className="font-bold font-mono truncate">{activeFile.name.toUpperCase()}</span>
        <button 
          onClick={onClose}
          className="hover:bg-black hover:text-amber-500 px-2 font-bold transition-colors"
        >
          [X]
        </button>
      </div>
      <div className="flex-1 overflow-auto p-4 text-amber-500 font-mono text-sm custom-scrollbar">
        {isMarkdown ? (
             <MarkdownRenderer content={activeFile.content || ''} />
        ) : (
            <div className="whitespace-pre-wrap leading-relaxed">
                {activeFile.content}
            </div>
        )}
      </div>
    </div>
  );
};