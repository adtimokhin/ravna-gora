export function WelcomeQuote({ quote }: { quote: string }) {
  return (
    <div className="flex items-center gap-4 xl:gap-[73px]">
      <div className="hidden xl:block w-[51px] border-t-2 border-black shrink-0" />
      <p className="type-h1 text-black text-center flex-1">{quote}</p>
      <div className="hidden xl:block w-[51px] border-t-2 border-black shrink-0" />
    </div>
  );
}
