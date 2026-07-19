#!/usr/bin/env python3
"""Remove dead staff-chat controls and make primary chat actions failure-aware."""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PATH = ROOT / "src/components/admin/StaffCommunication.tsx"


def replace_once(content: str, old: str, new: str, label: str) -> str:
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one match, found {count}")
    return content.replace(old, new, 1)


content = PATH.read_text()

content = replace_once(
    content,
    "  File, X, Check, CheckCheck, \n  Phone, Video, MoreVertical, Camera,\n  UserPlus, Settings, Hash, Lock\n",
    "  File, X, Check, CheckCheck, Camera,\n  UserPlus, Hash, Lock, AlertCircle, RefreshCw\n",
    "remove unsupported call/video/settings icons",
)
content = replace_once(
    content,
    "import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';\n",
    "",
    "remove unused settings menu import",
)
content = replace_once(
    content,
    "  const [loading, setLoading] = useState(true);\n",
    "  const [loading, setLoading] = useState(true);\n  const [loadError, setLoadError] = useState<string | null>(null);\n",
    "add chat loading error state",
)

content = replace_once(
    content,
    "    const fetchStaff = async () => {\n      const { data: roles } = await supabase\n",
    "    const fetchStaff = async () => {\n      const { data: roles, error: rolesError } = await supabase\n",
    "capture role lookup failure",
)
content = replace_once(
    content,
    "        .select('user_id')\n        .in('role', ['admin', 'security']);\n      \n      if (roles && roles.length > 0) {\n",
    "        .select('user_id')\n        .in('role', ['admin', 'security']);\n\n      if (rolesError) {\n        toast({ title: 'Staff directory unavailable', description: rolesError.message, variant: 'destructive' });\n        return;\n      }\n      \n      if (roles && roles.length > 0) {\n",
    "surface staff directory role failure",
)
content = replace_once(
    content,
    "        const { data: profiles } = await supabase\n",
    "        const { data: profiles, error: profilesError } = await supabase\n",
    "capture staff profile failure",
)
content = replace_once(
    content,
    "          .select('id, full_name, email, avatar_url, campus')\n          .in('id', userIds);\n        \n        if (profiles) {\n",
    "          .select('id, full_name, email, avatar_url, campus')\n          .in('id', userIds);\n\n        if (profilesError) {\n          toast({ title: 'Staff directory unavailable', description: profilesError.message, variant: 'destructive' });\n          return;\n        }\n        \n        if (profiles) {\n",
    "surface staff profile failure",
)

content = replace_once(
    content,
    "    const fetchRooms = async () => {\n      if (!user) return;\n      \n      const { data: rooms, error } = await supabase\n",
    "    const fetchRooms = async () => {\n      if (!user) return;\n      setLoadError(null);\n      \n      const { data: rooms, error } = await supabase\n",
    "reset room load error",
)
content = replace_once(
    content,
    "      if (error) {\n        console.error('Error fetching rooms:', error);\n      } else if (rooms) {\n",
    "      if (error) {\n        console.error('Error fetching rooms:', error);\n        setLoadError('Staff chat rooms could not be loaded.');\n      } else if (rooms) {\n",
    "surface room load failure",
)
content = replace_once(
    content,
    "      .subscribe();\n\n    return () => {\n      supabase.removeChannel(roomChannel);\n",
    "      .subscribe((status) => {\n        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {\n          setLoadError('Live room updates are temporarily unavailable.');\n        }\n      });\n\n    return () => {\n      void supabase.removeChannel(roomChannel);\n",
    "surface room realtime failure",
)

content = replace_once(
    content,
    "  const handleReaction = async (messageId: string, emoji: string) => {\n    if (!user) return;\n    \n    const existingReaction = messages\n      .find(m => m.id === messageId)\n      ?.reactions?.find(r => r.user_id === user.id && r.emoji === emoji);\n    \n    if (existingReaction) {\n      // Remove reaction\n      await supabase\n        .from('message_reactions')\n        .delete()\n        .eq('id', existingReaction.id);\n    } else {\n      // Add reaction\n      await supabase\n        .from('message_reactions')\n        .insert({\n          message_id: messageId,\n          user_id: user.id,\n          emoji\n        });\n    }\n  };",
    "  const handleReaction = async (messageId: string, emoji: string) => {\n    if (!user) return;\n    \n    const existingReaction = messages\n      .find(m => m.id === messageId)\n      ?.reactions?.find(r => r.user_id === user.id && r.emoji === emoji);\n\n    const { error } = existingReaction\n      ? await supabase.from('message_reactions').delete().eq('id', existingReaction.id).eq('user_id', user.id)\n      : await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });\n\n    if (error) {\n      toast({ title: 'Reaction not updated', description: error.message, variant: 'destructive' });\n    }\n  };",
    "make reactions failure-aware",
)

