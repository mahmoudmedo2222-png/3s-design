import { ActionLink, Panel } from '../components/ui';

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-paper px-4 text-center dark:bg-[#0b0f0e]">
      <Panel className="max-w-md p-6">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-pine">Nothing here</p>
        <h1 className="mt-3 text-4xl font-black text-ink">This page is not available</h1>
        <p className="mt-4 text-sm leading-6 text-muted">
          The design, account area, or admin route may have moved. Go back to the marketplace and continue from a clean state.
        </p>
        <ActionLink href="/?intro=0" className="mt-6 h-11 px-5">
          Open marketplace
        </ActionLink>
      </Panel>
    </main>
  );
}
