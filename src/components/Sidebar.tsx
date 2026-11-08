import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Coins, 
  RotateCcw, 
  PackageX, 
  Truck,
  ChevronLeft,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  FileSpreadsheet,
  UserCheck,
  UserMinus,
  ChevronDown,
  X,
  FolderTree
} from 'lucide-react';
import { useDashboard } from '../context/DashboardContext';
import type { TabType } from '../types/dashboard';

interface NavItem {
  id: TabType;
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  badgeColor?: string;
  isHot?: boolean;
}

interface NavCategory {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavItem[];
}

export const Sidebar: React.FC = () => {
  const { 
    activeTab, 
    setActiveTab, 
    isSidebarOpen, 
    setIsSidebarOpen, 
    isSidebarCollapsed, 
    setIsSidebarCollapsed, 
    dataset 
  } = useDashboard();

  // State thu gọn từng nhóm phân hệ trong menu
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({
    van_hanh: false,
    ton_kho: false,
    nhan_su: false,
  });

  const toggleCategory = (catId: string) => {
    setCollapsedCategories(prev => ({ ...prev, [catId]: !prev[catId] }));
  };

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSidebarCollapsed]);

  // Phân hệ điều hành có cấu trúc 3 cụm nghiệp vụ tối ưu
  const categories: NavCategory[] = [
    {
      id: 'van_hanh',
      title: 'VẬN HÀNH & GTC',
      icon: LayoutDashboard,
      items: [
        {
          id: 'overview',
          label: 'TỔNG QUAN',
          subLabel: 'Executive Control Center',
          icon: LayoutDashboard,
          badge: 'BI Center',
          badgeColor: 'bg-orange-600 text-white'
        },
        {
          id: 'bao_cao_gtc_bc',
          label: 'Báo Cáo GTC BC',
          subLabel: 'Chi tiết bưu cục ngày',
          icon: FileSpreadsheet,
          badge: 'Live',
          badgeColor: 'bg-emerald-600 text-white',
          isHot: true
        },
        {
          id: 'gtc_buu_cuc',
          label: 'GTC Bưu Cục',
          subLabel: 'Hiệu suất 5 bưu cục',
          icon: Building2,
          badge: '5 BC',
          badgeColor: 'bg-slate-700 text-slate-200'
        },
        {
          id: 'gtc_nhan_vien',
          label: 'GTC Bưu Tá',
          subLabel: 'Năng suất bưu tá & ca đi',
          icon: Users,
          badge: `${new Set(dataset.gtcNhanVien.map(r => r.maNV)).size || 73} NV`,
          badgeColor: 'bg-slate-700 text-slate-200'
        }
      ]
    },
    {
      id: 'ton_kho',
      title: 'TỒN ĐỌNG & XỬ LÝ SLA',
      icon: PackageX,
      items: [
        {
          id: 'ton_dong_glt',
          label: 'Tồn Đọng GLT',
          subLabel: 'Giao - Lấy - Trả',
          icon: PackageX,
          badge: `${dataset.tonDongGlt.length.toLocaleString('vi-VN')}`,
          badgeColor: 'bg-rose-700 text-white'
        },
        {
          id: 'ton_dong_lc',
          label: 'Tồn Đọng LC',
          subLabel: 'Luân chuyển tồn kho',
          icon: Truck,
          badge: `${dataset.tonDongLc.length}`,
          badgeColor: 'bg-blue-700 text-white'
        },
        {
          id: 'ty_le_tra_hang',
          label: 'Tỷ Lệ Trả Hàng',
          subLabel: 'Kiểm soát chuyển hoàn',
          icon: RotateCcw,
          badge: 'SLA',
          badgeColor: 'bg-amber-700 text-white'
        }
      ]
    },
    {
      id: 'nhan_su',
      title: 'NHÂN SỰ & QUỸ LƯƠNG',
      icon: Users,
      items: [
        {
          id: 'nhan_su',
          label: 'Task Nhân Sự',
          subLabel: 'Cơ cấu, thâm niên & chức danh',
          icon: UserCheck,
          badge: `${dataset.nhanSu.length || 81} NV`,
          badgeColor: 'bg-indigo-600 text-white'
        },
        {
          id: 'ns_nghi_viec',
          label: 'NS Nghỉ Việc',
          subLabel: 'Thực trạng, thâm niên & lý do nghỉ',
          icon: UserMinus,
          badge: `${dataset.nghiViec?.length || 81} Đã nghỉ`,
          badgeColor: 'bg-rose-600 text-white',
          isHot: true
        },
        {
          id: 'hoa_hong_ngay',
          label: 'Hoa Hồng Ngày',
          subLabel: 'Quỹ lương & đơn tính lương',
          icon: Coins,
          badge: 'Quỹ Lương',
          badgeColor: 'bg-emerald-700 text-white'
        }
      ]
    }
  ];

  // Khi chọn tab trên mobile/ipad thì tự động đóng sidebar drawer
  const handleSelectTab = (tabId: TabType) => {
    setActiveTab(tabId);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Backdrop Overlay khi mở drawer */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      <aside 
        className={`bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col flex-shrink-0 z-40 transition-all duration-300 ease-in-out fixed lg:static inset-y-0 left-0 shadow-2xl lg:shadow-none ${
          !isSidebarOpen ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
        } ${
          isSidebarCollapsed ? 'w-18' : 'w-64'
        }`}
      >
        {/* Profile Card & Collapse Toggle Button */}
        <div className={`border-b border-slate-800 bg-slate-950/60 flex items-center transition-all ${
          isSidebarCollapsed ? 'p-2.5 justify-center' : 'p-3 justify-between'
        }`}>
          {!isSidebarCollapsed ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 text-white font-black flex items-center justify-center text-xs shadow-md shrink-0 tracking-tight">
                  AM
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white leading-tight truncate">AM Huy (ĐNB)</div>
                  <div className="text-[10px] text-orange-400 font-medium truncate flex items-center gap-1">
                    <span>Area Manager</span>
                    <span>&bull;</span>
                    <span className="text-emerald-400">Long An</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Desktop Collapse Button */}
                <button
                  type="button"
                  onClick={() => setIsSidebarCollapsed(true)}
                  className="hidden lg:flex p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                  title="Thu gọn menu bên trái (Ctrl+B)"
                >
                  <PanelLeftClose className="w-4 h-4 text-orange-400" />
                </button>

                {/* Mobile / Tablet Close Button */}
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 lg:hidden"
                  title="Đóng menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSidebarCollapsed(false)}
                className="p-1.5 rounded-lg text-orange-400 hover:text-white hover:bg-slate-800 transition-all hover:scale-110"
                title="Mở rộng menu (Ctrl+B)"
              >
                <PanelLeftOpen className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Nút Mở Sơ Đồ Cây Cơ Cấu (Menu Tổng Hợp) - Giúp AM Huy kiểm soát toàn bộ 10 phân hệ */}
        <div className="p-2 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('open-executive-directory'))}
            className={`w-full flex items-center rounded-xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 hover:from-orange-500 hover:to-amber-500 text-white font-extrabold shadow-md hover:shadow-lg transition-all cursor-pointer group ${
              isSidebarCollapsed ? 'justify-center p-2' : 'justify-between px-2.5 py-2 text-xs'
            }`}
            title="Mở Sơ Đồ Cây Cơ Cấu & Menu Tổng Hợp Dashboard (Ctrl+M)"
          >
            <div className={`flex items-center min-w-0 ${isSidebarCollapsed ? 'justify-center' : 'gap-2'}`}>
              <FolderTree className="w-4 h-4 text-white group-hover:scale-110 transition-transform shrink-0" />
              {!isSidebarCollapsed && (
                <div className="text-left min-w-0">
                  <div className="text-[11px] font-black uppercase tracking-wide truncate">Cây Cơ Cấu Dashboard</div>
                  <div className="text-[9px] text-orange-100 font-medium truncate">Menu Tổng Hợp 10 Phân Hệ</div>
                </div>
              )}
            </div>
            {!isSidebarCollapsed && (
              <span className="px-1.5 py-0.2 rounded bg-black/25 text-[9px] font-mono text-white/90 border border-white/20 shrink-0">
                Ctrl+M
              </span>
            )}
          </button>
        </div>

        {/* Menu Items - Nhóm theo phân hệ */}
        <nav className="p-2 space-y-3 flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-700">
          {categories.map((cat) => {
            const isCatCollapsed = !isSidebarCollapsed && collapsedCategories[cat.id];
            const hasActiveItem = cat.items.some(i => i.id === activeTab);

            return (
              <div key={cat.id} className="space-y-1">
                {/* Tiêu đề Phân Hệ (Có thể bấm thu gọn/mở rộng từng phân hệ) */}
                {!isSidebarCollapsed && (
                  <button
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between px-2.5 py-1 text-[10px] font-black tracking-wider text-slate-400 hover:text-slate-200 transition-colors uppercase group"
                    title={`Bấm để thu gọn/mở rộng nhóm ${cat.title}`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className={`w-1.5 h-1.5 rounded-full ${hasActiveItem ? 'bg-orange-500' : 'bg-slate-600'}`}></span>
                      <span>{cat.title}</span>
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-transform duration-200 ${
                      isCatCollapsed ? '-rotate-90' : 'rotate-0'
                    }`} />
                  </button>
                )}

                {/* Danh sách tabs trong phân hệ */}
                {(!isCatCollapsed || isSidebarCollapsed) && (
                  <div className="space-y-1">
                    {cat.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = activeTab === item.id;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectTab(item.id)}
                          title={isSidebarCollapsed ? `${item.label}: ${item.subLabel}` : undefined}
                          className={`w-full flex items-center rounded-xl text-left transition-all group relative ${
                            isSidebarCollapsed 
                              ? 'justify-center p-2.5' 
                              : 'justify-between px-2.5 py-2'
                          } ${
                            isActive
                              ? 'bg-gradient-to-r from-orange-600 to-amber-600 text-white shadow-md font-bold'
                              : 'hover:bg-slate-800/80 text-slate-300 hover:text-white'
                          }`}
                        >
                          <div className={`flex items-center min-w-0 ${isSidebarCollapsed ? 'justify-center' : 'gap-2.5'}`}>
                            <div className={`p-1 rounded-lg ${isActive ? 'bg-white/20' : 'bg-slate-800 text-slate-400 group-hover:text-orange-400'}`}>
                              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
                            </div>

                            {!isSidebarCollapsed && (
                              <div className="min-w-0">
                                <div className="text-xs truncate flex items-center gap-1.5">
                                  <span>{item.label}</span>
                                  {item.isHot && (
                                    <span className="inline-flex items-center px-1 py-0.2 rounded text-[8px] font-black bg-rose-500 text-white uppercase tracking-tighter animate-pulse">
                                      Hot
                                    </span>
                                  )}
                                </div>
                                <div className={`text-[10px] truncate ${isActive ? 'text-orange-100 font-normal' : 'text-slate-400'}`}>
                                  {item.subLabel}
                                </div>
                              </div>
                            )}
                          </div>

                          {/* Badges */}
                          {!isSidebarCollapsed && item.badge && (
                            <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded-md shrink-0 shadow-2xs ${
                              isActive ? 'bg-orange-950/60 text-orange-200 border border-orange-400/40' : `${item.badgeColor || 'bg-slate-800 text-slate-300'}`
                            }`}>
                              {item.badge}
                            </span>
                          )}

                          {/* Active Indicator Dot in Collapsed Rail */}
                          {isSidebarCollapsed && isActive && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-400 ring-2 ring-slate-900 shadow-sm" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Bottom Toggle Bar & Status Footer */}
        <div className="border-t border-slate-800 bg-slate-950/50 shrink-0">
          {/* Quick Collapse/Expand Bar */}
          <button
            type="button"
            onClick={() => setIsSidebarCollapsed(prev => !prev)}
            className={`w-full py-2 px-3 hidden lg:flex items-center text-xs font-semibold text-slate-400 hover:text-orange-400 hover:bg-slate-800/70 transition-colors border-b border-slate-800/60 ${
              isSidebarCollapsed ? 'justify-center' : 'justify-between'
            }`}
            title={isSidebarCollapsed ? 'Mở rộng menu (Ctrl+B)' : 'Thu gọn menu để mở rộng không gian báo cáo (Ctrl+B)'}
          >
            {!isSidebarCollapsed ? (
              <>
                <span className="flex items-center gap-1.5 text-[11px]">
                  <ChevronLeft className="w-3.5 h-3.5 text-orange-400" />
                  <span>Thu gọn menu</span>
                </span>
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
                  Ctrl+B
                </span>
              </>
            ) : (
              <ChevronRight className="w-4 h-4 text-orange-400 hover:scale-125 transition-transform" />
            )}
          </button>

          {!isSidebarCollapsed && (
            <div className="p-2.5 text-[10px] text-slate-400">
              <div className="flex items-center justify-between font-medium">
                <span>Khu vực: 5 Bưu cục</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Trực tuyến
                </span>
              </div>
              <div className="text-[9px] text-slate-400 mt-1 flex items-center justify-between">
                <span>Đồng bộ Google Sheets</span>
                <span className="text-slate-400 font-mono">Realtime</span>
              </div>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
