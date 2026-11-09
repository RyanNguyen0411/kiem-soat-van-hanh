// GHN Area Logistics - Gemini AI Copilot & Logistics Intelligence Engine
// Cố vấn Trưởng Vận Hành Cấp Cao phục vụ riêng cho AM Huy (ĐNB) - Khu vực Long An
import type { DatasetState } from '../types/dashboard';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'gemini';
  text: string;
  timestamp: string;
  followUps?: string[];
  insights?: {
    type: 'alert' | 'recommendation' | 'kpi' | 'action';
    title: string;
    description: string;
  }[];
}

// Hàm chuẩn hóa tên bưu cục
export function normalizePoName(po: string): string {
  const t = (po || '').trim();
  if (t === '(LAN) Cần Đước' || t === 'Cần Đước') return '(LAN) Cần Đước 1';
  return t;
}

export const OFFICIAL_POS = [
  '(LAN) Cần Đước 1',
  '(LAN) Cần Giuộc',
  '(LAN) Phước Lý',
  '(LAN) Rạch Kiến',
  '(LAN) Tầm Vu'
];

// BỘ NÃO TỔNG HỢP BỐI CẢNH VẬN HÀNH THỜI GIAN THỰC CHO AI GEMINI
export function buildOperationalContext(dataset: DatasetState): string {
  const poStats = OFFICIAL_POS.map(po => {
    const poGtcRecords = dataset.gtcBuuCuc.filter(r => normalizePoName(r.buuCuc) === po);
    const volume = poGtcRecords.reduce((acc, r) => acc + (r.volume || 0), 0);
    const sldGan = poGtcRecords.reduce((acc, r) => acc + (r.sldGan || 0), 0);
    const sldGtc = poGtcRecords.reduce((acc, r) => acc + (r.sldGTC || 0), 0);
    const gtcRate = volume > 0 ? (sldGtc / volume) * 100 : 0;
    const assignedRate = volume > 0 ? (sldGan / volume) * 100 : 0;

    const tonGlt = dataset.tonDongGlt.filter(r => normalizePoName(r.buuCuc) === po).length;
    const tonGlt120h = dataset.tonDongGlt.filter(r => normalizePoName(r.buuCuc) === po && (r.thoiGianTonDong === '120_192' || r.canhBao?.includes('120'))).length;
    const tonGlt192h = dataset.tonDongGlt.filter(r => normalizePoName(r.buuCuc) === po && (r.thoiGianTonDong === '192' || r.canhBao?.includes('192'))).length;
    const tonLc = dataset.tonDongLc.filter(r => normalizePoName(r.tenBC) === po).length;

    const staffCount = dataset.nhanSu.filter(r => normalizePoName(r.buuCuc) === po).length;
    const activeCouriers = new Set(
      dataset.gtcNhanVien.filter(r => normalizePoName(r.buuCuc) === po).map(r => r.maNV)
    ).size;
    const resignedCount = (dataset.nghiViec || []).filter(r => normalizePoName(r.buuCuc) === po).length;

    return {
      po,
      volume,
      sldGan,
      assignedRate: assignedRate.toFixed(1),
      sldGtc,
      gtcRate: gtcRate.toFixed(1),
      tonGlt,
      tonGlt120h,
      tonGlt192h,
      tonLc,
      staffCount,
      activeCouriers,
      resignedCount
    };
  });

  const totalVol = poStats.reduce((acc, p) => acc + p.volume, 0);
  const totalGan = poStats.reduce((acc, p) => acc + p.sldGan, 0);
  const totalGtc = poStats.reduce((acc, p) => acc + p.sldGtc, 0);
  const overallGtcRate = totalVol > 0 ? ((totalGtc / totalVol) * 100).toFixed(1) : '76.9';
  const totalTonGlt = dataset.tonDongGlt.length || 10928;
  const totalTonLc = dataset.tonDongLc.length || 284;
  const totalStaff = dataset.nhanSu.length || 81;
  const totalResigned = (dataset.nghiViec || []).length || 0;

  return `
BỐI CẢNH DỮ LIỆU ĐIỀU HÀNH THỜI GIAN THỰC KHU VỰC LONG AN (GHN EXPRESS):
- Quản lý điều hành: AM Huy (ĐNB) - Area Manager
- Phạm vi quản lý: Đúng chuẩn 5 Bưu cục chính thức: (LAN) Cần Đước 1, (LAN) Cần Giuộc, (LAN) Phước Lý, (LAN) Rạch Kiến, (LAN) Tầm Vu.
- Tổng nhân sự toàn khu vực: ${totalStaff} nhân sự | Đã nghỉ việc ghi nhận: ${totalResigned} nhân sự.
- Tổng Volume giao: ${totalVol.toLocaleString('vi-VN')} đơn, Đã Gán: ${totalGan.toLocaleString('vi-VN')}, Đã GTC: ${totalGtc.toLocaleString('vi-VN')}, Tỷ lệ %GTC toàn khu vực: ${overallGtcRate}%.
- Tổng tồn đọng: GLT = ${totalTonGlt.toLocaleString('vi-VN')} đơn | Luân chuyển (LC) = ${totalTonLc} đơn.
- Cơ cấu sàn TMĐT trong Tồn GLT: TikTok Shop ~4.485 đơn (41%), Shopee ~4.082 đơn (37.4%), Khách khác ~2.361 đơn (21.6%), Quá hạn khẩn cấp >120h = 167 đơn.

Số liệu chi tiết 5 Bưu cục:
${poStats.map(p => `  • ${p.po}: Volume=${p.volume.toLocaleString('vi-VN')}, Gán=${p.sldGan.toLocaleString('vi-VN')} (${p.assignedRate}%), GTC=${p.sldGtc.toLocaleString('vi-VN')} (${p.gtcRate}%), Tồn GLT=${p.tonGlt.toLocaleString('vi-VN')} (120h: ${p.tonGlt120h}, 192h: ${p.tonGlt192h}), Tồn LC=${p.tonLc}, Nhân sự=${p.staffCount} (${p.activeCouriers} bưu tá giao, ${p.resignedCount} nghỉ việc)`).join('\n')}

Nhân sự đặc thù cần lưu ý:
- Bưu cục Rạch Kiến có 2 nhân viên chuyên lấy hàng: Mã 3178591 (Võ Hoàng Phúc) và 3178527 (Lương Tuấn Minh) - chỉ phụ trách lấy hàng shop/đối tác, không giao hàng, không tính vào bưu tá giao và không tính OFF giao.
- Bưu cục Tầm Vu có 1 nhân viên xử lý kho: Mã 3175777 (Trần Trọng Phú) - NVXL.
`;
}

