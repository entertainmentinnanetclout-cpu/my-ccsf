import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Paperclip, Send, Plus, MessageSquare, Users, Search, 
  File, X, Check, CheckCheck, 
  Phone, Video, MoreVertical, Camera,
  UserPlus, Settings, Hash, Lock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import imageCompression from 'browser-image-compression';
import { resolveChatMediaUrl } from '@/lib/chatMedia';
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
  unread_count?: number;
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

type TypingUser = {
  user_id: string;
  user_name: string;
};

export const StaffCommunication = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<'group' | 'private'>('group');
  const [newRoomDescription, setNewRoomDescription] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMemberDialogOpen, setIsMemberDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [userProfiles, setUserProfiles] = useState<Record<string, UserProfile>>({});
  const [allStaff, setAllStaff] = useState<UserProfile[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [typingUsers, setTypingUsers] = useState<TypingUser[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [previewMedia, setPreviewMedia] = useState<{ url: string; type: string } | null>(null);
  const [roomMembers, setRoomMembers] = useState<UserProfile[]>([]);
  const [tabFilter, setTabFilter] = useState<'all' | 'groups' | 'private'>('all');
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch all staff profiles for search/selection
  useEffect(() => {
    const fetchStaff = async () => {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'security']);
      
      if (roles && roles.length > 0) {
        const userIds = roles.map(r => r.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, campus')
          .in('id', userIds);
        
        if (profiles) {
          setAllStaff(profiles);
          const profileMap: Record<string, UserProfile> = {};
          profiles.forEach(p => {
            profileMap[p.id] = p;
          });
          setUserProfiles(prev => ({ ...prev, ...profileMap }));
        }
      }
    };
    fetchStaff();
  }, []);

  // Fetch chat rooms with member counts and last messages
  useEffect(() => {
    const fetchRooms = async () => {
      if (!user) return;
      
      const { data: rooms, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('last_message_at', { ascending: false });

      if (error) {
        console.error('Error fetching rooms:', error);
      } else if (rooms) {
        const enrichedRooms = await Promise.all(rooms.map(async (room) => {
          const { count } = await supabase
            .from('chat_room_members')
            .select('*', { count: 'exact', head: true })
            .eq('room_id', room.id);
          
          const { data: lastMsg } = await supabase
            .from('chat_messages')
            .select('content, media_type')
            .eq('room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
          
          return {
            ...room,
            member_count: count || 0,
            last_message: lastMsg?.media_type ? `📎 ${lastMsg.media_type}` : lastMsg?.content?.substring(0, 50) || '',
            unread_count: 0
          };
        }));
        
        setRooms(enrichedRooms);
        if (enrichedRooms.length > 0 && !activeRoom) {
          setActiveRoom(enrichedRooms[0]);
        }
      }
      setLoading(false);
    };

    fetchRooms();

    const roomChannel = supabase
      .channel('rooms-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'chat_rooms' }, () => {
        fetchRooms();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [user]);

  // Fetch messages, reactions, and room members for active room
  useEffect(() => {
    if (!activeRoom) return;

    const fetchMessagesAndMembers = async () => {
      const { data: msgs, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', activeRoom.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else if (msgs) {
        const resolvedMessages = await Promise.all(
          msgs.map(async (message) => ({
            ...message,
            media_url: await resolveChatMediaUrl(message.media_url),
          })),
        );

        // Fetch reactions for all messages
        const messageIds = resolvedMessages.map(m => m.id);
        const { data: reactions } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', messageIds);
        
        // Group reactions by message
        const reactionsByMessage: Record<string, MessageReaction[]> = {};
        reactions?.forEach(r => {
          if (!reactionsByMessage[r.message_id]) {
            reactionsByMessage[r.message_id] = [];
          }
          reactionsByMessage[r.message_id].push(r);
        });
        
        // Attach reactions to messages
        const messagesWithReactions = resolvedMessages.map(m => ({
          ...m,
          reactions: reactionsByMessage[m.id] || []
        }));
        
        setMessages(messagesWithReactions);
        
        const senderIds = [...new Set(resolvedMessages.map(m => m.sender_id))];
        if (senderIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email, avatar_url, campus')
            .in('id', senderIds);
          
          if (profiles) {
            const profileMap: Record<string, UserProfile> = {};
            profiles.forEach(p => {
              profileMap[p.id] = p;
            });
            setUserProfiles(prev => ({ ...prev, ...profileMap }));
          }
        }
      }

      const { data: members } = await supabase
        .from('chat_room_members')
        .select('user_id')
        .eq('room_id', activeRoom.id);
      
      if (members && members.length > 0) {
        const memberIds = members.map(m => m.user_id);
        const { data: memberProfiles } = await supabase
          .from('profiles')
          .select('id, full_name, email, avatar_url, campus')
          .in('id', memberIds);
        
        setRoomMembers(memberProfiles || []);
      }
    };

    fetchMessagesAndMembers();

    // Real-time message subscription
    const messageChannel = supabase
      .channel(`room-messages-${activeRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `room_id=eq.${activeRoom.id}`,
        },
        async (payload) => {
          const newMsg = payload.new as ChatMessage;
          const resolvedNewMsg = {
            ...newMsg,
            media_url: await resolveChatMediaUrl(newMsg.media_url),
          };
          
          if (!userProfiles[newMsg.sender_id]) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name, email, avatar_url, campus')
              .eq('id', newMsg.sender_id)
              .single();
            
            if (profile) {
              setUserProfiles(prev => ({ ...prev, [profile.id]: profile }));
            }
          }
          
          setMessages(prev => [...prev, { ...resolvedNewMsg, reactions: [] }]);
        }
      )
      .subscribe();

    // Real-time reactions subscription
    const reactionChannel = supabase
      .channel(`room-reactions-${activeRoom.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const reaction = payload.new as MessageReaction;
            setMessages(prev => prev.map(m => 
              m.id === reaction.message_id 
                ? { ...m, reactions: [...(m.reactions || []), reaction] }
                : m
            ));
          } else if (payload.eventType === 'DELETE') {
            const reaction = payload.old as MessageReaction;
            setMessages(prev => prev.map(m => 
              m.id === reaction.message_id 
                ? { ...m, reactions: (m.reactions || []).filter(r => r.id !== reaction.id) }
                : m
            ));
          }
        }
      )
      .subscribe();

    // Typing indicators
    const typingChannel = supabase
      .channel(`typing-${activeRoom.id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = typingChannel.presenceState();
        const typing: TypingUser[] = [];
        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.user_id !== user?.id && p.typing) {
              typing.push({ user_id: p.user_id, user_name: p.user_name });
            }
          });
        });
        setTypingUsers(typing);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messageChannel);
      supabase.removeChannel(reactionChannel);
      supabase.removeChannel(typingChannel);
    };
  }, [activeRoom, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = useCallback(async () => {
    if (!activeRoom || !user) return;
    
    const channel = supabase.channel(`typing-${activeRoom.id}`);
    const userName = userProfiles[user.id]?.full_name || user.email?.split('@')[0] || 'Unknown';
    
    await channel.track({
      user_id: user.id,
      user_name: userName,
      typing: true
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(async () => {
      await channel.track({
        user_id: user.id,
        user_name: userName,
        typing: false
      });
    }, 2000);
  }, [activeRoom, user, userProfiles]);

  const handleReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    
    const existingReaction = messages
      .find(m => m.id === messageId)
      ?.reactions?.find(r => r.user_id === user.id && r.emoji === emoji);
    
    if (existingReaction) {
      // Remove reaction
      await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existingReaction.id);
    } else {
      // Add reaction
      await supabase
        .from('message_reactions')
        .insert({
          message_id: messageId,
          user_id: user.id,
          emoji
        });
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !user) return;

    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        name: newRoomName.trim(),
        created_by: user.id,
        room_type: newRoomType,
        description: newRoomDescription.trim() || null,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create chat room', variant: 'destructive' });
      return;
    }

    await supabase.from('chat_room_members').insert({
      room_id: data.id,
      user_id: user.id,
      is_admin: true
    });

    if (selectedMembers.length > 0) {
      const memberInserts = selectedMembers.map(memberId => ({
        room_id: data.id,
        user_id: memberId,
        is_admin: false
      }));
      await supabase.from('chat_room_members').insert(memberInserts);
    }

    setRooms(prev => [{ ...data, member_count: selectedMembers.length + 1, last_message: '' }, ...prev]);
    setActiveRoom(data);
    setNewRoomName('');
    setNewRoomDescription('');
    setSelectedMembers([]);
    setIsDialogOpen(false);
    toast({ title: 'Success', description: 'Chat room created' });
  };

  const handleSend = async () => {
    if ((!newMessage.trim() && !previewMedia) || !activeRoom || !user) return;

    let mediaUrl = null;
    let mediaType = null;

    if (previewMedia) {
      setIsUploading(true);
      try {
        const response = await fetch(previewMedia.url);
        const blob = await response.blob();
        const fileName = `${user.id}/${Date.now()}.${previewMedia.type.split('/')[1] || 'file'}`;
        
        const { error: uploadError } = await supabase.storage
          .from('chat-media')
          .upload(fileName, blob, { contentType: previewMedia.type });

        if (uploadError) throw uploadError;

        mediaUrl = fileName;
        mediaType = previewMedia.type.startsWith('image') ? 'image' : 'file';
      } catch (err) {
        console.error('Upload error:', err);
        toast({ title: 'Error', description: 'Failed to upload media', variant: 'destructive' });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: activeRoom.id,
        sender_id: user.id,
        content: newMessage.trim(),
        media_url: mediaUrl,
        media_type: mediaType,
      });

    if (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } else {
      setNewMessage('');
      setPreviewMedia(null);
      
      await supabase
        .from('chat_rooms')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', activeRoom.id);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      try {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 2,
          maxWidthOrHeight: 1920,
        });
        const url = URL.createObjectURL(compressedFile);
        setPreviewMedia({ url, type: file.type });
      } catch (err) {
        console.error('Compression error:', err);
        const url = URL.createObjectURL(file);
        setPreviewMedia({ url, type: file.type });
      }
    } else {
      const url = URL.createObjectURL(file);
      setPreviewMedia({ url, type: file.type });
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setNewMessage(prev => prev + emoji);
  };

  const addMemberToRoom = async (userId: string) => {
    if (!activeRoom) return;
    
    const { error } = await supabase
      .from('chat_room_members')
      .insert({
        room_id: activeRoom.id,
        user_id: userId,
        is_admin: false
      });

    if (error) {
      if (error.code === '23505') {
        toast({ title: 'Info', description: 'User is already a member' });
      } else {
        toast({ title: 'Error', description: 'Failed to add member', variant: 'destructive' });
      }
    } else {
      toast({ title: 'Success', description: 'Member added to room' });
      const memberProfile = allStaff.find(s => s.id === userId);
      if (memberProfile) {
        setRoomMembers(prev => [...prev, memberProfile]);
      }
    }
    setIsMemberDialogOpen(false);
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    }
    return email.substring(0, 2).toUpperCase();
  };

  // Group reactions by emoji
  const groupReactions = (reactions: MessageReaction[]) => {
    const grouped: Record<string, { count: number; users: string[] }> = {};
    reactions.forEach(r => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { count: 0, users: [] };
      }
      grouped[r.emoji].count++;
      grouped[r.emoji].users.push(r.user_id);
    });
    return grouped;
  };

  const filteredRooms = rooms.filter(room => {
    const matchesSearch = room.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = tabFilter === 'all' || 
      (tabFilter === 'groups' && room.room_type === 'group') ||
      (tabFilter === 'private' && room.room_type === 'private');
    return matchesSearch && matchesTab;
  });

  const filteredStaff = allStaff.filter(staff => 
    staff.id !== user?.id &&
    (staff.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
     staff.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-12rem)]"
    >
      {/* Rooms List */}
      <Card className="lg:col-span-4 xl:col-span-3 flex flex-col">
        <CardHeader className="pb-2 space-y-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Chats
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Chat</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Chat Type</Label>
                    <Select value={newRoomType} onValueChange={(v) => setNewRoomType(v as 'group' | 'private')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="group">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            Group Chat
                          </div>
                        </SelectItem>
                        <SelectItem value="private">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Private Chat
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="roomName">Name</Label>
                    <Input
                      id="roomName"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder={newRoomType === 'group' ? 'e.g., Mbombela Team' : 'e.g., Chat with John'}
                    />
                  </div>
                  
                  {newRoomType === 'group' && (
                    <div className="space-y-2">
                      <Label>Description (Optional)</Label>
                      <Textarea
                        value={newRoomDescription}
                        onChange={(e) => setNewRoomDescription(e.target.value)}
                        placeholder="What's this group about?"
                        className="resize-none"
                        rows={2}
                      />
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label>Add Members</Label>
                    <ScrollArea className="h-40 border rounded-md p-2">
                      {allStaff.filter(s => s.id !== user?.id).map(staff => (
                        <div 
                          key={staff.id}
                          className="flex items-center gap-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                          onClick={() => {
                            setSelectedMembers(prev => 
                              prev.includes(staff.id) 
                                ? prev.filter(id => id !== staff.id)
                                : [...prev, staff.id]
                            );
                          }}
                        >
                          <Checkbox checked={selectedMembers.includes(staff.id)} />
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={staff.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {getInitials(staff.full_name, staff.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {staff.full_name || staff.email.split('@')[0]}
                            </p>
                            <p className="text-xs text-muted-foreground truncate">{staff.campus}</p>
                          </div>
                        </div>
                      ))}
                    </ScrollArea>
                    {selectedMembers.length > 0 && (
                      <p className="text-xs text-muted-foreground">{selectedMembers.length} members selected</p>
                    )}
                  </div>
                  
                  <Button onClick={handleCreateRoom} className="w-full">
                    Create Chat
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search chats or people..." 
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Tabs value={tabFilter} onValueChange={(v) => setTabFilter(v as typeof tabFilter)}>
            <TabsList className="w-full">
              <TabsTrigger value="all" className="flex-1 text-xs">All</TabsTrigger>
              <TabsTrigger value="groups" className="flex-1 text-xs">Groups</TabsTrigger>
              <TabsTrigger value="private" className="flex-1 text-xs">Private</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        
        <CardContent className="p-2 flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="flex flex-col gap-1">
              {filteredRooms.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                  <p className="text-sm text-muted-foreground">No chats found</p>
                  <p className="text-xs text-muted-foreground">Create one to start chatting</p>
                </div>
              ) : (
                filteredRooms.map(room => (
                  <motion.div
                    key={room.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    onClick={() => setActiveRoom(room)}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                      activeRoom?.id === room.id 
                        ? 'bg-primary/10 border border-primary/20' 
                        : 'hover:bg-muted/50'
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-12 w-12">
                        {room.avatar_url ? (
                          <AvatarImage src={room.avatar_url} />
                        ) : (
                          <AvatarFallback className={`${
                            room.room_type === 'group' ? 'bg-primary/20 text-primary' : 'bg-secondary'
                          }`}>
                            {room.room_type === 'group' ? (
                              <Hash className="h-5 w-5" />
                            ) : (
                              room.name.charAt(0).toUpperCase()
                            )}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      {room.name === 'All CCSF Staff' && (
                        <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-0.5">
                          <Check className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm truncate">{room.name}</span>
                        {room.last_message_at && (
                          <span className="text-xs text-muted-foreground">
                            {formatTime(room.last_message_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {room.last_message && (
                          <p className="text-xs text-muted-foreground truncate flex-1">
                            {room.last_message}
                          </p>
                        )}
                        {room.unread_count && room.unread_count > 0 && (
                          <Badge variant="default" className="h-5 px-1.5 text-xs">
                            {room.unread_count}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{room.member_count} members</span>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <div className="lg:col-span-8 xl:col-span-9 flex flex-col h-full">
        {activeRoom ? (
          <Card className="flex-1 flex flex-col overflow-hidden">
            {/* Chat Header */}
            <CardHeader className="py-3 px-4 border-b bg-card/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {activeRoom.avatar_url ? (
                      <AvatarImage src={activeRoom.avatar_url} />
                    ) : (
                      <AvatarFallback className="bg-primary/20 text-primary">
                        {activeRoom.room_type === 'group' ? (
                          <Hash className="h-5 w-5" />
                        ) : (
                          activeRoom.name.charAt(0).toUpperCase()
                        )}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm flex items-center gap-2">
                      {activeRoom.name}
                      {activeRoom.name === 'All CCSF Staff' && (
                        <Badge variant="secondary" className="text-xs">Official</Badge>
                      )}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {roomMembers.length} members
                      {typingUsers.length > 0 && (
                        <span className="text-primary ml-2 animate-pulse">
                          {typingUsers.map(t => t.user_name).join(', ')} typing...
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Phone className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Video className="h-4 w-4" />
                  </Button>
                  
                  <Dialog open={isMemberDialogOpen} onOpenChange={setIsMemberDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Members</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 pt-4">
                        <Input 
                          placeholder="Search staff..." 
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <ScrollArea className="h-60">
                          {filteredStaff.map(staff => (
                            <div 
                              key={staff.id}
                              className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer"
                              onClick={() => addMemberToRoom(staff.id)}
                            >
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={staff.avatar_url || undefined} />
                                <AvatarFallback>
                                  {getInitials(staff.full_name, staff.email)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <p className="font-medium text-sm">
                                  {staff.full_name || staff.email.split('@')[0]}
                                </p>
                                <p className="text-xs text-muted-foreground">{staff.campus}</p>
                              </div>
                              <Button size="sm" variant="outline">Add</Button>
                            </div>
                          ))}
                        </ScrollArea>
                      </div>
                    </DialogContent>
                  </Dialog>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Settings className="h-4 w-4 mr-2" /> Chat Settings
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Users className="h-4 w-4 mr-2" /> View Members ({roomMembers.length})
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="flex flex-col gap-4">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-16 w-16 mx-auto text-muted-foreground/30 mb-4" />
                    <p className="text-muted-foreground">No messages yet</p>
                    <p className="text-sm text-muted-foreground">Be the first to send a message!</p>
                  </div>
                ) : (
                  <AnimatePresence>
                    {messages.map((msg, index) => {
                      const isMe = msg.sender_id === user?.id;
                      const sender = userProfiles[msg.sender_id];
                      const senderName = sender?.full_name || sender?.email?.split('@')[0] || 'Unknown';
                      const showAvatar = !isMe && (index === 0 || messages[index - 1].sender_id !== msg.sender_id);
                      const groupedReactions = groupReactions(msg.reactions || []);

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex gap-2 group ${isMe ? 'justify-end' : ''}`}
                        >
                          {!isMe && (
                            <div className="w-8">
                              {showAvatar && (
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={sender?.avatar_url || undefined} />
                                  <AvatarFallback className="text-xs bg-secondary">
                                    {getInitials(sender?.full_name || null, sender?.email || '')}
                                  </AvatarFallback>
                                </Avatar>
                              )}
                            </div>
                          )}
                          
                          <div className={`max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                            {showAvatar && !isMe && (
                              <p className="text-xs text-muted-foreground mb-1 ml-1">{senderName}</p>
                            )}
                            
                            <div className="relative">
                              <div className={`rounded-2xl overflow-hidden ${
                                isMe 
                                  ? 'bg-primary text-primary-foreground rounded-br-sm' 
                                  : 'bg-muted rounded-bl-sm'
                              }`}>
                                {msg.media_url && (
                                  <div className="relative">
                                    {msg.media_type === 'image' ? (
                                      <img 
                                        src={msg.media_url} 
                                        alt="Shared media" 
                                        className="max-w-full max-h-64 object-cover"
                                      />
                                    ) : (
                                      <a 
                                        href={msg.media_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 p-3 hover:bg-black/5"
                                      >
                                        <File className="h-8 w-8" />
                                        <span className="text-sm">Download File</span>
                                      </a>
                                    )}
                                  </div>
                                )}
                                
                                {msg.content && (
                                  <p className="text-sm p-3 pt-2">{msg.content}</p>
                                )}
                                
                                <div className={`flex items-center justify-end gap-1 px-3 pb-2 ${
                                  isMe ? 'text-primary-foreground/70' : 'text-muted-foreground'
                                }`}>
                                  <span className="text-xs">{formatTime(msg.created_at)}</span>
                                  {isMe && (
                                    msg.is_read ? (
                                      <CheckCheck className="h-3.5 w-3.5 text-primary" />
                                    ) : (
                                      <Check className="h-3.5 w-3.5" />
                                    )
                                  )}
                                </div>
                              </div>
                              
                              {/* Reaction picker */}
                              <div className={`absolute top-0 ${isMe ? 'left-0 -translate-x-full' : 'right-0 translate-x-full'} px-1`}>
                                <ReactionPicker 
                                  onReact={(emoji) => handleReaction(msg.id, emoji)}
                                  existingReactions={msg.reactions?.filter(r => r.user_id === user?.id).map(r => r.emoji) || []}
                                />
                              </div>
                              
                              {/* Reactions display */}
                              {Object.keys(groupedReactions).length > 0 && (
                                <div className={`flex flex-wrap gap-1 mt-1 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                  {Object.entries(groupedReactions).map(([emoji, data]) => (
                                    <button
                                      key={emoji}
                                      onClick={() => handleReaction(msg.id, emoji)}
                                      className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-colors ${
                                        data.users.includes(user?.id || '') 
                                          ? 'bg-primary/20 border border-primary/30' 
                                          : 'bg-muted hover:bg-muted/80'
                                      }`}
                                    >
                                      <span>{emoji}</span>
                                      <span className="text-muted-foreground">{data.count}</span>
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          {isMe && (
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={userProfiles[user.id]?.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-primary/20 text-primary">
                                {getInitials(userProfiles[user.id]?.full_name || null, user.email || '')}
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Media Preview */}
            {previewMedia && (
              <div className="px-4 py-2 border-t bg-muted/50">
                <div className="relative inline-block">
                  {previewMedia.type.startsWith('image') ? (
                    <img 
                      src={previewMedia.url} 
                      alt="Preview" 
                      className="h-20 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-card rounded-lg">
                      <File className="h-6 w-6" />
                      <span className="text-sm">File attached</span>
                    </div>
                  )}
                  <button 
                    onClick={() => setPreviewMedia(null)}
                    className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Input Area */}
            <div className="p-4 border-t bg-card/50">
              <div className="flex items-end gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                
                <div className="flex gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-10 w-10"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <Camera className="h-5 w-5" />
                  </Button>
                </div>
                
                <div className="flex-1 relative">
                  <Textarea
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="min-h-[44px] max-h-32 resize-none pr-12"
                    rows={1}
                  />
                  <div className="absolute right-1 top-1">
                    <EmojiPicker onSelect={handleEmojiSelect} triggerClassName="h-8 w-8" />
                  </div>
                </div>
                
                <Button 
                  onClick={handleSend} 
                  size="icon"
                  className="h-10 w-10"
                  disabled={(!newMessage.trim() && !previewMedia) || isUploading}
                >
                  {isUploading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <Send className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ) : (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="relative inline-block">
                <MessageSquare className="h-20 w-20 text-muted-foreground/30" />
                <div className="absolute -bottom-2 -right-2 p-2 bg-primary rounded-full">
                  <Users className="h-6 w-6 text-primary-foreground" />
                </div>
              </div>
              <h3 className="mt-4 font-semibold text-lg">Welcome to CCSF Chat</h3>
              <p className="text-muted-foreground mt-1">Select a chat or create a new one to start messaging</p>
              <Button className="mt-4" onClick={() => setIsDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" /> Create New Chat
              </Button>
            </div>
          </Card>
        )}
      </div>
    </motion.div>
  );
};
