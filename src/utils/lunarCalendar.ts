// =========================================================================
// THUẬT TOÁN ÂM LỊCH VIỆT NAM (HO NGOC DUC ASTRONOMICAL MODEL)
// & BỘ DỮ LIỆU SỰ KIỆN TMĐT (SHOPEE, TIKTOK SHOP) & DỰ BÁO SẢN LƯỢNG GHN
// =========================================================================

export interface LunarDate {
  day: number;
  month: number;
  year: number;
  isLeap: boolean;
  lunarString: string; // e.g. "15/10 ÂL"
  canChiDay?: string;
  canChiYear?: string;
}

export type EventType = 'shopee_mega' | 'tiktok_mega' | 'payday' | 'mid_month' | 'holiday_solar' | 'holiday_lunar' | 'special';

export interface CalendarEvent {
  id: string;
  name: string;
  platform: 'Shopee' | 'TikTok Shop' | 'Lễ Quốc Gia' | 'Âm Lịch' | 'Thị Trường';
  type: EventType;
  dateStr: string; // "DD/MM/YYYY"
  description?: string;
  impactLevel: 'extreme' | 'high' | 'medium' | 'normal'; // extreme = Đỉnh Mega Sale, high = Payday/Lễ lớn
  surgeForecast: {
    pickupSurge: string;   // e.g. "+160% đến +230%"
    deliverySurge: string; // e.g. "+180% đến +320%"
    peakPickupDate: string;  // e.g. "D+1 (12/11)"
    peakDeliveryDate: string; // e.g. "D+3 đến D+5 (14-16/11)"
    hotspotBranches: string[]; // ["(LAN) Phước Lý", "(LAN) Rạch Kiến"]
    actionPlan: string;
  };
}

// =========================================================================
// 1. THUẬT TOÁN TÍNH ÂM LỊCH CHUẨN VIỆT NAM (TIMEZONE GMT+7)
// =========================================================================
function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

function getNewMoonDay(k: number, timeZone = 7): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
  Jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
  C1 -= 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(2 * dr * Mpr);
  C1 -= 0.0004 * Math.sin(3 * dr * Mpr);
  C1 += 0.0104 * Math.sin(2 * dr * F) - 0.0051 * Math.sin((M + Mpr) * dr);
  C1 -= 0.0074 * Math.sin((M - Mpr) * dr) + 0.0004 * Math.sin((2 * F + M) * dr);
  C1 -= 0.0004 * Math.sin((2 * F - M) * dr) - 0.0006 * Math.sin((2 * F + Mpr) * dr);
  C1 += 0.0010 * Math.sin((2 * F - Mpr) * dr) + 0.0005 * Math.sin((2 * Mpr + M) * dr);
  const JdNew = Jd1 + C1;
  return Math.floor(JdNew + 0.5 + timeZone / 24);
}

function getSunLongitude(dayNumber: number, timeZone = 7): number {
  const T = (dayNumber - 2451545.5 - timeZone / 24) / 36525;
  const T2 = T * T;
  const dr = Math.PI / 180;
  const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
  const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
  const DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M)
    + (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
  let L = L0 + DL;
  L = L * dr;
  L = L - Math.PI * 2 * Math.floor(L / (Math.PI * 2));
  return Math.floor(L / (Math.PI / 6));
}

function getLunarMonth11(yy: number, timeZone = 7): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

export function convertSolar2Lunar(dd: number, mm: number, yy: number, timeZone = 7): LunarDate {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let monthStart = getNewMoonDay(k + 1, timeZone);
  if (monthStart > dayNumber) {
    monthStart = getNewMoonDay(k, timeZone);
  }
  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let year = yy;
  if (a11 >= monthStart) {
    year = yy - 1;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    b11 = getLunarMonth11(yy + 1, timeZone);
  }
  const lunarDay = dayNumber - monthStart + 1;
  const diff = Math.floor((monthStart - a11) / 29);
  let lunarLeap = 0;
  let lunarMonth = diff + 11;
  if (b11 - a11 > 365) {
    let leapMonthDiff = 0;
    const k2 = Math.floor((a11 - 2415021.076998695) / 29.530588853);
    let last = 0;
    let i = 1;
    let arc = getSunLongitude(getNewMoonDay(k2 + i, timeZone), timeZone);
    do {
      last = arc;
      i++;
      arc = getSunLongitude(getNewMoonDay(k2 + i, timeZone), timeZone);
    } while (arc !== last && i < 14);
    leapMonthDiff = i - 1;
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) {
        lunarLeap = 1;
      }
    }
  }
  if (lunarMonth > 12) {
    lunarMonth = lunarMonth - 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    year -= 1;
  }

  // Can Chi tính nhẩm
  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const canYear = CAN[(year + 6) % 10];
  const chiYear = CHI[(year + 8) % 12];
  const canDay = CAN[(dayNumber + 9) % 10];
  const chiDay = CHI[(dayNumber + 1) % 12];

  return {
    day: lunarDay,
    month: lunarMonth,
    year: year,
    isLeap: lunarLeap === 1,
    lunarString: `${lunarDay}/${lunarMonth}${lunarLeap === 1 ? 'N' : ''} ÂL`,
    canChiDay: `${canDay} ${chiDay}`,
    canChiYear: `${canYear} ${chiYear}`
  };
}

