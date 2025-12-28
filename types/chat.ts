/**
 * Chat data models for DeepThink v4.2
 */

export interface Message {
  /** Unique identifier for the message */
  id: string;
  /** Role of the message sender */
  role: 'user' | 'assistant';
  /** The main content/response (markdown supported) */
  content: string;
  /** Raw text extracted from <think>...</think> tags */
  thoughts?: string;
  /** Unix timestamp when message was created */
  timestamp: number;
}

export interface ChatSession {
  /** Unique session identifier */
  id: string;
  /** Session title (auto-generated or user-defined) */
  title: string;
  /** All messages in this session */
  messages: Message[];
  /** Creation timestamp */
  createdAt: number;
  /** Last update timestamp */
  updatedAt: number;
}

/**
 * Parse DeepSeek R1 style response to extract thoughts and content
 * @param rawResponse - The full response string containing <think> tags
 * @returns Object with separated thoughts and content
 */
export function parseR1Response(rawResponse: string): {
  thoughts: string | undefined;
  content: string;
} {
  // Regex to match <think>...</think> blocks (supports multiline)
  const thinkRegex = /<think>([\s\S]*?)<\/think>/gi;
  
  // Extract all think blocks
  const thinkMatches: string[] = [];
  let match: RegExpExecArray | null;
  
  while ((match = thinkRegex.exec(rawResponse)) !== null) {
    thinkMatches.push(match[1].trim());
  }
  
  // Remove think blocks from content
  const content = rawResponse
    .replace(thinkRegex, '')
    .trim();
  
  // Combine all think blocks if multiple exist
  const thoughts = thinkMatches.length > 0 
    ? thinkMatches.join('\n\n') 
    : undefined;
  
  return { thoughts, content };
}

/**
 * Generate a unique message ID
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