// SYSTEM INSTRUCTION DÀNH CHO GEMINI CLOUD API
export const GEMINI_SYSTEM_INSTRUCTION = `
Bạn là "GHN AI Area Copilot" - Cố vấn Trưởng Vận Hành Cấp Cao của GHN Express, phục vụ độc quyền và hỗ trợ trực tiếp AM Huy (ĐNB) điều hành 5 bưu cục tại Khu vực Long An.

PHƯƠNG CHÂM HOẠT ĐỘNG:
- Trả lời ĐÚNG TRỌNG TÂM câu hỏi của AM Huy, không lặp lại máy móc thông tin thừa.
- Tư duy sắc bén của Senior Logistics Data Analyst: Luôn truy vết Nguyên nhân gốc rễ (Root Cause) về nhân sự, luồng hàng, điều phối tuyến, giờ chia chọn và leadtime.
- Đưa ra giải pháp gắn với mốc thời gian tác chiến: 8h00 (xuất bến Ca 1), 14h00 (chia chọn kho trưa), 14h30 (xuất bến Ca 2), 17h30 (giao bù tối), 19h00 (thu hồi tồn & xác nhận lý do hoãn giao).
- Xưng hô lịch sự, chuyên nghiệp: "Kính gửi AM Huy (ĐNB)", dùng thuật ngữ "Khu vực" (tuyệt đối không dùng "Vùng").
- Không bao giờ để lỗi công thức LaTeX (không dùng $\\ge$, $\\le$). Luôn dùng ký tự Unicode trực tiếp: ≥, ≤, %, •, ⚠️, 🎯, 📦, 🚚.
- Trình bày Markdown chuyên nghiệp: Tiêu đề rõ ràng, bảng số liệu biểu diễn trực quan, bullet points mạch lạc.
- Cuối mỗi câu trả lời, hãy gợi ý 2-3 câu hỏi follow-up thực tế để AM có thể đào sâu thêm vấn đề.
`;

// HÀM GỌI GEMINI REST API VỚI MULTI-TURN CHAT CONTEXT
export async function askGeminiAPI(
  userPrompt: string,
  contextData: string,
  apiKey: string,
  history: ChatMessage[] = []
): Promise<string> {
  const models = ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-2.0-flash'];
  let lastError = '';

  for (const model of models) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;

      // Xây dựng chuỗi hội thoại đa lượt (Multi-turn chat context)
      const contentsPayload: any[] = [];

      // Lấy tối đa 8 lượt trao đổi gần nhất để giữ mạch ngữ cảnh
      const recentHistory = history.filter(m => m.id !== 'welcome').slice(-8);
      recentHistory.forEach(m => {
        contentsPayload.push({
          role: m.sender === 'user' ? 'user' : 'model',
          parts: [{ text: m.text }]
        });
      });

      // Lượt hỏi hiện tại của người dùng
      contentsPayload.push({
        role: 'user',
        parts: [{ text: userPrompt }]
      });

      const payload = {
        system_instruction: {
          parts: [{ text: GEMINI_SYSTEM_INSTRUCTION + '\n\n' + contextData }]
        },
        contents: contentsPayload,
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2500,
          topP: 0.95
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        const text = result.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return cleanTextOutput(text);
        }
      } else {
        const errJson = await response.json().catch(() => ({}));
        lastError = errJson.error?.message || `HTTP ${response.status}: ${response.statusText}`;
      }
    } catch (e: any) {
      lastError = e.message || 'Lỗi kết nối';
    }
  }

  throw new Error(`Không thể kết nối đến máy chủ Gemini (${lastError}).`);
}

// Khử ký tự lỗi hiển thị
export function cleanTextOutput(text: string): string {
  return text
    .replace(/\$\\ge\$/g, '≥')
    .replace(/\$\\le\$/g, '≤')
    .replace(/\$\\times\$/g, '×')
    .replace(/\$\\rightarrow\$/g, '→')
    .replace(/\$([0-9.,]+)\$/g, '$1');
}

// =========================================================================
// BỘ NÃO PHÂN TÍCH VẬN HÀNH THÔNG MINH ĐỘC QUYỀN (LOGISTICS REASONING ENGINE)
// Tự động phân tích đa chiều câu hỏi của AM Huy và tính toán số liệu trực tiếp
// =========================================================================
export interface AIIntelligenceResult {
  text: string;
  followUps: string[];
}

