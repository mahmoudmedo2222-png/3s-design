import Link from 'next/link';
import { CartButton } from '../../components/cart-button';
import { CheckoutWorkspace } from '../../components/checkout-workspace';
import { ThemeToggle } from '../../components/theme-toggle';

export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-paper text-ink dark:bg-[#0b0f0e]">
      <header className="border-b border-line bg-paper/95 backdrop-blur dark:bg-[#0b0f0e]/95">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/?intro=0" className="brand-lockup min-w-0" aria-label="Back to 3S Design home">
            <span className="brand-mark" aria-hidden="true">
              <span className="brand-mark__stroke brand-mark__stroke--one" />
              <span className="brand-mark__stroke brand-mark__stroke--two" />
              <span className="brand-mark__spark" />
            </span>
            <span className="min-w-0">
              <span className="brand-kicker block">Private checkout</span>
              <span className="brand-title block">3S Design</span>
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/?intro=0#latest-designs"
              className="hidden rounded border border-line bg-white px-3 py-2 text-sm font-bold text-ink transition hover:border-pine hover:text-pine sm:inline-flex"
            >
              Marketplace
            </Link>
            <ThemeToggle />
            <CartButton />
          </div>
        </div>
      </header>

      <CheckoutWorkspace />
    </main>
  );
}
