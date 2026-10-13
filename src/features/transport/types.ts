export type VehicleMaintenance = {
  id: string;
  vehicleId: string;
  description: string;
  cost: number;
  date: string;
  nextService?: string | null;
};

export type Vehicle = {
  id: string;
  plateNumber: string;
  model: string;
  capacity: number;
  status: string;
  driverId?: string | null;
  maintenanceLogs?: VehicleMaintenance[];
};

export type TransportStop = {
  id: string;
  routeId: string;
  name: string;
  sortOrder: number;
  pickupTime?: string | null;
};

export type TransportRider = {
  id: string;
  routeId: string;
  studentId: string;
  stopId?: string | null;
  status: string;
};

export type TransportRoute = {
  id: string;
  name: string;
  vehicleId?: string | null;
  driverStaffId?: string | null;
  status: string;
  notes?: string | null;
  stops: TransportStop[];
  riders: TransportRider[];
};
