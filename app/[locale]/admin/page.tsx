import { Navbar } from "../../components/layout/Navbar";
import { Footer } from "../../components/layout/Footer";
import { AdminGuard } from "../../components/admin/AdminGuard";
import { AdminDashboard } from "../../components/admin/AdminDashboard";

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-offwhite-1 flex flex-col">
      <Navbar />
      <main className="flex-1">
        <div className="max-w-[1512px] mx-auto px-4 md:px-6 xl:px-10 pt-(--space-8) pb-(--space-8) flex flex-col gap-(--space-6)">
          <h1 className="type-display text-black">Admin</h1>
          <AdminGuard>
            <AdminDashboard />
          </AdminGuard>
        </div>
      </main>
      <Footer />
    </div>
  );
}
