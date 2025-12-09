import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const mockCases = [
  { id: "C-1221", campus: "Main", residence: "Zeddishoef", type: "GBV", status: "Pending", date: "2025-11-01" },
  { id: "C-1222", campus: "Arcadia", residence: "Denise", type: "Violence", status: "Resolved", date: "2025-10-30" },
  { id: "C-1223", campus: "Arts", residence: "Tempo", type: "Theft", status: "Assigned", date: "2025-10-29" },
  { id: "C-1224", campus: "Mbombela", residence: "Marabastad", type: "Misconduct", status: "Pending", date: "2025-10-27" },
];

export const LatestCases = () => {
  const [search, setSearch] = useState('');

  const filteredCases = mockCases.filter(
    (c) =>
      c.id.toLowerCase().includes(search.toLowerCase()) ||
      c.campus.toLowerCase().includes(search.toLowerCase()) ||
      c.residence.toLowerCase().includes(search.toLowerCase()) ||
      c.type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <motion.div
      className="bg-card p-4 rounded-lg shadow-large"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-foreground">Latest Cases</h2>
        <Button variant="link" asChild>
          <Link to="/admin">See All</Link>
        </Button>
      </div>
      <Input
        placeholder="Search by Case ID, Campus, Residence, or Type"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
            <tr>
              <th scope="col" className="px-6 py-3">Case ID</th>
              <th scope="col" className="px-6 py-3">Campus</th>
              <th scope="col" className="px-6 py-3">Residence</th>
              <th scope="col" className="px-6 py-3">Type</th>
              <th scope="col" className="px-6 py-3">Date</th>
              <th scope="col" className="px-6 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredCases.map((c) => (
              <motion.tr
                key={c.id}
                className="bg-card border-b hover:bg-muted/30"
                whileHover={{ scale: 1.02 }}
              >
                <td className="px-6 py-4">{c.id}</td>
                <td className="px-6 py-4">{c.campus}</td>
                <td className="px-6 py-4">{c.residence}</td>
                <td className="px-6 py-4">{c.type}</td>
                <td className="px-6 py-4">{c.date}</td>
                <td className="px-6 py-4">{c.status}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};
