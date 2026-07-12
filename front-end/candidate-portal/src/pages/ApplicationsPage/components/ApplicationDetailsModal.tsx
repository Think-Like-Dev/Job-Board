import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@ui/dialog';
import { Button } from '@ui/button';
import { Badge } from '@ui/badge';
import { Input } from '@ui/input';
import { Textarea } from '@ui/textarea';
import { formatDateToLocale, formatDateTimeToLocale } from '@utils/date';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@api/apiClient';
import { API_ENDPOINTS } from '@api/endpoints.config';
import { toast } from 'sonner';
import { Label } from '@ui/label';

export function ApplicationDetailsModal({ app, isOpen, onClose }: { app: any; isOpen: boolean; onClose: () => void }) {
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const queryClient = useQueryClient();

  const respondMutation = useMutation({
    mutationFn: async (data: { accept: boolean; reason?: string }) => {
      return apiClient.post(API_ENDPOINTS.APPLICATIONS.RESPOND_OFFER(app.id), data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      toast.success(variables.accept ? 'Offer Accepted!' : 'Offer Rejected');
      onClose();
    }
  });

  if (!app) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{app.jobTitle}</DialogTitle>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary">{app.status}</Badge>
            <span className="text-sm text-muted-foreground">Applied {formatDateToLocale(app.appliedAt)}</span>
          </div>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {app.status === 'Rejected' && (
            <div className="bg-red-500/10 border-red-500/20 border p-4 rounded-md">
              <h4 className="font-semibold text-red-700 dark:text-red-400 mb-1">Application Update</h4>
              <p className="text-sm text-red-600 dark:text-red-300">{app.details?.reason}</p>
            </div>
          )}

          {app.status === 'Interview Scheduled' && (
            <div className="bg-blue-500/10 border-blue-500/20 border p-4 rounded-md space-y-3">
              <h4 className="font-semibold text-blue-700 dark:text-blue-400">Interview Scheduled (Round {app.details?.interviewRound})</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block mb-1">Date & Time</span>
                  <span className="font-medium">{formatDateTimeToLocale(app.details?.scheduledAt)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block mb-1">Mode</span>
                  <span className="font-medium">{app.details?.mode}</span>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-500/20">
                <span className="text-muted-foreground block mb-1 text-sm">Location / Link</span>
                <span className="font-medium text-sm text-blue-700 dark:text-blue-400 break-all">{app.details?.location}</span>
              </div>
            </div>
          )}

          {app.status === 'Offer Extended' && (
            <div className="bg-green-500/10 border-green-500/20 border p-4 rounded-md space-y-4">
              <h4 className="font-semibold text-green-700 dark:text-green-400">Congratulations! An offer has been extended.</h4>
              <div className="text-sm">
                <span className="text-muted-foreground">Offer Extended on: </span>
                <span className="font-medium">{formatDateToLocale(app.details?.offerExtendedAt)}</span>
              </div>
              <div className="text-sm">
                <span className="text-destructive font-medium">Respond by: </span>
                <span className="font-medium">{formatDateToLocale(app.details?.offerDeadline)}</span>
              </div>
              
              <div className="pt-4 flex gap-3">
                <Button 
                  className="bg-green-600 hover:bg-green-700 text-white" 
                  onClick={() => respondMutation.mutate({ accept: true })}
                  disabled={respondMutation.isPending || showRejectForm}
                >
                  Accept Offer (Requires Document)
                </Button>
                <Button 
                  variant="outline" 
                  className="text-destructive hover:bg-destructive/10 border-destructive/20"
                  onClick={() => setShowRejectForm(true)}
                  disabled={respondMutation.isPending || showRejectForm}
                >
                  Decline Offer
                </Button>
              </div>

              {showRejectForm && (
                <div className="mt-4 pt-4 border-t border-green-500/20 space-y-3">
                  <Label>Reason for Declining <span className="text-destructive">*</span></Label>
                  <Textarea 
                    placeholder="Please let us know why you are declining the offer..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="destructive" 
                      onClick={() => respondMutation.mutate({ accept: false, reason: rejectReason })}
                      disabled={!rejectReason.trim()}
                    >
                      Confirm Decline
                    </Button>
                    <Button variant="ghost" onClick={() => setShowRejectForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <h4 className="font-medium mb-3 border-b pb-2">Your Application Details</h4>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2">
                <span className="text-muted-foreground">Resume</span>
                <span className="text-primary cursor-pointer hover:underline">view_resume.pdf</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-muted-foreground">Require Visa Sponsorship?</span>
                <span>No</span>
              </div>
              <div className="grid grid-cols-2">
                <span className="text-muted-foreground">Notice Period</span>
                <span>2 Weeks</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
