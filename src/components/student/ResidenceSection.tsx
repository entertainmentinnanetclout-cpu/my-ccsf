import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, Users, Shield, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Residence {
  id: number;
  property_name: string;
  campus: string;
  address: string | null;
  bed_count: string | null;
  res_manager_name: string | null;
  res_manager_phone: string | null;
  email: string | null;
}

export const ResidenceSection = () => {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [residences, setResidences] = useState<Residence[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const { toast } = useToast();

  const campuses = [
    { value: 'all', label: 'All Campuses' },
    { value: 'Pretoria West (Main Campus)', label: 'Pretoria West (Main Campus)' },
    { value: 'Arcadia Campus', label: 'Arcadia Campus' },
    { value: 'Arts Campus', label: 'Arts Campus' },
    { value: 'Ga-Rankuwa Campus', label: 'Ga-Rankuwa Campus' },
    { value: 'Mbombela Campus', label: 'Mbombela Campus' },
    { value: 'Polokwane Campus', label: 'Polokwane Campus' },
    { value: 'Soshanguve North Campus', label: 'Soshanguve North Campus' },
    { value: 'Soshanguve South Campus', label: 'Soshanguve South Campus' },
  ];

  useEffect(() => {
    fetchResidences();
  }, [selectedCampus]);

  const fetchResidences = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('accredited_residences')
        .select('*')
        .eq('is_accredited', true)
        .order('property_name', { ascending: true });

      if (selectedCampus !== 'all') {
        query = query.eq('campus', selectedCampus);
      }

      const { data, error } = await query;

      if (error) throw error;
      setResidences(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading residences',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-3 xs:space-y-4 bg-card/30 backdrop-blur-sm p-3 xs:p-4 sm:p-6 rounded-xl sm:rounded-2xl border-2 border-card/20 shadow-lg sm:shadow-large">
      <div className="flex items-start sm:items-center justify-between flex-wrap gap-2 xs:gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg xs:text-xl sm:text-2xl font-bold flex items-center gap-1.5 xs:gap-2 text-foreground">
            <Building2 className="w-5 h-5 xs:w-6 xs:h-6 text-foreground flex-shrink-0" />
            <span className="leading-tight">TUT Accredited Residences</span>
          </h2>
          <p className="text-xs xs:text-sm text-muted-foreground mt-0.5">
            {residences.length} residences
            {selectedCampus !== 'all' && ` at ${selectedCampus}`}
          </p>
        </div>

        <div className="w-full sm:w-64">
          <Select value={selectedCampus} onValueChange={setSelectedCampus}>
            <SelectTrigger className="h-9 xs:h-10 text-xs xs:text-sm">
              <SelectValue placeholder="Filter by campus" />
            </SelectTrigger>
            <SelectContent>
              {campuses.map((campus) => (
                <SelectItem key={campus.value} value={campus.value} className="text-xs xs:text-sm">
                  {campus.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {residences.length === 0 ? (
        <Card className="p-8 text-center">
          <CardContent>
            <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No residences found for this campus</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {residences.map((residence, index) => (
            <motion.div
              key={residence.id}
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03, type: "spring", stiffness: 200 }}
              onHoverStart={() => setHoveredCard(index)}
              onHoverEnd={() => setHoveredCard(null)}
            >
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }}>
                <Card className="relative overflow-hidden transition-all shadow-large hover:shadow-xl h-full">
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0"
                    animate={{ opacity: hoveredCard === index ? 1 : 0 }}
                    transition={{ duration: 0.3 }}
                  />

                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <motion.div
                        animate={{
                          rotate: hoveredCard === index ? [0, -10, 10, 0] : 0
                        }}
                        transition={{ duration: 0.5 }}
                      >
                        <Building2 className="w-8 h-8 text-foreground" />
                      </motion.div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge variant="default" className="animate-fade-in">
                          <Shield className="w-3 h-3 mr-1" />
                          Accredited
                        </Badge>
                      </div>
                    </div>
                    <CardTitle className="mt-2 text-base leading-tight">{residence.property_name}</CardTitle>
                    <CardDescription className="flex items-start gap-1 text-xs">
                      <MapPin className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{residence.address || residence.campus}</span>
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-2">
                    <motion.div
                      className="flex items-center justify-between text-sm"
                      animate={{ x: hoveredCard === index ? 5 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        Beds
                      </span>
                      <span className="font-semibold">{residence.bed_count || 'N/A'}</span>
                    </motion.div>

                    {residence.res_manager_name && (
                      <div className="text-xs text-muted-foreground pt-2 border-t">
                        <p className="font-medium">Manager: {residence.res_manager_name}</p>
                        {residence.res_manager_phone && (
                          <p className="mt-1">📞 {residence.res_manager_phone}</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
