import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Wifi, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import { Constants } from '@/integrations/supabase/types';

interface WifiAccessPoint {
  id: string;
  campus: string;
  name: string;
  location: string;
  ssid: string;
  band: string;
  x_position: number;
  y_position: number;
  is_active: boolean;
  created_at: string;
}

const campusOptions = Constants.public.Enums.campus_location;
const campusLabels: Record<string, string> = {
  pretoria_west_main: 'Pretoria West (Main)',
  arcadia: 'Arcadia',
  arts: 'Arts',
  giyani: 'Giyani',
  mbombela: 'Mbombela',
  polokwane: 'Polokwane',
  garankuwa: 'Ga-Rankuwa',
  soshanguve_south: 'Soshanguve South',
  soshanguve_north: 'Soshanguve North',
  emalahleni: 'Emalahleni',
};

const emptyForm = {
  campus: '',
  name: '',
  location: '',
  ssid: 'TUT-WiFi',
  band: '2.4GHz',
  x_position: 50,
  y_position: 50,
  is_active: true,
};

export const WifiAccessPointManager = ({ campusFilter }: { campusFilter?: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [accessPoints, setAccessPoints] = useState<WifiAccessPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const fetchAccessPoints = async () => {
    setLoading(true);
    let query = supabase.from('wifi_access_points').select('*').order('campus').order('name');
    if (campusFilter) {
      query = query.eq('campus', campusFilter);
    }
    const { data, error } = await query;
    if (!error && data) setAccessPoints(data as WifiAccessPoint[]);
    setLoading(false);
  };

  useEffect(() => { fetchAccessPoints(); }, [campusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, campus: campusFilter || '' });
    setDialogOpen(true);
  };

  const openEdit = (ap: WifiAccessPoint) => {
    setEditingId(ap.id);
    setForm({
      campus: ap.campus,
      name: ap.name,
      location: ap.location,
      ssid: ap.ssid,
      band: ap.band,
      x_position: ap.x_position,
      y_position: ap.y_position,
      is_active: ap.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.campus || !form.name || !form.location) {
      toast({ title: 'Missing fields', description: 'Campus, name, and location are required.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase.from('wifi_access_points').update(form).eq('id', editingId);
        if (error) throw error;
        toast({ title: 'Updated', description: 'WiFi access point updated.' });
      } else {
        const { error } = await supabase.from('wifi_access_points').insert({ ...form, created_by: user?.id });
        if (error) throw error;
        toast({ title: 'Created', description: 'WiFi access point added.' });
      }
      setDialogOpen(false);
      fetchAccessPoints();
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this WiFi access point?')) return;
    const { error } = await supabase.from('wifi_access_points').delete().eq('id', id);
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'WiFi access point removed.' });
      fetchAccessPoints();
    }
  };

  return (
    <Card className="p-4 sm:p-6 shadow-large">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
          <Wifi className="h-5 w-5 text-primary" />
          WiFi Access Points
        </h2>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="h-4 w-4" /> Add Access Point
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : accessPoints.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wifi className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No WiFi access points configured yet.</p>
          <p className="text-xs mt-1">Add access points so students can see WiFi hotspot locations on the map.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {accessPoints.map((ap) => (
            <div key={ap.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <Wifi className={`h-4 w-4 shrink-0 ${ap.is_active ? 'text-success' : 'text-muted-foreground'}`} />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{ap.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{ap.location} · {ap.ssid} · {ap.band}</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!campusFilter && (
                  <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{campusLabels[ap.campus] || ap.campus}</Badge>
                )}
                <Badge variant={ap.is_active ? 'default' : 'secondary'} className="text-[10px]">
                  {ap.is_active ? 'Active' : 'Inactive'}
                </Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(ap)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(ap.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit' : 'Add'} WiFi Access Point</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Campus *</Label>
              <Select value={form.campus} onValueChange={(v) => setForm(f => ({ ...f, campus: v }))}>
                <SelectTrigger><SelectValue placeholder="Select campus" /></SelectTrigger>
                <SelectContent>
                  {campusOptions.map(c => (
                    <SelectItem key={c} value={c}>{campusLabels[c] || c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Library WiFi" />
            </div>
            <div className="space-y-1.5">
              <Label>Location *</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} placeholder="e.g. Library Building, 2nd Floor" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>SSID</Label>
                <Input value={form.ssid} onChange={e => setForm(f => ({ ...f, ssid: e.target.value }))} placeholder="TUT-WiFi" />
              </div>
              <div className="space-y-1.5">
                <Label>Band</Label>
                <Select value={form.band} onValueChange={v => setForm(f => ({ ...f, band: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2.4GHz">2.4GHz</SelectItem>
                    <SelectItem value="5GHz">5GHz</SelectItem>
                    <SelectItem value="2.4GHz/5GHz">Dual Band</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Map X Position (0-100)</Label>
                <Input type="number" min={0} max={100} value={form.x_position} onChange={e => setForm(f => ({ ...f, x_position: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Map Y Position (0-100)</Label>
                <Input type="number" min={0} max={100} value={form.y_position} onChange={e => setForm(f => ({ ...f, y_position: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
              <Label>Active</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {editingId ? 'Update' : 'Add'} Access Point
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
