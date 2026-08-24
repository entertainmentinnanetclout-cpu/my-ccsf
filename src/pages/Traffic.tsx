import { ArrowLeft, CarFront, CircleParking, Construction, DoorOpen, ShieldCheck, Upload } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { VisitorParkingBooking } from '@/components/traffic/VisitorParkingBooking';
import { RoadSafetyNotices } from '@/components/traffic/RoadSafetyNotices';
import { BRAND } from '@/brand';

const services = [
  {
    icon: CircleParking,
    title: 'Student parking',
    description: 'Register a vehicle for Traffic review and park only in clearly marked student parking zones.',
  },
  {
    icon: CarFront,
    title: 'Visitor parking',
    description: 'Request a dated visitor parking pass online, save the private tracking token and wait for approval.',
  },
  {
    icon: DoorOpen,
    title: 'Gate access',
    description: 'Approved requests are checked against identification, vehicle details and current campus conditions.',
  },
  {
    icon: ShieldCheck,
    title: 'Road safety',
    description: 'View campus driving notices, parking restrictions and pedestrian-safety guidance.',
  },
];

export default function Traffic() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#002F6C]/5 via-background to-background" data-testid="ready-traffic">
      <section className="relative overflow-hidden border-b border-[#F2A900]/35 bg-[#002F6C] text-white">
        <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border-[48px] border-white/5" aria-hidden="true" />
        <div className="container relative mx-auto px-4 py-12 sm:py-16">
          <Button asChild variant="ghost" className="mb-6 text-white hover:bg-white/10 hover:text-white">
            <Link to="/auth"><ArrowLeft className="mr-2 h-4 w-4" />Back to CCSF sign in</Link>
          </Button>
          <div className="max-w-4xl">
            <Badge className="mb-4 border border-[#F2A900]/70 bg-[#F2A900] text-[#002F6C]">
              <Construction className="mr-1 h-3.5 w-3.5" />Traffic department ú staged onboarding
            </Badge>
            <h1 className="text-4xl font-black tracking-tight sm:text-5xl">Campus Traffic & Parking</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/80 sm:text-lg">
              Student parking permits, visitor parking requests, gate access and road-safety services for {BRAND.institutionName}.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild className="bg-[#F2A900] font-extrabold text-[#002F6C] hover:bg-[#F2A900]/90">
                <a href="#visitor-booking"><CarFront className="mr-2 h-4 w-4" />Book visitor parking</a>
              </Button>
              <Button asChild variant="outline" className="border-white/40 bg-white/5 text-white hover:bg-white/10 hover:text-white">
                <Link to="/auth">Student sign in</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <main className="container mx-auto space-y-10 px-4 py-10">
        <AlertStrip />
        <section aria-labelledby="traffic-services-heading">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D7193F]">Traffic services</p>
            <h2 id="traffic-services-heading" className="mt-1 text-2xl font-black text-[#002F6C] dark:text-foreground">Plan before arriving at campus</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {services.map(({ icon: Icon, title, description }) => (
              <Card key={title} className="border-[#002F6C]/15">
                <CardContent className="p-5">
                  <div className="inline-flex rounded-xl bg-[#002F6C] p-2.5 text-white"><Icon className="h-5 w-5" /></div>
                  <h3 className="mt-4 font-black">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section id="visitor-booking" className="scroll-mt-6" aria-labelledby="visitor-booking-heading">
          <div className="mb-5">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#D7193F]">Online visitor service</p>
            <h2 id="visitor-booking-heading" className="mt-1 text-2xl font-black text-[#002F6C] dark:text-foreground">Request and track visitor parking</h2>
          </div>
          <VisitorParkingBooking />
        </section>

        <RoadSafetyNotices />

        <section className="rounded-2xl border border-dashed border-[#002F6C]/30 bg-[#002F6C]/5 p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <div className="rounded-full bg-white p-3 shadow-sm"><Upload className="h-6 w-6 text-[#002F6C]" /></div>
            <div>
              <h2 className="font-black">Official circular permit artwork is being onboarded</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The digital white-circle preview is functional. Traffic staff can photograph and upload the official permit template in Traffic Operations, then activate the exact campus format after verification.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function AlertStrip() {
  return (
    <div className="grid gap-3 rounded-2xl border border-[#F2A900]/60 bg-[#F2A900]/10 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
      <Construction className="h-7 w-7 text-[#D7193F]" />
      <div>
        <h2 className="font-black">Visible and functional while institutional details are completed</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Bookings are requests, not parking fines or guaranteed entry. Final permit artwork, gate names, operating hours and local Traffic procedures remain configurable during department onboarding.
        </p>
      </div>
    </div>
  );
}
