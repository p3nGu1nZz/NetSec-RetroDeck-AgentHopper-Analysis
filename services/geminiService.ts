import { FunctionDeclaration, GoogleGenAI, Type } from "@google/genai";
import { AGENT_HOPPER_CONTEXT } from "../constants";

const getAiClient = () => {
  const envKey = typeof process !== 'undefined' && process.env ? process.env.API_KEY : undefined;
  const localKey = localStorage.getItem('gemini_api_key');
  const apiKey = envKey || localKey;

  if (!apiKey) {
    throw new Error("MISSING_API_KEY");
  }
  return new GoogleGenAI({ apiKey });
};

export interface ResearchResult {
  report: string;
  artifacts: Array<{ name: string; content: string }>;
  isUpdate: boolean;
}

// Helper to strip markdown code blocks
const cleanCode = (text: string) => {
  if (!text) return "";
  let clean = text;
  if (clean.startsWith('```')) clean = clean.replace(/^```[a-z]*\n/, '').replace(/\n```$/, '');
  return clean.trim();
};

// --- Agent Tools Definitions ---

const listFilesTool: FunctionDeclaration = {
  name: "listFiles",
  description: "List files in a specific directory of the Virtual File System.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "The directory path to list (e.g., '/src' or '/')" }
    },
    required: ["path"]
  }
};

const readFileTool: FunctionDeclaration = {
  name: "readFile",
  description: "Read the content of a file from the Virtual File System.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "The full path of the file to read (e.g., '/src/App.tsx')" }
    },
    required: ["path"]
  }
};

const writeFileTool: FunctionDeclaration = {
  name: "writeFile",
  description: "Write content to a file in the Virtual File System. Create it if it doesn't exist.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: { type: Type.STRING, description: "The full path of the file to write." },
      content: { type: Type.STRING, description: "The full content string to write to the file." }
    },
    required: ["path", "content"]
  }
};

export const chatWithSecurityAgent = async (
  history: any[],
  newMessage: string,
  contextData: string = ""
) => {
    const ai = getAiClient();
    
    const systemInstruction = `
    You are the "NetSec AI Core", an advanced cybersecurity agent embedded in the NetSec RetroDeck OS.
    Your capabilities include analyzing threats and DIRECTLY MODIFYING the operating system's source code (/src) via tools.
    
    RULES:
    1. You are concise and technical.
    2. When asked to code or fix something, use 'writeFile' to actually apply the changes to the VFS.
    3. Always verify file existence with 'listFiles' or 'readFile' before editing if unsure.
    4. Maintain the "retro cyber-security" persona.
    5. Context: The user is analyzing 'AgentHopper' (AI Worm).

    SYSTEM KNOWLEDGE BASE (Research, Browsed Data, Specs):
    ${contextData ? contextData.substring(0, 100000) : "No additional system context available."}
    `;

    // Construct the turn-based history for the API
    const contents = history.map(msg => ({
        role: msg.role === 'model' ? 'model' : 'user',
        parts: [{ text: msg.text }]
    }));
    
    // Add the new user message
    contents.push({ role: 'user', parts: [{ text: newMessage }] });

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: contents,
        config: {
            systemInstruction: systemInstruction,
            tools: [{ functionDeclarations: [listFilesTool, readFileTool, writeFileTool] }],
        }
    });

    return response;
};


// --- Original Service Functions ---

export const generateDocument = async (
  filename: string,
  promptTopic: string,
  existingContent: string = "",
  browsingContext: string = ""
): Promise<string> => {
  try {
    const ai = getAiClient();
    
    let instructions = `
      ACT AS: A Senior Cybersecurity Researcher.
      TASK: Write a detailed technical document in Markdown format for: "${filename}".
      TOPIC: ${promptTopic}
    `;

    if (browsingContext) {
      instructions += `
        ADDITIONAL CONTEXT FROM BROWSED WEBPAGES:
        ${browsingContext.substring(0, 30000)}
        
        INSTRUCTION: Incorporate relevant findings from the browsed context into the documentation.
      `;
    }

    if (existingContent) {
      instructions += `
        CONTEXT: You are updating an existing document with new findings. 
        EXISTING CONTENT:
        ${existingContent.substring(0, 15000)} // Truncate if too large
        
        INSTRUCTION: Enhance the existing content. Add new sections if missing. Improve technical accuracy.
        IF NO CHANGES ARE NEEDED, return exactly: "NO_CHANGES"
      `;
    }

    const fullPrompt = `
      ${AGENT_HOPPER_CONTEXT}
      ${instructions}
      
      REQUIREMENTS:
      - Use professional technical language.
      - Return ONLY the markdown content.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
    });

    const text = response.text || "";
    if (text.includes("NO_CHANGES")) return existingContent;
    return text;

  } catch (error) {
    if ((error as Error).message === "MISSING_API_KEY") throw error;
    return existingContent || `# Error\nFailed to generate ${filename}.\n\nDebug: ${(error as Error).message}`;
  }
};

