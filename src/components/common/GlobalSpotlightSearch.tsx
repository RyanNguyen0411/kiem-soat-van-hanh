import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Search, 
  X, 
  Building2, 
  User, 
  Package, 
  ShoppingBag, 
  BarChart3, 
  CheckCircle2, 
  ArrowRight, 
  Sparkles,
  CornerDownLeft
} from 'lucide-react';
import { useDashboard } from '../../context/DashboardContext';
import type { TabType } from '../../types/dashboard';

// Helper loại bỏ dấu tiếng Việt để tìm kiếm không phân biệt có dấu / không dấu
function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

export type SearchCategory = 'all' | 'feature' | 'employee' | 'post_office' | 'customer' | 'order';

export interface SearchItem {
  id: string;
  category: 'feature' | 'employee' | 'post_office' | 'customer' | 'order';
  categoryLabel: string;
  title: string;
  subTitle: string;
  tag?: string;
  tagColor?: string;
  targetTab: TabType;
  targetElementId?: string;
  destinationLabel: string;
  rawText: string; // for lightning search
}

export const GlobalSpotlightSearch: React.FC = () => {
  const { dataset, setActiveTab } = useDashboard();
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [query, setQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<SearchCategory>('all');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcut Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setActiveCategory('all');
    }
  }, [isOpen]);

  // =========================================================================
  // 1. TẠO INDEX TÌM KIẾM TOÀN HỆ THỐNG (FEATURES, BƯU CỤC, BƯU TÁ, SÀN TMĐT)
  // =========================================================================
  const systemItems = useMemo<SearchItem[]>(() => {
    const items: SearchItem[] = [
      // A. Tính năng & Báo cáo chiến lược
      {
        id: 'feat-tts',
        category: 'feature',
        categoryLabel: 'Báo Cáo Trọng Tâm',
        title: 'Trung Tâm Giám Sát & Bảo Vệ SLA TikTok Shop (TTS)',
        subTitle: 'Quản trị 4.485 đơn sàn TTS (chiếm 41.0% tồn GLT), ma trận 6 bưu cục và quy trình dọn dẹp đơn khẩn',
        tag: 'Ưu Tiên Số 1',
        tagColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300',
        targetTab: 'ton_dong_glt',
        targetElementId: 'section-tts-center',
        destinationLabel: 'Tab: Tồn Đọng GLT ➔ Chiến Dịch TikTok Shop',
        rawText: removeVietnameseAccents('tiktok shop tts chien dich tts bao ve sla 4485 don san tmdt khan cap')
      },
      {
        id: 'feat-ca2-report',
        category: 'feature',
        categoryLabel: 'Báo Cáo Trọng Tâm',
        title: 'Báo Cáo Quản Trị & Thúc Đẩy Giao Hàng Mới Ca 2 (Ca Chiều/Tối)',
        subTitle: 'Đo lường độ phủ bưu tá ra ca 2 (2 chuyến đi/ngày), chỉ số vận hành Volume, Gán, GTC Hàng Mới Ca 2',
        tag: 'Trọng Tâm Ca 2',
        tagColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300',
        targetTab: 'gtc_nhan_vien',
        targetElementId: 'section-ca2-report',
        destinationLabel: 'Tab: GTC Nhân Viên ➔ Báo Cáo Hàng Mới Ca 2',
        rawText: removeVietnameseAccents('hang moi ca 2 ca chieu toi 2 chuyen di 1 chuyen di do phu ca 2 volume gan gtc ton')
      },
      {
        id: 'feat-ca2-matrix-chart',
        category: 'feature',
        categoryLabel: 'Biểu Đồ Ma Trận',
        title: 'Biểu Đồ Ma Trận Vận Hành Ca 2: Volume, Gán, %GTC & Chênh Lệch Gán vs Vol',
        subTitle: 'Composed Chart đo lường sức nặng Volume nhập, SLĐ gán, %GTC và đường chênh lệch (Vol - Gán) kiểm soát tồn kho ca',
        tag: 'Ma Trận Ca 2',
        tagColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border-indigo-300',
        targetTab: 'gtc_nhan_vien',
        targetElementId: 'section-ca2-matrix-chart',
        destinationLabel: 'Tab: GTC Nhân Viên ➔ Biểu Đồ Ma Trận Ca 2',
        rawText: removeVietnameseAccents('bieu do ma tran ca 2 volume gan gtc chenh lech gan vs vol ty le gan hang moi ca 2 chart')
      },
      {
        id: 'feat-ca2-daily',
        category: 'feature',
        categoryLabel: 'Thống Kê Vận Hành',
        title: 'Thống Kê Số Lượng Nhân Viên Đi Ca 2 & Chỉ Đi Ca 1 Theo Từng Ngày',
        subTitle: 'Biến động nhân sự bưu tá ca 2 vs ca 1 theo từng ngày vận hành, đối soát sản lượng Hàng Mới Ca 2',
        tag: 'Theo Dõi Ngày',
        tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
        targetTab: 'gtc_nhan_vien',
        targetElementId: 'section-ca2-daily',
        destinationLabel: 'Tab: GTC Nhân Viên ➔ Thống Kê Ca 2 Theo Ngày',
        rawText: removeVietnameseAccents('thong ke ca 2 theo ngay ca 1 theo ngay bue ta ca 2 ngay van hanh')
      },
      {
        id: 'feat-alert-report',
        category: 'feature',
        categoryLabel: 'Báo Cáo Tồn Đọng',
        title: 'Báo Cáo 1: Thống Kê Mức Cảnh Báo Tồn Đọng Theo Bưu Cục',
        subTitle: 'Phân tích 10.928 đơn tồn theo 4 mốc: Mới (0-12h), Tồn (12-48h), Cảnh báo (48-120h), Khẩn cấp (>120h)',
        tag: 'Rủi Ro Lưu Kho',
        tagColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300',
        targetTab: 'ton_dong_glt',
        targetElementId: 'section-alert-report',
        destinationLabel: 'Tab: Tồn Đọng GLT ➔ Báo Cáo Mức Cảnh Báo',
        rawText: removeVietnameseAccents('bao cao 1 muc canh bao ton dong moi 0-12h 12-48h canh bao 48-120h khan cap >120h')
      },
      {
        id: 'feat-customer-report',
        category: 'feature',
        categoryLabel: 'Báo Cáo Sàn TMĐT',
        title: 'Báo Cáo 2: Thống Kê Tồn Đọng Theo Khách Hàng & Sàn TMĐT',
        subTitle: 'Cơ cấu nguồn đơn sàn (TikTok Shop 41%, Shopee 37.4%, Khách ngoài sàn 21.6%) theo từng bưu cục',
        tag: 'Áp Lực SLA Sàn',
        tagColor: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 border-purple-300',
        targetTab: 'ton_dong_glt',
        targetElementId: 'section-customer-report',
        destinationLabel: 'Tab: Tồn Đọng GLT ➔ Báo Cáo Sàn TMĐT',
        rawText: removeVietnameseAccents('bao cao 2 khach hang san tmdt shopee tiktok shop other doi tac san')
      },
      {
        id: 'feat-gtc-matrix',
        category: 'feature',
        categoryLabel: 'Ma Trận Hiệu Suất',
        title: 'Ma Trận Hiệu Suất GTC Bưu Cục & Chi Tiết Nhân Viên Theo Ngày',
        subTitle: 'Trục tung 6 bưu cục, trục hoành các ngày vận hành, click mở rộng để xem chi tiết từng bưu tá',
        tag: 'Năng Suất Bưu Tá',
        tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
        targetTab: 'gtc_nhan_vien',
        targetElementId: 'section-employee-matrix',
        destinationLabel: 'Tab: GTC Nhân Viên ➔ Ma Trận Hiệu Suất',
        rawText: removeVietnameseAccents('ma tran gtc nhan vien bue ta truc tung truc hoanh 7 ngay 14 ngay')
      },
      {
        id: 'feat-po-impact',
        category: 'feature',
        categoryLabel: 'Biểu Đồ Phân Tích',
        title: 'Biểu Đồ Sức Ảnh Hưởng Từng Bưu Cục So Với Toàn Khu Vực',
        subTitle: 'Composed Chart & Donut Chart đo lường sức nặng Volume và độ đóng góp GTC vào thành tích toàn khu vực',
        tag: 'Trực Quan Hóa',
        tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
        targetTab: 'gtc_nhan_vien',
        destinationLabel: 'Tab: GTC Nhân Viên ➔ Biểu Đồ Sức Ảnh Hưởng',
        rawText: removeVietnameseAccents('bieu do suc anh huong tung bue cuc khu vuc dong gop volume gtc chart')
      },
      {
        id: 'feat-gtc-po',
        category: 'feature',
        categoryLabel: 'Phân Hệ Bưu Cục',
        title: 'Phân Hệ GTC Bưu Cục (6 Bưu Cục Long An)',
        subTitle: 'Quản trị sản lượng Volume, SLĐ Gán, GTC, tỷ lệ chuyển trả, Hàng mới ca 1, ca 2 và hàng tồn',
        tag: '6 Bưu Cục',
        tagColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300',
        targetTab: 'gtc_buu_cuc',
        destinationLabel: 'Tab: GTC Bưu Cục',
        rawText: removeVietnameseAccents('phan he gtc buu cuc volume gan gtc chuyen tra leadtime 6 buu cuc')
      },
      {
        id: 'feat-salary',
        category: 'feature',
        categoryLabel: 'Bảng Lương & Chi Phí',
        title: 'Phân Hệ Bảng Kê Thu Nhập & Hoa Hồng Ngày Bưu Tá',
        subTitle: 'Bảng kê ngày công, đơn giao/lấy tính lương (LTC), năng suất TB ngày và thu nhập hoa hồng',
        tag: 'Quỹ Lương GHN',
        tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
        targetTab: 'hoa_hong_ngay',
        destinationLabel: 'Tab: Hoa Hồng Ngày',
        rawText: removeVietnameseAccents('hoa hong ngay bang luong thu nhap don giao tinh luong don lay ltc cong chuan')
      },
      {
        id: 'feat-return',
        category: 'feature',
        categoryLabel: 'Kiểm Soát Hoàn Hàng',
        title: 'Phân Hệ Kiểm Soát Tỷ Lệ Chuyển Trả',
        subTitle: 'Theo dõi chi tiết tỷ lệ chuyển trả, đơn hoàn và các điểm nghẽn phát sinh hàng trả toàn khu vực',
        tag: 'Chuyển Trả',
        tagColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
        targetTab: 'ty_le_tra_hang',
        destinationLabel: 'Tab: Tỷ Lệ Trả Hàng',
        rawText: removeVietnameseAccents('ty le tra hang chuyen tra don hoan hang tra kiem soat tra')
      },
      {
        id: 'feat-lc',
        category: 'feature',
        categoryLabel: 'Luân Chuyển Tồn',
        title: 'Phân Hệ Kiểm Soát Luân Chuyển Tồn & Kho Trung Tâm (284 Đơn LC)',
        subTitle: 'Quản trị 284 vận đơn luân chuyển tồn, trạng thái điều phối và cảnh báo khẩn cấp lưu chuyển kho',
        tag: '284 Đơn LC',
        tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
        targetTab: 'ton_dong_lc',
        destinationLabel: 'Tab: Tồn Đọng LC',
        rawText: removeVietnameseAccents('ton dong lc luan chuyen ton kho trung tam 284 don trung chuyen')
      },
      {
        id: 'feat-overview',
        category: 'feature',
        categoryLabel: 'Executive Dashboard',
        title: 'Phân Hệ Tổng Quan Điều Hành Khu Vực (Overview BI)',
        subTitle: 'Bức tranh toàn cảnh KPIs, Radar cảnh báo rủi ro, phân bổ sản lượng 6 bưu cục khu vực Long An',
        tag: 'Executive BI',
        tagColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300',
        targetTab: 'overview',
        destinationLabel: 'Tab: Tổng Quan',
        rawText: removeVietnameseAccents('tong quan overview bi executive kpis radar canh bao dieu hanh')
      },

      // B. 6 Bưu cục trọng điểm
      {
        id: 'po-rk',
        category: 'post_office',
        categoryLabel: 'Bưu Cục',
        title: 'Bưu Cục: (LAN) Rạch Kiến',
        subTitle: '22 Bưu tá • Volume 12.572 đơn • GTC 71.6% • Tồn GLT 4.428 đơn (Shopee 2.112, TTS 1.672) • Ca 2 đạt 82.5%',
        tag: 'Volume Lớn Nhất',
        tagColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300',
        targetTab: 'gtc_buu_cuc',
        destinationLabel: 'Tab: GTC Bưu Cục ➔ (LAN) Rạch Kiến',
        rawText: removeVietnameseAccents('lan rach kien rach kien rk buu cuc rach kien 22 bue ta')
      },
      {
        id: 'po-cg',
        category: 'post_office',
        categoryLabel: 'Bưu Cục',
        title: 'Bưu Cục: (LAN) Cần Giuộc',
        subTitle: '18 Bưu tá • Volume 7.420 đơn • GTC 77.0% • Tồn GLT 2.230 đơn • CẢNH BÁO: Ca 2 chỉ đạt 51.5% (227 ca 1 chuyến)',
        tag: 'Cần Đôn Đốc Ca 2',
        tagColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300',
        targetTab: 'gtc_buu_cuc',
        destinationLabel: 'Tab: GTC Bưu Cục ➔ (LAN) Cần Giuộc',
        rawText: removeVietnameseAccents('lan can giuoc can giuoc cg buu cuc can giuoc 18 bue ta canh bao ca 2')
      },
      {
        id: 'po-pl',
        category: 'post_office',
        categoryLabel: 'Bưu Cục',
        title: 'Bưu Cục: (LAN) Phước Lý',
        subTitle: '15 Bưu tá • Volume 10.928 đơn • GTC 76.5% • Tồn GLT 1.760 đơn (TTS 759, Shopee 545) • Ca 2 đạt 69.6%',
        tag: 'Tồn Lớn Thứ 3',
        tagColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300',
        targetTab: 'gtc_buu_cuc',
        destinationLabel: 'Tab: GTC Bưu Cục ➔ (LAN) Phước Lý',
        rawText: removeVietnameseAccents('lan phuoc ly phuoc ly pl buu cuc phuoc ly 15 bue ta')
      },
      {
        id: 'po-tv',
        category: 'post_office',
        categoryLabel: 'Bưu Cục',
        title: 'Bưu Cục: (LAN) Tầm Vu',
        subTitle: '12 Bưu tá • Volume 7.527 đơn • GTC 78.6% • Tồn GLT 1.184 đơn (TTS 592, Shopee 319) • Ca 2 đạt 61.8%',
        tag: 'Tuyến Giao Xa',
        tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
        targetTab: 'gtc_buu_cuc',
        destinationLabel: 'Tab: GTC Bưu Cục ➔ (LAN) Tầm Vu',
        rawText: removeVietnameseAccents('lan tam vu tam vu tv buu cuc tam vu 12 bue ta')
      },
      {
        id: 'po-cd',
        category: 'post_office',
        categoryLabel: 'Bưu Cục',
        title: 'Bưu Cục: (LAN) Cần Đước',
        subTitle: '9 Bưu tá • Volume 6.478 đơn • GTC 84.7% • Tồn GLT 535 đơn (TTS 275, Shopee 142) • Ca 2 đạt 68.8%',
        tag: 'GTC Tốt 84.7%',
        tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
        targetTab: 'gtc_buu_cuc',
        destinationLabel: 'Tab: GTC Bưu Cục ➔ (LAN) Cần Đước',
        rawText: removeVietnameseAccents('lan can duoc can duoc cd buu cuc can duoc 9 bue ta')
      },
      {
        id: 'po-cd1',
        category: 'post_office',
        categoryLabel: 'Bưu Cục',
        title: 'Bưu Cục: (LAN) Cần Đước 1',
        subTitle: '9 Bưu tá • Volume 1.010 đơn • GTC 85.3% • Tồn GLT 791 đơn • ĐẠT CHUẨN 100% bưu tá tham gia Ca 2',
        tag: '100% Ca 2 Mẫu',
        tagColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300',
        targetTab: 'gtc_buu_cuc',
        destinationLabel: 'Tab: GTC Bưu Cục ➔ (LAN) Cần Đước 1',
        rawText: removeVietnameseAccents('lan can duoc 1 can duoc 1 cd1 buu cuc can duoc 1 100% ca 2')
      },

      // C. Sàn TMĐT & Nhóm Khách Hàng
      {
        id: 'cust-tts',
        category: 'customer',
        categoryLabel: 'Sàn TMĐT',
        title: 'TikTok Shop (TTS) - 4.485 Đơn Tồn (41.0%)',
        subTitle: 'Trọng tâm bảo vệ SLA 120h/192h • Tồn nhiều nhất tại Rạch Kiến (1.672 đơn) và Cần Giuộc (799 đơn)',
        tag: 'Chiến Dịch Nóng',
        tagColor: 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300 border-rose-300',
        targetTab: 'ton_dong_glt',
        targetElementId: 'section-tts-center',
        destinationLabel: 'Tab: Tồn Đọng GLT ➔ Chiến Dịch TikTok Shop',
        rawText: removeVietnameseAccents('tiktok shop tts san tiktok shop 4485 don ton')
      },
      {
        id: 'cust-shopee',
        category: 'customer',
        categoryLabel: 'Sàn TMĐT',
        title: 'Shopee - 4.082 Đơn Tồn (37.4%)',
        subTitle: 'Sàn chiếm tỷ trọng lớn thứ 2 • Rạch Kiến tập trung 2.112 đơn (chiếm 48% tồn bưu cục), Cần Giuộc 747 đơn',
        tag: 'Áp Lực SLA Cao',
        tagColor: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border-orange-300',
        targetTab: 'ton_dong_glt',
        targetElementId: 'section-customer-report',
        destinationLabel: 'Tab: Tồn Đọng GLT ➔ Báo Cáo Sàn TMĐT (Shopee)',
        rawText: removeVietnameseAccents('shopee san shopee 4082 don ton rach kien shopee')
      },
      {
        id: 'cust-other',
        category: 'customer',
        categoryLabel: 'Khách Ngoài Sàn',
        title: 'Khách Lẻ & Đối Tác Ngoài Sàn (OTHER) - 2.361 Đơn Tồn (21.6%)',
        subTitle: 'Nguồn đơn tự doanh & shop cá nhân • Tồn tại Cần Giuộc 684 đơn, Rạch Kiến 644 đơn, Phước Lý 456 đơn',
        tag: 'Khách Lẻ',
        tagColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
        targetTab: 'ton_dong_glt',
        targetElementId: 'section-customer-report',
        destinationLabel: 'Tab: Tồn Đọng GLT ➔ Báo Cáo Khách Hàng (OTHER)',
        rawText: removeVietnameseAccents('other khach le ngoai san doi tac khac 2361 don')
      }
    ];

    // D. Trích xuất danh sách 73 Bưu tá độc nhất từ dataset.gtcNhanVien
    const courierMap = new Map<string, {
      maNV: string;
      tenNV: string;
      buuCuc: string;
      totalShifts: number;
      totalOrders: number;
      totalGtc: number;
      chuyenDiCount: number;
    }>();

    dataset.gtcNhanVien.forEach(r => {
      if (!r.maNV) return;
      if (!courierMap.has(r.maNV)) {
        courierMap.set(r.maNV, {
          maNV: r.maNV,
          tenNV: r.tenNV,
          buuCuc: r.buuCuc,
          totalShifts: 0,
          totalOrders: 0,
          totalGtc: 0,
          chuyenDiCount: 0
        });
      }
      const c = courierMap.get(r.maNV)!;
      c.totalShifts++;
      c.totalOrders += r.tongDon;
      c.totalGtc += r.tongDonGTC;
      if (r.chuyenDi >= 2) c.chuyenDiCount++;
    });

    courierMap.forEach(c => {
      const gtcRate = c.totalOrders > 0 ? ((c.totalGtc / c.totalOrders) * 100).toFixed(1) : '0.0';
      items.push({
        id: `emp-${c.maNV}`,
        category: 'employee',
        categoryLabel: 'Bưu Tá / Nhân Viên',
        title: `${c.tenNV} (Mã: ${c.maNV})`,
        subTitle: `Bưu cục: ${c.buuCuc} • ${c.totalShifts} ca phát • GTC: ${c.totalGtc.toLocaleString('vi-VN')}/${c.totalOrders.toLocaleString('vi-VN')} đơn (${gtcRate}%) • ${c.chuyenDiCount} ca đi Ca 2`,
        tag: c.buuCuc.replace('(LAN) ', ''),
        tagColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border-blue-300',
        targetTab: 'gtc_nhan_vien',
        destinationLabel: `Tab: GTC Nhân Viên ➔ Bưu Tá ${c.tenNV}`,
        rawText: removeVietnameseAccents(`${c.tenNV} ${c.maNV} ${c.buuCuc} bue ta nhan vien`)
      });
    });

    return items;
  }, [dataset.gtcNhanVien]);

  // =========================================================================
  // 2. TÌM KIẾM THEO TỪ KHÓA & QUÉT MÃ ĐƠN HÀNG NHANH
  // =========================================================================
  const searchResults = useMemo<SearchItem[]>(() => {
    const qClean = removeVietnameseAccents(query);
    if (!qClean) return [];

    const results: SearchItem[] = [];

    // Lọc các item hệ thống, bưu cục, bưu tá, sàn
    const matchedSystem = systemItems.filter(item => {
      if (activeCategory !== 'all' && item.category !== activeCategory) return false;
      return item.rawText.includes(qClean) || 
             removeVietnameseAccents(item.title).includes(qClean) ||
             removeVietnameseAccents(item.subTitle).includes(qClean);
    });

    results.push(...matchedSystem);

    // Nếu từ khóa có thể là mã đơn hàng (độ dài >= 3 hoặc chứa số/tiền tố VNG, GYM)
    if (activeCategory === 'all' || activeCategory === 'order') {
      const isOrderQuery = qClean.length >= 3;
      if (isOrderQuery) {
        // Quét tonDongGlt (top 12)
        let orderMatches = 0;
        for (const o of dataset.tonDongGlt) {
          if (orderMatches >= 12) break;
          const codeClean = o.maDonHang.toLowerCase();
          if (codeClean.includes(qClean)) {
            results.push({
              id: `order-glt-${o.maDonHang}`,
              category: 'order',
              categoryLabel: 'Vận Đơn Tồn GLT',
              title: `Đơn Hàng: ${o.maDonHang}`,
              subTitle: `Bưu cục: ${o.buuCuc} • Loại: ${o.loaiDon} • Sàn: ${o.khachHang} • Tuổi tồn: ${o.thoiGianTonDong}`,
              tag: o.canhBao,
              tagColor: o.canhBao.includes('Khẩn cấp') ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800',
              targetTab: 'ton_dong_glt',
              destinationLabel: 'Tab: Tồn Đọng GLT ➔ Tra Cứu Vận Đơn',
              rawText: o.maDonHang.toLowerCase()
            });
            orderMatches++;
          }
        }

        // Quét tonDongLc (top 6)
        let lcMatches = 0;
        for (const o of dataset.tonDongLc) {
          if (lcMatches >= 6) break;
          const codeClean = o.maDonHang.toLowerCase();
          if (codeClean.includes(qClean)) {
            results.push({
              id: `order-lc-${o.maDonHang}`,
              category: 'order',
              categoryLabel: 'Vận Đơn Luân Chuyển LC',
              title: `Đơn LC: ${o.maDonHang}`,
              subTitle: `Kho/BC: ${o.tenBC} • Loại: ${o.loaiDon} • Tuổi tồn: ${o.thoiGianTonDong}`,
              tag: o.canhBao,
              tagColor: 'bg-purple-100 text-purple-800',
              targetTab: 'ton_dong_lc',
              destinationLabel: 'Tab: Tồn Đọng LC ➔ Vận Đơn Luân Chuyển',
              rawText: o.maDonHang.toLowerCase()
            });
            lcMatches++;
          }
        }
      }
    }

    return results;
  }, [query, activeCategory, systemItems, dataset.tonDongGlt, dataset.tonDongLc]);

  // Navigate when keyboard ArrowUp / ArrowDown / Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < searchResults.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (searchResults.length > 0 && selectedIndex < searchResults.length) {
        handleSelectItem(searchResults[selectedIndex]);
      }
    }
  };

  // Click chọn kết quả -> Chuyển tab & Cuộn mượt mà đến vị trí
  const handleSelectItem = (item: SearchItem) => {
    setIsOpen(false);
    setActiveTab(item.targetTab);

    // Toast thông báo chỉ định nơi trả kết quả
    setToastMessage(`Đã chuyển tới: ${item.destinationLabel}`);
    setTimeout(() => setToastMessage(null), 3500);

    // Scroll tới element đích nếu có
    if (item.targetElementId) {
      setTimeout(() => {
        const el = document.getElementById(item.targetElementId!);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          // Highlight nhẹ element
          el.classList.add('ring-4', 'ring-orange-500/50', 'transition-all');
          setTimeout(() => {
            el.classList.remove('ring-4', 'ring-orange-500/50');
          }, 2000);
        }
      }, 250);
    }
  };

  // Render Icon theo Category
  const renderItemIcon = (category: SearchItem['category']) => {
    switch (category) {
      case 'feature':
        return <BarChart3 className="w-4 h-4 text-orange-600" />;
      case 'post_office':
        return <Building2 className="w-4 h-4 text-emerald-600" />;
      case 'employee':
        return <User className="w-4 h-4 text-blue-600" />;
      case 'customer':
        return <ShoppingBag className="w-4 h-4 text-purple-600" />;
      case 'order':
        return <Package className="w-4 h-4 text-rose-600" />;
      default:
        return <Search className="w-4 h-4 text-slate-500" />;
    }
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. FLOATING SEARCH BUTTON Ở GÓC DƯỚI BÊN PHẢI (THU GỌN GỌN GÀNG, KHÔNG CHỒNG CHÉO) */}
      {/* ========================================================================= */}
      <div className="fixed bottom-15 lg:bottom-6 right-3 lg:right-6 z-40 flex items-center group">
        {/* Tooltip hiển thị khi hover */}
        <div className="hidden sm:flex items-center gap-1.5 mr-2 px-2.5 py-1 rounded-full bg-slate-900/95 text-white text-[11px] font-semibold shadow-lg backdrop-blur-xs border border-slate-700/80 opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none translate-x-2 group-hover:translate-x-0">
          <Sparkles className="w-3 h-3 text-amber-400 animate-spin" />
          <span>Tìm kiếm</span>
          <kbd className="ml-1 px-1 py-0.2 rounded bg-slate-800 text-[9px] font-mono border border-slate-700 text-orange-400">
            Ctrl+K
          </kbd>
        </div>

        {/* Nút bấm tròn Floating Action Button thu gọn tinh tế */}
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="relative w-9 h-9 sm:w-10 sm:h-10 lg:w-11 lg:h-11 rounded-full bg-gradient-to-r from-orange-500 via-orange-600 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200 flex items-center justify-center border border-white/80 dark:border-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-400/40"
          title="Mở Tìm Kiếm Nhanh (Ctrl + K)"
          aria-label="Mở tìm kiếm nhanh"
        >
          <Search className="w-4 h-4 sm:w-4.5 sm:h-4.5 lg:w-5 lg:h-5 text-white stroke-[2.3]" />
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 2. SPOTLIGHT SEARCH MODAL (COMMAND PALETTE) */}
      {/* ========================================================================= */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-start justify-center pt-10 sm:pt-16 px-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
        >
          <div className="w-full max-w-2xl bg-white dark:bg-slate-850 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[82vh] animate-in zoom-in-95 duration-150">
            {/* Thanh Tìm Kiếm Header */}
            <div className="relative flex items-center border-b border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 px-4">
              <Search className="w-5 h-5 text-orange-600 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setSelectedIndex(0);
                }}
                onKeyDown={handleKeyDown}
                placeholder="Gõ mã đơn, tên bưu tá, mã NV, bưu cục, sàn (TTS/Shopee), tính năng..."
                className="w-full pl-3 pr-20 py-3.5 text-sm sm:text-base font-semibold text-slate-900 dark:text-white bg-transparent focus:outline-none placeholder:text-slate-400 placeholder:font-normal"
              />
              <div className="flex items-center gap-1.5 shrink-0">
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery('');
                      inputRef.current?.focus();
                    }}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                    title="Xóa từ khóa"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-slate-200/80 dark:bg-slate-750 text-slate-600 dark:text-slate-300 rounded border border-slate-300 dark:border-slate-600">
                  ESC
                </kbd>
              </div>
            </div>

            {/* Bộ Lọc Danh Mục Tabs */}
            <div className="flex items-center gap-1.5 px-4 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30 overflow-x-auto text-xs no-scrollbar">
              {[
                { key: 'all', label: 'Tất cả' },
                { key: 'feature', label: 'Báo cáo & Tính năng' },
                { key: 'employee', label: 'Bưu tá (73 NV)' },
                { key: 'post_office', label: 'Bưu cục (6 BC)' },
                { key: 'customer', label: 'Sàn & Khách hàng' },
                { key: 'order', label: 'Mã Vận Đơn' }
              ].map(cat => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.key as SearchCategory);
                    setSelectedIndex(0);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                    activeCategory === cat.key
                      ? 'bg-orange-600 text-white shadow-2xs'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Danh Sách Kết Quả hoặc Gợi Ý Mặc Định */}
            <div 
              ref={resultsContainerRef}
              className="flex-1 overflow-y-auto p-3 space-y-1.5 max-h-[55vh]"
            >
              {/* Khi chưa gõ từ khóa: Hiển thị gợi ý thông minh */}
              {!query.trim() ? (
                <div className="p-3 space-y-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5 text-orange-500" />
                    <span>Gợi Ý Tìm Kiếm Nhanh Phổ Biến</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { label: 'TikTok Shop (TTS)', sub: 'Chiến dịch dọn dẹp 4.485 đơn SLA khẩn', query: 'TikTok Shop' },
                      { label: 'Hàng Mới Ca 2', sub: 'Quản trị độ phủ bưu tá đi 2 ca', query: 'Hàng Mới Ca 2' },
                      { label: 'Thống Kê Ca 2 Theo Ngày', sub: 'Biến động nhân sự ca chiều từng ngày', query: 'Thống kê ca 2 theo ngày' },
                      { label: 'Mức Cảnh Báo Tồn Đọng', sub: 'Báo cáo 10.928 đơn theo mốc quá hạn', query: 'Mức Cảnh Báo' },
                      { label: 'Ma Trận GTC Nhân Viên', sub: 'Hiệu suất 73 bưu tá qua từng ngày', query: 'Ma Trận GTC' },
                      { label: 'Bưu Cục Rạch Kiến', sub: 'Bưu cục volume & tồn lớn nhất khu vực', query: 'Rạch Kiến' },
                      { label: 'Bưu Cục Cần Giuộc', sub: 'Bưu cục cần đôn đốc tăng tỷ lệ ca 2', query: 'Cần Giuộc' },
                      { label: 'Bảng Lương Hoa Hồng Ngày', sub: 'Tạm tính lương & năng suất bưu tá', query: 'Hoa Hồng Ngày' }
                    ].map(sug => (
                      <button
                        key={sug.label}
                        type="button"
                        onClick={() => {
                          setQuery(sug.query);
                          inputRef.current?.focus();
                        }}
                        className="text-left p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:border-orange-400 dark:hover:border-orange-500/60 hover:bg-orange-50/50 dark:hover:bg-slate-800 transition-all group cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-slate-100 group-hover:text-orange-600 dark:group-hover:text-orange-400">
                          <span>{sug.label}</span>
                          <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-orange-500" />
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {sug.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                /* Không tìm thấy kết quả */
                <div className="py-10 text-center space-y-2">
                  <Package className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto animate-bounce" />
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                    Không tìm thấy kết quả phù hợp cho &quot;{query}&quot;
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Thử tìm theo tên bưu tá, mã NV (318...), tên bưu cục, mã đơn hàng (VNGHB...) hoặc tên sàn TMĐT.
                  </p>
                </div>
              ) : (
                /* Danh Sách Kết Quả Trả Về */
                <div className="space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
                    Tìm thấy {searchResults.length} kết quả phù hợp
                  </div>

                  {searchResults.map((item, idx) => {
                    const isSelected = idx === selectedIndex;
                    return (
                      <div
                        key={item.id}
                        onClick={() => handleSelectItem(item)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                          isSelected
                            ? 'bg-orange-50/80 dark:bg-orange-950/30 border-orange-300 dark:border-orange-800 shadow-2xs'
                            : 'bg-white dark:bg-slate-800 border-slate-200/80 dark:border-slate-750 hover:bg-slate-50 dark:hover:bg-slate-750'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 shrink-0 mt-0.5">
                              {renderItemIcon(item.category)}
                            </span>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                                  {item.title}
                                </h4>
                                {item.tag && (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${item.tagColor || 'bg-slate-100 text-slate-700'}`}>
                                    {item.tag}
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                {item.subTitle}
                              </p>
                            </div>
                          </div>

                          {/* Phím Enter indicator khi được chọn */}
                          {isSelected && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-bold text-orange-600 dark:text-orange-400 bg-orange-100/80 dark:bg-orange-900/50 px-2 py-1 rounded-md shrink-0">
                              <span>Nhấn</span>
                              <CornerDownLeft className="w-3 h-3" />
                            </span>
                          )}
                        </div>

                        {/* CHỈ ĐỊNH NƠI TRẢ KẾT QUẢ RÕ RÀNG (YÊU CẦU NGƯỜI DÙNG) */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-750 text-[10.5px]">
                          <span className="inline-flex items-center gap-1 font-bold text-indigo-700 dark:text-indigo-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                            📍 Chuyển đến: <strong className="underline decoration-indigo-400">{item.destinationLabel}</strong>
                          </span>
                          <span className="text-slate-400 font-medium hidden sm:inline">
                            Bấm để mở ngay
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Hướng Dẫn Phím Tắt */}
            <div className="px-4 py-2.5 bg-slate-100/70 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-mono text-[10px]">↑</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-mono text-[10px]">↓</kbd>
                  <span>Điều hướng</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-mono text-[10px]">↵</kbd>
                  <span>Chọn</span>
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 font-mono text-[10px]">ESC</kbd>
                  <span>Đóng</span>
                </span>
              </div>
              <div className="font-semibold text-orange-600 dark:text-orange-400">
                GHN Spotlight Search
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification khi nhảy đến mục đã chọn */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 animate-in slide-in-from-top-3 fade-in duration-200 pointer-events-none">
          <div className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-2xl border border-slate-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </>
  );
};
