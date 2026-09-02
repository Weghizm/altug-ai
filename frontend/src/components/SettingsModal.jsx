import React, { useState } from 'react';
import { Settings, Key, Sparkles, ExternalLink, Check, X, ShieldAlert, Cpu } from 'lucide-react';

export default function SettingsModal({ isOpen, onClose, settings, onSaveSettings }) {
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState(settings?.model_name || 'gemini-3.6-flash');
  const [defaultDifficulty, setDefaultDifficulty] = useState(settings?.default_difficulty || 'Orta');
  const [defaultQuestionCount, setDefaultQuestionCount] = useState(settings?.default_question_count || 5);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    await onSaveSettings({
      gemini_api_key: apiKey ? apiKey.trim() : undefined,
      model_name: modelName,
      default_difficulty: defaultDifficulty,
      default_question_count: defaultQuestionCount
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl space-y-6 relative">
        
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Uygulama ve Yapay Zeka Ayarları</h3>
              <p className="text-xs text-slate-400">Gemini API ve sınav tercihlerinizi yapılandırın</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          
          {/* Gemini API Anahtarı */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
                <Key className="w-3.5 h-3.5 text-blue-400" />
                <span>Google Gemini API Anahtarı</span>
              </label>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center space-x-1 underline"
              >
                <span>Ücretsiz API Key Al</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={settings?.has_api_key ? `Mevcut: ${settings.masked_api_key} (Değiştirmek için yazın)` : 'AIzaSy... anahtarınızı yapıştırın'}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            
            <p className="text-[11px] text-slate-500">
              {settings?.has_api_key ? (
                <span className="text-emerald-400">✓ Sistemde kayıtlı bir API anahtarı mevcut.</span>
              ) : (
                <span>* API anahtarı olmadan test soruları dahili zengin şablon motoruyla üretilir.</span>
              )}
            </p>
          </div>

          {/* Model Seçimi */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center space-x-1.5">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span>Yapay Zeka Modeli</span>
            </label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="gemini-3.6-flash">Gemini 3.6 Flash (Önerilen - En Hızlı & Yüksek Doğruluk)</option>
              <option value="gemini-3.6-pro">Gemini 3.6 Pro (Çok Ayrıntılı Klinik Akıl Yürütme)</option>
            </select>
          </div>

          {/* Varsayılan Soru Sayısı ve Zorluk */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Varsayılan Soru Sayısı</label>
              <select
                value={defaultQuestionCount}
                onChange={(e) => setDefaultQuestionCount(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value={5}>5 Soru</option>
                <option value={10}>10 Soru</option>
                <option value={15}>15 Soru</option>
                <option value={20}>20 Soru</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Varsayılan Zorluk</label>
              <select
                value={defaultDifficulty}
                onChange={(e) => setDefaultDifficulty(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              >
                <option value="Kolay">Kolay (Temel)</option>
                <option value="Orta">Orta (Standart)</option>
                <option value="Zor">Zor (Klinik / TUS)</option>
              </select>
            </div>
          </div>

          {/* Butonlar */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 flex items-center space-x-1.5 transition-all"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Kaydedildi!</span>
                </>
              ) : (
                <span>Ayarları Kaydet</span>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
