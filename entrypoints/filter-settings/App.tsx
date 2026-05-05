import { PageLayout } from '@/components/page/PageLayout';
import { WordListEditor } from '@/components/page/WordListEditor';
import { useStorage } from '@/hooks/useStorage';
import {
  badWordsEnabledStorage,
  badWordsStorage,
  titleFilterEnabledStorage,
  titleFilterWordsStorage,
  titleSkipEnabledStorage,
  titleSkipWordsStorage,
} from '@/lib/storage';

export default function App() {
  const badWords = useStorage(badWordsStorage);
  const badWordsEnabled = useStorage(badWordsEnabledStorage);
  const titleMustContain = useStorage(titleFilterWordsStorage);
  const titleMustContainEnabled = useStorage(titleFilterEnabledStorage);
  const titleMustSkip = useStorage(titleSkipWordsStorage);
  const titleMustSkipEnabled = useStorage(titleSkipEnabledStorage);

  return (
    <PageLayout
      title="Filter Settings"
      description="Skip jobs that don't match your criteria. All filters are word-boundary, case-insensitive."
    >
      <div className="grid gap-4 lg:grid-cols-3">
        <WordListEditor
          title="Job description: bad words"
          description="If the description contains any of these, the job is skipped."
          enabled={badWordsEnabled.value ?? true}
          onEnabledChange={(v) => void badWordsEnabled.setValue(v)}
          words={badWords.value ?? []}
          onWordsChange={(next) => badWords.setValue(next)}
          inputPlaceholder="e.g. clearance"
        />
        <WordListEditor
          title="Job title: must contain"
          description="At least one of these words must appear in the title (or company name)."
          enabled={titleMustContainEnabled.value ?? true}
          onEnabledChange={(v) => void titleMustContainEnabled.setValue(v)}
          words={titleMustContain.value ?? []}
          onWordsChange={(next) => titleMustContain.setValue(next)}
          inputPlaceholder="e.g. engineer"
        />
        <WordListEditor
          title="Job title: must skip"
          description="If any of these appear in the title, the job is skipped (highest priority)."
          enabled={titleMustSkipEnabled.value ?? true}
          onEnabledChange={(v) => void titleMustSkipEnabled.setValue(v)}
          words={titleMustSkip.value ?? []}
          onWordsChange={(next) => titleMustSkip.setValue(next)}
          inputPlaceholder="e.g. senior"
        />
      </div>
    </PageLayout>
  );
}
