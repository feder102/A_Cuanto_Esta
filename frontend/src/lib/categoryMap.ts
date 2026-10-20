import type { ProductCategory } from "@/types";

export interface DesignCategory {
  id: string;
  name: string;
  backendId: ProductCategory;
}

export const CATEGORIES_DESIGN: DesignCategory[] = [
  { id: "almacen",          name: "Almacén",           backendId: "alimentos"         },
  { id: "bebidas",          name: "Bebidas",           backendId: "bebidas"         },
  { id: "lacteos",          name: "Lácteos",          backendId: "lacteos"         },
  { id: "limpieza",         name: "Limpieza",          backendId: "limpieza"        },
  { id: "higiene",          name: "Higiene personal",  backendId: "higiene_personal"},
  { id: "carnes",           name: "Carnes",            backendId: "carnes"          },
  { id: "frutas",           name: "Frutas y verduras", backendId: "frutas_verduras" },
  { id: "panificados",      name: "Panificados",       backendId: "panaderia"       },
  { id: "congelados",       name: "Congelados",        backendId: "congelados"      },
  { id: "snacks",           name: "Snacks",            backendId: "snacks"          },
  { id: "desayuno",         name: "Desayuno",          backendId: "desayuno"        },
  { id: "mascotas",         name: "Mascotas",          backendId: "mascotas"        },
  { id: "bebes",            name: "Bebés",             backendId: "bebes"           },
  { id: "hogar_bazar",      name: "Hogar y Bazar",     backendId: "hogar_bazar"     },
  { id: "farmacia_salud",   name: "Salud y Farmacia",  backendId: "farmacia_salud"  },
  { id: "electro_tecnologia", name: "Electro y Tecno", backendId: "electro_tecnologia" },
  { id: "otros",            name: "Otros",             backendId: "otros"           },
];

export interface DesignSupermarket {
  id: string;
  name: string;
}

// Lista canónica de supermercados (id = valor real del backend). Compartida entre
// el selector rápido del header y el filtro de checkboxes de /resultados para que
// ambos hablen de los mismos supermercados.
export const SUPERMARKETS_DESIGN: DesignSupermarket[] = [
  { id: "coto",       name: "Coto"        },
  { id: "carrefour",  name: "Carrefour"   },
  { id: "disco",      name: "Disco"       },
  { id: "atomo",      name: "Átomo"       },
  { id: "vea",        name: "Vea"         },
  { id: "jumbo",      name: "Jumbo"       },
  { id: "dia",        name: "Día"         },
  { id: "la_anonima", name: "La Anónima"  },
  { id: "chango_mas", name: "Chango Más"  },
];

// Supermercados con precio para San Juan (CP 5400) y qué precio se está leyendo.
// Se usa para el atajo "San Juan" del filtro de /resultados: al activarlo solo se
// buscan estos supermercados.
export const SAN_JUAN_SUPERMARKETS: { id: string; priceNote: string }[] = [
  { id: "carrefour",  priceNote: "Sucursal San Juan (CP 5400)" },
  { id: "chango_mas", priceNote: "Región San Juan (CP 5400)" },
  { id: "la_anonima", priceNote: "Sucursal San Juan, ex Hiper Libertad" },
  { id: "vea",        priceNote: "Precio online nacional" },
  { id: "atomo",      priceNote: "Precio de la tienda online" },
];

// Design category ID → backend category ID
export const DESIGN_TO_BACKEND: Record<string, ProductCategory> = Object.fromEntries(
  CATEGORIES_DESIGN.map((c) => [c.id, c.backendId])
) as Record<string, ProductCategory>;

// Backend category ID → design category ID (first match wins)
export const BACKEND_TO_DESIGN: Partial<Record<ProductCategory, string>> = {
  alimentos:          "almacen",
  bebidas:            "bebidas",
  lacteos:            "lacteos",
  limpieza:           "limpieza",
  higiene_personal:   "higiene",
  carnes:             "carnes",
  frutas_verduras:    "frutas",
  panaderia:          "panificados",
  congelados:         "congelados",
  snacks:             "snacks",
  desayuno:           "desayuno",
  mascotas:           "mascotas",
  bebes:              "bebes",
  hogar_bazar:        "hogar_bazar",
  farmacia_salud:     "farmacia_salud",
  electro_tecnologia: "electro_tecnologia",
  otros:              "otros",
};
