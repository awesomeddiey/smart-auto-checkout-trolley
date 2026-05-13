"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, ShoppingCart, AlertTriangle, CreditCard, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin",          label: "Dashboard",  icon: LayoutDashboard },
  { href: "/admin/products", label: "Products",   icon: Package         },
  { href: "/admin/trolleys", label: "Trolleys",   icon: ShoppingCart    },
  { href: "/admin/logs",     label: "Mismatches", icon: AlertTriangle   },
  { href: "/admin/payments", label: "Payments",   icon: CreditCard      },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "linear-gradient(135deg, #0a0e1a, #111827)" }}>
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col border-r border-white/5 p-4">
        <div className="mb-6">
          <p className="text-xs font-bold text-white/30 uppercase tracking-widest mb-1">Smart Trolley</p>
          <p className="text-white font-extrabold text-lg">Admin Panel</p>
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active
                    ? "bg-white/10 text-white border border-white/15"
                    : "text-white/50 hover:text-white hover:bg-white/5",
                )}
              >
                <Icon size={16} className={active ? "text-cyan-400" : ""} />
                {label}
                {active && <ChevronRight size={12} className="ml-auto text-white/30" />}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <Link href="/" className="flex items-center gap-2 text-xs text-white/30 hover:text-white/60 transition-colors px-3 py-2">
            ← Back to Trolley
          </Link>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto p-6">
        {children}
      </main>
    </div>
  );
}
