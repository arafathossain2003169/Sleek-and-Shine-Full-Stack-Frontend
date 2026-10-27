'use client';

import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminAttributes } from '@/lib/hooks/useAdminData';
import { adminApi } from '@/lib/api/admin';
import { getErrorMessage } from '@/lib/api/errors';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { AttributeDefinition } from '@/types/product';
import { toast } from '@/stores/toast.store';

type Values = Record<string, unknown>;

const isEmpty = (v: unknown) => v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0);

export function ProductAttributesEditor({ productId, attributes }: { productId: string; attributes: Values }) {
  const { data: definitions } = useAdminAttributes();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Values>(attributes ?? {});
  const [isSaving, setIsSaving] = useState(false);

  // Pick up server-side changes (after save / refetch) instead of showing stale values.
  useEffect(() => setValues(attributes ?? {}), [attributes]);

  const defs = definitions?.filter((d) => d.applies_to === 'product' || d.applies_to === 'both');
  const set = (slug: string, value: unknown) => setValues((v) => ({ ...v, [slug]: value }));

  async function handleSave() {
    // Type-correct payload: numbers stay numbers, lists stay lists, blanks are dropped.
    const payload: Values = {};
    for (const def of defs ?? []) {
      const raw = values[def.slug];
      if (isEmpty(raw)) continue;
      if (def.type === 'number') {
        const n = Number(raw);
        if (!Number.isFinite(n)) return toast({ title: `${def.name} must be a number`, variant: 'destructive' });
        payload[def.slug] = n;
      } else {
        payload[def.slug] = raw;
      }
    }
    setIsSaving(true);
    try {
      await adminApi.products.update(productId, { attributes: payload });
      toast({ title: 'Attributes saved', variant: 'success' });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'products'] });
    } catch (err) {
      toast({ title: 'Could not save attributes', description: getErrorMessage(err), variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  }

  if (!defs || defs.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No product-level attribute definitions exist yet. Create some under Admin → Attributes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {defs.map((def) => (
        <div key={def.id} className="flex flex-col gap-1.5">
          <Label htmlFor={`attr-${def.slug}`}>
            {def.name} {def.is_required && <span className="text-destructive" title="Required to publish">*</span>}
          </Label>
          <AttributeInput def={def} value={values[def.slug]} onChange={(v) => set(def.slug, v)} />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">* Required attributes must be filled before a product can be published.</p>
      <Button type="button" variant="accent" size="sm" className="w-fit" onClick={handleSave} disabled={isSaving}>
        {isSaving ? 'Saving...' : 'Save Attributes'}
      </Button>
    </div>
  );
}

function AttributeInput({ def, value, onChange }: { def: AttributeDefinition; value: unknown; onChange: (v: unknown) => void }) {
  const id = `attr-${def.slug}`;
  const options = (Array.isArray(def.predefined_values) ? def.predefined_values : []).map(String);

  switch (def.type) {
    case 'boolean':
      return (
        <label className="flex items-center gap-2">
          <Checkbox id={id} checked={value === true} onCheckedChange={(c) => onChange(c === true)} />
          <span className="text-sm text-muted-foreground">Yes</span>
        </label>
      );

    case 'select':
      return options.length > 0 ? (
        <select
          id={id}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={typeof value === 'string' ? value : ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Select...</option>
          {options.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      ) : (
        <Input id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />
      );

    case 'multiselect': {
      // Stored as a LIST (the old editor flattened it into the string "Oily,Dry", corrupting filters).
      const selected = Array.isArray(value) ? (value as string[]) : [];
      if (options.length === 0) {
        return (
          <Input
            id={id}
            placeholder="Comma-separated values"
            value={selected.join(', ')}
            onChange={(e) => onChange(e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
          />
        );
      }
      return (
        <div id={id} role="group" className="flex flex-wrap gap-x-4 gap-y-2">
          {options.map((opt) => (
            <label key={opt} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={(c) => onChange(c === true ? [...selected, opt] : selected.filter((s) => s !== opt))}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    case 'number':
      return <Input id={id} type="number" step="any" value={value === undefined || value === null ? '' : String(value)} onChange={(e) => onChange(e.target.value)} />;

    case 'date':
      return <Input id={id} type="date" value={typeof value === 'string' ? value.slice(0, 10) : ''} onChange={(e) => onChange(e.target.value)} />;

    case 'color':
      return (
        <div className="flex items-center gap-2">
          <input
            type="color"
            aria-label={`${def.name} colour picker`}
            className="h-10 w-12 cursor-pointer rounded border border-input bg-background"
            value={typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value) ? value : '#000000'}
            onChange={(e) => onChange(e.target.value)}
          />
          <Input id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} placeholder="#RRGGBB or a name" />
        </div>
      );

    case 'richtext':
      return <Textarea id={id} rows={4} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />;

    default: // text, measurement
      return <Input id={id} value={typeof value === 'string' ? value : ''} onChange={(e) => onChange(e.target.value)} />;
  }
}
