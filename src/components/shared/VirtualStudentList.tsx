import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

interface VirtualStudentListProps {
  students: Profile[];
  onStudentClick?: (student: Profile) => void;
  height?: number;
}

export const VirtualStudentList = ({ 
  students, 
  onStudentClick, 
  height = 500 
}: VirtualStudentListProps) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: students.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 10,
  });

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
        <Users className="h-8 w-8 mb-2 opacity-50" />
        <p>No students found</p>
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className="overflow-auto border rounded-lg"
      style={{ height }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="grid grid-cols-5 gap-2 px-4 py-2 text-sm font-medium text-muted-foreground">
          <span>Name</span>
          <span>Student Number</span>
          <span>Email</span>
          <span>Phone</span>
          <span>Residence</span>
        </div>
      </div>

      <div
        style={{
          height: `${rowVirtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {rowVirtualizer.getVirtualItems().map((virtualItem) => {
          const student = students[virtualItem.index];
          return (
            <div
              key={student.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className={`grid grid-cols-5 gap-2 px-4 py-3 items-center border-b hover:bg-muted/50 cursor-pointer transition-colors ${
                virtualItem.index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
              }`}
              onClick={() => onStudentClick?.(student)}
            >
              <span className="text-sm truncate">{student.full_name || 'N/A'}</span>
              <span className="text-sm truncate">{student.student_number || 'N/A'}</span>
              <span className="text-sm truncate">{student.email}</span>
              <span className="text-sm truncate">{student.phone_number || 'N/A'}</span>
              <span className="text-sm truncate">{student.residence || 'N/A'}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
