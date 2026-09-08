import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (name: string) => void;
};

export function DisplayNameDialog({ open, onCancel, onConfirm }: Props) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setError(null);
  }, [open]);

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) onCancel();
  }

  function handleConfirm(event: React.MouseEvent<HTMLButtonElement>) {
    const trimmed = name.trim();
    if (!trimmed) {
      event.preventDefault();
      setError("Please enter a display name");
      return;
    }
    onConfirm(trimmed);
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>Set your display name</AlertDialogTitle>
          <AlertDialogDescription>
            This name is how others will see you in the room.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const trimmed = name.trim();
              if (!trimmed) {
                setError("Please enter a display name");
                return;
              }
              onConfirm(trimmed);
            }
          }}
          placeholder="Your name"
          autoFocus
          className="w-full rounded-xl border border-default bg-primary px-4 py-3 focus:border-violet-500 focus:outline-none"
        />
        {error && <p className="text-sm text-red-400">{error}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={!name.trim()} onClick={handleConfirm}>
            Continue
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
