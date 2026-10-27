import { Banknote, PackageCheck, ShieldCheck } from 'lucide-react';

// Only promises the store actually keeps (no unverifiable product claims such as "dermatologist tested").
const PROMISES = [
  { icon: Banknote, title: 'Cash on Delivery', description: 'Pay when your order arrives at your door.' },
  { icon: PackageCheck, title: 'Track Your Orders', description: 'Follow every order from confirmation to delivery in your account.' },
  { icon: ShieldCheck, title: 'Secure Checkout', description: 'Your account and details are protected end to end.' },
];

export function BrandPromise() {
  return (
    <section className="border-y border-border bg-muted/40">
      <div className="container grid grid-cols-1 gap-8 py-10 md:grid-cols-3 md:py-14">
        {PROMISES.map((p) => (
          <div key={p.title} className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent-soft">
              <p.icon className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-display text-base font-semibold">{p.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
