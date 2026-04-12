import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, Clock, CheckCircle2, Phone, AlertTriangle, Info } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

const generateCaseNumber = () => `Ref#${Math.floor(1000 + Math.random() * 9000)}TUT`;

const QUICK_ACTIONS = [
  { label: 'Emergency Help', icon: AlertTriangle, color: 'text-destructive' },
  { label: 'Check Status', icon: Info, color: 'text-primary' },
  { label: 'Contact Security', icon: Phone, color: 'text-success' },
];

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
        content: `👋 Welcome to CCSF AI Support!\n\nYour reference number is ${caseNumber}.\n\nI'm an AI assistant here to help you with:\n• Emergency contacts\n• Case status updates\n• General security questions\n\nHow can I assist you today?`,
        sender: 'bot',
        timestamp: new Date(),
      }]);
    }, 500);
  }, [caseNumber]);

  const getBotResponse = (userMessage: string): string => {
    const lowerMessage = userMessage.toLowerCase();
    
    if (lowerMessage.includes('emergency') || lowerMessage.includes('urgent') || lowerMessage.includes('help')) {
      return `🚨 EMERGENCY CONTACTS:\n\n📞 Campus Security (24/7): 012 382 5000\n📞 SAPS Emergency: 10111\n📞 Ambulance: 10177\n📞 Fire Department: 10111\n\nIf you're in immediate danger, please call 10111 immediately!\n\nFor non-emergency incidents, use the "Report Incident" feature in the app.`;
    }
    
    if (lowerMessage.includes('status') || lowerMessage.includes('check') || lowerMessage.includes('update')) {
      return `📋 Case Status (${caseNumber}):\n\nTo check your reported incidents:\n1. Go to "My Reports" in the menu\n2. Select your case to view details\n3. Track status updates in real-time\n\nAlternatively, you can view the Judiciary portal for hearing schedules.\n\n📞 For urgent updates: 012 382 5000`;
    }
    
    if (lowerMessage.includes('report') || lowerMessage.includes('incident')) {
      return `📝 TO REPORT AN INCIDENT:\n\n1. Use the "Report Incident" button on the dashboard\n2. Fill in the incident details\n3. Add location and photos if available\n4. Submit for immediate review\n\nFor emergencies, always call security first:\n📞 012 382 5000`;
    }
    
    if (lowerMessage.includes('contact') || lowerMessage.includes('security') || lowerMessage.includes('call')) {
      return `📞 CAMPUS SECURITY CONTACTS:\n\n🏢 Main Office: 012 382 5000\n📧 Email: security@tut.ac.za\n\n🏥 Emergency Services:\n• SAPS: 10111\n• Ambulance: 10177\n• Fire: 10111\n\n🏠 Campus-specific numbers available on your campus notice board.`;
    }
    
    if (lowerMessage.includes('hours') || lowerMessage.includes('available') || lowerMessage.includes('open')) {
      return `⏰ SECURITY OFFICE HOURS:\n\n🔒 Campus Security: 24/7\n🏢 Admin Office: Mon-Fri 8:00-16:30\n\nSecurity patrols are active around the clock on all campuses.`;
    }
    
    return `Thank you for your message.\n\nI can help you with:\n• 🚨 Emergency contacts\n• 📋 Case status inquiries\n• 📝 How to report incidents\n• 📞 Security contact information\n\nPlease try one of the quick actions below or ask a specific question.\n\nFor urgent matters:\n📞 Campus Security: 012 382 5000`;
  };

  const handleSend = (messageText?: string) => {
    const text = messageText || input;
    if (!text.trim()) return;
    
    const userMessage: Message = { 
      id: Date.now().toString(), 
      content: text, 
      sender: 'user', 
      timestamp: new Date() 
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const botResponse: Message = { 
        id: (Date.now() + 1).toString(), 
        content: getBotResponse(text), 
        sender: 'bot', 
        timestamp: new Date() 
      };
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
          <h3 className="text-white font-semibold flex items-center gap-2">
            CCSF Support
            <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0">AI Assistant</Badge>
          </h3>
          <p className="text-white/70 text-sm flex items-center gap-1">
            <span className="h-2 w-2 bg-success rounded-full animate-pulse" />
            Always Available
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
          {QUICK_ACTIONS.map(({ label, icon: Icon, color }) => (
            <Button 
              key={label} 
              variant="outline" 
              size="sm" 
              className="flex-shrink-0 text-xs gap-1.5" 
              onClick={() => handleSend(label)}
            >
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              {label}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-border bg-card">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder="Type your message..." 
            className="flex-1" 
          />
          <Button type="submit" size="icon" disabled={!input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-2">
          This is an AI assistant. For emergencies, call 012 382 5000
        </p>
      </div>
    </Card>
  );
};