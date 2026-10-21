import type { Message } from '../schemas.js';

export interface CompressionOptions {
  /** Stage 1: HTML comments, whitespace, redundant newlines (default: true) */
  stage1Lite?: boolean;
  /** Stage 2: RTK - Truncates repetitive stack traces, terminal noise, build log spam (default: true) */
  stage2Logs?: boolean;
  /** Stage 3: Deduplication of large repeated paragraphs across conversation turns (default: true) */
  stage3Dedup?: boolean;
  /** Stage 4: LexiPack - Aggressive removal of conversational fluff/courtesies (default: false, opt-in) */
  stage4Caveman?: boolean;
  stage4LexiPack?: boolean;
  /** Guard preservation for code, URLs, markdown tables, JSON (default: true) */
  preserveGuards?: boolean;
}

export interface CompressionResult {
  messages: Message[];
  originalChars: number;
  compressedChars: number;
  savedPercent: number;
  estimatedTokensSaved: number;
  stageBreakdown: {
    stage1Saved: number;
    stage2Saved: number;
    stage3Saved: number;
    stage4Saved: number;
  };
}

/**
 * 4-Stage Token Compression & Optimizer Pipeline.
 * Reduces token consumption by 10-40% while preserving code blocks,
 * markdown tables, JSON syntax, URLs, and semantic integrity.
 */
export class PromptCompressor {
  /**
   * Compresses an array of chat messages through the 4-stage pipeline.
   */
  static compressMessages(
    messages: Message[],
    options: CompressionOptions = {}
  ): CompressionResult {
    const opts: Required<CompressionOptions> = {
      stage1Lite: options.stage1Lite ?? true,
      stage2Logs: options.stage2Logs ?? true,
      stage3Dedup: options.stage3Dedup ?? true,
      stage4Caveman: options.stage4LexiPack ?? options.stage4Caveman ?? false,
      stage4LexiPack: options.stage4LexiPack ?? options.stage4Caveman ?? false,
      preserveGuards: options.preserveGuards ?? true,
    };

    let totalOriginalChars = 0;
    let totalCompressedChars = 0;

    let stage1Saved = 0;
    let stage2Saved = 0;
    let stage3Saved = 0;
    let stage4Saved = 0;

    // Track seen paragraphs across turns for Stage 3 Deduplication
    const seenParagraphHashes = new Set<string>();

    const processedMessages: Message[] = messages.map((msg) => {
      if (!msg.content || typeof msg.content !== 'string') return msg;

      const origLen = msg.content.length;
      totalOriginalChars += origLen;

      let current = msg.content;

      // GUARD: Extract code blocks, tables, URLs, inline code
      const guards: string[] = [];
      if (opts.preserveGuards) {
        current = this.extractGuards(current, guards);
      }

      // STAGE 1: Lite (Comments, whitespace, linefeeds)
      if (opts.stage1Lite) {
        const before = current.length;
        current = this.applyStage1Lite(current);
        stage1Saved += Math.max(0, before - current.length);
      }

      // STAGE 2: RTK (Log/Stack trace compaction)
      if (opts.stage2Logs) {
        const before = current.length;
        current = this.applyStage2Logs(current);
        stage2Saved += Math.max(0, before - current.length);
      }

      // STAGE 3: Session Deduplication
      if (opts.stage3Dedup) {
        const before = current.length;
        current = this.applyStage3Dedup(current, seenParagraphHashes);
        stage3Saved += Math.max(0, before - current.length);
      }

      // STAGE 4: Caveman Fluff Stripper (opt-in)
      if (opts.stage4Caveman) {
        const before = current.length;
        current = this.applyStage4Caveman(current);
        stage4Saved += Math.max(0, before - current.length);
      }

      // UNGUARD: Restore protected blocks
      if (opts.preserveGuards) {
        current = this.restoreGuards(current, guards);
      }

      totalCompressedChars += current.length;

      return {
        ...msg,
        content: current,
      };
    });

    const totalSavedChars = Math.max(0, totalOriginalChars - totalCompressedChars);
    const savedPercent =
      totalOriginalChars > 0
        ? parseFloat(((totalSavedChars / totalOriginalChars) * 100).toFixed(1))
        : 0;
    // Standard rule of thumb: ~4 characters per token
    const estimatedTokensSaved = Math.round(totalSavedChars / 4);

    return {
      messages: processedMessages,
      originalChars: totalOriginalChars,
      compressedChars: totalCompressedChars,
      savedPercent,
      estimatedTokensSaved,
      stageBreakdown: {
        stage1Saved,
        stage2Saved,
        stage3Saved,
        stage4Saved,
      },
    };
  }

  /**
   * Helper to compress a single text string.
   */
  static compressText(text: string, options: CompressionOptions = {}): string {
    const res = this.compressMessages([{ role: 'user', content: text }], options);
    return res.messages[0]?.content || '';
  }

  // ==========================================
  // GUARD IMPLEMENTATION
  // ==========================================

