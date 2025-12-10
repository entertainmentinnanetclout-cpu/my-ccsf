import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Paperclip, Send, Plus, MessageSquare, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ChatRoom = {
  id: string;
  name: string;
  campus: string | null;
  created_at: string;
  created_by: string | null;
};

type ChatMessage = {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  incident_id: string | null;
  created_at: string;
  sender_name?: string;
};

export const StaffCommunication = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [activeRoom, setActiveRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [newRoomName, setNewRoomName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});

  // Fetch chat rooms
  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching rooms:', error);
      } else {
        setRooms(data || []);
        if (data && data.length > 0 && !activeRoom) {
          setActiveRoom(data[0]);
        }
      }
      setLoading(false);
    };

    fetchRooms();
  }, []);

  // Fetch messages for active room
  useEffect(() => {
    if (!activeRoom) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', activeRoom.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching messages:', error);
      } else {
        setMessages(data || []);
        
        // Fetch sender names
        const senderIds = [...new Set((data || []).map(m => m.sender_id))];
        if (senderIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name, email')
            .in('id', senderIds);
          
          const names: Record<string, string> = {};
          profiles?.forEach(p => {
            names[p.id] = p.full_name || p.email.split('@')[0];
          });
          setSenderNames(names);
        }
      }
    };

    fetchMessages();

    // Real-time subscription
    const channel = supabase
      .channel(`room-${activeRoom.id}`)
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
          
          // Fetch sender name if not cached
          if (!senderNames[newMsg.sender_id]) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('full_name, email')
              .eq('id', newMsg.sender_id)
              .single();
            
            if (profile) {
              setSenderNames(prev => ({
                ...prev,
                [newMsg.sender_id]: profile.full_name || profile.email.split('@')[0]
              }));
            }
          }
          
          setMessages(prev => [...prev, newMsg]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoom]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !user) return;

    const { data, error } = await supabase
      .from('chat_rooms')
      .insert({
        name: newRoomName.trim(),
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({ title: 'Error', description: 'Failed to create chat room', variant: 'destructive' });
    } else {
      setRooms(prev => [data, ...prev]);
      setActiveRoom(data);
      setNewRoomName('');
      setIsDialogOpen(false);
      toast({ title: 'Success', description: 'Chat room created' });
    }
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !activeRoom || !user) return;

    const { error } = await supabase
      .from('chat_messages')
      .insert({
        room_id: activeRoom.id,
        sender_id: user.id,
        content: newMessage.trim(),
      });

    if (error) {
      toast({ title: 'Error', description: 'Failed to send message', variant: 'destructive' });
    } else {
      setNewMessage('');
    }
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-20rem)]">
      {/* Rooms List */}
      <Card className="lg:col-span-1">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Chat Rooms
            </CardTitle>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <Plus className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Chat Room</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div>
                    <Label htmlFor="roomName">Room Name</Label>
                    <Input
                      id="roomName"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                      placeholder="e.g., Security Team"
                    />
                  </div>
                  <Button onClick={handleCreateRoom} className="w-full">
                    Create Room
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent className="p-2">
          <Input placeholder="Search..." className="mb-2" />
          <div className="flex flex-col gap-1 max-h-[400px] overflow-y-auto">
            {rooms.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No chat rooms yet. Create one to start.
              </p>
            ) : (
              rooms.map(room => (
                <div
                  key={room.id}
                  onClick={() => setActiveRoom(room)}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors ${
                    activeRoom?.id === room.id ? 'bg-primary/10' : 'hover:bg-muted'
                  }`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">{room.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{room.name}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Messages Area */}
      <div className="lg:col-span-3 flex flex-col h-full">
        {activeRoom ? (
          <>
            <Card className="flex-grow overflow-hidden">
              <CardHeader className="py-3 border-b">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {activeRoom.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 h-[calc(100%-4rem)] overflow-y-auto">
                <div className="flex flex-col gap-3">
                  {messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      No messages yet. Start the conversation!
                    </p>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      const senderName = senderNames[msg.sender_id] || 'Unknown';

                      return (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`flex items-end gap-2 ${isMe ? 'justify-end' : ''}`}
                        >
                          {!isMe && (
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs">{senderName.charAt(0)}</AvatarFallback>
                            </Avatar>
                          )}
                          <div className={`max-w-[70%] ${isMe ? 'order-first' : ''}`}>
                            {!isMe && (
                              <p className="text-xs text-muted-foreground mb-1">{senderName}</p>
                            )}
                            <div className={`p-2.5 rounded-lg ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                              <p className="text-sm">{msg.content}</p>
                              <p className="text-xs opacity-70 mt-1 text-right">{formatTime(msg.created_at)}</p>
                            </div>
                          </div>
                          {isMe && (
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs">You</AvatarFallback>
                            </Avatar>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center gap-2 mt-2">
              <Button variant="outline" size="icon">
                <Paperclip className="h-4 w-4" />
              </Button>
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <Button onClick={handleSend}>
                <Send className="mr-2 h-4 w-4" /> Send
              </Button>
            </div>
          </>
        ) : (
          <Card className="flex-grow flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a chat room or create a new one</p>
            </div>
          </Card>
        )}
      </div>
    </motion.div>
  );
};