// =========================================================================
// 2. KHO SỰ KIỆN TMĐT (SHOPEE, TIKTOK SHOP) & LỄ TẾT VIỆT NAM
// =========================================================================

// Lấy danh sách sự kiện cho một ngày cụ thể (Dương lịch dd/mm/yyyy)
export function getEventsForDate(dd: number, mm: number, yy: number): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lunar = convertSolar2Lunar(dd, mm, yy);
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  const dateStr = `${pad(dd)}/${pad(mm)}/${yy}`;

  // -------------------------------------------------------------
  // A. LỄ DƯƠNG LỊCH & ĐẶC BIỆT
  // -------------------------------------------------------------
  if (dd === 1 && mm === 1) {
    events.push({
      id: `solar-tet-duong-${yy}`,
      name: 'Tết Dương Lịch 1/1',
      platform: 'Lễ Quốc Gia',
      type: 'holiday_solar',
      dateStr,
      impactLevel: 'high',
      surgeForecast: {
        pickupSurge: '+40%',
        deliverySurge: '+60%',
        peakPickupDate: '30-31/12',
        peakDeliveryDate: '02-04/01',
        hotspotBranches: ['(LAN) Cần Giuộc', '(LAN) Phước Lý'],
        actionPlan: 'Nghỉ lễ 1 ngày, sáng 02/01 dồn đơn nhập kho sớm từ 5h00, ưu tiên thông tuyến Ca 1.'
      }
    });
  }
  if (dd === 14 && mm === 2) {
    events.push({
      id: `solar-valentine-${yy}`,
      name: 'Lễ Tình Nhân (Valentine)',
      platform: 'Thị Trường',
      type: 'special',
      dateStr,
      impactLevel: 'medium',
      surgeForecast: {
        pickupSurge: '+80%',
        deliverySurge: '+95%',
        peakPickupDate: '11-13/02',
        peakDeliveryDate: '13-15/02',
        hotspotBranches: ['(LAN) Phước Lý', '(LAN) Rạch Kiến'],
        actionPlan: 'Hàng mỹ phẩm, quà tặng, hoa sáp TMĐT tăng mạnh. Bưu tá chú ý giao hẹn giờ cho khách.'
      }
    });
  }
  if (dd === 8 && mm === 3) {
    events.push({
      id: `solar-8-3-${yy}`,
      name: 'Quốc Tế Phụ Nữ 8/3',
      platform: 'Lễ Quốc Gia',
      type: 'special',
      dateStr,
      impactLevel: 'high',
      surgeForecast: {
        pickupSurge: '+110%',
        deliverySurge: '+130%',
        peakPickupDate: '04-07/03',
        peakDeliveryDate: '06-08/03',
        hotspotBranches: ['(LAN) Phước Lý', '(LAN) Cần Giuộc'],
        actionPlan: 'Cao điểm đơn quà tặng, mỹ phẩm, thời trang. Bố trí thêm CTV phân loại gói hàng dễ vỡ.'
      }
    });
  }
  if (dd === 30 && mm === 4) {
    events.push({
      id: `solar-30-4-${yy}`,
      name: 'Ngày Giải Phóng Miền Nam 30/4',
      platform: 'Lễ Quốc Gia',
      type: 'holiday_solar',
      dateStr,
      impactLevel: 'medium',
      surgeForecast: {
        pickupSurge: '+50%',
        deliverySurge: '+70%',
        peakPickupDate: '26-28/04',
        peakDeliveryDate: '02-04/05',
        hotspotBranches: ['(LAN) Phước Lý', '(LAN) Tầm Vu'],
        actionPlan: 'Kỳ nghỉ kéo dài, nhiều khách về quê hoặc đi du lịch. Tăng cường lưu kho an toàn, tránh trôi trạng thái bom hàng.'
      }
    });
  }
  if (dd === 1 && mm === 5) {
    events.push({
      id: `solar-1-5-${yy}`,
      name: 'Quốc Tế Lao Động 1/5',
      platform: 'Lễ Quốc Gia',
      type: 'holiday_solar',
      dateStr,
      impactLevel: 'medium',
      surgeForecast: {
        pickupSurge: '+40%',
        deliverySurge: '+60%',
        peakPickupDate: '27-29/04',
        peakDeliveryDate: '03-05/05',
        hotspotBranches: ['(LAN) Cần Giuộc'],
        actionPlan: 'Đôn đốc bưu tá trực lễ theo danh sách, chuẩn bị xe tải nhập kho bù sau lễ.'
      }
    });
  }
  if (dd === 2 && mm === 9) {
    events.push({
      id: `solar-2-9-${yy}`,
      name: 'Quốc Khánh 2/9',
      platform: 'Lễ Quốc Gia',
      type: 'holiday_solar',
      dateStr,
      impactLevel: 'high',
      surgeForecast: {
        pickupSurge: '+75%',
        deliverySurge: '+90%',
        peakPickupDate: '28-31/08',
        peakDeliveryDate: '04-06/09',
        hotspotBranches: ['(LAN) Phước Lý', '(LAN) Rạch Kiến'],
        actionPlan: 'Đơn hàng mua sắm nghỉ lễ tăng trước ngày 2/9, sau lễ sóng hàng tiếp tục đổ dồn.'
      }
    });
  }
  if (dd === 20 && mm === 10) {
    events.push({
      id: `solar-20-10-${yy}`,
      name: 'Ngày Phụ Nữ Việt Nam 20/10',
      platform: 'Thị Trường',
      type: 'special',
      dateStr,
      impactLevel: 'high',
      surgeForecast: {
        pickupSurge: '+120%',
        deliverySurge: '+140%',
        peakPickupDate: '15-18/10',
        peakDeliveryDate: '17-20/10',
        hotspotBranches: ['(LAN) Phước Lý', '(LAN) Cần Giuộc'],
        actionPlan: 'Trọng điểm đơn hàng quà tặng sàn TMĐT. Yêu cầu giao dứt điểm trong ngày 19 và 20/10.'
      }
    });
  }
  if (dd === 20 && mm === 11) {
    events.push({
      id: `solar-20-11-${yy}`,
      name: 'Ngày Nhà Giáo Việt Nam 20/11',
      platform: 'Thị Trường',
      type: 'special',
      dateStr,
      impactLevel: 'medium',
      surgeForecast: {
        pickupSurge: '+70%',
        deliverySurge: '+85%',
        peakPickupDate: '15-18/11',
        peakDeliveryDate: '17-20/11',
        hotspotBranches: ['(LAN) Cần Đước 1', '(LAN) Tầm Vu'],
        actionPlan: 'Giao quà tặng, hoa, mỹ phẩm đến các trường học trong giờ hành chính Ca 1.'
      }
    });
  }
  if (dd === 24 && mm === 12) {
    events.push({
      id: `solar-noel-${yy}`,
      name: 'Lễ Giáng Sinh (Noel) 24/12',
      platform: 'Thị Trường',
      type: 'special',
      dateStr,
      impactLevel: 'high',
      surgeForecast: {
        pickupSurge: '+110%',
        deliverySurge: '+135%',
        peakPickupDate: '18-22/12',
        peakDeliveryDate: '21-24/12',
        hotspotBranches: ['(LAN) Phước Lý', '(LAN) Rạch Kiến'],
        actionPlan: 'Sóng hàng phụ kiện trang trí Noel, quà tặng. Bưu tá hoàn thành tuyến trước 18h để khách đi lễ.'
      }
    });
  }

  // -------------------------------------------------------------
  // B. LỄ & KỲ ÂM LỊCH QUAN TRỌNG
  // -------------------------------------------------------------
  if (lunar.day === 1 && lunar.month === 1) {
    events.push({
      id: `lunar-tet-1-${yy}`,
      name: 'MÙNG 1 TẾT NGUYÊN ĐÁN',
      platform: 'Âm Lịch',
      type: 'holiday_lunar',
      dateStr,
      impactLevel: 'extreme',
      surgeForecast: {
        pickupSurge: '-80%',
        deliverySurge: '-90%',
        peakPickupDate: '15-22 tháng Chạp',
        peakDeliveryDate: '20-27 tháng Chạp',
        hotspotBranches: ['(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Cần Giuộc'],
        actionPlan: 'Nghỉ Tết toàn mạng lưới. Đã giải phóng 100% kho từ 29 tháng Chạp. Bưu cục trưởng kiểm tra niêm phong kho tiền COD.'
      }
    });
  }
  if (lunar.day === 10 && lunar.month === 3) {
    events.push({
      id: `lunar-hung-vuong-${yy}`,
      name: 'Giỗ Tổ Hùng Vương (10/3 ÂL)',
      platform: 'Lễ Quốc Gia',
      type: 'holiday_lunar',
      dateStr,
      impactLevel: 'medium',
      surgeForecast: {
        pickupSurge: '+50%',
        deliverySurge: '+70%',
        peakPickupDate: '07-09/03 ÂL',
        peakDeliveryDate: '11-13/03 ÂL',
        hotspotBranches: ['(LAN) Cần Giuộc', '(LAN) Phước Lý'],
        actionPlan: 'Trực lễ phân phối hàng liên tỉnh, không để ứ đọng hàng quá 24h tại bưu cục.'
      }
    });
  }
  if (lunar.day === 15 && lunar.month === 8) {
    events.push({
      id: `lunar-trung-thu-${yy}`,
      name: 'Tết Trung Thu (15/8 ÂL)',
      platform: 'Âm Lịch',
      type: 'special',
      dateStr,
      impactLevel: 'high',
      surgeForecast: {
        pickupSurge: '+130%',
        deliverySurge: '+150%',
        peakPickupDate: '05-12/08 ÂL',
        peakDeliveryDate: '08-14/08 ÂL',
        hotspotBranches: ['(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Tầm Vu'],
        actionPlan: 'Hàng bánh trung thu, lồng đèn, đồ chơi trẻ em TMĐT đạt đỉnh. Chú ý hàng thực phẩm cận date cần giao ưu tiên 100% trong ngày.'
      }
    });
  }
  if (lunar.day === 23 && lunar.month === 12) {
    events.push({
      id: `lunar-ong-tao-${yy}`,
      name: 'Ông Công Ông Táo (23 tháng Chạp)',
      platform: 'Âm Lịch',
      type: 'holiday_lunar',
      dateStr,
      impactLevel: 'extreme',
      surgeForecast: {
        pickupSurge: '+200%',
        deliverySurge: '+280%',
        peakPickupDate: '18-22 tháng Chạp',
        peakDeliveryDate: '21-26 tháng Chạp',
        hotspotBranches: ['(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Cần Giuộc'],
        actionPlan: 'GIAI ĐOẠN NGHẼN KHO TẾT KHỐC LIỆT NHẤT. Bắt buộc AM điều động 100% CTV, bưu tá giao tăng cường Ca 2 tới 21h30 để vét cạn kho.'
      }
    });
  }
  if (lunar.day === 15) {
    events.push({
      id: `lunar-ram-${lunar.month}-${yy}`,
      name: `Ngày Rằm (${lunar.day}/${lunar.month} ÂL)`,
      platform: 'Âm Lịch',
      type: 'special',
      dateStr,
      impactLevel: 'normal',
      surgeForecast: {
        pickupSurge: '+30%',
        deliverySurge: '+35%',
        peakPickupDate: '12-14 ÂL',
        peakDeliveryDate: '14-15 ÂL',
        hotspotBranches: ['(LAN) Tầm Vu', '(LAN) Cần Đước 1'],
        actionPlan: 'Đơn hàng đồ cúng, thực phẩm chay, trang phục truyền thống tăng nhẹ.'
      }
    });
  }
  if (lunar.day === 1 && lunar.month !== 1) {
    events.push({
      id: `lunar-mung-1-${lunar.month}-${yy}`,
      name: `Ngày Mùng 1 (${lunar.day}/${lunar.month} ÂL)`,
      platform: 'Âm Lịch',
      type: 'special',
      dateStr,
      impactLevel: 'normal',
      surgeForecast: {
        pickupSurge: '+25%',
        deliverySurge: '+25%',
        peakPickupDate: '28-29 ÂL tháng trước',
        peakDeliveryDate: '30-01 ÂL',
        hotspotBranches: ['(LAN) Cần Đước 1'],
        actionPlan: 'Mùng 1 đầu tháng âm lịch, hạn chế tối đa các ca khiếu nại phát sinh khiến khách kiêng cử.'
      }
    });
  }

  // -------------------------------------------------------------
  // C. MEGA SALES SÀN TMĐT (SHOPEE & TIKTOK SHOP)
  // -------------------------------------------------------------

  // 1. Ngày Đôi (Double Day Mega Sales: 1.1, 2.2, 3.3, 4.4, 5.5, 6.6, 7.7, 8.8, 9.9, 10.10, 11.11, 12.12)
  if (dd === mm) {
    const isBigYearEnd = mm >= 9; // 9.9, 10.10, 11.11, 12.12 là Super Mega Sales
    const isSingleDay = mm === 11; // 11.11 là LỚN NHẤT NĂM TOÀN CẦU
    events.push({
      id: `ecom-double-${dd}-${mm}-${yy}`,
      name: isSingleDay 
        ? `🔥 SIÊU SALE 11.11 (SHOPEE & TIKTOK SHOP MEGA DAY)` 
        : `⚡ ĐẠI TIỆC NGÀY ĐÔI ${dd}.${mm} (SHOPEE & TIKTOK SHOP)`,
      platform: 'Shopee',
      type: 'shopee_mega',
      dateStr,
      impactLevel: isSingleDay ? 'extreme' : (isBigYearEnd ? 'extreme' : 'high'),
      surgeForecast: {
        pickupSurge: isSingleDay ? '+240% đến +320%' : (isBigYearEnd ? '+180% đến +250%' : '+140% đến +190%'),
        deliverySurge: isSingleDay ? '+260% đến +380%' : (isBigYearEnd ? '+190% đến +300%' : '+150% đến +220%'),
        peakPickupDate: `D+1 và D+2 (${pad(dd + 1)}/${pad(mm)} - ${pad(dd + 2)}/${pad(mm)})`,
        peakDeliveryDate: `D+2 đến D+5 (${pad(dd + 2)}/${pad(mm)} - ${pad(dd + 5)}/${pad(mm)})`,
        hotspotBranches: ['(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Cần Giuộc'],
        actionPlan: isSingleDay 
          ? 'KỲ SÓNG HÀNG LỚN NHẤT NĂM: Bắt buộc thuê trước 15-20 CTV/bưu cục điểm nóng (Phước Lý, Rạch Kiến). Chia 2 ca nhận hàng SOC lúc 5h00 và 13h00. Triển khai giao Ca 2 tối 18h30-21h30. Siết đối soát tiền mặt COD 21h00.'
          : 'Sóng hàng tăng gấp đôi ngày thường. Bưu cục trưởng rà soát định mức chia tuyến dưới 85 đơn/bưu tá mới để tránh sốc tải nghỉ việc G01. Tăng cường xe tải gom đơn shop lớn trước 16h00.'
      }
    });

    events.push({
      id: `ecom-tiktok-double-${dd}-${mm}-${yy}`,
      name: `🎵 TikTok Shop Super Livestream Fest ${dd}.${mm}`,
      platform: 'TikTok Shop',
      type: 'tiktok_mega',
      dateStr,
      impactLevel: isBigYearEnd ? 'extreme' : 'high',
      surgeForecast: {
        pickupSurge: '+150% đến +220%',
        deliverySurge: '+170% đến +260%',
        peakPickupDate: `D+1 (${pad(dd + 1)}/${pad(mm)})`,
        peakDeliveryDate: `D+3 đến D+5 (${pad(dd + 3)}/${pad(mm)} - ${pad(dd + 5)}/${pad(mm)})`,
        hotspotBranches: ['(LAN) Phước Lý', '(LAN) Rạch Kiến'],
        actionPlan: 'Đơn hàng livestream TikTok Shop bùng nổ theo phiên live. Hàng thời trang & mỹ phẩm kích thước nhỏ nhưng volume cực lớn. Bố trí giỏ phân tuyến sẵn tại kho.'
      }
    });
  }

  // 2. Sale Giữa Tháng (Mid-Month Sale: Ngày 15 hàng tháng)
  if (dd === 15) {
    events.push({
      id: `ecom-mid-month-${mm}-${yy}`,
      name: `🏷️ Sale Giữa Tháng 15.${mm} (Shopee Nửa Tháng & TikTok Flash Voucher)`,
      platform: 'Shopee',
      type: 'mid_month',
      dateStr,
      impactLevel: 'high',
      surgeForecast: {
        pickupSurge: '+90% đến +130%',
        deliverySurge: '+110% đến +160%',
        peakPickupDate: `D+1 (16/${pad(mm)})`,
        peakDeliveryDate: `D+2 đến D+4 (17-19/${pad(mm)})`,
        hotspotBranches: ['(LAN) Phước Lý', '(LAN) Cần Giuộc'],
        actionPlan: 'Đơn hàng các deal 1k, freeship xtra dồn về nhiều. Đôn đốc bưu tá giao đúng tiến độ, hạn chế tồn đọng kho quá 48h.'
      }
    });
  }

  // 3. Payday Sale (Lương Về: Ngày 25 hàng tháng kéo dài đến 28)
  if (dd === 25) {
    events.push({
      id: `ecom-payday-${mm}-${yy}`,
      name: `💳 Shopee Payday & TikTok Shop Lương Về (25.${mm})`,
      platform: 'Shopee',
      type: 'payday',
      dateStr,
      impactLevel: 'high',
      surgeForecast: {
        pickupSurge: '+110% đến +160%',
        deliverySurge: '+130% đến +190%',
        peakPickupDate: `D+1 và D+2 (26-27/${pad(mm)})`,
        peakDeliveryDate: `D+2 đến D+5 (27-30/${pad(mm)})`,
        hotspotBranches: ['(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Cần Giuộc'],
        actionPlan: 'Thời điểm khách nhận lương công ty nên sức mua phân khúc giá trị cao tăng mạnh, tiền COD trung bình/đơn cao hơn 25%. Giám sát chặt nộp COD cuối ngày.'
      }
    });
  }

  // 4. Black Friday (Thứ 6 cuối cùng của Tháng 11)
  if (mm === 11) {
    const dayOfWeek = new Date(yy, mm - 1, dd).getDay();
    // Thứ 6 (Friday = 5) và nằm trong khoảng ngày 24-30
    if (dayOfWeek === 5 && dd >= 23 && dd <= 29) {
      events.push({
        id: `ecom-black-friday-${yy}`,
        name: `🖤 Black Friday Global Super Sale (${dd}/11)`,
        platform: 'Thị Trường',
        type: 'shopee_mega',
        dateStr,
        impactLevel: 'extreme',
        surgeForecast: {
          pickupSurge: '+170% đến +230%',
          deliverySurge: '+200% đến +290%',
          peakPickupDate: 'Thứ 7 & Chủ Nhật kế tiếp',
          peakDeliveryDate: 'Thứ 2 đến Thứ 4 tuần sau',
          hotspotBranches: ['(LAN) Phước Lý', '(LAN) Rạch Kiến', '(LAN) Cần Giuộc'],
          actionPlan: 'Đơn hàng đồ điện tử, thời trang thương hiệu giảm sâu. Sóng giao kéo dài từ Black Friday qua Cyber Monday.'
        }
      });
    }
  }

  return events;
}