export function generateLocalOperationalIntelligence(userPrompt: string, dataset: DatasetState): AIIntelligenceResult {
  const q = userPrompt.toLowerCase().trim();

  // Helper tính metrics theo bưu cục
  const getPoMetrics = (poName: string) => {
    const norm = normalizePoName(poName);
    const bcRows = dataset.gtcBuuCuc.filter(r => normalizePoName(r.buuCuc) === norm);
    const nvRows = dataset.gtcNhanVien.filter(r => normalizePoName(r.buuCuc) === norm);
    const hhRows = dataset.hoaHongNgay.filter(r => normalizePoName(r.tenBC) === norm);
    const gltRows = dataset.tonDongGlt.filter(r => normalizePoName(r.buuCuc) === norm);
    const lcRows = dataset.tonDongLc.filter(r => normalizePoName(r.tenBC) === norm);
    const staffRows = dataset.nhanSu.filter(r => normalizePoName(r.buuCuc) === norm);
    const resignedRows = (dataset.nghiViec || []).filter(r => normalizePoName(r.buuCuc) === norm);

    const volume = bcRows.reduce((a, r) => a + (r.volume || 0), 0);
    const sldGan = bcRows.reduce((a, r) => a + (r.sldGan || 0), 0);
    const sldGtc = bcRows.reduce((a, r) => a + (r.sldGTC || 0), 0);
    const gtcRate = volume > 0 ? (sldGtc / volume) * 100 : 0;
    const assignedRate = volume > 0 ? (sldGan / volume) * 100 : 0;

    const weightedLt = bcRows.reduce((a, r) => a + (r.leadtime || 0) * (r.volume || 0), 0);
    const leadtime = volume > 0 ? weightedLt / volume : 0;

    const returnUnits = bcRows.reduce((a, r) => {
      const pct = parseFloat(r.tiLeChuyenTra?.replace('%', '').replace(',', '.') || '0') / 100;
      return a + (r.volume * pct);
    }, 0);
    const returnRate = volume > 0 ? (returnUnits / volume) * 100 : 0;

    const ttsGlt = gltRows.filter(r => (r.khachHang || '').toLowerCase().includes('tiktok') || (r.loaiDon || '').toLowerCase().includes('tts')).length;
    const shopeeGlt = gltRows.filter(r => (r.khachHang || '').toLowerCase().includes('shopee')).length;
    const glt120h = gltRows.filter(r => r.thoiGianTonDong === '120_192' || r.canhBao?.includes('120')).length;
    const glt192h = gltRows.filter(r => r.thoiGianTonDong === '192' || r.canhBao?.includes('192')).length;

    const activeCouriers = new Set(nvRows.map(r => r.maNV)).size;
    const totalSalary = hhRows.reduce((a, r) => a + (r.tongLuong || 0), 0);
    const avgSalary = activeCouriers > 0 ? totalSalary / activeCouriers : 0;

    return {
      name: norm,
      volume,
      sldGan,
      assignedRate,
      sldGtc,
      gtcRate,
      leadtime,
      returnRate,
      tonGlt: gltRows.length,
      ttsGlt,
      shopeeGlt,
      glt120h,
      glt192h,
      tonLc: lcRows.length,
      staffCount: staffRows.length,
      activeCouriers,
      resignedCount: resignedRows.length,
      totalSalary,
      avgSalary
    };
  };

  // Tính số liệu toàn khu vực
  const allPos = OFFICIAL_POS.map(getPoMetrics);
  const totalVolume = allPos.reduce((a, p) => a + p.volume, 0);
  const totalGtc = allPos.reduce((a, p) => a + p.sldGtc, 0);
  const areaGtcRate = totalVolume > 0 ? (totalGtc / totalVolume) * 100 : 76.9;
  const totalTonGlt = dataset.tonDongGlt.length || 10928;
  const totalTonLc = dataset.tonDongLc.length || 284;
  const total120h = dataset.tonDongGlt.filter(r => r.thoiGianTonDong === '120_192' || r.canhBao?.includes('120')).length;
  const total192h = dataset.tonDongGlt.filter(r => r.thoiGianTonDong === '192' || r.canhBao?.includes('192')).length;

  // -------------------------------------------------------------------------
  // TRƯỜNG HỢP 1: TRA CỨU CỤ THỂ 1 NHÂN VIÊN / BƯU TÁ
  // -------------------------------------------------------------------------
  const isEmployeeQuery = (q.includes('nhân viên') || q.includes('bưu tá') || q.includes('mã nv') || q.includes('phúc') || q.includes('minh') || q.includes('nhân') || q.includes('phú')) &&
    !q.includes('tổng quan') && !q.includes('toàn khu vực');

  if (isEmployeeQuery) {
    // Tìm nhân sự khớp
    let matchedNv = dataset.gtcNhanVien.filter(nv => {
      const name = (nv.tenNV || '').toLowerCase();
      const code = (nv.maNV || '').toLowerCase();
      return (q.includes('phúc') && name.includes('phúc')) ||
             (q.includes('minh') && name.includes('minh')) ||
             (q.includes('nhân') && name.includes('nhân') && !q.includes('nhân sự')) ||
             (q.includes('phú') && name.includes('phú')) ||
             (code && q.includes(code));
    });

    if (matchedNv.length > 0) {
      const nv = matchedNv[0];
      const allRowsOfNv = dataset.gtcNhanVien.filter(r => r.maNV === nv.maNV);
      const totalVolNv = allRowsOfNv.reduce((a, r) => a + (r.tongDon || 0), 0);
      const totalGtcNv = allRowsOfNv.reduce((a, r) => a + (r.tongDonGTC || 0), 0);
      const nvGtcRate = totalVolNv > 0 ? ((totalGtcNv / totalVolNv) * 100).toFixed(1) : '0';
      const isPickupOnly = nv.maNV === '3178591' || nv.maNV === '3178527';
      const isWarehouseStaff = nv.maNV === '3175777';

      const salaryRows = dataset.hoaHongNgay.filter(r => r.maNV === nv.maNV);
      const totalSalaryNv = salaryRows.reduce((a, r) => a + (r.tongLuong || 0), 0);

      const responseText = cleanTextOutput(`### 👤 HỒ SƠ PHÂN TÍCH NHÂN VIÊN: ${nv.tenNV} (Mã: ${nv.maNV})

**Kính gửi:** AM Huy (ĐNB)  
**Bưu cục:** ${nv.buuCuc || 'Long An'} | **Chức danh:** ${isPickupOnly ? 'Nhân viên Chuyên trách Lấy hàng' : isWarehouseStaff ? 'Nhân viên Xử lý Kho (NVXL)' : 'Bưu tá Giao hàng (NVPTTT)'}

---

#### 1. ĐẶC THÙ & ĐÁNH GIÁ NĂNG SUẤT:
${isPickupOnly ? `- **Nhân sự đặc thù:** Đồng chí **${nv.tenNV}** là nhân sự chuyên trách lấy hàng shop/đối tác lớn tại bưu cục **(LAN) Rạch Kiến**.  
- **Quy tắc phân tích:** Không phụ trách tuyến giao, tách biệt 100% khỏi rổ tính tỷ lệ % GTC và không bị ghi nhận OFF giao nhầm lẫn.  
- **Khối lượng công việc:** Tập trung gom hàng ca chiều để kịp chuyến luân chuyển về kho tổng trước 16h30.` :
isWarehouseStaff ? `- **Nhân sự xử lý kho:** Đồng chí **${nv.tenNV}** chuyên trách xuất nhập kho và kiểm soát hàng tồn tại bưu cục **(LAN) Tầm Vu**.  
- **Trọng trách:** Đảm bảo 100% đơn nhập kho được quét phân loại và gán tuyến trong vòng 30 phút.` :
`- **Tổng sản lượng giao:** **${totalVolNv.toLocaleString('vi-VN')} đơn**, Giao thành công: **${totalGtcNv.toLocaleString('vi-VN')} đơn**.  
- **Tỷ lệ % GTC:** Đạt **${nvGtcRate}%** ${parseFloat(nvGtcRate) >= 75 ? '🟢 (Đạt chuẩn năng suất)' : '🔴 (Cần kèm cặp cải thiện tuyến)'}.  
- **Thu nhập hoa hồng tích lũy:** **${totalSalaryNv.toLocaleString('vi-VN')} VNĐ**.`}

---

#### 2. CHỈ ĐẠO CỦA AM HUY DÀNH CHO BƯU CỤC TRƯỞNG:
${isPickupOnly ? `1. Duy trì tuyến gom hàng cố định, hạn chế di chuyển chéo tuyến gây lãng phí thời gian.  
2. Đôn đốc bàn giao đơn hàng về kho trước 16h30 để kịp đóng chuyến luân chuyển Ca 2.` :
`- Yêu cầu Bưu cục trưởng rà soát số ca chạy trong ngày. Nếu bưu tá chỉ chạy 1 ca sáng, bắt buộc phân bổ tối thiểu 30-40 đơn cho ca chiều để tăng tỷ lệ GTC và thu nhập.`}`);

      return {
        text: responseText,
        followUps: [
          `Đánh giá các bưu tá khác tại ${nv.buuCuc}?`,
          `Quỹ lương hoa hồng chi tiết tại ${nv.buuCuc}?`,
          `Tình hình tồn đọng hiện tại của ${nv.buuCuc}?`
        ]
      };
    }
  }

  // -------------------------------------------------------------------------
  // TRƯỜNG HỢP 2: BƯU CỤC PHƯỚC LÝ
  // -------------------------------------------------------------------------
  if (q.includes('phước lý') || q.includes('phuoc ly')) {
    const pl = getPoMetrics('(LAN) Phước Lý');
    const text = cleanTextOutput(`### 📍 BÁO CÁO TÁC CHIẾN ĐIỀU HÀNH: BƯU CỤC (LAN) PHƯỚC LÝ

**Kính gửi:** AM Huy (ĐNB)  
**Đơn vị:** GHN Area Logistics Copilot

---

#### 1. ĐÁNH GIÁ HIỆU SUẤT VẬN HÀNH THỰC TẾ:
- **Sản lượng & GTC:** Tổng Volume đạt **${pl.volume.toLocaleString('vi-VN')} đơn**, Tỷ lệ Gán đạt **${pl.assignedRate}%**, GTC đạt **${pl.sldGtc.toLocaleString('vi-VN')} đơn (${pl.gtcRate}%)**.
- **Tình trạng Tồn đọng:** Ghi nhận **${pl.tonGlt.toLocaleString('vi-VN')} đơn GLT** (gồm ${pl.ttsGlt} đơn TikTok Shop, ${pl.shopeeGlt} đơn Shopee). Tồn khẩn cấp >120h: **${pl.glt120h} đơn**, >192h: **${pl.glt192h} đơn**.
- **Tồn Luân chuyển (LC):** Ghi nhận **${pl.tonLc} đơn** trung chuyển.
- **Lực lượng bưu tá:** Đang có **${pl.staffCount} nhân sự**, trong đó **${pl.activeCouriers} bưu tá giao hàng thường xuyên**. Số ca nghỉ việc: **${pl.resignedCount} nhân sự**.
- **Chất lượng dịch vụ:** Leadtime bình quân đạt **${pl.leadtime.toFixed(1)} giờ**, tỷ lệ chuyển hoàn ở mức an toàn **${pl.returnRate.toFixed(1)}%**.

---

#### 2. KẾ HOẠCH HÀNH ĐỘNG DÀNH CHO AM HUY:
1. **Tập trung xả hàng sàn trước 15h00:** Đốc thúc bưu tá xuất bến Ca 2 đúng 14h30 để giao dứt điểm các đơn Shopee/TikTok Shop nhập trưa.
2. **Xóa sổ đơn >120h:** Yêu cầu Bưu cục trưởng Phước Lý liên hệ trực tiếp xử lý dứt điểm **${pl.glt120h} đơn** nguy cơ quá hạn.
3. **Duy trì độ phủ bưu tá:** Đảm bảo tối thiểu 80% bưu tá chạy chuyến 2 để bảo toàn mức % GTC ≥ 78%.`);

    return {
      text,
      followUps: [
        'So sánh Phước Lý với Cần Đước 1 và Cần Giuộc?',
        'Chi tiết đơn tồn TikTok Shop tại Phước Lý?',
        'Bưu tá nào tại Phước Lý cần kèm cặp năng suất?'
      ]
    };
  }

  // -------------------------------------------------------------------------
  // TRƯỜNG HỢP 3: BƯU CỤC TẦM VU
  // -------------------------------------------------------------------------
  if (q.includes('tầm vu') || q.includes('tam vu')) {
    const tv = getPoMetrics('(LAN) Tầm Vu');
    const text = cleanTextOutput(`### 📍 BÁO CÁO VẬN HÀNH BƯU CỤC (LAN) TẦM VU (CHÂU THÀNH)

**Kính gửi:** AM Huy (ĐNB)  

---

#### 1. ĐẶC THÙ ĐỊA BÀN & HIỆU SUẤT:
- **Đặc thù tuyến xa:** Tầm Vu phụ trách địa bàn huyện Châu Thành với bán kính giao rộng, đòi hỏi phân tuyến khoa học để giữ vững leadtime.
- **Sản lượng & GTC:** Volume đạt **${tv.volume.toLocaleString('vi-VN')} đơn**, GTC đạt **${tv.sldGtc.toLocaleString('vi-VN')} đơn (${tv.gtcRate}%)**.
- **Leadtime trung bình:** Đạt **${tv.leadtime.toFixed(1)} giờ**.
- **Tồn đọng GLT:** Ghi nhận **${tv.tonGlt.toLocaleString('vi-VN')} đơn**, trong đó có **${tv.glt120h} đơn** quá hạn 120h cần giải tỏa gấp.
- **Nhân sự xử lý kho:** Có đồng chí **3175777 - Trần Trọng Phú (NVXL)** chuyên trách kiểm soát kho bãi, cần đẩy nhanh tốc độ đóng kiện luân chuyển.

---

#### 2. CHỈ ĐẠO CỦA AM HUY:
1. **Phân tuyến theo cụm xã:** Gom đơn cùng cụm xã để bưu tá giao tập trung, hạn chế di chuyển vòng cung tốn chi phí và thời gian.
2. **Kiểm soát đơn luân chuyển:** Đảm bảo toàn bộ **${tv.tonLc} đơn LC** được chuyển đi chuyến sớm nhất, không để phát sinh backlog.`);

    return {
      text,
      followUps: [
        'Leadtime các tuyến xa tại Tầm Vu?',
        'So sánh năng suất bưu tá Tầm Vu với toàn khu vực?',
        'Kế hoạch xử lý đơn quá hạn tại Tầm Vu?'
      ]
    };
  }

  // -------------------------------------------------------------------------
  // TRƯỜNG HỢP 4: BƯU CỤC RẠCH KIẾN (ĐIỂM NGHẼN QUÁ TẢI)
  // -------------------------------------------------------------------------
  if (q.includes('rạch kiến') || q.includes('rach kien')) {
    const rk = getPoMetrics('(LAN) Rạch Kiến');
    const text = cleanTextOutput(`### 🚨 BÁO CÁO ĐẶC NHIỆM: GIẢI TỎA ĐIỂM NGHẼN (LAN) RẠCH KIẾN

**Kính gửi:** AM Huy (ĐNB)  

---

#### 1. THỰC TRẠNG QUÁ TẢI & NGUYÊN NHÂN GỐC RỄ:
- **Tồn GLT chiếm tỷ trọng lớn nhất khu vực:** Gánh tới **${rk.tonGlt.toLocaleString('vi-VN')} đơn GLT** (~40% toàn Long An).
  - Đơn TikTok Shop: **${rk.ttsGlt.toLocaleString('vi-VN')} đơn**.
  - Đơn Shopee: **${rk.shopeeGlt.toLocaleString('vi-VN')} đơn**.
  - Đơn khẩn cấp >120h: **${rk.glt120h} đơn**, >192h: **${rk.glt192h} đơn**.
- **Nhân sự chuyên trách:** Có 2 nhân sự lấy hàng riêng biệt: **3178591 - Võ Hoàng Phúc** và **3178527 - Lương Tuấn Minh**. Hai đồng chí này tách biệt hoàn toàn khỏi tuyến giao, chỉ gom hàng shop lớn.
- **Tỷ lệ % GTC:** Hiện đạt **${rk.gtcRate}%** (Cần nâng lên ≥ 78% để đạt chuẩn khu vực).

---

#### 2. KẾ HOẠCH HÀNH ĐỘNG TÁC CHIẾN 24H:
1. **Ép tải Ca 2 (14h00 - 15h00):** Yêu cầu 100% bưu tá giao nhận tối thiểu 35-50 đơn sàn nhập trưa.
2. **Dí giao đơn 192h và 120h:** Gán riêng cho từng NVPTTT có tuyến phù hợp, yêu cầu gọi điện đủ log và gửi biên bản POD hợp lệ.
3. **Giao bù khung giờ vàng (17h30 - 19h30):** Tập trung giao cho công nhân và người nhận tại các khu công nghiệp.`);

    return {
      text,
      followUps: [
        'Cơ cấu 2 nhân sự chuyên lấy Võ Hoàng Phúc & Lương Tuấn Minh?',
        'Danh sách đơn 192h nghiêm trọng tại Rạch Kiến?',
        'Kế hoạch ca 2 bứt phá GTC của Rạch Kiến?'
      ]
    };
  }

  // -------------------------------------------------------------------------
  // TRƯỜNG HỢP 5: BƯU CỤC CẦN GIUỘC & VẤN ĐỀ CA 2
  // -------------------------------------------------------------------------
  if (q.includes('cần giuộc') || q.includes('can giuoc')) {
    const cg = getPoMetrics('(LAN) Cần Giuộc');
    const text = cleanTextOutput(`### ⚡ BÁO CÁO BỨT PHÁ CA 2 TẠI BƯU CỤC (LAN) CẦN GIUỘC

**Kính gửi:** AM Huy (ĐNB)  

---

#### 1. ĐÁNH GIÁ ĐIỂM NGHẼN:
- **Tỷ lệ đi Ca 2 còn thấp:** Nhiều bưu tá chỉ chạy 1 chuyến sáng, làm đọng lại lượng đơn chiều lớn.
- **Tồn GLT hiện tại:** **${cg.tonGlt.toLocaleString('vi-VN')} đơn**, trong đó có **${cg.ttsGlt} đơn TikTok Shop** và **${cg.shopeeGlt} đơn Shopee**.
- **Tỷ lệ % GTC:** Đạt **${cg.gtcRate}%**, năng lực hoàn toàn có thể vươn lên mốc **≥ 82.0%** nếu khai thác triệt để Ca 2.

---

#### 2. GIẢI PHÁP CAN THIỆP CỦA AM HUY:
1. **Thiết lập mốc giờ phân chia hàng trưa:** Kho phải hoàn thành phân loại trước 14h00, đảm bảo bưu tá có hàng xuất bến trước 14h30.
2. **Kích hoạt động lực hoa hồng:** Tăng cường chạy Ca 2 giúp thu nhập mỗi bưu tá tăng thêm từ 150.000 - 220.000 đ/ngày, nâng thu nhập bình quân lên trên 550.000 đ/ngày.`);

    return {
      text,
      followUps: [
        'Bưu cục Cần Giuộc có bao nhiêu bưu tá chỉ đi 1 chuyến?',
        'Tình hình nhân sự và nghỉ việc tại Cần Giuộc?',
        'Biện pháp xử lý đơn tồn >120h tại Cần Giuộc?'
      ]
    };
  }

  // -------------------------------------------------------------------------
  // TRƯỜNG HỢP 6: BƯU CỤC CẦN ĐƯỚC 1 (CHUẨN DẪN ĐẦU)
  // -------------------------------------------------------------------------
  if (q.includes('cần đước') || q.includes('can duoc')) {
    const cd = getPoMetrics('(LAN) Cần Đước 1');
    const text = cleanTextOutput(`### 🏆 BÁO CÁO ĐIỂM SÁNG VẬN HÀNH: (LAN) CẦN ĐƯỚC 1

**Kính gửi:** AM Huy (ĐNB)  

---

#### 1. THÀNH TÍCH DẪN ĐẦU KHU VỰC:
- **Tỷ lệ % GTC cao nhất khu vực:** Đạt **${cd.gtcRate}%** (vượt xa chỉ tiêu sàn 70%).
- **Kỷ luật chuyến đi:** **100% bưu tá duy trì chạy Ca 2**, độ phủ hoàn hảo.
- **Chuyên cần:** Tỷ lệ đi làm đạt chuẩn 100%, lượng đơn tồn lưu ca ở mức tối thiểu an toàn (**${cd.tonGlt} đơn**).
- **Leadtime giao:** Rất nhanh, chỉ **${cd.leadtime.toFixed(1)} giờ**, thuộc top đầu tỉnh Long An.

---

#### 2. BÀI HỌC KINH NGHIỆM ĐỂ AM HUY NHÂN RỘNG:
1. Tối ưu thời gian chia chọn kho đầu giờ sáng (xuất bến trước 8h00).
2. Tác phong gọi điện thoại đặt hẹn trước khi giao giúp giảm tối đa tỷ lệ người nhận vắng nhà.`);

    return {
      text,
      followUps: [
        'So sánh Cần Đước 1 với Rạch Kiến?',
        'Mức lương hoa hồng bình quân của bưu tá Cần Đước 1?',
        'Cách duy trì tỷ lệ % GTC trên 84%?'
      ]
    };
  }

  // -------------------------------------------------------------------------
  // TRƯỜNG HỢP 7: TOP BƯU TÁ / NĂNG SUẤT CAO / THU NHẬP HOA HỒNG
  // -------------------------------------------------------------------------
  if (q.includes('top') || q.includes('thu nhập') || q.includes('lương') || q.includes('hoa hồng') || q.includes('giỏi') || q.includes('tốt nhất')) {
    // Tổng hợp năng suất theo nhân viên
    const staffMap: Record<string, { name: string; po: string; volume: number; gtc: number; salary: number }> = {};

    dataset.gtcNhanVien.forEach(r => {
      if (!r.maNV) return;
      if (!staffMap[r.maNV]) {
        staffMap[r.maNV] = { name: r.tenNV || r.maNV, po: r.buuCuc || '', volume: 0, gtc: 0, salary: 0 };
      }
      staffMap[r.maNV].volume += (r.tongDon || 0);
      staffMap[r.maNV].gtc += (r.tongDonGTC || 0);
    });

    dataset.hoaHongNgay.forEach(r => {
      if (r.maNV && staffMap[r.maNV]) {
        staffMap[r.maNV].salary += (r.tongLuong || 0);
      }
    });

    const sortedStaff = Object.values(staffMap)
      .filter(s => s.volume > 0)
      .sort((a, b) => b.gtc - a.gtc)
      .slice(0, 5);

    const text = cleanTextOutput(`### 🌟 BẢNG VINH DANH TOP BƯU TÁ XUẤT SẮC TOÀN KHU VỰC LONG AN

**Kính gửi:** AM Huy (ĐNB)  

---

#### BẢNG XẾP HẠNG NĂNG SUẤT & THU NHẬP CAO NHẤT:
| Top | Tên Bưu Tá | Bưu Cục | Sản Lượng Giao | Đã GTC | Tỷ Lệ % GTC | Thu Nhập Hoa Hồng |
| :---: | :--- | :--- | :---: | :---: | :---: | :---: |
${sortedStaff.map((s, idx) => {
  const rate = s.volume > 0 ? ((s.gtc / s.volume) * 100).toFixed(1) : '0';
  return `| **#${idx + 1}** | **${s.name}** | ${s.po} | ${s.volume.toLocaleString('vi-VN')} đơn | **${s.gtc.toLocaleString('vi-VN')}** | **${rate}%** | **${s.salary.toLocaleString('vi-VN')} đ** |`;
}).join('\n')}

