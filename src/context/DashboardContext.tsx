import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { 
  TabType, 
  DatasetState, 
  SyncStatus
} from '../types/dashboard';
import { loadDataset, getInitialDataset, DATASET_STORAGE_KEY } from '../services/dataConnector';
import { getSpreadsheetId } from '../services/settingsService';
import { normalizePostOfficeName } from '../utils/normalizationEngine';

import { useAuth } from './AuthContext';

export interface TabContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  navigateToTab: (tab: TabType, options?: { buuCuc?: string; date?: string }) => void;
}

export const TabContext = createContext<TabContextType | undefined>(undefined);

export const useTab = () => {
  const context = useContext(TabContext);
  if (!context) throw new Error('useTab must be used within DashboardProvider');
  return context;
};

export const useActiveTab = () => {
  return useTab().activeTab;
};

export interface DashboardContextType {
  dataset: DatasetState;
  syncStatus: SyncStatus;
  refreshData: () => Promise<void>;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (val: boolean | ((prev: boolean) => boolean)) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: (val: boolean | ((prev: boolean) => boolean)) => void;
  spreadsheetId: string;

  // Cross-Tab Unified Filtering & Drilldown
  selectedBuuCucGlobal: string;
  setSelectedBuuCucGlobal: (bc: string) => void;
  selectedDateGlobal: string;
  setSelectedDateGlobal: (date: string) => void;
  setActiveTab: (tab: TabType) => void;
  navigateToTab: (tab: TabType, options?: { buuCuc?: string; date?: string }) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, canAccessTab } = useAuth();
  const isStaff = currentUser?.role === 'post_office_staff';
  const assignedPo = currentUser?.assignedPostOffice;

  const defaultTab: TabType = isStaff 
    ? (currentUser?.allowedTabs?.[0] || 'bao_cao_gtc_bc') 
    : 'overview';

  const [activeTab, setActiveTabState] = useState<TabType>(defaultTab);

  const setActiveTab = useCallback((tab: TabType) => {
    if (canAccessTab(tab)) {
      setActiveTabState(tab);
      setIsSidebarOpen(false);
    }
  }, [canAccessTab]);

  const [dataset, setDataset] = useState<DatasetState>(getInitialDataset);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    source: 'CACHED_SNAPSHOT',
    lastUpdated: 'Khởi tạo tức thì (Snapshot)',
    isSyncing: true,
    error: null
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ghn_darkMode') === 'true';
  });
  // Mặc định ẩn thanh tab menu khi vào hệ thống; chỉ hiển thị khi người dùng chủ động mở rộng
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('ghn_sidebar_collapsed');
    return saved !== null ? saved === 'true' : true; // Mặc định thu gọn trên Desktop
  });

  // Cross-Tab Navigation and Unified Filter Linkage
  // Nếu là nhân viên bưu cục, khóa chặt bưu cục vào bưu cục của mình
  const [selectedBuuCucGlobal, setSelectedBuuCucGlobalState] = useState<string>(() => {
    return isStaff && assignedPo ? assignedPo : 'all';
  });
  const [selectedDateGlobal, setSelectedDateGlobal] = useState<string>('all');

  const setSelectedBuuCucGlobal = useCallback((bc: string) => {
    if (isStaff && assignedPo) {
      setSelectedBuuCucGlobalState(assignedPo);
    } else {
      setSelectedBuuCucGlobalState(bc);
    }
  }, [isStaff, assignedPo]);

  // Tự động kiểm tra quyền và khóa bưu cục khi tài khoản là nhân viên
  useEffect(() => {
    if (isStaff && assignedPo) {
      setSelectedBuuCucGlobalState(assignedPo);
      if (!canAccessTab(activeTab)) {
        setActiveTabState(defaultTab);
      }
    }
  }, [isStaff, assignedPo, canAccessTab, activeTab, defaultTab]);

  const navigateToTab = useCallback((tab: TabType, options?: { buuCuc?: string; date?: string }) => {
    if (!canAccessTab(tab)) return;
    if (options?.buuCuc !== undefined) {
      if (isStaff && assignedPo) {
        setSelectedBuuCucGlobalState(assignedPo);
      } else {
        setSelectedBuuCucGlobalState(options.buuCuc);
      }
    }
    if (options?.date !== undefined) {
      setSelectedDateGlobal(options.date);
    }
    setActiveTabState(tab);
    setIsSidebarOpen(false);
  }, [canAccessTab, isStaff, assignedPo]);

  useEffect(() => {
    localStorage.setItem('ghn_sidebar_collapsed', String(isSidebarCollapsed));
  }, [isSidebarCollapsed]);

  useEffect(() => {
    localStorage.setItem('ghn_darkMode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const refreshData = useCallback(async () => {
    setSyncStatus(prev => ({ ...prev, isSyncing: true }));
    try {
      const result = await loadDataset();
      const nowStr = new Date().toLocaleString('vi-VN');
      setDataset(result.data);
      try {
        localStorage.setItem(DATASET_STORAGE_KEY, JSON.stringify(result.data));
      } catch {
        // Safe fallback if localStorage is unavailable or quota exceeded
      }
      setSyncStatus({
        source: result.source,
        lastUpdated: nowStr,
        isSyncing: false,
        error: result.error,
        sheetStatuses: result.sheetStatuses
      });
    } catch (err: any) {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        error: `Lỗi đồng bộ: ${err.message}`
      }));
    }
  }, []);

  // Initial load on mount
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Tab navigation context value - updates only when activeTab or tab setters change
  const tabContextValue = useMemo(() => ({
    activeTab,
    setActiveTab,
    navigateToTab
  }), [activeTab, setActiveTab, navigateToTab]);

  // Main dashboard data context value - deliberately excludes activeTab so tab switching NEVER forces tab re-renders!
  // Khi tài khoản là nhân viên bưu cục, khóa và lọc chặt chẽ 100% dữ liệu ngay từ tầng nguồn Context
  const effectiveDataset = useMemo(() => {
    if (!isStaff || !assignedPo) return dataset;
    const stdAssigned = normalizePostOfficeName(assignedPo);

    return {
      gtcBuuCuc: dataset.gtcBuuCuc.filter(r => normalizePostOfficeName(r.buuCuc) === stdAssigned),
      gtcNhanVien: dataset.gtcNhanVien.filter(r => normalizePostOfficeName(r.buuCuc) === stdAssigned),
      hoaHongNgay: dataset.hoaHongNgay.filter(r => normalizePostOfficeName(r.tenBC || r.buuCucRaw) === stdAssigned),
      tyLeTraHang: dataset.tyLeTraHang.filter(r => normalizePostOfficeName(r.buuCuc || r.tenBC) === stdAssigned),
      tonDongGlt: dataset.tonDongGlt.filter(r => normalizePostOfficeName(r.buuCuc) === stdAssigned),
      tonDongLc: dataset.tonDongLc.filter(r => normalizePostOfficeName(r.tenBC) === stdAssigned),
      nhanSu: dataset.nhanSu.filter(r => normalizePostOfficeName(r.buuCuc || r.buuCucRaw) === stdAssigned),
      nghiViec: dataset.nghiViec.filter(r => normalizePostOfficeName(r.buuCuc || r.buuCucRaw) === stdAssigned)
    };
  }, [dataset, isStaff, assignedPo]);

  const dashboardContextValue = useMemo(() => ({
    dataset: effectiveDataset,
    syncStatus,
    refreshData,
    darkMode,
    setDarkMode,
    isSidebarOpen,
    setIsSidebarOpen,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    spreadsheetId: getSpreadsheetId(),
    selectedBuuCucGlobal,
    setSelectedBuuCucGlobal,
    selectedDateGlobal,
    setSelectedDateGlobal,
    setActiveTab,
    navigateToTab
  }), [
    effectiveDataset,
    syncStatus,
    refreshData,
    darkMode,
    isSidebarOpen,
    isSidebarCollapsed,
    selectedBuuCucGlobal,
    selectedDateGlobal,
    setActiveTab,
    navigateToTab
  ]);

  return (
    <TabContext.Provider value={tabContextValue}>
      <DashboardContext.Provider value={dashboardContextValue}>
        {children}
      </DashboardContext.Provider>
    </TabContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used within DashboardProvider');
  return context;
};
