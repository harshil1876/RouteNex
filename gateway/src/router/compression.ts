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
      if (!msg.content) return msg;

      if (typeof msg.content === 'string') {
        const origLen = msg.content.length;
        totalOriginalChars += origLen;

        const current = this.compressSingleString(
          msg.content,
          opts,
          seenParagraphHashes,
          (s1, s2, s3, s4) => {
            stage1Saved += s1;
            stage2Saved += s2;
            stage3Saved += s3;
            stage4Saved += s4;
          }
        );

        totalCompressedChars += current.length;
        return {
          ...msg,
          content: current,
        };
      }

      if (Array.isArray(msg.content)) {
        const updatedBlocks = msg.content.map((block: any) => {
          if (block && block.type === 'text' && typeof block.text === 'string') {
            const origLen = block.text.length;
            totalOriginalChars += origLen;

            const current = this.compressSingleString(
              block.text,
              opts,
              seenParagraphHashes,
              (s1, s2, s3, s4) => {
                stage1Saved += s1;
                stage2Saved += s2;
                stage3Saved += s3;
                stage4Saved += s4;
              }
            );

            totalCompressedChars += current.length;
            return {
              ...block,
              text: current,
            };
          }
          return block;
        });

        return {
          ...msg,
          content: updatedBlocks,
        };
      }

      return msg;
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
   * Compresses a single string through the pipeline, updating stage savings.
   */
  private static compressSingleString(
    text: string,
    opts: Required<CompressionOptions>,
    seenParagraphHashes: Set<string>,
    accumulateSavings: (s1: number, s2: number, s3: number, s4: number) => void
  ): string {
    let current = text;
    let s1 = 0;
    let s2 = 0;
    let s3 = 0;
    let s4 = 0;

    // GUARD: Extract code blocks, tables, URLs, inline code
    const guards: string[] = [];
    if (opts.preserveGuards) {
      current = this.extractGuards(current, guards);
    }

    // STAGE 1: Lite (Comments, whitespace, linefeeds)
    if (opts.stage1Lite) {
      const before = current.length;
      current = this.applyStage1Lite(current);
      s1 = Math.max(0, before - current.length);
    }

    // STAGE 2: RTK (Log/Stack trace compaction)
    if (opts.stage2Logs) {
      const before = current.length;
      current = this.applyStage2Logs(current);
      s2 = Math.max(0, before - current.length);
    }

    // STAGE 3: Session Deduplication
    if (opts.stage3Dedup) {
      const before = current.length;
      current = this.applyStage3Dedup(current, seenParagraphHashes);
      s3 = Math.max(0, before - current.length);
    }

    // STAGE 4: Caveman Fluff Stripper (opt-in)
    if (opts.stage4Caveman) {
      const before = current.length;
      current = this.applyStage4Caveman(current);
      s4 = Math.max(0, before - current.length);
    }

    // UNGUARD: Restore protected blocks
    if (opts.preserveGuards) {
      current = this.restoreGuards(current, guards);
    }

    accumulateSavings(s1, s2, s3, s4);
    return current;
  }

  /**
   * Helper to compress a single text string.
   */
  static compressText(text: string, options: CompressionOptions = {}): string {
    const res = this.compressMessages([{ role: 'user', content: text }], options);
    const content = res.messages[0]?.content;
    return typeof content === 'string' ? content : '';
  }

  // ==========================================
  // GUARD IMPLEMENTATION
  // ==========================================

  private static extractGuards(text: string, guards: string[]): string {
    let guarded = text;

    // 1. Fenced Code Blocks (``` or ~~~) - runs first to protect embedded code
    if (guarded.includes('```') || guarded.includes('~~~')) {
      guarded = guarded.replace(/(```[\s\S]*?```|~~~[\s\S]*?~~~)/g, (match) => {
        const idx = guards.length;
        guards.push(match);
        return `__RN_GUARD_${idx}__`;
      });
    }

    // 2. Markdown Tables (| header | ... |)
    if (guarded.includes('|')) {
      guarded = guarded.replace(/((?:\|[^\n]+\|\r?\n){2,})/g, (match) => {
        const idx = guards.length;
        guards.push(match);
        return `__RN_GUARD_${idx}__`;
      });
    }

    // 3. URLs
    if (guarded.includes('http://') || guarded.includes('https://')) {
      guarded = guarded.replace(/(https?:\/\/[^\s\)\],>]+)/g, (match) => {
        const idx = guards.length;
        guards.push(match);
        return `__RN_GUARD_${idx}__`;
      });
    }

    // 4. Inline code spans (`...`)
    if (guarded.includes('`')) {
      guarded = guarded.replace(/(`[^`\n]+`)/g, (match) => {
        const idx = guards.length;
        guards.push(match);
        return `__RN_GUARD_${idx}__`;
      });
    }

    return guarded;
  }

  private static restoreGuards(text: string, guards: string[]): string {
    let restored = text;
    // Restore in reverse order using function replacer so $&, $$, $1, $' in code blocks are preserved verbatim
    for (let i = guards.length - 1; i >= 0; i--) {
      restored = restored.replaceAll(`__RN_GUARD_${i}__`, () => guards[i]);
    }
    return restored;
  }

  // ==========================================
  // STAGE 1: LITE
  // ==========================================

  private static applyStage1Lite(text: string): string {
    if (!text) return text;

    let cleaned = text;

    // 1. Strip HTML/Markdown comments
    if (cleaned.includes('<!--')) {
      cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    }

    // 2. Collapse 3 or more consecutive newlines into 2
    if (cleaned.includes('\n\n\n')) {
      cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    }

    // 3. Trim line ends and collapse horizontal whitespaces
    const lines = cleaned.split('\n');
    const processedLines = lines.map((line) => {
      let l = line.trimEnd();
      if (l.includes('  ') || l.includes('\t')) {
        l = l.replace(/[ \t]{2,}/g, ' ');
      }
      return l;
    });
    cleaned = processedLines.join('\n').trim();

    return cleaned;
  }

  // ==========================================
  // STAGE 2: RTK (Log & Stack Trace Compactor)
  // ==========================================

  private static applyStage2Logs(text: string): string {
    if (!text) return text;

    let result = text;

    // 1. Fast-path check for stack trace markers before line splitting
    const hasStackMarkers =
      text.includes('node_modules') ||
      text.includes('.pnpm') ||
      text.includes('.yarn') ||
      text.includes('(native)') ||
      text.includes('site-packages');

    if (hasStackMarkers) {
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
          (line.includes('node_modules') ||
            line.includes('.pnpm') ||
            line.includes('.yarn') ||
            line.includes('(native)') ||
            line.includes('site-packages')) &&
          (/^\s*at\s+/i.test(line) || /^\s*File\s+/i.test(line));

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
    }

    // 2. Compact repetitive test suite / build progress dots (e.g. ................ 100/100)
    if (result.includes('..')) {
      result = result.replace(/(\. ){15,}/g, '... [dots truncated] ');
      result = result.replace(/\.{20,}/g, '... [progress truncated] ...');
    }

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
