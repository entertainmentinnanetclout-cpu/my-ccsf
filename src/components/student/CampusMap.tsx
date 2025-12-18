import { Card } from "@/components/ui/card";
import { MapPin, Shield, User, Radio } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Campus coordinates and details with accurate Google Maps embeds
const campusData: Record<string, { 
  name: string; 
  address: string; 
  embedUrl: string; 
  directionsUrl: string;
  phone: string;
  lat: number;
  lng: number;
}> = {
  pretoria_west_main: {
    name: 'Pretoria West (Main Campus)',
    address: 'Staatsartillerie Rd, Pretoria West, Pretoria, 0001',
    embedUrl: 'https://maps.google.com/maps?q=Tshwane+University+of+Technology+Pretoria+West+Campus&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=Tshwane+University+of+Technology+Pretoria+West+Campus',
    phone: '012 382 5911',
    lat: -25.7308,
    lng: 28.162,
  },
  arcadia: {
    name: 'Arcadia Campus',
    address: '175 Nelson Mandela Dr, Arcadia, Pretoria, 0083',
    embedUrl: 'https://maps.google.com/maps?q=TUT+Arcadia+Campus+175+Nelson+Mandela+Drive+Pretoria&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=TUT+Arcadia+Campus+Pretoria',
    phone: '012 382 5200',
    lat: -25.7425,
    lng: 28.2175,
  },
  arts: {
    name: 'Arts Campus',
    address: 'Cnr Struben & Prinsloo St, Pretoria, 0002',
    embedUrl: 'https://maps.google.com/maps?q=TUT+Arts+Campus+Pretoria&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=TUT+Arts+Campus+Pretoria',
    phone: '012 382 5300',
    lat: -25.7465,
    lng: 28.1878,
  },
  polokwane: {
    name: 'Polokwane Campus',
    address: '110 Market St, Polokwane, Limpopo, 0700',
    embedUrl: 'https://maps.google.com/maps?q=TUT+Polokwane+Campus+110+Market+Street&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=TUT+Polokwane+Campus',
    phone: '015 287 0700',
    lat: -23.9025,
    lng: 29.4549,
  },
  mbombela: {
    name: 'Mbombela Campus',
    address: 'Kanyamazane Rd, Mbombela, Mpumalanga, 1200',
    embedUrl: 'https://maps.google.com/maps?q=TUT+Mbombela+Campus+Mpumalanga&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=TUT+Mbombela+Campus',
    phone: '013 745 3500',
    lat: -25.4653,
    lng: 31.0218,
  },
  giyani: {
    name: 'Giyani Campus',
    address: 'Giyani Main Rd, Giyani, Limpopo, 0826',
    embedUrl: 'https://maps.google.com/maps?q=TUT+Giyani+Campus+Limpopo&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=TUT+Giyani+Campus',
    phone: '015 811 3500',
    lat: -23.3115,
    lng: 30.7195,
  },
  garankuwa: {
    name: 'Ga-Rankuwa Campus',
    address: 'Zone 3, Ga-Rankuwa, Pretoria, 0208',
    embedUrl: 'https://maps.google.com/maps?q=TUT+Ga-Rankuwa+Campus+Pretoria&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=TUT+Ga-Rankuwa+Campus',
    phone: '012 382 9400',
    lat: -25.6125,
    lng: 28.0165,
  },
  soshanguve_south: {
    name: 'Soshanguve South Campus',
    address: 'Block JJ, Soshanguve South, Pretoria, 0152',
    embedUrl: 'https://maps.google.com/maps?q=TUT+Soshanguve+South+Campus+Pretoria&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=TUT+Soshanguve+South+Campus',
    phone: '012 382 9600',
    lat: -25.5234,
    lng: 28.0978,
  },
  soshanguve_north: {
    name: 'Soshanguve North Campus',
    address: 'Block HH, Soshanguve North, Pretoria, 0152',
    embedUrl: 'https://maps.google.com/maps?q=TUT+Soshanguve+North+Campus+Pretoria&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=TUT+Soshanguve+North+Campus',
    phone: '012 382 9700',
    lat: -25.4867,
    lng: 28.0892,
  },
  emalahleni: {
    name: 'Emalahleni Campus',
    address: 'Corner Mandela & Arras St, Emalahleni, Mpumalanga, 1035',
    embedUrl: 'https://maps.google.com/maps?q=TUT+Emalahleni+Campus+Mpumalanga&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=TUT+Emalahleni+Campus',
    phone: '013 653 3400',
    lat: -25.8712,
    lng: 29.2345,
  },
};

const securityPositions = [
  { id: 1, name: 'Guard 1', position: 'Main Gate', x: 15, y: 20, status: 'active' },
  { id: 2, name: 'Guard 2', position: 'Library', x: 45, y: 35, status: 'active' },
  { id: 3, name: 'Guard 3', position: 'Student Center', x: 70, y: 25, status: 'active' },
  { id: 4, name: 'Guard 4', position: 'Parking Area A', x: 25, y: 60, status: 'patrol' },
  { id: 5, name: 'Guard 5', position: 'Sports Complex', x: 80, y: 70, status: 'active' },
  { id: 6, name: 'Guard 6', position: 'Admin Building', x: 55, y: 50, status: 'active' },
  { id: 7, name: 'Guard 7', position: 'Residence Block A', x: 30, y: 80, status: 'patrol' },
  { id: 8, name: 'Guard 8', position: 'Engineering Block', x: 65, y: 85, status: 'active' },
];

