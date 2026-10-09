import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, X, Smartphone, Info } from 'lucide-react';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  // If already running as an installed PWA, hide the button
  if (isInstalled) {
    return null;
  }

  // Chromium / Android / Desktop flow
  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-md hover:shadow-lg active:scale-95"
      >
        <Download size={14} />
        Cài đặt Ứng dụng
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50 transition-all shadow-sm active:scale-95"
        >
          <Smartphone size={14} className="text-blue-600" />
          Cài đặt cho iOS
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-blue-600"></div>
              
              <button 
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-1 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>

              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-inner">
                  <Smartphone size={32} />
                </div>
                
                <h3 className="text-xl font-black text-slate-900 mb-2">Cài đặt trên iPhone / iPad</h3>
                <p className="text-sm text-slate-500 mb-8 px-4">
                  Làm theo các bước sau để thêm ứng dụng vào màn hình chính:
                </p>

                <div className="w-full space-y-4 mb-8">
                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-black text-blue-600 shadow-sm shrink-0">1</div>
                    <p className="text-xs text-slate-700 text-left leading-relaxed">
                      Nhấn vào nút <strong>Chia sẻ (Share)</strong> trên thanh công cụ của Safari (biểu tượng hình vuông có mũi tên lên).
                    </p>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm font-black text-blue-600 shadow-sm shrink-0">2</div>
                    <p className="text-xs text-slate-700 text-left leading-relaxed">
                      Cuộn xuống và chọn <strong>Thêm vào MH chính (Add to Home Screen)</strong>.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-black text-white hover:bg-slate-800 transition-all shadow-xl active:scale-[0.98]"
                >
                  ĐÃ HIỂU
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
