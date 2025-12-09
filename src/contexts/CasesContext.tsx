import React, { createContext, useContext, useState, ReactNode } from 'react';

interface Case {
  id: string;
  campus: string;
  residence: string;
  type: string;
  status: string;
  date: string;
  officer: string;
}

interface CasesContextType {
  cases: Case[];
  updateCaseStatus: (caseId: string, status: string) => void;
}

const mockCases: Case[] = [
  { id: "C-1221", campus: "Main", residence: "Zeddishoef", type: "GBV", status: "Pending", date: "2025-11-01", officer: "J. Doe" },
  { id: "C-1222", campus: "Arcadia", residence: "Denise", type: "Violence", status: "Resolved", date: "2025-10-30", officer: "A. Smith" },
  { id: "C-1223", campus: "Arts", residence: "Tempo", type: "Theft", status: "Assigned", date: "2025-10-29", officer: "P. Jones" },
  { id: "C-1224", campus: "Mbombela", residence: "Marabastad", type: "Misconduct", status: "Pending", date: "2025-10-27", officer: "S. Lee" },
  { id: "C-1225", campus: "Main", residence: "Koljanner", type: "Other", status: "Under Investigation", date: "2025-10-26", officer: "J. Doe" },
];

const CasesContext = createContext<CasesContextType | null>(null);

interface CasesProviderProps {
  children: ReactNode;
}

export const CasesProvider: React.FC<CasesProviderProps> = ({ children }) => {
  const [cases, setCases] = useState<Case[]>(mockCases);

  const updateCaseStatus = (caseId: string, status: string) => {
    setCases((prevCases) =>
      prevCases.map((c) => (c.id === caseId ? { ...c, status } : c))
    );
  };

  return (
    <CasesContext.Provider value={{ cases, updateCaseStatus }}>
      {children}
    </CasesContext.Provider>
  );
};

export const useCases = (): CasesContextType => {
  const context = useContext(CasesContext);
  if (!context) {
    throw new Error('useCases must be used within a CasesProvider');
  }
  return context;
};
