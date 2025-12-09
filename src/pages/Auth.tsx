import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Shield, AlertCircle, Loader2 } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName,
              student_number: studentNumber,
            },
          },
        });
        if (error) throw error;
        toast({
          title: 'Account created!',
          description: 'Welcome to Campus Protection Services. Please check your email to verify your account.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-primary">
        <Loader2 className="h-16 w-16 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-primary user-theme p-4">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="w-full max-w-md"
      >
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.img
            src={tutLogo}
            alt="TUT Logo"
            className="h-16 mx-auto mb-4 logo-glow"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          />
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-8 w-8 text-foreground drop-shadow-lg" />
            <h1 className="text-3xl font-bold text-foreground">Campus Protection Services</h1>
          </div>
          <p className="text-foreground/80">Report incidents, stay safe</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          <Card className="shadow-large">
            <CardHeader>
              <CardTitle>{isLogin ? 'Sign In' : 'Create Account'}</CardTitle>
              <CardDescription>
                {isLogin
                  ? 'Enter your credentials to access your account'
                  : 'Fill in your details to create a new account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                {!isLogin && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required={!isLogin}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="studentNumber">Student Number</Label>
                      <Input
                        id="studentNumber"
                        type="text"
                        placeholder="2024XXXXX"
                        value={studentNumber}
                        onChange={(e) => setStudentNumber(e.target.value)}
                      />
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@tut.ac.za"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || authLoading}
                  >
                    {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
                  </Button>
                </motion.div>

                <div className="text-center text-sm">
                  <button
                    type="button"
                    onClick={() => setIsLogin(!isLogin)}
                    className="text-primary hover:underline"
                  >
                    {isLogin
                      ? "Don't have an account? Sign up"
                      : 'Already have an account? Sign in'}
                  </button>
                </div>
              </form>

              <div className="mt-6 p-4 bg-muted/50 rounded-lg">
                <div className="flex gap-2 text-sm text-muted-foreground">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>
                    For security purposes, all actions are logged. Anonymous reporting is available after sign-in.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Auth;
