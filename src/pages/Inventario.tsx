import { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { motion } from "framer-motion";
import { 
  Plus, 
  Package, 
  Grid3X3, 
  List,
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
  SelectValue,
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
import { ProductImageDialog } from "@/components/products/ProductImageDialog";
import { InventoryMovementDialog } from "@/components/products/InventoryMovementDialog";
import { InventoryHistoryDialog } from "@/components/products/InventoryHistoryDialog";
import { CategoryManagementDialog } from "@/components/products/CategoryManagementDialog";
import { SaleFormDialog } from "@/components/sales/SaleFormDialog";
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
    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory;
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

  const getStockStatus = (product: Product) => {
    const totalStock = product.stock_store + product.stock_warehouse;
    return totalStock < product.min_stock ? "low" : "normal";
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
    products?.filter((p) => p.stock_store + p.stock_warehouse < p.min_stock).length || 0;

  const openDetail = (p: Product) => {
    setDetailProduct(p);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* Sticky: Header + Filters */}
      <div className="sticky top-0 z-10 bg-background -mx-5 lg:-mx-6 px-5 lg:px-6 pb-4 relative">
        <div className="absolute inset-x-0 -top-10 lg:-top-2 h-10 lg:h-2 bg-background" />
        <PageHeader
          title="Inventario"
          subtitle={
            <>
              {products?.length || 0} productos
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
                aria-label="Nuevo producto"
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

        {/* MOBILE: search + chips */}
        <div className="lg:hidden space-y-3">
          <div className="flex items-center gap-2">
            <UnifiedSearchInput
              className="flex-1"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
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
          <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1">
            <button
              type="button"
              onClick={() => setSelectedCategory("all")}
              className={cn("chip whitespace-nowrap", selectedCategory === "all" ? "chip-active" : "chip-default")}
            >
              Todos
            </button>
            {categories?.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={cn("chip whitespace-nowrap", selectedCategory === cat.id ? "chip-active" : "chip-default")}
              >
                {cat.name}
              </button>
            ))}
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
          transition={{ delay: 0.1 }}
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
              <SelectTrigger className="w-full lg:w-48">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
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
              const cc = getCategoryColor(product.category_id);
              const cn_ = getCategoryName(product.category_id);
              return (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.03, 0.25) }}
                  onClick={() => openDetail(product)}
                  className="bg-card border border-border rounded-2xl overflow-hidden text-left active:scale-[0.98] transition-transform"
                >
                  <div className="relative h-28 bg-[hsl(var(--surface-2))] flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-9 h-9 text-muted-foreground" />
                    )}
                    <span
                      className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                      style={{ backgroundColor: `${cc}33`, color: cc }}
                    >
                      {cn_}
                    </span>
                    <span
                      onClick={(e) => { e.stopPropagation(); handleEdit(product); }}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-foreground/40 backdrop-blur flex items-center justify-center"
                    >
                      <Edit className="w-3 h-3 text-background" />
                    </span>
                    <span
                      className={cn(
                        "absolute bottom-1.5 right-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                        status === "low" ? "bg-warning/20 text-warning" : "bg-success/20 text-success",
                      )}
                    >
                      {status === "low" ? "Stock bajo" : "En stock"}
                    </span>
                  </div>
                  <div className="px-2.5 py-2.5">
                    <div className="text-[12px] font-bold text-foreground leading-tight line-clamp-2 mb-1.5 min-h-[28px]">
                      {product.name}
                    </div>
                    <div className="flex gap-1.5 mb-1">
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Store className="w-2.5 h-2.5" />T:{product.stock_store}
                      </span>
                      <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                        <Warehouse className="w-2.5 h-2.5" />B:{product.stock_warehouse}
                      </span>
                    </div>
                    <div className="text-[13px] font-extrabold text-primary leading-tight">
                      {currencySymbol}{Number(product.sale_price_max).toLocaleString()}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      Descuento: {currencySymbol}{Number(product.sale_price_min).toLocaleString()}
                    </div>
                    <Button
                      type="button"
                      className="w-full h-8 mt-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover text-[11px] font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSell(product);
                      }}
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Vender
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
              const cc = getCategoryColor(product.category_id);
              const cn_ = getCategoryName(product.category_id);
              return (
                <div
                  key={product.id}
                  onClick={() => openDetail(product)}
                  className="w-full flex items-center gap-3 px-3 py-3 active:bg-muted/50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-xl bg-[hsl(var(--surface-2))] flex items-center justify-center flex-shrink-0 overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-4 h-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-foreground truncate">{product.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-bold" style={{ color: cc }}>{cn_}</span>
                      <span className="text-[10px] text-muted-foreground">T:{product.stock_store} · B:{product.stock_warehouse}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className="text-[14px] font-extrabold text-primary">
                      {currencySymbol}{Number(product.sale_price_max).toLocaleString()}
                    </span>
                    <span className={cn(
                      "inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold",
                      status === "low" ? "bg-warning/20 text-warning" : "bg-success/20 text-success",
                    )}>
                      {status === "low" ? "Stock bajo" : "En stock"}
                    </span>
                    <Button
                      type="button"
                      className="h-7 px-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover text-[10px] font-semibold"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSell(product);
                      }}
                    >
                      <ShoppingCart className="w-3 h-3 mr-1" /> Vender
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
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {filteredProducts.map((product, index) => {
            const status = getStockStatus(product);
            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
                className="card-elevated overflow-hidden group"
              >
                {/* Product Image */}
                <div className="relative h-32 sm:h-40 bg-muted/50 flex items-center justify-center cursor-pointer" onClick={() => setImageProduct(product)}>
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-16 h-16 text-muted-foreground" />
                  )}
                  {status === "low" && (
                    <Badge className="absolute bottom-2 right-2 bg-warning text-warning-foreground">
                      Stock bajo
                    </Badge>
                  )}
                  <div className="absolute bottom-2 left-2">
                    <Badge 
                      style={{ backgroundColor: getCategoryColor(product.category_id) }}
                      className="text-xs text-white"
                    >
                      {getCategoryName(product.category_id)}
                    </Badge>
                  </div>
                  
                  {/* Actions overlay - Hidden on mobile, shown on hover for desktop */}
                  <div className="hidden md:flex absolute inset-0 bg-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center gap-2">
                    <Button size="icon" variant="secondary" className="rounded-full" onClick={(e) => { e.stopPropagation(); setImageProduct(product); }} title="Ver imagen">
                      <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="rounded-full" onClick={(e) => { e.stopPropagation(); setMovementProduct(product); }} title="Movimientos">
                      <Move className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="secondary" className="rounded-full" onClick={(e) => { e.stopPropagation(); setHistoryProduct(product); }} title="Historial">
                      <History className="w-4 h-4" />
                    </Button>
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
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setMovementProduct(product); }}>
                          <Move className="w-4 h-4 mr-2" /> Movimientos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setHistoryProduct(product); }}>
                          <History className="w-4 h-4 mr-2" /> Historial
                        </DropdownMenuItem>
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
                <div className="px-4 pt-3">
                  <Button
                    className="w-full h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary-hover font-semibold"
                    onClick={() => handleSell(product)}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1.5" /> Vender
                  </Button>
                </div>

                {/* Product Info */}
                <div className="px-4 pb-4 pt-3 space-y-3">
                  <h3 className="font-semibold text-foreground line-clamp-2 text-sm sm:text-base">{product.name}</h3>

                  {/* Stock */}
                  <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <Store className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{product.stock_store}</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                      <Warehouse className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium">{product.stock_warehouse}</span>
                    </div>
                  </div>

                  {/* Prices */}
                  <div className="flex items-center justify-between pt-2 border-t gap-2">
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      Costo: {currencySymbol}{product.purchase_price_local}
                    </div>
                    <div className="text-right">
                      <span className="text-base sm:text-lg font-bold text-success">
                        {currencySymbol}{product.sale_price_max}
                      </span>
                      <span className="text-xs text-muted-foreground"> - {currencySymbol}{product.sale_price_min}</span>
                    </div>
                  </div>
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
                  return (
                    <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-2 sm:px-4 py-3">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded bg-muted flex-shrink-0 flex items-center justify-center">
                            {product.image_url ? (
                              <img src={product.image_url} alt="" className="w-full h-full object-cover rounded" />
                            ) : (
                              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="font-medium text-sm sm:text-base line-clamp-1">{product.name}</span>
                            <div className="md:hidden">
                              <Badge 
                                style={{ backgroundColor: getCategoryColor(product.category_id) }}
                                className="text-xs text-white mt-1"
                              >
                                {getCategoryName(product.category_id)}
                              </Badge>
                            </div>
                            <div className="sm:hidden text-xs text-muted-foreground mt-1">
                              {currencySymbol}{product.sale_price_max}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="hidden md:table-cell px-4 py-3">
                        <Badge 
                          style={{ backgroundColor: getCategoryColor(product.category_id) }}
                          className="text-xs text-white"
                        >
                          {getCategoryName(product.category_id)}
                        </Badge>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-center">
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
                      </td>
                      <td className="hidden sm:table-cell px-4 py-3 text-right font-medium text-sm">{currencySymbol}{product.sale_price_max}</td>
                      <td className="hidden lg:table-cell px-4 py-3 text-center">
                        {status === "low" ? (
                          <Badge className="bg-warning text-warning-foreground">Bajo</Badge>
                        ) : (
                          <Badge className="bg-success text-success-foreground">Normal</Badge>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            className="h-8 rounded-lg bg-primary text-primary-foreground hover:bg-primary-hover"
                            onClick={() => handleSell(product)}
                          >
                            <ShoppingCart className="w-3.5 h-3.5 mr-1" /> Vender
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
                              <DropdownMenuItem onClick={() => setMovementProduct(product)}>
                                <Move className="w-4 h-4 mr-2" /> Movimientos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setHistoryProduct(product)}>
                                <History className="w-4 h-4 mr-2" /> Historial
                              </DropdownMenuItem>
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

      {/* Image Dialog */}
      <ProductImageDialog
        open={!!imageProduct}
        onOpenChange={() => setImageProduct(null)}
        imageUrl={imageProduct?.image_url || null}
        productName={imageProduct?.name || ""}
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
