#!/usr/bin/env python3
"""Apply deterministic Phase 4 fixes to existing core workflow components.

This is intentionally exact-match based. It fails instead of partially editing a
component when the expected baseline has changed.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: str, old: str, new: str) -> None:
    target = ROOT / path
    content = target.read_text()
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one match, found {count}")
    target.write_text(content.replace(old, new, 1))


# Incident reporting: validate evidence and surface partial upload failures.
replace_once(
    "src/components/student/ReportIncident.tsx",
    "type IncidentCategory = Database['public']['Enums']['incident_category'];\n",
    "type IncidentCategory = Database['public']['Enums']['incident_category'];\n\n"
    "const MAX_EVIDENCE_FILES = 3;\n"
    "const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;\n"
    "const ALLOWED_EVIDENCE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'video/mp4']);\n",
)

replace_once(
    "src/components/student/ReportIncident.tsx",
    "  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {\n"
    "    if (e.target.files) {\n"
    "      setFiles(Array.from(e.target.files));\n"
    "    }\n"
    "  };",
    "  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {\n"
    "    const selected = Array.from(e.target.files || []);\n"
    "    if (selected.length > MAX_EVIDENCE_FILES) {\n"
    "      toast({ title: 'Too many evidence files', description: `Select no more than ${MAX_EVIDENCE_FILES} files.`, variant: 'destructive' });\n"
    "      e.target.value = '';\n"
    "      return;\n"
    "    }\n\n"
    "    const invalid = selected.find((file) => !ALLOWED_EVIDENCE_TYPES.has(file.type) || file.size > MAX_EVIDENCE_BYTES);\n"
    "    if (invalid) {\n"
    "      toast({\n"
    "        title: 'Evidence file not accepted',\n"
    "        description: `${invalid.name} must be JPG, PNG, WebP or MP4 and no larger than 10 MB.`,\n"
    "        variant: 'destructive',\n"
    "      });\n"
    "      e.target.value = '';\n"
    "      return;\n"
    "    }\n\n"
    "    setFiles(selected);\n"
    "  };",
)

replace_once(
    "src/components/student/ReportIncident.tsx",
    "      // Upload media files if any\n"
    "      if (files.length > 0 && incident) {\n"
    "        for (let i = 0; i < files.length; i++) {\n"
    "          const file = files[i];\n"
    "          const fileExt = file.name.split('.').pop();\n"
    "          const fileName = `${incident.id}/${Date.now()}-${i}.${fileExt}`;\n\n"
    "          const { error: uploadError } = await supabase.storage\n"
    "            .from('incident-media')\n"
    "            .upload(fileName, file);\n\n"
    "          if (!uploadError) {\n"
    "            await supabase.from('incident_media').insert({\n"
    "              incident_id: incident.id,\n"
    "              media_url: fileName,\n"
    "              media_type: file.type,\n"
    "              file_size: file.size,\n"
    "            });\n"
    "          }\n\n"
    "          setUploadProgress(((i + 1) / files.length) * 100);\n"
    "        }\n"
    "      }\n\n"
    "      toast({ \n"
    "        title: 'Report submitted successfully!',\n"
    "        description: 'Your incident has been recorded and will be reviewed by campus security.',\n"
    "      });",
    "      const failedEvidence: string[] = [];\n"
    "      if (files.length > 0 && incident) {\n"
    "        for (let i = 0; i < files.length; i++) {\n"
    "          const file = files[i];\n"
    "          const extension = file.name.split('.').pop()?.toLowerCase() || 'bin';\n"
    "          const fileName = `${incident.id}/${crypto.randomUUID()}.${extension}`;\n\n"
    "          const { error: uploadError } = await supabase.storage\n"
    "            .from('incident-media')\n"
    "            .upload(fileName, file, { contentType: file.type, upsert: false });\n\n"
    "          if (uploadError) {\n"
    "            failedEvidence.push(file.name);\n"
    "            setUploadProgress(((i + 1) / files.length) * 100);\n"
    "            continue;\n"
    "          }\n\n"
    "          const { error: metadataError } = await supabase.from('incident_media').insert({\n"
    "            incident_id: incident.id,\n"
    "            media_url: fileName,\n"
    "            media_type: file.type,\n"
    "            file_size: file.size,\n"
    "          });\n\n"
    "          if (metadataError) {\n"
    "            failedEvidence.push(file.name);\n"
    "            await supabase.storage.from('incident-media').remove([fileName]);\n"
    "          }\n\n"
    "          setUploadProgress(((i + 1) / files.length) * 100);\n"
    "        }\n"
    "      }\n\n"
    "      toast({\n"
    "        title: failedEvidence.length ? 'Report submitted with evidence warning' : 'Report submitted successfully!',\n"
    "        description: failedEvidence.length\n"
    "          ? `The report was recorded, but these files were not attached: ${failedEvidence.join(', ')}. Open My Cases before retrying or contact campus security.`\n"
    "          : 'Your incident has been recorded and will be reviewed by campus security.',\n"
    "        variant: failedEvidence.length ? 'destructive' : 'default',\n"
    "      });",
)

replace_once(
    "src/components/student/ReportIncident.tsx",
    '<Input type="file" multiple accept="image/*,video/*" onChange={handleFileChange} className="flex-1" />',
    '<Input id="incident-evidence" type="file" multiple accept="image/jpeg,image/png,image/webp,video/mp4" onChange={handleFileChange} className="flex-1" aria-describedby="incident-evidence-help" />',
)
replace_once(
    "src/components/student/ReportIncident.tsx",
    "              {files.length > 0 && (\n",
    "              <p id=\"incident-evidence-help\" className=\"text-xs text-muted-foreground\">Up to 3 JPG, PNG, WebP or MP4 files; 10 MB maximum per file.</p>\n"
    "              {files.length > 0 && (\n",
)
replace_once(
    "src/components/student/ReportIncident.tsx",
    "              <Switch\n                checked={formData.isAnonymous}",
    "              <Switch\n                aria-label=\"Report anonymously\"\n                checked={formData.isAnonymous}",
)

# My Cases: expose case-update failures and make cards keyboard-operable.
replace_once(
    "src/components/student/MyCaseReports.tsx",
    "    } catch (error) {\n"
    "      console.error('Error fetching case updates:', error);\n"
    "    } finally {",
    "    } catch (error) {\n"
    "      console.error('Error fetching case updates:', error);\n"
    "      setCaseUpdates([]);\n"
    "      toast({ title: 'Case timeline unavailable', description: 'Status updates could not be loaded. Retry by reopening the case.', variant: 'destructive' });\n"
    "    } finally {",
)
replace_once(
    "src/components/student/MyCaseReports.tsx",
    "                  onClick={() => handleViewDetails(incident)}\n                >",
    "                  role=\"button\"\n"
    "                  tabIndex={0}\n"
    "                  aria-label={`Open case ${incident.title}, status ${status.label}`}\n"
    "                  onClick={() => handleViewDetails(incident)}\n"
    "                  onKeyDown={(event) => {\n"
    "                    if (event.key === 'Enter' || event.key === ' ') {\n"
    "                      event.preventDefault();\n"
    "                      handleViewDetails(incident);\n"
    "                    }\n"
    "                  }}\n"
    "                >",
)

# Campus Office: label icon-only and filter controls and announce loading.
replace_once(
    "src/pages/Office.tsx",
    '<Button variant="outline" size="icon" onClick={() => navigate(\'/\')}>',
    '<Button variant="outline" size="icon" onClick={() => navigate(\'/\')} aria-label="Return to portal home">',
)
replace_once(
    "src/pages/Office.tsx",
    '                        placeholder="Search reports..."\n                        value={searchTerm}',
    '                        placeholder="Search reports..."\n                        aria-label="Search incident reports"\n                        value={searchTerm}',
)
replace_once(
    "src/pages/Office.tsx",
    '<SelectTrigger className="w-full md:w-[180px]">\n                      <SelectValue placeholder="Filter by status" />',
    '<SelectTrigger className="w-full md:w-[180px]" aria-label="Filter reports by status">\n                      <SelectValue placeholder="Filter by status" />',
)
replace_once(
    "src/pages/Office.tsx",
    '<SelectTrigger className="w-full md:w-[180px]">\n                      <SelectValue placeholder="Filter by category" />',
    '<SelectTrigger className="w-full md:w-[180px]" aria-label="Filter reports by category">\n                      <SelectValue placeholder="Filter by category" />',
)
replace_once(
    "src/pages/Office.tsx",
    '<div className="flex items-center justify-center py-12">\n                  <Loader2 className="h-8 w-8 animate-spin text-primary" />',
    '<div className="flex items-center justify-center py-12" role="status" aria-label="Loading incident reports">\n                  <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />',
)

print("Applied Phase 4 incident, case and office workflow hardening.")
