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

  // Zoom toàn màn hình & Font size scale
  zoomLevel: number;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  fontScale: number;
  increaseFontSize: () => void;
  decreaseFontSize: () => void;
  resetFontSize: () => void;
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

  // Quản lý Zoom toàn màn hình (áp dụng toàn dashboard, toàn tab/task, lưu lâu dài)
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ghn_display_zoom_level');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 70 && parsed <= 150) {
          return parsed;
        }
      }
    } catch {
      // Safe fallback
    }
    return 100;
  });

  // Quản lý cỡ chữ Font Size Scale (áp dụng toàn dashboard, toàn tab/task, lưu lâu dài)
  const [fontScale, setFontScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ghn_display_font_scale');
      if (saved) {
        const parsed = parseInt(saved, 10);
        if (!isNaN(parsed) && parsed >= 75 && parsed <= 135) {
          return parsed;
        }
      }
    } catch {
      // Safe fallback
    }
    return 100;
  });

  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(150, prev + 5));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(70, prev - 5));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(100);
  }, []);

  const increaseFontSize = useCallback(() => {
    setFontScale(prev => Math.min(135, prev + 5));
  }, []);

  const decreaseFontSize = useCallback(() => {
    setFontScale(prev => Math.max(75, prev - 5));
  }, []);

  const resetFontSize = useCallback(() => {
    setFontScale(100);
  }, []);

  // Áp dụng Zoom vào root element và lưu localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ghn_display_zoom_level', String(zoomLevel));
      (document.documentElement.style as any).zoom = `${zoomLevel}%`;
    } catch (err) {
      console.warn('Lỗi khi áp dụng zoom level:', err);
    }
  }, [zoomLevel]);

  // Áp dụng Font Size scale vào root element và lưu localStorage
  useEffect(() => {
    try {
      localStorage.setItem('ghn_display_font_scale', String(fontScale));
      document.documentElement.style.fontSize = `${fontScale}%`;
    } catch (err) {
      console.warn('Lỗi khi áp dụng font scale:', err);
    }
  }, [fontScale]);

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
    navigateToTab,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    fontScale,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize
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
    navigateToTab,
    zoomLevel,
    zoomIn,
    zoomOut,
    resetZoom,
    fontScale,
    increaseFontSize,
    decreaseFontSize,
    resetFontSize
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
