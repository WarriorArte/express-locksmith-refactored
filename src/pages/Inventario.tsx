import { useState, useEffect } from "react";
import { EmptyState } from "@/design-system/feedback/EmptyState";
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
import { ProductTile } from "@/components/products/ProductTile";
import { NativeSelectButton } from "@/design-system/pickers";
import { MaterialShape } from "@/design-system/shapes/MaterialShape";
import { spawnRipple } from "@/lib/ripple";

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
  // Texto de las tarjetas: precio protagonista y stock en palabras (antes "T:3 · B:2").
  const tilePrice = (product: Product, serviceTotals: ReturnType<typeof getServiceTotals> | null) =>
    `${currencySymbol}${(serviceTotals ? serviceTotals.totalWithProducts : Number(product.sale_price_max || 0)).toLocaleString()}`;
  const tileSupporting = (product: Product, serviceTotals: ReturnType<typeof getServiceTotals> | null) =>
    serviceTotals
      ? `Mano de obra ${currencySymbol}${serviceTotals.labor.toLocaleString()}`
      : `${product.stock_store} en tienda · ${product.stock_warehouse} en bodega`;

  const openDetail = (p: Product) => {
    setDetailProduct(p);
    setDetailOpen(true);
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      {/* Header bar - ya NO es sticky */}
      <div className="bg-background px-5 lg:px-6 pt-app-top lg:pt-3 pb-4">
        <PageHeader
          title="Inventario"
          subtitle={<>{productsCount} productos · {servicesCount} servicios{lowStockCount > 0 && <span className="text-warning"> · {lowStockCount} alertas de stock</span>}</>}
          action={<div className="flex gap-2"><Button variant="secondary" onClick={() => setCategoryDialogOpen(true)}><Palette className="w-4 h-4" />Categorías</Button><Button onClick={handleNewProduct}><Plus className="w-4 h-4 mr-1" />Nuevo</Button></div>}
        >
          <div className="flex flex-row items-center gap-2">
            <UnifiedSearchInput
              className="flex-1 min-w-0"
              placeholder="Buscar producto..."
              value={searchQuery}
              onChange={setSearchQuery}
            />
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                aria-label="Gestionar categorías"
                onClick={() => setCategoryDialogOpen(true)}
                onPointerDown={spawnRipple}
                className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-card text-foreground shadow-sm lg:hidden"
              >
                <Palette className="h-[18px] w-[18px]" />
              </button>
              {/* Filtro de categoría con la lista NATIVA del sistema */}
              <NativeSelectButton
                icon={<Filter className="h-[18px] w-[18px]" />}
                label="Filtrar por categoría"
                value={selectedCategory}
                onChange={setSelectedCategory}
                options={[
                  { value: "all", label: "Todas las categorías" },
                  { value: "__services__", label: "Servicios" },
                  ...(categories ?? []).map((cat) => ({ value: cat.id, label: cat.name })),
                ]}
                className={selectedCategory !== "all" ? "bg-accent text-accent-foreground" : undefined}
              />
              <div className="hidden gap-1 rounded-full bg-background/70 p-1 lg:flex">
                <Button
                  variant={viewMode === "grid" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  aria-label="Ver en cuadrícula"
                  className="h-8 w-10"
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "default" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  aria-label="Ver en lista"
                  className="h-8 w-10"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              {/* En móvil, "nuevo" lo hace el botón + de la barra inferior */}
            </div>
          </div>
        </PageHeader>
      </div>

      <div className="flex-1 min-h-0 overflow-auto overscroll-y-contain px-5 lg:px-6 pb-mobile-nav no-scrollbar">
      {/* Skeleton */}
      {isLoading && viewMode === "grid" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 sm:gap-4" aria-busy="true">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className="overflow-hidden rounded-[24px] bg-card shadow-sm">
              <div className="aspect-square animate-pulse bg-muted" />
              <div className="space-y-2 p-3.5">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-5 w-1/2 animate-pulse rounded bg-muted" />
                <div className="mt-3 h-10 w-full animate-pulse rounded-full bg-muted" />
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
        <EmptyState
          icon={Package}
          title={searchQuery ? "Sin resultados" : "Sin productos registrados"}
          description={searchQuery ? "Prueba con otro nombre o cambia el filtro de categoría." : "Agrega productos o servicios para gestionar tu inventario y precios."}
          action={!searchQuery ? { label: "Agregar producto", onClick: handleNewProduct } : undefined}
        />
      )}

      {/* MOBILE products view (Redesign v2) */}
      {!isLoading && filteredProducts.length > 0 && <div className="lg:hidden">
        {viewMode === "grid" ? (
          <>
            <p className="mb-3 px-1 text-sm tabular-nums text-muted-foreground">
              {filteredProducts.length} {filteredProducts.length === 1 ? "artículo" : "artículos"}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((product) => {
                const isService = (product.item_type ?? "product") === "service";
                const serviceTotals = isService ? getServiceTotals(product) : null;
                return (
                  <ProductTile
                    key={product.id}
                    name={product.name}
                    imageUrl={product.image_url}
                    isService={isService}
                    price={tilePrice(product, serviceTotals)}
                    supporting={tileSupporting(product, serviceTotals)}
                    lowStock={!isService && getStockStatus(product) === "low"}
                    onOpen={() => openDetail(product)}
                    onSell={() => handleSell(product)}
                  />
                );
              })}
            </div>
          </>
        ) : (
          <div className="m3-list">
            {filteredProducts.map((product) => {
              const isService = (product.item_type ?? "product") === "service";
              const serviceTotals = isService ? getServiceTotals(product) : null;
              const low = !isService && getStockStatus(product) === "low";
              return (
                <div key={product.id} className="m3-list-item flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => openDetail(product)}
                    className="flex min-w-0 flex-1 items-center gap-3 text-left"
                  >
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted text-muted-foreground">
                      {product.image_url ? (
                        <img src={resolveStorageUrl(product.image_url) ?? undefined} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <Package className="h-5 w-5" />
                      )}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-base font-medium text-foreground">{product.name}</span>
                      <span className={low ? "block truncate text-sm font-medium text-warning" : "block truncate text-sm text-muted-foreground"}>
                        {low ? "Stock bajo · " : ""}{tileSupporting(product, serviceTotals)}
                      </span>
                    </span>
                  </button>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="text-base font-semibold tabular-nums text-foreground">{tilePrice(product, serviceTotals)}</span>
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleSell(product)}>
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
          {filteredProducts.map((product) => {
            const isService = (product.item_type ?? "product") === "service";
            const serviceTotals = isService ? getServiceTotals(product) : null;
            return (
              <ProductTile
                key={product.id}
                name={product.name}
                imageUrl={product.image_url}
                isService={isService}
                price={tilePrice(product, serviceTotals)}
                supporting={tileSupporting(product, serviceTotals)}
                lowStock={!isService && getStockStatus(product) === "low"}
                onOpen={() => { setDetailProduct(product); setDetailOpen(true); }}
                onSell={() => handleSell(product)}
                menu={
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="ghost" aria-label={`Más acciones de ${product.name}`} className="h-9 w-9 bg-background/85 shadow-sm hover:bg-background">
                        <MoreVertical className="w-4 h-4" />
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
                      <DropdownMenuItem className="text-destructive" onClick={() => setDeleteProduct(product)}>
                        <Trash2 className="w-4 h-4 mr-2" /> Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                }
              />
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
