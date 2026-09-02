import React, { useState, useEffect } from 'react';
import { BookOpen, FileText, Settings, Sparkles, MessageSquare, Stethoscope, Smartphone, Download } from 'lucide-react';
import { translations } from '../i18n';

export default function Navbar({ activeTab, setActiveTab, hasApiKey, onOpenSettings, lang = 'tr', setLang }) {
  const t = translations[lang] || translations.tr;
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      alert(lang === 'de'
        ? 'Tippen Sie im Browser-Menü auf "Zum Home-Bildschirm hinzufügen", um die App zu installieren.'
        : 'iPhone/Safari kullanıyorsanız: "Paylaş" [↑] simgesine tıklayıp "Ana Ekrana Ekle"yi seçin. Android kullanıyorsanız tarayıcı menüsünden "Uygulamayı Yükle"yi seçin.');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowInstallBtn(false);
    }
    setDeferredPrompt(null);
  };

  const navItems = [
    { id: 'anamnesis', label: t.tabAnamnesis, icon: Stethoscope, highlight: true },
    { id: 'create', label: t.tabCreate, icon: Sparkles },
    { id: 'chat', label: t.tabChat, icon: MessageSquare },
    { id: 'documents', label: t.tabDocuments, icon: BookOpen },
    { id: 'quizzes', label: t.tabQuizzes, icon: FileText },
  ];

  return (
    <>
      {/* Üst Header (Masaüstü ve Mobil) */}
      <header className="no-print border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => setActiveTab('anamnesis')}>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-teal-500 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-black text-base sm:text-lg bg-gradient-to-r from-teal-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">
                Altuğ AI
              </span>
            </div>
          </div>

          {/* Masaüstü Navigasyon */}
          <nav className="hidden md:flex items-center space-x-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? item.highlight 
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-inner'
                        : 'bg-blue-600/20 text-blue-300 border border-blue-500/30 shadow-inner'
                      : item.highlight
                        ? 'text-teal-400/90 hover:text-teal-200 hover:bg-teal-950/30 border border-teal-500/20'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? (item.highlight ? 'text-teal-400' : 'text-blue-400') : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Sağ Kontroller: Mobil Yükle + Dil + Ayarlar */}
          <div className="flex items-center space-x-2">
            
            {/* PWA / Mobil Yükle Butonu */}
            <button
              onClick={handleInstallClick}
              title={lang === 'de' ? 'App auf Smartphone installieren' : 'Uygulamayı Telefona Yükle'}
              className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 text-purple-300 text-xs font-bold transition-all shadow-sm"
            >
              <Smartphone className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">{lang === 'de' ? 'App Installieren' : 'Uygulama Yükle'}</span>
            </button>

            {/* Dil Değiştirici */}
            <div className="flex items-center space-x-0.5 bg-slate-950 border border-slate-800 p-0.5 rounded-xl">
              <button
                onClick={() => setLang('tr')}
                title="Türkçe"
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  lang === 'tr' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                TR
              </button>
              <button
                onClick={() => setLang('de')}
                title="Deutsch (FSP / KP)"
                className={`px-2 py-1 rounded-lg text-xs font-bold transition-all ${
                  lang === 'de' ? 'bg-teal-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                DE
              </button>
            </div>

            {/* Ayarlar Butonu */}
            <button
              onClick={onOpenSettings}
              className={`flex items-center space-x-1 px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                hasApiKey
                  ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/50'
                  : 'bg-amber-950/40 border-amber-700/50 text-amber-300 hover:bg-amber-900/50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-emerald-400 ring-2 ring-emerald-400/30' : 'bg-amber-400 ring-2 ring-amber-400/30'}`} />
              <Settings className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

        </div>
      </header>

      {/* MOBİL ALT NAVİGASYON BARI (Telefonlarda başparmakla kolay geçiş) */}
      <div className="md:hidden no-print fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 px-2 py-1.5 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center p-1.5 rounded-xl transition-all ${
                isActive
                  ? 'text-teal-400 font-bold scale-105'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] leading-none truncate max-w-[65px]">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}
