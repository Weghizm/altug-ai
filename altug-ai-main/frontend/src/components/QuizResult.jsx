import React, { useState } from 'react';
import { Award, CheckCircle2, XCircle, HelpCircle, Download, RotateCcw, PlusCircle, Clock, BookOpen, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react';

export default function QuizResult({ result, onRetake, onNewQuiz }) {
  const [filter, setFilter] = useState('all'); // all, wrong, correct
  const [expandedQuestions, setExpandedQuestions] = useState({});

  if (!result) return null;

  const { quiz_title, score, total_questions, percentage, time_spent_seconds, answers } = result;

  const correctCount = score;
  const wrongCount = answers.filter((a) => a.selected_option !== null && !a.is_correct).length;
  const blankCount = answers.filter((a) => a.selected_option === null).length;

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins} dk ${remSecs} sn`;
  };

  const toggleExpand = (qId) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const filteredAnswers = answers.filter((a) => {
    if (filter === 'wrong') return !a.is_correct;
    if (filter === 'correct') return a.is_correct;
    return true;
  });

  const getBadgeColor = (pct) => {
    if (pct >= 85) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    if (pct >= 60) return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    if (pct >= 40) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  };

  const getEvaluationText = (pct) => {
    if (pct >= 85) return 'Mükemmel! Konuya son derece hakimsiniz.';
    if (pct >= 60) return 'Tebrikler! İyi bir başarı, eksik kısımları inceleyebilirsiniz.';
    if (pct >= 40) return 'Orta Düzey. Konu özetini tekrar gözden geçirmeniz faydalı olacaktır.';
    return 'Geliştirilmeli. İlgili PDF bölümlerini tekrar okumanızı öneririz.';
  };

  const handleDownloadPdf = () => {
    window.open(`/api/export-pdf/${result.quiz_id}?include_answers=true`, '_blank');
  };

  const optionLetters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      
      {/* Karne Kartı */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-b border-slate-800/80 pb-6 relative z-10">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-teal-400 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
              Sınav Tamamlandı
            </span>
            <h2 className="text-2xl font-bold text-slate-100 mt-2">{quiz_title}</h2>
            <p className="text-sm text-slate-400 mt-1">{getEvaluationText(percentage)}</p>
          </div>

          {/* Başarı Yüzdesi Çemberi / Rozeti */}
          <div className={`flex flex-col items-center justify-center p-5 rounded-2xl border ${getBadgeColor(percentage)} shadow-lg`}>
            <span className="text-4xl font-extrabold tracking-tight">%{percentage}</span>
            <span className="text-xs font-semibold uppercase tracking-wider mt-0.5">Başarı Oranı</span>
          </div>
        </div>

        {/* İstatistik Kutuları */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 relative z-10">
          
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
            <div className="flex items-center justify-center space-x-1 text-emerald-400 mb-1">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">Doğru</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">{correctCount}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
            <div className="flex items-center justify-center space-x-1 text-rose-400 mb-1">
              <XCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Yanlış</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">{wrongCount}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
            <div className="flex items-center justify-center space-x-1 text-slate-400 mb-1">
              <HelpCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Boş</span>
            </div>
            <div className="text-2xl font-bold text-slate-100">{blankCount}</div>
          </div>

          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
            <div className="flex items-center justify-center space-x-1 text-blue-400 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Süre</span>
            </div>
            <div className="text-lg font-bold text-slate-100 pt-0.5">{formatTime(time_spent_seconds)}</div>
          </div>

        </div>

        {/* Eylem Butonları */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-6 border-t border-slate-800/80 mt-6 relative z-10">
          <button
            onClick={handleDownloadPdf}
            className="flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-blue-400" />
            <span>Soru & Çözüm Kitapçığını İndir (PDF)</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              onClick={onRetake}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all"
            >
              <RotateCcw className="w-4 h-4 text-teal-400" />
              <span>Tekrar Çöz</span>
            </button>
            <button
              onClick={onNewQuiz}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Yeni Test Oluştur</span>
            </button>
          </div>
        </div>

      </div>

      {/* Soru Bazlı Ayrıntılı Çözüm ve Gerekçeler */}
      <div className="space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-200 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-blue-400" />
            <span>Ayrıntılı Soru Çözümleri ve Çeldirici Analizleri</span>
          </h3>

          {/* Filtreleme */}
          <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'all' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Tümü ({answers.length})
            </button>
            <button
              onClick={() => setFilter('wrong')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'wrong' ? 'bg-rose-600/30 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-rose-400'
              }`}
            >
              Yanlış / Boş ({wrongCount + blankCount})
            </button>
            <button
              onClick={() => setFilter('correct')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                filter === 'correct' ? 'bg-emerald-600/30 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              Doğru ({correctCount})
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {filteredAnswers.map((item, idx) => {
            const isExpanded = expandedQuestions[item.question_id] !== false; // Varsayılan açık
            const isCorrect = item.is_correct;
            const isBlank = item.selected_option === null;

            return (
              <div
                key={item.question_id}
                className={`bg-slate-900/80 border rounded-2xl p-5 transition-all shadow-md ${
                  isCorrect
                    ? 'border-emerald-900/60 bg-emerald-950/10'
                    : isBlank
                    ? 'border-slate-800 bg-slate-900/50'
                    : 'border-rose-900/60 bg-rose-950/10'
                }`}
              >
                {/* Soru Başlığı & Durum */}
                <div
                  onClick={() => toggleExpand(item.question_id)}
                  className="flex items-start justify-between gap-3 cursor-pointer"
                >
                  <div className="flex items-start space-x-3">
                    <div className="pt-0.5">
                      {isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                      ) : isBlank ? (
                        <HelpCircle className="w-5 h-5 text-slate-500 shrink-0" />
                      ) : (
                        <XCircle className="w-5 h-5 text-rose-400 shrink-0" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-400">Soru {idx + 1}</span>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isCorrect
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : isBlank
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isCorrect ? 'Doğru' : isBlank ? 'Boş' : 'Yanlış'}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-slate-200 mt-1 leading-relaxed">
                        {item.question_text}
                      </p>
                    </div>
                  </div>

                  <button className="text-slate-500 hover:text-slate-300 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>

                {/* Açık Görünüm: Şıklar ve Açıklama */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-slate-800/80 space-y-3">
                    
                    {/* Şıklar */}
                    <div className="space-y-1.5 pl-8">
                      {item.options.map((opt, optIdx) => {
                        const isThisCorrect = optIdx === item.correct_option;
                        const isThisUserSelected = optIdx === item.selected_option;

                        let optClass = 'bg-slate-950/40 border-slate-800/60 text-slate-400';
                        if (isThisCorrect) {
                          optClass = 'bg-emerald-950/40 border-emerald-600/50 text-emerald-200 font-semibold ring-1 ring-emerald-500/20';
                        } else if (isThisUserSelected && !isCorrect) {
                          optClass = 'bg-rose-950/40 border-rose-600/50 text-rose-200 line-through';
                        }

                        return (
                          <div
                            key={optIdx}
                            className={`p-2.5 rounded-xl border text-xs flex items-center justify-between ${optClass}`}
                          >
                            <div className="flex items-center space-x-2">
                              <span className="font-bold">{optionLetters[optIdx]})</span>
                              <span>{opt.replace(/^[A-E]\)\s*/i, '')}</span>
                            </div>
                            <div className="text-[10px] font-bold">
                              {isThisCorrect && <span className="text-emerald-400">✓ Doğru Cevap</span>}
                              {isThisUserSelected && !isCorrect && <span className="text-rose-400">✗ Sizin Seçiminiz</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Detaylı Açıklama / Çözüm */}
                    {item.explanation && (
                      <div className="pl-8 pt-2">
                        <div className="p-3.5 rounded-xl bg-teal-950/20 border border-teal-800/40 text-xs text-teal-100/90 space-y-1.5">
                          <div className="flex items-center space-x-1.5 font-bold text-teal-400">
                            <Lightbulb className="w-3.5 h-3.5" />
                            <span>Gerekçeli Çözüm & Çeldirici Analizi:</span>
                          </div>
                          <p className="leading-relaxed whitespace-pre-line text-slate-300">
                            {item.explanation}
                          </p>
                          {item.key_point && (
                            <div className="mt-2 pt-2 border-t border-teal-800/30 text-[11px] font-semibold text-teal-300">
                              💡 <span className="text-teal-400">Kilit Klinik Not:</span> {item.key_point}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
}
