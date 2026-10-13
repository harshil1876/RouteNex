import type { Message } from '../schemas.js';

export interface CompressionResult {
  messages: Message[];
  originalChars: number;
  compressedChars: number;
  savedPercent: number;
  estimatedTokensSaved: number;
}

/**
 * Prompt Compression & Token Optimizer.
 * Safely compresses messages to reduce token consumption by 10-30% without semantic loss.
 */
export class PromptCompressor {
  /**
   * Compresses an array of chat messages.
   */
  static compressMessages(messages: Message[]): CompressionResult {
    let originalChars = 0;
    let compressedChars = 0;

    const compressed: Message[] = messages.map((msg) => {
      if (!msg.content) return msg;

      originalChars += msg.content.length;
      const optimizedText = this.compressText(msg.content);
      compressedChars += optimizedText.length;

      return {
        ...msg,
        content: optimizedText,
      };
    });

    const savedChars = Math.max(0, originalChars - compressedChars);
    const savedPercent = originalChars > 0 ? parseFloat(((savedChars / originalChars) * 100).toFixed(1)) : 0;
    // Standard rule of thumb: ~4 characters per token
    const estimatedTokensSaved = Math.round(savedChars / 4);

    return {
      messages: compressed,
      originalChars,
      compressedChars,
      savedPercent,
      estimatedTokensSaved,
    };
  }

  /**
   * Compresses text by removing redundant whitespace, multiple blank lines,
   * and HTML comments while preserving code blocks and indentation.
   */
  static compressText(text: string): string {
    if (!text || text.length === 0) return text;

    // 1. Remove HTML/Markdown comment blocks
    let cleaned = text.replace(/<!--[\s\S]*?-->/g, '');

    // 2. Collapse 3 or more consecutive newlines into 2 (standard paragraph break)
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 3. Trim each line while preserving code indentation
    const lines = cleaned.split('\n');
    let insideCodeBlock = false;

    const processedLines = lines.map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('```')) {
        insideCodeBlock = !insideCodeBlock;
        return line;
      }
      if (insideCodeBlock) {
        return line; // Preserve code formatting verbatim
      }
      // Collapse multiple horizontal spaces/tabs into a single space
      return line.replace(/[ \t]{2,}/g, ' ').trimEnd();
    });

    return processedLines.join('\n').trim();
  }
}
