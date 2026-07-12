import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Textarea } from '../../../../components/ui/textarea';
import { Education } from './EducationTable';

interface EducationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (edu: Education) => void;
  initialData?: Education;
}

export function EducationModal({ isOpen, onClose, onSave, initialData }: EducationModalProps) {
  const [formData, setFormData] = useState<Partial<Education>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        id: Math.random().toString(36).substr(2, 9),
        institution: '',
        degree: '',
        fieldOfStudy: '',
        startDate: '',
        endDate: '',
        grade: '',
      });
    }
  }, [isOpen, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSave = () => {
    if (!formData.institution || !formData.degree || !formData.fieldOfStudy || !formData.startDate || !formData.endDate) {
      return; // Basic validation
    }
    onSave(formData as Education);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Education' : 'Add Education'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="institution">Institution Name <span className="text-destructive">*</span></Label>
            <Input id="institution" value={formData.institution || ''} onChange={handleChange} placeholder="e.g. University of Technology" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="degree">Degree <span className="text-destructive">*</span></Label>
              <Input id="degree" value={formData.degree || ''} onChange={handleChange} placeholder="e.g. Bachelors" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fieldOfStudy">Field of Study <span className="text-destructive">*</span></Label>
              <Input id="fieldOfStudy" value={formData.fieldOfStudy || ''} onChange={handleChange} placeholder="e.g. Computer Science" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date <span className="text-destructive">*</span></Label>
              <Input id="startDate" type="date" value={formData.startDate || ''} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date <span className="text-destructive">*</span></Label>
              <Input id="endDate" type="date" value={formData.endDate || ''} onChange={handleChange} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="grade">Grade / GPA (Optional)</Label>
            <Input id="grade" value={formData.grade || ''} onChange={handleChange} placeholder="e.g. 3.8" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
