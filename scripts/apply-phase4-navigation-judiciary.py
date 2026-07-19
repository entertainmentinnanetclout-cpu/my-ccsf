#!/usr/bin/env python3
"""Repair profile deep links, global navigation labels, and staff judiciary data flow."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str, label: str) -> None:
    target = ROOT / path
    content = target.read_text()
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{path} / {label}: expected one match, found {count}")
    target.write_text(content.replace(old, new, 1))


replace_once(
    "src/pages/Dashboard.tsx",
    "import { useState, useEffect } from 'react';\n",
    "import { useState, useEffect } from 'react';\nimport { useLocation } from 'react-router-dom';\n",
    "import location",
)
replace_once(
    "src/pages/Dashboard.tsx",
    "const Dashboard = () => {\n  const { user, signOut } = useAuth();\n  const [activeView, setActiveView] = useState<'home' | 'report' | 'mycases' | 'map' | 'messages'>('home');\n",
    "const STUDENT_VIEWS = new Set(['home', 'report', 'mycases', 'map', 'messages']);\n\nconst Dashboard = () => {\n  const { user, signOut } = useAuth();\n  const location = useLocation();\n  const requestedView = new URLSearchParams(location.search).get('tab');\n  const [activeView, setActiveView] = useState<'home' | 'report' | 'mycases' | 'map' | 'messages'>(\n    requestedView && STUDENT_VIEWS.has(requestedView) ? requestedView as 'home' | 'report' | 'mycases' | 'map' | 'messages' : 'home',\n  );\n",
    "initialise dashboard from query",
)
replace_once(
    "src/pages/Dashboard.tsx",
    "  useEffect(() => {\n    let cancelled = false;\n\n    const checkProfile = async () => {\n",
    "  useEffect(() => {\n    const tab = new URLSearchParams(location.search).get('tab');\n    if (tab && STUDENT_VIEWS.has(tab)) {\n      setActiveView(tab as typeof activeView);\n    }\n  }, [location.search]);\n\n  useEffect(() => {\n    let cancelled = false;\n\n    const checkProfile = async () => {\n",
    "respond to dashboard query changes",
)

replace_once(
    "src/components/shared/Navigation.tsx",
    '<Button variant="outline" size="icon"><Menu className="h-4 w-4" /></Button>',
    '<Button variant="outline" size="icon" aria-label="Open portal navigation"><Menu className="h-4 w-4" aria-hidden="true" /></Button>',
    "label navigation menu",
)

# Profile load failure and retry.
replace_once(
    "src/pages/Profile.tsx",
    "  const [loading, setLoading] = useState(true);\n  const [saving, setSaving] = useState(false);\n",
    "  const [loading, setLoading] = useState(true);\n  const [profileError, setProfileError] = useState<string | null>(null);\n  const [reloadToken, setReloadToken] = useState(0);\n  const [saving, setSaving] = useState(false);\n",
    "add profile error state",
)
replace_once(
    "src/pages/Profile.tsx",
    "    const fetchProfile = async () => {\n      if (!user) {\n",
    "    const fetchProfile = async () => {\n      setLoading(true);\n      setProfileError(null);\n      if (!user) {\n",
    "reset profile load state",
)
replace_once(
    "src/pages/Profile.tsx",
    "      if (error) {\n        console.error('Error fetching profile:', error);\n        toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' });\n      } else if (data) {\n",
    "      if (error) {\n        console.error('Error fetching profile:', error);\n        setProfileError('Your profile could not be loaded.');\n        toast({ title: 'Profile unavailable', description: error.message, variant: 'destructive' });\n      } else if (data) {\n",
    "surface profile load failure",
)
replace_once(
    "src/pages/Profile.tsx",
    "  }, [user, navigate, toast]);\n",
    "  }, [user, navigate, toast, reloadToken]);\n",
    "allow profile retry",
)
replace_once(
    "src/pages/Profile.tsx",
    "  if (loading) {\n    return (\n      <div className=\"min-h-screen bg-background flex items-center justify-center\">\n        <Loader2 className=\"h-8 w-8 animate-spin text-primary\" />\n      </div>\n    );\n  }\n\n  return (",
    "  if (loading) {\n    return (\n      <div className=\"flex min-h-screen items-center justify-center bg-background\" role=\"status\" aria-label=\"Loading profile\">\n        <Loader2 className=\"h-8 w-8 animate-spin text-primary\" aria-hidden=\"true\" />\n      </div>\n    );\n  }\n\n  if (profileError) {\n    return (\n      <div className=\"flex min-h-screen items-center justify-center bg-background p-4\" role=\"alert\">\n        <Card className=\"w-full max-w-lg p-8 text-center\">\n          <AlertCircle className=\"mx-auto mb-3 h-10 w-10 text-destructive\" aria-hidden=\"true\" />\n          <h1 className=\"text-xl font-semibold\">Profile unavailable</h1>\n          <p className=\"mt-2 text-sm text-muted-foreground\">{profileError}</p>\n          <div className=\"mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center\">\n            <Button onClick={() => setReloadToken((value) => value + 1)}>Retry</Button>\n            <Button variant=\"outline\" onClick={() => navigate(userRole === 'admin' ? '/admin' : userRole === 'security' ? '/security' : '/dashboard')}>Return to portal</Button>\n          </div>\n        </Card>\n      </div>\n    );\n  }\n\n  return (",
    "render profile failure state",
)

# Judiciary: convert student-only post-filter into authorised RLS staff view.
replace_once(
    "src/pages/Judiciary.tsx",
    "import { Shield, Home, Gavel, Calendar, Clock, User, FileText, AlertCircle, Loader2 } from 'lucide-react';",
    "import { Home, Gavel, Calendar, Clock, User, FileText, AlertCircle, Loader2, RefreshCw } from 'lucide-react';",
    "update judiciary icons",
)
replace_once(
    "src/pages/Judiciary.tsx",
    "  const { user } = useAuth();\n  const [caseUpdates, setCaseUpdates] = useState<CaseUpdate[]>([]);\n  const [loading, setLoading] = useState(true);\n",
    "  const { user, userRole } = useAuth();\n  const [caseUpdates, setCaseUpdates] = useState<CaseUpdate[]>([]);\n  const [loading, setLoading] = useState(true);\n  const [error, setError] = useState<string | null>(null);\n",
    "add judiciary role and error state",
)
replace_once(
    "src/pages/Judiciary.tsx",
    "  useEffect(() => {\n    if (user) {\n      fetchCaseUpdates();\n    }\n  }, [user]);\n",
    "  useEffect(() => {\n    if (!user) return;\n    void fetchCaseUpdates();\n\n    const channel = supabase\n      .channel(`judiciary-case-updates-${user.id}`)\n      .on('postgres_changes', { event: '*', schema: 'public', table: 'case_updates' }, () => void fetchCaseUpdates())\n      .subscribe((status) => {\n        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {\n          setError('Live judiciary updates are temporarily unavailable.');\n        }\n      });\n\n    return () => {\n      void supabase.removeChannel(channel);\n    };\n  }, [user]);\n",
    "add judiciary realtime refresh",
)

start_path = ROOT / "src/pages/Judiciary.tsx"
content = start_path.read_text()
start = content.index("  const fetchCaseUpdates = async () => {")
end = content.index("\n  const getUpdateTypeColor", start)
old = content[start:end]
new = """  const fetchCaseUpdates = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    const { data: updates, error: updatesError } = await supabase
      .from('case_updates')
      .select('id, incident_id, title, description, update_type, scheduled_date, created_at')
      .order('created_at', { ascending: false });

    if (updatesError) {
      setError('Judiciary case updates could not be loaded.');
      setLoading(false);
      return;
    }

    const incidentIds = [...new Set((updates || []).map((update) => update.incident_id))];
    if (incidentIds.length === 0) {
      setCaseUpdates([]);
      setLoading(false);
      return;
    }

    const { data: incidents, error: incidentsError } = await supabase
      .from('incidents')
      .select('id, title, status')
      .in('id', incidentIds);

    if (incidentsError) {
      setError('Related incident details could not be loaded.');
      setLoading(false);
      return;
    }

    const incidentsMap = new Map((incidents || []).map((incident) => [incident.id, incident]));
    setCaseUpdates((updates || []).map((update) => ({
      ...update,
      incident: incidentsMap.get(update.incident_id),
    })));
    setLoading(false);
  };"""
content = content[:start] + new + content[end:]
start_path.write_text(content)

replace_once(
    "src/pages/Judiciary.tsx",
    '<Button variant="outline" size="icon" onClick={() => navigate(\'/\')}>\n              <Home className="h-5 w-5" />',
    '<Button variant="outline" size="icon" aria-label="Return to staff portal" onClick={() => navigate(userRole === \'admin\' ? \'/admin\' : \'/security\')}>\n              <Home className="h-5 w-5" aria-hidden="true" />',
    "fix judiciary home destination",
)
replace_once(
    "src/pages/Judiciary.tsx",
    "        ) : loading ? (\n          <div className=\"flex items-center justify-center py-12\">\n            <Loader2 className=\"h-8 w-8 animate-spin text-primary\" />\n          </div>\n        ) : (",
    "        ) : loading ? (\n          <div className=\"flex items-center justify-center py-12\" role=\"status\" aria-label=\"Loading judiciary case updates\">\n            <Loader2 className=\"h-8 w-8 animate-spin text-primary\" aria-hidden=\"true\" />\n          </div>\n        ) : error ? (\n          <Card className=\"p-8 text-center\" role=\"alert\">\n            <AlertCircle className=\"mx-auto mb-3 h-10 w-10 text-destructive\" aria-hidden=\"true\" />\n            <h2 className=\"font-semibold\">Judiciary portal unavailable</h2>\n            <p className=\"mt-1 text-sm text-muted-foreground\">{error}</p>\n            <Button variant=\"outline\" className=\"mt-4 gap-2\" onClick={() => void fetchCaseUpdates()}>\n              <RefreshCw className=\"h-4 w-4\" aria-hidden=\"true\" /> Retry\n            </Button>\n          </Card>\n        ) : (",
    "add judiciary recovery state",
)
replace_once(
    "src/pages/Judiciary.tsx",
    "                     There are no updates for your reported incidents yet.\n",
    "                     No judiciary updates are currently available within your authorised campus scope.\n",
    "correct judiciary empty copy",
)
replace_once(
    "src/pages/Judiciary.tsx",
    "                     You have no upcoming hearings scheduled.\n",
    "                     No upcoming hearings are currently scheduled within your authorised campus scope.\n",
    "correct judiciary hearing copy",
)

print("Applied Phase 4 navigation, profile and judiciary fixes.")
