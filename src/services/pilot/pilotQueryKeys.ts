export const pilotQueryKeys = {
  root: ['pilot'] as const,
  programs: () => ['pilot', 'programs'] as const,
  program: (programId?: string | null) => ['pilot', 'program', programId ?? 'none'] as const,
  participant: (userId?: string | null) => ['pilot', 'participant', userId ?? 'anonymous'] as const,
  session: (sessionId?: string | null) => ['pilot', 'session', sessionId ?? 'none'] as const,
  scenarios: (programId?: string | null) => ['pilot', 'scenarios', programId ?? 'none'] as const,
  reports: (scope: string, programId?: string | null, campus?: string | null) =>
    ['pilot', 'reports', scope, programId ?? 'all', campus ?? 'all'] as const,
  report: (reportId?: string | null) => ['pilot', 'report', reportId ?? 'none'] as const,
  events: (reportId?: string | null) => ['pilot', 'events', reportId ?? 'none'] as const,
  notifications: (userId?: string | null) => ['pilot', 'notifications', userId ?? 'anonymous'] as const,
  analytics: (programId?: string | null, campus?: string | null) =>
    ['pilot', 'analytics', programId ?? 'all', campus ?? 'all'] as const,
  admin: (scope: string, programId?: string | null, campus?: string | null) =>
    ['pilot', 'admin', scope, programId ?? 'all', campus ?? 'all'] as const,
} as const;
