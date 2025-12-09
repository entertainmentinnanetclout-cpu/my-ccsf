import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCases } from '@/contexts/CasesContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Paperclip, Send } from 'lucide-react';
import { Link } from 'react-router-dom';

type Message = {
  id: number;
  sender: string;
  text: string;
  time: string;
  caseId?: string;
};

const mockChats: Record<string, Message[]> = {
  'J. Doe': [
    { id: 1, sender: 'J. Doe', text: 'Any update on #C-1221?', time: '10:30', caseId: 'C-1221' },
    { id: 2, sender: 'You', text: 'I am looking into it now.', time: '10:31' },
  ]
};

export const StaffCommunication = () => {
  const { updateCaseStatus } = useCases();
  const [activeChat, setActiveChat] = useState('J. Doe');
  const [messages, setMessages] = useState<Message[]>(mockChats[activeChat]);
  const [newMessage, setNewMessage] = useState('');

  const handleSend = () => {
    if (newMessage.trim()) {
      const newMsg: Message = { 
        id: Date.now(), 
        sender: 'You', 
        text: newMessage, 
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
      };
      setMessages([...messages, newMsg]);
      mockChats[activeChat] = [...messages, newMsg];
      setNewMessage('');
    }
  };

  const renderMessageText = (text: string) => {
    const caseRegex = /#C-\d{4}/g;
    const parts = text.split(caseRegex);
    const matches = text.match(caseRegex);

    return parts.map((part, i) => (
      <span key={i}>
        {part}
        {matches && matches[i] && (
          <Button variant="link" asChild className="p-0 h-auto">
            <Link to="/admin">{matches[i]}</Link>
          </Button>
        )}
      </span>
    ));
  };

  const activeCaseId = messages.find(m => m.caseId)?.caseId;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-4 gap-4 h-[calc(100vh-20rem)]">
      <Card className="lg:col-span-1">
        <CardContent className="p-2">
          <Input placeholder="Search chat..." className="mb-2" />
          <div className="flex flex-col gap-2">
            {Object.keys(mockChats).map(chatName => (
              <div 
                key={chatName} 
                onClick={() => { setActiveChat(chatName); setMessages(mockChats[chatName]); }} 
                className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${activeChat === chatName ? 'bg-muted' : ''}`}
              >
                <Avatar><AvatarFallback>{chatName.charAt(0)}</AvatarFallback></Avatar>
                <div>
                  <div className="font-semibold">{chatName}</div>
                  <div className="text-xs text-muted-foreground">{mockChats[chatName][mockChats[chatName].length - 1].text}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="lg:col-span-3 flex flex-col h-full">
        <Card className="flex-grow">
          <CardContent className="p-4 h-full overflow-y-auto">
            <div className="flex flex-col gap-4">
              {messages.map((msg) => (
                <motion.div 
                  key={msg.id} 
                  initial={{ opacity: 0, y: 10 }} 
                  animate={{ opacity: 1, y: 0 }} 
                  className={`flex items-end gap-2 ${msg.sender === 'You' ? 'justify-end' : ''}`}
                >
                  {msg.sender !== 'You' && <Avatar><AvatarFallback>{msg.sender.charAt(0)}</AvatarFallback></Avatar>}
                  <div className={`p-2 rounded-lg ${msg.sender === 'You' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <div className="text-sm">{renderMessageText(msg.text)}</div>
                    <div className="text-xs text-right mt-1 opacity-70">{msg.time}</div>
                  </div>
                  {msg.sender === 'You' && <Avatar><AvatarFallback>Y</AvatarFallback></Avatar>}
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
        {activeCaseId &&
          <div className="flex items-center gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={() => updateCaseStatus(activeCaseId, 'Resolved')}>Mark as Resolved</Button>
            <Button variant="outline" size="sm" onClick={() => updateCaseStatus(activeCaseId, 'Escalated to SDS')}>Escalate to SDS</Button>
          </div>
        }
        <div className="flex items-center gap-2 mt-2">
          <Button variant="outline" size="icon"><Paperclip className="h-4 w-4" /></Button>
          <Input 
            placeholder="Type a message..." 
            value={newMessage} 
            onChange={(e) => setNewMessage(e.target.value)} 
            onKeyPress={(e) => e.key === 'Enter' && handleSend()} 
          />
          <Button onClick={handleSend}><Send className="mr-2 h-4 w-4" /> Send</Button>
        </div>
      </div>
    </motion.div>
  );
};
