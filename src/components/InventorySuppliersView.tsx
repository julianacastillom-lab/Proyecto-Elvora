import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Mail,
  MapPin,
  MessageCircle,
  PackagePlus,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  Truck,
  X,
} from 'lucide-react';
import {
  InventoryCategory,
  InventoryItem,
  Supplier,
  SupplierMaterialPrice,
} from '../types/elvora';
import { findSuppliersForMaterial, getLowStockItems } from '../utils/calculations';

interface InventorySuppliersViewProps {
  inventory: InventoryItem[];
  suppliers: Supplier[];
  onAddInventory: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateInventory: (item: InventoryItem) => void;
  onDeleteInventory: (id: string) => void;
  onAddSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  onDeleteSupplier: (id: string) => void;
}

const CATEGORIES: Array<'Todas' | InventoryCategory> = [
  'Todas',
  'Telas',
  'Prendas',
  'Hilos',
  'Botones',
  'Otros materiales',
];

const EMPTY_ITEM_FORM = {
  code: '',
  name: '',
  category: 'Telas' as InventoryCategory,
  quantity: 0,
  unit: 'm',
  unitCost: 0,
  minStock: 10,
};

const EMPTY_SUPPLIER_FORM = {
  name: '',
  company: '',
  phone: '',
  whatsapp: '',
  email: '',
  address: '',
  city: '',
  deliveryDays: 3,
  materialsSupplied: [] as SupplierMaterialPrice[],
};

