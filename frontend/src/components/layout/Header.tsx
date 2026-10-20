"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/design/icons";
import { Icon } from "@/components/design/components";
import { useTheme } from "@/lib/themeContext";
import { useShoppingList } from "@/lib/shoppingListContext";
import { usePriceAlerts } from "@/lib/priceAlertsContext";
import { saveSupermarkets, useSavedSupermarkets } from "@/lib/supermarketFilter";
import { SUPERMARKETS_DESIGN, SAN_JUAN_SUPERMARKETS } from "@/lib/categoryMap";

// Tab icons — SVGs inline desde app.jsx del diseño de referencia
function IconResults() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M4 6h16M4 12h10M4 18h7" />
    </svg>
  );
}

function IconProduct() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8l9-5 9 5-9 5z" />
      <path d="M3 8v8l9 5 9-5V8" />
    </svg>
  );
}

function IconDashboard() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M17 7h4v4" />
    </svg>
  );
}

const TABS = [
  { label: "Buscar",     href: "/",           icon: <Icon.search width={14} height={14} /> },
  { label: "Resultados", href: "/resultados",  icon: <IconResults /> },
  { label: "Producto",   href: "/producto",    icon: <IconProduct /> },
  { label: "Economía",   href: "/economia",    icon: <IconDashboard /> },
];

const ALL_SUPERMARKETS_ID = "__all__";
const SAN_JUAN_ID = "__san_juan__";
const SAN_JUAN_IDS = SAN_JUAN_SUPERMARKETS.map((s) => s.id);
const SUPERMARKETS = [
  { id: ALL_SUPERMARKETS_ID, label: "Todos" },
  { id: SAN_JUAN_ID, label: "📍 Solo San Juan" },
  ...SUPERMARKETS_DESIGN.map((s) => ({ id: s.id, label: s.name })),
];

export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const { theme, toggleTheme }         = useTheme();
  const { items: cartItems }           = useShoppingList();
  const itemCount = cartItems.reduce((sum, i) => sum + i.qty, 0);
  const { alerts }                     = usePriceAlerts();
  const [smOpen, setSmOpen]            = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // El filtro de supermercado vive en la URL de /resultados (?super=id), no en
  // estado local — así el selector del header siempre refleja el filtro real
  // en vez de tener su propia copia desincronizada (mismo tipo de bug que el
  // de los gráficos con ancho fantasma: dos fuentes de verdad que divergen).
  const isOnResultados = pathname.startsWith("/resultados");
  const savedSupermarkets = useSavedSupermarkets();
  // En /resultados manda la URL; en el resto de las páginas, el filtro guardado.
  const activeSupermarkets = isOnResultados ? searchParams.getAll("super") : savedSupermarkets;
  const isSanJuan =
    activeSupermarkets.length === SAN_JUAN_IDS.length &&
    SAN_JUAN_IDS.every((id) => activeSupermarkets.includes(id));
  const supermarketId = isSanJuan
    ? SAN_JUAN_ID
    : activeSupermarkets.length === 1 ? (activeSupermarkets[0] ?? ALL_SUPERMARKETS_ID) : ALL_SUPERMARKETS_ID;
  const supermarketLabel = activeSupermarkets.length > 1 && !isSanJuan
    ? `${activeSupermarkets.length} supermercados`
    : SUPERMARKETS.find((s) => s.id === supermarketId)?.label ?? "Todos";

  const handleSupermarketSelect = (id: string) => {
    // Fuera de /resultados, elegir "Todos" solo limpia el filtro guardado: no navegamos.
    if (!isOnResultados && id === ALL_SUPERMARKETS_ID) {
      saveSupermarkets([]);
      return;
    }
    const params = new URLSearchParams(isOnResultados ? searchParams.toString() : undefined);
    params.delete("super");
    if (id === SAN_JUAN_ID) SAN_JUAN_IDS.forEach((sm) => params.append("super", sm));
    else if (id !== ALL_SUPERMARKETS_ID) params.append("super", id);
    saveSupermarkets(params.getAll("super"));
    router.push(`/resultados?${params.toString()}`);
  };

  return (
    <header className="topbar">
      <Link href="/" style={{ textDecoration: "none" }}>
        <Logo size={16} />
      </Link>

      <nav className="tabs">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tab${isActive(tab.href) ? " active" : ""}`}
          >
            <span className="tab-icon">{tab.icon}</span>
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="topbar-spacer" />

      <div className="tb-control">
        <Dropdown
          open={smOpen}
          setOpen={setSmOpen}
          label={<>Supermercados: <strong>{supermarketLabel}</strong> <Icon.chevron /></>}
          items={SUPERMARKETS}
          selected={supermarketId}
          onSelect={handleSupermarketSelect}
        />
        <Link href="/changuito" className="tb-pill" style={{ position: "relative", display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          <Icon.cart />
          {itemCount > 0 && (
            <span style={{
              position: "absolute", top: -5, right: -5,
              background: "var(--primary)", color: "white",
              borderRadius: "50%", minWidth: 16, height: 16, padding: "0 3px",
              fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {itemCount}
            </span>
          )}
        </Link>
        <Link href="/alertas" className="tb-pill" style={{ position: "relative", display: "inline-flex", alignItems: "center", textDecoration: "none" }}>
          <Icon.bell />
          {alerts.length > 0 && (
            <span style={{
              position: "absolute", top: -5, right: -5,
              background: "var(--primary)", color: "white",
              borderRadius: "50%", minWidth: 16, height: 16, padding: "0 3px",
              fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              {alerts.length}
            </span>
          )}
        </Link>
        <button
          className="tb-pill"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
          style={{ cursor: "pointer" }}
        >
          {theme === "dark" ? <Icon.sun /> : <Icon.moon />}
        </button>
      </div>
    </header>
  );
}

function Dropdown({
  open, setOpen, label, items, selected, onSelect,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  label: React.ReactNode;
  items: { id: string; label: string }[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ position: "relative" }}>
      <button
        className="tb-pill"
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
      >
        {label}
      </button>

      {open && (
        <>
          <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
          <div style={{
            position: "absolute", right: 0, top: "calc(100% + 6px)",
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 10, boxShadow: "var(--shadow-pop)",
            minWidth: 180, zIndex: 50, padding: 4,
          }}>
            {items.map((it) => (
              <button
                key={it.id}
                onClick={() => { onSelect(it.id); setOpen(false); }}
                style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  width: "100%", padding: "8px 10px",
                  background: selected === it.id ? "var(--primary-tint)" : "none",
                  border: 0, borderRadius: 6, cursor: "pointer",
                  fontSize: 13,
                  color: selected === it.id ? "var(--primary)" : "var(--fg)",
                  fontWeight: selected === it.id ? 600 : 400,
                }}
              >
                {it.label}
                {selected === it.id && <span style={{ color: "var(--primary)", fontSize: 12 }}>✓</span>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
