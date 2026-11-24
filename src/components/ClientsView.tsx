import { useMemo, useState } from 'react';
import {
  BellRing,
  Calendar,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { Client, ClientCategory } from '../types/elvora';
import { getClientFollowUpAlerts } from '../utils/calculations';

interface ClientsViewProps {
  clients: Client[];
  onAddClient: (client: Omit<Client, 'id'>) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}

const CLIENT_CATEGORIES: ClientCategory[] = [
  'Estratégico',
  'Frecuente',
  'Potencial',
  'Ocasional',
  'Inactivo',
];

const EMPTY_CLIENT_FORM = {
  name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  category: 'Potencial' as ClientCategory,
  observations: '',
  nextFollowUpDate: '2026-11-30',
  followUpNote: '',
};

export function ClientsView({
  clients,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
}: ClientsViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<'Todos' | ClientCategory>('Todos');
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_CLIENT_FORM);
  const [formError, setFormError] = useState('');

  // Quick purchase addition inside client detail
  const [purchaseDesc, setPurchaseDesc] = useState('');
  const [purchaseAmount, setPurchaseAmount] = useState<number>(0);

  const followUpAlerts = useMemo(
    () => getClientFollowUpAlerts(clients, '2026-11-22'),
    [clients]
  );

  const filteredClients = useMemo(() => {
    const q = search.trim().toLowerCase();
    return clients.filter((c) => {
      if (categoryFilter !== 'Todos' && c.category !== categoryFilter) return false;
      if (
        q &&
        !c.name.toLowerCase().includes(q) &&
        !c.city.toLowerCase().includes(q) &&
        !c.email.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [clients, categoryFilter, search]);

  const categoryCounts = useMemo(() => {
    const map: Record<ClientCategory, number> = {
      Estratégico: 0,
      Frecuente: 0,
      Potencial: 0,
      Ocasional: 0,
      Inactivo: 0,
    };
    clients.forEach((c) => {
      map[c.category] += 1;
    });
    return map;
  }, [clients]);

  const openNewModal = () => {
    setEditingId(null);
    setForm(EMPTY_CLIENT_FORM);
    setFormError('');
    setModalOpen(true);
  };

  const openEditModal = (c: Client) => {
    setEditingId(c.id);
    setForm({
      name: c.name,
      phone: c.phone,
      email: c.email,
      address: c.address,
      city: c.city,
      category: c.category,
      observations: c.observations,
      nextFollowUpDate: c.nextFollowUpDate,
      followUpNote: c.followUpNote,
    });
    setFormError('');
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setFormError('El nombre del cliente es obligatorio.');
      return;
    }

    if (editingId) {
      const existing = clients.find((c) => c.id === editingId)!;
      const updated: Client = { ...existing, ...form, name: form.name.trim() };
      onUpdateClient(updated);
      if (selectedClient?.id === editingId) setSelectedClient(updated);
    } else {
      onAddClient({
        ...form,
        name: form.name.trim(),
        purchases: [],
        isDemo: false,
      });
    }
    setModalOpen(false);
  };

  const handleCategoryChange = (client: Client, newCategory: ClientCategory) => {
    const updated = { ...client, category: newCategory };
    onUpdateClient(updated);
    if (selectedClient?.id === client.id) setSelectedClient(updated);
  };

  const handleAddPurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || !purchaseDesc.trim() || purchaseAmount <= 0) return;
    const latest = clients.find((c) => c.id === selectedClient.id) ?? selectedClient;
    const newRecord = {
      id: `pur-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      description: purchaseDesc.trim(),
      amount: purchaseAmount,
    };
    const updated: Client = {
      ...latest,
      purchases: [newRecord, ...latest.purchases],
    };
    onUpdateClient(updated);
    setSelectedClient(updated);
    setPurchaseDesc('');
    setPurchaseAmount(0);
  };

  return (
    <div className="space-y-6">
      {/* Follow-Up Reminders Banner */}
      <section
        aria-label="Alertas de seguimiento comercial"
        className="rounded-xl border border-[#E4DCD0] bg-white p-5"
      >
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-[#6B4E3D]" aria-hidden="true" />
          <h2 className="text-lg font-semibold text-[#141210]">
            Recordatorios Prioritarios de Seguimiento
          </h2>
          <span className="text-xs text-[#6B5E52]">
            ({followUpAlerts.length} cuentas estratégicas y potenciales)
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {followUpAlerts.slice(0, 4).map(({ client, urgency }) => (
            <button
              key={client.id}
              type="button"
              onClick={() => setSelectedClient(client)}
              className="rounded-lg border border-[#E4DCD0] bg-[#FAF7F2] p-3.5 text-left transition-colors hover:border-[#8C6D53]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-semibold text-[#141210]">
                  {client.name}
                </span>
                <span
                  className={`shrink-0 text-xs font-medium ${
                    urgency === 'Vencido'
                      ? 'text-[#991B1B]'
                      : urgency === 'Próximo'
                        ? 'text-[#B45309]'
                        : 'text-[#4A5D4E]'
                  }`}
                >
                  {urgency}
                </span>
              </div>
              <div className="mt-1 text-xs text-[#6B4E3D]">
                {client.category} · {client.nextFollowUpDate}
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs text-[#5A5046]">
                {client.followUpNote || client.observations}
              </p>
            </button>
          ))}
        </div>
      </section>

      {/* Filter & Search Bar */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCategoryFilter('Todos')}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              categoryFilter === 'Todos'
                ? 'bg-[#141210] text-[#FAF7F2]'
                : 'border border-[#E4DCD0] bg-white text-[#5A5046] hover:text-[#141210]'
            }`}
          >
            Todos ({clients.length})
          </button>
          {CLIENT_CATEGORIES.map((cat) => (
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
              {cat} ({categoryCounts[cat]})
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
              placeholder="Buscar cliente, ciudad o correo..."
              aria-label="Buscar clientes"
              className="h-10 w-full rounded-lg border border-[#D8CEC0] bg-white pr-3 pl-9 text-sm text-[#141210] placeholder:text-[#8C7E70] focus:border-[#141210] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={openNewModal}
            className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-lg bg-[#141210] px-4 text-sm font-medium text-[#FAF7F2] hover:bg-[#2C2621]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Nuevo cliente</span>
          </button>
        </div>
      </div>

      {/* Directory + Detail Split */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div
          className={`rounded-xl border border-[#E4DCD0] bg-white ${
            selectedClient ? 'xl:col-span-2' : 'xl:col-span-3'
          }`}
        >
          {filteredClients.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#5A5046]">
              No hay clientes registrados en esta categoría.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[#E4DCD0] bg-[#FAF7F2] text-xs text-[#6B5E52]">
                    <th className="px-4 py-3 font-medium">Cliente</th>
                    <th className="px-4 py-3 font-medium">Ciudad / Contacto</th>
                    <th className="px-4 py-3 font-medium">Categoría</th>
                    <th className="px-4 py-3 text-right font-medium">Compras</th>
                    <th className="px-4 py-3 font-medium">Seguimiento</th>
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F1ECE4]">
                  {filteredClients.map((client) => {
                    const totalPurchases = client.purchases.reduce((s, p) => s + p.amount, 0);
                    return (
                      <tr key={client.id} className="hover:bg-[#FAF7F2]">
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setSelectedClient(client)}
                            className="text-left font-medium text-[#141210] hover:text-[#6B4E3D] hover:underline"
                          >
                            {client.name}
                          </button>
                          <div className="text-xs text-[#6B5E52]">{client.email}</div>
                        </td>
                        <td className="px-4 py-3 text-xs text-[#4A4036]">
                          <div>{client.city}</div>
                          <div className="font-mono text-[#6B5E52]">{client.phone}</div>
                        </td>
                        <td className="px-4 py-3">
                          <select
                            aria-label={`Categoría de ${client.name}`}
                            value={client.category}
                            onChange={(e) =>
                              handleCategoryChange(client, e.target.value as ClientCategory)
                            }
                            className="h-8 rounded-md border border-[#D8CEC0] bg-white px-2 text-xs font-medium text-[#141210]"
                          >
                            {CLIENT_CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums text-xs text-[#141210]">
                          <div>${totalPurchases.toLocaleString('es-CO')}</div>
                          <div className="text-[#6B5E52]">{client.purchases.length} reg.</div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#5A5046]">
                          {client.nextFollowUpDate || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedClient(client)}
                              className="rounded-md border border-[#D8CEC0] px-2.5 py-1.5 text-xs font-medium text-[#141210] hover:bg-[#F1ECE4]"
                            >
                              Historial
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditModal(client)}
                              aria-label={`Editar cliente ${client.name}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E4DCD0] text-[#5A5046] hover:bg-[#F1ECE4]"
                            >
                              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteClient(client.id);
                                if (selectedClient?.id === client.id) setSelectedClient(null);
                              }}
                              aria-label={`Eliminar cliente ${client.name}`}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#E4DCD0] text-[#5A5046] hover:bg-[#FDF2F2] hover:text-[#991B1B]"
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

        {/* Client Detail & Purchase History */}
        {selectedClient && (
          <aside
            aria-label="Detalle del cliente"
            className="rounded-xl border border-[#8C6D53] bg-white p-5"
          >
            <div className="flex items-start justify-between gap-2 border-b border-[#E4DCD0] pb-4">
              <div>
                <span className="text-xs font-medium text-[#6B4E3D]">
                  {selectedClient.category}
                </span>
                <h3 className="mt-0.5 text-lg font-semibold text-[#141210]">
                  {selectedClient.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                aria-label="Cerrar detalle de cliente"
                className="rounded-md p-1 text-[#6B5E52] hover:bg-[#F1ECE4]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-2 text-xs text-[#4A4036]">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-[#8C6D53]" aria-hidden="true" />
                <span>{selectedClient.phone}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#8C6D53]" aria-hidden="true" />
                <span>{selectedClient.email}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-[#8C6D53]" aria-hidden="true" />
                <span>
                  {selectedClient.address}, {selectedClient.city}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-3.5 w-3.5 text-[#8C6D53]" aria-hidden="true" />
                <span>Seguimiento: {selectedClient.nextFollowUpDate}</span>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-[#FAF7F2] p-3 text-xs">
              <p className="font-medium text-[#141210]">Observaciones y nota de seguimiento</p>
              <p className="mt-1 text-[#5A5046]">{selectedClient.observations || 'Sin notas.'}</p>
              {selectedClient.followUpNote && (
                <p className="mt-1.5 font-medium text-[#6B4E3D]">
                  Acción: {selectedClient.followUpNote}
                </p>
              )}
            </div>

            <div className="mt-5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-[#141210]">
                <ShoppingBag className="h-3.5 w-3.5 text-[#6B4E3D]" aria-hidden="true" />
                <span>Historial de compras ({selectedClient.purchases.length})</span>
              </div>

              {selectedClient.purchases.length === 0 ? (
                <p className="mt-2 text-xs text-[#6B5E52]">Sin compras registradas aún.</p>
              ) : (
                <ul className="mt-2 divide-y divide-[#F1ECE4] text-xs">
                  {selectedClient.purchases.map((p) => (
                    <li key={p.id} className="flex items-center justify-between py-2">
                      <div>
                        <div className="font-medium text-[#141210]">{p.description}</div>
                        <div className="font-mono text-[#6B5E52]">{p.date}</div>
                      </div>
                      <span className="font-mono font-medium tabular-nums text-[#4A5D4E]">
                        ${p.amount.toLocaleString('es-CO')}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <form onSubmit={handleAddPurchase} className="mt-4 space-y-2 border-t border-[#E4DCD0] pt-3">
                <p className="text-xs font-medium text-[#141210]">Registrar nueva compra</p>
                <input
                  type="text"
                  placeholder="Descripción de prendas..."
                  aria-label="Descripción de nueva compra"
                  value={purchaseDesc}
                  onChange={(e) => setPurchaseDesc(e.target.value)}
                  className="h-9 w-full rounded-md border border-[#D8CEC0] px-2.5 text-xs"
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    placeholder="Valor COP"
                    aria-label="Valor de compra en pesos"
                    value={purchaseAmount || ''}
                    onChange={(e) => setPurchaseAmount(Number(e.target.value))}
                    className="h-9 flex-1 rounded-md border border-[#D8CEC0] px-2.5 font-mono text-xs"
                  />
                  <button
                    type="submit"
                    className="h-9 rounded-md bg-[#141210] px-3 text-xs font-medium text-white hover:bg-[#2C2621]"
                  >
                    Añadir
                  </button>
                </div>
              </form>
            </div>
          </aside>
        )}
      </div>

      {/* Client CRUD Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141210]/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={editingId ? 'Editar cliente' : 'Registrar cliente'}
        >
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-xl border border-[#E4DCD0] bg-white p-6">
            <div className="flex items-center justify-between border-b border-[#E4DCD0] pb-3">
              <h3 className="text-xl font-semibold text-[#141210]">
                {editingId ? 'Editar Cliente' : 'Registrar Nuevo Cliente'}
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                aria-label="Cerrar modal de cliente"
                className="rounded-md p-1 text-[#6B5E52] hover:bg-[#F1ECE4]"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-4 space-y-4">
              {formError && (
                <p className="rounded-md bg-[#FDF2F2] px-3 py-2 text-xs font-medium text-[#991B1B]">
                  {formError}
                </p>
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="cli-name" className="block text-xs font-medium text-[#4A4036]">
                    Nombre o Razón Social
                  </label>
                  <input
                    id="cli-name"
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cli-cat" className="block text-xs font-medium text-[#4A4036]">
                    Categoría
                  </label>
                  <select
                    id="cli-cat"
                    value={form.category}
                    onChange={(e) =>
                      setForm({ ...form, category: e.target.value as ClientCategory })
                    }
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] bg-white px-3 text-sm"
                  >
                    {CLIENT_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="cli-phone" className="block text-xs font-medium text-[#4A4036]">
                    Teléfono
                  </label>
                  <input
                    id="cli-phone"
                    type="text"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cli-email" className="block text-xs font-medium text-[#4A4036]">
                    Correo
                  </label>
                  <input
                    id="cli-email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cli-addr" className="block text-xs font-medium text-[#4A4036]">
                    Dirección
                  </label>
                  <input
                    id="cli-addr"
                    type="text"
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cli-city" className="block text-xs font-medium text-[#4A4036]">
                    Ciudad
                  </label>
                  <input
                    id="cli-city"
                    type="text"
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cli-date" className="block text-xs font-medium text-[#4A4036]">
                    Próximo seguimiento
                  </label>
                  <input
                    id="cli-date"
                    type="date"
                    value={form.nextFollowUpDate}
                    onChange={(e) => setForm({ ...form, nextFollowUpDate: e.target.value })}
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="cli-note" className="block text-xs font-medium text-[#4A4036]">
                    Recordatorio de acción
                  </label>
                  <input
                    id="cli-note"
                    type="text"
                    value={form.followUpNote}
                    onChange={(e) => setForm({ ...form, followUpNote: e.target.value })}
                    placeholder="Ej: Enviar catálogo y cotización"
                    className="mt-1 h-10 w-full rounded-lg border border-[#D8CEC0] px-3 text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="cli-obs" className="block text-xs font-medium text-[#4A4036]">
                  Observaciones
                </label>
                <textarea
                  id="cli-obs"
                  rows={2}
                  value={form.observations}
                  onChange={(e) => setForm({ ...form, observations: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-[#D8CEC0] p-3 text-sm"
                />
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
                  Guardar cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
