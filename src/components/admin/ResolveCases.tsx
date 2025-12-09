import { useState } from 'react';
import { motion } from 'framer-motion';
import { useCases } from '@/contexts/CasesContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, RotateCcw } from 'lucide-react';

export const ResolveCases = () => {
  const { cases, updateCaseStatus } = useCases();
  const [filters, setFilters] = useState({ campus: '', type: '', status: '', search: '' });
  const [filteredCases, setFilteredCases] = useState(cases);

  const handleFilter = () => {
    let tempCases = cases;
    if (filters.campus) tempCases = tempCases.filter((c) => c.campus === filters.campus);
    if (filters.type) tempCases = tempCases.filter((c) => c.type === filters.type);
    if (filters.status) tempCases = tempCases.filter((c) => c.status === filters.status);
    if (filters.search) {
      tempCases = tempCases.filter((c) =>
        Object.values(c).some((val) => val.toString().toLowerCase().includes(filters.search.toLowerCase()))
      );
    }
    setFilteredCases(tempCases);
  };

  const handleReset = () => {
    setFilters({ campus: '', type: '', status: '', search: '' });
    setFilteredCases(cases);
  };

  const getStatusVariant = (status: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (status) {
      case 'Resolved': return 'secondary';
      case 'Pending': return 'outline';
      case 'Assigned': return 'default';
      case 'Under Investigation': return 'outline';
      default: return 'destructive';
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col gap-4">
      <Card>
        <CardHeader><CardTitle>Filter Cases</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Select onValueChange={(v) => setFilters({ ...filters, campus: v })}>
            <SelectTrigger><SelectValue placeholder="Campus" /></SelectTrigger>
            <SelectContent>
              {[...new Set(cases.map(c => c.campus))].map((c, idx) => (
                <SelectItem key={`campus-${idx}`} value={c as string}>{c as string}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => setFilters({ ...filters, type: v })}>
            <SelectTrigger><SelectValue placeholder="Case Type" /></SelectTrigger>
            <SelectContent>
              {[...new Set(cases.map(c => c.type))].map((t, idx) => (
                <SelectItem key={`type-${idx}`} value={t as string}>{t as string}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select onValueChange={(v) => setFilters({ ...filters, status: v })}>
            <SelectTrigger><SelectValue placeholder="Case Status" /></SelectTrigger>
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
                  <th className="p-2 text-left">Case ID</th>
                  <th className="text-left">Campus</th>
                  <th className="text-left">Residence</th>
                  <th className="text-left">Type</th>
                  <th className="text-left">Date</th>
                  <th className="text-left">Status</th>
                  <th className="text-left">Officer</th>
                  <th className="text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.map((c) => (
                  <motion.tr key={c.id} whileHover={{ scale: 1.02 }} className="border-b">
                    <td className="p-2">{c.id}</td>
                    <td>{c.campus}</td>
                    <td>{c.residence}</td>
                    <td>{c.type}</td>
                    <td>{c.date}</td>
                    <td><Badge variant={getStatusVariant(c.status)}>{c.status}</Badge></td>
                    <td>{c.officer}</td>
                    <td className="flex gap-1 p-1">
                      <Button size="sm" onClick={() => updateCaseStatus(c.id, 'Resolved')}>✅</Button>
                      <Button size="sm" onClick={() => updateCaseStatus(c.id, 'Disqualified')}>🚫</Button>
                      <Button size="sm" onClick={() => updateCaseStatus(c.id, 'Under Investigation')}>🔍</Button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
