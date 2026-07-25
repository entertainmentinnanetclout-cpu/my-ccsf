import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Bot, CheckCircle2, Clock, FileText, Info, Radar, Send, User } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { CampusEmergencyContact } from '@/components/student/CampusEmergencyContact';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'guide';
  timestamp: Date;
}

type StudentView = 'report' | 'mycases' | 'safety';

type EmergencyContact = {
  label: string;
  phone_number: string;
  extension: string | null;
  availability: string | null;
};

const QUICK_ACTIONS = [
  { label: 'Emergency contacts', icon: AlertTriangle, intent: 'emergency' as const },
  { label: 'Report an incident', icon: FileText, intent: 'report' as const },
  { label: 'Check my cases', icon: Info, intent: 'mycases' as const },
  { label: 'Open Safety Mobility', icon: Radar, intent: 'safety' as const },
];

export const StudentChat = ({ onNavigate }: { onNavigate?: (view: StudentView) => void }) => {
  const { userProfile } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      content: 'Welcome to CCSF Guided Support. This tool explains how to use the portal and shows official campus contact information. It is not a live chat and does not dispatch emergency services.',
      sender: 'guide',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [contact, setContact] = useState<EmergencyContact | null>(null);
  const [contactError, setContactError] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    let cancelled = false;

    const loadContact = async () => {
      let query = supabase
        .from('campus_emergency_contacts')
        .select('label, phone_number, extension, availability')
        .eq('is_active', true)
        .order('priority', { ascending: false })
        .limit(1);

      query = userProfile?.campus
        ? query.or(`campus.eq.${userProfile.campus},campus.is.null`)
        : query.is('campus', null);

      const { data, error } = await query.maybeSingle();
      if (cancelled) return;
      setContact(data);
      setContactError(Boolean(error));
    };

    void loadContact();
    return () => {
      cancelled = true;
    };
  }, [userProfile?.campus]);

  const contactSummary = useMemo(() => {
    if (contactError) {
      return 'The official contact directory could not be loaded. Use the nearest CPS office or campus emergency point and retry when your connection is restored.';
    }
    if (!contact) {
      return 'No verified campus-specific number is currently published for your profile. Use the nearest CPS office or campus emergency point.';
    }
    const extension = contact.extension ? ` extension ${contact.extension}` : '';
    const availability = contact.availability ? ` Availability: ${contact.availability}.` : '';
    return `${contact.label}: ${contact.phone_number}${extension}.${availability}`;
  }, [contact, contactError]);

  const addExchange = (question: string, answer: string) => {
    const stamp = Date.now();
    setMessages((current) => [
      ...current,
      { id: `${stamp}-user`, content: question, sender: 'user', timestamp: new Date() },
      { id: `${stamp}-guide`, content: answer, sender: 'guide', timestamp: new Date() },
    ]);
  };

  const handleIntent = (intent: 'emergency' | StudentView, label: string) => {
    if (intent === 'emergency') {
      addExchange(label, `For immediate danger, contact emergency services directly. ${contactSummary} Submitting a portal report does not replace an emergency call.`);
      return;
    }

    const responses: Record<StudentView, string> = {
      report: 'Opening the verified incident-report form. Complete the required statement, consent and evidence fields before submitting.',
      mycases: 'Opening My Cases, where you can view reports associated with your account and their recorded status updates.',
      safety: 'Opening Safety Mobility, where you can use In-Transit, Night Travel, Track This Phone, Campus Radar and the retained live campus map.',
    };
    addExchange(label, responses[intent]);
    onNavigate?.(intent);
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const lower = text.toLowerCase();

    if (lower.includes('emergency') || lower.includes('urgent') || lower.includes('danger')) {
      addExchange(text, `For immediate danger, contact emergency services directly. ${contactSummary} This support guide cannot dispatch help.`);
    } else if (lower.includes('status') || lower.includes('case') || lower.includes('report')) {
      addExchange(text, 'Use My Cases to see the status recorded against your own reports. This support guide does not invent or estimate case outcomes.');
    } else if (lower.includes('location') || lower.includes('map') || lower.includes('travel') || lower.includes('uber') || lower.includes('radar')) {
      addExchange(text, 'Use Safety Mobility for the retained live campus map, In-Transit, Night Travel, Track This Phone and opt-in Campus Radar. Browser location access is voluntary and may pause when the app is closed.');
    } else {
      addExchange(text, 'Choose one of the verified actions below. For case-specific information, use My Cases; for a new incident, use Report; for travel or location safety, use Safety Mobility; for immediate danger, use the official contact shown here.');
    }
    setInput('');
  };

  return (
    <Card className="flex h-[620px] flex-col overflow-hidden shadow-large" aria-labelledby="guided-support-title">
      <div className="flex items-center gap-3 bg-gradient-to-r from-primary to-primary/80 p-4">
        <Avatar className="h-10 w-10 border-2 border-white/20">
          <AvatarFallback className="bg-white/20 text-white"><Bot className="h-5 w-5" aria-hidden="true" /></AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <h3 id="guided-support-title" className="flex items-center gap-2 font-semibold text-white">
            CCSF Guided Support
            <Badge variant="secondary" className="border-0 bg-white/20 text-xs text-white">Portal guide</Badge>
          </h3>
          <p className="text-sm text-white/80">Not live chat · No emergency dispatch</p>
        </div>
      </div>

      <div className="border-b bg-card p-3">
        <CampusEmergencyContact />
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-4" role="log" aria-live="polite" aria-relevant="additions">
        <AnimatePresence initial={false}>
          {messages.map((message) => (
            <motion.div key={message.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[88%] gap-2 ${message.sender === 'user' ? 'flex-row-reverse' : ''}`}>
                <Avatar className="h-8 w-8">
                  <AvatarFallback className={message.sender === 'guide' ? 'bg-primary text-primary-foreground' : 'bg-secondary'}>
                    {message.sender === 'guide' ? <Bot className="h-4 w-4" aria-hidden="true" /> : <User className="h-4 w-4" aria-hidden="true" />}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className={`rounded-2xl p-3 ${message.sender === 'user' ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-card shadow-sm'}`}><p className="whitespace-pre-line text-sm">{message.content}</p></div>
                  <div className={`mt-1 flex items-center gap-1 text-xs text-muted-foreground ${message.sender === 'user' ? 'justify-end' : ''}`}><Clock className="h-3 w-3" aria-hidden="true" />{message.timestamp.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}{message.sender === 'user' && <CheckCircle2 className="ml-1 h-3 w-3 text-primary" aria-hidden="true" />}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t bg-card/50 px-4 py-3">
        <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Verified support actions">
          {QUICK_ACTIONS.map(({ label, icon: Icon, intent }) => (
            <Button key={label} variant="outline" size="sm" className="flex-shrink-0 gap-1.5 text-xs" onClick={() => handleIntent(intent, label)}><Icon className="h-3.5 w-3.5" aria-hidden="true" />{label}</Button>
          ))}
        </div>
      </div>

      <div className="border-t bg-card p-4">
        <form onSubmit={(event) => { event.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask how to use the CCSF portal" aria-label="Ask the CCSF portal guide" className="flex-1" />
          <Button type="submit" size="icon" disabled={!input.trim()} aria-label="Send question to portal guide"><Send className="h-4 w-4" aria-hidden="true" /></Button>
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground">This guide provides navigation help only. It does not create case references, access private case details, or contact emergency services.</p>
      </div>
    </Card>
  );
};
