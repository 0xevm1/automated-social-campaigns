import { CampaignBriefSchema } from '@asc/shared/schemas/campaign-brief';

export interface ValidationError {
  path: string;
  message: string;
  line?: number;
}

/**
 * Find the line number of a JSON path (e.g. "products.0.name") in pretty-printed JSON.
 * Walks segments and searches for the matching key from the current position forward.
 */
function findLineForPath(json: string, path: string): number | undefined {
  if (!path) return undefined;

  const segments = path.split('.');
  const lines = json.split('\n');
  let lineIdx = 0;

  for (const seg of segments) {
    const isIndex = /^\d+$/.test(seg);
    if (isIndex) {
      // For array indices, skip past opening brackets until we reach the nth element
      let depth = 0;
      let count = -1;
      const target = Number(seg);
      for (let i = lineIdx; i < lines.length; i++) {
        const trimmed = lines[i].trim();
        if (depth === 0 && (trimmed.startsWith('[') || trimmed.startsWith('{'))) {
          depth = 1;
          // If the opening bracket also has content, count it
          if (trimmed.length > 1 && !trimmed.endsWith('[') && !trimmed.endsWith('{')) {
            count++;
            if (count === target) { lineIdx = i; break; }
          }
          continue;
        }
        if (depth >= 1) {
          if (trimmed.startsWith('{') || trimmed.startsWith('[')) depth++;
          if (trimmed === '}' || trimmed === '},' || trimmed === ']' || trimmed === '],') depth--;
          if (depth === 1 && (trimmed.startsWith('{') || trimmed.startsWith('"') || trimmed.startsWith('['))) {
            count++;
            if (count === target) { lineIdx = i; break; }
          }
        }
      }
    } else {
      // For named keys, find the line with `"key":` starting from current position
      const keyPattern = `"${seg}"`;
      for (let i = lineIdx; i < lines.length; i++) {
        if (lines[i].includes(keyPattern) && lines[i].includes(':')) {
          lineIdx = i;
          break;
        }
      }
    }
  }

  return lineIdx + 1; // 1-based
}

export function getJsonParseErrorLine(error: unknown): number | undefined {
  if (!(error instanceof SyntaxError)) return undefined;
  // Most engines include "at position N" or "at line N column M"
  const lineMatch = error.message.match(/line (\d+)/i);
  if (lineMatch) return Number(lineMatch[1]);

  const posMatch = error.message.match(/position (\d+)/i);
  if (posMatch) return undefined; // position alone isn't a line number
  return undefined;
}

export function getJsonParseErrorPosition(json: string, error: unknown): number | undefined {
  if (!(error instanceof SyntaxError)) return undefined;
  const posMatch = error.message.match(/position (\d+)/i);
  if (!posMatch) return getJsonParseErrorLine(error);

  // Convert character position to line number
  const pos = Number(posMatch[1]);
  let line = 1;
  for (let i = 0; i < pos && i < json.length; i++) {
    if (json[i] === '\n') line++;
  }
  return line;
}

export function validateBrief(data: unknown, json?: string) {
  const result = CampaignBriefSchema.safeParse(data);

  if (result.success) {
    return { success: true as const, data: result.data, errors: null };
  }

  const errors: ValidationError[] = result.error.issues.map((issue) => {
    const path = issue.path.join('.');
    return {
      path,
      message: issue.message,
      line: json ? findLineForPath(json, path) : undefined,
    };
  });

  return { success: false as const, data: null, errors };
}