content = replace_once(
    content,
    "    await supabase.from('chat_room_members').insert({\n      room_id: data.id,\n      user_id: user.id,\n      is_admin: true\n    });\n\n    if (selectedMembers.length > 0) {\n      const memberInserts = selectedMembers.map(memberId => ({\n        room_id: data.id,\n        user_id: memberId,\n        is_admin: false\n      }));\n      await supabase.from('chat_room_members').insert(memberInserts);\n    }\n\n    setRooms(prev => [{ ...data, member_count: selectedMembers.length + 1, last_message: '' }, ...prev]);\n",
    "    const { error: ownerMembershipError } = await supabase.from('chat_room_members').insert({\n      room_id: data.id,\n      user_id: user.id,\n      is_admin: true\n    });\n\n    if (ownerMembershipError) {\n      toast({\n        title: 'Chat room needs attention',\n        description: 'The room was created, but your administrator membership could not be recorded. Do not use the room until a super-admin repairs it.',\n        variant: 'destructive',\n      });\n      return;\n    }\n\n    let addedMemberCount = 0;\n    if (selectedMembers.length > 0) {\n      const memberInserts = selectedMembers.map(memberId => ({\n        room_id: data.id,\n        user_id: memberId,\n        is_admin: false\n      }));\n      const { error: memberError } = await supabase.from('chat_room_members').insert(memberInserts);\n      if (memberError) {\n        toast({\n          title: 'Room created with member warning',\n          description: 'The room is available, but selected members were not added. Add them again from the room member control.',\n          variant: 'destructive',\n        });\n      } else {\n        addedMemberCount = selectedMembers.length;\n      }\n    }\n\n    setRooms(prev => [{ ...data, member_count: addedMemberCount + 1, last_message: '' }, ...prev]);\n",
    "check room membership writes",
)
content = replace_once(
    content,
    "    toast({ title: 'Success', description: 'Chat room created' });\n",
    "    toast({ title: 'Chat room created', description: addedMemberCount === selectedMembers.length ? 'The room and selected members are ready.' : 'The room is ready; review its members before use.' });\n",
    "accurate room creation success",
)

content = replace_once(
    content,
    "    if (error) {\n      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });\n    } else {\n",
    "    if (error) {\n      if (mediaUrl) {\n        const { error: cleanupError } = await supabase.storage.from('chat-media').remove([mediaUrl]);\n        if (cleanupError) console.error('Unable to remove orphaned chat media:', cleanupError);\n      }\n      toast({ title: 'Message not sent', description: error.message, variant: 'destructive' });\n    } else {\n",
    "remove orphaned media after message failure",
)

content = replace_once(
    content,
    "  if (loading) {\n    return (\n      <div className=\"flex items-center justify-center h-64\">\n        <div className=\"animate-spin rounded-full h-8 w-8 border-b-2 border-primary\"></div>\n      </div>\n    );\n  }\n",
    "  if (loading) {\n    return (\n      <div className=\"flex h-64 items-center justify-center\" role=\"status\" aria-label=\"Loading staff communication\">\n        <div className=\"h-8 w-8 animate-spin rounded-full border-b-2 border-primary\" aria-hidden=\"true\"></div>\n      </div>\n    );\n  }\n\n  if (loadError && rooms.length === 0) {\n    return (\n      <Card className=\"p-8 text-center\" role=\"alert\">\n        <AlertCircle className=\"mx-auto mb-3 h-10 w-10 text-destructive\" aria-hidden=\"true\" />\n        <h3 className=\"font-semibold\">Staff communication unavailable</h3>\n        <p className=\"mt-1 text-sm text-muted-foreground\">{loadError}</p>\n        <Button className=\"mt-4 gap-2\" variant=\"outline\" onClick={() => window.location.reload()}>\n          <RefreshCw className=\"h-4 w-4\" aria-hidden=\"true\" /> Retry\n        </Button>\n      </Card>\n    );\n  }\n",
    "add staff chat loading/error states",
)

