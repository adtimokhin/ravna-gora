export function PaneTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="type-h3 text-black">{children}</h2>;
}

export function PaneDescription({ children }: { children: React.ReactNode }) {
  return <p className="type-body-serif text-gray-2">{children}</p>;
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="type-label-serif text-gray-2 uppercase">{label}</label>
      {children}
    </div>
  );
}

export function TextInput(
  props: React.InputHTMLAttributes<HTMLInputElement>
) {
  const { className, ...rest } = props;
  return (
    <input
      {...rest}
      className={`border-0 border-b border-black/25 bg-transparent px-0 py-2.5 type-body-serif text-black placeholder:text-gray-3 outline-none focus:border-blue-2 transition-colors ${className ?? ""}`}
    />
  );
}

export function Message({ text, ok }: { text: string; ok: boolean }) {
  return (
    <p className={`type-caption-serif ${ok ? "text-green-700" : "text-red-600"}`}>
      {text}
    </p>
  );
}

export function PrimaryButton({
  children,
  loading,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={`cursor-pointer bg-blue-2 text-white type-ui-serif px-7 py-2.5 hover:opacity-90 transition-opacity disabled:opacity-60 self-start ${rest.className ?? ""}`}
    >
      {loading ? "…" : children}
    </button>
  );
}

export function SecondaryButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const { className, ...rest } = props;
  return (
    <button
      {...rest}
      className={`cursor-pointer border border-black type-ui-serif text-black px-7 py-2.5 hover:bg-black hover:text-white transition-colors self-start ${className ?? ""}`}
    />
  );
}

export function DangerButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>
) {
  const { className, ...rest } = props;
  return (
    <button
      {...rest}
      className={`cursor-pointer border border-red-700 type-ui-serif text-red-700 px-7 py-2.5 hover:bg-red-700 hover:text-white transition-colors disabled:opacity-50 self-start ${className ?? ""}`}
    />
  );
}
