export interface OperationRow {
  date: string;
  branch: string;
  category: string;
  volume: number;
  assignedRate: number;
  gtcRate: number;
  assignedVolume: number;
  gtcVolume: number;
  backlog: number;
  growth?: number;
  status: 'Critical' | 'Warning' | 'Good' | 'Excellent';
}

export interface EmployeeDelivery {
  branch: string;
  employee: string;
  totalOrders: number;
  totalGTC: number;
  backlog: number;
  gtcRate: number;
  status: 'Critical' | 'Warning' | 'Good' | 'Excellent';
}

export interface SalaryRow {
  employee: string;
  branch: string;
  deliveryOrders: number;
  pickupOrders: number;
  workDays: number;
  estimatedSalary: number;
  seniorityDays: number;
  isNewEmployee: boolean;
}

export type ActiveTab = 'operations' | 'employee' | 'salary' | 'alerts' | 'reports' | 'settings';
