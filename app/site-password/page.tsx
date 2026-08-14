import type { Metadata } from "next";
import { verifySitePassword } from "./actions";

export const metadata: Metadata = {
  title: "Site Access",
  robots: { index: false, follow: false },
};

export default async function SitePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect: redirectTo = "", error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 py-16 text-white">
      <div className="w-full max-w-sm">
        <p className="mb-3 text-center text-[11px] font-medium uppercase tracking-[0.3em] text-white/50">
          Under Construction
        </p>
        <h1 className="mb-3 text-center text-2xl font-semibold tracking-tight">
          This site isn&apos;t open yet
        </h1>
        <p className="mb-10 text-center text-sm leading-relaxed text-white/60">
          We&apos;re still building. Enter the access password to continue.
        </p>

        <form action={verifySitePassword} className="flex flex-col gap-4">
          <input type="hidden" name="redirect" value={redirectTo} />
          <input
            type="password"
            name="password"
            autoFocus
            required
            placeholder="Password"
            className="w-full border border-white/25 bg-transparent px-4 py-3 text-sm text-white outline-none transition-colors placeholder:text-white/35 focus:border-white"
          />
          {error && (
            <p role="alert" className="text-center text-xs text-white/70">
              Incorrect password. Please try again.
            </p>
          )}
          <button
            type="submit"
            className="w-full border border-white bg-white px-4 py-3 text-sm font-medium text-black transition-colors hover:bg-black hover:text-white"
          >
            Enter
          </button>
        </form>
      </div>
    </main>
  );
}
