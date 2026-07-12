import { useState } from 'react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { EducationTable } from './components/EducationTable';
import { ExperienceTable } from './components/ExperienceTable';
import { validateImageSize, validatePassportAspectRatio, validateResume } from '../../utils/validators';
import { toast } from 'sonner';

export default function ProfilePage() {
  const [profilePic, setProfilePic] = useState<string | null>(null);

  const handlePicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateImageSize(file, 1)) {
      toast.error('Image size must be less than 1MB');
      return;
    }

    const isPassportRatio = await validatePassportAspectRatio(file);
    if (!isPassportRatio) {
      toast.error('Image must be in passport dimensions (~35x45mm)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => setProfilePic(event.target?.result as string);
    reader.readAsDataURL(file);
    toast.success('Profile picture updated successfully');
  };

  const handleResumeUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!validateResume(file)) {
      toast.error('Resume must be a PDF or DOCX file under 2MB');
      return;
    }

    toast.success('Resume uploaded successfully');
  };

  return (
    <div className="container max-w-4xl mx-auto py-12 px-4 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Profile</h1>
        <p className="text-muted-foreground mt-2">Complete your profile to apply for jobs faster.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
          <CardDescription>Update your personal details and contact information.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-8 items-start">
            <div className="flex flex-col items-center gap-4">
              <div className="w-32 h-40 bg-muted border-2 border-dashed rounded-md flex items-center justify-center overflow-hidden relative">
                {profilePic ? (
                  <img src={profilePic} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground text-center p-2">Passport Photo<br/>(Max 1MB)</span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  onChange={handlePicUpload}
                />
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input defaultValue="John" />
              </div>
              <div className="space-y-2">
                <Label>Last Name <span className="text-destructive">*</span></Label>
                <Input defaultValue="Doe" />
              </div>
              <div className="space-y-2">
                <Label>Email <span className="text-destructive">*</span></Label>
                <Input defaultValue="candidate@example.com" disabled />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input placeholder="+1 (555) 000-0000" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resume</CardTitle>
          <CardDescription>Upload your latest resume (PDF or DOCX, max 2MB).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Input type="file" accept=".pdf,.doc,.docx" onChange={handleResumeUpload} className="max-w-sm" />
            <Button variant="outline">
              <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2" fill="#0A66C2">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
              </svg>
              Sync from LinkedIn
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>Manage your educational background and work history.</CardDescription>
        </CardHeader>
        <CardContent>
          <EducationTable />
          <ExperienceTable />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button variant="outline">Cancel</Button>
        <Button>Save Profile</Button>
      </div>
    </div>
  );
}