export function InventorySuppliersView({
  inventory,
  suppliers,
  onAddInventory,
  onUpdateInventory,
  onDeleteInventory,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
}: InventorySuppliersViewProps) {
  const [activeTab, setActiveTab] = useState<'inventario' | 'proveedores'>('inventario');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'Todas' | InventoryCategory>('Todas');
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // Selected material for supplier lookup drawer
  const [selectedMaterialForReplenish, setSelectedMaterialForReplenish] =
    useState<InventoryItem | null>(null);
  const [restockQty, setRestockQty] = useState<number>(50);

  // Item Modal
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);
  const [itemError, setItemError] = useState('');

  // Supplier Modal
  const [supplierModalOpen, setSupplierModalOpen] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [supplierForm, setSupplierForm] = useState(EMPTY_SUPPLIER_FORM);
  const [supplierError, setSupplierError] = useState('');

  // Temp material row inside supplier form
  const [matDraftCode, setMatDraftCode] = useState('');
  const [matDraftPrice, setMatDraftPrice] = useState<number>(0);

  const lowStockItems = useMemo(() => getLowStockItems(inventory), [inventory]);

  const filteredInventory = useMemo(() => {
    const q = search.trim().toLowerCase();
    return inventory.filter((item) => {
      if (categoryFilter !== 'Todas' && item.category !== categoryFilter) return false;
      if (onlyLowStock && item.quantity > item.minStock) return false;
      if (
        q &&
        !item.name.toLowerCase().includes(q) &&
        !item.code.toLowerCase().includes(q) &&
        !item.category.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [inventory, categoryFilter, onlyLowStock, search]);

  const filteredSuppliers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return suppliers.filter((s) => {
      if (!q) return true;
      return (
        s.company.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.city.toLowerCase().includes(q) ||
        s.materialsSupplied.some(
          (m) =>
            m.materialName.toLowerCase().includes(q) ||
            m.materialCode.toLowerCase().includes(q)
        )
      );
    });
  }, [suppliers, search]);

  const matchedSuppliersForMaterial = useMemo(() => {
    if (!selectedMaterialForReplenish) return [];
    return findSuppliersForMaterial(selectedMaterialForReplenish, suppliers);
  }, [selectedMaterialForReplenish, suppliers]);

  const openNewItemModal = () => {
    setEditingItemId(null);
    setItemForm(EMPTY_ITEM_FORM);
    setItemError('');
    setItemModalOpen(true);
  };

  const openEditItemModal = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setItemForm({
      code: item.code,
      name: item.name,
      category: item.category,
      quantity: item.quantity,
      unit: item.unit,
      unitCost: item.unitCost,
      minStock: item.minStock,
    });
    setItemError('');
    setItemModalOpen(true);
  };

  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.code.trim() || !itemForm.name.trim()) {
      setItemError('El código y el nombre del producto son obligatorios.');
      return;
    }
    if (itemForm.quantity < 0 || itemForm.unitCost < 0 || itemForm.minStock < 0) {
      setItemError('Las cantidades y costos no pueden ser negativos.');
      return;
    }

    if (editingItemId) {
      const existing = inventory.find((i) => i.id === editingItemId);
      onUpdateInventory({
        id: editingItemId,
        ...itemForm,
        code: itemForm.code.trim().toUpperCase(),
        name: itemForm.name.trim(),
        isDemo: existing?.isDemo,
      });
    } else {
      onAddInventory({
        ...itemForm,
        code: itemForm.code.trim().toUpperCase(),
        name: itemForm.name.trim(),
        isDemo: false,
      });
    }
    setItemModalOpen(false);
  };

  const openNewSupplierModal = () => {
    setEditingSupplierId(null);
    setSupplierForm(EMPTY_SUPPLIER_FORM);
    setMatDraftCode(inventory[0]?.code ?? '');
    setMatDraftPrice(inventory[0]?.unitCost ?? 0);
    setSupplierError('');
    setSupplierModalOpen(true);
  };

  const openEditSupplierModal = (s: Supplier) => {
    setEditingSupplierId(s.id);
    setSupplierForm({
      name: s.name,
      company: s.company,
      phone: s.phone,
      whatsapp: s.whatsapp,
      email: s.email,
      address: s.address,
      city: s.city,
      deliveryDays: s.deliveryDays,
      materialsSupplied: [...s.materialsSupplied],
    });
    setMatDraftCode(inventory[0]?.code ?? '');
    setMatDraftPrice(inventory[0]?.unitCost ?? 0);
    setSupplierError('');
    setSupplierModalOpen(true);
  };

  const handleAddMaterialToSupplier = () => {
    const invItem = inventory.find((i) => i.code === matDraftCode);
    if (!invItem) return;
    if (supplierForm.materialsSupplied.some((m) => m.materialCode === invItem.code)) return;
    setSupplierForm((prev) => ({
      ...prev,
      materialsSupplied: [
        ...prev.materialsSupplied,
        {
          materialCode: invItem.code,
          materialName: invItem.name,
          price: Math.max(0, matDraftPrice),
          unit: invItem.unit,
        },
      ],
    }));
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierForm.company.trim() || !supplierForm.name.trim()) {
      setSupplierError('El nombre de la empresa y del contacto son obligatorios.');
      return;
    }
    if (editingSupplierId) {
      const existing = suppliers.find((s) => s.id === editingSupplierId);
      onUpdateSupplier({
        id: editingSupplierId,
        ...supplierForm,
        isDemo: existing?.isDemo,
      });
    } else {
      onAddSupplier({ ...supplierForm, isDemo: false });
    }
    setSupplierModalOpen(false);
  };

  const handleQuickRestock = () => {
    if (!selectedMaterialForReplenish || restockQty <= 0) return;
    const latest = inventory.find((i) => i.id === selectedMaterialForReplenish.id);
    if (!latest) return;
    const updated = { ...latest, quantity: Number((latest.quantity + restockQty).toFixed(2)) };
    onUpdateInventory(updated);
    setSelectedMaterialForReplenish(updated);
  };

  return (
    <div className="space-y-6">
      {/* Top Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex rounded-lg border border-[#E4DCD0] bg-[#F1ECE4] p-1"
          role="tablist"
          aria-label="Submódulos de inventario y proveedores"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'inventario'}
            onClick={() => setActiveTab('inventario')}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'inventario'
                ? 'bg-white text-[#141210] shadow-xs'
                : 'text-[#5A5046] hover:text-[#141210]'
            }`}
          >
            Inventario ({inventory.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'proveedores'}
            onClick={() => setActiveTab('proveedores')}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === 'proveedores'
                ? 'bg-white text-[#141210] shadow-xs'
                : 'text-[#5A5046] hover:text-[#141210]'
            }`}
          >
            Proveedores ({suppliers.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#6B5E52]"
              aria-hidden="true"
            />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeTab === 'inventario'
                  ? 'Buscar código o material...'
                  : 'Buscar proveedor, ciudad o material...'
              }
              aria-label="Buscar en inventario o proveedores"
              className="h-10 w-full rounded-lg border border-[#D8CEC0] bg-white pr-3 pl-9 text-sm text-[#141210] placeholder:text-[#8C7E70] focus:border-[#141210] focus:outline-none"
            />
          </div>

          {activeTab === 'inventario' ? (
            <button
              type="button"
              onClick={openNewItemModal}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-[#141210] px-4 text-sm font-medium text-[#FAF7F2] transition-colors hover:bg-[#2C2621]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Nuevo producto</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={openNewSupplierModal}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-[#141210] px-4 text-sm font-medium text-[#FAF7F2] transition-colors hover:bg-[#2C2621]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              <span>Nuevo proveedor</span>
            </button>
          )}
        </div>
      </div>

      {/* Low Stock Banner */}
      {lowStockItems.length > 0 && activeTab === 'inventario' && (
        <div className="flex flex-col gap-3 rounded-xl border border-[#D9B8A6] bg-[#FDF7F3] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-[#991B1B]" aria-hidden="true" />
            <div>
              <p className="text-sm font-semibold text-[#141210]">
                {lowStockItems.length} material(es) en existencias bajas
              </p>
              <p className="text-xs text-[#5A5046]">
                {lowStockItems.map((i) => `${i.name} (${i.quantity}/${i.minStock} ${i.unit})`).join(' · ')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOnlyLowStock((prev) => !prev)}
            className={`whitespace-nowrap rounded-lg border px-3.5 py-2 text-xs font-medium transition-colors ${
              onlyLowStock
                ? 'border-[#991B1B] bg-[#991B1B] text-white'
                : 'border-[#D8CEC0] bg-white text-[#141210] hover:bg-[#F1ECE4]'
            }`}
          >
            {onlyLowStock ? 'Ver todo el inventario' : 'Filtrar stock bajo'}
          </button>
        </div>
      )}

      {activeTab === 'inventario' ? (
        <div className="space-y-6">
          {/* Category Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategoryFilter(cat)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryFilter === cat
                    ? 'bg-[#6B4E3D] text-[#FAF7F2]'
                    : 'border border-[#E4DCD0] bg-white text-[#5A5046] hover:text-[#141210]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            {/* Inventory Table */}
            <div
              className={`rounded-xl border border-[#E4DCD0] bg-white ${
                selectedMaterialForReplenish ? 'xl:col-span-2' : 'xl:col-span-3'
              }`}
            >
              {filteredInventory.length === 0 ? (
                <div className="p-10 text-center">
                  <p className="text-sm font-medium text-[#141210]">
                    No se encontraron productos con los filtros aplicados.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSearch('');
                      setCategoryFilter('Todas');
                      setOnlyLowStock(false);
                    }}
                    className="mt-3 rounded-lg border border-[#D8CEC0] px-4 py-2 text-xs font-medium text-[#141210] hover:bg-[#F1ECE4]"
                  >
                    Limpiar filtros
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-[#E4DCD0] bg-[#FAF7F2] text-xs text-[#6B5E52]">
                        <th className="px-4 py-3 font-medium">Código</th>
                        <th className="px-4 py-3 font-medium">Producto / Material</th>
                        <th className="px-4 py-3 font-medium">Categoría</th>
                        <th className="px-4 py-3 text-right font-medium">Disponible</th>
                        <th className="px-4 py-3 text-right font-medium">Mínimo</th>
                        <th className="px-4 py-3 text-right font-medium">Costo Unit.</th>
                        <th className="px-4 py-3 font-medium">Estado</th>
                        <th className="px-4 py-3 text-right font-medium">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F1ECE4]">
                      {filteredInventory.map((item) => {
                        const isLow = item.quantity <= item.minStock;
                        const isSelected = selectedMaterialForReplenish?.id === item.id;
                        return (
                          <tr
                            key={item.id}
                            className={`transition-colors hover:bg-[#FAF7F2] ${
                              isSelected ? 'bg-[#F1ECE4]/60' : ''
                            }`}
                          >
                            <td className="px-4 py-3 font-mono text-xs text-[#5A5046]">
                              {item.code}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#141210]">
                              {item.name}
                            </td>
                            <td className="px-4 py-3 text-xs text-[#5A5046]">
                              {item.category}
                            </td>
                            <td
                              className={`px-4 py-3 text-right font-mono tabular-nums ${
                                isLow ? 'font-semibold text-[#991B1B]' : 'text-[#141210]'
                              }`}
                            >
                              {item.quantity} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-[#6B5E52]">
                              {item.minStock} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-right font-mono tabular-nums text-[#141210]">
                              ${item.unitCost.toLocaleString('es-CO')}
                            </td>
                            <td className="px-4 py-3 text-xs">
                              {isLow ? (
                                <span className="inline-flex items-center gap-1 font-medium text-[#991B1B]">
                                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                                  Stock bajo
                                </span>
                              ) : (
                                <span className="font-medium text-[#4A5D4E]">Normal</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedMaterialForReplenish(item)}
                                  className="inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-[#D8CEC0] bg-white px-2.5 py-1.5 text-xs font-medium text-[#141210] hover:bg-[#F1ECE4]"
                                  aria-label={`Ver proveedores para ${item.name}`}
                                >
                                  <Truck className="h-3.5 w-3.5" aria-hidden="true" />
                                  <span>Proveedores</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditItemModal(item)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E4DCD0] text-[#5A5046] hover:bg-[#F1ECE4] hover:text-[#141210]"
                                  aria-label={`Editar ${item.name}`}
                                >
                                  <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteInventory(item.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E4DCD0] text-[#5A5046] hover:bg-[#FDF2F2] hover:text-[#991B1B]"
                                  aria-label={`Eliminar ${item.name}`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Replenishment & Matching Suppliers Panel */}
            {selectedMaterialForReplenish && (
              <aside
                aria-label="Reposición y proveedores disponibles"
                className="rounded-xl border border-[#8C6D53] bg-white p-5"
              >
                <div className="flex items-start justify-between gap-3 border-b border-[#E4DCD0] pb-4">
                  <div>
                    <p className="text-xs font-medium text-[#6B4E3D]">
                      Reposición de material · {selectedMaterialForReplenish.code}
                    </p>
                    <h3 className="mt-0.5 text-lg font-semibold text-[#141210]">
                      {selectedMaterialForReplenish.name}
                    </h3>
                    <p className="mt-1 font-mono text-xs text-[#5A5046]">
                      Stock actual: {selectedMaterialForReplenish.quantity}{' '}
                      {selectedMaterialForReplenish.unit} · Mínimo:{' '}
                      {selectedMaterialForReplenish.minStock}{' '}
                      {selectedMaterialForReplenish.unit}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedMaterialForReplenish(null)}
                    aria-label="Cerrar panel de proveedores"
                    className="rounded-md p-1 text-[#6B5E52] hover:bg-[#F1ECE4] hover:text-[#141210]"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                {/* Quick Restock Input */}
                <div className="mt-4 rounded-lg bg-[#FAF7F2] p-3.5">
                  <label
                    htmlFor="restock-qty-input"
                    className="block text-xs font-medium text-[#141210]"
                  >
                    Registrar ingreso de reposición ({selectedMaterialForReplenish.unit})
                  </label>
                  <div className="mt-2 flex gap-2">
                    <input
                      id="restock-qty-input"
                      type="number"
                      min={1}
                      value={restockQty}
                      onChange={(e) => setRestockQty(Number(e.target.value))}
                      className="h-9 w-28 rounded-md border border-[#D8CEC0] bg-white px-2.5 font-mono text-sm text-[#141210]"
                    />
                    <button
                      type="button"
                      onClick={handleQuickRestock}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-[#4A5D4E] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#3A4A3D]"
                    >
                      <PackagePlus className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Sumar al stock</span>
                    </button>
                  </div>
                </div>

                {/* Suppliers List */}
                <div className="mt-5">
                  <h4 className="text-xs font-semibold tracking-wide text-[#5A5046]">
                    Proveedores que suministran este material ({matchedSuppliersForMaterial.length})
                  </h4>

                  {matchedSuppliersForMaterial.length === 0 ? (
                    <p className="mt-3 text-xs text-[#6B5E52]">
                      Ningún proveedor registrado tiene asociado el código{' '}
                      {selectedMaterialForReplenish.code}. Agrega este material en la pestaña
                      Proveedores.
                    </p>
                  ) : (
                    <div className="mt-3 space-y-3">
                      {matchedSuppliersForMaterial.map(({ supplier, price, unit }) => (
                        <div
                          key={supplier.id}
                          className="rounded-lg border border-[#E4DCD0] p-3.5"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-[#141210]">
                                {supplier.company}
                              </div>
                              <div className="text-xs text-[#5A5046]">
                                Contacto: {supplier.name} · {supplier.city}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-mono text-sm font-semibold text-[#6B4E3D]">
                                ${price.toLocaleString('es-CO')}/{unit}
                              </div>
                              <div className="font-mono text-xs text-[#5A5046]">
                                Entrega: {supplier.deliveryDays} días
                              </div>
                            </div>
                          </div>
                          <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-[#4A4036]">
                            <span className="inline-flex items-center gap-1">
                              <Phone className="h-3 w-3" aria-hidden="true" />
                              {supplier.phone}
                            </span>
                            <a
                              href={`https://wa.me/${supplier.whatsapp}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 font-medium text-[#4A5D4E] hover:underline"
                            >
                              <MessageCircle className="h-3 w-3" aria-hidden="true" />
                              WhatsApp {supplier.whatsapp}
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </aside>
            )}
          </div>
        </div>
      ) : (
        /* Suppliers Directory */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredSuppliers.map((supplier) => (
            <article
              key={supplier.id}
              className="flex flex-col justify-between rounded-xl border border-[#E4DCD0] bg-white p-5"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-[#6B4E3D]" aria-hidden="true" />
                      <h3 className="text-base font-semibold text-[#141210]">
                        {supplier.company}
                      </h3>
                    </div>
                    <p className="mt-1 text-xs text-[#5A5046]">
                      Representante: {supplier.name} · Entrega promedio{' '}
                      <span className="font-mono font-medium text-[#141210]">
                        {supplier.deliveryDays} días
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditSupplierModal(supplier)}
                      aria-label={`Editar proveedor ${supplier.company}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E4DCD0] text-[#5A5046] hover:bg-[#F1ECE4]"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteSupplier(supplier.id)}
                      aria-label={`Eliminar proveedor ${supplier.company}`}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E4DCD0] text-[#5A5046] hover:bg-[#FDF2F2] hover:text-[#991B1B]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs text-[#4A4036] sm:grid-cols-2">
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-[#8C6D53]" aria-hidden="true" />
                    <span>{supplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MessageCircle className="h-3.5 w-3.5 text-[#4A5D4E]" aria-hidden="true" />
                    <span>WhatsApp: {supplier.whatsapp}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-[#8C6D53]" aria-hidden="true" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-[#8C6D53]" aria-hidden="true" />
                    <span className="truncate">
                      {supplier.address}, {supplier.city}
                    </span>
                  </div>
                </div>

                <div className="mt-4 border-t border-[#F1ECE4] pt-3">
                  <p className="text-xs font-medium text-[#6B5E52]">
                    Materiales suministrados y precios
                  </p>
                  {supplier.materialsSupplied.length === 0 ? (
                    <p className="mt-1 text-xs text-[#8C7E70]">Sin materiales asociados.</p>
                  ) : (
                    <div className="mt-2 divide-y divide-[#F1ECE4]">
                      {supplier.materialsSupplied.map((mat) => (
                        <div
                          key={mat.materialCode}
                          className="flex items-center justify-between py-1.5 text-xs"
                        >
                          <span className="text-[#141210]">
                            <span className="font-mono text-[#6B5E52]">{mat.materialCode}</span> ·{' '}
                            {mat.materialName}
                          </span>
                          <span className="font-mono font-medium tabular-nums text-[#6B4E3D]">
                            ${mat.price.toLocaleString('es-CO')} / {mat.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Inventory Item Modal */}
      {itemModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141210]/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingItemId ? 'Editar producto' : 'Nuevo producto de inventario'}
        >
          <div className="w-full max-w-lg rounded-xl border border-[#E4DCD0] bg-white p-6">
            <div className="flex items-center justify-between border-b border-[#E4DCD0] pb-3">
              <h3 className="text-xl font-semibold text-[#141210]">
                {editingItemId ? 'Editar Producto' : 'Registrar Producto o Material'}
              </h3>
              <button
                type="button"
                onClick={() => setItemModalOpen(false)}
                aria-label="Cerrar modal de producto"
                className="rounded-md p-1 text-[#6B5E52] hover:bg-[#F1ECE4]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="mt-4 space-y-4">
              {itemError && (
                <p className="rounded-md bg-[#FDF2F2] px-3 py-2 text-xs font-medium text-[#991B1B]">
                  {itemError}
                </p>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="inv-code" className="block text-xs font-medium text-[#4A4036]">
                    Código SKU
                  </label>
                  <input
                    id="inv-code"
                    type="text"
                    required
                    value={itemForm.code}
                    onChange={(e) => setItemForm({ ...itemForm, code: e.target.value })}
                    placeholder="Ej: TEL-004"
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="inv-cat" className="block text-xs font-medium text-[#4A4036]">
                    Categoría
                  </label>
                  <select
                    id="inv-cat"
                    value={itemForm.category}
                    onChange={(e) =>
                      setItemForm({ ...itemForm, category: e.target.value as InventoryCategory })
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm"
                  >
                    <option value="Telas">Telas</option>
                    <option value="Prendas">Prendas</option>
                    <option value="Hilos">Hilos</option>
                    <option value="Botones">Botones</option>
                    <option value="Otros materiales">Otros materiales</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="inv-name" className="block text-xs font-medium text-[#4A4036]">
                  Nombre del material o prenda
                </label>
                <input
                  id="inv-name"
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="Ej: Seda Satinada Crema"
                  className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label htmlFor="inv-qty" className="block text-xs font-medium text-[#4A4036]">
                    Cantidad
                  </label>
                  <input
                    id="inv-qty"
                    type="number"
                    min={0}
                    step="0.1"
                    required
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: Number(e.target.value) })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="inv-unit" className="block text-xs font-medium text-[#4A4036]">
                    Unidad
                  </label>
                  <input
                    id="inv-unit"
                    type="text"
                    required
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    placeholder="m / und"
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="inv-min" className="block text-xs font-medium text-[#4A4036]">
                    Stock mínimo
                  </label>
                  <input
                    id="inv-min"
                    type="number"
                    min={0}
                    required
                    value={itemForm.minStock}
                    onChange={(e) => setItemForm({ ...itemForm, minStock: Number(e.target.value) })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="inv-cost" className="block text-xs font-medium text-[#4A4036]">
                    Costo unit. ($)
                  </label>
                  <input
                    id="inv-cost"
                    type="number"
                    min={0}
                    required
                    value={itemForm.unitCost}
                    onChange={(e) => setItemForm({ ...itemForm, unitCost: Number(e.target.value) })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[#E4DCD0] pt-4">
                <button
                  type="button"
                  onClick={() => setItemModalOpen(false)}
                  className="rounded-lg border border-[#D8CEC0] px-4 py-2 text-sm font-medium text-[#141210] hover:bg-[#F1ECE4]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#141210] px-4 py-2 text-sm font-medium text-[#FAF7F2] hover:bg-[#2C2621]"
                >
                  Guardar producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier Modal */}
      {supplierModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141210]/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingSupplierId ? 'Editar proveedor' : 'Nuevo proveedor'}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E4DCD0] bg-white p-6">
            <div className="flex items-center justify-between border-b border-[#E4DCD0] pb-3">
              <h3 className="text-xl font-semibold text-[#141210]">
                {editingSupplierId ? 'Editar Proveedor' : 'Registrar Proveedor'}
              </h3>
              <button
                type="button"
                onClick={() => setSupplierModalOpen(false)}
                aria-label="Cerrar modal de proveedor"
                className="rounded-md p-1 text-[#6B5E52] hover:bg-[#F1ECE4]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="mt-4 space-y-4">
              {supplierError && (
                <p className="rounded-md bg-[#FDF2F2] px-3 py-2 text-xs font-medium text-[#991B1B]">
                  {supplierError}
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="sup-company" className="block text-xs font-medium text-[#4A4036]">
                    Empresa
                  </label>
                  <input
                    id="sup-company"
                    type="text"
                    required
                    value={supplierForm.company}
                    onChange={(e) => setSupplierForm({ ...supplierForm, company: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="sup-name" className="block text-xs font-medium text-[#4A4036]">
                    Nombre del contacto
                  </label>
                  <input
                    id="sup-name"
                    type="text"
                    required
                    value={supplierForm.name}
                    onChange={(e) => setSupplierForm({ ...supplierForm, name: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="sup-phone" className="block text-xs font-medium text-[#4A4036]">
                    Teléfono
                  </label>
                  <input
                    id="sup-phone"
                    type="text"
                    value={supplierForm.phone}
                    onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="sup-wa" className="block text-xs font-medium text-[#4A4036]">
                    WhatsApp
                  </label>
                  <input
                    id="sup-wa"
                    type="text"
                    value={supplierForm.whatsapp}
                    onChange={(e) => setSupplierForm({ ...supplierForm, whatsapp: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="sup-email" className="block text-xs font-medium text-[#4A4036]">
                    Correo electrónico
                  </label>
                  <input
                    id="sup-email"
                    type="email"
                    value={supplierForm.email}
                    onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="sup-city" className="block text-xs font-medium text-[#4A4036]">
                    Ciudad
                  </label>
                  <input
                    id="sup-city"
                    type="text"
                    value={supplierForm.city}
                    onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="sup-addr" className="block text-xs font-medium text-[#4A4036]">
                    Dirección
                  </label>
                  <input
                    id="sup-addr"
                    type="text"
                    value={supplierForm.address}
                    onChange={(e) => setSupplierForm({ ...supplierForm, address: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="sup-days" className="block text-xs font-medium text-[#4A4036]">
                    Tiempo de entrega (días)
                  </label>
                  <input
                    id="sup-days"
                    type="number"
                    min={1}
                    value={supplierForm.deliveryDays}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, deliveryDays: Number(e.target.value) })
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                  />
                </div>
              </div>

              {/* Associate Materials */}
              <div className="rounded-lg border border-[#E4DCD0] bg-[#FAF7F2] p-4">
                <p className="text-xs font-semibold text-[#141210]">
                  Materiales que suministra y precio acordado
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    aria-label="Material del inventario"
                    value={matDraftCode}
                    onChange={(e) => {
                      setMatDraftCode(e.target.value);
                      const found = inventory.find((i) => i.code === e.target.value);
                      if (found) setMatDraftPrice(found.unitCost);
                    }}
                    className="h-9 flex-1 rounded-md border border-[#D8CEC0] bg-white px-2.5 text-xs"
                  >
                    {inventory.map((item) => (
                      <option key={item.id} value={item.code}>
                        {item.code} · {item.name} ({item.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    aria-label="Precio unitario del proveedor"
                    min={0}
                    value={matDraftPrice}
                    onChange={(e) => setMatDraftPrice(Number(e.target.value))}
                    className="h-9 w-28 rounded-md border border-[#D8CEC0] bg-white px-2.5 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddMaterialToSupplier}
                    className="h-9 rounded-md bg-[#6B4E3D] px-3 text-xs font-medium text-white hover:bg-[#573E30]"
                  >
                    Agregar material
                  </button>
                </div>

                {supplierForm.materialsSupplied.length > 0 && (
                  <ul className="mt-3 divide-y divide-[#E4DCD0] text-xs">
                    {supplierForm.materialsSupplied.map((mat) => (
                      <li
                        key={mat.materialCode}
                        className="flex items-center justify-between py-1.5"
                      >
                        <span>
                          <span className="font-mono">{mat.materialCode}</span> · {mat.materialName}
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-medium">
                            ${mat.price.toLocaleString('es-CO')}/{mat.unit}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSupplierForm((prev) => ({
                                ...prev,
                                materialsSupplied: prev.materialsSupplied.filter(
                                  (m) => m.materialCode !== mat.materialCode
                                ),
                              }))
                            }
                            aria-label={`Quitar ${mat.materialName}`}
                            className="text-[#991B1B] hover:underline"
                          >
                            Quitar
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-[#E4DCD0] pt-4">
                <button
                  type="button"
                  onClick={() => setSupplierModalOpen(false)}
                  className="rounded-lg border border-[#D8CEC0] px-4 py-2 text-sm font-medium text-[#141210] hover:bg-[#F1ECE4]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#141210] px-4 py-2 text-sm font-medium text-[#FAF7F2] hover:bg-[#2C2621]"
                >
                  Guardar proveedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
