// Tembo agent options
// Valid models: claude-4-5-sonnet, claude-opus-4-5, claude-4-5-haiku
export const TEMBO_AGENTS = [
  { id: 'claudeCode:claude-4-5-sonnet', name: 'Claude Code (Sonnet 4.5)' },
  { id: 'claudeCode:claude-opus-4-5', name: 'Claude Code (Opus 4.5)' },
  { id: 'claudeCode:claude-4-5-haiku', name: 'Claude Code (Haiku 4.5)' },
] as const;

export type TemboAgent = (typeof TEMBO_AGENTS)[number];