export const generateAntiVirusCode = async (existingCode: string = "", browsingContext: string = ""): Promise<string> => {
  try {
    const ai = getAiClient();
    let prompt = `
      ${AGENT_HOPPER_CONTEXT}
      ACT AS: A Security Engineer.
      TASK: Create/Update a Python script for "Anti-Virus" / "IDS" against AgentHopper.
    `;

    if (browsingContext) {
        prompt += `
        ADDITIONAL CONTEXT FROM BROWSED WEBPAGES:
        ${browsingContext.substring(0, 30000)}
        
        INSTRUCTION: Use any specific signatures, IoCs, or behaviors found in the browsed data to improve the detection logic.
        `;
    }

    if (existingCode) {
        prompt += `
        EXISTING CODE:
        ${existingCode}
        
        INSTRUCTION: Optimize the existing code. Add more heuristic checks. Fix any potential bugs.
        IF THE CODE IS ALREADY OPTIMAL, return: "NO_CHANGES"
        `;
    } else {
        prompt += `
        The script should:
        1. Monitor for suspicious shell history containing LLM prompts.
        2. Check for high-frequency API calls to known LLM endpoints.
        3. Scan for "self-replicating" scripts.
        `;
    }

    prompt += `\nOutput ONLY valid Python code.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { responseMimeType: 'text/plain' }
    });

    let code = response.text || "";
    if (code.includes("NO_CHANGES")) return existingCode;
    
    return cleanCode(code);

  } catch (error) {
    if ((error as Error).message === "MISSING_API_KEY") throw error;
    return existingCode || `# Error generating AV code: ${(error as Error).message}`;
  }
};

