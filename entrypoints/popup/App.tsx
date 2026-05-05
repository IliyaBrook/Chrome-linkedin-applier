import { AutoApplyButton } from '@/components/popup/AutoApplyButton';
import { MenuButtons } from '@/components/popup/MenuButtons';
import { SavedLinks } from '@/components/popup/SavedLinks';

export default function App() {
  return (
    <main className="flex w-[420px] flex-col gap-3 p-4">
      <MenuButtons />
      <SavedLinks />
      <AutoApplyButton />
    </main>
  );
}
