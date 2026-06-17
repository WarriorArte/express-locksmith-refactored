import { z } from "zod";

const toOptionalNumber = z.preprocess(
  (val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  },
  z.number().min(0, "Debe ser mayor o igual a 0").optional()
);

const toRequiredNumber = z.preprocess(
  (val) => {
    if (val === "" || val === undefined || val === null) return undefined;
    const num = Number(val);
    return isNaN(num) ? undefined : num;
  },
  z.number().min(0, "Debe ser mayor o igual a 0")
);

export const serviceProductSchema = z.object({
  product_id: z.string().min(1, "Producto requerido"),
  quantity: z.number().min(1, "La cantidad debe ser al menos 1"),
  product_name: z.string().optional(),
  unit_price: z.number().min(0).optional(),
  subtotal: z.number().min(0).optional(),
});

export type ServiceProduct = z.infer<typeof serviceProductSchema>;

export const productSchema = z
  .object({
    item_type: z.literal("product"),
    name: z.string().min(1, "El nombre es requerido"),
    description: z.string().optional(),
    category_id: z.string().min(1, "La categoría es requerida"),
    image_url: z.string().optional().or(z.literal("")),
    purchase_price_local: toOptionalNumber,
    purchase_price_imported: toOptionalNumber,
    sale_price_min: toOptionalNumber,
    sale_price_max: toOptionalNumber,
    stock_store: toOptionalNumber,
    stock_warehouse: toOptionalNumber,
    min_stock: toOptionalNumber,
    instructions: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const sale_price_max = values.sale_price_max;
    const sale_price_min = values.sale_price_min;
    const purchase_price_local = values.purchase_price_local;
    const purchase_price_imported = values.purchase_price_imported;
    const stock_store = values.stock_store;
    const stock_warehouse = values.stock_warehouse;
    const min_stock = values.min_stock;

    if (sale_price_max === undefined || sale_price_max <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sale_price_max"],
        message: "El precio es requerido",
      });
    }
    if (sale_price_min === undefined || sale_price_min <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sale_price_min"],
        message: "El precio con descuento es requerido",
      });
    }
    if (purchase_price_local === undefined || purchase_price_local <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purchase_price_local"],
        message: "El costo local es requerido",
      });
    }
    if (purchase_price_imported !== undefined && purchase_price_imported <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["purchase_price_imported"],
        message: "El costo importado debe ser mayor a 0",
      });
    }
    if (stock_store === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stock_store"],
        message: "El stock tienda es requerido",
      });
    }
    if (stock_warehouse === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["stock_warehouse"],
        message: "El stock bodega es requerido",
      });
    }
    if (min_stock === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["min_stock"],
        message: "El stock mínimo es requerido",
      });
    }
  });

export const serviceSchema = z
  .object({
    item_type: z.literal("service"),
    name: z.string().min(1, "El nombre es requerido"),
    description: z.string().optional(),
    category_id: z.string().optional().or(z.literal("")),
    image_url: z.string().optional().or(z.literal("")),
    service_type: z.enum(["automotive", "residential", "commercial", "industrial"], {
      errorMap: () => ({ message: "Tipo de servicio requerido" }),
    }),
    labor_cost: toRequiredNumber,
    discount: toOptionalNumber.default(0),
    service_products: z.array(serviceProductSchema).optional().default([]),
    instructions: z.string().optional(),
    notes: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    if (values.labor_cost === undefined || values.labor_cost <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["labor_cost"],
        message: "La mano de obra es requerida",
      });
    }
  });

export type ProductFormValues =
  | z.input<typeof productSchema>
  | z.input<typeof serviceSchema>;

export type KeysOfUnion<T> = T extends T ? keyof T : never;

// Validation helpers reused across tabs
export const hasText = (value: unknown) => String(value ?? "").trim().length > 0;

export const hasNumber = (value: unknown) => {
  if (value === "" || value === undefined || value === null) return false;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue >= 0;
};

export const hasPositiveNumber = (value: unknown) => {
  if (value === "" || value === undefined || value === null) return false;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0;
};

export const hasEmptyOrPositiveNumber = (value: unknown) => {
  if (value === "" || value === undefined || value === null) return true;
  const numberValue = Number(value);
  return Number.isFinite(numberValue) && numberValue > 0;
};
