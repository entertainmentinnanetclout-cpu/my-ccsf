import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Send, Bot, User, Clock, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const generateCaseNumber = () => `Ref#${Math.floor(1000 + Math.random() * 9000)}TUT`;

export const StudentChat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [caseNumber] = useState(generateCaseNumber);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    setTimeout(() => {
      setMessages([{
        id: '1',
        content: `👋 Welcome to CCSF Support!\n\nYour Case Number is ${caseNumber}.\n\nI'm your AI assistant. How can I help you today?`,
        sender: 'bot',
        timestamp: new Date(),
      }]);
    }, 500);
  }, [caseNumber]);

  const getBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent')) {
      return `🚨 EMERGENCY RESPONSE:\n\n📞 Campus Security: 012 382 5000\n📞 SAPS: 10111\n📞 Ambulance: 10177`;
    }
    if (lowerMessage.includes('status') || lowerMessage.includes('check')) {
      return `📋 Case Status Update for ${caseNumber}:\n\nYour Case has been handed over to the investigation board.\n\n📞 Campus Security: 012 382 5000`;
    }
    return `Thank you for your message regarding ${caseNumber}.\n\nFor immediate help:\n📞 Campus Security: 012 382 5000`;
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const userMessage: Message = { id: Date.now().toString(), content: input, sender: 'user', timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const botResponse: Message = { id: (Date.now() + 1).toString(), content: getBotResponse(input), sender: 'bot', timestamp: new Date() };
      setMessages(prev => [...prev, botResponse]);
    }, 1500);
  };

  return (
    <Card className="flex flex-col h-[600px] sm:h-[650px] shadow-large overflow-hidden">
      <div className="bg-gradient-to-r from-primary to-primary/80 p-4 flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-white/20">
          <AvatarFallback className="bg-white/20 text-white"><Bot className="h-5 w-5" /></AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="text-white font-semibold">CCSF Support</h3>
          <p className="text-white/70 text-sm flex items-center gap-1">
            <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse" />Online • AI Assistant
          </p>
        </div>
        <p className="text-white/70 text-xs">{caseNumber}</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-muted/30">
        <AnimatePresence>
          {messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex gap-2 max-w-[85%] ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={message.sender === 'bot' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                    {message.sender === 'bot' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className={`rounded-2xl p-3 ${message.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-card shadow-sm rounded-bl-sm'}`}>
                    <p className="text-sm whitespace-pre-line">{message.content}</p>
                  </div>
                  <div className={`flex items-center gap-1 text-xs text-muted-foreground mt-1 ${message.sender === 'user' ? 'justify-end' : ''}`}>
                    <Clock className="h-3 w-3" />
                    {message.timestamp.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                    {message.sender === 'user' && <CheckCircle2 className="h-3 w-3 text-primary ml-1" />}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
            <Avatar className="h-8 w-8"><AvatarFallback className="bg-primary text-primary-foreground"><Bot className="h-4 w-4" /></AvatarFallback></Avatar>
            <div className="bg-card rounded-2xl rounded-bl-sm p-3 shadow-sm">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </motion.div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="px-4 py-2 border-t border-border/50 bg-card/50">
        <div className="flex gap-2 overflow-x-auto pb-2">
          {['Check Status', 'Emergency Help'].map((action) => (
            <Button key={action} variant="outline" size="sm" className="flex-shrink-0 text-xs" onClick={() => { setInput(action); }}>
              {action}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Type your message..." className="flex-1" />
          <Button type="submit" size="icon" disabled={!input.trim()}><Send className="h-4 w-4" /></Button>
        </form>
      </div>
    </Card>
  );
};
