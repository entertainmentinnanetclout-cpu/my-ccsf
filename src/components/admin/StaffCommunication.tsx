import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import imageCompression from 'browser-image-compression';
import {
  AlertCircle,
  Check,
  CheckCheck,
  File,
  Hash,
  Loader2,
  Lock,
  MessageSquare,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  Send,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { resolveChatMediaUrl } from '@/lib/chatMedia';
import { useToast } from '@/hooks/use-toast';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { EmojiPicker, ReactionPicker } from './EmojiPicker';

type ChatRoom = {
  id: string;
  name: string;
  campus: string | null;
  created_at: string;
  created_by: string | null;
  room_type: string;
  description: string | null;
  avatar_url: string | null;
  last_message_at: string | null;
  member_count?: number;
  last_message?: string;
};

type MessageReaction = {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
};

type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  incident_id: string | null;
  created_at: string;
  media_url: string | null;
  media_type: string | null;
  is_read: boolean;
  reactions?: MessageReaction[];
};

type UserProfile = {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  campus: string | null;
};

type PendingMedia = {
  file: File;
  previewUrl: string;
};

const MAX_CHAT_FILE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CHAT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

export const StaffCommunication = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [roomMembers, setRoomMembers] = useState<UserProfile[]>([]);
  const [allStaff, setAllStaff] = useState<UserProfile[]>([]);
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [loading, setLoading] = useState(true);
  const [roomLoading, setRoomLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState<'all' | 'groups' | 'private'>('all');

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<'group' | 'private'>('group');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [creatingRoom, setCreatingRoom] = useState(false);

  const [newMessage, setNewMessage] = useState('');
  const [pendingMedia, setPendingMedia] = useState<PendingMedia | null>(null);
  const [sending, setSending] = useState(false);

  const setProfiles = useCallback((profiles: UserProfile[]) => {
    const profileMap = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));
    setUserProfiles((current) => ({ ...current, ...profileMap }));
  }, []);

  const fetchStaff = useCallback(async () => {
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('user_id')
      .in('role', ['admin', 'security']);

    if (rolesError) {
      toast({ title: 'Staff directory unavailable', description: rolesError.message, variant: 'destructive' });
      return;
    }

    const ids = [...new Set((roles || []).map((role) => role.user_id))];
    if (ids.length === 0) {
      setAllStaff([]);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url, campus')
      .in('id', ids)
      .order('full_name');

    if (error) {
      toast({ title: 'Staff directory unavailable', description: error.message, variant: 'destructive' });
      return;
    }

    const profiles = data || [];
    setAllStaff(profiles);
    setProfiles(profiles);
  }, [setProfiles, toast]);

  const fetchRooms = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setLoadError(null);

    const { data, error } = await supabase
      .from('chat_rooms')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (error) {
      setLoadError('Staff chat rooms could not be loaded.');
      setLoading(false);
      return;
    }

    const enriched = await Promise.all((data || []).map(async (room) => {
      const [{ count }, { data: lastMessage }] = await Promise.all([
        supabase.from('chat_room_members').select('*', { count: 'exact', head: true }).eq('room_id', room.id),
        supabase
          .from('chat_messages')
          .select('content, media_type')
          .eq('room_id', room.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      return {
        ...room,
        member_count: count || 0,
        last_message: lastMessage?.media_type
          ? `Attachment: ${lastMessage.media_type}`
          : lastMessage?.content?.slice(0, 70) || '',
      } as ChatRoom;
    }));

    setRooms(enriched);
    setActiveRoom((current) => {
      if (current && enriched.some((room) => room.id === current.id)) {
        return enriched.find((room) => room.id === current.id) || current;
      }
      return enriched[0] || null;
    });
    setLoading(false);
  }, [user]);

  const fetchActiveRoom = useCallback(async () => {
    if (!activeRoom) {
      setMessages([]);
      setRoomMembers([]);
      return;
    }

    setRoomLoading(true);
    setRoomError(null);

    const [{ data: rawMessages, error: messagesError }, { data: memberships, error: membersError }] = await Promise.all([
      supabase.from('chat_messages').select('*').eq('room_id', activeRoom.id).order('created_at'),
      supabase.from('chat_room_members').select('user_id').eq('room_id', activeRoom.id),
    ]);

    if (messagesError || membersError) {
      setRoomError('This chat room could not be loaded.');
      setRoomLoading(false);
      return;
    }

    const resolvedMessages = await Promise.all((rawMessages || []).map(async (message) => ({
      ...message,
      media_url: await resolveChatMediaUrl(message.media_url),
    })));

    const messageIds = resolvedMessages.map((message) => message.id);
    const senderIds = [...new Set(resolvedMessages.map((message) => message.sender_id))];
    const memberIds = [...new Set((memberships || []).map((membership) => membership.user_id))];
    const profileIds = [...new Set([...senderIds, ...memberIds])];

    const [reactionsResult, profilesResult] = await Promise.all([
      messageIds.length > 0
        ? supabase.from('message_reactions').select('*').in('message_id', messageIds)
        : Promise.resolve({ data: [] as MessageReaction[], error: null }),
      profileIds.length > 0
        ? supabase.from('profiles').select('id, full_name, email, avatar_url, campus').in('id', profileIds)
        : Promise.resolve({ data: [] as UserProfile[], error: null }),
    ]);

    if (reactionsResult.error || profilesResult.error) {
      setRoomError('Messages loaded, but member or reaction details are unavailable.');
    }

    const reactionsByMessage = new Map<string, MessageReaction[]>();
    for (const reaction of reactionsResult.data || []) {
      const existing = reactionsByMessage.get(reaction.message_id) || [];
      reactionsByMessage.set(reaction.message_id, [...existing, reaction]);
    }

    const profiles = profilesResult.data || [];
    setProfiles(profiles);
    const profilesById = new Map(profiles.map((profile) => [profile.id, profile]));
    setRoomMembers(memberIds.map((id) => profilesById.get(id)).filter(Boolean) as UserProfile[]);
    setMessages(resolvedMessages.map((message) => ({
      ...message,
      reactions: reactionsByMessage.get(message.id) || [],
    })));
    setRoomLoading(false);
  }, [activeRoom, setProfiles]);

  useEffect(() => {
    void fetchStaff();
    void fetchRooms();

    const roomChannel = supabase
      .channel('staff-chat-rooms')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => void fetchRooms())
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setLoadError('Live room updates are temporarily unavailable.');
        }
      });

    return () => {
      void supabase.removeChannel(roomChannel);
    };
  }, [fetchRooms, fetchStaff]);

  useEffect(() => {
    void fetchActiveRoom();
    if (!activeRoom) return;

    const messageChannel = supabase
      .channel(`staff-chat-messages-${activeRoom.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${activeRoom.id}` },
        () => void fetchActiveRoom(),
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          setRoomError('Live message updates are temporarily unavailable.');
        }
      });

    const reactionChannel = supabase
      .channel(`staff-chat-reactions-${activeRoom.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => void fetchActiveRoom())
      .subscribe();

    return () => {
      void supabase.removeChannel(messageChannel);
      void supabase.removeChannel(reactionChannel);
    };
  }, [activeRoom, fetchActiveRoom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => () => {
    if (pendingMedia?.previewUrl) URL.revokeObjectURL(pendingMedia.previewUrl);
  }, [pendingMedia]);

  const filteredRooms = useMemo(() => rooms.filter((room) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = !query || room.name.toLowerCase().includes(query) || room.description?.toLowerCase().includes(query);
    const matchesType = tabFilter === 'all'
      || (tabFilter === 'groups' && room.room_type === 'group')
      || (tabFilter === 'private' && room.room_type === 'private');
    return Boolean(matchesQuery && matchesType);
  }), [rooms, searchQuery, tabFilter]);

  const availableStaff = useMemo(() => allStaff.filter((profile) =>
    profile.id !== user?.id && !roomMembers.some((member) => member.id === profile.id)
  ), [allStaff, roomMembers, user?.id]);

  const getInitials = (profile?: UserProfile) => {
    const value = profile?.full_name || profile?.email || '?';
    return value.split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
  };

  const formatTime = (date: string) => new Date(date).toLocaleString('en-ZA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const resetCreateForm = () => {
    setNewRoomName('');
    setNewRoomDescription('');
    setNewRoomType('group');
    setSelectedMembers([]);
  };

  const createRoom = async () => {
    if (!user || !newRoomName.trim() || creatingRoom) return;
    setCreatingRoom(true);

    const { data: room, error: roomErrorResult } = await supabase
      .from('chat_rooms')
      .insert({
        name: newRoomName.trim(),
        created_by: user.id,
        room_type: newRoomType,
        description: newRoomDescription.trim() || null,
      })
      .select()
      .single();

    if (roomErrorResult || !room) {
      toast({ title: 'Chat room was not created', description: roomErrorResult?.message, variant: 'destructive' });
      setCreatingRoom(false);
      return;
    }

    const { error: ownerError } = await supabase.from('chat_room_members').insert({
      room_id: room.id,
      user_id: user.id,
      is_admin: true,
    });

    if (ownerError) {
      toast({
        title: 'Chat room needs administrator repair',
        description: 'The room exists, but your room membership could not be recorded. Do not use it until repaired.',
        variant: 'destructive',
      });
      setCreatingRoom(false);
      return;
    }

    let addedMembers = 0;
    if (selectedMembers.length > 0) {
      const { error: membersError } = await supabase.from('chat_room_members').insert(
        selectedMembers.map((memberId) => ({ room_id: room.id, user_id: memberId, is_admin: false })),
      );
      if (membersError) {
        toast({
          title: 'Room created with member warning',
          description: 'Selected staff were not added. Use Manage room members to add them again.',
          variant: 'destructive',
        });
      } else {
        addedMembers = selectedMembers.length;
      }
    }

    const createdRoom = { ...room, member_count: addedMembers + 1, last_message: '' } as ChatRoom;
    setRooms((current) => [createdRoom, ...current]);
    setActiveRoom(createdRoom);
    setIsCreateDialogOpen(false);
    resetCreateForm();
    setCreatingRoom(false);
    toast({ title: 'Chat room created', description: addedMembers === selectedMembers.length ? 'The room is ready.' : 'Review its members before use.' });
  };

  const addMember = async (profile: UserProfile) => {
    if (!activeRoom) return;
    const { error } = await supabase.from('chat_room_members').insert({
      room_id: activeRoom.id,
      user_id: profile.id,
      is_admin: false,
    });

    if (error) {
      toast({
        title: error.code === '23505' ? 'Already a member' : 'Member was not added',
        description: error.code === '23505' ? `${profile.full_name || profile.email} is already in this room.` : error.message,
        variant: error.code === '23505' ? 'default' : 'destructive',
      });
      return;
    }

    setRoomMembers((current) => [...current, profile]);
    setRooms((current) => current.map((room) => room.id === activeRoom.id
      ? { ...room, member_count: (room.member_count || 0) + 1 }
      : room));
    toast({ title: 'Member added', description: `${profile.full_name || profile.email} can now access this room.` });
  };

  const selectMedia = async (file: File) => {
    if (!ALLOWED_CHAT_TYPES.has(file.type) || file.size > MAX_CHAT_FILE_BYTES) {
      toast({
        title: 'Attachment not accepted',
        description: 'Use JPG, PNG, WebP or PDF files no larger than 10 MB.',
        variant: 'destructive',
      });
      return;
    }

    let prepared = file;
    if (file.type.startsWith('image/')) {
      try {
        prepared = await imageCompression(file, { maxSizeMB: 2, maxWidthOrHeight: 1920, useWebWorker: true });
      } catch (error) {
        console.error('Chat image compression failed; original file retained:', error);
      }
    }

    setPendingMedia({ file: prepared, previewUrl: URL.createObjectURL(prepared) });
  };

  const clearPendingMedia = () => {
    if (pendingMedia?.previewUrl) URL.revokeObjectURL(pendingMedia.previewUrl);
    setPendingMedia(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const sendMessage = async () => {
    if (!user || !activeRoom || sending || (!newMessage.trim() && !pendingMedia)) return;
    setSending(true);

    let storagePath: string | null = null;
    let mediaType: string | null = null;

    if (pendingMedia) {
      const extension = pendingMedia.file.name.split('.').pop()?.toLowerCase() || 'bin';
      storagePath = `${activeRoom.id}/${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(storagePath, pendingMedia.file, { contentType: pendingMedia.file.type, upsert: false });

      if (uploadError) {
        toast({ title: 'Attachment was not uploaded', description: uploadError.message, variant: 'destructive' });
        setSending(false);
        return;
      }
      mediaType = pendingMedia.file.type.startsWith('image/') ? 'image' : 'file';
    }

    const { error } = await supabase.from('chat_messages').insert({
      room_id: activeRoom.id,
      sender_id: user.id,
      content: newMessage.trim(),
      media_url: storagePath,
      media_type: mediaType,
    });

    if (error) {
      if (storagePath) {
        const { error: cleanupError } = await supabase.storage.from('chat-media').remove([storagePath]);
        if (cleanupError) console.error('Unable to remove orphaned chat attachment:', cleanupError);
      }
      toast({ title: 'Message was not sent', description: error.message, variant: 'destructive' });
      setSending(false);
      return;
    }

    await supabase.from('chat_rooms').update({ last_message_at: new Date().toISOString() }).eq('id', activeRoom.id);
    setNewMessage('');
    clearPendingMedia();
    setSending(false);
    await fetchActiveRoom();
    await fetchRooms();
  };

  const reactToMessage = async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = messages
      .find((message) => message.id === messageId)
      ?.reactions?.find((reaction) => reaction.user_id === user.id && reaction.emoji === emoji);

    const { error } = existing
      ? await supabase.from('message_reactions').delete().eq('id', existing.id).eq('user_id', user.id)
      : await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });

    if (error) {
      toast({ title: 'Reaction was not updated', description: error.message, variant: 'destructive' });
      return;
    }
    await fetchActiveRoom();
  };

  const groupedReactions = (reactions: MessageReaction[]) => {
    const groups = new Map<string, MessageReaction[]>();
    for (const reaction of reactions) groups.set(reaction.emoji, [...(groups.get(reaction.emoji) || []), reaction]);
    return [...groups.entries()];
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center" role="status" aria-label="Loading staff communication">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (loadError && rooms.length === 0) {
    return (
      <Card className="p-8 text-center" role="alert">
        <AlertCircle className="mx-auto mb-3 h-10 w-10 text-destructive" aria-hidden="true" />
        <h3 className="font-semibold">Staff communication unavailable</h3>
        <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
        <Button className="mt-4 gap-2" variant="outline" onClick={() => void fetchRooms()}>
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Retry
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid min-h-[640px] grid-cols-1 gap-4 lg:h-[calc(100vh-12rem)] lg:grid-cols-12">
      <Card className="flex min-h-[420px] flex-col lg:col-span-4 xl:col-span-3">
        <CardHeader className="space-y-3 pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4 text-primary" aria-hidden="true" />
              Staff Chats
            </CardTitle>
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) resetCreateForm(); }}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Create staff chat room">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Create Staff Chat</DialogTitle></DialogHeader>
                <div className="space-y-4 pt-3">
                  <div className="space-y-2">
                    <Label htmlFor="staff-chat-type">Chat type</Label>
                    <Select value={newRoomType} onValueChange={(value) => setNewRoomType(value as 'group' | 'private')}>
                      <SelectTrigger id="staff-chat-type"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="group"><span className="flex items-center gap-2"><Users className="h-4 w-4" /> Group chat</span></SelectItem>
                        <SelectItem value="private"><span className="flex items-center gap-2"><Lock className="h-4 w-4" /> Private chat</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-chat-name">Name</Label>
                    <Input id="staff-chat-name" value={newRoomName} onChange={(event) => setNewRoomName(event.target.value)} placeholder="e.g. Mbombela response team" maxLength={100} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="staff-chat-description">Description</Label>
                    <Textarea id="staff-chat-description" value={newRoomDescription} onChange={(event) => setNewRoomDescription(event.target.value)} maxLength={500} rows={2} />
                  </div>
                  <fieldset className="space-y-2">
                    <legend className="text-sm font-medium">Initial members</legend>
                    <ScrollArea className="h-44 rounded-md border p-2">
                      {allStaff.filter((profile) => profile.id !== user?.id).map((profile) => {
                        const selected = selectedMembers.includes(profile.id);
                        return (
                          <button
                            key={profile.id}
                            type="button"
                            className="flex w-full items-center gap-2 rounded-md p-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-pressed={selected}
                            onClick={() => setSelectedMembers((current) => selected ? current.filter((id) => id !== profile.id) : [...current, profile.id])}
                          >
                            <Checkbox checked={selected} tabIndex={-1} aria-hidden="true" />
                            <Avatar className="h-8 w-8"><AvatarImage src={profile.avatar_url || undefined} /><AvatarFallback>{getInitials(profile)}</AvatarFallback></Avatar>
                            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{profile.full_name || profile.email}</span><span className="block truncate text-xs text-muted-foreground">{profile.campus || 'Campus not assigned'}</span></span>
                          </button>
                        );
                      })}
                    </ScrollArea>
                  </fieldset>
                  <Button className="w-full" onClick={() => void createRoom()} disabled={creatingRoom || !newRoomName.trim()}>
                    {creatingRoom && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create chat
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <Input aria-label="Search staff chats" placeholder="Search chats" className="pl-8" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} />
          </div>
          <Tabs value={tabFilter} onValueChange={(value) => setTabFilter(value as typeof tabFilter)}>
            <TabsList className="w-full"><TabsTrigger value="all" className="flex-1">All</TabsTrigger><TabsTrigger value="groups" className="flex-1">Groups</TabsTrigger><TabsTrigger value="private" className="flex-1">Private</TabsTrigger></TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="min-h-0 flex-1 p-2">
          <ScrollArea className="h-full max-h-[520px] lg:max-h-none">
            <div className="space-y-1">
              {filteredRooms.length === 0 ? (
                <div className="py-10 text-center text-sm text-muted-foreground"><MessageSquare className="mx-auto mb-2 h-10 w-10 opacity-40" />No chats found</div>
              ) : filteredRooms.map((room) => (
                <motion.button
                  key={room.id}
                  type="button"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  aria-pressed={activeRoom?.id === room.id}
                  onClick={() => setActiveRoom(room)}
                  className={`flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${activeRoom?.id === room.id ? 'bg-primary/10 ring-1 ring-primary/20' : 'hover:bg-muted/60'}`}
                >
                  <Avatar className="h-11 w-11"><AvatarFallback className="bg-primary/10 text-primary">{room.room_type === 'group' ? <Hash className="h-5 w-5" /> : room.name.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
                  <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-medium">{room.name}</span>{room.last_message_at && <span className="shrink-0 text-[11px] text-muted-foreground">{formatTime(room.last_message_at)}</span>}</span><span className="block truncate text-xs text-muted-foreground">{room.last_message || room.description || 'No messages yet'}</span><span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><Users className="h-3 w-3" />{room.member_count || 0} members</span></span>
                </motion.button>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card className="flex min-h-[640px] flex-col overflow-hidden lg:col-span-8 xl:col-span-9">
        {!activeRoom ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center text-muted-foreground"><MessageSquare className="mb-3 h-14 w-14 opacity-30" /><p>Select or create a staff chat room.</p></div>
        ) : (
          <>
            <CardHeader className="border-b py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0"><CardTitle className="truncate text-base">{activeRoom.name}</CardTitle><p className="text-xs text-muted-foreground">{roomMembers.length} authorised members</p></div>
                <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
                  <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><UserPlus className="h-4 w-4" /> Manage members</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Manage Room Members</DialogTitle></DialogHeader>
                    <div className="space-y-4">
                      <div><h4 className="mb-2 text-sm font-medium">Current members</h4><ScrollArea className="max-h-48"><div className="space-y-2">{roomMembers.map((profile) => <div key={profile.id} className="flex items-center gap-3 rounded-md border p-2"><Avatar className="h-8 w-8"><AvatarImage src={profile.avatar_url || undefined} /><AvatarFallback>{getInitials(profile)}</AvatarFallback></Avatar><span className="min-w-0"><span className="block truncate text-sm font-medium">{profile.full_name || profile.email}</span><span className="block text-xs text-muted-foreground">{profile.campus || 'Campus not assigned'}</span></span></div>)}</div></ScrollArea></div>
                      <div><h4 className="mb-2 text-sm font-medium">Add staff</h4><ScrollArea className="max-h-56"><div className="space-y-2">{availableStaff.length === 0 ? <p className="text-sm text-muted-foreground">All available staff are already members.</p> : availableStaff.map((profile) => <button key={profile.id} type="button" onClick={() => void addMember(profile)} className="flex w-full items-center gap-3 rounded-md border p-2 text-left hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Avatar className="h-8 w-8"><AvatarImage src={profile.avatar_url || undefined} /><AvatarFallback>{getInitials(profile)}</AvatarFallback></Avatar><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{profile.full_name || profile.email}</span><span className="block text-xs text-muted-foreground">{profile.campus || 'Campus not assigned'}</span></span><Plus className="h-4 w-4" /></button>)}</div></ScrollArea></div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>

            <ScrollArea className="min-h-0 flex-1 p-4">
              {roomLoading ? (
                <div className="flex h-48 items-center justify-center" role="status" aria-label="Loading chat messages"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
              ) : roomError && messages.length === 0 ? (
                <div className="py-12 text-center" role="alert"><AlertCircle className="mx-auto mb-2 h-9 w-9 text-destructive" /><p className="text-sm text-muted-foreground">{roomError}</p><Button variant="outline" size="sm" className="mt-3 gap-2" onClick={() => void fetchActiveRoom()}><RefreshCw className="h-4 w-4" /> Retry</Button></div>
              ) : messages.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground"><MessageSquare className="mx-auto mb-3 h-12 w-12 opacity-30" /><p>No messages yet.</p><p className="text-sm">Send the first verified staff message.</p></div>
              ) : (
                <div className="flex flex-col gap-4" role="log" aria-live="polite">
                  <AnimatePresence initial={false}>
                    {messages.map((message) => {
                      const mine = message.sender_id === user?.id;
                      const sender = userProfiles[message.sender_id];
                      const reactions = message.reactions || [];
                      return (
                        <motion.div key={message.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`group flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                          {!mine && <Avatar className="h-8 w-8"><AvatarImage src={sender?.avatar_url || undefined} /><AvatarFallback>{getInitials(sender)}</AvatarFallback></Avatar>}
                          <div className={`max-w-[82%] sm:max-w-[70%] ${mine ? 'items-end' : 'items-start'}`}>
                            {!mine && <p className="mb-1 text-xs text-muted-foreground">{sender?.full_name || sender?.email || 'Staff member'}</p>}
                            <div className={`overflow-hidden rounded-2xl ${mine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted'}`}>
                              {message.media_url && (message.media_type === 'image' ? <img src={message.media_url} alt="Shared staff attachment" className="max-h-72 w-full object-cover" /> : <a href={message.media_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-3 underline-offset-2 hover:underline"><File className="h-6 w-6" />Open attachment</a>)}
                              {message.content && <p className="whitespace-pre-wrap p-3 text-sm">{message.content}</p>}
                              <div className={`flex items-center justify-end gap-1 px-3 pb-2 text-xs ${mine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}><span>{formatTime(message.created_at)}</span>{mine && (message.is_read ? <CheckCheck className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5" />)}</div>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-1">
                              {groupedReactions(reactions).map(([emoji, values]) => <button key={emoji} type="button" onClick={() => void reactToMessage(message.id, emoji)} className={`rounded-full border px-2 py-0.5 text-xs ${values.some((reaction) => reaction.user_id === user?.id) ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`} aria-label={`${emoji} reaction, ${values.length}`}>{emoji} {values.length}</button>)}
                              <ReactionPicker onReact={(emoji) => void reactToMessage(message.id, emoji)} existingReactions={reactions.filter((reaction) => reaction.user_id === user?.id).map((reaction) => reaction.emoji)} />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            <div className="border-t p-3">
              {roomError && messages.length > 0 && <p className="mb-2 flex items-center gap-2 text-xs text-destructive" role="status"><AlertCircle className="h-3.5 w-3.5" />{roomError}</p>}
              {pendingMedia && <div className="mb-2 flex items-center gap-3 rounded-lg border bg-muted/30 p-2">{pendingMedia.file.type.startsWith('image/') ? <img src={pendingMedia.previewUrl} alt="Attachment preview" className="h-14 w-14 rounded object-cover" /> : <File className="h-10 w-10 text-primary" />}<span className="min-w-0 flex-1 truncate text-sm">{pendingMedia.file.name}</span><Button variant="ghost" size="icon" aria-label="Remove selected attachment" onClick={clearPendingMedia}><X className="h-4 w-4" /></Button></div>}
              <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="flex items-end gap-2">
                <input ref={fileInputRef} type="file" className="hidden" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void selectMedia(file); }} />
                <Button type="button" variant="ghost" size="icon" aria-label="Attach file" onClick={() => fileInputRef.current?.click()} disabled={sending}><Paperclip className="h-5 w-5" /></Button>
                <EmojiPicker onSelect={(emoji) => setNewMessage((current) => current + emoji)} triggerClassName="h-10 w-10" />
                <Textarea value={newMessage} onChange={(event) => setNewMessage(event.target.value)} placeholder="Message authorised CCSF staff" aria-label="Staff chat message" rows={1} maxLength={5000} className="min-h-10 flex-1 resize-none" onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} />
                <Button type="submit" size="icon" aria-label="Send staff message" disabled={sending || (!newMessage.trim() && !pendingMedia)}>{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}</Button>
              </form>
              <p className="mt-1 text-xs text-muted-foreground">JPG, PNG, WebP or PDF; 10 MB maximum. Enter sends, Shift+Enter adds a new line.</p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