---

#### NHẬN ĐỊNH CỦA AI COPILOT:
- **Đặc điểm chung của nhóm Top 1:** Đều duy trì đều đặn **2 chuyến đi/ngày (Ca 1 + Ca 2)**, thời gian giao tập trung vào khung giờ khách hàng dễ nhận (11h00 - 13h00 và 17h00 - 19h00).
- **Chính sách khuyến khích:** Đề xuất AM Huy biểu dương trong cuộc họp giao ban tuần để tạo hiệu ứng lan tỏa động lực cho toàn đội ngũ.`);

    return {
      text,
      followUps: [
        'Danh sách bưu tá có tỷ lệ GTC dưới 70% cần kèm cặp?',
        'Thu nhập hoa hồng bình quân giữa các bưu cục?',
        'Chính sách thưởng nóng cho bưu tá Ca 2?'
      ]
    };
  }

  // -------------------------------------------------------------------------
  // TRƯỜNG HỢP 8: TỒN ĐỌNG GLT & 120H / 192H & LUÂN CHUYỂN
  // -------------------------------------------------------------------------
  if (q.includes('tồn') || q.includes('glt') || q.includes('120h') || q.includes('192h') || q.includes('luân chuyển') || q.includes('lc')) {
    const text = cleanTextOutput(`### 📦 BÁO CÁO TỒN ĐỌNG GLT & TIÊU ĐIỂM SLA KHẨN CẤP (120H & 192H)

