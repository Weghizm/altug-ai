import React from 'react';
import { FileText, Play, Download, Trash2, Calendar, Award, Layers } from 'lucide-react';

export default function SavedQuizzes({ quizzes, onPlayQuiz, onDeleteQuiz }) {
  if (!quizzes || quizzes.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-12 text-center border border-slate-800 rounded-3xl bg-slate-900/40 space-y-3">
        <FileText className="w-10 h-10 text-slate-600 mx-auto" />
        <h3 className="text-base font-semibold text-slate-300">Henüz Kayıtlı Bir Test Yok</h3>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          "Test Hazırla" sekmesinden PDF yükleyip konu başlığı seçerek ilk testinizi oluşturabilirsiniz.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-100">Kayıtlı Testler ({quizzes.length})</h2>
          <p className="text-xs text-slate-400">Daha önce ürettiğiniz tüm testleri buradan tekrar çözebilir veya PDF olarak indirebilirsiniz.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {quizzes.map((quiz) => {
          const dateStr = new Date(quiz.created_at).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          });

          return (
            <div
              key={quiz.id}
              className="bg-slate-900/70 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition-all"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-teal-400 px-2 py-0.5 rounded-md bg-teal-500/10 border border-teal-500/20">
                      {quiz.difficulty || 'Standart'}
                    </span>
                    <h3 className="text-base font-semibold text-slate-100 truncate" title={quiz.title}>
                      {quiz.title}
                    </h3>
                  </div>

                  <button
                    onClick={() => onDeleteQuiz(quiz.id)}
                    title="Testi Sil"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-2">
                  <span className="flex items-center space-x-1">
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>{quiz.question_count} Soru</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>{dateStr}</span>
                  </span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => window.open(`/api/export-pdf/${quiz.id}?include_answers=true`, '_blank')}
                  className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-blue-400" />
                  <span>PDF İndir</span>
                </button>

                <button
                  onClick={() => onPlayQuiz(quiz)}
                  className="flex items-center space-x-1.5 px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  <span>Testi Çöz</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
}
