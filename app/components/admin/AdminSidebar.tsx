export type AdminSidebarItem = {
  key: string;
  label: string;
};

export function AdminSidebar({
  items,
  active,
  onSelect,
}: {
  items: AdminSidebarItem[];
  active: string;
  onSelect: (key: string) => void;
}) {
  return (
    <nav aria-label="Admin" className="flex flex-col">
      {/* Desktop: vertical list with a left-border accent on the active item */}
      <div className="hidden xl:flex flex-col">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            aria-current={active === item.key ? "true" : undefined}
            className={`text-left type-ui-medium px-5 py-3 border-l-2 transition-colors ${
              active === item.key
                ? "border-l-blue-2 text-black bg-black/[0.03]"
                : "border-l-transparent text-gray-2 hover:text-black hover:border-l-black/20 hover:bg-black/[0.02]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Phone / tablet: horizontal scrollable tabs, underline on the active item */}
      <div className="xl:hidden flex items-center gap-6 overflow-x-auto pb-3 border-b border-black/10">
        {items.map((item) => (
          <button
            key={item.key}
            onClick={() => onSelect(item.key)}
            aria-current={active === item.key ? "true" : undefined}
            className={`shrink-0 type-ui-medium pb-2 border-b-2 whitespace-nowrap transition-colors ${
              active === item.key ? "border-b-blue-2 text-black" : "border-b-transparent text-gray-2"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
