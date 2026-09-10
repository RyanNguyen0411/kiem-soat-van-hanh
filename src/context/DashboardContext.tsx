import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { fetchSheetData } from '../services/googleSheets';
import { dashboardConfig } from '../config/dashboard';
import type { OperationRow, EmployeeDelivery, SalaryRow, ActiveTab } from '../types/dashboard';
import { normalizeNumber, normalizePercent, normalizeString } from '../utils/normalization';
import { calculateAssigned, calculateGTC, calculateBacklog, safeDivide } from '../utils/calculations';
import { getCurrentDate, parseCustomDate } from '../utils/dateEngine';

interface DashboardContextType {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  operationsData: OperationRow[];
  employeeData: EmployeeDelivery[];
  salaryData: SalaryRow[];
  loading: boolean;
  errors: Record<string, string | null>;
  lastUpdated: Date | null;
  nextUpdate: Date | null;
  refreshData: () => Promise<void>;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  filters: {
    dateRange: string;
    branch: string;
    employee: string;
    category: string;
  };
  setFilters: React.Dispatch<React.SetStateAction<any>>;
  resetFilters: () => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<ActiveTab>('operations');
  const [operationsRaw, setOperationsRaw] = useState<any[]>([]);
  const [employeeRaw, setEmployeeRaw] = useState<any[]>([]);
  const [salaryRaw, setSalaryRaw] = useState<any[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [nextUpdate, setNextUpdate] = useState<Date | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('darkMode') === 'true';
  });

  const [filters, setFilters] = useState({
    dateRange: 'all',
    branch: 'all',
    employee: 'all',
    category: 'all',
  });

  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const refreshData = useCallback(async () => {
    setLoading(true);
    const newErrors: Record<string, string | null> = {};

    const [opRes, empRes, salRes] = await Promise.all([
      fetchSheetData(dashboardConfig.sheets.operations),
      fetchSheetData(dashboardConfig.sheets.employees),
      fetchSheetData(dashboardConfig.sheets.salary),
    ]);

    if (opRes.error) newErrors.operations = opRes.error;
    else setOperationsRaw(opRes.data);

    if (empRes.error) newErrors.employee = empRes.error;
    else setEmployeeRaw(empRes.data);

    if (salRes.error) newErrors.salary = salRes.error;
    else setSalaryRaw(salRes.data);

    setErrors(newErrors);
    const now = new Date();
    setLastUpdated(now);
    setNextUpdate(new Date(now.getTime() + dashboardConfig.refreshInterval));
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshData();
    const interval = setInterval(() => {
      refreshData();
    }, dashboardConfig.refreshInterval);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Transform Operations Data
  const operationsData = useMemo((): OperationRow[] => {
    return operationsRaw.map((row) => {
      const volume = normalizeNumber(row['volume'] || row['sản lượng'] || row['tong_don']);
      const assignedRate = normalizePercent(row['% gán'] || row['ti_le_gan'] || row['assigned_rate'] || 1);
      const gtcRate = normalizePercent(row['% gtc'] || row['ti_le_gtc'] || row['gtc_rate'] || 0);
      const assignedVolume = calculateAssigned(volume, assignedRate);
      const gtcVolume = calculateGTC(volume, gtcRate);
      const backlog = calculateBacklog(volume, gtcVolume);

      let status: OperationRow['status'] = 'Good';
      if (gtcRate < dashboardConfig.thresholds.critical) status = 'Critical';
      else if (gtcRate < dashboardConfig.thresholds.warning) status = 'Warning';
      else if (gtcRate >= 1.0) status = 'Excellent';

      return {
        date: normalizeString(row['ngày'] || row['date'] || ''),
        branch: normalizeString(row['bưu cục'] || row['branch'] || row['ten_buu_cuc'] || 'Khác'),
        category: normalizeString(row['loại hàng'] || row['loai_hang'] || row['category'] || 'Hàng mới ca 1'),
        volume,
        assignedRate,
        gtcRate,
        assignedVolume,
        gtcVolume,
        backlog,
        status,
      };
    });
  }, [operationsRaw]);

  // Transform Employee Data (Cột A: Bưu cục, B: Nhân viên, D: Tổng đơn, E: Tổng đơn GTC, I: Tồn đọng)
  const employeeData = useMemo((): EmployeeDelivery[] => {
    return employeeRaw.map((row) => {
      const keys = Object.keys(row);
      const branch = normalizeString(row['bưu cục'] || row[keys[0]] || '');
      const employee = normalizeString(row['nhân viên'] || row[keys[1]] || '');
      const totalOrders = normalizeNumber(row['tổng đơn'] || row[keys[3]] || 0);
      const totalGTC = normalizeNumber(row['tổng đơn gtc'] || row[keys[4]] || 0);
      const backlogProvided = normalizeNumber(row['tồn đọng'] || row[keys[8]] || 0);
      
      const calcBacklog = calculateBacklog(totalOrders, totalGTC);
      const gtcRate = safeDivide(totalGTC, totalOrders);

      let status: EmployeeDelivery['status'] = 'Good';
      if (gtcRate < dashboardConfig.thresholds.critical) status = 'Critical';
      else if (gtcRate < dashboardConfig.thresholds.warning) status = 'Warning';
      else if (gtcRate >= 1.0) status = 'Excellent';

      return {
        branch: branch || 'Chưa phân bổ',
        employee: employee || 'Chưa rõ tên',
        totalOrders,
        totalGTC,
        backlog: backlogProvided || calcBacklog,
        gtcRate,
        status,
      };
    }).filter(e => e.employee !== '');
  }, [employeeRaw]);

  // Transform Salary Data (Cột A: Nhân viên, B: Bưu cục, I: Đơn giao, K: Đơn lấy, M: Ngày đi làm, O: Lương tạm tính, Q: Thâm niên)
  const salaryData = useMemo((): SalaryRow[] => {
    return salaryRaw.map((row) => {
      const keys = Object.keys(row);
      const employee = normalizeString(row['nhân viên'] || row[keys[0]] || '');
      const branch = normalizeString(row['bưu cục'] || row[keys[1]] || '');
      const deliveryOrders = normalizeNumber(row['đơn giao tính lương'] || row[keys[8]] || 0);
      const pickupOrders = normalizeNumber(row['đơn lấy tính lương'] || row[keys[10]] || 0);
      const workDays = normalizeNumber(row['tổng số ngày đi làm'] || row[keys[12]] || 0);
      const estimatedSalary = normalizeNumber(row['lương tạm tính'] || row[keys[14]] || 0);
      const seniorityDays = normalizeNumber(row['thâm niên'] || row[keys[16]] || 0);

      return {
        employee: employee || 'Chưa rõ',
        branch: branch || 'Khác',
        deliveryOrders,
        pickupOrders,
        workDays,
        estimatedSalary,
        seniorityDays,
        isNewEmployee: seniorityDays < 30,
      };
    }).filter(s => s.employee !== '');
  }, [salaryRaw]);

  const resetFilters = () => {
    setFilters({ dateRange: 'all', branch: 'all', employee: 'all', category: 'all' });
  };

  // Reference date engine to ensure readiness
  void getCurrentDate;
  void parseCustomDate;

  return (
    <DashboardContext.Provider
      value={{
        activeTab,
        setActiveTab,
        operationsData,
        employeeData,
        salaryData,
        loading,
        errors,
        lastUpdated,
        nextUpdate,
        refreshData,
        darkMode,
        setDarkMode,
        filters,
        setFilters,
        resetFilters,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used within a DashboardProvider');
  return context;
};
