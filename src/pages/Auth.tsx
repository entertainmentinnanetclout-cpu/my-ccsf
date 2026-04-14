import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Shield, AlertCircle, Loader2, MapPin, ArrowLeft } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';
import tutLogoLight from '@/assets/tut_light_theme.png';
import { z } from 'zod';
import { useTheme } from 'next-themes';

// Campus options with display names and DB values
const campusOptions = [
  { value: 'pretoria_west_main', label: 'Pretoria West (Main Campus)' },
  { value: 'arcadia', label: 'Arcadia Campus' },
  { value: 'arts', label: 'Arts Campus' },
  { value: 'giyani', label: 'Giyani Campus' },
  { value: 'mbombela', label: 'Mbombela Campus' },
  { value: 'emalahleni', label: 'Emalahleni Campus' },
  { value: 'polokwane', label: 'Polokwane Campus' },
  { value: 'garankuwa', label: 'Ga-Rankuwa Campus' },
  { value: 'soshanguve_south', label: 'Soshanguve South Campus' },
  { value: 'soshanguve_north', label: 'Soshanguve North Campus' },
] as const;

// Validation schema
const signupSchema = z.object({
  email: z.string().trim().email('Invalid email address').max(255),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  studentNumber: z.string().trim().max(20).optional(),
  campus: z.string().min(1, 'Please select your campus'),
});

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

const resetSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
});

type AuthView = 'login' | 'signup' | 'forgot-password';

const Auth = () => {
  const { theme } = useTheme();
  const [view, setView] = useState<AuthView>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [campus, setCampus] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user, userRole, loading: authLoading, profileCompleted } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user && userRole) {
      if (userRole === 'student') {
        if (!profileCompleted) {
          navigate('/profile-completion', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else if (userRole === 'security') {
        navigate('/security', { replace: true });
      } else if (userRole === 'admin') {
        navigate('/admin', { replace: true });
      }
    }
  }, [user, userRole, navigate, profileCompleted]);

  const validateForm = () => {
    try {
      if (view === 'login') {
        loginSchema.parse({ email, password });
      } else if (view === 'signup') {
        signupSchema.parse({ email, password, fullName, studentNumber, campus });
      } else {
        resetSchema.parse({ email });
      }
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            newErrors[err.path[0] as string] = err.message;
          }
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);

    try {
      if (view === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            throw new Error('Invalid email or password. Please try again.');
          }
          throw error;
        }
        toast({
          title: 'Welcome back!',
          description: 'You have successfully signed in.',
        });
      } else if (view === 'signup') {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: {
              full_name: fullName.trim(),
              student_number: studentNumber.trim(),
              campus: campus,
              role: 'student',
            },
          },
        });
        if (error) {
          if (error.message.includes('User already registered')) {
            throw new Error('An account with this email already exists. Please sign in instead.');
          }
          throw error;
        }
        toast({
          title: 'Account created!',
          description: 'Welcome to Campus Protection Services. Please check your email to verify your account.',
        });
      } else if (view === 'forgot-password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth?reset=true`,
        });
        if (error) throw error;
        toast({
          title: 'Reset email sent',
          description: 'Check your email for a password reset link.',
        });
        setView('login');
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

  const switchView = (newView: AuthView) => {
    setView(newView);
    setErrors({});
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-16 w-16 animate-spin text-white" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, hsl(213 100% 21%) 0%, hsl(217 67% 30%) 50%, hsl(213 100% 16%) 100%)' }}>
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
            src={theme === 'dark' ? tutLogo : tutLogoLight}
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
          <Card className="shadow-large border-0 bg-card/95 backdrop-blur-sm">
            <CardHeader>
              <CardTitle>
                {view === 'login' && 'Sign In'}
                {view === 'signup' && 'Create Account'}
                {view === 'forgot-password' && 'Reset Password'}
              </CardTitle>
              <CardDescription>
                {view === 'login' && 'Enter your credentials to access your account'}
                {view === 'signup' && 'Fill in your details to create a new student account'}
                {view === 'forgot-password' && 'Enter your email to receive a password reset link'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {view === 'forgot-password' && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => switchView('login')}
                  className="mb-4 -ml-2"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Sign In
                </Button>
              )}
              
              <form onSubmit={handleAuth} className="space-y-4">
                {view === 'signup' && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="John Doe"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className={errors.fullName ? 'border-destructive' : ''}
                      />
                      {errors.fullName && (
                        <p className="text-sm text-destructive">{errors.fullName}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="studentNumber">Student Number</Label>
                      <Input
                        id="studentNumber"
                        type="text"
                        placeholder="2024XXXXX"
                        value={studentNumber}
                        onChange={(e) => setStudentNumber(e.target.value)}
                        className={errors.studentNumber ? 'border-destructive' : ''}
                      />
                      {errors.studentNumber && (
                        <p className="text-sm text-destructive">{errors.studentNumber}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="campus">Campus *</Label>
                      <Select value={campus} onValueChange={setCampus}>
                        <SelectTrigger className={errors.campus ? 'border-destructive' : ''}>
                          <SelectValue placeholder="Select your campus">
                            {campus && (
                              <span className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {campusOptions.find(c => c.value === campus)?.label}
                              </span>
                            )}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {campusOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <span className="flex items-center gap-2">
                                <MapPin className="h-4 w-4" />
                                {option.label}
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {errors.campus && (
                        <p className="text-sm text-destructive">{errors.campus}</p>
                      )}
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@tut.ac.za"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={errors.email ? 'border-destructive' : ''}
                  />
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>

                {view !== 'forgot-password' && (
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={errors.password ? 'border-destructive' : ''}
                      minLength={6}
                    />
                    {errors.password && (
                      <p className="text-sm text-destructive">{errors.password}</p>
                    )}
                    {view === 'signup' && (
                      <p className="text-xs text-muted-foreground">Must be at least 6 characters</p>
                    )}
                  </div>
                )}

                {view === 'login' && (
                  <div className="text-right">
                    <button
                      type="button"
                      onClick={() => switchView('forgot-password')}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading || authLoading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Processing...
                      </span>
                    ) : (
                      <>
                        {view === 'login' && 'Sign In'}
                        {view === 'signup' && 'Create Account'}
                        {view === 'forgot-password' && 'Send Reset Link'}
                      </>
                    )}
                  </Button>
                </motion.div>

                {view !== 'forgot-password' && (
                  <div className="text-center text-sm">
                    <button
                      type="button"
                      onClick={() => switchView(view === 'login' ? 'signup' : 'login')}
                      className="text-primary hover:underline"
                    >
                      {view === 'login'
                        ? "Don't have an account? Sign up"
                        : 'Already have an account? Sign in'}
                    </button>
                  </div>
                )}
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