const landmarks = [
  { name: 'Main Gate', x: 15, y: 15, type: 'gate' },
  { name: 'Library', x: 45, y: 30, type: 'building' },
  { name: 'Student Center', x: 70, y: 20, type: 'building' },
  { name: 'Admin Block', x: 55, y: 45, type: 'building' },
  { name: 'Parking A', x: 25, y: 55, type: 'parking' },
  { name: 'Parking B', x: 85, y: 55, type: 'parking' },
  { name: 'Sports Complex', x: 80, y: 65, type: 'building' },
  { name: 'Residence A', x: 30, y: 75, type: 'residence' },
  { name: 'Residence B', x: 50, y: 75, type: 'residence' },
  { name: 'Engineering', x: 65, y: 80, type: 'building' },
];

export const CampusMap = () => {
  const { user } = useAuth();
  const [userCampus, setUserCampus] = useState<string>('pretoria_west_main');

  useEffect(() => {
    const fetchUserCampus = async () => {
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('campus')
          .eq('id', user.id)
          .single();
        
        if (data?.campus) {
          setUserCampus(data.campus);
        }
      }
    };
    fetchUserCampus();
  }, [user]);

  const campus = campusData[userCampus] || campusData.pretoria_west_main;

  return (
    <div className="space-y-6">
      <Card className="w-full max-w-5xl mx-auto p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 mb-4 sm:mb-6">
            <MapPin className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            <h2 className="text-xl sm:text-2xl font-bold">Your Campus Location</h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-semibold text-base sm:text-lg">{campus.name}</h3>
              <div className="relative w-full h-[250px] sm:h-[300px] rounded-lg overflow-hidden border">
                <iframe
                  src={campus.embedUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {campus.address}
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm sm:text-base">Campus Security</h4>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                  24/7 security monitoring with CCTV coverage across all campus facilities.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-700 dark:text-green-400">
                    CCTV Active
                  </span>
                  <span className="inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-700 dark:text-blue-400">
                    Security Patrols
                  </span>
                </div>
              </div>

              <div className="p-3 sm:p-4 bg-muted/50 rounded-lg">
                <h4 className="font-semibold mb-2 text-sm sm:text-base">Emergency Contacts</h4>
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Campus Security:</span>
                    <span className="font-medium">{campus.phone}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Emergency:</span>
                    <span className="font-medium">10111</span>
                  </div>
                </div>
              </div>

              <a
                href={campus.directionsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-xs sm:text-sm font-medium"
              >
                <MapPin className="h-4 w-4" />
                Get Directions
              </a>
            </div>
          </div>
        </div>
      </Card>

      {/* Security Locations Map */}
      <Card className="w-full max-w-5xl mx-auto p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold">Live Security Locations</h2>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-green-500 animate-pulse" />
                Active
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-blue-500 animate-pulse" />
                On Patrol
              </span>
            </div>
          </div>

          <div className="relative w-full h-[300px] sm:h-[400px] bg-gradient-to-br from-green-900/20 via-green-800/10 to-green-900/20 rounded-xl border-2 border-green-500/30 overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-green-500"/>
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#grid)" />
              </svg>
            </div>

            {landmarks.map((landmark, index) => (
              <div
                key={index}
                className="absolute transform -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${landmark.x}%`, top: `${landmark.y}%` }}
              >
                <div className={`
                  w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-xs
                  ${landmark.type === 'gate' ? 'bg-yellow-500/30 border border-yellow-500/50' : ''}
                  ${landmark.type === 'building' ? 'bg-blue-500/20 border border-blue-500/30' : ''}
                  ${landmark.type === 'parking' ? 'bg-gray-500/20 border border-gray-500/30' : ''}
                  ${landmark.type === 'residence' ? 'bg-purple-500/20 border border-purple-500/30' : ''}
                `}>
                  <span className="text-[8px] sm:text-[10px] font-medium text-foreground/70 hidden sm:block">
                    {landmark.name.split(' ')[0]}
                  </span>
                </div>
              </div>
            ))}

            {securityPositions.map((guard) => (
              <motion.div
                key={guard.id}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                style={{ left: `${guard.x}%`, top: `${guard.y}%` }}
                animate={guard.status === 'patrol' ? {
                  x: [0, 10, -10, 0],
                  y: [0, -5, 5, 0],
                } : {}}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                <span className={`absolute inset-0 rounded-full animate-ping ${
                  guard.status === 'active' ? 'bg-green-500' : 'bg-blue-500'
                } opacity-30`} />

                <div className={`
                  relative z-10 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center
                  ${guard.status === 'active' ? 'bg-green-500' : 'bg-blue-500'}
                  shadow-lg
                `}>
                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                </div>

                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                  <div className="bg-card border rounded-lg shadow-lg px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                    <p className="text-xs sm:text-sm font-semibold">{guard.name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">{guard.position}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Radio className={`h-2 w-2 sm:h-3 sm:w-3 ${guard.status === 'active' ? 'text-green-500' : 'text-blue-500'}`} />
                      <span className="text-[10px] sm:text-xs capitalize">{guard.status}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            <div className="absolute bottom-2 sm:bottom-4 left-2 sm:left-4 bg-card/90 backdrop-blur-sm rounded-lg p-2 sm:p-3 text-xs">
              <p className="font-semibold mb-1.5 sm:mb-2 text-[10px] sm:text-xs">Legend</p>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-500/30 border border-yellow-500/50 rounded" />
                  <span className="text-[10px] sm:text-xs">Gates</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-500/20 border border-blue-500/30 rounded" />
                  <span className="text-[10px] sm:text-xs">Buildings</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-500/20 border border-purple-500/30 rounded" />
                  <span className="text-[10px] sm:text-xs">Residences</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-green-500" />
                  <span className="text-[10px] sm:text-xs">Security Guard</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            Tap on a security guard to see their current position and status.
          </p>
        </div>
      </Card>
    </div>
  );
};