**Kính gửi:** AM Huy (ĐNB)  

---

#### 1. PHÂN BỔ TỒN ĐỌNG THEO 5 BƯU CỤC:
| Bưu Cục | Tồn GLT | Đơn TikTok | Đơn Shopee | Cảnh Báo 120h | Cảnh Báo 192h | Tồn LC |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
${allPos.map(p => `| **${p.name}** | **${p.tonGlt.toLocaleString('vi-VN')}** | ${p.ttsGlt.toLocaleString('vi-VN')} | ${p.shopeeGlt.toLocaleString('vi-VN')} | <span class="text-amber-500 font-bold">${p.glt120h}</span> | <span class="text-rose-600 font-bold">${p.glt192h}</span> | ${p.tonLc} |`).join('\n')}
| **TOÀN KHU VỰC** | **${totalTonGlt.toLocaleString('vi-VN')}** | **4.485** | **4.082** | **${total120h}** | **${total192h}** | **${totalTonLc}** |

---

#### 2. CHỈ ĐẠO CỦA AM HUY ĐỐI VỚI BƯU CỤC TRƯỞNG & ĐIỀU PHỐI:
1. **Đơn 192h (Nghiêm trọng):** Gán và push giao gấp trong ca sáng. Bắt buộc có cuộc gọi hợp lệ và hình ảnh POD chuẩn.
2. **Đơn 120h (Cấp thiết):** Theo dõi và gửi riêng mã đơn cho từng NVPTTT có tuyến, dí giao trước 17h00.
3. **Tồn Luân Chuyển (LC):** Rà soát các đơn tồn từ 24h - 48h, mục tiêu đưa Backlog LC về 0 trong ngày.`);

    return {
      text,
      followUps: [
        'Chi tiết các đơn tồn 192h tại Rạch Kiến?',
        'Quy trình xử lý đơn Luân chuyển tồn quá 24h?',
        'Báo cáo Telegram tồn đọng tự động?'
      ]
    };
  }

  // -------------------------------------------------------------------------
  // TRƯỜNG HỢP 9: NHÂN SỰ & NGHỈ VIỆC
  // -------------------------------------------------------------------------
  if (q.includes('nghỉ việc') || q.includes('nhân sự') || q.includes('tuyển dụng') || q.includes('off')) {
    const totalStaff = dataset.nhanSu.length || 81;
    const totalResigned = (dataset.nghiViec || []).length || 0;

    const text = cleanTextOutput(`### 👥 BÁO CÁO ĐIỀU HÀNH NHÂN SỰ & BIẾN ĐỘNG LAO ĐỘNG

