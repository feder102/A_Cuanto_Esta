"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueries } from "@tanstack/react-query";
import { getProductCount } from "@/lib/api";
import { CATEGORIES_DESIGN } from "@/lib/categoryMap";
import { resultsUrl } from "@/lib/supermarketFilter";
import { CatIcon } from "@/components/design/icons";
import { Icon, fmtPct } from "@/components/design/components";

const TRENDING = [
  { q: "Aceite girasol",    change: 0.185,  dir: "up"   },
  { q: "Leche entera",      change: -0.032, dir: "down" },
  { q: "Yerba mate",        change: 0.074,  dir: "up"   },
  { q: "Arroz largo",       change: 0.091,  dir: "up"   },
  { q: "Pan lactal",        change: 0.052,  dir: "up"   },
  { q: "Fideos spaghetti",  change: -0.018, dir: "down" },
];

export default function ProductoIndexPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const categoryQueries = useQueries({
    queries: CATEGORIES_DESIGN.map((cat) => ({
      queryKey: ["productCount", cat.id],
      queryFn: () => getProductCount(cat.backendId),
      staleTime: 10 * 60 * 1000,
    })),
  });

  const submit = (q?: string) => {
    const term = (q ?? query).trim();
    if (term) router.push(resultsUrl({ q: term }));
  };

  return (
    <div className="page" style={{ paddingTop: 56 }}>
      <div style={{ maxWidth: 640, margin: "0 auto 40px" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Buscá un producto</h1>
          <p style={{ color: "var(--fg-3)", fontSize: 14 }}>
            Elegí un producto para ver sus precios y su historial en los 9 supermercados.
          </p>
        </div>

        <div className="search lg" style={{ position: "relative", marginBottom: 20 }}>
          <span className="search-icon"><Icon.search width={22} height={22} /></span>
          <input
            placeholder="Buscá un producto, marca o código de barras…"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          />
          <button
            className="btn"
            style={{ position: "absolute", right: 8, top: 8, padding: "12px 18px" }}
            onClick={() => submit()}
          >
            Buscar <Icon.arrowR />
          </button>
        </div>

        {/* Trending chips */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 12, color: "var(--fg-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4 }}>
            <Icon.trend style={{ verticalAlign: -2, marginRight: 4 }} />
            Tendencias
          </span>
          {TRENDING.map((t) => (
            <button key={t.q} className="chip" onClick={() => submit(t.q)}>
              {t.q}
              <span style={{ color: t.dir === "up" ? "var(--bad)" : "var(--good)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}>
                {fmtPct(t.change)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Categories grid */}
      <div className="section-head">
        <h2>O explorá por categoría</h2>
        <span className="subtle"><span className="mono">12</span> categorías</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {CATEGORIES_DESIGN.map((cat, i) => {
          const count = categoryQueries[i]?.data?.count;
          return (
            <button key={cat.id} className="card"
              onClick={() => router.push(resultsUrl({ categoria: cat.id }))}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "12px 14px", background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)", textAlign: "left", cursor: "pointer",
                transition: "border-color .15s, box-shadow .15s",
              }}
              onMouseEnter={(e) => { const el = e.currentTarget; el.style.borderColor = "var(--border-strong)"; el.style.boxShadow = "var(--shadow-2)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget; el.style.borderColor = "var(--border)"; el.style.boxShadow = "var(--shadow-1)"; }}
            >
              <div style={{ flexShrink: 0 }}>
                <CatIcon id={cat.id} size={64} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{cat.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>
                  {count != null ? `${count.toLocaleString("es-AR")} productos` : "Cargando…"}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
