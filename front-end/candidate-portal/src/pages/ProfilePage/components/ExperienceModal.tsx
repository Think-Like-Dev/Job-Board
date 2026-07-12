import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../../components/ui/dialog';
import { Button } from '../../../../components/ui/button';
import { Input } from '../../../../components/ui/input';
import { Label } from '../../../../components/ui/label';
import { Experience } from './ExperienceTable';

interface ExperienceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (exp: Experience) => void;
  initialData?: Experience;
}

export function ExperienceModal({ isOpen, onClose, onSave, initialData }: ExperienceModalProps) {
  const [formData, setFormData] = useState<Partial<Experience>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialData || {
        id: Math.random().toString(36).substr(2, 9),
        company: '',
        title: '',
        startDate: '',
        endDate: '',
      });
    }
  }, [isOpen, initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.id]: e.target.value }));
  };

  const handleSave = () => {
    if (!formData.company || !formData.title || !formData.startDate || !formData.endDate) {
      return; // Basic validation
    }
    onSave(formData as Experience);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit Experience' : 'Add Experience'}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="company">Company Name <span className="text-destructive">*</span></Label>
            <Input id="company" value={formData.company || ''} onChange={handleChange} placeholder="e.g. Tech Corp" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="title">Job Title <span className="text-destructive">*</span></Label>
            <Input id="title" value={formData.title || ''} onChange={handleChange} placeholder="e.g. Frontend Engineer" />
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
