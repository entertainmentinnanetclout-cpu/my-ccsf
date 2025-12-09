import { motion } from 'framer-motion';

const mockCases = [
  { id: "C-1221", campus: "Main", residence: "Zeddishoef", type: "GBV", status: "Pending", date: "2025-11-01" },
  { id: "C-1222", campus: "Arcadia", residence: "Denise", type: "Violence", status: "Resolved", date: "2025-10-30" },
];

export const EmergencyCases = () => {
  return (
    <motion.div
      className="bg-card p-4 rounded-lg shadow-large"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className="text-lg font-semibold mb-4 text-destructive">Emergency Cases</h2>
      <div className="flex flex-col gap-4">
        {mockCases.map((c) => (
          <motion.div
            key={c.id}
            className="p-4 rounded-lg bg-gradient-to-r from-destructive to-destructive/80 text-destructive-foreground"
            animate={{
              scale: [1, 1.02, 1],
              boxShadow: [
                '0 0 0 0 rgba(239, 68, 68, 0.7)',
                '0 0 0 10px rgba(239, 68, 68, 0)',
                '0 0 0 0 rgba(239, 68, 68, 0)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <div className="flex justify-between items-center">
              <span className="font-bold">{c.type}</span>
              <span>{c.date}</span>
            </div>
            <div className="text-sm mt-2">
              {c.campus} - {c.residence}
            </div>
            <div className="text-right mt-2 font-semibold">{c.status}</div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};