// Lấy toàn bộ sự kiện của một tháng cụ thể
export function getEventsForMonth(mm: number, yy: number): CalendarEvent[] {
  const daysInMonth = new Date(yy, mm, 0).getDate();
  const allEvents: CalendarEvent[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dayEvents = getEventsForDate(d, mm, yy);
    allEvents.push(...dayEvents);
  }
  return allEvents;
}

// =========================================================================
// 3. LOGIC CỐ VẤN GOOGLE GEMINI AI ĐỐI CHIẾU THỊ TRƯỜNG & SẢN LƯỢNG
// =========================================================================

export interface GeminiMarketAnalysis {
  eventTitle: string;
  marketContext: string;
  shoPeeStrategy: string;
  tikTokStrategy: string;
  consumerBehavior: string;
  areaBranchForecast: {
    branch: string;
    expectedDailyVolume: number; // Đơn/ngày
    growthRate: string;         // % so với ngày thường
    pressurePoint: string;      // Nguy cơ
    recommendedStaffCTV: number; // Số CTV cần tăng
  }[];
  amActionChecklist: string[];
}

export function generateGeminiMarketAnalysis(event: CalendarEvent): GeminiMarketAnalysis {
  const isExtreme = event.impactLevel === 'extreme';
  const is1111 = event.name.includes('11.11');
  const isTet = event.name.includes('TẾT') || event.name.includes('Chạp');

  if (is1111) {
    return {
      eventTitle: event.name,
      marketContext: 'Sự kiện 11.11 là Mega Sale quy mô số 1 toàn cầu và tại Việt Nam. Cả Shopee và TikTok Shop đồng loạt tung ngân sách trợ giá hàng chục triệu USD, đẩy mạnh Shopee Video, Shopee Live và TikTok Live kéo dài 24/24.',
      shoPeeStrategy: 'Shopee tập trung voucher giảm 50% qua livestream, miễn phí ship 0Đ toàn quốc, đẩy mạnh Shopee Mall với hàng triệu sản phẩm giảm giá kịch sàn.',
      tikTokStrategy: 'TikTok Shop dẫn đầu làn sóng Shoppertainment với các phiên mega live của KOC hàng đầu, tung voucher trực tiếp khi đang xem live, tốc độ chốt đơn tính bằng giây.',
      consumerBehavior: 'Người tiêu dùng tích lũy giỏ hàng từ 7 ngày trước, canh khung giờ 0h00 để chốt đơn. Sản phẩm chủ đạo: Thời trang, mỹ phẩm, đồ gia dụng, thiết bị số.',
      areaBranchForecast: [
        {
          branch: '(LAN) Phước Lý',
          expectedDailyVolume: 3200,
          growthRate: '+310%',
          pressurePoint: 'Điểm nóng sàn TMĐT lớn nhất Long An, nguy cơ tắc nghẽn Ca 2 buổi tối từ 18h30 đến 21h30.',
          recommendedStaffCTV: 8
        },
        {
          branch: '(LAN) Rạch Kiến',
          expectedDailyVolume: 2950,
          growthRate: '+290%',
          pressurePoint: 'Địa bàn tuyến giao phân tán, tỷ lệ bưu tá mới cao, dễ xảy ra tình trạng bưu tá quá tải và bỏ việc ngang.',
          recommendedStaffCTV: 7
        },
        {
          branch: '(LAN) Cần Giuộc',
          expectedDailyVolume: 2400,
          growthRate: '+220%',
          pressurePoint: 'Khu công nghiệp và thị trấn đông đúc, khách đi làm tăng ca khó liên lạc giao giờ hành chính.',
          recommendedStaffCTV: 5
        },
        {
          branch: '(LAN) Cần Đước 1',
          expectedDailyVolume: 1650,
          growthRate: '+170%',
          pressurePoint: 'Tương đối ổn định, cần xe tải gom hàng tăng cường cho các shop lớn tại trung tâm Cần Đước.',
          recommendedStaffCTV: 3
        },
        {
          branch: '(LAN) Tầm Vu',
          expectedDailyVolume: 1200,
          growthRate: '+150%',
          pressurePoint: 'Bưu cục tuyến xa, cần sắp xếp cung đường hợp lý để bưu tá giao dứt điểm trước trời tối.',
          recommendedStaffCTV: 2
        }
      ],
      amActionChecklist: [
        'Ký hợp đồng bổ sung 25 CTV thời vụ trước ngày D-3 để bưu cục trưởng kịp đào tạo phân loại và quét mã.',
        'Họp khẩn cấp 5 Bưu cục trưởng vào ngày D-1: Chốt danh sách bưu tá giao Ca 2 (hưởng phụ cấp tăng cường 25.000đ/chuyến).',
        'Làm việc với đội xe tải trung chuyển từ Kho SOC Xuyên Á / Tân Phú Trung: Bắt buộc hạ tải chuyến 1 trước 6h00 sáng.',
        'Phân tuyến thông minh: Giới hạn tối đa 90 đơn/bưu tá mới (G01/G02), chuyển tải dôi dư cho CTV và bưu tá thâm niên.',
        'Siết chặt kỷ luật dòng tiền COD: Điểm nóng Phước Lý & Rạch Kiến chốt két nộp tiền 21h00, khóa tuyến nếu trễ quá 24h.'
      ]
    };
  }

  if (isTet) {
    return {
      eventTitle: event.name,
      marketContext: 'Mùa cao điểm sắm Tết Nguyên Đán truyền thống. Khách hàng chi tiêu mạnh nhất trong năm cho quà biếu, bánh mứt kẹo, bia rượu nước giải khát, quần áo mới và đồ thờ cúng gia đình.',
      shoPeeStrategy: 'Shopee Tết Sale với cam kết giao hàng trước Tết, hỗ trợ ship hỏa tốc nội tỉnh và đồng giá voucher Tết sum vầy.',
      tikTokStrategy: 'TikTok Shop bùng nổ giỏ quà Tết, nông sản vùng miền, đặc sản địa phương từ các phiên live nhà vườn.',
      consumerBehavior: 'Tâm lý nôn nóng muốn nhận hàng sớm trước ngày 23 tháng Chạp để kịp cúng Ông Táo và trưng Tết. Khách hàng cực kỳ khó tính nếu giao chậm.',
      areaBranchForecast: [
        {
          branch: '(LAN) Phước Lý',
          expectedDailyVolume: 3400,
          growthRate: '+330%',
          pressurePoint: 'Hàng quà Tết cồng kềnh, thùng xốp, giỏ quà chiếm thể tích xe máy của bưu tá.',
          recommendedStaffCTV: 9
        },
        {
          branch: '(LAN) Rạch Kiến',
          expectedDailyVolume: 3100,
          growthRate: '+300%',
          pressurePoint: 'Nguy cơ bưu tá xin nghỉ sớm về quê đón Tết, thiếu hụt lực lượng giao ngày 24-28 tháng Chạp.',
          recommendedStaffCTV: 8
        },
        {
          branch: '(LAN) Cần Giuộc',
          expectedDailyVolume: 2600,
          growthRate: '+240%',
          pressurePoint: 'Khách công nhân về quê sớm trước ngày 25 Tết, tỷ lệ bom hàng / không liên lạc được tăng cao.',
          recommendedStaffCTV: 6
        },
        {
          branch: '(LAN) Cần Đước 1',
          expectedDailyVolume: 1750,
          growthRate: '+180%',
          pressurePoint: 'Duy trì kỷ luật tốt, hỗ trợ tăng ca bốc xếp ban đêm.',
          recommendedStaffCTV: 3
        },
        {
          branch: '(LAN) Tầm Vu',
          expectedDailyVolume: 1350,
          growthRate: '+160%',
          pressurePoint: 'Cần phối hợp chính quyền địa phương thông tuyến đường nông thôn.',
          recommendedStaffCTV: 3
        }
      ],
      amActionChecklist: [
        'Ban hành chính sách "Thưởng Bám Tuyến Tết": Thưởng 500.000đ - 1.000.000đ cho bưu tá trực chiến đến hết ngày 28 tháng Chạp.',
        'Trang bị thêm giỏ chở hàng cỡ đại (bạt phủ chống mưa bụi) cho 100% bưu tá giao hàng cồng kềnh.',
        'Cắt nhận đơn liên tỉnh đúng lịch công ty (ngày 24 tháng Chạp), tập trung 100% nguồn lực giao vét cạn kho nội tỉnh.',
        'Bưu cục trưởng trực tiếp gọi điện cho các đơn hàng quà Tết không liên lạc được lần 1, tránh trả hàng oan uổng.',
        'Niêm phong và chuyển két sắt tiền mặt COD về ngân hàng trước 16h00 ngày 29 tháng Chạp.'
      ]
    };
  }

  // Trường hợp mặc định (Payday hoặc Double day định kỳ)
  return {
    eventTitle: event.name,
    marketContext: `Kỳ kích cầu mua sắm ${event.platform} với chính sách hoàn xu, voucher độc quyền và đẩy mạnh các phiên livestream bán lẻ toàn quốc.`,
    shoPeeStrategy: 'Tung mã freeship xtra và voucher giảm giá 15% - 20% cho đơn hàng tiêu dùng hàng ngày.',
    tikTokStrategy: 'Hỗ trợ nhà bán hàng đẩy đơn thông qua voucher trợ giá hoa hồng affiliate và flash sale giờ vàng.',
    consumerBehavior: 'Khách hàng tập trung mua sắm các nhu yếu phẩm, thời trang công sở, mỹ phẩm chăm sóc da và đồ ăn vặt.',
    areaBranchForecast: [
      {
        branch: '(LAN) Phước Lý',
        expectedDailyVolume: 2100,
        growthRate: isExtreme ? '+210%' : '+160%',
        pressurePoint: 'Đơn sàn dồn ứ nếu xe tải về trễ sau 10h00 sáng.',
        recommendedStaffCTV: 4
      },
      {
        branch: '(LAN) Rạch Kiến',
        expectedDailyVolume: 1950,
        growthRate: isExtreme ? '+190%' : '+150%',
        pressurePoint: 'Kiểm soát bưu tá mới đi tuyến xa không kịp giao Ca 1.',
        recommendedStaffCTV: 4
      },
      {
        branch: '(LAN) Cần Giuộc',
        expectedDailyVolume: 1650,
        growthRate: isExtreme ? '+170%' : '+130%',
        pressurePoint: 'Lượng đơn lấy (pickup) từ các shop thời trang tăng mạnh.',
        recommendedStaffCTV: 3
      },
      {
        branch: '(LAN) Cần Đước 1',
        expectedDailyVolume: 1250,
        growthRate: '+110%',
        pressurePoint: 'Hoạt động ổn định, đảm bảo tỷ lệ GTC trên 92%.',
        recommendedStaffCTV: 1
      },
      {
        branch: '(LAN) Tầm Vu',
        expectedDailyVolume: 950,
        growthRate: '+90%',
        pressurePoint: 'Đảm bảo giao dứt điểm trong ngày, không để tồn sang ngày hôm sau.',
        recommendedStaffCTV: 1
      }
    ],
    amActionChecklist: [
      'Thông báo trước 24h cho 5 Bưu cục trưởng về lịch sóng hàng đổ về để chủ động ca kíp.',
      'Bố trí bưu tá lấy hàng hỗ trợ kho shop lớn đóng gói, cam kết quét barcode trước 17h00.',
      'Kiểm tra định mức phân bổ đơn hàng, tránh để bưu tá mới gánh quá 80 đơn/ngày.',
      'Duy trì tỷ lệ giao thành công lần 1 (GTC) trên 88% toàn khu vực.'
    ]
  };
}
