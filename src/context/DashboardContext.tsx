import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { 
  TabType, 
  DatasetState, 
  SyncStatus
} from '../types/dashboard';
import { loadDataset } from '../services/dataConnector';
import { getSpreadsheetId } from '../services/settingsService';

interface DashboardContextType {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
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
  navigateToTab: (tab: TabType, options?: { buuCuc?: string; date?: string }) => void;
}

const defaultDataset: DatasetState = {
  gtcBuuCuc: [],
  gtcNhanVien: [],
  hoaHongNgay: [],
  tyLeTraHang: [],
  tonDongGlt: [],
  tonDongLc: [],
  nhanSu: [],
  nghiViec: []
};

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const DashboardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [dataset, setDataset] = useState<DatasetState>(defaultDataset);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    source: 'CACHED_SNAPSHOT',
    lastUpdated: 'Chưa đồng bộ',
    isSyncing: true,
    error: null
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('ghn_darkMode') === 'true';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('ghn_sidebar_collapsed') === 'true';
  });

  // Cross-Tab Navigation and Unified Filter Linkage
  const [selectedBuuCucGlobal, setSelectedBuuCucGlobal] = useState<string>('all');
  const [selectedDateGlobal, setSelectedDateGlobal] = useState<string>('all');

  const navigateToTab = useCallback((tab: TabType, options?: { buuCuc?: string; date?: string }) => {
    if (options?.buuCuc !== undefined) {
      setSelectedBuuCucGlobal(options.buuCuc);
    }
    if (options?.date !== undefined) {
      setSelectedDateGlobal(options.date);
    }
    setActiveTab(tab);
    // Smooth scroll to top of page on tab switch
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setActiveTab]);

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

  return (
    <DashboardContext.Provider
      value={{
        activeTab,
        setActiveTab,
        dataset,
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
        navigateToTab
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
};

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used within DashboardProvider');
  return context;
};
