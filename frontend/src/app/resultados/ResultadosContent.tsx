"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { searchProducts, getProductsList, getProductFacets } from "@/lib/api";
import type { SortOrder } from "@/lib/api";
import type { ProductCategory, ProductList, ProductWithPrices } from "@/types";
import { CATEGORIES_DESIGN, DESIGN_TO_BACKEND, SUPERMARKETS_DESIGN as SUPERMARKETS_LIST, SAN_JUAN_SUPERMARKETS } from "@/lib/categoryMap";
import { Price, SMSwatch, ImagePlaceholder, Icon, fmtPrice } from "@/components/design/components";
import { computeUnitPrice } from "@/lib/unitPrice";
import { saveSupermarkets, getSavedSupermarkets, resultsUrl } from "@/lib/supermarketFilter";
import { useShoppingList } from "@/lib/shoppingListContext";

export default function ResultadosContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const q = searchParams.get("q") ?? "";
  const categoria = searchParams.get("categoria") ?? "";
  // El filtro de supermercado vive en la URL (?super=id, uno o varios), no en
  // estado local — así el header (que también lee/escribe ?super= para su
  // selector rápido) y esta página siempre están de acuerdo sobre el filtro activo.
  const smFilterArray = searchParams.getAll("super");
  const smFilter = new Set(smFilterArray);
  const [sort, setSort] = useState<SortOrder>("relevance");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [committedMin, setCommittedMin] = useState<string>("");
  const [committedMax, setCommittedMax] = useState<string>("");
  const [variationFilter, setVariationFilter] = useState<"down" | "low" | "high" | null>(null);
  const [catOpen, setCatOpen] = useState(false);
  const [smOpen, setSmOpen] = useState(true);
  const [priceOpen, setPriceOpen] = useState(false);
  const [varOpen, setVarOpen] = useState(false);

  // Si se llegó a /resultados sin ?super= (link directo, navegación), se restaura
  // el filtro guardado. Al deseleccionar todo se guarda vacío, así no vuelve solo.
  useEffect(() => {
    if (smFilterArray.length > 0) return;
    const saved = getSavedSupermarkets();
    if (saved.length === 0) return;
    const params = new URLSearchParams(searchParams.toString());
    for (const sm of saved) params.append("super", sm);
    router.replace(`/resultados?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const hasQ = Boolean(q && q.trim());
  const backendCat = categoria ? (DESIGN_TO_BACKEND[categoria] as ProductCategory) : undefined;

  const LIMIT = 30;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const skip = (page - 1) * LIMIT;
  const topRef = useRef<HTMLDivElement>(null);

  // Debounce: aplica price_min/price_max al query 500ms después del último cambio
  useEffect(() => {
    const t = setTimeout(() => {
      setCommittedMin(priceMin);
      setCommittedMax(priceMax);
    }, 500);
    return () => clearTimeout(t);
  }, [priceMin, priceMax]);

  const { data: productList, isLoading } = useQuery<ProductList>({
    queryKey: ["products", q, categoria, page, sort, committedMin, committedMax, variationFilter, smFilterArray.join(",")],
    queryFn: () =>
      hasQ
        ? searchProducts(
            q, backendCat, skip, LIMIT, sort,
            committedMin ? parseFloat(committedMin) : undefined,
            committedMax ? parseFloat(committedMax) : undefined,
            variationFilter ?? undefined,
            smFilterArray.length > 0 ? smFilterArray : undefined,
          )
        : backendCat
        ? getProductsList(backendCat, LIMIT, skip, sort, smFilterArray.length > 0 ? smFilterArray : undefined)
        : Promise.resolve({ items: [], total: 0, skip, limit: LIMIT, supermarket_counts: {}, variation_counts: {} }),
    enabled: hasQ || Boolean(backendCat),
    staleTime: 5 * 60 * 1000,
  });

  const { data: facets } = useQuery<Record<string, number>>({
    queryKey: ["facets", q],
    queryFn: () => getProductFacets(q || undefined),
    staleTime: 5 * 60 * 1000,
  });

  const products = productList?.items ?? [];
  const total = productList?.total ?? 0;
  const totalPages = total > 0 ? Math.ceil(total / LIMIT) : 0;

  const buildResultsUrl = (overrides: { page?: number; superSet?: Set<string> } = {}) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (categoria) params.set("categoria", categoria);
    for (const sm of Array.from(overrides.superSet ?? smFilter)) params.append("super", sm);
    const targetPage = overrides.page ?? page;
    if (targetPage > 1) params.set("page", String(targetPage));
    return `/resultados?${params.toString()}`;
  };

  const goToPage = (newPage: number) => {
    router.push(buildResultsUrl({ page: newPage }));
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const changeSort = (newSort: SortOrder) => {
    setSort(newSort);
    if (page !== 1) goToPage(1);
  };

  const toggleSm = (id: string) => {
    const next = new Set(smFilter);
    if (next.has(id)) next.delete(id); else next.add(id);
    saveSupermarkets(next);
    router.push(buildResultsUrl({ page: 1, superSet: next }));
  };

  const sanJuanIds = SAN_JUAN_SUPERMARKETS.map((s) => s.id);
  const sanJuanActive =
    smFilter.size === sanJuanIds.length && sanJuanIds.every((id) => smFilter.has(id));
  const toggleSanJuan = () => {
    const next = sanJuanActive ? new Set<string>() : new Set(sanJuanIds);
    saveSupermarkets(next);
    router.push(buildResultsUrl({ page: 1, superSet: next }));
  };

  const applyPriceChip = (min: string, max: string) => {
    setPriceMin(min); setPriceMax(max);
    setCommittedMin(min); setCommittedMax(max);
    if (page !== 1) goToPage(1);
  };

  const toggleVariation = (val: "down" | "low" | "high") => {
    const next = variationFilter === val ? null : val;
    setVariationFilter(next);
    if (page !== 1) goToPage(1);
  };

  const catLabel = categoria
    ? (CATEGORIES_DESIGN.find((c) => c.id === categoria)?.name ?? categoria)
    : null;

  return (
    <div className="page page-wide">
      {/* Breadcrumb + header */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, color: "var(--fg-3)", marginBottom: 6 }}>
          <Link href="/" style={{ cursor: "pointer" }}>Inicio</Link>
          {catLabel && <><span style={{ margin: "0 6px" }}>›</span><span>{catLabel}</span></>}
          {q && <><span style={{ margin: "0 6px" }}>›</span><span style={{ color: "var(--fg)" }}>&quot;{q}&quot;</span></>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24, justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 24 }}>
              {q ? `Resultados para "${q}"` : catLabel ?? "Productos"}
            </h1>
            <div style={{ color: "var(--fg-3)", fontSize: 13, marginTop: 4 }}>
              {totalPages > 1 && (
                <>Página <span className="mono">{page}</span> de <span className="mono">{totalPages}</span> · </>
              )}
              <span className="mono">{total > 0 ? total : products.length}</span> productos · monitoreados en <span className="mono">9</span> supermercados
            </div>
          </div>
          {/* Search inline */}
          <div className="search" style={{ maxWidth: 360 }}>
            <span className="search-icon"><Icon.search /></span>
            <input
              defaultValue={q}
              placeholder="Nueva búsqueda…"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) router.push(resultsUrl({ q: val }));
                }
              }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "flex-start", gap: 24 }}>
        {/* SIDEBAR — scroll independiente. Las secciones colapsables garantizan que
            en el estado default (~340px) no haya scrollbar ni captura accidental. */}
        <div style={{ width: 260, flexShrink: 0, position: "sticky", top: 76 }}>
        <div className="col" style={{ gap: 18, maxHeight: "calc(100vh - 96px)", overflowY: "auto", overscrollBehavior: "contain", paddingRight: 2, paddingBottom: 8 }}>
          {/* Categorías — colapsable */}
          <div className="card" style={{ padding: 16 }}>
            <button
              onClick={() => setCatOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", width: "100%", background: "none", border: 0, padding: 0, cursor: "pointer", marginBottom: catOpen ? 12 : 0 }}
            >
              <h4 style={{ flex: 1, textAlign: "left", margin: 0 }}>Categoría</h4>
              {catLabel && !catOpen && (
                <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, marginRight: 8, maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {catLabel}
                </span>
              )}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ flexShrink: 0, color: "var(--fg-3)", transform: catOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
            {catOpen && (
              <div className="col" style={{ gap: 0 }}>
                <FilterRow
                  label="Todas las categorías"
                  selected={!categoria}
                  count={facets ? Object.values(facets).reduce((a, b) => a + b, 0) : undefined}
                  onClick={() => { router.push(resultsUrl({ q })); setCatOpen(false); }}
                />
                {CATEGORIES_DESIGN.map((c) => {
                  const backendId = DESIGN_TO_BACKEND[c.id] as string | undefined;
                  return (
                    <FilterRow key={c.id}
                      selected={categoria === c.id}
                      onClick={() => { router.push(resultsUrl({ q, categoria: c.id })); setCatOpen(false); }}
                      label={c.name}
                      count={backendId && facets ? facets[backendId] : undefined}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Supermercados — colapsable */}
          <div className="card" style={{ padding: 16 }}>
            <button
              onClick={() => setSmOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", width: "100%", background: "none", border: 0, padding: 0, cursor: "pointer", marginBottom: smOpen ? 12 : 0 }}
            >
              <h4 style={{ flex: 1, textAlign: "left", margin: 0 }}>Supermercado</h4>
              {smFilter.size > 0 && !smOpen && (
                <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, marginRight: 8 }}>
                  {smFilter.size} seleccionado{smFilter.size > 1 ? "s" : ""}
                </span>
              )}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ flexShrink: 0, color: "var(--fg-3)", transform: smOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
            {smOpen && (
              <div style={{ marginBottom: 10 }}>
                <button
                  onClick={toggleSanJuan}
                  aria-pressed={sanJuanActive}
                  title={SAN_JUAN_SUPERMARKETS.map((s) => `${SUPERMARKETS_LIST.find((x) => x.id === s.id)?.name}: ${s.priceNote}`).join("\n")}
                  style={{
                    width: "100%", padding: "7px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600,
                    border: "1px solid var(--primary)",
                    background: sanJuanActive ? "var(--primary)" : "transparent",
                    color: sanJuanActive ? "#fff" : "var(--primary)",
                  }}
                >
                  📍 Solo San Juan
                </button>
                {sanJuanActive && (
                  <div style={{ fontSize: 11, color: "var(--fg-3)", marginTop: 6 }}>
                    Precios de San Juan (CP 5400) donde hay sucursal; Vea y Átomo usan precio online.
                  </div>
                )}
              </div>
            )}
            {smOpen && (
              <div className="col" style={{ gap: 0 }}>
                {SUPERMARKETS_LIST.map((s) => {
                  const smCount = productList?.supermarket_counts?.[s.id];
                  return (
                    <label key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "5px 0", cursor: "pointer", fontSize: 13 }}>
                      <input type="checkbox"
                        checked={smFilter.has(s.id)}
                        onChange={() => toggleSm(s.id)}
                        style={{ accentColor: "var(--primary)" }}
                      />
                      <SMSwatch sm={s.id} />
                      <span style={{ flex: 1 }}>{s.name}</span>
                      {smCount !== undefined && (
                        <span className="mono" style={{ fontSize: 11, color: "var(--fg-3)" }}>{smCount}</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Rango de precio — colapsable */}
          <div className="card" style={{ padding: 16 }}>
            <button
              onClick={() => setPriceOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", width: "100%", background: "none", border: 0, padding: 0, cursor: "pointer", marginBottom: priceOpen ? 12 : 0 }}
            >
              <h4 style={{ flex: 1, textAlign: "left", margin: 0 }}>Rango de precio</h4>
              {(committedMin || committedMax) && !priceOpen && (
                <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, marginRight: 8 }}>
                  {committedMin ? `$${committedMin}` : ""}
                  {committedMin && committedMax ? " – " : ""}
                  {committedMax ? `$${committedMax}` : committedMin ? "+" : ""}
                </span>
              )}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ flexShrink: 0, color: "var(--fg-3)", transform: priceOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
            {priceOpen && (
              <>
                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <PriceInput value={priceMin} onChange={setPriceMin} placeholder="Mín" />
                  <PriceInput value={priceMax} onChange={setPriceMax} placeholder="Máx" />
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  <button className="chip" onClick={() => applyPriceChip("", "1500")}>menos de $1.500</button>
                  <button className="chip" onClick={() => applyPriceChip("1500", "3000")}>$1.500 – $3.000</button>
                  <button className="chip" onClick={() => applyPriceChip("3000", "")}>más de $3.000</button>
                </div>
              </>
            )}
          </div>

          {/* Variación 30 días — colapsable */}
          <div className="card" style={{ padding: 16 }}>
            <button
              onClick={() => setVarOpen(o => !o)}
              style={{ display: "flex", alignItems: "center", width: "100%", background: "none", border: 0, padding: 0, cursor: "pointer", marginBottom: varOpen ? 12 : 0 }}
            >
              <h4 style={{ flex: 1, textAlign: "left", margin: 0 }}>Variación 30 días</h4>
              {variationFilter && !varOpen && (
                <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600, marginRight: 8 }}>
                  {variationFilter === "down" ? "Bajaron" : variationFilter === "low" ? "Poco (<5%)" : "Mucho (>10%)"}
                </span>
              )}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                style={{ flexShrink: 0, color: "var(--fg-3)", transform: varOpen ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                <path d="m9 18 6-6-6-6"/>
              </svg>
            </button>
            {varOpen && (
              <div className="col" style={{ gap: 0 }}>
                <FilterRow
                  label="Bajaron de precio"
                  count={productList?.variation_counts?.["down"] ?? 0}
                  selected={variationFilter === "down"}
                  onClick={() => toggleVariation("down")}
                />
                <FilterRow
                  label="Subieron poco (<5%)"
                  count={productList?.variation_counts?.["low"] ?? 0}
                  selected={variationFilter === "low"}
                  onClick={() => toggleVariation("low")}
                />
                <FilterRow
                  label="Subieron mucho (>10%)"
                  count={productList?.variation_counts?.["high"] ?? 0}
                  selected={variationFilter === "high"}
                  onClick={() => toggleVariation("high")}
                />
              </div>
            )}
          </div>

          <button className="btn secondary" style={{ width: "100%", justifyContent: "center" }}
            onClick={() => {
              setPriceMin(""); setPriceMax("");
              setCommittedMin(""); setCommittedMax("");
              setVariationFilter(null);
              router.push(buildResultsUrl({ page: 1, superSet: new Set() }));
            }}>
            Limpiar filtros
          </button>
        </div>
        </div>{/* /sidebar */}

        {/* RESULTS */}
        <div ref={topRef} className="col" style={{ flex: 1, gap: 16 }}>
          {/* Sort bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
              {catLabel && (
                <button className="chip active"
                  onClick={() => router.push(resultsUrl({ q }))}>
                  {catLabel} <Icon.close style={{ marginLeft: 2 }} />
                </button>
              )}
              {q && (
                <button className="chip active"
                  onClick={() => router.push(resultsUrl({ categoria }))}>
                  &quot;{q}&quot; <Icon.close style={{ marginLeft: 2 }} />
                </button>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "var(--fg-3)" }}>Ordenar por</span>
              <button className={`chip${sort === "relevance" ? " active" : ""}`} onClick={() => changeSort("relevance")}>Relevancia</button>
              <button className={`chip${sort === "price_asc" ? " active" : ""}`} onClick={() => changeSort("price_asc")}>Precio ↑</button>
              <button className={`chip${sort === "price_desc" ? " active" : ""}`} onClick={() => changeSort("price_desc")}>Precio ↓</button>
              <button className={`chip${sort === "variation" ? " active" : ""}`} onClick={() => changeSort("variation")}>Variación</button>
            </div>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="col" style={{ gap: 12 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} className="card" style={{ padding: 16, height: 112 }}>
                  <div style={{ height: "100%", background: "var(--bg-2)", borderRadius: 8, animation: "pulse 1.5s infinite" }} />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!isLoading && products.length === 0 && (hasQ || Boolean(backendCat)) && (
            <div style={{ padding: "64px 0", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <p style={{ color: "var(--fg-3)" }}>
                No encontramos productos para{" "}
                {q ? <strong>&quot;{q}&quot;</strong> : <strong>{catLabel}</strong>}
              </p>
              <Link href="/" style={{ display: "inline-block", marginTop: 12, fontSize: 13, color: "var(--primary)" }}>
                Volver al inicio
              </Link>
            </div>
          )}

          {/* No query/category state */}
          {!isLoading && !hasQ && !backendCat && (
            <div style={{ padding: "64px 0", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
              <p style={{ color: "var(--fg-3)" }}>
                Ingresá un producto o seleccioná una categoría para buscar
              </p>
            </div>
          )}

          {/* Product list */}
          {!isLoading && products.length > 0 && (
            <div className="col" style={{ gap: 12 }}>
              {sort === "price_asc" && products[0] ? (
                <>
                  {/* Ordenado por precio ascendente: el primero es realmente el más barato */}
                  <ProductCardFull product={products[0]} isCheapest />
                  {products.slice(1).map((p) => (
                    <ProductCardFull key={p.id} product={p} />
                  ))}
                </>
              ) : (
                products.map((p) => (
                  <ProductCardFull key={p.id} product={p} />
                ))
              )}
              {totalPages > 1 && (
                <Pagination current={page} total={totalPages} onPage={goToPage} />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Product card — el precio actual ya viene incluido en la respuesta de
// /products/search y /products (ver ProductWithPrices), así que no hace
// falta un fetch por card.
// ============================================================================
function ProductCardFull({ product, isCheapest = false }: {
  product: ProductWithPrices;
  isCheapest?: boolean;
}) {
  const router = useRouter();
  const { add } = useShoppingList();
  const addToCart = (e: React.MouseEvent) => { e.stopPropagation(); add(product.id); };

  const lowestPrice = product.lowest_price ?? null;
  const cheapestSm = product.current_prices.reduce((best, cp) =>
    (!best || cp.price < best.price) ? cp : best, null as ProductWithPrices["current_prices"][0] | null);
  const unitPrice = lowestPrice != null ? computeUnitPrice(lowestPrice, product.unit, product.quantity) : null;

  const imageEl = product.image_url
    ? <img src={product.image_url} alt={product.name} style={{ width: isCheapest ? 110 : 80, height: isCheapest ? 110 : 80, objectFit: "contain", borderRadius: 8, border: "1px solid var(--border)", flexShrink: 0 }} />
    : <ImagePlaceholder w={isCheapest ? 110 : 80} h={isCheapest ? 110 : 80} label={product.brand ?? product.name} />;

  if (isCheapest) {
    return (
      <div onClick={() => router.push(`/producto/${product.id}`)}
        className="card"
        style={{
          padding: 18,
          background: "linear-gradient(135deg, var(--good-tint) 0%, transparent 65%)",
          borderColor: "var(--good)",
          cursor: "pointer", position: "relative", overflow: "hidden",
        }}>
        <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 8, alignItems: "center" }}>
          <span className="badge cheapest">⭐ Más barato</span>
          <button className="btn secondary" style={{ padding: "5px 9px", fontSize: 11.5 }} onClick={addToCart} aria-label="Agregar al changuito">
            <Icon.plus /> <Icon.cart />
          </button>
        </div>
        <div style={{ display: "flex", gap: 18 }}>
          {imageEl}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, color: "var(--good)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4 }}>
              {product.brand}
            </div>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>{product.full_name}</h2>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 10 }}>
              {lowestPrice != null && <Price value={lowestPrice} size="lg" />}
              {unitPrice && (
                <span style={{ fontSize: 12, color: "var(--fg-3)" }}>
                  (${fmtPrice(unitPrice.value, { decimals: 2 })} / {unitPrice.label})
                </span>
              )}
            </div>
            {cheapestSm && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "var(--fg-2)" }}>
                más barato en <SMSwatch sm={cheapestSm.supermarket} />
                <strong>{cheapestSm.supermarket.replace("_", " ")}</strong>
                <span style={{ display: "inline-block", width: 4, height: 4, borderRadius: "50%", background: "var(--fg-4)" }} />
                Disponible en <strong className="mono">{product.current_prices.length}/9</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card"
      style={{ padding: 16, cursor: "pointer", transition: "border-color .15s" }}
      onClick={() => router.push(`/producto/${product.id}`)}
      onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border-strong)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
    >
      <div style={{ display: "grid", gridTemplateColumns: "80px 1fr 220px auto", gap: 18, alignItems: "center" }}>
        {imageEl}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, color: "var(--fg-3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 3 }}>
            {product.brand}
          </div>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 6 }}>{product.full_name}</div>
          {product.barcode && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--fg-3)" }}>
              <Icon.barcode />
              <span className="mono">{product.barcode}</span>
            </div>
          )}
        </div>
        <div>
          {lowestPrice != null ? (
            <>
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 6 }}>
                <Price value={lowestPrice} size="lg" />
                {unitPrice && (
                  <span style={{ fontSize: 11.5, color: "var(--fg-3)" }}>
                    (${fmtPrice(unitPrice.value, { decimals: 2 })} / {unitPrice.label})
                  </span>
                )}
              </div>
              {cheapestSm && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--fg-2)" }}>
                  más barato en
                  <SMSwatch sm={cheapestSm.supermarket} size="sm" />
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 13, color: "var(--fg-4)" }}>Sin precio disponible</div>
          )}
        </div>
        <button className="btn secondary" style={{ padding: "8px 10px", fontSize: 12 }} onClick={addToCart} aria-label="Agregar al changuito">
          <Icon.plus /> <Icon.cart />
        </button>
      </div>
    </div>
  );
}

function PriceInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div style={{ position: "relative", flex: 1 }}>
      <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "var(--fg-3)", pointerEvents: "none" }}>$</span>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        min={0}
        style={{ width: "100%", padding: "7px 7px 7px 18px", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, fontFamily: "var(--font-mono)", background: "var(--bg)", color: "var(--fg)", outline: "none", boxSizing: "border-box" }}
      />
    </div>
  );
}

function FilterRow({ label, count, selected, onClick }: { label: string; count?: number; selected?: boolean; onClick?: () => void }) {
  return (
    <button onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "6px 8px", background: selected ? "var(--primary-tint)" : "transparent",
        border: 0, borderRadius: 6, width: "100%", textAlign: "left",
        cursor: "pointer", color: selected ? "var(--primary)" : "var(--fg)",
        fontWeight: selected ? 600 : 400, fontSize: 13,
      }}>
      <span style={{ flex: 1 }}>{label}</span>
      {count !== undefined && (
        <span className="mono" style={{ fontSize: 11, color: selected ? "var(--primary)" : "var(--fg-4)" }}>
          {count.toLocaleString("es-AR")}
        </span>
      )}
    </button>
  );
}

// ============================================================================
// Pagination
// ============================================================================
function getPageRange(current: number, total: number): (number | null)[] {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 3) return [1, 2, 3, null, total];
  if (current >= total - 2) return [1, null, total - 2, total - 1, total];
  return [1, null, current - 1, current, current + 1, null, total];
}

function Pagination({ current, total, onPage }: {
  current: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const pages = getPageRange(current, total);
  return (
    <div style={{ display: "flex", gap: 4, alignItems: "center", justifyContent: "center", marginTop: 8, flexWrap: "wrap" }}>
      <button
        className="btn secondary"
        disabled={current === 1}
        onClick={() => onPage(current - 1)}
        style={{ gap: 4 }}
      >
        ← Anterior
      </button>

      {pages.map((p, i) =>
        p === null ? (
          <span key={`ellipsis-${i}`} style={{ padding: "0 2px", color: "var(--fg-3)", fontSize: 14 }}>…</span>
        ) : (
          <button
            key={p}
            onClick={() => onPage(p)}
            style={{
              minWidth: 34, height: 34, borderRadius: 6, padding: "0 4px",
              background: p === current ? "var(--primary)" : "transparent",
              color: p === current ? "white" : "var(--fg)",
              border: p === current ? "none" : "1px solid var(--border)",
              fontFamily: "var(--font-mono)", fontSize: 13,
              cursor: "pointer", fontWeight: p === current ? 700 : 400,
              transition: "background .12s",
            }}
          >
            {p}
          </button>
        )
      )}

      <button
        className="btn secondary"
        disabled={current === total}
        onClick={() => onPage(current + 1)}
        style={{ gap: 4 }}
      >
        Siguiente →
      </button>
    </div>
  );
}
