import type { NormalizedHookPayload } from './types.js';

export function parseHookPayload(
  rawInput: string,
  runtime: 'claude-code' | 'antigravity' | 'generic' = 'claude-code',
  fallbackRole?: string,
): NormalizedHookPayload {
  let json: Record<string, unknown> = {};
  try {
    const trimmed = rawInput.trim();
    if (trimmed) {
      json = JSON.parse(trimmed) as Record<string, unknown>;
    }
  } catch {
    // Malformed JSON should not block execution
    return {
      runtime,
      role: fallbackRole ?? 'unknown',
      raw: {},
    };
  }

  // Claude Code Payload Shape
  if (runtime === 'claude-code' || json.tool_input || json.hook_event_name) {
    const role =
      (json.agent_type as string) || (json.agent_name as string) || fallbackRole || 'unknown';

    const toolInput = (json.tool_input as Record<string, unknown>) || {};
    const filePath =
      (toolInput.file_path as string) ||
      (toolInput.notebook_path as string) ||
      (toolInput.TargetFile as string) ||
      undefined;

    const edits = toolInput.edits as Array<{ new_string?: string }> | undefined;
    const replacementChunks = toolInput.ReplacementChunks as
      | Array<{ ReplacementContent?: string }>
      | undefined;

    const contentParts = [
      toolInput.content as string | undefined,
      toolInput.new_string as string | undefined,
      toolInput.CodeContent as string | undefined,
      ...(edits ? edits.map((e) => e.new_string) : []),
      ...(replacementChunks ? replacementChunks.map((c) => c.ReplacementContent) : []),
    ].filter(Boolean);

    const command = (toolInput.command as string) || (toolInput.CommandLine as string) || undefined;

    return {
      runtime: 'claude-code',
      eventName: json.hook_event_name as string | undefined,
      role,
      sessionId: json.session_id as string | undefined,
      filePath,
      content: contentParts.join('\n'),
      command,
      raw: json,
    };
  }

  // Antigravity / Gemini Payload Shape
  if (runtime === 'antigravity' || json.toolSummary || json.toolAction) {
    const filePath =
      (json.TargetFile as string) ||
      (json.AbsolutePath as string) ||
      (json.SearchPath as string) ||
      undefined;

    const content = (json.CodeContent as string) || undefined;
    const command = (json.CommandLine as string) || undefined;

    return {
      runtime: 'antigravity',
      role: fallbackRole || 'unknown',
      filePath,
      content,
      command,
      raw: json,
    };
  }

  return {
    runtime: 'generic',
    role: fallbackRole || 'unknown',
    raw: json,
  };
}
