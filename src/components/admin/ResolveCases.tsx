import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useCases } from '@/contexts/CasesContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, RotateCcw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const ResolveCases = () => {
  const { cases, loading, updateCaseStatus } = useCases();
  const { toast } = useToast();
  const [filters, setFilters] = useState({ campus: '', category: '', status: '', search: '' });
  const [filteredCases, setFilteredCases] = useState(cases);

  useEffect(() => {
    setFilteredCases(cases);
  }, [cases]);

  const handleFilter = () => {
    let tempCases = cases;
    if (filters.campus) tempCases = tempCases.filter((c) => c.campus === filters.campus);
    if (filters.category) tempCases = tempCases.filter((c) => c.category === filters.category);
    if (filters.status) tempCases = tempCases.filter((c) => c.status === filters.status);
    if (filters.search) {
      tempCases = tempCases.filter((c) =>
        Object.values(c).some((val) => val?.toString().toLowerCase().includes(filters.search.toLowerCase()))
      );
    }
    setFilteredCases(tempCases);
  };

  const handleReset = () => {
    setFilters({ campus: '', category: '', status: '', search: '' });
    setFilteredCases(cases);
  };

  const handleStatusChange = async (caseId: string, status: string) => {
    try {
      await updateCaseStatus(caseId, status);
      toast({ title: 'Success', description: `Case status updated to ${status}` });
    } catch {
      toast({ title: 'Error', description: 'Failed to update case status', variant: 'destructive' });
    }
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'resolved': return 'secondary';
      case 'pending': return 'outline';
      case 'assigned': return 'default';
      case 'in_progress': return 'outline';
      default: return 'destructive';
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Loading cases...</span>
        </div>
      </Card>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle>Filter Cases</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Select onValueChange={(v) => setFilters({ ...filters, campus: v })}>
            <SelectTrigger><SelectValue placeholder="Campus" /></SelectTrigger>
            <SelectContent>
              {[...new Set(cases.map(c => c.campus).filter(Boolean))].map((c, idx) => (
                <SelectItem key={`campus-${idx}`} value={c as string}>{c as string}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => setFilters({ ...filters, category: v })}>
            <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              {[...new Set(cases.map(c => c.category))].map((t, idx) => (
                <SelectItem key={`category-${idx}`} value={t as string}>{t as string}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {[...new Set(cases.map(c => c.status))].map((s, idx) => (
                <SelectItem key={`status-${idx}`} value={s as string}>{s as string}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input placeholder="Search..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
          <div className="flex gap-2">
            <Button onClick={handleFilter}><Search className="mr-2 h-4 w-4" /> Search</Button>
            <Button onClick={handleReset} variant="outline"><RotateCcw className="mr-2 h-4 w-4" /> Reset</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Cases ({filteredCases.length})</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="p-2 text-left">Title</th>
                  <th className="text-left">Campus</th>
                  <th className="text-left">Category</th>
                  <th className="text-left">Date</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Location</th>
                  <th className="text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => (
                  <motion.tr key={c.id} whileHover={{ scale: 1.01 }} className="border-b">
                    <td className="p-2 max-w-[200px] truncate">{c.title}</td>
                    <td>{c.campus || 'N/A'}</td>
                    <td>{c.category}</td>
                    <td>{formatDate(c.created_at)}</td>
                    <td><Badge variant={getStatusVariant(c.status)}>{c.status}</Badge></td>
                    <td className="max-w-[150px] truncate">{c.location_description || 'N/A'}</td>
                    <td className="flex gap-1 p-1">
                      <Button size="sm" onClick={() => handleStatusChange(c.id, 'resolved')} title="Resolve">✅</Button>
                      <Button size="sm" onClick={() => handleStatusChange(c.id, 'closed')} title="Close">🚫</Button>
                      <Button size="sm" onClick={() => handleStatusChange(c.id, 'in_progress')} title="Investigate">🔍</Button>
                    </td>
                  </motion.tr>
                ))}
                {filteredCases.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-4 text-center text-muted-foreground">
                      No cases found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};