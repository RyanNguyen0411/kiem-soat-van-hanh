import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('GHN Control Center - Bắt được lỗi giao diện (Caught by ErrorBoundary):', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
          <div className="bg-slate-950 border border-slate-800 rounded-2xl max-w-lg w-full p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {this.props.fallbackTitle || 'Hệ Thống Đã Khôi Phục Trạng Thái An Toàn'}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Giao diện vừa gặp lỗi hiển thị tạm thời. Dữ liệu vận hành của bạn vẫn được bảo toàn nguyên vẹn.
              </p>
            </div>
            {this.state.error && (
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-left font-mono text-[11px] text-rose-300 max-h-24 overflow-y-auto">
                {this.state.error.message}
              </div>
            )}
            <div className="pt-2">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs inline-flex items-center gap-2 cursor-pointer shadow-lg shadow-orange-600/30 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Tải Lại Giao Diện</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
