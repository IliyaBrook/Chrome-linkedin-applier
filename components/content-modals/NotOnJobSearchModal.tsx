import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LINKEDIN_JOBS_URL } from '@/lib/constants';

export type NotOnJobSearchModalProps = {
  open: boolean;
  onClose: () => void;
};

export function NotOnJobSearchModal({ open, onClose }: NotOnJobSearchModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Not on the LinkedIn jobs search page
          </DialogTitle>
          <DialogDescription>
            Auto Apply only runs from a LinkedIn jobs search page. Open one and try again.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              window.location.href = LINKEDIN_JOBS_URL;
            }}
          >
            Go to job search
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
