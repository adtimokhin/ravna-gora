export type SidebarItem = {
  key: string;
  label: string;
  variant?: "danger";
};

export function AccountSidebar({
  items,
  active,
  onSelect,
  signOutLabel,
  onSignOut,
}: {
  items: SidebarItem[];
  active: string;
  onSelect: (key: string) => void;
  signOutLabel: string;
  onSignOut: () => void;
}) {
  return (
    <nav aria-label="Account" className="flex flex-col">
      {/* Desktop: vertical list with a left-border accent on the active item */}
      <div className="hidden xl:flex flex-col">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            aria-current={active === item.key ? "true" : undefined}
            className={`text-left type-ui-serif px-5 py-3 border-l-2 transition-colors ${
              active === item.key
                ? "border-l-blue-2 text-black bg-black/[0.03]"
                : item.variant === "danger"
                  ? "border-l-transparent text-red-700/80 hover:border-l-red-700/40 hover:bg-black/[0.02]"
                  : "border-l-transparent text-gray-2 hover:text-black hover:border-l-black/20 hover:bg-black/[0.02]"
            }`}
          >
            {item.label}
          </button>
        ))}
        <div className="h-px bg-black/10 w-full my-3" />
        <button
          onClick={onSignOut}
          className="text-left type-ui-serif px-5 py-3 border-l-2 border-l-transparent text-gray-2 hover:text-black hover:border-l-black/20 hover:bg-black/[0.02] transition-colors"
        >
          {signOutLabel}
        </button>
      </div>

      {/* Phone / tablet: horizontal scrollable tabs, underline on the active item */}
      <div className="xl:hidden flex items-center gap-6 overflow-x-auto pb-3 border-b border-black/10">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            aria-current={active === item.key ? "true" : undefined}
            className={`shrink-0 type-ui-serif pb-2 border-b-2 whitespace-nowrap transition-colors ${
              active === item.key
                ? "border-b-blue-2 text-black"
                : item.variant === "danger"
                  ? "border-b-transparent text-red-700/80"
                  : "border-b-transparent text-gray-2"
            }`}
          >
            {item.label}
          </button>
        ))}
        <button
          onClick={onSignOut}
          className="shrink-0 type-ui-serif pb-2 border-b-2 border-b-transparent text-gray-2 whitespace-nowrap"
        >
          {signOutLabel}
        </button>
      </div>
    </nav>
  );
}
