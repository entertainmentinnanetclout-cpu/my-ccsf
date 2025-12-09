import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield, User } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const Profile = () => {
  return (
    <div className="min-h-screen bg-gradient-primary user-theme">
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="sticky top-0 z-50 bg-gradient-to-r from-secondary/95 to-primary/95 border-b border-white/10 shadow-large backdrop-blur-md"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <motion.img
              src={tutLogo}
              alt="TUT Logo"
              className="h-10 logo-glow"
            />
            <div>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-white animate-pulse" />
                <h1 className="text-xl font-bold text-white">Campus Community Safety Forum</h1>
              </div>
              <p className="text-sm text-white/90 font-semibold">Profile Settings</p>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Card className="p-6 shadow-large max-w-md mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Profile Settings</h2>
                <p className="text-muted-foreground text-sm">Manage your account information</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" placeholder="Enter your full name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Enter your email" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studentNumber">Student Number</Label>
                <Input id="studentNumber" placeholder="Enter your student number" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input id="phone" type="tel" placeholder="Enter your phone number" />
              </div>
              <Button className="w-full">Save Changes</Button>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Profile;
