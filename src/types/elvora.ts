export type ModuleId =
  | 'dashboard'
  | 'inventario'
  | 'clientes'
  | 'produccion'
  | 'calidad'
  | 'simulador'
  | 'analisis';

export type InventoryCategory =
  | 'Telas'
  | 'Prendas'
  | 'Hilos'
  | 'Botones'
  | 'Otros materiales';

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: string;
  unitCost: number;
  minStock: number;
  isDemo?: boolean;
}

export interface SupplierMaterialPrice {
  materialCode: string;
  materialName: string;
  price: number;
  unit: string;
}

export interface Supplier {
  id: string;
  name: string;
  company: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  city: string;
  materialsSupplied: SupplierMaterialPrice[];
  deliveryDays: number;
  isDemo?: boolean;
}

export type ClientCategory =
  | 'Estratégico'
  | 'Frecuente'
  | 'Potencial'
  | 'Ocasional'
  | 'Inactivo';

export interface PurchaseRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  category: ClientCategory;
  observations: string;
  nextFollowUpDate: string;
  followUpNote: string;
  purchases: PurchaseRecord[];
  isDemo?: boolean;
}

export type OrderStatus = 'Pendiente' | 'En proceso' | 'Completado' | 'Retrasado';

export interface OrderMaterialReq {
  itemId: string;
  quantityRequired: number;
}

export interface ProductionOrder {
  id: string;
  orderCode: string;
  clientId: string;
  garmentType: string;
  quantity: number;
  startDate: string;
  dueDate: string;
  materials: OrderMaterialReq[];
  status: OrderStatus;
  materialsDeducted: boolean;
  minutesPerGarment: number;
  isDemo?: boolean;
}

export interface QualityInspection {
  id: string;
  date: string;
  orderCode: string;
  garmentType: string;
  inspected: number;
  approved: number;
  defective: number;
  reprocessed: number;
  notes: string;
  isDemo?: boolean;
}

export interface SimulationParams {
  requestedGarments: number;
  operators: number;
  workHoursPerDay: number;
  manufacturingMinutesPerGarment: number;
  materialAvailabilityPct: number;
  expectedDefectPct: number;
  horizonDays: number;
}

export interface SimulationResult {
  dailyCapacityUnits: number;
  horizonCapacityUnits: number;
  requiredDays: number;
  fulfillmentPct: number;
  estimatedUnitsProduced: number;
  unitsPendingShortfall: number;
  materialsRequired: {
    materialName: string;
    unit: string;
    required: number;
    available: number;
    shortage: number;
  }[];
  totalMaterialShortageUnits: number;
  projectedApproved: number;
  projectedDefective: number;
  projectedReprocessed: number;
  projectedApprovalPct: number;
  bottleneck: string;
}

export interface DashboardKPIs {
  totalProducedUnits: number;
  totalInventoryUnits: number;
  inventoryValue: number;
  lowStockCount: number;
  totalSuppliers: number;
  totalClients: number;
  strategicClientsCount: number;
  pendingOrdersCount: number;
  inProgressOrdersCount: number;
  completedOrdersCount: number;
  qualityApprovalPct: number;
  qualityDefectPct: number;
  qualityReprocessPct: number;
}

export interface GroundedRecommendation {
  id: string;
  area: 'Producción' | 'Inventario' | 'Calidad' | 'Clientes';
  priority: 'Alta' | 'Media' | 'Informativa';
  title: string;
  evidence: string;
  recommendation: string;
}

export interface AppStoreData {
  inventory: InventoryItem[];
  suppliers: Supplier[];
  clients: Client[];
  orders: ProductionOrder[];
  inspections: QualityInspection[];
  simulation: SimulationParams;
}
