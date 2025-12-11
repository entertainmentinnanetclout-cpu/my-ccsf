import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { motion } from 'framer-motion';
import { Shield, User, ArrowLeft, Loader2, Phone, Heart, AlertCircle, GraduationCap, MapPin, Home } from 'lucide-react';
import tutLogo from '@/assets/tut-logo.png';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Constants } from '@/integrations/supabase/types';

const campuses = Constants.public.Enums.campus_location;

const formatCampusName = (campus: string) => {
  return campus
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
    first_name: '',
    last_name: '',
    email: '',
    student_number: '',
    phone_number: '',
    campus: '',
    course: '',
    year_of_study: '',
    residence: '',
    // Emergency Contact
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    // Medical Information
    blood_type: '',
    allergies: '',
    chronic_conditions: '',
    disability_status: '',
    special_needs: '',
    medical_aid_name: '',
    medical_aid_number: '',
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        toast({ title: 'Error', description: 'Failed to load profile', variant: 'destructive' });
      } else if (data) {
        setFormData({
          full_name: data.full_name || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          email: data.email || '',
          student_number: data.student_number || '',
          phone_number: data.phone_number || '',
          campus: data.campus || '',
          course: data.course || '',
          year_of_study: data.year_of_study?.toString() || '',
          residence: data.residence || '',
          emergency_contact_name: data.emergency_contact_name || '',
          emergency_contact_phone: data.emergency_contact_phone || '',
          emergency_contact_relationship: data.emergency_contact_relationship || '',
          blood_type: data.blood_type || '',
          allergies: data.allergies || '',
          chronic_conditions: data.chronic_conditions || '',
          disability_status: data.disability_status || '',
          special_needs: data.special_needs || '',
          medical_aid_name: data.medical_aid_name || '',
          medical_aid_number: data.medical_aid_number || '',
        });
      }
      setLoading(false);
    };

    fetchProfile();
  }, [user, navigate, toast]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone_number: formData.phone_number,
        student_number: formData.student_number,
        course: formData.course,
        year_of_study: formData.year_of_study ? parseInt(formData.year_of_study) : null,
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        emergency_contact_relationship: formData.emergency_contact_relationship,
        blood_type: formData.blood_type,
        allergies: formData.allergies,
        chronic_conditions: formData.chronic_conditions,
        disability_status: formData.disability_status,
        special_needs: formData.special_needs,
        medical_aid_name: formData.medical_aid_name,
        medical_aid_number: formData.medical_aid_number,
        profile_completed: true,
      })
      .eq('id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      toast({ title: 'Error', description: 'Failed to save changes', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Profile updated successfully' });
    }
    setSaving(false);
  };

  const handleGoToDashboard = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-primary user-theme">
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        className="sticky top-0 z-50 bg-gradient-to-r from-secondary/95 to-primary/95 border-b border-white/10 shadow-large backdrop-blur-md"
      >
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
                <p className="text-sm text-white/90 font-semibold">Student Profile</p>
              </div>
            </div>
            {userRole === 'student' && (
              <Button onClick={handleGoToDashboard} variant="secondary" className="gap-2">
                <Home className="h-4 w-4" />
                Go to Dashboard
              </Button>
            )}
          </div>
        </div>
      </motion.header>

      <main className="container mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <Card className="p-6 shadow-large max-w-3xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Complete Your Profile</h2>
                <p className="text-muted-foreground text-sm">
                  Please provide your information for safety purposes
                </p>
              </div>
            </div>

            <Tabs defaultValue="personal" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="personal" className="gap-2">
                  <User className="h-4 w-4" />
                  Personal
                </TabsTrigger>
                <TabsTrigger value="emergency" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Emergency
                </TabsTrigger>
                <TabsTrigger value="medical" className="gap-2">
                  <Heart className="h-4 w-4" />
                  Medical
                </TabsTrigger>
              </TabsList>

              <TabsContent value="personal" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name</Label>
                    <Input 
                      id="first_name" 
                      placeholder="Enter your first name" 
                      value={formData.first_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name</Label>
                    <Input 
                      id="last_name" 
                      placeholder="Enter your last name" 
                      value={formData.last_name}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input 
                    id="full_name" 
                    placeholder="Enter your full name" 
                    value={formData.full_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email}
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="student_number">Student Number</Label>
                    <Input 
                      id="student_number" 
                      placeholder="e.g., 123456789" 
                      value={formData.student_number}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone_number">Phone Number</Label>
                    <Input 
                      id="phone_number" 
                      type="tel" 
                      placeholder="e.g., 0712345678" 
                      value={formData.phone_number}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Campus</Label>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{formData.campus ? formatCampusName(formData.campus) : 'Not set'}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">Campus is set during registration</p>
                  </div>
                  <div className="space-y-2">
                    <Label>Residence</Label>
                    <div className="flex items-center gap-2 p-2 bg-muted rounded-md">
                      <Home className="h-4 w-4 text-muted-foreground" />
                      <span className="capitalize">{formData.residence || 'Not set'}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="course">Course/Program</Label>
                    <Input 
                      id="course" 
                      placeholder="e.g., BSc Computer Science" 
                      value={formData.course}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Year of Study</Label>
                    <Select 
                      value={formData.year_of_study} 
                      onValueChange={(v) => handleSelectChange('year_of_study', v)}
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
              </TabsContent>

              <TabsContent value="emergency" className="space-y-4">
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertCircle className="h-5 w-5" />
                    <span className="font-semibold">Important</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This information will be used in case of emergencies. Please ensure it is accurate and up to date.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Emergency Contact Name</Label>
                  <Input 
                    id="emergency_contact_name" 
                    placeholder="Full name of emergency contact" 
                    value={formData.emergency_contact_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">Emergency Contact Phone</Label>
                    <Input 
                      id="emergency_contact_phone" 
                      type="tel" 
                      placeholder="e.g., 0712345678" 
                      value={formData.emergency_contact_phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                    <Select 
                      value={formData.emergency_contact_relationship} 
                      onValueChange={(v) => handleSelectChange('emergency_contact_relationship', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="sibling">Sibling</SelectItem>
                        <SelectItem value="spouse">Spouse</SelectItem>
                        <SelectItem value="relative">Other Relative</SelectItem>
                        <SelectItem value="friend">Friend</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="medical" className="space-y-4">
                <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg mb-4">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Heart className="h-5 w-5" />
                    <span className="font-semibold">Medical Information</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This information helps emergency responders provide appropriate care.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Blood Type</Label>
                    <Select 
                      value={formData.blood_type} 
                      onValueChange={(v) => handleSelectChange('blood_type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select blood type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A+">A+</SelectItem>
                        <SelectItem value="A-">A-</SelectItem>
                        <SelectItem value="B+">B+</SelectItem>
                        <SelectItem value="B-">B-</SelectItem>
                        <SelectItem value="AB+">AB+</SelectItem>
                        <SelectItem value="AB-">AB-</SelectItem>
                        <SelectItem value="O+">O+</SelectItem>
                        <SelectItem value="O-">O-</SelectItem>
                        <SelectItem value="unknown">Unknown</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Disability Status</Label>
                    <Select 
                      value={formData.disability_status} 
                      onValueChange={(v) => handleSelectChange('disability_status', v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="physical">Physical</SelectItem>
                        <SelectItem value="visual">Visual</SelectItem>
                        <SelectItem value="hearing">Hearing</SelectItem>
                        <SelectItem value="cognitive">Cognitive</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea 
                    id="allergies" 
                    placeholder="List any known allergies (food, medication, etc.)" 
                    value={formData.allergies}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chronic_conditions">Chronic Conditions</Label>
                  <Textarea 
                    id="chronic_conditions" 
                    placeholder="List any chronic medical conditions" 
                    value={formData.chronic_conditions}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="special_needs">Special Needs/Requirements</Label>
                  <Textarea 
                    id="special_needs" 
                    placeholder="Any special needs or accommodations required" 
                    value={formData.special_needs}
                    onChange={handleChange}
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medical_aid_name">Medical Aid Provider</Label>
                    <Input 
                      id="medical_aid_name" 
                      placeholder="e.g., Discovery Health" 
                      value={formData.medical_aid_name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medical_aid_number">Medical Aid Number</Label>
                    <Input 
                      id="medical_aid_number" 
                      placeholder="Your medical aid membership number" 
                      value={formData.medical_aid_number}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-6 pt-4 border-t">
              <Button onClick={handleSave} disabled={saving} className="w-full" size="lg">
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
};

export default Profile;
