import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';

const mockMessages = [
  { id: '1', sender: 'John Doe', message: 'All clear in Block A', time: '10:30 AM' },
  { id: '2', sender: 'Jane Smith', message: 'Visitor checked in at Gate 2', time: '10:45 AM' },
];

const StaffChat = ({ isAdmin = false }: { isAdmin?: boolean }) => {
  const [message, setMessage] = useState('');

  return (
    <div className={`rounded-lg ${isAdmin ? 'bg-transparent' : 'bg-white/70 backdrop-blur'} p-4`}>
      <div className="h-64 overflow-y-auto space-y-3 mb-4">
        {mockMessages.map((m) => (
          <div key={m.id} className={`p-3 rounded-lg ${isAdmin ? 'bg-white/10' : 'bg-slate-50'}`}>
            <div className="flex justify-between text-sm">
              <span className={`font-medium ${isAdmin ? 'text-white' : 'text-slate-900'}`}>{m.sender}</span>
              <span className={isAdmin ? 'text-purple-300' : 'text-slate-400'}>{m.time}</span>
            </div>
            <p className={`text-sm mt-1 ${isAdmin ? 'text-purple-100' : 'text-slate-600'}`}>{m.message}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Type a message..." className={isAdmin ? 'bg-white/10 border-white/20 text-white placeholder:text-purple-300' : ''} />
        <Button size="icon" className={isAdmin ? 'bg-purple-600 hover:bg-purple-700' : ''}><Send className="h-4 w-4" /></Button>
      </div>
    </div>
  );
};

export default StaffChat;
