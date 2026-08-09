import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@ui/dialog';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Label } from '@ui/label';
import { Checkbox } from '@ui/checkbox';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@api/apiClient';
import { API_ENDPOINTS } from '@api/endpoints.config';
import { QUERY_KEYS } from '@api/hooks/queryKeys';
import { toast } from 'sonner';

interface ApplyWorkflowModalProps {
  jobId: string;
  isOpen: boolean;
  onClose: () => void;
  onApplied: () => void;
}
enum ApplyWorkflowSteps{
  RESUME,
  PROFILE,
  ADDITIONAL_QUESTIONS,
  DECLARATION,
}

export function ApplyWorkflowModal({ jobId, isOpen, onClose, onApplied }: ApplyWorkflowModalProps) {
  const [step, setStep] = useState<ApplyWorkflowSteps>(ApplyWorkflowSteps.RESUME);
  const queryClient = useQueryClient();

  const applyMutation = useMutation({
    mutationFn: async (isDraft: boolean) => {
      await apiClient.post(API_ENDPOINTS.APPLICATIONS.APPLY(jobId), { isDraft });
    },
    onSuccess: (_, isDraft) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.JOBS.ALL });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.APPLICATIONS.ALL });
      if (isDraft) {
        toast.success('Application saved as draft');
        onClose();
      } else {
        toast.success('Application submitted successfully!');
        onApplied();
      }
    },
    onError: () => {
      toast.error('An error occurred. Please try again.');
    },
  });

  const nextStep = () => setStep((prev) => prev + 1);
  const prevStep = () => setStep((prev) => prev - 1);

  const handleDraft = () => applyMutation.mutate(true);
  const handleSubmit = () => applyMutation.mutate(false);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for Job</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          {step === ApplyWorkflowSteps.RESUME && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Step 1: Resume &amp; Cover Letter</h3>
              <div className="space-y-2">
                <Label>Resume (PDF/DOCX, max 2MB) <span className="text-destructive">*</span></Label>
                <Input type="file" accept=".pdf,.doc,.docx" />
              </div>
              <div className="space-y-2">
                <Label>Cover Letter (Optional, max 1MB)</Label>
                <Input type="file" accept=".pdf,.doc,.docx" />
              </div>
            </div>
          )}

          {step === ApplyWorkflowSteps.PROFILE && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Step 2: Profile Review</h3>
              <p className="text-sm text-muted-foreground">
                Review your profile details below. These will be sent to the recruiter.
              </p>
              <div className="border rounded-md p-4 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-semibold">Personal Info</span>
                  <Button variant="outline" size="sm">Edit</Button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-muted-foreground">Name:</div><div>John Doe</div>
                  <div className="text-muted-foreground">Email:</div><div>candidate@example.com</div>
                </div>
              </div>
              <Button variant="outline" className="w-full">Sync from LinkedIn</Button>
            </div>
          )}

          {step === ApplyWorkflowSteps.ADDITIONAL_QUESTIONS && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Step 3: Additional Questions</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Do you require visa sponsorship? <span className="text-destructive">*</span></Label>
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="visa-yes" name="visa" value="yes" />
                    <Label htmlFor="visa-yes">Yes</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input type="radio" id="visa-no" name="visa" value="no" />
                    <Label htmlFor="visa-no">No</Label>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Notice Period</Label>
                  <Input placeholder="e.g. 2 weeks, Immediate" />
                </div>
              </div>
            </div>
          )}

          {step === ApplyWorkflowSteps.DECLARATION && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Step 4: Declaration</h3>
              <div className="flex items-start space-x-3">
                <Checkbox id="declaration" />
                <Label htmlFor="declaration" className="font-normal leading-relaxed">
                  I hereby declare that the information provided is true and correct to the best of my knowledge.
                  I understand that any willful dishonesty may render for refusal of this application or immediate termination of employment.
                </Label>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between items-center sm:justify-between border-t pt-4">
          <div className="flex gap-2">
            <Button variant="ghost" onClick={handleDraft} disabled={applyMutation.isPending}>
              Save as Draft
            </Button>
          </div>
          <div className="flex gap-2">
            {step > 1 && <Button variant="outline" onClick={prevStep}>Back</Button>}
            {step < 4 ? (
              <Button onClick={nextStep}>Next</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={applyMutation.isPending}>
                {applyMutation.isPending ? 'Submitting...' : 'Submit Application'}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
