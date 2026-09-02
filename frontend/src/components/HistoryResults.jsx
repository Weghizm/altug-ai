import React from 'react';
import { History, Award, CheckCircle2, Clock, Calendar, ChevronRight, BarChart2 } from 'lucide-react';

export default function HistoryResults({ results, onSelectResult }) {
  if (!results || results.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center border border-slate-800 rounded-3xl bg-slate-900/40 space-y-3">
        <History className="w-10 h-10 text-slate-600 mx-auto" />
        <h3 className="text-base font-semibold text-slate-300">Henüz Tamamlanan Sınav Yok</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Bir test çözdükten sonra detaylı analizleriniz, karne ve doğru/yanlış dökümünüz burada listelenecektir.
        </p>
      </div>
    );
  }

  // Genel başarı istatistiği
  const totalSolved = results.length;
  const avgScore = Math.round(results.reduce((acc, r) => acc + r.percentage, 0) / totalSolved);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Genel Başarı Özeti */}
      <div className="bg-gradient-to-r from-blue-900/40 via-slate-900/60 to-teal-900/40 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-wrap items-center justify-between gap-6">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Performans Özeti</span>
          <h2 className="text-xl font-bold text-slate-100 mt-1">Sınav Geçmişiniz ve Karneniz</h2>
          <p className="text-xs text-slate-400 mt-1">Toplam {totalSolved} sınav tamamlandı.</p>
        </div>

        <div className="flex items-center space-x-6">
          <div className="text-center">
            <div className="text-xs text-slate-400">Ortalama Başarı</div>
            <div className="text-3xl font-extrabold text-teal-400">%{avgScore}</div>
          </div>
          <div className="w-px h-10 bg-slate-800" />
          <div className="text-center">
            <div className="text-xs text-slate-400">Tamamlanan</div>
            <div className="text-3xl font-extrabold text-blue-400">{totalSolved}</div>
          </div>
        </div>
      </div>

      {/* Sınav Geçmişi Listesi */}
      <div className="space-y-3">
        {results.map((res) => {
          const dateStr = new Date(res.completed_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <div
              key={res.id}
              onClick={() => onSelectResult(res)}
              className="bg-slate-900/70 border border-slate-800 hover:border-blue-500/50 hover:bg-slate-900/90 rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer transition-all shadow-md group"
            >
              <div className="flex items-center space-x-4 min-w-0">
                <div
                  className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0 font-bold text-xs border ${
                    res.percentage >= 70
                      ? 'bg-emerald-950/60 text-emerald-300 border-emerald-600/40'
                      : res.percentage >= 40
                      ? 'bg-blue-950/60 text-blue-300 border-blue-600/40'
                      : 'bg-rose-950/60 text-rose-300 border-rose-600/40'
                  }`}
                >
                  <span className="text-sm font-extrabold">%{res.percentage}</span>
                </div>

                <div className="min-w-0">
                  <h4 className="text-sm font-semibold text-slate-200 group-hover:text-blue-300 transition-colors truncate">
                    {res.quiz_title}
                  </h4>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                    <span className="text-emerald-400 font-medium">{res.score} / {res.total_questions} Doğru</span>
                    <span>•</span>
                    <span>{Math.round(res.time_spent_seconds / 60)} dk</span>
                    <span>•</span>
                    <span>{dateStr}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-slate-500 group-hover:text-blue-400 text-xs font-semibold shrink-0">
                <span className="hidden sm:inline">Karneni İncele</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
