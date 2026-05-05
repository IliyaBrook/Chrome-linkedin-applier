import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { sendMessage } from '@/lib/messaging';

export type FormControlModalProps = {
  open: boolean;
  onClose: () => void;
};

export function FormControlModal({ open, onClose }: FormControlModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? onClose() : undefined)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Form control fields are empty
          </DialogTitle>
          <DialogDescription>
            Fill the required personal info fields in the extension settings before starting Auto Apply.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={() => {
              void sendMessage('openDefaultInputPage', undefined);
              onClose();
            }}
          >
            Open Form Control
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
