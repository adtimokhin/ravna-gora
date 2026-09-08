import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import { DonateForm } from "../../components/ui/DonateForm";

export default function DonatePage() {
  return (
    <div className="min-h-screen bg-offwhite-1 flex flex-col">
      <Navbar />

      <main className="flex-1">
        <div className="max-w-[1512px] mx-auto px-4 md:px-6 xl:px-10 pt-(--space-8) pb-(--space-10)">
          <DonateForm />
        </div>
      </main>

      <Footer />
    </div>
  );
}
