import { Card } from "@/components/ui/card";
import { MapPin, Wifi, WifiOff, Activity, Signal, SignalHigh, SignalLow, SignalMedium } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

// Campus coordinates with precise lat/lng for accurate Google Maps embeds
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
    embedUrl: 'https://maps.google.com/maps?q=-25.7308,28.1620&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-25.7308,28.1620',
    phone: '012 382 5911',
    lat: -25.7308,
    lng: 28.162,
  },
  arcadia: {
    name: 'Arcadia Campus',
    address: '175 Nelson Mandela Dr, Arcadia, Pretoria, 0083',
    embedUrl: 'https://maps.google.com/maps?q=-25.7425,28.2175&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-25.7425,28.2175',
    phone: '012 382 5200',
    lat: -25.7425,
    lng: 28.2175,
  },
  arts: {
    name: 'Arts Campus',
    address: 'Cnr Struben & Prinsloo St, Pretoria, 0002',
    embedUrl: 'https://maps.google.com/maps?q=-25.7465,28.1878&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-25.7465,28.1878',
    phone: '012 382 5300',
    lat: -25.7465,
    lng: 28.1878,
  },
  polokwane: {
    name: 'Polokwane Campus',
    address: '110 Market St, Polokwane, Limpopo, 0700',
    embedUrl: 'https://maps.google.com/maps?q=-23.9025,29.4549&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-23.9025,29.4549',
    phone: '015 287 0700',
    lat: -23.9025,
    lng: 29.4549,
  },
  mbombela: {
    name: 'Mbombela Campus',
    address: 'Kanyamazane Rd, Mbombela, Mpumalanga, 1200',
    embedUrl: 'https://maps.google.com/maps?q=-25.4653,31.0218&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-25.4653,31.0218',
    phone: '013 745 3500',
    lat: -25.4653,
    lng: 31.0218,
  },
  giyani: {
    name: 'Giyani Campus',
    address: 'Giyani Main Rd, Giyani, Limpopo, 0826',
    embedUrl: 'https://maps.google.com/maps?q=-23.3115,30.7195&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-23.3115,30.7195',
    phone: '015 811 3500',
    lat: -23.3115,
    lng: 30.7195,
  },
  garankuwa: {
    name: 'Ga-Rankuwa Campus',
    address: 'Zone 3, Ga-Rankuwa, Pretoria, 0208',
    embedUrl: 'https://maps.google.com/maps?q=-25.6125,28.0165&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-25.6125,28.0165',
    phone: '012 382 9400',
    lat: -25.6125,
    lng: 28.0165,
  },
  soshanguve_south: {
    name: 'Soshanguve South Campus',
    address: 'Block JJ, Soshanguve South, Pretoria, 0152',
    embedUrl: 'https://maps.google.com/maps?q=-25.5234,28.0978&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-25.5234,28.0978',
    phone: '012 382 9600',
    lat: -25.5234,
    lng: 28.0978,
  },
  soshanguve_north: {
    name: 'Soshanguve North Campus',
    address: 'Block HH, Soshanguve North, Pretoria, 0152',
    embedUrl: 'https://maps.google.com/maps?q=-25.4867,28.0892&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-25.4867,28.0892',
    phone: '012 382 9700',
    lat: -25.4867,
    lng: 28.0892,
  },
  emalahleni: {
    name: 'Emalahleni Campus',
    address: 'Corner Mandela & Arras St, Emalahleni, Mpumalanga, 1035',
    embedUrl: 'https://maps.google.com/maps?q=-25.8712,29.2345&t=&z=17&ie=UTF8&iwloc=&output=embed',
    directionsUrl: 'https://www.google.com/maps/dir/?api=1&destination=-25.8712,29.2345',
    phone: '013 653 3400',
    lat: -25.8712,
    lng: 29.2345,
  },
};

