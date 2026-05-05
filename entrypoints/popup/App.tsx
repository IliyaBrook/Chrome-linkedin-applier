import { AutoApplyButton } from '@/components/popup/AutoApplyButton';
import { MenuButtons } from '@/components/popup/MenuButtons';
import { SavedLinks } from '@/components/popup/SavedLinks';

export default function App() {
  return (
    <main className="flex w-[420px] flex-col gap-3 p-4">
      <header className="flex items-center justify-between">
        <h1 className="text-base font-semibold tracking-tight">Easy Apply LinkedIn</h1>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
          WXT dev
        </span>
      </header>
      <MenuButtons />
      <SavedLinks />
      <AutoApplyButton />
    </main>
  );
}
