import React from 'react';
import { Sliders, Sparkles, Loader2, HelpCircle, Activity, Award, FileQuestion, BookOpen, CheckCircle } from 'lucide-react';
import { translations } from '../i18n';

export default function QuizConfig({
  questionCount,
  setQuestionCount,
  difficulty,
  setDifficulty,
  questionStyle,
  setQuestionStyle,
  questionType = 'mcq',
  setQuestionType,
  onGenerateQuiz,
  isGenerating,
  disabled,
  lang = 'tr'
}) {
  const t = translations[lang] || translations.tr;
  const countOptions = [3, 5, 10, 15];
  
  const difficultyOptions = [
    { id: 'Kolay', label: t.diffEasy, desc: lang === 'de' ? 'Basisdefinitionen & Grundlagen' : 'Temel kavramlar ve tanımlar', color: 'text-emerald-400 border-emerald-500/30' },
    { id: 'Orta', label: t.diffMed, desc: lang === 'de' ? 'Standard Klinik & Mechanismen' : 'Mekanizma ve standart ders düzeyi', color: 'text-blue-400 border-blue-500/30' },
    { id: 'Zor', label: t.diffHard, desc: lang === 'de' ? 'Schwierige Fälle & FSP/KP' : 'Ayrıntılı klinik senaryo, ayırıcı tanı', color: 'text-amber-400 border-amber-500/30' },
  ];

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-5">
      
      <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Sliders className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-slate-200">
            {lang === 'de' ? 'Prüfungskonfiguration' : 'Sınav Yapılandırması'}
          </h3>
          <p className="text-xs text-slate-400">
            {lang === 'de' ? 'Wählen Sie Format, Anzahl und Schwierigkeit.' : 'Soru türü, sayısı ve zorluk seviyesini belirleyin.'}
          </p>
        </div>
      </div>

      {/* 1. Soru Formatı Seçimi (Klasik Açık Uçlu vs Çoktan Seçmeli) */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          {t.questionType}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          
          {/* Çoktan Seçmeli (MCQ) */}
          <button
            type="button"
            onClick={() => setQuestionType('mcq')}
            className={`p-3 rounded-xl text-left border transition-all ${
              questionType === 'mcq'
                ? 'bg-blue-600/20 border-blue-500 text-blue-200 ring-1 ring-blue-500/40 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <div className="font-bold text-xs text-slate-100 flex items-center space-x-1.5">
              <span>{t.typeMcq}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{t.typeMcqDesc}</div>
          </button>

          {/* Klasik Açık Uçlu Vaka */}
          <button
            type="button"
            onClick={() => setQuestionType('classic')}
            className={`p-3 rounded-xl text-left border transition-all ${
              questionType === 'classic'
                ? 'bg-teal-600/20 border-teal-500 text-teal-200 ring-1 ring-teal-500/40 shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-800/50'
            }`}
          >
            <div className="font-bold text-xs text-teal-300 flex items-center space-x-1.5">
              <span>{t.typeClassic}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{t.typeClassicDesc}</div>
          </button>

        </div>
      </div>

      {/* 2. Soru Sayısı */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          {t.questionCount}
        </label>
        <div className="grid grid-cols-4 gap-2">
          {countOptions.map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => setQuestionCount(num)}
              className={`py-2 px-3 rounded-xl text-xs font-semibold transition-all border ${
                questionCount === num
                  ? 'bg-blue-600 text-white border-blue-400 shadow-md shadow-blue-500/20'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {num} {lang === 'de' ? 'Fragen' : 'Soru'}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Zorluk Seviyesi */}
      <div>
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          {t.difficulty}
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {difficultyOptions.map((opt) => {
            const isSelected = difficulty === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDifficulty(opt.id)}
                className={`p-3 rounded-xl text-left border transition-all ${
                  isSelected
                    ? `bg-slate-800/90 ${opt.color} shadow-sm ring-1 ring-blue-500/40`
                    : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:bg-slate-800/50'
                }`}
              >
                <div className="font-semibold text-xs text-slate-200">{opt.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 leading-tight">{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Üret ve Başlat Butonu */}
      <div className="pt-2">
        <button
          type="button"
          onClick={onGenerateQuiz}
          disabled={disabled || isGenerating}
          className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 shadow-lg transition-all ${
            disabled || isGenerating
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-teal-500 hover:from-blue-500 hover:to-teal-400 text-white shadow-blue-600/25 hover:shadow-blue-600/40 active:scale-[0.99]'
          }`}
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-white" />
              <span>{t.btnGenerating}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-5 h-5 text-teal-200" />
              <span>{t.btnGenerateQuiz}</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
