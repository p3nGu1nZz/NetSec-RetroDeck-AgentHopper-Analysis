import { GoogleGenAI } from "@google/genai";
import { AGENT_HOPPER_CONTEXT } from "../constants";

const getAiClient = () => {
  if (!process.env.API_KEY) {
    throw new Error("API Key not found");
  }
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

export const generateDocument = async (
  filename: string,
  promptTopic: string
): Promise<string> => {
  try {
    const ai = getAiClient();
    const fullPrompt = `
      ${AGENT_HOPPER_CONTEXT}
      
      ACT AS: A Senior Cybersecurity Researcher and Software Architect.
      TASK: Write a detailed technical document in Markdown format for the file: "${filename}".
      TOPIC: ${promptTopic}
      
      REQUIREMENTS:
      - Use professional technical language.
      - Include code snippets where relevant (Python, Bash, or Pseudo-code).
      - Focus on the 'AgentHopper' exploit mechanics and defenses.
      - Return ONLY the markdown content.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: fullPrompt,
    });

    return response.text || "Error generating content.";
  } catch (error) {
    console.error("Gemini Gen Error:", error);
    return `# Error\nFailed to generate ${filename}.\n\nDebug: ${(error as Error).message}`;
  }
};

export const generateAntiVirusCode = async (): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `
      ${AGENT_HOPPER_CONTEXT}
      
      ACT AS: A Security Engineer.
      TASK: Create a Python script that acts as a basic "Anti-Virus" or "IDS" (Intrusion Detection System) signature for AgentHopper-like behaviors.
      
      The script should:
      1. Monitor for suspicious shell history containing LLM prompts.
      2. Check for high-frequency API calls to known LLM endpoints from non-browser processes.
      3. Scan for "self-replicating" scripts.
      
      Output ONLY valid Python code.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'text/x-python'
      }
    });

    return response.text || "# Error generating code";
  } catch (error) {
    return `# Error generating AV code: ${(error as Error).message}`;
  }
};

export const conductDeepResearch = async (): Promise<string> => {
  try {
    const ai = getAiClient();
    const prompt = `
      ${AGENT_HOPPER_CONTEXT}

      ACT AS: A Threat Intelligence Analyst.
      TASK: Perform a deep research analysis on the current state of autonomous AI worms like AgentHopper.
      
      ACTIONS:
      1. Search for recent analyses, blog posts, or whitepapers regarding "AgentHopper" or "Morris II" or "AI Worms".
      2. Identify new potential attack vectors not covered in standard PoCs.
      3. Propose a specific "Patch" or counter-measure strategy.
      
      OUTPUT:
      - A comprehensive Markdown report titled "DEEP DIVE: AI-WORM EVOLUTION".
      - Include a section "INTERNET RECONNAISSANCE" listing findings.
      - Include a section "PATCH STRATEGY".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Using Pro for complex reasoning + search
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    let content = response.text || "No intelligence gathered.";
    
    // Extract Grounding Metadata if available
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (groundingChunks && groundingChunks.length > 0) {
      content += "\n\n## VERIFIED SOURCES\n";
      groundingChunks.forEach((chunk: any) => {
        if (chunk.web?.uri && chunk.web?.title) {
          content += `- [${chunk.web.title}](${chunk.web.uri})\n`;
        }
      });
    }

    return content;
  } catch (error) {
    console.error("Deep Research Error:", error);
    return `# Research Failed\n\nCould not complete deep dive.\nError: ${(error as Error).message}`;
  }
};