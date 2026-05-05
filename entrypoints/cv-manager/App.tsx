import { useState } from 'react';
import {
  Check,
  FileText,
  ListFilter,
  Pencil,
  Plus,
  Settings2,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemTitle,
} from '@/components/ui/item';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PageLayout } from '@/components/page/PageLayout';
import { useStorage } from '@/hooks/useStorage';
import {
  cvFilesStorage,
  selectedCvFileFiltersStorage,
  selectedCvFileStorage,
  smartSelectEnabledStorage,
} from '@/lib/storage';
import { cn } from '@/lib/utils';
import {
  addCv,
  addFilter,
  deleteCv,
  deleteFilter,
  renameCv,
  updateFilter,
} from './cv-store';

type CvDialogState =
  | { mode: 'closed' }
  | { mode: 'add' }
  | { mode: 'edit'; id: string; initial: string };

type FilterDialogState =
  | { mode: 'closed' }
  | { mode: 'add' }
  | { mode: 'edit'; index: number; initial: string };

export default function App() {
  const cvFiles = useStorage(cvFilesStorage);
  const selectedCv = useStorage(selectedCvFileStorage);
  const filtersStorage = useStorage(selectedCvFileFiltersStorage);
  const smartSelect = useStorage(smartSelectEnabledStorage);

  const files = cvFiles.value ?? [];
  const filters = filtersStorage.value ?? {};
  const [activeId, setActiveId] = useState<string | null>(null);
  const [cvDialog, setCvDialog] = useState<CvDialogState>({ mode: 'closed' });
  const [filterDialog, setFilterDialog] = useState<FilterDialogState>({ mode: 'closed' });
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const activeCv = activeId ? files.find((f) => f.id === activeId) : null;
  const activeFilters = activeCv ? filters[activeCv.name] ?? [] : [];

  const onSubmitCvDialog = async () => {
    setError(null);
    if (cvDialog.mode === 'add') {
      const result = addCv(files, draft);
      if (!result.ok) {
        setError(result.error ?? 'Could not add CV.');
        return;
      }
      await cvFiles.setValue(result.next);
    }
    if (cvDialog.mode === 'edit') {
      const result = renameCv(files, filters, cvDialog.id, draft);
      if (!result.ok) {
        setError(result.error ?? 'Could not rename CV.');
        return;
      }
      await cvFiles.setValue(result.nextFiles);
      await filtersStorage.setValue(result.nextFilters);
    }
    setCvDialog({ mode: 'closed' });
    setDraft('');
  };

  const onDeleteCv = async (id: string) => {
    const result = deleteCv(files, filters, selectedCv.value ?? null, id);
    await cvFiles.setValue(result.nextFiles);
    await filtersStorage.setValue(result.nextFilters);
    await selectedCv.setValue(result.nextSelected);
    if (activeId === id) setActiveId(null);
  };

  const onSelect = async (id: string) => {
    await selectedCv.setValue(id);
  };

  const onSubmitFilterDialog = async () => {
    if (!activeCv) return;
    setError(null);
    if (filterDialog.mode === 'add') {
      const result = addFilter(filters, activeCv.name, draft);
      if (!result.ok) {
        setError(result.error ?? 'Could not add filter.');
        return;
      }
      await filtersStorage.setValue(result.next);
    }
    if (filterDialog.mode === 'edit') {
      const next = updateFilter(filters, activeCv.name, filterDialog.index, draft.trim());
      await filtersStorage.setValue(next);
    }
    setFilterDialog({ mode: 'closed' });
    setDraft('');
  };

  const onDeleteFilter = async (index: number) => {
    if (!activeCv) return;
    const next = deleteFilter(filters, activeCv.name, index);
    await filtersStorage.setValue(next);
  };

  return (
    <PageLayout
      title="CV Files"
      description="Pick which CV the apply flow uses, and (optionally) match CVs to job titles."
      actions={
        <div className="flex items-center gap-2">
          <Label htmlFor="smart-select" className="text-sm">
            Smart Select CV
          </Label>
          <Switch
            id="smart-select"
            checked={smartSelect.value ?? false}
            onCheckedChange={(v) => void smartSelect.setValue(v)}
          />
        </div>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Your CVs</CardTitle>
            <CardAction>
              <Button
                size="sm"
                onClick={() => {
                  setCvDialog({ mode: 'add' });
                  setDraft('');
                  setError(null);
                }}
              >
                <Plus className="h-4 w-4" />
                Add CV
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            {files.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <FileText />
                  </EmptyMedia>
                  <EmptyTitle>No CVs yet</EmptyTitle>
                  <EmptyDescription>
                    Add a CV name to use it in the apply flow.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ItemGroup className="gap-2">
                {files.map((cv) => {
                  const isSelected = selectedCv.value === cv.id;
                  const filterCount = filters[cv.name]?.length ?? 0;
                  return (
                    <Item
                      key={cv.id}
                      variant="outline"
                      size="sm"
                      className={cn(isSelected && 'border-primary bg-primary/5')}
                    >
                      <ItemContent>
                        <ItemTitle>
                          {cv.name}
                          {isSelected && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-normal text-emerald-800">
                              Selected
                            </span>
                          )}
                        </ItemTitle>
                        <span className="text-xs text-muted-foreground">
                          {filterCount} filter{filterCount === 1 ? '' : 's'}
                        </span>
                      </ItemContent>
                      <ItemActions>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Manage filters for ${cv.name}`}
                          onClick={() => setActiveId(cv.id)}
                        >
                          <Settings2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Select ${cv.name}`}
                          disabled={isSelected}
                          onClick={() => void onSelect(cv.id)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Edit ${cv.name}`}
                          onClick={() => {
                            setCvDialog({ mode: 'edit', id: cv.id, initial: cv.name });
                            setDraft(cv.name);
                            setError(null);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          aria-label={`Delete ${cv.name}`}
                          onClick={() => void onDeleteCv(cv.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </ItemActions>
                    </Item>
                  );
                })}
              </ItemGroup>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b">
            <CardTitle className="text-lg">
              {activeCv ? `Filters for ${activeCv.name}` : 'Per-CV filters'}
            </CardTitle>
            {activeCv && (
              <CardAction>
                <Button
                  size="sm"
                  onClick={() => {
                    setFilterDialog({ mode: 'add' });
                    setDraft('');
                    setError(null);
                  }}
                >
                  <Plus className="h-4 w-4" />
                  Add filter
                </Button>
              </CardAction>
            )}
          </CardHeader>
          <CardContent>
            {!activeCv ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <Settings2 />
                  </EmptyMedia>
                  <EmptyTitle>No CV selected</EmptyTitle>
                  <EmptyDescription>
                    Click the settings icon on a CV to manage its filters.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : activeFilters.length === 0 ? (
              <Empty>
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <ListFilter />
                  </EmptyMedia>
                  <EmptyTitle>No filters yet</EmptyTitle>
                  <EmptyDescription>
                    Add words that should match this CV to a job title.
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <ItemGroup className="gap-2">
                {activeFilters.map((word, index) => (
                  <Item key={`${word}-${index}`} variant="outline" size="sm">
                    <ItemContent>
                      <ItemTitle>{word}</ItemTitle>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Edit ${word}`}
                        onClick={() => {
                          setFilterDialog({ mode: 'edit', index, initial: word });
                          setDraft(word);
                          setError(null);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete ${word}`}
                        onClick={() => void onDeleteFilter(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={cvDialog.mode !== 'closed'}
        onOpenChange={(o) => {
          if (!o) {
            setCvDialog({ mode: 'closed' });
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{cvDialog.mode === 'edit' ? 'Edit CV' : 'Add CV'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cv-name">CV name</Label>
            <Input
              id="cv-name"
              value={draft}
              autoFocus
              placeholder="e.g. resume_senior_react.pdf"
              onChange={(e) => setDraft(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCvDialog({ mode: 'closed' })}>
              Cancel
            </Button>
            <Button onClick={() => void onSubmitCvDialog()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={filterDialog.mode !== 'closed'}
        onOpenChange={(o) => {
          if (!o) {
            setFilterDialog({ mode: 'closed' });
            setError(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{filterDialog.mode === 'edit' ? 'Edit filter' : 'Add filter'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="filter-input">Job title fragment</Label>
            <Input
              id="filter-input"
              value={draft}
              autoFocus
              placeholder="e.g. senior react"
              onChange={(e) => setDraft(e.target.value)}
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setFilterDialog({ mode: 'closed' })}>
              Cancel
            </Button>
            <Button onClick={() => void onSubmitFilterDialog()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
