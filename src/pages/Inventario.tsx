import { useState, useEffect } from "react";
import { resolveStorageUrl } from "@/lib/phpApi";
import { AccountMenu } from "@/components/layout/AccountMenu";
import { m as motion } from "framer-motion";
import { 
  Plus, 
  Package, 
  Grid3X3, 
  List,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  ArrowUpDown,
  Store,
  Warehouse,
  History,
  Move,
  ZoomIn,
  Palette,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { getReadableTextColor } from "@/lib/colorContrast";
import { useProducts, useDeleteProduct, type Product } from "@/hooks/useProducts";
import { useCategories } from "@/hooks/useCategories";
import { useBusinessSettings } from "@/hooks/useBusinessSettings";
import { ProductFormDialog } from "@/components/products/ProductFormDialog";
import { ProductDetailSheet } from "@/components/products/ProductDetailSheet";
import { ImageViewDialog } from "@/components/shared/ImageViewDialog";
import { InventoryMovementDialog } from "@/components/products/InventoryMovementDialog";
import { InventoryHistoryDialog } from "@/components/products/InventoryHistoryDialog";
import { CategoryManagementDialog } from "@/components/products/CategoryManagementDialog";
import { SaleFormDialog } from "@/components/sales/SaleFormDialog";
import { ServiceFormDialog } from "@/components/services/ServiceFormDialog";
import { UnifiedSearchInput } from "@/components/shared/UnifiedSearchInput";

export default function Inventario() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [imageProduct, setImageProduct] = useState<Product | null>(null);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [saleProduct, setSaleProduct] = useState<Product | null>(null);
  const [saleFormOpen, setSaleFormOpen] = useState(false);
  const [serviceFormOpen, setServiceFormOpen] = useState(false);
  const [serviceTemplateProductId, setServiceTemplateProductId] = useState<string | null>(null);
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [detailProduct, setDetailProduct] = useState<Product | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { data: businessSettings } = useBusinessSettings();
  const deleteProductMutation = useDeleteProduct();

  const currencySymbol = businessSettings?.currency_symbol || "$";

  const filteredProducts = products?.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const isService = (product.item_type ?? "product") === "service";
    let matchesCategory: boolean;
    if (selectedCategory === "all") {
      matchesCategory = true;
    } else if (selectedCategory === "__services__") {
      matchesCategory = isService;
    } else {
      matchesCategory = !isService && product.category_id === selectedCategory;
    }
    return matchesSearch && matchesCategory;
  }) || [];

  const getCategoryColor = (categoryId: string | null) => {
    const category = categories?.find(c => c.id === categoryId);
    return category?.color || "#6b7280";
  };

  const getCategoryName = (categoryId: string | null) => {
    const category = categories?.find(c => c.id === categoryId);
    return category?.name || "Sin categoria";
  };

  const getCategoryBadgeStyle = (categoryId: string | null) => {
    const bg = getCategoryColor(categoryId);
    return {
      backgroundColor: bg,
      color: getReadableTextColor(bg),
    };
  };

  const getServiceTypeLabel = (serviceType: string | null) => {
    const labels: Record<string, string> = {
      automotive: "Automotriz",
      residential: "Residencial",
      commercial: "Comercial",
      industrial: "Industrial",
    };
    return labels[serviceType || ""] || serviceType || "Servicio";
  };

  const getServiceTypeBadgeStyle = () => {
    const bg = "#6F67B0";
    return {
      backgroundColor: bg,
      color: getReadableTextColor(bg),
    };
  };

  const getStockStatus = (product: Product) => {
    if ((product.item_type ?? "product") === "service") return "normal";
    const totalStock = product.stock_store + product.stock_warehouse;
    return totalStock < product.min_stock ? "low" : "normal";
  };

  const getServiceTotals = (product: Product) => {
    const labor = Number(product.labor_cost || 0);
    const discount = Number(product.discount || 0);
    const productsSubtotal = (product.service_products || []).reduce(
      (sum, item) => sum + Number(item.subtotal || 0),
      0,
    );
    return {
      labor,
      discount,
      productsSubtotal,
      totalWithProducts: Math.max(0, labor + productsSubtotal),
    };
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormOpen(true);
  };

  const handleDelete = async () => {
    if (deleteProduct) {
      await deleteProductMutation.mutateAsync(deleteProduct.id);
      setDeleteProduct(null);
    }
  };

  const handleNewProduct = () => {
    setEditingProduct(null);
    setFormOpen(true);
  };

  const handleSell = (product: Product) => {
    if ((product.item_type ?? "product") === "service") {
      setServiceTemplateProductId(product.id);
      setServiceFormOpen(true);
      return;
    }

    setSaleProduct(product);
    setSaleFormOpen(true);
  };

  const lowStockCount =
    products?.filter((p) => (p.item_type ?? "product") !== "service" && p.stock_store + p.stock_warehouse < p.min_stock).length || 0;

  const servicesCount = products?.filter((p) => (p.item_type ?? "product") === "service").length || 0;
  const productsCount = (products?.length || 0) - servicesCount;
  const selectedCategoryLabel =
    selectedCategory === "all"
      ? "Todas las categorias"
      : selectedCategory === "__services__"
      ? "Servicios"
      : (categories?.find((cat) => cat.id === selectedCategory)?.name || "Categoria");
  const openDetail = (p: Product) => {
    setDetailProduct(p);
    setDetailOpen(true);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header bar - ya NO es sticky */}
      <div className="bg-background px-5 lg:px-6 pt-10 lg:pt-3 pb-4">
        <section className="ce-hero ce-hero-mobile-bleed p-[22px_16px] lg:p-[22px]">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <div className="ce-hero-eyebrow">Inventario</div>
              <h1 className="ce-hero-title mt-1.5 text-[clamp(1.55rem,5.4vw,2.15rem)] lg:mt-2 lg:text-[clamp(1.75rem,3vw,2.5rem)]">
                Productos y <span className="text-primary">servicios.</span>
              </h1>
              <p className="ce-hero-meta mt-2 max-w-[460px] lg:mt-3">
                <b className="text-[hsl(240_22%_95%)]">{productsCount} productos</b>
                {" "}· {servicesCount} servicios
                {lowStockCount > 0 && (
                  <>
                    {" "}·{" "}
                    <b className="text-warning">{lowStockCount} alertas de stock</b>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-start gap-2">
              <div className="hidden lg:flex gap-2">
                <Button className="h-11 rounded-[12px] bg-white/[.09] border border-white/[.13] text-[hsl(240_22%_95%)] hover:bg-white/[.14]" onClick={() => setCategoryDialogOpen(true)}>
                  <Palette className="w-4 h-4 mr-1" />
                  Categorias
                </Button>
                <Button className="h-11 rounded-[12px] bg-primary text-primary-foreground hover:bg-primary-hover" onClick={handleNewProduct}>
                  <Plus className="w-4 h-4 mr-1" />
                  Nuevo
                </Button>
              </div>
              <AccountMenu />
            </div>
          </div>

          <div className="relative z-[1] mt-4 flex flex-row items-center gap-2 animate-hero-search-in lg:mt-5">
            <UnifiedSearchInput
              className="flex-1 min-w-0"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Gestionar categorias"
                onClick={() => setCategoryDialogOpen(true)}
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-white/[.09] border border-white/[.13] text-[hsl(240_22%_95%)] active:scale-95 transition-transform lg:hidden"
              >
                <Palette className="w-4 h-4" />
              </button>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger
                  className="h-10 w-10 shrink-0 justify-center rounded-xl px-0 bg-white/[.09] border-white/[.13] text-[hsl(240_22%_95%)] hover:bg-white/[.14] focus:ring-0 focus:border-white/30 [&>svg:last-child]:hidden lg:w-56 lg:justify-start lg:px-3 lg:[&>svg:last-child]:block"
                  aria-label="Filtrar por categoria"
                >
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <span className="hidden truncate lg:inline">{selectedCategoryLabel}</span>
                    <span className="sr-only lg:hidden">Filtrar por categoria</span>
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorias</SelectItem>
                  <SelectItem value="__services__">Servicios</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="hidden border border-white/[.13] rounded-xl p-1.5 bg-white/[.05] lg:flex gap-1">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="h-9 w-10 rounded-lg"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="h-9 w-10 rounded-lg"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              <button
                type="button"
                aria-label="Nuevo item de inventario"
                onClick={handleNewProduct}
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex shrink-0 items-center justify-center shadow-[0_0_16px_hsl(var(--primary)/0.40)] active:scale-95 transition-transform lg:hidden"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
          </div>
        </section>
      </div>

      <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain px-5 lg:px-6 pb-24 md:pb-6 no-scrollbar">
      {/* Skeleton */}
      {isLoading && viewMode === "grid" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4 animate-pulse">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="bg-card border border-border rounded-2xl overflow-hidden">
              <div className="aspect-square bg-muted/40" />
              <div className="p-3 space-y-2">
                <div className="h-3 w-3/4 rounded-full bg-muted/60" />
                <div className="h-4 w-1/2 rounded-full bg-muted/60" />
                <div className="h-3 w-2/5 rounded-full bg-muted/40" />
                <div className="h-8 w-full rounded-xl bg-muted/50 mt-3" />
              </div>
            </div>
          ))}
        </div>
      )}
      {isLoading && viewMode === "list" && (
        <div className="card-elevated overflow-hidden animate-pulse">
          <div className="h-10 bg-muted/30 border-b border-border" />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-3.5 border-b border-border last:border-0">
              <div className="w-10 h-10 rounded-xl bg-muted/60 shrink-0" />
              <div className="flex-1 h-3 rounded bg-muted/60 max-w-[200px]" />
              <div className="w-16 h-5 rounded-full bg-muted/60" />
              <div className="w-16 h-3 rounded bg-muted/60" />
              <div className="w-20 h-3 rounded bg-muted/60 ml-auto" />
              <div className="w-20 h-8 rounded-lg bg-muted/60" />
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredProducts.length === 0 && (
        <div className="card-elevated p-10 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {searchQuery ? "Sin resultados" : "Sin productos registrados"}
          </h3>
          <p className="text-muted-foreground mb-5 max-w-xs mx-auto">
            {searchQuery
              ? "Intenta con otro nombre o cambia el filtro de categoria."
              : "Agrega productos o servicios para gestionar tu inventario y precios."}
          </p>
          {!searchQuery && (
            <Button onClick={handleNewProduct}>
              <Plus className="w-4 h-4 mr-1.5" />
              Agregar producto
            </Button>
          )}
        </div>
      )}

      {/* MOBILE products view (Redesign v2) */}
      {!isLoading && filteredProducts.length > 0 && <div className="lg:hidden">
        {viewMode === "grid" ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-extrabold tracking-tight">Resultados</h2>
              <span className="text-xs font-bold text-muted-foreground">{filteredProducts.length} items</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product, index) => {
              const status = getStockStatus(product);
              const isService = (product.item_type ?? "product") === "service";
              const cc = getCategoryColor(product.category_id);
              const cn_ = getCategoryName(product.category_id);
              const serviceTypeLabel = getServiceTypeLabel(product.service_type);
              const serviceTotals = isService ? getServiceTotals(product) : null;
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.15, delay: index * 0.03 }}
                  onClick={() => openDetail(product)}
                  className="rounded-2xl overflow-hidden active:scale-[0.96] transition-transform cursor-pointer border border-border/50 shadow-sm"
                >
                  {/* Full-bleed image con overlay */}
                  <div className="relative aspect-square">
                    {product.image_url ? (
                      <img
                        src={resolveStorageUrl(product.image_url) ?? undefined}
                        alt={product.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div
                        className="absolute inset-0 flex items-center justify-center"
                        style={{ background: `linear-gradient(160deg, ${getCategoryColor(product.category_id)}30 0%, hsl(var(--surface-2)) 70%)` }}
                      >
                        <Package className="w-12 h-12 text-muted-foreground/20" />
                      </div>
                    )}

                    {/* Gradient oscuro desde abajo */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

                    {/* Badge stock bajo — arriba derecha */}
                    {!isService && status === "low" && (
                      <div className="absolute top-2.5 right-2.5 z-10">
                        <span className="px-2 py-0.5 rounded-full bg-warning text-black text-[9px] font-black leading-tight">
                          bajo
                        </span>
                      </div>
                    )}

                    {/* Info superpuesta sobre el gradiente */}
                    <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-10">
                      <p className="text-white/90 text-[11px] font-medium leading-snug line-clamp-1 mb-1">
                        {product.name}
                      </p>
                      <div className="flex items-end justify-between gap-2">
                        <span className="text-white text-[17px] font-black leading-none tracking-tight">
                          {isService
                            ? `${currencySymbol}${serviceTotals?.totalWithProducts.toLocaleString()}`
                            : `${currencySymbol}${Number(product.sale_price_max).toLocaleString()}`
                          }
                        </span>
                        <span className="text-white/55 text-[10px] leading-tight pb-0.5 text-right">
                          {isService
                            ? `M.O ${currencySymbol}${serviceTotals?.labor.toLocaleString()}`
                            : `T:${product.stock_store} · B:${product.stock_warehouse}`
                          }
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de acción */}
                  <div className="bg-card px-2.5 py-2.5">
                    <Button
                      type="button"
                      className="w-full h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover text-[11px] font-bold"
                      onClick={(e) => { e.stopPropagation(); handleSell(product); }}
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                      {isService ? "Usar servicio" : "Vender"}
                    </Button>
                  </div>
                </motion.div>
              );
              })}
            </div>
          </>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {filteredProducts.map((product) => {
              const status = getStockStatus(product);
              const isService = (product.item_type ?? "product") === "service";
              const cn_ = getCategoryName(product.category_id);
              const serviceTypeLabel = getServiceTypeLabel(product.service_type);
              const serviceTotals = isService ? getServiceTotals(product) : null;
              return (
                <div
                  key={product.id}
                  onClick={() => openDetail(product)}
                  className="flex items-center gap-3 px-3 py-2.5 active:bg-muted/40 transition-colors cursor-pointer"
                >
                  {/* Thumbnail */}
                  <div className="w-11 h-11 rounded-xl bg-[hsl(var(--surface-2))] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img src={resolveStorageUrl(product.image_url) ?? undefined} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-foreground truncate">{product.name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span
                        className="px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-tight"
                        style={isService ? getServiceTypeBadgeStyle() : getCategoryBadgeStyle(product.category_id)}
                      >
                        {isService ? serviceTypeLabel : cn_}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {isService
                          ? `M.O: ${currencySymbol}${Number(product.labor_cost || 0).toLocaleString()}`
                          : `T:${product.stock_store} · B:${product.stock_warehouse}`
                        }
                      </span>
                      {!isService && status === "low" && (
                        <span className="text-[9px] font-bold text-warning">↓ bajo</span>
                      )}
                    </div>
                  </div>

                  {/* Price + action */}
                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <span className="text-[13px] font-extrabold text-foreground dark:text-primary leading-tight">
                      {isService
                        ? `${currencySymbol}${serviceTotals?.totalWithProducts.toLocaleString()}`
                        : `${currencySymbol}${Number(product.sale_price_max).toLocaleString()}`
                      }
                    </span>
                    <Button
                      type="button"
                      className="h-7 px-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover text-[10px] font-semibold"
                      onClick={(e) => { e.stopPropagation(); handleSell(product); }}
                    >
                      <ShoppingCart className="w-3 h-3 mr-1" />
                      {isService ? "Usar" : "Vender"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>}

      {/* DESKTOP products view (legacy) */}
      {!isLoading && filteredProducts.length > 0 && <div className="hidden lg:block">
      {viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4">
          {filteredProducts.map((product, index) => {
            const status = getStockStatus(product);
            const isService = (product.item_type ?? "product") === "service";
            const serviceTypeLabel = getServiceTypeLabel(product.service_type);
            const serviceTotals = isService ? getServiceTotals(product) : null;
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.1, delay: index * 0.02 }}
                className="rounded-2xl overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-lg border border-border/50 shadow-sm group"
                onClick={() => { setDetailProduct(product); setDetailOpen(true); }}
              >
                {/* Full-bleed image con overlay */}
                <div className="relative aspect-square">
                  {product.image_url ? (
                    <img
                      src={resolveStorageUrl(product.image_url) ?? undefined}
                      alt={product.name}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  ) : (
                    <div
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ background: `linear-gradient(160deg, ${getCategoryColor(product.category_id)}30 0%, hsl(var(--surface-2)) 70%)` }}
                    >
                      <Package className="w-12 h-12 text-muted-foreground/20" />
                    </div>
                  )}

                  {/* Gradient oscuro desde abajo */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

                  {/* Stock bajo — arriba derecha (detrás del ⋯) */}
                  {!isService && status === "low" && (
                    <div className="absolute top-2.5 right-10 z-10">
                      <span className="px-2 py-0.5 rounded-full bg-warning text-black text-[9px] font-black leading-tight">
                        bajo
                      </span>
                    </div>
                  )}

                  {/* Context menu — hover */}
                  <div
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-20"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary" className="h-7 w-7 rounded-lg shadow-sm cursor-pointer">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setImageProduct(product)}>
                          <ZoomIn className="w-4 h-4 mr-2" /> Ver imagen
                        </DropdownMenuItem>
                        {!isService && (
                          <>
                            <DropdownMenuItem onClick={() => setMovementProduct(product)}>
                              <Move className="w-4 h-4 mr-2" /> Movimientos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setHistoryProduct(product)}>
                              <History className="w-4 h-4 mr-2" /> Historial
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={() => handleEdit(product)}>
                          <Edit className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteProduct(product)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Info superpuesta */}
                  <div className="absolute inset-x-0 bottom-0 z-10 px-3 pb-3 pt-10">
                    <p className="text-white/90 text-[12px] font-medium leading-snug line-clamp-1 mb-1">
                      {product.name}
                    </p>
                    <div className="flex items-end justify-between gap-2">
                      <span className="text-white text-[16px] font-black leading-none tracking-tight">
                        {isService
                          ? `${currencySymbol}${serviceTotals?.totalWithProducts.toLocaleString()}`
                          : `${currencySymbol}${Number(product.sale_price_max).toLocaleString()}`
                        }
                      </span>
                      <span className="text-white/55 text-[10px] leading-tight pb-0.5 text-right">
                        {isService
                          ? `M.O ${currencySymbol}${serviceTotals?.labor.toLocaleString()}`
                          : `T:${product.stock_store} · B:${product.stock_warehouse}`
                        }
                      </span>
                    </div>
                  </div>
                </div>

                {/* Barra de acción */}
                <div className="bg-card px-3 py-2.5">
                  <Button
                    className="w-full h-8 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover text-xs font-semibold cursor-pointer"
                    onClick={(e) => { e.stopPropagation(); handleSell(product); }}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
                    {isService ? "Usar" : "Vender"}
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="card-elevated overflow-hidden"
        >
          <div className="overflow-x-auto max-w-full">
            <table className="w-full min-w-0 table-fixed">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-2 sm:px-4 py-3 text-left text-sm font-medium text-muted-foreground w-[40%] sm:w-auto">Producto</th>
                  <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium text-muted-foreground">Categoria</th>
                  <th className="px-2 sm:px-4 py-3 text-center text-sm font-medium text-muted-foreground">Stock</th>
                  <th className="hidden sm:table-cell px-4 py-3 text-right text-sm font-medium text-muted-foreground">Precio</th>
                  <th className="hidden lg:table-cell px-4 py-3 text-center text-sm font-medium text-muted-foreground">Estado</th>
                  <th className="px-2 sm:px-4 py-3 text-center text-sm font-medium text-muted-foreground w-40"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product);
                  const isService = (product.item_type ?? "product") === "service";
                  const serviceTypeLabel = getServiceTypeLabel(product.service_type);
                  return (
                    <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-2 sm:px-4 py-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                            {product.image_url ? (
                              <img src={resolveStorageUrl(product.image_url) ?? undefined} alt="" className="w-full h-full object-cover rounded" />
                            ) : (
                              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-sm sm:text-base line-clamp-1">{product.name}</span>
                            <div className="md:hidden">
                              <Badge 
                                style={isService ? getServiceTypeBadgeStyle() : getCategoryBadgeStyle(product.category_id)}
                                className="text-xs mt-1"
                              >
                                {isService ? serviceTypeLabel : getCategoryName(product.category_id)}
                              </Badge>
                            </div>
                            <div className="sm:hidden text-xs text-muted-foreground mt-1">
                              {isService 
                                ? `${currencySymbol}${Number((Number(product.labor_cost || 0) - Number(product.discount || 0)).toFixed(2)).toLocaleString()}` 
                                : `${currencySymbol}${product.sale_price_max}`
                              }
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3">
                        <Badge 
                          style={isService ? getServiceTypeBadgeStyle() : getCategoryBadgeStyle(product.category_id)}
                          className="text-xs"
                        >
                          {isService ? serviceTypeLabel : getCategoryName(product.category_id)}
                        </Badge>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-center">
                        {isService ? (
                          <div className="text-xs sm:text-sm">
                            <span className="font-medium">{currencySymbol}{Number(product.labor_cost || 0).toLocaleString()}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col sm:flex-row sm:justify-center gap-1 text-xs sm:text-sm">
                            <span title="Tienda" className="flex items-center justify-center gap-1">
                              <Store className="w-3 h-3 text-muted-foreground" />
                              {product.stock_store}
                            </span>
                            <span title="Bodega" className="flex items-center justify-center gap-1">
                              <Warehouse className="w-3 h-3 text-muted-foreground" />
                              {product.stock_warehouse}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-right font-medium text-sm">
                        {isService 
                          ? `${currencySymbol}${Number((Number(product.labor_cost || 0) - Number(product.discount || 0)).toFixed(2)).toLocaleString()}` 
                          : `${currencySymbol}${product.sale_price_max}`
                        }
                      </td>
                      {!isService && (
                        <td className="hidden lg:table-cell px-4 py-3 text-center">
                          {status === "low" ? (
                            <Badge className="bg-warning text-warning-foreground">Bajo</Badge>
                          ) : (
                            <Badge className="bg-success text-success-foreground">Normal</Badge>
                          )}
                        </td>
                      )}
                      <td className="px-2 sm:px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="h-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover"
                            onClick={() => handleSell(product)}
                          >
                            <ShoppingCart className="w-3.5 h-3.5 mr-1" /> {isService ? "Usar" : "Vender"}
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setImageProduct(product)}>
                                <ZoomIn className="w-4 h-4 mr-2" /> Ver Imagen
                              </DropdownMenuItem>
                              {!isService && (
                                <>
                                  <DropdownMenuItem onClick={() => setMovementProduct(product)}>
                                    <Move className="w-4 h-4 mr-2" /> Movimientos
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => setHistoryProduct(product)}>
                                    <History className="w-4 h-4 mr-2" /> Historial
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem onClick={() => handleEdit(product)}>
                                <Edit className="w-4 h-4 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => setDeleteProduct(product)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}
      </div>}
      </div>

      {/* Mobile detail sheet (Redesign v2) */}
      <ProductDetailSheet
        product={detailProduct}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        currencySymbol={currencySymbol}
        categoryName={getCategoryName(detailProduct?.category_id ?? null)}
        categoryColor={getCategoryColor(detailProduct?.category_id ?? null)}
        onEdit={(p) => { setDetailOpen(false); handleEdit(p); }}
        onMovement={(p) => { setDetailOpen(false); setMovementProduct(p); }}
        onHistory={(p) => { setDetailOpen(false); setHistoryProduct(p); }}
        onDelete={(p) => { setDetailOpen(false); setDeleteProduct(p); }}
        onZoomImage={(p) => setImageProduct(p)}
      />

      {/* Product Form Dialog */}
      <ProductFormDialog 
        open={formOpen} 
        onOpenChange={setFormOpen}
        product={editingProduct}
      />

      {/* Sale Form Dialog */}
      <SaleFormDialog
        open={saleFormOpen}
        onOpenChange={(nextOpen) => {
          setSaleFormOpen(nextOpen);
          if (!nextOpen) setSaleProduct(null);
        }}
        initialProduct={saleProduct}
      />

      <ServiceFormDialog
        open={serviceFormOpen}
        onOpenChange={(nextOpen) => {
          setServiceFormOpen(nextOpen);
          if (!nextOpen) setServiceTemplateProductId(null);
        }}
        templateServiceId={serviceTemplateProductId}
      />

      {/* Image Dialog */}
      <ImageViewDialog
        open={!!imageProduct && !!imageProduct.image_url}
        onOpenChange={(nextOpen) => { if (!nextOpen) setImageProduct(null); }}
        images={imageProduct?.image_url ? [{ url: imageProduct.image_url, description: imageProduct.name }] : []}
      />

      {/* Movement Dialog */}
      <InventoryMovementDialog
        open={!!movementProduct}
        onOpenChange={() => setMovementProduct(null)}
        product={movementProduct}
      />

      {/* History Dialog */}
      <InventoryHistoryDialog
        open={!!historyProduct}
        onOpenChange={() => setHistoryProduct(null)}
        product={historyProduct}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteProduct} onOpenChange={() => setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar producto?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta accion no se puede deshacer. Se eliminara permanentemente el producto "{deleteProduct?.name}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Management */}
      <CategoryManagementDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
      />
    </div>
  );
}
