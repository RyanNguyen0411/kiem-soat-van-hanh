import React, { useMemo } from 'react';
import { useDashboard } from '../context/DashboardContext';
import { AlertOctagon, AlertTriangle, ShieldCheck, ArrowRight } from 'lucide-react';

const AlertsTab: React.FC = () => {
  const { operationsData, employeeData } = useDashboard();

  // Critical items in operations
  const criticalOps = useMemo(() => {
    return operationsData.filter(d => d.status === 'Critical' || d.status === 'Warning');
  }, [operationsData]);

  // Critical items in employee deliveries
  const criticalEmployees = useMemo(() => {
    return employeeData.filter(e => e.status === 'Critical' || (e.backlog > 20 && e.gtcRate < 0.85));
  }, [employeeData]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            Trung tâm cảnh báo rủi ro vận hành
          </h2>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Tự động phát hiện các bưu cục và nhân viên có tỷ lệ GTC dưới ngưỡng an toàn (&lt;85%) hoặc tồn đọng cao.
          </p>
        </div>
      </div>

      {/* Critical Operations */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-red-500" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Bưu cục có rủi ro vận hành ({criticalOps.length})
          </h3>
        </div>

        <div className="p-4 space-y-3">
          {criticalOps.length === 0 ? (
            <div className="p-6 text-center text-sm text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <span>Tất cả bưu cục đều đạt chỉ số vận hành tốt.</span>
            </div>
          ) : (
            criticalOps.map((op, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-lg border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                  op.status === 'Critical'
                    ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900'
                    : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{op.branch}</span>
                    <span className="text-xs text-neutral-500">({op.category})</span>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      op.status === 'Critical' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                    }`}>
                      {op.status === 'Critical' ? 'Báo động đỏ' : 'Cần chú ý'}
                    </span>
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 flex flex-wrap gap-4">
                    <span>Sản lượng: <b>{op.volume.toLocaleString('vi-VN')}</b></span>
                    <span>Tỷ lệ GTC: <b className="text-red-600 dark:text-red-400">{(op.gtcRate * 100).toFixed(1)}%</b></span>
                    <span>Tồn đọng: <b className="text-red-600 dark:text-red-400">{Math.round(op.backlog).toLocaleString('vi-VN')}</b></span>
                  </div>
                </div>

                <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1 self-end md:self-center">
                  <span className="font-medium">Đề xuất: Điều phối thêm tài xế ca chiều</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Critical Employees */}
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
            Nhân viên giao hàng cần hỗ trợ ({criticalEmployees.length})
          </h3>
        </div>

        <div className="p-4 space-y-3">
          {criticalEmployees.length === 0 ? (
            <div className="p-6 text-center text-sm text-emerald-600 dark:text-emerald-400 flex items-center justify-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              <span>Tất cả nhân sự giao hàng đều duy trì năng suất an toàn.</span>
            </div>
          ) : (
            criticalEmployees.map((emp, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 dark:text-neutral-100">{emp.employee}</span>
                    <span className="text-xs text-neutral-500">• {emp.branch}</span>
                  </div>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 flex gap-4">
                    <span>Tổng nhận: <b>{emp.totalOrders}</b></span>
                    <span>Tồn đọng: <b className="text-red-500">{emp.backlog}</b></span>
                    <span>Tỷ lệ GTC: <b className="text-red-500">{(emp.gtcRate * 100).toFixed(1)}%</b></span>
                  </div>
                </div>

                <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 self-start md:self-auto">
                  Cần kiểm tra tuyến giao
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertsTab;
