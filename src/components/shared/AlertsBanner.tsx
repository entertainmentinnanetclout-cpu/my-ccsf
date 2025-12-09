import { AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

const AlertsBanner = () => {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  
  return (
    <div className="bg-amber-500 text-white px-4 py-3">
      <div className="container mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5" />
          <span className="text-sm font-medium">Security Alert: Please be vigilant in parking areas after dark.</span>
        </div>
        <button onClick={() => setDismissed(true)} className="hover:bg-white/20 rounded p-1"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

export default AlertsBanner;
