import React, { useState, useRef } from 'react';
import { Stethoscope, Camera, UploadCloud, X, Send, Sparkles, Copy, Check, Download, AlertCircle, Loader2, FileText, CheckCircle2, ChevronRight, Activity, ShieldAlert, Lightbulb, Globe, ArrowLeftRight, Plus, Images, Award, HelpCircle, Printer } from 'lucide-react';
import { translations } from '../i18n';
import CaseSimulator from './CaseSimulator';

export default function AnamnesisSolver({ lang = 'tr', setLang, documents, selectedDocId }) {
  const t = translations[lang] || translations.tr;
  
  const [activeMode, setActiveMode] = useState('simulator'); // 'simulator' (12 soruluk vaka testi) | 'photo' (fotoğraf yükle çöz)
  const [anamnesisText, setAnamnesisText] = useState('');
  const [selectedImages, setSelectedImages] = useState([]); // [{ id, base64, mimeType, name }]
  const [analysisResult, setAnalysisResult] = useState(null);
  const [cachedAnalyses, setCachedAnalyses] = useState({ tr: null, de: null });
  const [isLoading, setIsLoading] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [previewModalImg, setPreviewModalImg] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageFiles = (files) => {
    if (!files || files.length === 0) return;
    
    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImages((prev) => [
          ...prev,
          {
            id: 'img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            base64: reader.result,
            mimeType: file.type,
            name: file.name
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            handleImageFiles([file]);
          }
        }
      }
    }
  };

  const removeImage = (id) => {
    setSelectedImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSolve = async () => {
    if (!anamnesisText.trim() && selectedImages.length === 0) {
      setErrorMessage(lang === 'de' ? 'Bitte laden Sie mindestens ein Foto hoch oder geben Sie einen Text ein.' : 'Lütfen en az bir fotoğraf yükleyin veya anamnez metnini yazın.');
      return;
    }

    setErrorMessage('');
    setIsLoading(true);
    setAnalysisResult(null);
    setCachedAnalyses({ tr: null, de: null });

    try {
      const res = await fetch('/api/solve-anamnesis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anamnesis_text: anamnesisText.trim(),
          images: selectedImages.map((img) => ({
            base64: img.base64,
            mime_type: img.mimeType
          })),
          language: lang,
          doc_id: selectedDocId || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Anamnez çözümlenirken hata oluştu.');
      }

      if (data.analysis) {
        setAnalysisResult(data.analysis);
        setCachedAnalyses({
          [lang]: data.analysis,
          [lang === 'tr' ? 'de' : 'tr']: null
        });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Çözümleme başarısız oldu.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTranslateTo = async (targetLang) => {
    if (targetLang === lang && analysisResult) return;
    
    if (cachedAnalyses[targetLang]) {
      setAnalysisResult(cachedAnalyses[targetLang]);
      setLang(targetLang);
      return;
    }

    if (!analysisResult) return;

    setIsTranslating(true);
    setErrorMessage('');

    try {
      const res = await fetch('/api/translate-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis: analysisResult,
          target_language: targetLang
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Çeviri yapılamadı.');
      }

      if (data.analysis) {
        setAnalysisResult(data.analysis);
        setCachedAnalyses((prev) => ({
          ...prev,
          [targetLang]: data.analysis
        }));
        setLang(targetLang);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Vaka çevirisi sırasında bir hata oluştu.');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyReport = () => {
    if (!analysisResult) return;
    const textToCopy = `=== ${analysisResult.title || t.resultTitle} ===

[ÖN TANI / VERDACHTSDIAGNOSE]:
${analysisResult.suspected_diagnosis?.diagnosis}
Gerekçe: ${analysisResult.suspected_diagnosis?.rationale}

[ANAMNEZ ÖZETİ]:
${analysisResult.anamnesis_summary}

[AYIRICI TANILAR / DIFFERENTIALDIAGNOSEN]:
${(analysisResult.differential_diagnoses || []).map((d) => `- ${d.diagnosis}: ${d.distinction}`).join('\n')}

[İSTENEN TETKİKLER / DIAGNOSTIK]:
${(analysisResult.recommended_diagnostics || []).join('\n')}

[TEDAVİ PLANI / THERAPIE]:
Acil: ${analysisResult.therapy_plan?.emergency_management}
Kesin: ${analysisResult.therapy_plan?.definitive_treatment}

[DETAYLI AÇIKLAMA]:
${analysisResult.detailed_explanation}

[KLİNİK NOT]:
${analysisResult.clinical_pearls}
`;
    navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const sampleCases = [
    {
      title: lang === 'de' ? 'Thoraxschmerz (STEMI)' : 'Akut Göğüs Ağrısı (STEMI)',
      text: lang === 'de' 
        ? '62-jähriger Patient stellt sich mit seit 45 Minuten bestehenden, stärksten retrosternalen Druckschmerzen mit Ausstrahlung in den linken Arm und Unterkiefer vor. Begleitsymptome: Kaltschweißigkeit, vegetative Übelkeit. Vorerkrankungen: Arterielle Hypertonie, Nikotinabusus 30 py.' 
        : '62 yaşında erkek hasta, 45 dakika önce başlayan sol kola ve çeneye yayılan şiddetli retrosternal baskı tarzında göğüs ağrısı, soğuk terleme ve bulantı ile başvurdu. Özgeçmiş: HT, 30 paket/yıl sigara.'
    },
    {
      title: lang === 'de' ? 'Akute Dyspnoe (Pneumonie)' : 'Akut Nefes Darlığı & Ateş (Pnömoni)',
      text: lang === 'de'
        ? '71-jährige Patientin mit seit 3 Tagen zunehmendem produktivem Husten mit rötlich-braunem Sputum, Fieber (38.9°C) und atemabhängigen rechtsseitigen Flankenschmerzen. Vitalparameter: RR 95/60 mmHg, HF 108/min, AF 28/min, SpO2 89% unter Raumluft.'
        : '71 yaşında kadın hasta, 3 gündür artan pürülan balgamlı öksürük, 38.9°C ateş ve sağ yan ağrısı ile getirildi. Vital: TA 95/60, Nabız 108/dk, Solunum 28/dk, SpO2 %89.'
    }
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      
      {/* Üst Başlık ve Dil Seçimi Banner'ı */}
      <div className="no-print bg-gradient-to-r from-teal-900/40 via-blue-900/30 to-indigo-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300 text-xs font-semibold">
            <Stethoscope className="w-3.5 h-3.5 text-teal-400" />
            <span>{t.tabAnamnesis}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            {t.anamnesisTitle}
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            {t.anamnesisSubtitle}
          </p>
        </div>

        {/* Dil Seçici Butonları */}
        <div className="flex flex-col space-y-1.5 shrink-0 bg-slate-950/80 border border-slate-800 p-2 rounded-2xl">
          <span className="text-[11px] font-semibold text-slate-400 px-1">{t.langSelect}</span>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => {
                if (analysisResult) {
                  handleTranslateTo('tr');
                } else {
                  setLang('tr');
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                lang === 'tr'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              🇹🇷 Türkçe
            </button>
            <button
              onClick={() => {
                if (analysisResult) {
                  handleTranslateTo('de');
                } else {
                  setLang('de');
                }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                lang === 'de'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              🇩🇪 Deutsch (FSP)
            </button>
          </div>
        </div>
      </div>

      {/* Çalışma Modu Seçici (12 Soruluk İnteraktif Vaka vs Anamnez Fotoğrafı Çözücü) */}
      <div className="no-print flex items-center p-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl max-w-2xl mx-auto shadow-md">
        <button
          type="button"
          onClick={() => setActiveMode('simulator')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
            activeMode === 'simulator'
              ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-md shadow-teal-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>{lang === 'de' ? '12-Fragen Fallsimulation & Prüfung' : '✨ 12 Soruluk İnteraktif Vaka Sınavı'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('photo')}
          className={`flex-1 py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
            activeMode === 'photo'
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-500/20'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>{lang === 'de' ? 'Anamnesebogen- & Fotoanalyse' : '📸 Anamnez Fotoğrafı / Belge Çöz'}</span>
        </button>
      </div>

      {/* 1. MOD: 12 SORULUK İNTERAKTİF VAKA SİMÜLATÖRÜ */}
      {activeMode === 'simulator' && (
        <CaseSimulator
          lang={lang}
          documents={documents}
          selectedDocId={selectedDocId}
        />
      )}

      {/* 2. MOD: ANAMNEZ FOTOĞRAFI & HIZLI ÇÖZÜM */}
      {activeMode === 'photo' && (
        <div className="space-y-6">

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-xs text-rose-400 underline">Kapat</button>
        </div>
      )}

      {/* Giriş Alanı: Çoklu Fotoğraf Yükleme + Metin Girişi */}
      {!analysisResult && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
          
          {/* Çoklu Fotoğraf Yükleme / Yapıştırma Alanı */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                1. {t.pasteOrUpload}
              </label>
              {selectedImages.length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/30">
                  {selectedImages.length} {lang === 'de' ? 'Bilder ausgewählt' : 'Görsel Yüklendi'}
                </span>
              )}
            </div>
            
            <input
              type="file"
              ref={fileInputRef}
              multiple
              onChange={(e) => {
                if (e.target.files) {
                  handleImageFiles(e.target.files);
                }
              }}
              accept="image/*"
              className="hidden"
            />

            {selectedImages.length > 0 ? (
              <div className="p-4 bg-slate-950 border border-teal-500/40 rounded-2xl space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {selectedImages.map((img, idx) => (
                    <div key={img.id} className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900">
                      <img
                        src={img.base64}
                        alt={img.name || `Görsel ${idx + 1}`}
                        className="w-full h-24 sm:h-28 object-cover cursor-pointer hover:scale-105 transition-transform"
                        onClick={() => setPreviewModalImg(img.base64)}
                      />
                      <span className="absolute top-1.5 left-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded bg-black/70 text-white backdrop-blur-sm">
                        #{idx + 1}
                      </span>
                      <button
                        onClick={() => removeImage(img.id)}
                        title="Kaldır"
                        className="absolute top-1.5 right-1.5 p-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white shadow-md transition-all"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  {/* Daha Fazla Görsel Ekle Butonu */}
                  <label className="h-24 sm:h-28 rounded-xl border-2 border-dashed border-slate-800 hover:border-teal-500/60 bg-slate-900/40 hover:bg-slate-900 flex flex-col items-center justify-center space-y-1 text-slate-400 hover:text-teal-300 transition-all cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        if (e.target.files) handleImageFiles(e.target.files);
                      }}
                      className="sr-only"
                    />
                    <Plus className="w-5 h-5" />
                    <span className="text-[11px] font-semibold">{lang === 'de' ? '+ Weiteres Bild' : '+ Görsel / Kamera'}</span>
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 1. Kamerayı Aç */}
                <label className="border-2 border-dashed border-teal-500/50 hover:border-teal-400 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-teal-950/20 hover:bg-teal-950/30 transition-all group shadow-md">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                      if (e.target.files) handleImageFiles(e.target.files);
                    }}
                    className="sr-only"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 group-hover:scale-110 transition-transform mb-2">
                    <Camera className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-teal-200">
                    {lang === 'de' ? '📷 Kamera öffnen' : '📷 Telefon Kamerası ile Çek'}
                  </span>
                  <span className="text-[11px] text-teal-300/70 mt-0.5">
                    {lang === 'de' ? 'Dokument / Anamnese fotografieren' : 'Belgeyi veya el yazısını hemen çekin'}
                  </span>
                </label>

                {/* 2. Galeriden Seç */}
                <label className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/60 hover:bg-slate-900/60 transition-all group shadow-md">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => {
                      if (e.target.files) handleImageFiles(e.target.files);
                    }}
                    className="sr-only"
                  />
                  <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform mb-2">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-bold text-slate-200">
                    {lang === 'de' ? '🖼️ Galerie / Dateien' : '🖼️ Galeriden / Dosyalardan Seç'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5">
                    {lang === 'de' ? 'Mehrere Bilder hochladen' : 'Çoklu görsel veya PDF fotoğrafı yükle'}
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* Anamnez Metni Alanı */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                2. {t.orWriteText}
              </label>
              
              {/* Örnek Vaka Yükleme */}
              <div className="flex items-center space-x-1.5 text-xs text-slate-500">
                <span>Örnekler:</span>
                {sampleCases.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setAnamnesisText(s.text)}
                    className="text-xs text-teal-400 hover:underline px-1.5 py-0.5 rounded bg-slate-950 border border-slate-800"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={anamnesisText}
              onChange={(e) => setAnamnesisText(e.target.value)}
              onPaste={handlePaste}
              rows={4}
              placeholder={t.textPlaceholder}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs sm:text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500 leading-relaxed"
            />
          </div>

          {/* Çözüm Butonu */}
          <button
            onClick={handleSolve}
            disabled={isLoading}
            className={`w-full py-4 px-6 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shadow-xl transition-all ${
              isLoading
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-teal-500 via-blue-600 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white shadow-teal-500/20 active:scale-[0.99]'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-white" />
                <span>{t.btnSolving}</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-teal-200" />
                <span>{t.btnSolve} {selectedImages.length > 0 ? `(${selectedImages.length} Görsel)` : ''}</span>
              </>
            )}
          </button>

        </div>
      )}

      {/* Analiz ve Çözüm Sonucu Ekranı */}
      {analysisResult && (
        <div className="space-y-6 relative">
          
          {/* Çeviri Yükleme Katmanı */}
          {isTranslating && (
            <div className="absolute inset-0 z-30 bg-slate-950/80 backdrop-blur-sm rounded-3xl flex flex-col items-center justify-center space-y-3 p-6 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
              <div className="text-sm font-bold text-slate-100">
                {lang === 'tr' ? 'Vaka Almancaya (FSP / KP Formatına) Çevriliyor...' : 'Vaka Türkçeye Çevriliyor...'}
              </div>
              <p className="text-xs text-slate-400 max-w-sm">
                Tıbbi terminoloji, ön tanılar, ayırıcı tanılar ve tedavi planı hedef dile eksiksiz uyarlanıyor.
              </p>
            </div>
          )}

          {/* Üst Başlık & Kontroller */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-teal-400 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
                  {lang === 'de' ? 'Klinische Falllösung (Deutsch)' : 'Klinik Vaka Çözümü (Türkçe)'}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-slate-100 mt-2">
                  {analysisResult.title || t.resultTitle}
                </h2>
              </div>

              {/* Hızlı Çeviri & Aksiyon Butonları */}
              <div className="flex flex-wrap items-center gap-2">
                
                {/* Tek Tıkla Diğer Dile Çevir Butonu */}
                <button
                  onClick={() => handleTranslateTo(lang === 'tr' ? 'de' : 'tr')}
                  disabled={isTranslating}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-teal-600/30 to-blue-600/30 border border-teal-500/40 hover:border-teal-400 text-teal-200 hover:text-white text-xs font-bold transition-all shadow-md active:scale-95"
                >
                  <Globe className="w-3.5 h-3.5 text-teal-400" />
                  <span>
                    {lang === 'tr' ? '🇩🇪 Almancaya Çevir (FSP/KP)' : '🇹🇷 Türkçeye Çevir'}
                  </span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="no-print flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold"
                >
                  <Printer className="w-4 h-4 text-teal-400" />
                  <span>Yazdır / PDF</span>
                </button>

                <button
                  onClick={handleCopyReport}
                  className="no-print flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-teal-400" />}
                  <span>{isCopied ? 'Kopyalandı' : t.btnCopyReport}</span>
                </button>
                
                <button
                  onClick={() => {
                    setAnalysisResult(null);
                    setCachedAnalyses({ tr: null, de: null });
                    setSelectedImages([]);
                    setAnamnesisText('');
                  }}
                  className="no-print flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/20"
                >
                  <span>{t.btnNewCase}</span>
                </button>
              </div>
            </div>

            {/* 1. ÖN TANI (VERDACHTSDIAGNOSE) KARTI */}
            <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-950/50 via-slate-950/80 to-blue-950/50 border-2 border-teal-500/50 shadow-lg space-y-2">
              <div className="flex items-center space-x-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
                <Activity className="w-4 h-4" />
                <span>{t.suspectedDiag}</span>
              </div>
              <div className="text-lg sm:text-xl font-black text-white">
                {analysisResult.suspected_diagnosis?.diagnosis}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed pt-1 border-t border-teal-800/40">
                {analysisResult.suspected_diagnosis?.rationale}
              </p>
            </div>

            {/* 2. YAPILANDIRILMIŞ ANAMNEZ ÖZETİ */}
            {analysisResult.anamnesis_summary && (
              <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t.anamnesisSummary}
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                  {analysisResult.anamnesis_summary}
                </p>
              </div>
            )}

            {/* 3. AYIRICI TANILAR (DIFFERENTIALDIAGNOSEN) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t.differentialDiag}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(analysisResult.differential_diagnoses || []).map((dd, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1">
                    <div className="font-bold text-xs text-blue-300 flex items-center space-x-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      <span>{dd.diagnosis}</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed pl-3.5">
                      {dd.distinction}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. İSTENMESİ GEREKEN TETKİKLER (DIAGNOSTIK) */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {t.diagnostics}
              </h4>
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                {(analysisResult.recommended_diagnostics || []).map((item, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-200">
                    <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. TEDAVİ PLANI (THERAPIE) */}
            {analysisResult.therapy_plan && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {t.therapyPlan}
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-1.5">
                    <div className="text-xs font-bold text-rose-400 uppercase">{t.emergencyMgmt}</div>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                      {analysisResult.therapy_plan.emergency_management}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 space-y-1.5">
                    <div className="text-xs font-bold text-emerald-400 uppercase">{t.definitiveTx}</div>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                      {analysisResult.therapy_plan.definitive_treatment}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 6. ADIM ADIM GEREKÇELİ ÇÖZÜM */}
            {analysisResult.detailed_explanation && (
              <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h4 className="text-xs font-bold text-teal-400 uppercase tracking-wider">
                  {t.detailedExplanation}
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                  {analysisResult.detailed_explanation}
                </p>
              </div>
            )}

            {/* 7. KLİNİK MERKSATZ / NOT */}
            {analysisResult.clinical_pearls && (
              <div className="p-4 rounded-2xl bg-amber-950/20 border border-amber-800/40 flex items-start space-x-3 text-xs text-amber-200">
                <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-300">{t.clinicalPearl}: </span>
                  <span className="leading-relaxed">{analysisResult.clinical_pearls}</span>
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      </div>
      )}

      {/* Büyük Görsel Önizleme Modalı */}
      {previewModalImg && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setPreviewModalImg(null)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 p-2 rounded-2xl border border-slate-700" onClick={(e) => e.stopPropagation()}>
            <img
              src={previewModalImg}
              alt="Büyük Görsel"
              className="max-w-full max-h-[80vh] rounded-xl object-contain mx-auto"
            />
            <button
              onClick={() => setPreviewModalImg(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-white shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
