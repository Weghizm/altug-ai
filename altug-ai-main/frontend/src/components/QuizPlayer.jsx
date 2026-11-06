import React, { useState, useEffect } from 'react';
import { Clock, Flag, CheckCircle, ChevronLeft, ChevronRight, Award, AlertCircle, Sparkles, HelpCircle } from 'lucide-react';

export default function QuizPlayer({ quiz, onSubmitQuiz, onCancel }) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState({}); // { [question_id]: selected_option_index }
  const [flagged, setFlagged] = useState({}); // { [question_id]: boolean }
  const [secondsSpent, setSecondsSpent] = useState(0);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const questions = quiz?.questions || [];
  const currentQ = questions[currentIdx];
  const totalQuestions = questions.length;

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsSpent((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remSecs.toString().padStart(2, '0')}`;
  };

  const handleSelectOption = (optionIndex) => {
    setUserAnswers((prev) => ({
      ...prev,
      [currentQ.id]: optionIndex
    }));
  };

  const toggleFlag = (qId) => {
    setFlagged((prev) => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const answeredCount = Object.keys(userAnswers).length;
  const progressPercent = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const handleFinishClick = () => {
    if (answeredCount < totalQuestions) {
      setShowConfirmModal(true);
    } else {
      finalizeSubmit();
    }
  };

  const finalizeSubmit = () => {
    const formattedAnswers = questions.map((q) => ({
      question_id: q.id,
      selected_option: userAnswers[q.id] !== undefined ? userAnswers[q.id] : null
    }));

    onSubmitQuiz({
      quiz_id: quiz.id,
      time_spent_seconds: secondsSpent,
      answers: formattedAnswers
    });
  };

  if (!currentQ) {
    return <div className="p-8 text-center text-slate-400">Soru bulunamadı.</div>;
  }

  const optionLetters = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Üst Bilgi ve Süre Barı */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-lg">
        
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-400 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20">
            {quiz.difficulty || 'Standart'} Düzey
          </span>
          <h2 className="text-base font-bold text-slate-100 mt-1 truncate max-w-md" title={quiz.title}>
            {quiz.title}
          </h2>
        </div>

        {/* Süre Sayacı ve İlerleme */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm font-mono font-semibold">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>{formatTime(secondsSpent)}</span>
          </div>

          <button
            onClick={() => toggleFlag(currentQ.id)}
            className={`flex items-center space-x-1 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              flagged[currentQ.id]
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Flag className={`w-3.5 h-3.5 ${flagged[currentQ.id] ? 'fill-amber-400 text-amber-400' : ''}`} />
            <span>{flagged[currentQ.id] ? 'İşaretlendi' : 'İşaretle'}</span>
          </button>
        </div>

      </div>

      {/* Soru Gezinti Hapları (Pagination) */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto p-2 bg-slate-900/40 rounded-xl border border-slate-800/80">
        <div className="flex items-center space-x-1.5 flex-nowrap">
          {questions.map((q, idx) => {
            const isAnswered = userAnswers[q.id] !== undefined;
            const isCurrent = idx === currentIdx;
            const isFlagged = flagged[q.id];

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIdx(idx)}
                className={`relative w-8 h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center shrink-0 ${
                  isCurrent
                    ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-md shadow-blue-600/30'
                    : isAnswered
                    ? 'bg-teal-950 text-teal-300 border border-teal-600/50'
                    : 'bg-slate-950/80 text-slate-400 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                {idx + 1}
                {isFlagged && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900" />
                )}
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-400 shrink-0 pl-2">
          <span className="text-teal-400 font-semibold">{answeredCount}</span> / {totalQuestions} Cevaplandı
        </div>
      </div>

      {/* Ana Soru Kartı */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
        
        {/* Soru Başlığı */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Soru {currentIdx + 1} / {totalQuestions}
            </span>
            <div className="text-base sm:text-lg font-medium text-slate-100 leading-relaxed whitespace-pre-line">
              {currentQ.question}
            </div>
          </div>
        </div>

        {/* Seçenekler Listesi */}
        <div className="space-y-3">
          {currentQ.options.map((optionText, optIdx) => {
            const isSelected = userAnswers[currentQ.id] === optIdx;
            
            // Seçenek metninden "A) " gibi öneki ayıkla veya koru
            const cleanOptText = optionText.replace(/^[A-E]\)\s*/i, '');

            return (
              <div
                key={optIdx}
                onClick={() => handleSelectOption(optIdx)}
                className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start space-x-3.5 ${
                  isSelected
                    ? 'bg-blue-600/20 border-blue-500 shadow-md shadow-blue-500/10 ring-1 ring-blue-500/40 text-blue-100'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40 text-slate-300'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center font-bold text-xs transition-colors ${
                    isSelected
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {optionLetters[optIdx]}
                </div>
                <div className="text-sm pt-0.5 leading-relaxed flex-1">
                  {cleanOptText}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Alt Navigasyon ve Bitir Butonları */}
      <div className="flex items-center justify-between gap-4">
        
        <button
          type="button"
          onClick={() => setCurrentIdx((prev) => Math.max(0, prev - 1))}
          disabled={currentIdx === 0}
          className={`flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
            currentIdx === 0
              ? 'opacity-40 cursor-not-allowed border-slate-800 text-slate-600'
              : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
          }`}
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Önceki Soru</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-slate-500 hover:text-slate-300 px-3 py-2 rounded-lg"
          >
            Sınavdan Çık
          </button>

          {currentIdx < totalQuestions - 1 ? (
            <button
              type="button"
              onClick={() => setCurrentIdx((prev) => Math.min(totalQuestions - 1, prev + 1))}
              className="flex items-center space-x-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition-all"
            >
              <span>Sonraki Soru</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinishClick}
              className="flex items-center space-x-1.5 px-6 py-2.5 rounded-xl text-sm font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30 transition-all"
            >
              <CheckCircle className="w-4 h-4" />
              <span>Testi Bitir & Sonuçları Gör</span>
            </button>
          )}
        </div>

      </div>

      {/* Onay Modalı (Eksik Soru Varsa) */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-amber-400">
              <AlertCircle className="w-6 h-6 shrink-0" />
              <h4 className="font-bold text-base text-slate-100">Boş Sorularınız Var</h4>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              Toplam <span className="text-white font-bold">{totalQuestions}</span> sorudan{' '}
              <span className="text-amber-400 font-bold">{totalQuestions - answeredCount}</span> tanesini henüz cevaplamadınız. Sınavı bu şekilde bitirmek istiyor musunuz?
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700"
              >
                Sorulara Geri Dön
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  finalizeSubmit();
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-md"
              >
                Evet, Testi Bitir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
