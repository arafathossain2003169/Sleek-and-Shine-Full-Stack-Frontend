'use client';

import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { adminApi } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { QueryError } from '@/components/shared/query-error';
import { SettingItem } from '@/types/admin';
import { toast } from '@/stores/toast.store';
import { cn } from '@/lib/utils';

const GROUPS: { name: SettingItem['group']; title: string; blurb: string }[] = [
  { name: 'Shipping', title: 'Shipping', blurb: 'Applied to every new checkout immediately.' },
  { name: 'Inventory', title: 'Inventory', blurb: 'Controls what counts as “low stock” across the dashboard and inventory screens.' },
  { name: 'Security', title: 'Login verification codes', blurb: 'Limits for the emailed one-time codes used at sign-up and login.' },
];

export default function AdminSettingsPage() {
  const queryClient = useQueryClient();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'settings'],
    queryFn: async () => (await adminApi.settings.list()).data.settings,
  });
  // draft[key]: the text in the box; reset[key]: "go back to the server default" was clicked
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [reset, setReset] = useState<Record<string, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const settings = useMemo(() => data ?? [], [data]);

  const pending = useMemo(() => {
    const changes: Record<string, number | null> = {};
    for (const s of settings) {
      if (reset[s.key]) { if (s.isCustom) changes[s.key] = null; continue; }
      const text = draft[s.key];
      if (text !== undefined && text.trim() !== '' && Number(text) !== s.value) changes[s.key] = Number(text);
    }
    return changes;
  }, [settings, draft, reset]);
  const dirty = Object.keys(pending).length > 0;

  function validate(): string | null {
    for (const s of settings) {
      const v = pending[s.key];
      if (v === undefined || v === null) continue;
      if (!Number.isFinite(v)) return `${s.label}: enter a number.`;
      if (v < s.min || v > s.max) return `${s.label}: must be between ${s.min} and ${s.max}.`;
      if (s.kind === 'integer' && !Number.isInteger(v)) return `${s.label}: must be a whole number.`;
      if (s.kind === 'money' && Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) return `${s.label}: at most 2 decimals.`;
    }
    return null;
  }

  async function save() {
    const problem = validate();
    if (problem) return setFormError(problem);
    setFormError(null);
    setIsSaving(true);
    try {
      await adminApi.settings.update(pending);
      toast({ title: 'Settings saved', description: 'The new values apply immediately.', variant: 'success' });
      setDraft({});
      setReset({});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['admin', 'settings'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] }),
        queryClient.invalidateQueries({ queryKey: ['admin', 'inventory'] }),
        queryClient.invalidateQueries({ queryKey: ['checkout-quote'] }),
      ]);
    } catch (err) {
      setFormError(getErrorMessage(err, 'Could not save the settings'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="font-display text-2xl font-semibold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Store-wide rates and limits. The “default” shown is the value from the server configuration; anything you
          change here overrides it, and “Reset” returns to the default.
        </p>
      </div>

      {error && !data ? (
        <QueryError error={error} onRetry={() => refetch()} title="Could not load the settings" />
      ) : isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <>
          {GROUPS.map((group) => (
            <Card key={group.name}>
              <CardHeader>
                <CardTitle>{group.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{group.blurb}</p>
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-border">
                {settings.filter((s) => s.group === group.name).map((s) => {
                  const text = reset[s.key] ? String(s.defaultValue) : draft[s.key] ?? String(s.value);
                  const changed = s.key in pending;
                  return (
                    <div key={s.key} className="flex flex-col gap-2 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
                      <div className="sm:max-w-md">
                        <Label htmlFor={s.key} className="flex items-center gap-2">
                          {s.label}
                          {s.isCustom && !reset[s.key] && <Badge variant="soft">Customised</Badge>}
                        </Label>
                        <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
                        <p className="mt-1 text-xs text-muted-foreground">Default: <span className="font-medium text-foreground">{s.defaultValue}</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          id={s.key}
                          type="number"
                          inputMode={s.kind === 'integer' ? 'numeric' : 'decimal'}
                          min={s.min}
                          max={s.max}
                          step={s.step}
                          value={text}
                          disabled={isSaving}
                          onChange={(e) => { setReset((r) => ({ ...r, [s.key]: false })); setDraft((d) => ({ ...d, [s.key]: e.target.value })); }}
                          className={cn('w-32', changed && 'border-accent')}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Reset ${s.label} to default`}
                          title="Reset to default"
                          disabled={isSaving || (!s.isCustom && draft[s.key] === undefined)}
                          onClick={() => { setDraft((d) => { const { [s.key]: _drop, ...rest } = d; return rest; }); setReset((r) => ({ ...r, [s.key]: true })); }}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}

          {formError && <p role="alert" className="text-sm text-destructive">{formError}</p>}
          <div className="sticky bottom-4 flex items-center gap-3 rounded-lg border border-border bg-card p-3 shadow-sm">
            <Button type="button" variant="accent" onClick={save} disabled={!dirty || isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
            <Button type="button" variant="outline" disabled={!dirty || isSaving} onClick={() => { setDraft({}); setReset({}); setFormError(null); }}>
              Discard
            </Button>
            <span className="text-sm text-muted-foreground">{dirty ? `${Object.keys(pending).length} unsaved change(s)` : 'No unsaved changes'}</span>
          </div>
        </>
      )}
    </div>
  );
}
