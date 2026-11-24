import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Layers,
  Play,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  Client,
  InventoryItem,
  OrderMaterialReq,
  OrderStatus,
  ProductionOrder,
  Supplier,
} from '../types/elvora';
import {
  calculateOrderCapacityAndTime,
  evaluateOrderMaterials,
  findSuppliersForMaterial,
} from '../utils/calculations';

interface ProductionViewProps {
  orders: ProductionOrder[];
  clients: Client[];
  inventory: InventoryItem[];
  suppliers: Supplier[];
  operators: number;
  workHoursPerDay: number;
  onAddOrder: (order: Omit<ProductionOrder, 'id'>) => void;
  onUpdateOrderStatus: (orderId: string, nextStatus: OrderStatus) => { ok: boolean; message?: string };
  onDeductAndStartOrder: (orderId: string) => { ok: boolean; message?: string };
  onDeleteOrder: (orderId: string) => void;
}

const STATUS_OPTIONS: Array<'Todos' | OrderStatus> = [
  'Todos',
  'Pendiente',
  'En proceso',
  'Completado',
  'Retrasado',
];

export function ProductionView({
  orders,
  clients,
  inventory,
  suppliers,
  operators,
  workHoursPerDay,
  onAddOrder,
  onUpdateOrderStatus,
  onDeductAndStartOrder,
  onDeleteOrder,
}: ProductionViewProps) {
  const [statusFilter, setStatusFilter] = useState<'Todos' | OrderStatus>('Todos');
  const [search, setSearch] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [orderCode, setOrderCode] = useState(`OP-2026-0${orders.length + 1}`);
  const [clientId, setClientId] = useState(clients[0]?.id ?? '');
  const [garmentType, setGarmentType] = useState('');
  const [quantity, setQuantity] = useState(25);
  const [minutesPerGarment, setMinutesPerGarment] = useState(70);
  const [startDate, setStartDate] = useState('2026-11-22');
  const [dueDate, setDueDate] = useState('2026-12-02');
  const [materials, setMaterials] = useState<OrderMaterialReq[]>([]);
  const [draftItemId, setDraftItemId] = useState(inventory[0]?.id ?? '');
  const [draftQty, setDraftQty] = useState(20);
  const [formError, setFormError] = useState('');

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'Todos' && o.status !== statusFilter) return false;
      const clientName = clients.find((c) => c.id === o.clientId)?.name ?? '';
      if (
        q &&
        !o.orderCode.toLowerCase().includes(q) &&
        !o.garmentType.toLowerCase().includes(q) &&
        !clientName.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [orders, statusFilter, search, clients]);

  const plantDailyMinutes = operators * workHoursPerDay * 60;
  const completedUnits = orders
    .filter((o) => o.status === 'Completado')
    .reduce((sum, o) => sum + o.quantity, 0);
  const totalUnits = orders.reduce((sum, o) => sum + o.quantity, 0);
  const fulfillmentPct = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;

  const openNewModal = () => {
    setOrderCode(`OP-2026-0${orders.length + 1}`);
    setClientId(clients[0]?.id ?? '');
    setGarmentType('');
    setQuantity(25);
    setMinutesPerGarment(70);
    setStartDate('2026-11-22');
    setDueDate('2026-12-02');
    setMaterials([]);
    setDraftItemId(inventory[0]?.id ?? '');
    setDraftQty(20);
    setFormError('');
    setModalOpen(true);
  };

  const handleAddMaterialReq = () => {
    if (!draftItemId || draftQty <= 0) return;
    if (materials.some((m) => m.itemId === draftItemId)) {
      setMaterials((prev) =>
        prev.map((m) =>
          m.itemId === draftItemId ? { ...m, quantityRequired: m.quantityRequired + draftQty } : m
        )
      );
    } else {
      setMaterials((prev) => [...prev, { itemId: draftItemId, quantityRequired: draftQty }]);
    }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderCode.trim() || !garmentType.trim() || !clientId) {
      setFormError('Código, cliente y tipo de prenda son obligatorios.');
      return;
    }
    if (quantity <= 0 || minutesPerGarment <= 0) {
      setFormError('La cantidad y el tiempo por prenda deben ser mayores a 0.');
      return;
    }

    onAddOrder({
      orderCode: orderCode.trim().toUpperCase(),
      clientId,
      garmentType: garmentType.trim(),
      quantity,
      startDate,
      dueDate,
      materials,
      status: 'Pendiente',
      materialsDeducted: false,
      minutesPerGarment,
      isDemo: false,
    });
    setModalOpen(false);
    setFeedback({
      type: 'ok',
      text: `Orden ${orderCode.trim().toUpperCase()} registrada. Puedes iniciar y descontar materiales cuando el stock esté completo.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Plant Capacity Strip */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[#E4DCD0] bg-white p-5">
          <div className="flex items-center justify-between text-xs text-[#6B5E52]">
            <span>Capacidad diaria de planta</span>
            <Clock className="h-4 w-4 text-[#8C6D53]" aria-hidden="true" />
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#141210]">
            {Math.round(plantDailyMinutes / 60)} h/día
          </div>
          <p className="mt-1 text-xs text-[#5A5046]">
            {operators} operarios · {workHoursPerDay} horas/turno
          </p>
        </div>

        <div className="rounded-xl border border-[#E4DCD0] bg-white p-5">
          <div className="flex items-center justify-between text-xs text-[#6B5E52]">
            <span>Cumplimiento de pedidos</span>
            <CheckCircle2 className="h-4 w-4 text-[#4A5D4E]" aria-hidden="true" />
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#141210]">
            {fulfillmentPct}%
          </div>
          <p className="mt-1 text-xs text-[#5A5046]">
            {completedUnits} de {totalUnits} prendas completadas
          </p>
        </div>

        <div className="rounded-xl border border-[#E4DCD0] bg-white p-5">
          <div className="flex items-center justify-between text-xs text-[#6B5E52]">
            <span>Órdenes activas / pendientes</span>
            <Layers className="h-4 w-4 text-[#6B4E3D]" aria-hidden="true" />
          </div>
          <div className="mt-2 font-mono text-2xl font-semibold tabular-nums text-[#141210]">
            {orders.filter((o) => o.status !== 'Completado').length}
          </div>
          <p className="mt-1 text-xs text-[#5A5046]">
            Descuento automático de inventario al iniciar orden
          </p>
        </div>
      </section>

      {feedback && (
        <div
          role="status"
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            feedback.type === 'error'
              ? 'border-[#D9B8A6] bg-[#FDF2F2] text-[#991B1B]'
              : 'border-[#B7C9BA] bg-[#F3F7F4] text-[#2F4533]'
          }`}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Cerrar aviso"
            className="text-xs underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                statusFilter === st
                  ? 'bg-[#141210] text-[#FAF7F2]'
                  : 'border border-[#E4DCD0] bg-white text-[#5A5046] hover:text-[#141210]'
              }`}
            >
              {st}
            </button>
          ))}
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
              placeholder="Buscar orden, prenda o cliente..."
              aria-label="Buscar órdenes de producción"
              className="h-10 w-full rounded-lg border border-[#D8CEC0] bg-white pr-3 pl-9 text-sm"
            />
          </div>
          <button
            type="button"
            onClick={openNewModal}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-[#141210] px-4 text-sm font-medium text-[#FAF7F2] hover:bg-[#2C2621]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nueva orden</span>
          </button>
        </div>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {filteredOrders.length === 0 ? (
          <div className="rounded-xl border border-[#E4DCD0] bg-white p-10 text-center text-sm text-[#5A5046]">
            No existen órdenes de producción con el filtro seleccionado.
          </div>
        ) : (
          filteredOrders.map((order) => {
            const client = clients.find((c) => c.id === order.clientId);
            const matEval = evaluateOrderMaterials(order, inventory);
            const cap = calculateOrderCapacityAndTime(order, operators, workHoursPerDay);

            return (
              <article
                key={order.id}
                className="rounded-xl border border-[#E4DCD0] bg-white p-5"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B5E52]">
                      <span className="font-mono font-semibold text-[#141210]">
                        {order.orderCode}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{client?.name ?? 'Cliente no encontrado'}</span>
                      <span aria-hidden="true">·</span>
                      <span>
                        {order.startDate} → {order.dueDate}
                      </span>
                    </div>
                    <h3 className="mt-1 text-lg font-semibold text-[#141210]">
                      {order.garmentType}
                    </h3>
                    <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#4A4036]">
                      <span>
                        Cantidad:{' '}
                        <strong className="font-mono tabular-nums">{order.quantity} und</strong>
                      </span>
                      <span>
                        Tiempo estimado:{' '}
                        <strong className="font-mono tabular-nums">
                          {cap.totalHoursRequired} h ({cap.estimatedDays} días)
                        </strong>
                      </span>
                      <span>
                        Capacidad diaria:{' '}
                        <strong className="font-mono tabular-nums">
                          {cap.dailyCapacity} und/día
                        </strong>
                      </span>
                      <span className={cap.onSchedule ? 'text-[#4A5D4E]' : 'text-[#B45309]'}>
                        {cap.onSchedule
                          ? 'Dentro de fecha límite'
                          : `Requiere ${cap.estimatedDays}d vs ${cap.availableDays}d disponibles`}
                      </span>
                    </div>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      aria-label={`Estado de orden ${order.orderCode}`}
                      value={order.status}
                      onChange={(e) => {
                        const res = onUpdateOrderStatus(order.id, e.target.value as OrderStatus);
                        if (!res.ok && res.message) {
                          setFeedback({ type: 'error', text: res.message });
                        }
                      }}
                      className="h-9 rounded-lg border border-[#D8CEC0] bg-white px-3 text-xs font-medium text-[#141210]"
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En proceso">En proceso</option>
                      <option value="Completado">Completado</option>
                      <option value="Retrasado">Retrasado</option>
                    </select>

                    {!order.materialsDeducted && order.materials.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          const res = onDeductAndStartOrder(order.id);
                          setFeedback({
                            type: res.ok ? 'ok' : 'error',
                            text:
                              res.message ??
                              (res.ok
                                ? `Materiales descontados del inventario para ${order.orderCode}.`
                                : 'Stock insuficiente para iniciar la orden.'),
                          });
                        }}
                        className="inline-flex h-9 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#6B4E3D] px-3 text-xs font-medium text-white hover:bg-[#573E30]"
                      >
                        <Play className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Descontar e iniciar</span>
                      </button>
                    )}

                    {order.materialsDeducted && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#4A5D4E]">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Material descontado
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={() => onDeleteOrder(order.id)}
                      aria-label={`Eliminar orden ${order.orderCode}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E4DCD0] text-[#5A5046] hover:bg-[#FDF2F2] hover:text-[#991B1B]"
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                {/* Materials Breakdown */}
                {matEval.items.length > 0 && (
                  <div className="mt-4 border-t border-[#F1ECE4] pt-3">
                    <div className="flex items-center justify-between text-xs font-medium text-[#6B5E52]">
                      <span>Materiales requeridos para esta orden</span>
                      {matEval.hasShortage && !order.materialsDeducted && (
                        <span className="inline-flex items-center gap-1 font-semibold text-[#991B1B]">
                          <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                          Faltantes detectados en inventario
                        </span>
                      )}
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {matEval.items.map((m) => {
                        const invObj = inventory.find((i) => i.id === m.itemId);
                        const sup = invObj ? findSuppliersForMaterial(invObj, suppliers)[0] : null;
                        return (
                          <div
                            key={m.itemId}
                            className={`rounded-lg border px-3 py-2 text-xs ${
                              m.isShort
                                ? 'border-[#D9B8A6] bg-[#FDF7F3]'
                                : 'border-[#E4DCD0] bg-[#FAF7F2]'
                            }`}
                          >
                            <div className="font-medium text-[#141210]">{m.itemName}</div>
                            <div className="mt-0.5 flex justify-between font-mono tabular-nums text-[#5A5046]">
                              <span>
                                Req: {m.required} {m.unit}
                              </span>
                              <span>
                                Disp: {m.available} {m.unit}
                              </span>
                            </div>
                            {m.isShort && (
                              <div className="mt-1 text-[#991B1B]">
                                Falta {m.shortage} {m.unit}
                                {sup ? ` · Prov: ${sup.supplier.company}` : ''}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {/* New Order Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141210]/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Nueva orden de producción"
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[#E4DCD0] bg-white p-6">
            <div className="flex items-center justify-between border-b border-[#E4DCD0] pb-3">
              <h3 className="text-xl font-semibold text-[#141210]">
                Registrar Orden de Producción
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar modal de orden"
                className="rounded-md p-1 text-[#6B5E52] hover:bg-[#F1ECE4]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="mt-4 space-y-4">
              {formError && (
                <p className="rounded-md bg-[#FDF2F2] px-3 py-2 text-xs font-medium text-[#991B1B]">
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="ord-code" className="block text-xs font-medium text-[#4A4036]">
                    Código de orden
                  </label>
                  <input
                    id="ord-code"
                    type="text"
                    required
                    value={orderCode}
                    onChange={(e) => setOrderCode(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="ord-client" className="block text-xs font-medium text-[#4A4036]">
                    Cliente
                  </label>
                  <select
                    id="ord-client"
                    value={clientId}
                    onChange={(e) => setClientId(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="ord-garment" className="block text-xs font-medium text-[#4A4036]">
                  Tipo de prenda a confeccionar
                </label>
                <input
                  id="ord-garment"
                  type="text"
                  required
                  value={garmentType}
                  onChange={(e) => setGarmentType(e.target.value)}
                  placeholder="Ej: Chaleco Sastre Lino Arena"
                  className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <label htmlFor="ord-qty" className="block text-xs font-medium text-[#4A4036]">
                    Cantidad
                  </label>
                  <input
                    id="ord-qty"
                    type="number"
                    min={1}
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="ord-min" className="block text-xs font-medium text-[#4A4036]">
                    Min/prenda
                  </label>
                  <input
                    id="ord-min"
                    type="number"
                    min={5}
                    required
                    value={minutesPerGarment}
                    onChange={(e) => setMinutesPerGarment(Number(e.target.value))}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="ord-start" className="block text-xs font-medium text-[#4A4036]">
                    Fecha inicio
                  </label>
                  <input
                    id="ord-start"
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-2 font-mono text-xs"
                  />
                </div>
                <div>
                  <label htmlFor="ord-due" className="block text-xs font-medium text-[#4A4036]">
                    Fecha entrega
                  </label>
                  <input
                    id="ord-due"
                    type="date"
                    required
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-2 font-mono text-xs"
                  />
                </div>
              </div>

              {/* Materials selector */}
              <div className="rounded-lg border border-[#E4DCD0] bg-[#FAF7F2] p-4">
                <p className="text-xs font-semibold text-[#141210]">
                  Materiales necesarios del inventario
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <select
                    aria-label="Seleccionar material del inventario"
                    value={draftItemId}
                    onChange={(e) => setDraftItemId(e.target.value)}
                    className="h-9 flex-1 rounded-md border border-[#D8CEC0] bg-white px-2.5 text-xs"
                  >
                    {inventory.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.code} · {i.name} (Disp: {i.quantity} {i.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    aria-label="Cantidad requerida"
                    value={draftQty}
                    onChange={(e) => setDraftQty(Number(e.target.value))}
                    className="h-9 w-24 rounded-md border border-[#D8CEC0] bg-white px-2.5 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddMaterialReq}
                    className="h-9 rounded-md bg-[#6B4E3D] px-3 text-xs font-medium text-white hover:bg-[#573E30]"
                  >
                    Agregar material
                  </button>
                </div>

                {materials.length > 0 && (
                  <ul className="mt-3 divide-y divide-[#E4DCD0] text-xs">
                    {materials.map((req) => {
                      const inv = inventory.find((i) => i.id === req.itemId);
                      return (
                        <li
                          key={req.itemId}
                          className="flex items-center justify-between py-1.5"
                        >
                          <span>
                            {inv?.name} ({inv?.code})
                          </span>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-medium">
                              {req.quantityRequired} {inv?.unit}
                            </span>
                            <button
                              type="button"
                              onClick={() =>
                                setMaterials((prev) => prev.filter((m) => m.itemId !== req.itemId))
                              }
                              className="text-[#991B1B] hover:underline"
                            >
                              Quitar
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-3 border-t border-[#E4DCD0] pt-4">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg border border-[#D8CEC0] px-4 py-2 text-sm font-medium text-[#141210] hover:bg-[#F1ECE4]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#141210] px-4 py-2 text-sm font-medium text-[#FAF7F2] hover:bg-[#2C2621]"
                >
                  Crear orden
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
