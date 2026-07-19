import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { savePilotFeedback, updatePilotSession } from '@/services/pilot/pilotCoreService';
import type { PilotProgram, PilotSession } from '@/types/pilot';

export function PilotFeedbackForm({
  program,
  session,
  onCompleted,
}: {
  program: PilotProgram;
  session: PilotSession;
  onCompleted: (session: PilotSession) => void;
}) {
  const { toast } = useToast();
  const [ease, setEase] = useState('');
  const [confidence, setConfidence] = useState('');
  const [clarity, setClarity] = useState('');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!ease || !confidence || !clarity) {
      toast({ title: 'Complete all ratings', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      await savePilotFeedback({
        program_id: program.id,
        session_id: session.id,
        ease_of_use_rating: Number(ease),
        confidence_rating: Number(confidence),
        clarity_rating: Number(clarity),
        would_use_in_emergency: Number(confidence) >= 3,
        comments: comments.trim() || null,
      });
      const updated = await updatePilotSession(session.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });
      onCompleted(updated);
      toast({
        title: 'Pilot session completed',
        description: 'Your controlled-test feedback was recorded. No emergency service was dispatched.',
      });
    } catch (error) {
      toast({
        title: 'Completion failed',
        description: error instanceof Error ? error.message : 'Try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-large">
      <CardHeader>
        <CardTitle>Pilot Feedback</CardTitle>
        <CardDescription>Rate the controlled workflow before completing the session.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Rating label="Ease of use" value={ease} onChange={setEase} />
        <Rating label="Confidence using the workflow" value={confidence} onChange={setConfidence} />
        <Rating label="Clarity of instructions and warnings" value={clarity} onChange={setClarity} />
        <div className="space-y-2">
          <Label htmlFor="pilot-feedback-comments">Additional feedback</Label>
          <Textarea
            id="pilot-feedback-comments"
            rows={5}
            value={comments}
            onChange={(event) => setComments(event.target.value)}
            maxLength={5000}
          />
        </div>
        <Button className="w-full" size="lg" onClick={submit} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
          Complete Pilot Session
        </Button>
      </CardContent>
    </Card>
  );
}

function Rating({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((rating) => (
          <Label
            key={rating}
            className={`flex cursor-pointer flex-col items-center rounded-lg border p-3 ${value === String(rating) ? 'border-primary bg-primary/5' : ''}`}
          >
            <RadioGroupItem value={String(rating)} className="sr-only" />
            <span className="font-bold">{rating}</span>
            <span className="text-[10px] text-muted-foreground">{rating === 1 ? 'Low' : rating === 5 ? 'High' : ''}</span>
          </Label>
        ))}
      </RadioGroup>
    </div>
  );
}
