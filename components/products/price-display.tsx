import { formatCurrency, getDiscountPercent } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function PriceDisplay({
  basePrice,
  salePrice,
  currency,
  size = 'default',
}: {
  basePrice: number;
  salePrice?: number | null;
  currency?: string;
  size?: 'default' | 'lg';
}) {
  const discount = getDiscountPercent(basePrice, salePrice);
  const priceClass = size === 'lg' ? 'text-2xl' : 'text-base';

  if (salePrice != null && discount) {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className={`font-display font-semibold ${priceClass}`}>{formatCurrency(salePrice, currency)}</span>
        <span className="text-sm text-muted-foreground line-through">{formatCurrency(basePrice, currency)}</span>
        <Badge variant="soft">-{discount}%</Badge>
      </div>
    );
  }

  return <span className={`font-display font-semibold ${priceClass}`}>{formatCurrency(basePrice, currency)}</span>;
}
