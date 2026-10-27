'use client';

import { useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api/admin';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Pagination } from '@/components/shared/pagination';
import { QueryError } from '@/components/shared/query-error';
import { formatDateTime } from '@/lib/utils';
import { AuditLog } from '@/types/admin';

const PAGE_SIZE = 30;
const ENTITY_TYPES = ['product', 'category', 'brand', 'attribute_definition', 'order', 'customer', 'coupon', 'homepage_section', 'inventory', 'staff'];

export default function AdminAuditLogsPage() {
  const [page, setPage] = useState(1);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [selected, setSelected] = useState<AuditLog | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin', 'audit-logs', { page, entityType, action }],
    queryFn: () => adminApi.auditLogs.list({ page, limit: PAGE_SIZE, entityType: entityType || undefined, action: action.trim() || undefined }),
    placeholderData: keepPreviousData,
  });
  const logs = data?.data.auditLogs ?? [];

  return (
    <div className="flex flex-col gap-5">
      <h1 className="font-display text-2xl font-semibold">Audit Logs</h1>

      <div className="flex flex-wrap gap-3">
        <select
          aria-label="Filter by entity"
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          value={entityType}
          onChange={(e) => { setEntityType(e.target.value); setPage(1); }}
        >
          <option value="">All entities</option>
          {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </select>
        <Input aria-label="Filter by action" placeholder="Action (e.g. update_status)" className="max-w-xs" value={action}
          onChange={(e) => { setAction(e.target.value); setPage(1); }} />
      </div>

      {error && !data ? <QueryError error={error} onRetry={() => refetch()} title="Could not load audit logs" /> : isLoading ? <Skeleton className="h-96 w-full" /> : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow><TableHead>When</TableHead><TableHead>Admin</TableHead><TableHead>Action</TableHead><TableHead>Entity</TableHead><TableHead className="text-right">Details</TableHead></TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">{formatDateTime(log.created_at)}</TableCell>
                  <TableCell>{log.admin_name ?? log.admin_email ?? 'System'}</TableCell>
                  <TableCell><Badge variant="muted">{log.action}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{log.entity_type.replace('_', ' ')}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="sm" onClick={() => setSelected(log)}>View</Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {logs.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No audit entries match.</p>}
        </div>
      )}

      <Pagination page={page} totalPages={Number(data?.meta?.totalPages ?? 1)} onChange={setPage} />

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selected?.action} · {selected?.entity_type}</DialogTitle>
            <DialogDescription>
              {selected && `${formatDateTime(selected.created_at)} by ${selected.admin_name ?? selected.admin_email ?? 'System'}${selected.ip_address ? ` (${selected.ip_address})` : ''}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 md:grid-cols-2">
            {(['old_value', 'new_value'] as const).map((key) => (
              <div key={key}>
                <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">{key === 'old_value' ? 'Before' : 'After'}</p>
                <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
                  {selected?.[key] != null ? JSON.stringify(selected[key], null, 2) : '—'}
                </pre>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
