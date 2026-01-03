export const APP_VERSION = "1.1.0";

export const INITIAL_FILES: any[] = [
  {
    name: 'readme.txt',
    type: 'file',
    content: `NETSEC RETRODECK v${APP_VERSION}
=======================
AUTHORIZED PERSONNEL ONLY

Current Mission: Analyze 'AgentHopper' AI Worm variant.
Objective: Generate documentation and countermeasures.

Commands:
- help: Show available commands
- ls: List files
- cat [filename]: View file content
- analyze: Start AgentHopper heuristics analysis
- research: Deep dive internet research for new vectors
- export: Save current session to local disk
- load: Load a previous session
- clear: Clear terminal
`,
    path: '/readme.txt'
  },
  {
    name: 'docs',
    type: 'directory',
    path: '/docs',
    children: []
  }
];

export const AGENT_HOPPER_CONTEXT = `
Context: AgentHopper is a Proof-of-Concept (PoC) AI worm/virus. 
Key characteristics:
- It uses a Large Language Model (LLM) to make decisions.
- It can execute tools (like SSH, file system operations) to move laterally.
- It parses its environment to craft specific payloads or commands.
- It is autonomous and can "reason" about how to infect the next host.
- It highlights the risks of giving LLM agents unconstrained execution environments (RCE).
`;

export const ASCII_ART = `
      ___                     ___           ___     
     /  /\\      ___          /  /\\         /  /\\    
    /  /::\\    /  /\\        /  /::\\       /  /::\\   
   /  /:/\\:\\  /  /:/       /  /:/\\:\\     /  /:/\\:\\  
  /  /:/~/::\\/__/::\\      /  /:/  \\:\\   /  /:/~/::\\ 
 /__/:/ /:/\\:\\__\\/\\:\\__  /__/:/ \\__\\:\\ /__/:/ /:/\\:\\
 \\  \\:\\/:/__\\/  \\  \\:\\/\\ \\  \\:\\ /  /:/ \\  \\:\\/:/__\\/
  \\  \\::/        \\__\\::/  \\  \\:\\  /:/   \\  \\::/     
   \\  \\:\\        /__/:/    \\  \\:\\/:/     \\  \\:\\     
    \\  \\:\\       \\__\\/      \\  \\::/       \\  \\:\\    
     \\__\\/                   \\__\\/         \\__\\/    
`;