content = replace_once(
    content,
    "                <Button variant=\"ghost\" size=\"icon\" className=\"h-8 w-8\">\n                  <Plus className=\"h-4 w-4\" />\n                </Button>",
    "                <Button variant=\"ghost\" size=\"icon\" className=\"h-8 w-8\" aria-label=\"Create staff chat room\">\n                  <Plus className=\"h-4 w-4\" aria-hidden=\"true\" />\n                </Button>",
    "label create-room control",
)

content = replace_once(
    content,
    "                        <div \n                          key={staff.id}\n                          className=\"flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer\"\n                          onClick={() => {\n                            setSelectedMembers(prev => \n                              prev.includes(staff.id) \n                                ? prev.filter(id => id !== staff.id)\n                                : [...prev, staff.id]\n                            );\n                          }}\n                        >\n                          <Checkbox checked={selectedMembers.includes(staff.id)} />",
    "                        <button\n                          type=\"button\"\n                          key={staff.id}\n                          className=\"flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring\"\n                          aria-pressed={selectedMembers.includes(staff.id)}\n                          onClick={() => {\n                            setSelectedMembers(prev => \n                              prev.includes(staff.id) \n                                ? prev.filter(id => id !== staff.id)\n                                : [...prev, staff.id]\n                            );\n                          }}\n                        >\n                          <Checkbox checked={selectedMembers.includes(staff.id)} tabIndex={-1} aria-hidden=\"true\" />",
    "make member selection keyboard accessible",
)
content = replace_once(
    content,
    "                        </div>\n                      ))}\n                    </ScrollArea>\n                    {selectedMembers.length > 0 && (",
    "                        </button>\n                      ))}\n                    </ScrollArea>\n                    {selectedMembers.length > 0 && (",
    "close member selection buttons",
)

content = replace_once(
    content,
    "                  <motion.div\n                    key={room.id}\n                    initial={{ opacity: 0, x: -10 }}\n                    animate={{ opacity: 1, x: 0 }}\n                    onClick={() => setActiveRoom(room)}\n                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${",
    "                  <motion.button\n                    type=\"button\"\n                    key={room.id}\n                    initial={{ opacity: 0, x: -10 }}\n                    animate={{ opacity: 1, x: 0 }}\n                    onClick={() => setActiveRoom(room)}\n                    aria-pressed={activeRoom?.id === room.id}\n                    className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${",
    "make room rows buttons",
)
content = replace_once(
    content,
    "                  </motion.div>\n                ))\n",
    "                  </motion.button>\n                ))\n",
    "close room buttons",
)

content = replace_once(
    content,
    "                <div className=\"flex items-center gap-1\">\n                  <Button variant=\"ghost\" size=\"icon\" className=\"h-8 w-8\">\n                    <Phone className=\"h-4 w-4\" />\n                  </Button>\n                  <Button variant=\"ghost\" size=\"icon\" className=\"h-8 w-8\">\n                    <Video className=\"h-4 w-4\" />\n                  </Button>\n                  \n                  <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>\n",
    "                <div className=\"flex items-center gap-1\">\n                  <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>\n",
    "remove dead call and video controls",
)
content = replace_once(
    content,
    "                      <Button variant=\"ghost\" size=\"icon\" className=\"h-8 w-8\">\n                        <UserPlus className=\"h-4 w-4\" />\n                      </Button>",
    "                      <Button variant=\"ghost\" size=\"icon\" className=\"h-8 w-8\" aria-label=\"Manage room members\">\n                        <UserPlus className=\"h-4 w-4\" aria-hidden=\"true\" />\n                      </Button>",
    "label room member control",
)
content = replace_once(
    content,
    "                  \n                  <DropdownMenu>\n                    <DropdownMenuTrigger asChild>\n                      <Button variant=\"ghost\" size=\"icon\" className=\"h-8 w-8\">\n                        <MoreVertical className=\"h-4 w-4\" />\n                      </Button>\n                    </DropdownMenuTrigger>\n                    <DropdownMenuContent align=\"end\">\n                      <DropdownMenuItem>\n                        <Settings className=\"h-4 w-4 mr-2\" /> Chat Settings\n                      </DropdownMenuItem>\n                      <DropdownMenuItem>\n                        <Users className=\"h-4 w-4 mr-2\" /> View Members ({roomMembers.length})\n                      </DropdownMenuItem>\n                    </DropdownMenuContent>\n                  </DropdownMenu>\n",
    "",
    "remove dead settings dropdown",
)

PATH.write_text(content)
print("Applied Phase 4 staff-chat hardening.")