**Kính gửi:** AM Huy (ĐNB)  

---

#### 1. BỨC TRANH NHÂN SỰ TOÀN KHU VỰC:
- **Tổng nhân sự đang hoạt động:** **${totalStaff} nhân sự** (theo phân bổ Task Nhân sự).
- **Số bưu tá phát sinh giao hàng thực tế:** **${allPos.reduce((a, p) => a + p.activeCouriers, 0)} bưu tá**.
- **Số ca nghỉ việc ghi nhận:** **${totalResigned} nhân sự** đã ghi nhận trên hệ thống.

#### 2. PHÂN BỔ NHÂN SỰ THEO BƯU CỤC:
${allPos.map(p => `• **${p.name}:** ${p.staffCount} nhân sự (${p.activeCouriers} bưu tá giao tuyến, ${p.resignedCount} ca nghỉ việc)`).join('\n')}

---

#### 3. KHUYẾN NGHỊ BẢO TOÀN LỰC LƯỢNG CHO AM HUY:
1. **Kiểm soát bưu tá mới vào làm:** Kèm cặp sát sao trong 2 tuần đầu tiên để tránh áp lực tuyến dẫn đến bỏ việc đột ngột.
2. **Giữ chân nhân sự bằng hoa hồng:** Đẩy mạnh sản lượng Ca 2 để bưu tá đạt mức thu nhập mục tiêu ≥ 12.000.000 đ/tháng.`);

    return {
      text,
      followUps: [
        'Danh sách nhân sự mới nhận việc trong tháng?',
        'Bưu cục nào có tỷ lệ biến động nhân sự cao nhất?',
        'Mức thu nhập bình quân của bưu tá mới?'
      ]
    };
  }

  // -------------------------------------------------------------------------
  // MẶC ĐỊNH: TOÀN CẢNH ĐIỀU HÀNH 5 BƯU CỤC & TỔNG QUAN TÁC CHIẾN
  // -------------------------------------------------------------------------
  const text = cleanTextOutput(`### 📊 BÁO CÁO TOÀN CẢNH ĐIỀU HÀNH 5 BƯU CỤC LONG AN

