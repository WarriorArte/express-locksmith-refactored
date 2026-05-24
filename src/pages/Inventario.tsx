import { useState, useEffect } from "react";
import { resolveStorageUrl } from "@/lib/phpApi";
import { PageHeader } from "@/components/layout/PageHeader";
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
  Loader2,
  History,
  Move,
  ZoomIn,
  Palette,
  AlertTriangle,
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
    return category?.name || "Sin categoría";
  };

  const getCategoryTextColor = (backgroundHex: string) => {
    const normalized = backgroundHex.replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return "#ffffff";

    const r = parseInt(normalized.slice(0, 2), 16);
    const g = parseInt(normalized.slice(2, 4), 16);
    const b = parseInt(normalized.slice(4, 6), 16);
    const luminance = (0.299 * r) + (0.587 * g) + (0.114 * b);
    return luminance > 170 ? "#111827" : "#ffffff";
  };

  const getCategoryBadgeStyle = (categoryId: string | null) => {
    const bg = getCategoryColor(categoryId);
    return {
      backgroundColor: bg,
      color: getCategoryTextColor(bg),
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
    return {
      backgroundColor: "#8b5cf6",
      color: "#ffffff",
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const lowStockCount =
    products?.filter((p) => (p.item_type ?? "product") !== "service" && p.stock_store + p.stock_warehouse < p.min_stock).length || 0;

  const servicesCount = products?.filter((p) => (p.item_type ?? "product") === "service").length || 0;
  const productsCount = (products?.length || 0) - servicesCount;
  const selectedCategoryLabel =
    selectedCategory === "all"
      ? "Todas las categorías"
      : selectedCategory === "__services__"
      ? "Servicios"
      : (categories?.find((cat) => cat.id === selectedCategory)?.name || "Categoría");

  const openDetail = (p: Product) => {
    setDetailProduct(p);
    setDetailOpen(true);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header bar - ya NO es sticky */}
      <div className="bg-background px-5 lg:px-6 pt-10 lg:pt-2 pb-4">
        <PageHeader
          title="Inventario"
          subtitle={
            <>
              {productsCount} productos · {servicesCount} servicios
              {lowStockCount > 0 && (
                <>
                  {" "}·{" "}
                  <span className="text-warning font-bold">{lowStockCount} alertas</span>
                </>
              )}
            </>
          }
          mobileAction={
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="CategorÃas"
                onClick={() => setCategoryDialogOpen(true)}
                className="h-10 w-10 rounded-xl bg-muted text-muted-foreground flex items-center justify-center border border-border shadow-sm active:scale-95 transition-transform"
              >
                <Palette className="w-5 h-5" strokeWidth={2} />
              </button>
              <button
                type="button"
                aria-label="Nuevo item de inventario"
                onClick={handleNewProduct}
                className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_0_16px_hsl(var(--primary)/0.40)] active:scale-95 transition-transform"
              >
                <Plus className="w-5 h-5" strokeWidth={2.5} />
              </button>
            </div>
          }
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" className="rounded-[14px]" onClick={() => setCategoryDialogOpen(true)}>
                <Palette className="w-4 h-4 mr-1" />
                CategorÃas
              </Button>
              <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary-hover rounded-[14px]" onClick={handleNewProduct}>
                <Plus className="w-4 h-4 mr-1" />
                Nuevo
              </Button>
            </div>
          }
        />

        {/* MOBILE: search + filter */}
        <div className="lg:hidden space-y-3">
          <div className="flex items-center gap-2">
            <UnifiedSearchInput
              className="flex-1"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="h-10 w-10 rounded-xl shrink-0 px-0 justify-center" aria-label="Filtrar por categoría">
                <Filter className="w-4 h-4" />
                <span className="sr-only">Filtrar por categoría</span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="__services__">Servicios</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex bg-card border border-border rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                aria-label="CuadrÃcula"
                className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
                  viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                aria-label="Lista"
                className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center transition-colors",
                  viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
          {lowStockCount > 0 && (
            <div className="flex items-center gap-2 rounded-2xl px-3 py-2.5 border border-warning/20 bg-warning/10">
              <AlertTriangle className="w-4 h-4 text-warning flex-shrink-0" />
              <span className="text-[12px] font-semibold text-warning">
                {lowStockCount} producto{lowStockCount === 1 ? "" : "s"} requiere{lowStockCount === 1 ? "" : "n"} atención
              </span>
            </div>
          )}
        </div>

        {/* DESKTOP: filters card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.08 }}
          className="hidden lg:block card-elevated p-4"
        >
          <div className="flex flex-col lg:flex-row gap-4">
            <UnifiedSearchInput
              className="flex-1"
              placeholder="Buscar productos..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full lg:w-56">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4" />
                  <span className="truncate">{selectedCategoryLabel}</span>
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las categorías</SelectItem>
                <SelectItem value="__services__">Servicios</SelectItem>
                {categories?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex border rounded-lg p-1 bg-muted/50">
              <Button
                variant={viewMode === "grid" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("grid")}
                className="px-3"
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="px-3"
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain px-5 lg:px-6 pb-24 md:pb-6 no-scrollbar">
      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="card-elevated p-12 text-center">
          <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No hay productos</h3>
          <p className="text-muted-foreground mb-4">
            {searchQuery ? "No se encontraron productos con esa búsqueda" : "Comienza agregando tu primer producto"}
          </p>
          <Button onClick={handleNewProduct}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Producto
          </Button>
        </div>
      )}

      {/* MOBILE products view (Redesign v2) */}
      <div className="lg:hidden">
        {viewMode === "grid" ? (
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
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.08 }}
                  onClick={() => openDetail(product)}
                  className="flex flex-col h-full bg-card border border-border rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform"
                >
                  {/* Contenedor de la miniatura (cuadrado garantizado) */}
                  <div className="relative w-full pb-[100%] bg-[hsl(var(--surface-2))] shrink-0">
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                      {product.image_url ? (
                        <img src={resolveStorageUrl(product.image_url) ?? undefined} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-9 h-9 text-muted-foreground" />
                      )}
                      <span
                        className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold z-10"
                        style={isService ? getServiceTypeBadgeStyle() : getCategoryBadgeStyle(product.category_id)}
                      >
                        {isService ? serviceTypeLabel : cn_}
                      </span>
                      <span
                        onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-foreground/40 backdrop-blur flex items-center justify-center z-10"
                      >
                        <Edit className="w-3 h-3 text-background" />
                      </span>
                      {!isService && (
                        <span
                          className={cn(
                            "absolute bottom-1.5 right-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold z-10",
                            status === "low" ? "bg-warning/20 text-warning" : "bg-success/20 text-foreground dark:text-success",
                          )}
                        >
                          {status === "low" ? "Stock bajo" : "En stock"}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col flex-1 p-2.5">
                    <div className="text-[12px] font-bold text-foreground leading-tight line-clamp-2 mb-1.5 min-h-[28px]">
                      {product.name}
                    </div>
                    {isService ? (
                      <div className="min-h-[72px] space-y-1">
                        <div className="flex gap-3">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                            <Wrench className="w-4 h-4" />{currencySymbol}{serviceTotals?.labor.toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                            <Package className="w-4 h-4" />
                            {currencySymbol}{serviceTotals?.productsSubtotal.toLocaleString()}
                          </span>
                        </div>
                        <div className="text-[13px] font-extrabold text-foreground dark:text-primary leading-tight">
                          {currencySymbol}{serviceTotals?.totalWithProducts.toLocaleString()}
                        </div>
                        <div className="text-[12px] text-destructive leading-tight">
                          Descuento: {currencySymbol}{serviceTotals?.discount.toLocaleString()}
                        </div>
                      </div>
                    ) : (
                      <div className="min-h-[72px] space-y-1">
                        <div className="flex gap-3">
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                            <Store className="w-4 h-4" />T: {product.stock_store}
                          </span>
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                            <Warehouse className="w-4 h-4" />B: {product.stock_warehouse}
                          </span>
                        </div>
                        <div className="text-[13px] font-extrabold text-foreground dark:text-primary leading-tight">
                          {currencySymbol}{Number(product.sale_price_max).toLocaleString()}
                        </div>
                        <div className="text-[12px] text-destructive leading-tight">
                          Descuento: {currencySymbol}{Number(product.sale_price_min).toLocaleString()}
                        </div>
                      </div>
                    )}
                    <Button
                      type="button"
                      className="w-full h-8 mt-auto rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover text-[11px] font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSell(product);
                      }}
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1" /> {isService ? "Usar" : "Vender"}
                    </Button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
            {filteredProducts.map((product) => {
              const status = getStockStatus(product);
              const isService = (product.item_type ?? "product") === "service";
              const cc = getCategoryColor(product.category_id);
              const cn_ = getCategoryName(product.category_id);
              const serviceTypeLabel = getServiceTypeLabel(product.service_type);
              return (
                <div
                  key={product.id}
                  onClick={() => openDetail(product)}
                  className="w-full flex items-center gap-3 px-3 py-3 active:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--surface-2))] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img src={resolveStorageUrl(product.image_url) ?? undefined} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-foreground truncate">{product.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={isService ? getServiceTypeBadgeStyle() : getCategoryBadgeStyle(product.category_id)}>
                        {isService ? serviceTypeLabel : cn_}
                      </span>
                      {!isService && (
                        <span className="text-sm font-semibold text-muted-foreground">T: {product.stock_store} · B: {product.stock_warehouse}</span>
                      )}
                      {isService && (
                        <span className="text-[10px] text-muted-foreground">
                          M.O: {currencySymbol}{Number(product.labor_cost || 0).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {isService ? (
                      <>
                        <span className="text-[14px] font-extrabold text-foreground dark:text-primary">
                          {currencySymbol}{Number((Number(product.labor_cost || 0) - Number(product.discount || 0)).toFixed(2)).toLocaleString()}
                        </span>
                        {Number(product.discount || 0) > 0 && (
                          <span className="text-[9px] text-muted-foreground">
                            -${Number(product.discount).toLocaleString()}
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="text-[14px] font-extrabold text-foreground dark:text-primary">
                          {currencySymbol}{Number(product.sale_price_max).toLocaleString()}
                        </span>
                        <span className={cn(
                          "inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                          status === "low" ? "bg-warning/20 text-warning" : "bg-success/20 text-foreground dark:text-success",
                        )}>
                          {status === "low" ? "Stock bajo" : "En stock"}
                        </span>
                      </>
                    )}
                    <Button
                      type="button"
                      className="h-7 px-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover text-[10px] font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSell(product);
                      }}
                    >
                      <ShoppingCart className="w-3 h-3 mr-1" /> {isService ? "Usar" : "Vender"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* DESKTOP products view (legacy) */}
      <div className="hidden lg:block">
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
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.08 }}
                className="card-elevated overflow-hidden group h-full flex flex-col"
              >
                {/* Product Image */}
                <div className="relative aspect-square bg-muted/50 flex items-center justify-center cursor-pointer" onClick={() => { setDetailProduct(product); setDetailOpen(true); }}>
                  {product.image_url ? (
                    <img src={resolveStorageUrl(product.image_url) ?? undefined} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-16 h-16 text-muted-foreground" />
                  )}
                  {!isService && status === "low" && (
                    <Badge className="absolute bottom-2 right-2 bg-warning text-warning-foreground">
                      Stock bajo
                    </Badge>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <Badge 
                      style={isService ? getServiceTypeBadgeStyle() : getCategoryBadgeStyle(product.category_id)}
                      className="text-xs"
                    >
                      {isService ? serviceTypeLabel : getCategoryName(product.category_id)}
                    </Badge>
                  </div>
                  
                  {/* Actions overlay - Hidden on mobile, shown on hover for desktop */}
                  <div className="hidden md:flex absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-2">
                    <Button size="icon" variant="secondary" className="rounded-full" onClick={(e) => { e.stopPropagation(); setImageProduct(product); }} title="Ver imagen">
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    {!isService && (
                      <>
                        <Button size="icon" variant="secondary" className="rounded-full" onClick={(e) => { e.stopPropagation(); setMovementProduct(product); }} title="Movimientos">
                          <Move className="w-4 h-4" />
                        </Button>
                        <Button size="icon" variant="secondary" className="rounded-full" onClick={(e) => { e.stopPropagation(); setHistoryProduct(product); }} title="Historial">
                          <History className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                    <Button size="icon" variant="secondary" className="rounded-full" onClick={(e) => { e.stopPropagation(); handleEdit(product); }} title="Editar">
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="destructive" className="rounded-full" onClick={(e) => { e.stopPropagation(); setDeleteProduct(product); }} title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Mobile menu button */}
                  <div className="absolute top-2 right-2 md:hidden z-10">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="secondary" className="rounded-full h-8 w-8">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setImageProduct(product); }}>
                          <ZoomIn className="w-4 h-4 mr-2" /> Ver Imagen
                        </DropdownMenuItem>
                        {!isService && (
                          <>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setMovementProduct(product); }}>
                              <Move className="w-4 h-4 mr-2" /> Movimientos
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setHistoryProduct(product); }}>
                              <History className="w-4 h-4 mr-2" /> Historial
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(product); }}>
                          <Edit className="w-4 h-4 mr-2" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteProduct(product); }} className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                {/* Sell button below thumbnail (desktop) */}
                <div className="px-3 pt-2.5 flex gap-2">
                  <Button
                    className="flex-1 h-9 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
                    onClick={() => handleSell(product)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1.5" /> {isService ? "Usar" : "Vender"}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-xl"
                    onClick={() => { setDetailProduct(product); setDetailOpen(true); }}
                    title="Ver detalles"
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>

                {/* Product Info */}
                <div className="px-3 pb-3 pt-2.5 space-y-2.5 flex-1">
                  <h3 className="font-semibold text-foreground line-clamp-2 text-sm sm:text-base min-h-[40px]">{product.name}</h3>

                  {isService ? (
                    <div className="min-h-[92px] space-y-1.5">
                      <div className="flex gap-3">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                          <Wrench className="w-4 h-4" />{currencySymbol}{serviceTotals?.labor.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                          <Package className="w-4 h-4" />
                          {currencySymbol}{serviceTotals?.productsSubtotal.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[20px] font-extrabold text-foreground dark:text-success leading-tight">
                        {currencySymbol}{serviceTotals?.totalWithProducts.toLocaleString()}
                      </div>
                      <div className="text-[11px] text-destructive leading-tight">
                        Descuento: {currencySymbol}{serviceTotals?.discount.toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div className="min-h-[92px] space-y-1.5">
                      <div className="flex gap-3">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                          <Store className="w-4 h-4" />T: {product.stock_store}
                        </span>
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                          <Warehouse className="w-4 h-4" />B: {product.stock_warehouse}
                        </span>
                      </div>
                      <div className="text-[20px] font-extrabold text-foreground dark:text-success leading-tight">
                        {currencySymbol}{Number(product.sale_price_max).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-muted-foreground leading-tight">
                        Costo: {currencySymbol}{Number(product.purchase_price_local || 0).toLocaleString()}
                      </div>
                      <div className="text-[11px] text-destructive leading-tight">
                        Descuento: {currencySymbol}{Number(product.sale_price_min || 0).toLocaleString()}
                      </div>
                    </div>
                  )}
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
                  <th className="hidden md:table-cell px-4 py-3 text-left text-sm font-medium text-muted-foreground">Categoría</th>
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
      </div>
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
              Esta acción no se puede deshacer. Se eliminará permanentemente el producto "{deleteProduct?.name}".
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
