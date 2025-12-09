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
import { Shield, Loader2, MapPin, User, Phone, BookOpen, Home as HomeIcon, Heart, AlertCircle, Users } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
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
  const { user, userProfile, loading: authLoading } = useAuth();
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
    // Medical fields
    blood_type: '',
    allergies: '',
    chronic_conditions: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    emergency_contact_relationship: '',
    medical_aid_name: '',
    medical_aid_number: '',
    disability_status: '',
    special_needs: '',
  });

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
          blood_type: (data as Record<string, unknown>).blood_type as string || '',
          allergies: (data as Record<string, unknown>).allergies as string || '',
          chronic_conditions: (data as Record<string, unknown>).chronic_conditions as string || '',
          emergency_contact_name: (data as Record<string, unknown>).emergency_contact_name as string || '',
          emergency_contact_phone: (data as Record<string, unknown>).emergency_contact_phone as string || '',
          emergency_contact_relationship: (data as Record<string, unknown>).emergency_contact_relationship as string || '',
          medical_aid_name: (data as Record<string, unknown>).medical_aid_name as string || '',
          medical_aid_number: (data as Record<string, unknown>).medical_aid_number as string || '',
          disability_status: (data as Record<string, unknown>).disability_status as string || '',
          special_needs: (data as Record<string, unknown>).special_needs as string || '',
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
        // Medical fields
        blood_type: formData.blood_type || null,
        allergies: formData.allergies || null,
        chronic_conditions: formData.chronic_conditions || null,
        emergency_contact_name: formData.emergency_contact_name || null,
        emergency_contact_phone: formData.emergency_contact_phone || null,
        emergency_contact_relationship: formData.emergency_contact_relationship || null,
        medical_aid_name: formData.medical_aid_name || null,
        medical_aid_number: formData.medical_aid_number || null,
        disability_status: formData.disability_status || null,
        special_needs: formData.special_needs || null,
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
              </div>

              {/* Medical & Health Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  Medical & Health Information
                </h3>
                <p className="text-xs text-muted-foreground">This information helps emergency responders provide appropriate care.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="blood_type">Blood Type</Label>
                    <Select 
                      value={formData.blood_type} 
                      onValueChange={(value) => setFormData({ ...formData, blood_type: value })}
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
                    <Label htmlFor="disability_status">Disability Status</Label>
                    <Select 
                      value={formData.disability_status} 
                      onValueChange={(value) => setFormData({ ...formData, disability_status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Disability</SelectItem>
                        <SelectItem value="physical">Physical Disability</SelectItem>
                        <SelectItem value="visual">Visual Impairment</SelectItem>
                        <SelectItem value="hearing">Hearing Impairment</SelectItem>
                        <SelectItem value="cognitive">Cognitive/Learning</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                        <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies</Label>
                  <Textarea
                    id="allergies"
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder="e.g. Penicillin, Peanuts, Bee stings (leave blank if none)"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chronic_conditions">Chronic Conditions</Label>
                  <Textarea
                    id="chronic_conditions"
                    value={formData.chronic_conditions}
                    onChange={(e) => setFormData({ ...formData, chronic_conditions: e.target.value })}
                    placeholder="e.g. Asthma, Diabetes, Epilepsy (leave blank if none)"
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="special_needs">Special Needs / Accommodations</Label>
                  <Textarea
                    id="special_needs"
                    value={formData.special_needs}
                    onChange={(e) => setFormData({ ...formData, special_needs: e.target.value })}
                    placeholder="Any special needs or accommodations required during emergencies"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="medical_aid_name">Medical Aid Provider</Label>
                    <Input
                      id="medical_aid_name"
                      value={formData.medical_aid_name}
                      onChange={(e) => setFormData({ ...formData, medical_aid_name: e.target.value })}
                      placeholder="e.g. Discovery, Bonitas"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="medical_aid_number">Medical Aid Number</Label>
                    <Input
                      id="medical_aid_number"
                      value={formData.medical_aid_number}
                      onChange={(e) => setFormData({ ...formData, medical_aid_number: e.target.value })}
                      placeholder="Member number"
                    />
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  Emergency Contact
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Contact Name *</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="emergency_contact_name"
                        value={formData.emergency_contact_name}
                        onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                        placeholder="Parent / Guardian name"
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_relationship">Relationship</Label>
                    <Select 
                      value={formData.emergency_contact_relationship} 
                      onValueChange={(value) => setFormData({ ...formData, emergency_contact_relationship: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="guardian">Guardian</SelectItem>
                        <SelectItem value="spouse">Spouse</SelectItem>
                        <SelectItem value="sibling">Sibling</SelectItem>
                        <SelectItem value="relative">Other Relative</SelectItem>
                        <SelectItem value="friend">Friend</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">Emergency Contact Phone *</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="emergency_contact_phone"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      placeholder="0XX XXX XXXX"
                      className="pl-10"
                    />
                  </div>
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
