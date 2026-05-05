import { Button } from '@/components/ui/button';

export default function App() {
  return (
    <main className="flex w-[420px] flex-col gap-4 p-4">
      <h1 className="text-lg font-semibold">Easy Apply LinkedIn (WXT dev)</h1>
      <p className="text-sm text-muted-foreground">
        Phase 2 skeleton — Tailwind and shadcn are wired up.
      </p>
      <Button>Start Auto Apply</Button>
    </main>
  );
}