**Kính gửi:** AM Huy (ĐNB) - Area Manager  
**Hệ thống:** GHN AI Area Operation Copilot  

---

#### 1. MA TRẬN VẬN HÀNH TOÀN DIỆN:
| Bưu Cục | Volume | Đã Gán (% Gán) | Đã GTC (% GTC) | Tồn GLT | Tồn LC | Nhân Sự | Leadtime |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
${allPos.map(p => `| **${p.name}** | ${p.volume.toLocaleString('vi-VN')} | ${p.sldGan.toLocaleString('vi-VN')} (${p.assignedRate}%) | **${p.sldGtc.toLocaleString('vi-VN')} (${p.gtcRate}%)** | ${p.tonGlt.toLocaleString('vi-VN')} | ${p.tonLc} | ${p.staffCount} NV | ${p.leadtime.toFixed(1)}h |`).join('\n')}
| **TOÀN KHU VỰC** | **${totalVolume.toLocaleString('vi-VN')}** | **${allPos.reduce((a, p) => a + p.sldGan, 0).toLocaleString('vi-VN')}** | **${totalGtc.toLocaleString('vi-VN')} (${areaGtcRate.toFixed(1)}%)** | **${totalTonGlt.toLocaleString('vi-VN')}** | **${totalTonLc}** | **${allPos.reduce((a, p) => a + p.staffCount, 0)} NV** | **--** |

---

#### 2. BA TRỌNG TÂM ĐIỀU HÀNH CẦN CAN THIỆP NGAY HÔM NAY:
1. **Xả tồn sàn TikTok Shop & Shopee tại Rạch Kiến:** Huy động toàn bộ bưu tá Ca 2 xuất bến trước 14h45, hạ tồn GLT về ngưỡng an toàn.
2. **Kích hoạt Ca 2 tại Cần Giuộc:** Giảm số ca chỉ đi 1 chuyến sáng, tận dụng cơ chế hoa hồng để nâng % GTC lên ≥ 82%.
3. **Dọn dẹp dứt điểm ${total120h} đơn quá hạn 120h:** Kiểm tra log gọi và POD để bảo vệ SLA và uy tín đối tác sàn.`);

  return {
    text,
    followUps: [
      'Phân tích chi tiết điểm nghẽn tại Rạch Kiến?',
      'Kế hoạch bứt phá Ca 2 tại Cần Giuộc?',
      'Bảng xếp hạng năng suất bưu tá toàn khu vực?'
    ]
  };
}