const defaultWifiAccessPoints = [
  { id: '1', name: 'Library WiFi', location: 'Library Building', x_position: 45, y_position: 30, band: '5GHz', ssid: 'TUT-WiFi' },
  { id: '2', name: 'Student Center WiFi', location: 'Student Center', x_position: 70, y_position: 20, band: '2.4GHz/5GHz', ssid: 'TUT-WiFi' },
  { id: '3', name: 'Admin Block WiFi', location: 'Admin Building', x_position: 55, y_position: 45, band: '5GHz', ssid: 'TUT-WiFi' },
  { id: '4', name: 'Main Gate WiFi', location: 'Main Entrance', x_position: 15, y_position: 15, band: '2.4GHz', ssid: 'TUT-WiFi' },
  { id: '5', name: 'Sports Complex WiFi', location: 'Sports Complex', x_position: 80, y_position: 65, band: '2.4GHz', ssid: 'TUT-WiFi' },
  { id: '6', name: 'Residence A WiFi', location: 'Residence Block A', x_position: 30, y_position: 75, band: '2.4GHz/5GHz', ssid: 'TUT-Res-WiFi' },
  { id: '7', name: 'Residence B WiFi', location: 'Residence Block B', x_position: 50, y_position: 75, band: '5GHz', ssid: 'TUT-Res-WiFi' },
  { id: '8', name: 'Engineering WiFi', location: 'Engineering Block', x_position: 65, y_position: 85, band: '5GHz', ssid: 'TUT-WiFi' },
  { id: '9', name: 'Cafeteria WiFi', location: 'Cafeteria', x_position: 40, y_position: 55, band: '2.4GHz', ssid: 'TUT-WiFi' },
  { id: '10', name: 'Lecture Hall WiFi', location: 'Lecture Hall Complex', x_position: 25, y_position: 40, band: '5GHz', ssid: 'TUT-WiFi' },
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

interface SpeedTestResult {
  downloadSpeed: number;
  latency: number;
  status: 'idle' | 'testing' | 'done';
  connectionType: string;
}

export const CampusMap = () => {
  const { user } = useAuth();
  const [userCampus, setUserCampus] = useState<string>('pretoria_west_main');
  const [wifiAccessPoints, setWifiAccessPoints] = useState(defaultWifiAccessPoints);
  const [speedTest, setSpeedTest] = useState<SpeedTestResult>({
    downloadSpeed: 0,
    latency: 0,
    status: 'idle',
    connectionType: 'Unknown',
  });

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
          // Fetch WiFi access points from DB
          const { data: dbAPs } = await supabase
            .from('wifi_access_points')
            .select('*')
            .eq('campus', data.campus)
            .eq('is_active', true);
          if (dbAPs && dbAPs.length > 0) {
            setWifiAccessPoints(dbAPs.map(ap => ({
              id: ap.id,
              name: ap.name,
              location: ap.location,
              x_position: ap.x_position,
              y_position: ap.y_position,
              band: ap.band,
              ssid: ap.ssid,
            })));
          }
        }
      }
    };
    fetchUserCampus();
  }, [user]);

  const runSpeedTest = useCallback(async () => {
    setSpeedTest(prev => ({ ...prev, status: 'testing', downloadSpeed: 0, latency: 0 }));

    try {
      // Get connection info
      const nav = navigator as any;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      const connectionType = connection?.effectiveType || 'Unknown';

      // Measure latency
      const latencyStart = performance.now();
      await fetch('https://www.google.com/generate_204', { mode: 'no-cors', cache: 'no-store' });
      const latency = Math.round(performance.now() - latencyStart);

      // Measure download speed using a small fetch
      const dlStart = performance.now();
      const response = await fetch(`https://speed.cloudflare.com/__down?bytes=500000&r=${Math.random()}`, { cache: 'no-store' });
      const blob = await response.blob();
      const dlEnd = performance.now();
      const durationSec = (dlEnd - dlStart) / 1000;
      const bitsLoaded = blob.size * 8;
      const speedMbps = parseFloat((bitsLoaded / durationSec / 1_000_000).toFixed(2));

      setSpeedTest({
        downloadSpeed: speedMbps,
        latency,
        status: 'done',
        connectionType,
      });
    } catch {
      // Fallback: use Network Information API if available
      const nav = navigator as any;
      const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
      setSpeedTest({
        downloadSpeed: connection?.downlink || 0,
        latency: connection?.rtt || 0,
        status: 'done',
        connectionType: connection?.effectiveType || 'Unable to test',
      });
    }
  }, []);

  const getSpeedLabel = (speed: number) => {
    if (speed >= 10) return { label: 'Excellent', color: 'text-green-600 dark:text-green-400' };
    if (speed >= 5) return { label: 'Good', color: 'text-blue-600 dark:text-blue-400' };
    if (speed >= 1) return { label: 'Fair', color: 'text-amber-600 dark:text-amber-400' };
    return { label: 'Poor', color: 'text-red-600 dark:text-red-400' };
  };

  const getSpeedIcon = (speed: number) => {
    if (speed >= 10) return <SignalHigh className="h-5 w-5 text-green-500" />;
    if (speed >= 5) return <SignalMedium className="h-5 w-5 text-blue-500" />;
    if (speed >= 1) return <SignalLow className="h-5 w-5 text-amber-500" />;
    return <Signal className="h-5 w-5 text-red-500" />;
  };

  const campus = campusData[userCampus] || campusData.pretoria_west_main;

  return (
    <div className="space-y-6">
      {/* Campus Location Map */}
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

      {/* WiFi Speed Test */}
      <Card className="w-full max-w-5xl mx-auto p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Activity className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold">WiFi Speed Test</h2>
            </div>
            <Button
              onClick={runSpeedTest}
              disabled={speedTest.status === 'testing'}
              size="sm"
              className="gap-2"
            >
              <Wifi className="h-4 w-4" />
              {speedTest.status === 'testing' ? 'Testing...' : 'Run Speed Test'}
            </Button>
          </div>

          {speedTest.status === 'testing' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Wifi className="h-5 w-5 text-primary animate-pulse" />
                <span className="text-sm font-medium">Testing your connection...</span>
              </div>
              <Progress value={undefined} className="h-2 animate-pulse" />
            </div>
          )}

          {speedTest.status === 'done' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="flex justify-center mb-2">
                  {getSpeedIcon(speedTest.downloadSpeed)}
                </div>
                <p className="text-2xl font-bold">{speedTest.downloadSpeed}</p>
                <p className="text-xs text-muted-foreground">Mbps Download</p>
                <Badge variant="outline" className={`mt-1 text-xs ${getSpeedLabel(speedTest.downloadSpeed).color}`}>
                  {getSpeedLabel(speedTest.downloadSpeed).label}
                </Badge>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="flex justify-center mb-2">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold">{speedTest.latency}</p>
                <p className="text-xs text-muted-foreground">ms Latency</p>
                <Badge variant="outline" className={`mt-1 text-xs ${speedTest.latency < 50 ? 'text-green-600 dark:text-green-400' : speedTest.latency < 100 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'}`}>
                  {speedTest.latency < 50 ? 'Low' : speedTest.latency < 100 ? 'Medium' : 'High'}
                </Badge>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg text-center">
                <div className="flex justify-center mb-2">
                  <Signal className="h-5 w-5 text-primary" />
                </div>
                <p className="text-2xl font-bold uppercase">{speedTest.connectionType}</p>
                <p className="text-xs text-muted-foreground">Connection Type</p>
              </div>
            </div>
          )}

          {speedTest.status === 'idle' && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Tap "Run Speed Test" to check your current WiFi connection speed and latency.
            </p>
          )}
        </div>
      </Card>

      {/* WiFi Access Points Map */}
      <Card className="w-full max-w-5xl mx-auto p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <Wifi className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              <h2 className="text-lg sm:text-xl font-bold">Campus WiFi Access Points</h2>
            </div>
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-green-500 animate-pulse" />
                5GHz
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-blue-500 animate-pulse" />
                2.4GHz
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 sm:h-3 sm:w-3 rounded-full bg-purple-500 animate-pulse" />
                Dual Band
              </span>
            </div>
          </div>

          <div className="relative w-full h-[300px] sm:h-[400px] bg-gradient-to-br from-blue-900/20 via-blue-800/10 to-blue-900/20 rounded-xl border-2 border-blue-500/30 overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-blue-500"/>
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

            {wifiAccessPoints.map((ap) => {
              const isDual = ap.band.includes('/');
              const is5GHz = ap.band === '5GHz';
              const dotColor = isDual ? 'bg-purple-500' : is5GHz ? 'bg-green-500' : 'bg-blue-500';

              return (
                <motion.div
                  key={ap.id}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                  style={{ left: `${ap.x_position}%`, top: `${ap.y_position}%` }}
                  whileHover={{ scale: 1.2 }}
                >
                  {/* WiFi signal rings */}
                  <span className={`absolute inset-[-4px] rounded-full animate-ping ${dotColor} opacity-20`} />
                  <span className={`absolute inset-[-8px] rounded-full ${dotColor} opacity-10`} />

                  <div className={`
                    relative z-10 w-7 h-7 sm:w-9 sm:h-9 rounded-full flex items-center justify-center
                    ${dotColor} shadow-lg
                  `}>
                    <Wifi className="h-3.5 w-3.5 sm:h-4.5 sm:w-4.5 text-white" />
                  </div>

                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20">
                    <div className="bg-card border rounded-lg shadow-lg px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                      <p className="text-xs sm:text-sm font-semibold">{ap.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{ap.location}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Wifi className={`h-2.5 w-2.5 sm:h-3 sm:w-3 ${isDual ? 'text-purple-500' : is5GHz ? 'text-green-500' : 'text-blue-500'}`} />
                        <span className="text-[10px] sm:text-xs">{ap.band}</span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">SSID: {ap.ssid}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}

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
                  <span className="text-[10px] sm:text-xs">5GHz WiFi</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-blue-500" />
                  <span className="text-[10px] sm:text-xs">2.4GHz WiFi</span>
                </div>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-purple-500" />
                  <span className="text-[10px] sm:text-xs">Dual Band</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            Hover/tap a WiFi icon to see access point details. Use the speed test above to check your connection.
          </p>
        </div>
      </Card>
    </div>
  );
};