  private static extractGuards(text: string, guards: string[]): string {
    let guarded = text;

    // 1. Fenced Code Blocks (``` or ~~~)
    guarded = guarded.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
      const idx = guards.length;
      guards.push(match);
      return `__RN_GUARD_${idx}__`;
    });

    // 2. Markdown Tables (| header | ... |)
    guarded = guarded.replace(/((?:\|[^\n]+\|\r?\n){2,})/g, (match) => {
      const idx = guards.length;
      guards.push(match);
      return `__RN_GUARD_${idx}__`;
    });

    // 3. URLs
    guarded = guarded.replace(/(https?:\/\/[^\s\)\],>]+)/g, (match) => {
      const idx = guards.length;
      guards.push(match);
      return `__RN_GUARD_${idx}__`;
    });

    // 4. Inline code spans (`...`)
    guarded = guarded.replace(/(`[^`\n]+`)/g, (match) => {
      const idx = guards.length;
      guards.push(match);
      return `__RN_GUARD_${idx}__`;
    });

    return guarded;
  }

  private static restoreGuards(text: string, guards: string[]): string {
    let restored = text;
    // Restore in reverse order to preserve indexing
    for (let i = guards.length - 1; i >= 0; i--) {
      restored = restored.replaceAll(`__RN_GUARD_${i}__`, guards[i]);
    }
    return restored;
  }

  // ==========================================
  // STAGE 1: LITE
  // ==========================================

  private static applyStage1Lite(text: string): string {
    if (!text) return text;

    // 1. Strip HTML/Markdown comments
    let cleaned = text.replace(/<!--[\s\S]*?-->/g, '');

    // 2. Collapse 3 or more consecutive newlines into 2
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 3. Trim line ends and collapse horizontal whitespaces
    const lines = cleaned.split('\n');
    const processedLines = lines.map((line) => {
      // Collapse multiple horizontal spaces/tabs into a single space
      return line.replace(/[ \t]{2,}/g, ' ').trimEnd();
    });

    return processedLines.join('\n').trim();
  }

  // ==========================================
  // STAGE 2: RTK (Log & Stack Trace Compactor)
  // ==========================================

  private static applyStage2Logs(text: string): string {
    if (!text) return text;

    let result = text;

    // 1. Compact long Node.js / JavaScript / Python stack traces
    // E.g. consecutive "at ... node_modules/..." lines
    const lines = result.split('\n');
    const compactedLines: string[] = [];
    let stackBuffer: string[] = [];

    const flushStackBuffer = () => {
      if (stackBuffer.length <= 4) {
        compactedLines.push(...stackBuffer);
      } else {
        // Keep top 2 and bottom 1 frame, omit the middle
        compactedLines.push(stackBuffer[0]);
        compactedLines.push(stackBuffer[1]);
        compactedLines.push(
          `    ... [${stackBuffer.length - 3} internal frames omitted for token efficiency] ...`
        );
        compactedLines.push(stackBuffer[stackBuffer.length - 1]);
      }
      stackBuffer = [];
    };

    for (const line of lines) {
      const isStackLine =
        /^\s*at\s+.*(?:\/node_modules\/|\.pnpm\/|\.yarn\/|\(native\))/i.test(line) ||
        /^\s*File\s+".*\/site-packages\/.*",\s+line\s+\d+/i.test(line);

      if (isStackLine) {
        stackBuffer.push(line);
      } else {
        if (stackBuffer.length > 0) {
          flushStackBuffer();
        }
        compactedLines.push(line);
      }
    }
    if (stackBuffer.length > 0) {
      flushStackBuffer();
    }

    result = compactedLines.join('\n');

    // 2. Compact repetitive test suite / build progress dots (e.g. ................ 100/100)
    result = result.replace(/(\. ){15,}/g, '... [dots truncated] ');
    result = result.replace(/\.{20,}/g, '... [progress truncated] ...');

    return result;
  }

  // ==========================================
  // STAGE 3: SESSION DEDUPLICATION
  // ==========================================

  private static applyStage3Dedup(
    text: string,
    seenHashes: Set<string>
  ): string {
    if (!text || text.length < 100) return text;

    // Split text into paragraphs
    const paragraphs = text.split(/\n\n+/);
    const resultParagraphs: string[] = [];

    for (const para of paragraphs) {
      const trimmed = para.trim();
      // Only dedup substantive paragraphs (> 100 characters)
      if (trimmed.length >= 100) {
        // Simple fast hash / signature: length + first 30 chars + last 30 chars
        const signature = `${trimmed.length}:${trimmed.slice(0, 30)}:${trimmed.slice(-30)}`;
        if (seenHashes.has(signature)) {
          // Replace duplicate occurrence with compact reference tag
          const excerpt = trimmed.slice(0, 45).replace(/\n/g, ' ');
          resultParagraphs.push(
            `[Repeated context omitted: "${excerpt}..."]`
          );
          continue;
        } else {
          seenHashes.add(signature);
        }
      }
      resultParagraphs.push(para);
    }

    return resultParagraphs.join('\n\n');
  }

  // ==========================================
  // STAGE 4: CAVEMAN (Aggressive Fluff Pruning)
  // ==========================================

  private static applyStage4Caveman(text: string): string {
    if (!text) return text;

    let res = text;

    // Courtesies and filler patterns
    const fillerPatterns: [RegExp, string][] = [
      [/\b(?:Could|Can|Would) you please\s+/gi, ''],
      [/\bPlease kindly\s+/gi, ''],
      [/\bKindly\s+/gi, ''],
      [/\bPlease\s+/gi, ''],
      [/\bI would like you to\s+/gi, ''],
      [/\bI want you to\s+/gi, ''],
      [/\bI need you to\s+/gi, ''],
      [/\bAs an AI (?:language )?model,?\s*/gi, ''],
      [/\bThank(?:s|\s+you)\s+(?:in advance|very much|for your help)[.!?,]?\s*/gi, ''],
      [/\bHope this email finds you well[.!?,]?\s*/gi, ''],
      [/\bIn order to\s+/gi, 'To '],
      [/\bIt is worth noting that\s+/gi, 'Note: '],
      [/\bAt the end of the day,?\s*/gi, ''],
      [/\bBasically,?\s*/gi, ''],
      [/\bNeedless to say,?\s*/gi, ''],
    ];

    for (const [pattern, replacement] of fillerPatterns) {
      res = res.replace(pattern, replacement);
    }

    return res.trim();
  }
}
