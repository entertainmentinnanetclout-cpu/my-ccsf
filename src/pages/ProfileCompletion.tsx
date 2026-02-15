import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Shield, Loader2, MapPin, User, Phone, BookOpen, Home as HomeIcon, CheckCircle2 } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';

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
];

const residenceOptions = [
  { value: 'zeddishoef', label: 'Zeddishoef' },
  { value: 'headhoff', label: 'Headhoff' },
  { value: 'monitor', label: 'Monitor' },
  { value: 'legae', label: 'Legae' },
  { value: 'tempo', label: 'Tempo' },
  { value: 'topishoek', label: 'Topishoek' },
  { value: 'orion', label: 'Orion' },
  { value: 'magalies', label: 'Magalies' },
  { value: 'lezard', label: 'Lezard' },
  { value: 'minjonet', label: 'Minjonet' },
  { value: 'polonaise', label: 'Polonaise' },
  { value: 'denise', label: 'Denise' },
  { value: 'marabastaad', label: 'Marabastaad' },
  { value: 'astra', label: 'Astra' },
];

const ProfileCompletion = () => {
  const { user, userProfile, loading: authLoading, profileCompleted } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    first_name: '',
    last_name: '',
    student_number: '',
    phone_number: '',
    campus: '',
    residence: '',
    course: '',
    year_of_study: '',
  });

  // Calculate profile completion percentage
  const completionPercentage = useMemo(() => {
    const requiredFields = ['full_name', 'campus'];
    const optionalFields = ['first_name', 'last_name', 'student_number', 'phone_number', 'residence', 'course', 'year_of_study'];
    
    let filled = 0;
    let total = requiredFields.length + optionalFields.length;
    
    requiredFields.forEach(field => {
      if (formData[field as keyof typeof formData]) filled += 1;
    });
    
    optionalFields.forEach(field => {
      if (formData[field as keyof typeof formData]) filled += 1;
    });
    
    return Math.round((filled / total) * 100);
  }, [formData]);

  // Redirect if profile already completed
  useEffect(() => {
    if (!authLoading && profileCompleted) {
      navigate('/dashboard', { replace: true });
    }
  }, [authLoading, profileCompleted, navigate]);

  useEffect(() => {
    const fetchFullProfile = async () => {
      if (!userProfile?.id) return;
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userProfile.id)
        .single();
      
      if (data) {
        setFormData({
          full_name: data.full_name || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          student_number: data.student_number || '',
          phone_number: data.phone_number || '',
          campus: data.campus || '',
          residence: data.residence || '',
          course: data.course || '',
          year_of_study: data.year_of_study?.toString() || '',
        });
      }
    };
    
    fetchFullProfile();
  }, [userProfile?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to update your profile.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Build update object dynamically to avoid type issues
      const updateData: Record<string, unknown> = {
        full_name: formData.full_name,
        first_name: formData.first_name,
        last_name: formData.last_name,
        student_number: formData.student_number,
        phone_number: formData.phone_number,
        course: formData.course,
        year_of_study: formData.year_of_study ? parseInt(formData.year_of_study) : null,
        profile_completed: true,
      };
      
      if (formData.campus) {
        updateData.campus = formData.campus;
      }
      if (formData.residence) {
        updateData.residence = formData.residence;
      }

      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: 'Profile Updated',
        description: 'Your profile has been successfully updated.',
      });
      
      navigate('/dashboard');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      toast({
        title: 'Error',
        description: errorMessage,
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
    <div className="min-h-screen bg-gradient-primary user-theme py-8 px-4">
      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <motion.img
            src={tutLogo}
            alt="TUT Logo"
            className="h-14 mx-auto mb-4 logo-glow"
          />
          <div className="flex items-center justify-center gap-2 mb-2">
            <Shield className="h-6 w-6 text-foreground" />
            <h1 className="text-2xl font-bold text-foreground">Complete Your Profile</h1>
          </div>
          <p className="text-foreground/80">Help us serve you better by completing your profile</p>
        </motion.div>

        {/* Progress Bar */}
        <motion.div
          className="mb-6"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Profile Completion</span>
            <span className="text-sm font-bold text-primary">{completionPercentage}%</span>
          </div>
          <Progress value={completionPercentage} className="h-3" />
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <CheckCircle2 className="h-3 w-3" />
            <span>Complete your profile to access all features</span>
          </div>
        </motion.div>

        <Card className="shadow-large">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Fill in your details. Fields marked with * are required.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Personal Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name (as per ID)</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone_number">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone_number"
                      value={formData.phone_number}
                      onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                      placeholder="0XX XXX XXXX"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Academic Details</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student_number">Student Number</Label>
                    <Input
                      id="student_number"
                      value={formData.student_number}
                      onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                      placeholder="2024XXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year_of_study">Year of Study</Label>
                    <Select 
                      value={formData.year_of_study} 
                      onValueChange={(value) => setFormData({ ...formData, year_of_study: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1st Year</SelectItem>
                        <SelectItem value="2">2nd Year</SelectItem>
                        <SelectItem value="3">3rd Year</SelectItem>
                        <SelectItem value="4">4th Year</SelectItem>
                        <SelectItem value="5">Postgraduate</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="course">Course / Programme</Label>
                  <div className="relative">
                    <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="course"
                      value={formData.course}
                      onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                      placeholder="e.g. BSc Information Technology"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {/* Location Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Campus & Residence</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="campus">Campus *</Label>
                  <Select 
                    value={formData.campus} 
                    onValueChange={(value) => setFormData({ ...formData, campus: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your campus">
                        {formData.campus && (
                          <span className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {campusOptions.find(c => c.value === formData.campus)?.label}
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="residence">Residence (if applicable)</Label>
                  <Select 
                    value={formData.residence} 
                    onValueChange={(value) => setFormData({ ...formData, residence: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select your residence">
                        {formData.residence && (
                          <span className="flex items-center gap-2">
                            <HomeIcon className="h-4 w-4" />
                            {residenceOptions.find(r => r.value === formData.residence)?.label}
                          </span>
                        )}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {residenceOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="flex-1">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={loading}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </span>
                    ) : (
                      'Save Profile'
                    )}
                  </Button>
                </motion.div>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
};

export default ProfileCompletion;