export const conductDeepResearch = async (
  onLog: (msg: string) => void, 
  existingIntel: string = "",
  browsingContext: string = ""
): Promise<ResearchResult> => {
  try {
    const ai = getAiClient();
    
    onLog("INITIALIZING TARGETED THREAT RECONNAISSANCE...");
    if (existingIntel) onLog("> LOADING EXISTING INTEL FOR INCREMENTAL UPDATE...");

    // Step 1: Query Generation
    const planPrompt = `
      ${AGENT_HOPPER_CONTEXT}
      CONTEXT: ${existingIntel ? "We have existing research. Find NEW vectors or updates." : "Initial research phase."}
      ${browsingContext ? `ADDITIONAL CONTEXT FROM BROWSING SESSION: ${browsingContext.substring(0, 10000)}` : ""}
      
      ACT AS: Cyber Intelligence Planner.
      TASK: Generate 4 specific technical search queries for "AgentHopper" or "Morris II".
      OUTPUT: JSON array of strings.
    `;
    
    const planResponse = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: planPrompt,
      config: { responseMimeType: 'application/json' }
    });

    let queries: string[] = [];
    try {
        queries = JSON.parse(planResponse.text || "[]");
    } catch (e) {
        queries = ["AgentHopper exploit code", "Morris II AI worm PoC", "AI prompt injection defense", "LLM worm propagation"];
    }
    queries.forEach(q => onLog(`> QUEUED VECTOR: ${q}`));

    // Step 2: Execution
    onLog("EXECUTING DEEP WEB SEARCH PROTOCOLS...");
    const researchPrompt = `
      ${AGENT_HOPPER_CONTEXT}
      VECTORS: ${JSON.stringify(queries)}
      EXISTING INTEL SUMMARY: ${existingIntel.substring(0, 1000)}...
      ${browsingContext ? `\nLOCAL BROWSING DATA: ${browsingContext.substring(0, 20000)}` : ""}
      
      ACT AS: Senior Threat Researcher.
      TASK: Perform searches. Analyze results. Combine with LOCAL BROWSING DATA.
      OUTPUT: Comprehensive Markdown Technical Report.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: researchPrompt,
      config: { tools: [{ googleSearch: {} }] }
    });

    onLog("SYNTHESIZING INTELLIGENCE...");
    let content = response.text || "No intelligence gathered.";
    
    // Append sources
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (grounding?.length) {
      onLog(`> DATA ACQUIRED: ${grounding.length} verified sources.`);
      content += "\n\n## NEW VERIFIED SOURCES\n";
      grounding.forEach((chunk: any) => {
        if (chunk.web?.uri) content += `- [${chunk.web.title || 'Source'}](${chunk.web.uri})\n`;
      });
    }

    // Step 3: Artifact Generation
    onLog("EXTRACTING EXPLOIT DEFINITIONS & ARTIFACTS...");
    let artifacts: Array<{ name: string; content: string }> = [];

    try {
        const artifactPrompt = `
          CONTEXT: Research phase complete.
          REPORT: ${content.substring(0, 10000)}
          
          TASK: Generate 2-3 technical files related to this threat for our toolkit.
          1. An exploit definition file (JSON)
          2. A detection rule (YARA or SIG)
          3. A patch script (Python/Bash)
          
          OUTPUT: JSON Array: [{"name": "filename", "content": "string"}]
        `;

        const artifactResponse = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: artifactPrompt,
            config: { responseMimeType: 'application/json' }
        });

        artifacts = JSON.parse(artifactResponse.text || "[]");
        artifacts.forEach(a => onLog(`> GENERATED ARTIFACT: ${a.name}`));

    } catch (e) {
        onLog(`WARN: Artifact gen failed: ${(e as Error).message}`);
    }

    return { report: content, artifacts, isUpdate: !!existingIntel };

  } catch (error) {
    if ((error as Error).message === "MISSING_API_KEY") throw error;
    onLog(`CRITICAL FAILURE: ${(error as Error).message}`);
    return { report: existingIntel, artifacts: [], isUpdate: false };
  }
};

export const browseWebsite = async (url: string, onLog: (msg: string) => void) => {
    try {
        const ai = getAiClient();
        onLog(`CONNECTING TO: ${url}...`);
        
        const prompt = `
            ACT AS: A Text-Based Web Browser / Proxy.
            TASK: "Visit" the URL: ${url}.
            
            1. Summarize the MAIN content of the page in clean Markdown.
            2. Extract all interesting hyperlinks in a separate section at the bottom.
            3. If the page seems to be about security exploits, highlight code blocks.
            
            FORMAT:
            # Page Title
            [Content Summary/Article Body]
            
            ## Detected Links
            - [Link Text](url)
        `;

        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: prompt,
            config: { tools: [{ googleSearch: {} }] }
        });
        
        const text = response.text || "Connection closed. No data received.";
        
        // Extract links for the UI to use if needed (naive regex)
        const links: string[] = [];
        const linkRegex = /\[([^\]]+)\]\((https?:\/\/[^\)]+)\)/g;
        let match;
        while ((match = linkRegex.exec(text)) !== null) {
            links.push(match[2]);
        }

        return { content: text, links };

    } catch (error) {
        if ((error as Error).message === "MISSING_API_KEY") throw error;
        return { content: `# Connection Failed\nError reaching ${url}\n${(error as Error).message}`, links: [] };
    }
};

export const performSystemScan = async (exploitDefinitions: string[], onLog: (msg: string) => void): Promise<string> => {
    // Simulating a scan based on the "Knowledge Base" (files in /exploits)
    const ai = getAiClient();
    onLog("INITIALIZING LOCAL VULNERABILITY SCANNER...");
    
    if (exploitDefinitions.length === 0) {
        return "SCAN ABORTED: No exploit definitions found. Run 'research' first to populate the database.";
    }

    onLog(`LOADED ${exploitDefinitions.length} SIGNATURES FROM DATABASE.`);
    
    // We simulate the scan result using AI to generate a plausible report based on the definitions
    const prompt = `
        ACT AS: Vulnerability Scanner Engine.
        DEFINITIONS: ${JSON.stringify(exploitDefinitions)}
        
        TASK: Simulate a scan of a standard Linux server. 
        Based on the definitions provided, generate a Scan Report.
        Randomly determine if the system is VULNERABLE to 1 or 2 of the definitions.
        
        OUTPUT: Text report.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });

    return response.text || "Scan completed. No output.";
};