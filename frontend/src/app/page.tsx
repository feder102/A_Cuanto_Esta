"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { motion } from "framer-motion";
import { getProductCount, getEconomicContext, getProductFacets, getPriceIndex, getTopMovers } from "@/lib/api";
import { CATEGORIES_DESIGN } from "@/lib/categoryMap";
import { resultsUrl } from "@/lib/supermarketFilter";
import { CatIcon } from "@/components/design/icons";
import { VarBadge, fmtPrice, fmtPct, Icon } from "@/components/design/components";
import type { EconomicContext } from "@/types";

// EconomicContextSchema ya coerciona los campos numéricos (ver src/types/index.ts) —
// acá solo se normalizan los porcentajes de fracción (0.021 -> 2,1%) para fmtPct().
function parseEco(eco: EconomicContext) {
  return {
    inflationMonth:       eco.inflation_monthly != null ? eco.inflation_monthly / 100 : null,
    inflationMonthChange: eco.inflation_monthly_change != null ? eco.inflation_monthly_change / 100 : null,
    inflationYearly:      eco.inflation_yearly != null ? eco.inflation_yearly / 100 : null,
    inflationYTD:         eco.inflation_ytd != null ? eco.inflation_ytd / 100 : null,
    dollarBlue:           eco.dollar_blue,
    dollarBlueChange:     eco.dollar_blue_change != null ? eco.dollar_blue_change / 100 : null,
    dollarOficial:        eco.dollar_oficial,
    dollarOficialChange:  eco.dollar_oficial_change != null ? eco.dollar_oficial_change / 100 : null,
    riskCountry:          eco.risk_country,
    riskCountryChange:    eco.risk_country_change != null ? eco.risk_country_change / 100 : null,
    asOfDate:             eco.last_updated
      ? new Date(eco.last_updated).toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })
      : "–",
  };
}

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);

  const { data: ecoData, isError: ecoIsError } = useQuery({
    queryKey: ["economic"],
    queryFn: getEconomicContext,
    staleTime: 5 * 60 * 1000,
  });

  const { data: countData } = useQuery({
    queryKey: ["productCount"],
    queryFn: () => getProductCount(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: categoryFacets } = useQuery({
    queryKey: ["productFacets"],
    queryFn: () => getProductFacets(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: priceIndex } = useQuery({
    queryKey: ["priceIndex"],
    queryFn: () => getPriceIndex(7),
    staleTime: 10 * 60 * 1000,
  });

  const { data: topMovers = [] } = useQuery({
    queryKey: ["topMovers"],
    queryFn: () => getTopMovers(7, 6),
    staleTime: 10 * 60 * 1000,
  });

  const totalCount = countData?.count ?? null;
  const eco = ecoData ? parseEco(ecoData) : null;

  const submit = (q?: string) => {
    const term = q ?? query;
    if (term.trim()) router.push(resultsUrl({ q: term.trim() }));
  };

  return (
    <div className="page" style={{ paddingTop: 40 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 40, alignItems: "start" }}>

        {/* LEFT — search + categories */}
        <div>
          {/* Hero */}
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <div style={{ display: "inline-flex", gap: 6, alignItems: "center", color: "var(--fg-3)", fontSize: 12, marginBottom: 14, padding: "4px 12px", background: "var(--bg-2)", borderRadius: 999, border: "1px solid var(--border)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--good)", display: "inline-block" }} />
              Precios actualizados hoy
              {eco?.asOfDate && <> · <span className="mono">{eco.asOfDate}</span></>}
            </div>
            <h1 style={{ fontSize: 44, marginBottom: 8, letterSpacing: "-0.025em" }}>
              ¿A cuánto está?
            </h1>
            <p style={{ color: "var(--fg-2)", fontSize: 16, margin: 0 }}>
              Comparamos{" "}
              <strong className="mono">
                {totalCount !== null ? totalCount.toLocaleString("es-AR") : "miles de"}
              </strong>{" "}
              productos entre <strong className="mono">9</strong> supermercados de Argentina.
            </p>
          </div>

          {/* Search box */}
          <div style={{ position: "relative", marginBottom: 32 }}>
            <div className="search lg">
              <span className="search-icon"><Icon.search width={22} height={22} /></span>
              <input
                placeholder="Buscá un producto, marca o código de barras…"
                value={query}
                onFocus={() => setFocused(true)}
                onBlur={() => setTimeout(() => setFocused(false), 150)}
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

            {/* Dropdown de tendencias al enfocar vacío */}
            {focused && !query && topMovers.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)", boxShadow: "var(--shadow-pop)",
                overflow: "hidden", zIndex: 10,
              }}>
                <div style={{ padding: "10px 16px", fontSize: 11, color: "var(--fg-3)", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600, borderBottom: "1px solid var(--border)" }}>
                  Mayor variación de precio (7 días)
                </div>
                {topMovers.map((t, i) => (
                  <button key={t.product_id}
                    onMouseDown={(e) => { e.preventDefault(); submit(t.product_name); }}
                    style={{
                      display: "flex", width: "100%", alignItems: "center", gap: 12,
                      padding: "11px 16px", background: "none", border: 0, textAlign: "left",
                      borderTop: i ? "1px solid var(--border)" : "0", cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "var(--bg-2)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "none"; }}
                  >
                    <Icon.search style={{ color: "var(--fg-3)" }} />
                    <span style={{ flex: 1, fontSize: 14 }}>{t.product_name}</span>
                    <span style={{ color: t.change_pct >= 0 ? "var(--bad)" : "var(--good)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}>
                      {fmtPct(t.change_pct)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Trending chips */}
          {topMovers.length > 0 && (
            <div style={{ display: "flex", gap: 8, marginBottom: 48, flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--fg-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginRight: 4 }}>
                <Icon.trend style={{ verticalAlign: -2, marginRight: 4 }} />
                Mayor variación
              </span>
              {topMovers.map((t) => (
                <button key={t.product_id} className="chip" onClick={() => submit(t.product_name)}>
                  {t.product_name}
                  <span style={{ color: t.change_pct >= 0 ? "var(--bad)" : "var(--good)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600 }}>
                    {fmtPct(t.change_pct)}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Categories grid */}
          <div className="section-head">
            <h2>Explorar por categoría</h2>
            <span className="subtle">
              <span className="mono">{CATEGORIES_DESIGN.length}</span> categorías
              {totalCount !== null && (
                <> · <span className="mono">{totalCount.toLocaleString("es-AR")}</span> productos</>
              )}
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 10 }}>
            {CATEGORIES_DESIGN.map((cat) => {
              const count = categoryFacets?.[cat.backendId];
              return (
                <motion.button
                  key={cat.id}
                  className="card"
                  onClick={() => router.push(resultsUrl({ categoria: cat.id }))}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
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
                    <CatIcon id={cat.id} size={54} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3 }}>{cat.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--fg-3)", marginTop: 2 }}>
                      {count != null ? `${count.toLocaleString("es-AR")} productos` : "Cargando…"}
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* RIGHT — economic sidebar */}
        <div className="col" style={{ gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <h3 style={{ fontSize: 13 }}>Hoy en Argentina</h3>
              <Link href="/economia" className="btn ghost" style={{ fontSize: 11.5 }}>
                Ver todo <Icon.arrowR />
              </Link>
            </div>

            {eco ? (
              <>
                {eco.inflationMonth != null && (
                  <>
                    <EcoMiniCard
                      label="Inflación mensual"
                      source="INDEC · último dato"
                      value={
                        <><span className="mono">{(eco.inflationMonth * 100).toFixed(1).replace(".", ",")}</span>
                        <span style={{ fontSize: "0.5em", color: "var(--fg-3)" }}>%</span></>
                      }
                      delta={eco.inflationMonthChange}
                      deltaLabel="vs. mes anterior"
                    />
                    <Divider />
                  </>
                )}
                {eco.dollarBlue != null && (
                  <>
                    <EcoMiniCard
                      label="Dólar blue"
                      source="Promedio paralelo"
                      value={
                        <><span style={{ fontSize: "0.55em", color: "var(--fg-3)", verticalAlign: "0.4em", marginRight: 2 }}>$</span>
                        <span className="mono">{fmtPrice(eco.dollarBlue)}</span></>
                      }
                      delta={eco.dollarBlueChange}
                      deltaLabel="últimas 24 hs"
                    />
                    <Divider />
                  </>
                )}
                {eco.dollarOficial != null && (
                  <>
                    <EcoMiniCard
                      label="Dólar oficial"
                      source="BCRA"
                      value={
                        <><span style={{ fontSize: "0.55em", color: "var(--fg-3)", verticalAlign: "0.4em", marginRight: 2 }}>$</span>
                        <span className="mono">{fmtPrice(eco.dollarOficial)}</span></>
                      }
                      delta={eco.dollarOficialChange}
                      deltaLabel="últimas 24 hs"
                    />
                    {priceIndex?.avg_change_pct != null && <Divider />}
                    {priceIndex?.avg_change_pct != null && (
                      <EcoMiniCard
                        label="Variación semanal"
                        source="Índice A Cuanto Está"
                        value={
                          <span className="mono" style={{ color: priceIndex.avg_change_pct > 0 ? "var(--bad)" : "var(--good)" }}>
                            {fmtPct(priceIndex.avg_change_pct)}
                          </span>
                        }
                        delta={priceIndex.avg_change_pct}
                        deltaLabel={`canasta de ${priceIndex.basket_size.toLocaleString("es-AR")} productos`}
                        hideArrow
                      />
                    )}
                  </>
                )}
                {eco.riskCountry != null && (
                  <>
                    <Divider />
                    <EcoMiniCard
                      label="Riesgo país"
                      source="JP Morgan EMBI+"
                      value={
                        <><span className="mono">{fmtPrice(eco.riskCountry)}</span>
                        <span style={{ fontSize: "0.5em", color: "var(--fg-3)", marginLeft: 4 }}>pb</span></>
                      }
                      delta={eco.riskCountryChange}
                      deltaLabel="últimas 24 hs"
                    />
                  </>
                )}
              </>
            ) : ecoIsError ? (
              <div style={{ color: "var(--bad)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
                No se pudieron cargar los indicadores económicos.
              </div>
            ) : (
              <div style={{ color: "var(--fg-4)", fontSize: 13, textAlign: "center", padding: "16px 0" }}>
                Cargando indicadores…
              </div>
            )}
          </div>

          {eco?.inflationYTD != null && (
            <div className="card" style={{ padding: 16, background: "var(--warn-tint)", borderColor: "var(--warn)" }}>
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: "var(--warn)", color: "white", display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <Icon.alert width={16} height={16} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--fg)" }}>
                    Inflación acumulada {new Date().getFullYear()}
                  </div>
                  <div style={{ marginTop: 8, display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span className="mono" style={{ fontSize: 26, fontWeight: 700, color: "var(--fg)" }}>
                      {fmtPct(eco.inflationYTD, { sign: false })}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--fg-2)" }}>en lo que va del año</span>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--fg-2)", lineHeight: 1.4 }}>
                    Últimos 12 meses: <strong className="mono">{eco.inflationYearly != null ? fmtPct(eco.inflationYearly, { sign: false }) : "– %"}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function EcoMiniCard({ label, source, value, delta, deltaLabel, hideArrow }: {
  label: string;
  source: string;
  value: React.ReactNode;
  delta?: number | null;
  deltaLabel?: string;
  hideArrow?: boolean;
}) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "var(--fg-2)", fontWeight: 600 }}>{label}</span>
        <span style={{ fontSize: 10.5, color: "var(--fg-4)" }}>{source}</span>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
        <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.05 }}>{value}</div>
        {!hideArrow && delta != null && <VarBadge value={delta} />}
      </div>
      {deltaLabel && <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 3 }}>{deltaLabel}</div>}
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: "var(--border)", margin: "14px 0" }} />;
}
