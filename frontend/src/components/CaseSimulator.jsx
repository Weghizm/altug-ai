import React, { useState, useEffect } from 'react';
import { Sparkles, Stethoscope, CheckCircle2, AlertCircle, Loader2, Send, Copy, Check, Lightbulb, ChevronRight, BookOpen, Activity, ShieldCheck, UserCheck, MessageSquare, Award, ArrowRight, RotateCcw, Globe, FileText, Search, Printer, BookMarked, Edit3, Download, UploadCloud, Image, Trash2, History, TrendingUp, AlertTriangle, TrendingDown, X, Eye } from 'lucide-react';
import { translations } from '../i18n';

export default function CaseSimulator({ lang = 'tr', documents = [], selectedDocId }) {
  const t = translations[lang] || translations.tr;

  const handlePrint = () => {
    window.print();
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Doğrudan 4 Sayfalık A4 PDF Dosyası İndirme (ReportLab Engine)
  const handleDownloadDirectPdf = async () => {
    if (!caseData) return;
    setIsDownloadingPdf(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/export-case-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ case_data: caseData })
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'PDF dosyası oluşturulamadı.');
      }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const cleanTitle = (caseData.title || 'Klinik_Vaka_Kitapcigi_ATA').replace(/[^a-zA-Z0-9_\-]/g, '_');
      a.download = `${cleanTitle}_4Sayfa.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setErrorMessage(err.message || 'PDF indirme sırasında bir hata oluştu.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Kaynak seçimi: 'pdf' (Yüklü PDF'lerden) | 'web' (Web & Tıp Literatüründen)
  const [sourceType, setSourceType] = useState(documents.length > 0 ? 'pdf' : 'web');
  const [selectedCaseDocId, setSelectedCaseDocId] = useState(selectedDocId || (documents[0]?.id || ''));
  const [selectedTopicId, setSelectedTopicId] = useState('');
  
  // Aşama durumu: 'config' (vaka üret) | 'solving' (çalışma ve sınav ekranı) | 'evaluation' (karşılaştırmalı karne)
  const [stage, setStage] = useState('config'); // 'config', 'solving', 'evaluation'
  
  // Çözüm Ekranı Görünüm Modu: 'booklet' (📖 4 Sayfalık İki Dilli Kitapçık) | 'exam' (✍️ İnteraktif Kendini Dene & Çöz)
  const [activeTabMode, setActiveTabMode] = useState('booklet'); 

  // Sınav Çözüm Yöntemi: 'text' (✍️ Klavyeyle Yaz) | 'photo' (📷 El Yazısı Fotoğrafı Yükle)
  const [inputMode, setInputMode] = useState('text');
  const [uploadedImages, setUploadedImages] = useState([]); // [{ id, name, mimeType, base64 }]
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);

  // Öğrenci Gelişim Hafızası & Geçmiş Vaka Analitiği
  const [studentAnalytics, setStudentAnalytics] = useState(null);
  const [caseHistory, setCaseHistory] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [topic, setTopic] = useState('');
  const [caseData, setCaseData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({}); // { "1": "cevabim", "2": "..." }
  const [evaluationResult, setEvaluationResult] = useState(null);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // Öğrenci Analitiği ve Geçmişini Yükle
  const loadStudentAnalytics = async () => {
    try {
      const res = await fetch('/api/case-analytics');
      if (res.ok) {
        const data = await res.json();
        setStudentAnalytics(data.analytics);
      }
      const histRes = await fetch('/api/case-history');
      if (histRes.ok) {
        const histData = await histRes.json();
        setCaseHistory(histData.history || []);
      }
    } catch (e) {
      console.error("Gelişim analitiği yüklenirken hata:", e);
    }
  };

  useEffect(() => {
    loadStudentAnalytics();
  }, []);

  // Web modu için ATA (Anästhesietechnischer Assistent) Kenntnisprüfung sınav senaryoları
  const webCaseSuggestions = [
    { title: lang === 'de' ? 'RSI / Ileuseinleitung bei akutem Abdomen (DGAI)' : 'Acil RSI / İleus İndüksiyonu (DGAI Kılavuzu)' },
    { title: lang === 'de' ? 'Unerwartet schwieriger Atemweg & Videolaryngoskopie' : 'Beklenmeyen Zor Havayolu & Videolaringoskopi' },
    { title: lang === 'de' ? 'Maligne Hyperthermie im OP & Dantrolen-Protokoll' : 'Malign Hipertermi & Dantrolen Acil Protokolü' },
    { title: lang === 'de' ? 'Anaphylaktischer Schock im OP (Muskelrelaxanzien)' : 'Ameliyathanede Anafilaktik Şok & Resüsitasyon' },
    { title: lang === 'de' ? 'Lokalanästhetika-Intoxikation (LAST) & Lipidtherapie' : 'Lokal Anestezik Zehirlenmesi (LAST) & Lipid Tedavisi' },
    { title: lang === 'de' ? 'Spinalanästhesie (SPA) bei Sectio & RKI-Hygiene' : 'Spinal Anestezi (SPA), Sezaryen & RKI Hijyeni' },
    { title: lang === 'de' ? 'DGAI-Narkosegerätecheck & Vorbereitung' : 'DGAI Anestezi Cihazı Kontrolü & Hazırlık' },
    { title: lang === 'de' ? 'Aufwachraum (AWR) & PONV / Shivering Management' : 'Derlenme Odası (AWR), PONV ve Titreme Tedavisi' }
  ];

  // Seçili belgeyi bul
  const activeDoc = documents.find((d) => d.id === selectedCaseDocId) || documents[0];

  // 1. 12 Soruluk İki Dilli Vaka Üret
  const handleGenerateCase = async (customTopic = null) => {
    let finalTopic = customTopic || topic.trim();
    
    if (sourceType === 'pdf') {
      if (!selectedCaseDocId) {
        setErrorMessage(lang === 'de' ? 'Bitte wählen Sie zuerst ein PDF-Dokument aus.' : 'Lütfen önce bir PDF belgesi seçin.');
        return;
      }
      if (!finalTopic && !selectedTopicId) {
        setErrorMessage(lang === 'de' ? 'Bitte wählen Sie ein Thema aus oder geben Sie einen Suchbegriff ein.' : 'Lütfen bir konu başlığı seçin veya konu adı yazın.');
        return;
      }
    } else {
      if (!finalTopic) {
        setErrorMessage(lang === 'de' ? 'Bitte geben Sie ein medizinisches Fallthema ein.' : 'Lütfen bir klinik vaka konusu girin.');
        return;
      }
    }

    setErrorMessage('');
    setIsGenerating(true);
    setCaseData(null);
    setUserAnswers({});
    setEvaluationResult(null);
    setUploadedImages([]);

    try {
      const res = await fetch('/api/generate-case-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: finalTopic,
          doc_id: sourceType === 'pdf' ? selectedCaseDocId : null,
          topic_id: sourceType === 'pdf' ? selectedTopicId : null,
          source_type: sourceType,
          language: lang
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Vaka üretilirken bir hata oluştu.');
      }

      if (data.case) {
        setCaseData(data.case);
        setStage('solving');
        setActiveTabMode('booklet'); // Varsayılan olarak 4 sayfalık kitapçığı aç
      }
    } catch (err) {
      setErrorMessage(err.message || 'Vaka üretimi başarısız oldu.');
    } finally {
      setIsGenerating(false);
    }
  };

  // 2. Kullanıcı Cevaplarını Güncelleme
  const handleAnswerChange = (questionId, text) => {
    setUserAnswers((prev) => ({
      ...prev,
      [questionId]: text
    }));
  };

  // El Yazısı Fotoğrafları Yükleme (Çoklu PNG/JPG)
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setIsUploadingImage(true);

    files.forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setUploadedImages((prev) => [
          ...prev,
          {
            id: Math.random().toString(36).substring(7),
            name: file.name,
            mimeType: file.type,
            base64: base64
          }
        ]);
      };
      reader.readAsDataURL(file);
    });
    setIsUploadingImage(false);
    if (e.target) e.target.value = '';
  };

  const removeImage = (id) => {
    setUploadedImages((prev) => prev.filter((img) => img.id !== id));
  };

  // 3. Değerlendirme İste (Metin veya El Yazısı Fotoğrafları ile)
  const handleSubmitEvaluation = async () => {
    if (!caseData) return;

    if (inputMode === 'photo' && uploadedImages.length === 0) {
      alert(lang === 'de' ? 'Bitte laden Sie mindestens ein Foto Ihrer handschriftlichen Antworten hoch.' : 'Lütfen el yazısıyla çözdüğünüz sayfaların en az 1 fotoğrafını yükleyin.');
      return;
    }

    if (inputMode === 'text') {
      const answeredCount = Object.values(userAnswers).filter((v) => v && v.trim().length > 0).length;
      if (answeredCount === 0) {
        if (!window.confirm(lang === 'de' ? 'Sie haben noch keine Frage beantwortet. Trotzdem auswerten?' : 'Henüz hiçbir soruya cevap yazmadınız. Yine de AI değerlendirmesi ve ideal model çözümü istiyor musunuz?')) {
          return;
        }
      }
    }

    setErrorMessage('');
    setIsEvaluating(true);

    try {
      const res = await fetch('/api/evaluate-case-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          case_data: caseData,
          user_answers: inputMode === 'text' ? userAnswers : null,
          images: inputMode === 'photo' ? uploadedImages : null,
          language: lang
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Değerlendirme sırasında bir hata oluştu.');
      }

      if (data.evaluation) {
        setEvaluationResult(data.evaluation);
        setStage('evaluation');
        loadStudentAnalytics(); // Gelişim karnesini tazele
      }
    } catch (err) {
      setErrorMessage(err.message || 'Değerlendirme başarısız oldu.');
    } finally {
      setIsEvaluating(false);
    }
  };

  const handleDeleteHistoryItem = async (evalId) => {
    if (!window.confirm('Bu vaka sonucunu geçmişten silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/case-history/${evalId}`, { method: 'DELETE' });
      loadStudentAnalytics();
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyReport = () => {
    if (!caseData) return;
    const de = caseData.german || caseData;
    const tr = caseData.turkish || caseData;

    let text = `=== 4 SAYFALIK İKİ DİLLİ KLİNİK VAKA KİTAPÇIĞI ===\n\n`;
    text += `[1. SAYFA - DEUTSCH ANAMNESE & FRAGEN]\n${de.title}\n\n${de.patient_story}\n\n${de.vital_and_findings}\n\n`;
    text += `[2. SAYFA - DEUTSCH ZUSAMMENFASSUNG & MUSTERLÖSUNGEN]\n${de.anamnesis_summary}\n\n`;
    text += `[3. SAYFA - TÜRKÇE ANAMNEZ & SORULAR]\n${tr.title}\n\n${tr.patient_story}\n\n${tr.vital_and_findings}\n\n`;
    text += `[4. SAYFA - TÜRKÇE EPİKRİZ & MODEL ÇÖZÜMLER]\n${tr.anamnesis_summary}\n\n`;

    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const answeredCount = Object.values(userAnswers).filter((v) => v && v.trim().length > 0).length;

  const deCase = caseData?.german || caseData || {};
  const trCase = caseData?.turkish || caseData || {};

  return (
    <div className="space-y-6">

      {/* Hata Bildirimi */}
      {errorMessage && (
        <div className="no-print p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-400 hover:text-white font-bold">×</button>
        </div>
      )}

      {/* ----------------- 1. AŞAMA: VAKA OLUŞTURMA & KAYNAK SEÇİMİ ----------------- */}
      {stage === 'config' && (
        <div className="no-print bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
          
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
              {lang === 'de' ? 'FSP / KP 4-Seiten Fallgenerator' : '4 Sayfalık İki Dilli Klinik Vaka ve Sınav Üretici'}
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
              {lang === 'de' ? 'Klinischen Fall & 12 Prüfungsfragen erstellen' : '12 Soruluk Vaka ve 4 Sayfalık Kitapçık Oluştur'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {lang === 'de'
                ? 'Erstellt automatisch 4 perfekt strukturierte A4-Seiten: 1. Deutsch Anamnese, 2. Deutsch Lösungen, 3. Türkisch Anamnese, 4. Türkisch Lösungen.'
                : '1. Sayfada Almanca Anamnez & 12 Soru, 2. Sayfada Almanca Epikriz & Çözümler, 3. Sayfada Türkçe Anamnez, 4. Sayfada Türkçe Çözümler içeren eksiksiz A4 kitapçığı üretir.'}
            </p>
          </div>

          {/* Kaynak Seçimi Tab'ı (PDF vs Web) */}
          <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-950/80 rounded-2xl border border-slate-800">
            <button
              type="button"
              onClick={() => setSourceType('pdf')}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                sourceType === 'pdf'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>{lang === 'de' ? 'Aus hochgeladenen PDFs' : '📚 Yüklü PDF Kitaplarımdan'}</span>
            </button>

            <button
              type="button"
              onClick={() => setSourceType('web')}
              className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 transition-all ${
                sourceType === 'web'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Globe className="w-4 h-4" />
              <span>{lang === 'de' ? 'Weltweite Webliteratur' : '🌍 Web & Tıp Literatüründen'}</span>
            </button>
          </div>

          {/* PDF Kaynak Alanı */}
          {sourceType === 'pdf' && (
            <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 space-y-4">
              {documents.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      {lang === 'de' ? 'PDF-Dokument auswählen:' : 'Kullanılacak PDF Kitabı:'}
                    </label>
                    <select
                      value={selectedCaseDocId}
                      onChange={(e) => {
                        setSelectedCaseDocId(e.target.value);
                        setSelectedTopicId('');
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {documents.map((doc) => (
                        <option key={doc.id} value={doc.id}>
                          {doc.filename} ({doc.total_pages || 0} sayfa)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300">
                      {lang === 'de' ? 'Kapitel / Thema (Optional):' : 'Bölüm / Konu Seçimi (Opsiyonel):'}
                    </label>
                    <select
                      value={selectedTopicId}
                      onChange={(e) => setSelectedTopicId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      <option value="">{lang === 'de' ? 'Gesamtes Dokument / Allgemein' : 'Tüm Dokümandan / Genel Vaka'}</option>
                      {(activeDoc?.topics || []).map((top) => (
                        <option key={top.id} value={top.id}>
                          {top.title}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                  {lang === 'de' ? 'Noch keine PDFs hochgeladen. Bitte laden Sie zuerst ein Dokument hoch oder nutzen Sie den Web-Modus.' : 'Henüz sisteme PDF yüklemediniz. PDF sekmesinden kitap yükleyebilir veya Web moduna geçebilirsiniz.'}
                </div>
              )}
            </div>
          )}

          {/* Web Kaynak Alanı ve Konu Girişi */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {sourceType === 'web' 
                  ? (lang === 'de' ? 'Spezifisches medizinisches Thema oder Verdachtsdiagnose eingeben:' : 'Çalışmak İstediğiniz Tıbbi Konu / Ön Tanı:')
                  : (lang === 'de' ? 'Zusätzlicher Themenschwerpunkt (Optional):' : 'Özel Klinik Odak / Konu Başlığı (Opsiyonel):')}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder={lang === 'de' ? 'z.B. Akutes Koronarsyndrom (STEMI), Lungenembolie, Appendizitis...' : 'Örn: Akut Koroner Sendrom (STEMI), Pulmoner Emboli, Sepsis Protokolü, Apandisit...'}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-4 pr-10 py-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleGenerateCase();
                  }}
                />
                <Search className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* Web İçin Hazır Öneriler */}
            {sourceType === 'web' && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-slate-400">
                  {lang === 'de' ? '💡 Empfohlene Prüfungsklassiker:' : '💡 Sık Karşılaşılan Yüksek Verimli Sınav Vakaları:'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {webCaseSuggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setTopic(sug.title);
                        handleGenerateCase(sug.title);
                      }}
                      className="text-[11px] font-medium px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 text-slate-300 hover:text-teal-300 transition-all"
                    >
                      {sug.title}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Vaka Oluştur Butonu */}
          <button
            type="button"
            onClick={() => handleGenerateCase()}
            disabled={isGenerating}
            className={`w-full py-4 rounded-2xl font-bold text-sm sm:text-base flex items-center justify-center space-x-2 shadow-xl transition-all ${
              isGenerating
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-teal-500 via-blue-600 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white shadow-teal-500/20 active:scale-95'
            }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin text-teal-300" />
                <span>
                  {sourceType === 'web'
                    ? (lang === 'de' ? 'Klinischer Fall wird aus weltweiter Literatur recherchiert...' : 'Dünya tıp literatüründen 4 sayfalık iki dilli vaka oluşturuluyor...')
                    : (lang === 'de' ? 'Fall wird aus Ihrem PDF-Buch generiert...' : 'Yüklü PDF kitabınızdan 4 sayfalık vaka kitapçığı hazırlanıyor...')}
                </span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 text-teal-200" />
                <span>
                  {lang === 'de' ? '📖 4-Seiten Prüfungssimulation Jetzt Erstellen' : '📖 4 Sayfalık İki Dilli Vaka Kitapçığını Oluştur'}
                </span>
              </>
            )}
          </button>

        </div>
      )}

      {/* ----------------- 2. AŞAMA: VAKA GÖRÜNÜMÜ VE ÇALIŞMA KİTAPÇIĞI ----------------- */}
      {stage === 'solving' && caseData && (
        <div className="space-y-6">

          {/* Üst Navigasyon & Aksiyon Kontrol Çubuğu (Yazdırmada Gizli) */}
          <div className="no-print bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Çalışma Modu Seçici */}
            <div className="flex items-center p-1 bg-slate-950 rounded-2xl border border-slate-800 w-full md:w-auto">
              <button
                type="button"
                onClick={() => setActiveTabMode('booklet')}
                className={`flex-1 md:flex-initial py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  activeTabMode === 'booklet'
                    ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <BookMarked className="w-4 h-4" />
                <span>📖 4 Sayfalık İki Dilli Kitapçık (DE + TR)</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTabMode('exam')}
                className={`flex-1 md:flex-initial py-2 px-4 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all ${
                  activeTabMode === 'exam'
                    ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Edit3 className="w-4 h-4" />
                <span>✍️ İnteraktif Çöz & AI Puanı İste</span>
              </button>
            </div>

            {/* Aksiyon Butonları */}
            <div className="flex flex-wrap items-center space-x-2 w-full md:w-auto justify-end gap-1.5">
              {/* 1. DOĞRUDAN 4 SAYFA PDF İNDİR BUTONU (REPORTLAB ENGINE) */}
              <button
                type="button"
                onClick={handleDownloadDirectPdf}
                disabled={isDownloadingPdf}
                className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
              >
                {isDownloadingPdf ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>PDF Hazırlanıyor...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 text-emerald-200" />
                    <span>📥 4 Sayfalık PDF İndir</span>
                  </>
                )}
              </button>

              {/* 2. TARAYICI YAZDIR / ÖNİZLEME */}
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-teal-500 text-slate-300 hover:text-white text-xs font-bold shadow-md transition-all"
              >
                <Printer className="w-4 h-4 text-teal-300" />
                <span>🖨️ Yazdır / Önizleme</span>
              </button>

              <button
                type="button"
                onClick={handleCopyReport}
                className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold"
              >
                {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-teal-400" />}
                <span>{isCopied ? 'Kopyalandı' : 'Kopyala'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStage('config');
                  setCaseData(null);
                  setUserAnswers({});
                  setEvaluationResult(null);
                }}
                className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Yeni Vaka</span>
              </button>
            </div>

          </div>

          {/* =========================================================================
              GÖRÜNÜM A: 4 SAYFALIK İKİ DİLLİ ÇALIŞMA KİTAPÇIĞI (DEUTSCH + TÜRKÇE)
             ========================================================================= */}
          {activeTabMode === 'booklet' && (
            <div className="space-y-8">

              {/* ---------------- 1. SAYFA (🇩🇪 DEUTSCH: ANAMNESE & 12 FRAGEN) ---------------- */}
              <div className="booklet-page bg-slate-900/90 border-2 border-teal-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
                
                {/* Sayfa Başlığı */}
                <div className="booklet-page-header flex justify-between items-center border-b border-teal-500/30 pb-2">
                  <span className="text-xs font-black text-teal-400 tracking-wider">
                    🇩🇪 SEITE 1/4: KLINISCHER FALLBERICHT (ANAMNESE & 12 PRÜFUNGSFRAGEN)
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    FSP / KP Prüfungssimulation
                  </span>
                </div>

                {/* Vaka Başlığı & Hasta Bilgisi */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {deCase.title}
                  </h2>
                  {deCase.patient_profile && (
                    <div className="flex items-center space-x-2 text-xs text-teal-300 bg-slate-950 px-3 py-1 rounded-xl border border-teal-500/30 shrink-0">
                      <Activity className="w-3.5 h-3.5 text-teal-400" />
                      <span>{deCase.patient_profile.age} Jahre, {deCase.patient_profile.gender}</span>
                    </div>
                  )}
                </div>

                {/* Hasta Hikayesi */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Aktuelle Anamnese & Vorgeschichte:
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                    {deCase.patient_story}
                  </p>
                </div>

                {/* Vital ve Bulgular */}
                {deCase.vital_and_findings && (
                  <div className="p-3.5 rounded-2xl bg-teal-950/20 border border-teal-800/40 space-y-1">
                    <h4 className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                      Vitalparameter & Körperliche Untersuchung:
                    </h4>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                      {deCase.vital_and_findings}
                    </p>
                  </div>
                )}

                {/* 12 Soru Başlığı */}
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-black text-teal-300 uppercase tracking-wider border-b border-slate-800 pb-1">
                    12 Prüfungsfragen zum Fall:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(deCase.questions || []).map((q) => (
                      <div key={q.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-teal-300">Frage #{q.id}</span>
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {q.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-100 font-semibold leading-snug">
                          {q.question}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* ---------------- 2. SAYFA (🇩🇪 DEUTSCH: EPIKRISE & MUSTERLÖSUNGEN) ---------------- */}
              <div className="booklet-page bg-slate-900/90 border-2 border-teal-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
                
                {/* Sayfa Başlığı */}
                <div className="booklet-page-header flex justify-between items-center border-b border-teal-500/30 pb-2">
                  <span className="text-xs font-black text-teal-400 tracking-wider">
                    🇩🇪 SEITE 2/4: STRUKTURIERTE ANAMNESE-ZUSAMMENFASSUNG & 12 MUSTERLÖSUNGEN
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    FSP / KP Lösungsschlüssel
                  </span>
                </div>

                {/* Yapılandırılmış Anamnez Özeti (Arztbrief / Epikrise) */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <h4 className="text-[11px] font-bold text-teal-300 uppercase tracking-wider">
                    Strukturierte Anamnese-Zusammenfassung (Arztbrief / Übergabe):
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                    {deCase.anamnesis_summary || deCase.patient_story}
                  </p>
                </div>

                {/* 12 Sorunun Almanca Model Çözümleri (2 Sütunlu Kompakt Düzen) */}
                <div className="space-y-1.5 pt-1">
                  <h4 className="text-xs font-black text-teal-300 uppercase tracking-wider border-b border-slate-800 pb-1">
                    12 Musterlösungen der Prüfungsfragen:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(deCase.questions || []).map((q) => (
                      <div key={q.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-teal-300">
                              Frage #{q.id}: {q.category}
                            </span>
                            <span className="text-[10px] text-slate-400">{q.max_points || 10} Pkt</span>
                          </div>
                          <p className="text-[11px] text-slate-200 font-bold leading-snug pt-0.5">
                            {q.question}
                          </p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-teal-950/20 border border-teal-800/30 text-[10.5px] text-slate-100 leading-snug whitespace-pre-line mt-1">
                          <span className="font-bold text-teal-300">Lösung: </span>
                          {q.ideal_answer}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* ---------------- 3. SAYFA (🇹🇷 TÜRKÇE: ANAMNEZ & 12 SORU) ---------------- */}
              <div className="booklet-page bg-slate-900/90 border-2 border-blue-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
                
                {/* Sayfa Başlığı */}
                <div className="booklet-page-header flex justify-between items-center border-b border-blue-500/30 pb-2">
                  <span className="text-xs font-black text-blue-400 tracking-wider">
                    🇹🇷 SAYFA 3/4: KLİNİK VAKA ÖYKÜSÜ (TÜRKÇE ANAMNEZ & 12 SORU)
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Klinik Vaka İncelemesi
                  </span>
                </div>

                {/* Vaka Başlığı & Hasta Bilgisi */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-white">
                    {trCase.title}
                  </h2>
                  {trCase.patient_profile && (
                    <div className="flex items-center space-x-2 text-xs text-blue-300 bg-slate-950 px-3 py-1 rounded-xl border border-blue-500/30 shrink-0">
                      <Activity className="w-3.5 h-3.5 text-blue-400" />
                      <span>{trCase.patient_profile.age} Yaşında, {trCase.patient_profile.gender}</span>
                    </div>
                  )}
                </div>

                {/* Hasta Hikayesi */}
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Hasta Anamnezi ve Geliş Hikayesi:
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                    {trCase.patient_story}
                  </p>
                </div>

                {/* Vital ve Bulgular */}
                {trCase.vital_and_findings && (
                  <div className="p-3.5 rounded-2xl bg-blue-950/20 border border-blue-800/40 space-y-1">
                    <h4 className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                      Fizik Muayene ve Vital Bulgular:
                    </h4>
                    <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                      {trCase.vital_and_findings}
                    </p>
                  </div>
                )}

                {/* 12 Soru Başlığı */}
                <div className="space-y-2 pt-1">
                  <h4 className="text-xs font-black text-blue-300 uppercase tracking-wider border-b border-slate-800 pb-1">
                    Vakayla İlgili 12 Klinik Soru:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(trCase.questions || []).map((q) => (
                      <div key={q.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-black text-blue-300">Soru #{q.id}</span>
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            {q.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-100 font-semibold leading-snug">
                          {q.question}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* ---------------- 4. SAYFA (🇹🇷 TÜRKÇE: EPİKRİZ & 12 MODEL ÇÖZÜM) ---------------- */}
              <div className="booklet-page bg-slate-900/90 border-2 border-blue-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
                
                {/* Sayfa Başlığı */}
                <div className="booklet-page-header flex justify-between items-center border-b border-blue-500/30 pb-2">
                  <span className="text-xs font-black text-blue-400 tracking-wider">
                    🇹🇷 SAYFA 4/4: YAPILANDIRILMIŞ EPİKRİZ ÖZETİ & 12 MODEL ÇÖZÜM
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400">
                    Klinik Model Çözümler
                  </span>
                </div>

                {/* Yapılandırılmış Anamnez Özeti (Epikriz) */}
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
                  <h4 className="text-[11px] font-bold text-blue-300 uppercase tracking-wider">
                    Yapılandırılmış Anamnez & Epikriz Özeti:
                  </h4>
                  <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-line">
                    {trCase.anamnesis_summary || trCase.patient_story}
                  </p>
                </div>

                {/* 12 Sorunun Türkçe Model Çözümleri (2 Sütunlu Kompakt Düzen) */}
                <div className="space-y-1.5 pt-1">
                  <h4 className="text-xs font-black text-blue-300 uppercase tracking-wider border-b border-slate-800 pb-1">
                    12 Sorunun İdeal Hekim Model Çözümleri:
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {(trCase.questions || []).map((q) => (
                      <div key={q.id} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-blue-300">
                              Soru #{q.id}: {q.category}
                            </span>
                            <span className="text-[10px] text-slate-400">{q.max_points || 10} Puan</span>
                          </div>
                          <p className="text-[11px] text-slate-200 font-bold leading-snug pt-0.5">
                            {q.question}
                          </p>
                        </div>
                        <div className="p-1.5 rounded-lg bg-blue-950/20 border border-blue-800/30 text-[10.5px] text-slate-100 leading-snug whitespace-pre-line mt-1">
                          <span className="font-bold text-blue-300">İdeal Model Yanıtı: </span>
                          {q.ideal_answer}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* =========================================================================
              GÖRÜNÜM B: İNTERAKTİF SINAV MODU (KULLANICI ÇÖZER VE AI DEĞERLENDİRİR)
             ========================================================================= */}
          {activeTabMode === 'exam' && (
            <div className="space-y-6">

              {/* Hasta Hikayesi Kartı */}
              <div className="bg-slate-900/90 border-2 border-teal-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20">
                      {lang === 'de' ? 'Patientengeschichte & Befunde' : 'Hasta Hikayesi & Klinik Anamnez'}
                    </span>
                    <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                      {lang === 'de' ? (caseData.german?.title || caseData.title) : (caseData.turkish?.title || caseData.title)}
                    </h2>
                  </div>

                  {caseData.patient_profile && (
                    <div className="flex items-center space-x-2 text-xs text-slate-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                      <Activity className="w-3.5 h-3.5 text-teal-400" />
                      <span>
                        {caseData.patient_profile.age} {lang === 'de' ? 'Jahre' : 'Yaşında'}, {caseData.patient_profile.gender}
                      </span>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {lang === 'de' ? 'Aktuelle Anamnese:' : 'Hasta Anamnezi & Öykü:'}
                  </h4>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                    {lang === 'de' ? (caseData.german?.patient_story || caseData.patient_story) : (caseData.turkish?.patient_story || caseData.patient_story)}
                  </p>
                </div>

                {(caseData.german?.vital_and_findings || caseData.turkish?.vital_and_findings || caseData.vital_and_findings) && (
                  <div className="p-4 rounded-2xl bg-teal-950/20 border border-teal-800/40 space-y-1.5">
                    <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                      {lang === 'de' ? 'Vitalparameter & Befunde:' : 'Vital Parametreler ve Muayene Bulguları:'}
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                      {lang === 'de' ? (caseData.german?.vital_and_findings || caseData.vital_and_findings) : (caseData.turkish?.vital_and_findings || caseData.vital_and_findings)}
                    </p>
                  </div>
                )}
              </div>

              {/* Çözüm Yöntemi Seçimi & Gelişim Karnesi Butonu */}
              <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900/90 border border-slate-800 p-2.5 rounded-3xl gap-3 shadow-lg">
                <div className="flex items-center space-x-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      inputMode === 'text'
                        ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950'
                    }`}
                  >
                    <Edit3 className="w-4 h-4 text-teal-400" />
                    <span>✍️ Metin / Klavye ile Çöz</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputMode('photo')}
                    className={`flex-1 sm:flex-none flex items-center justify-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                      inputMode === 'photo'
                        ? 'bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950'
                    }`}
                  >
                    <Image className="w-4 h-4 text-purple-400" />
                    <span>📷 El Yazısı Fotoğrafı Yükle</span>
                    {uploadedImages.length > 0 && (
                      <span className="px-1.5 py-0.5 text-[10px] bg-purple-500 text-white rounded-full font-black">
                        {uploadedImages.length} Sayfa
                      </span>
                    )}
                  </button>
                </div>

                {studentAnalytics && studentAnalytics.total_cases_solved > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowHistoryModal(true)}
                    className="w-full sm:w-auto flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-bold shadow-sm transition-all"
                  >
                    <TrendingUp className="w-4 h-4 text-amber-400" />
                    <span>📊 Gelişim Karnesi ({studentAnalytics.total_cases_solved} Vaka - %{studentAnalytics.average_percentage})</span>
                  </button>
                )}
              </div>

              {/* ----------------- SEÇENEK A: EL YAZISI FOTOĞRAFLARI YÜKLEME ALANI ----------------- */}
              {inputMode === 'photo' && (
                <div className="bg-slate-900/90 border-2 border-purple-500/40 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-purple-400 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                      📷 Medikal OCR & El Yazısı Değerlendirme
                    </span>
                    <h3 className="text-lg font-bold text-white pt-1">
                      {lang === 'de' ? 'Handschriftliche Antworten hochladen' : 'Yazdırdığınız Kitapçığın El Yazısı Fotoğraflarını Yükleyin'}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {lang === 'de'
                        ? 'Drucken Sie die 4 Seiten aus, beantworten Sie die Fragen handschriftlich und laden Sie hier 1 bis 4 Fotos (PNG/JPG) hoch. Die KI liest Ihre Handschrift automatisch und bewertet nach DGAI-Standard.'
                        : 'Yazıcıdan aldığınız 4 sayfalık kitapçığı tükenmez/kurşun kalemle el yazısıyla çözdükten sonra her sayfanın net bir fotoğrafını buraya yükleyin. Gemini 3.6 Flash yapay zekası tüm el yazılarınızı okuyacak, 12 soruyla eşleştirecek ve geçmiş vakalarınıza göre tekrarlayan hatalarınızı tespit edecektir.'}
                    </p>
                  </div>

                  {/* Yükleme ve Doğrudan Kamera Butonları */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* 1. Kamerayı Aç & Çek (Mobilde doğrudan kamera açar) */}
                    <label className="border-2 border-dashed border-purple-500/50 hover:border-purple-400 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-purple-950/20 hover:bg-purple-950/30 transition-all group shadow-md">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 group-hover:scale-110 transition-transform mb-2">
                        <Camera className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-white">
                        {lang === 'de' ? '📸 Kamera öffnen & Foto aufnehmen' : '📸 Kamerayı Aç & Fotoğraf Çek'}
                      </span>
                      <span className="text-[11px] text-purple-300/70 mt-0.5">
                        {lang === 'de' ? 'Direkt mit dem Smartphone fotografieren' : 'Telefonla çözdüğünüz kağıdı hemen çekin'}
                      </span>
                    </label>

                    {/* 2. Galeriden / Dosyalardan Seç */}
                    <label className="border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer bg-slate-950/60 hover:bg-slate-900/60 transition-all group shadow-md">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                      <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 group-hover:scale-110 transition-transform mb-2">
                        <UploadCloud className="w-6 h-6" />
                      </div>
                      <span className="text-sm font-bold text-slate-200">
                        {lang === 'de' ? '🖼️ Aus Galerie / Dateien wählen' : '🖼️ Galeriden / Dosyalardan Seç'}
                      </span>
                      <span className="text-[11px] text-slate-500 mt-0.5">
                        {lang === 'de' ? '1-4 Seiten gleichzeitig hochladen' : '1-4 Sayfa • Çoklu seçim yapabilirsiniz'}
                      </span>
                    </label>
                  </div>

                  {/* Yüklenen Fotoğrafların Önizleme Listesi */}
                  {uploadedImages.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
                        <span>Yüklenen Sayfa Fotoğrafları ({uploadedImages.length})</span>
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {uploadedImages.map((img, idx) => (
                          <div
                            key={img.id}
                            className="relative group bg-slate-950 border border-purple-500/30 rounded-2xl overflow-hidden shadow-lg p-2 space-y-2"
                          >
                            <div className="relative aspect-[3/4] bg-slate-900 rounded-xl overflow-hidden">
                              <img
                                src={img.base64}
                                alt={img.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute top-2 left-2 px-2 py-0.5 rounded-lg bg-black/80 text-[10px] font-black text-purple-300 border border-purple-500/40">
                                Sayfa #{idx + 1}
                              </div>
                              <button
                                type="button"
                                onClick={() => setPreviewImage(img.base64)}
                                className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                              >
                                <Eye className="w-6 h-6" />
                              </button>
                            </div>

                            <div className="flex items-center justify-between px-1">
                              <span className="text-[11px] text-slate-300 truncate max-w-[120px]">
                                {img.name}
                              </span>
                              <button
                                type="button"
                                onClick={() => removeImage(img.id)}
                                className="p-1 rounded-lg text-rose-400 hover:bg-rose-500/20 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ----------------- SEÇENEK B: KLAVYEYLE YAZILI ÇÖZÜM ALANI ----------------- */}
              {inputMode === 'text' && (
                <>
                  {/* İlerleme Çubuğu */}
                  <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800 px-5 py-3 rounded-2xl">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-slate-400">
                        {lang === 'de' ? 'Beantwortete Fragen:' : 'Yanıtlanan Sorular:'}
                      </span>
                      <span className="text-xs font-bold text-teal-400 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/30">
                        {answeredCount} / {caseData.questions?.length || 12}
                      </span>
                    </div>
                    <span className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl">
                      🔒 AI model cevapları gizlidir; önce kendi çözümünüzü yazın.
                    </span>
                  </div>

                  {/* 12 Soruluk Soru & Cevap Giriş Alanları */}
                  <div className="space-y-4">
                    {((lang === 'de' ? (caseData.german?.questions || caseData.questions) : (caseData.turkish?.questions || caseData.questions)) || []).map((q) => {
                      const isMandatory = q.id <= 6;
                      const hasAnswer = Boolean(userAnswers[q.id]?.trim());

                      return (
                        <div
                          key={q.id}
                          className={`break-inside-avoid bg-slate-900/70 border rounded-3xl p-5 sm:p-6 transition-all space-y-2 ${
                            hasAnswer
                              ? 'border-teal-500/40 bg-slate-900/90'
                              : 'border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-0.5">
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-black text-white px-2 py-0.5 rounded-lg bg-slate-800">
                                  #{q.id}
                                </span>
                                {q.category && (
                                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                    isMandatory
                                      ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                      : 'bg-blue-500/10 text-blue-300 border-blue-500/30'
                                  }`}>
                                    {q.category} {isMandatory ? (lang === 'de' ? '(Pflicht)' : '(Zorunlu)') : ''}
                                  </span>
                                )}
                              </div>
                              <h3 className="font-bold text-sm sm:text-base text-slate-100 leading-snug pt-1">
                                {q.question}
                              </h3>
                            </div>

                            <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                              {q.max_points || 10} {lang === 'de' ? 'Punkte' : 'Puan'}
                            </span>
                          </div>

                          <textarea
                            value={userAnswers[q.id] || ''}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                            rows={3}
                            placeholder={lang === 'de' ? `Ihre Antwort zu Frage #${q.id} eingeben...` : `Soru #${q.id} için klinik yaklaşımınızı ve cevabınızı buraya yazınız...`}
                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3.5 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-teal-500 leading-relaxed"
                          />
                        </div>
                      );
                    })}
                  </div>
                </>
              )}

              {/* Gönder & Değerlendirme İste Butonu */}
              <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-slate-200">
                    {lang === 'de' ? 'Fallbearbeitung abschließen?' : 'Vaka Çözümünüzü Tamamladınız mı?'}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {lang === 'de'
                      ? 'Klicken Sie unten, um die KI-Musterlösung abzurufen und Ihre Antworten detailliert auswerten zu lassen.'
                      : 'Aşağıdaki butona tıkladığınızda Altuğ AI cevaplarınızı soru soru değerlendirecek ve puanlayacaktır.'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSubmitEvaluation}
                  disabled={isEvaluating}
                  className={`py-4 px-8 rounded-2xl font-bold text-sm flex items-center justify-center space-x-2 shrink-0 shadow-xl transition-all ${
                    isEvaluating
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                      : 'bg-gradient-to-r from-emerald-500 via-teal-600 to-blue-600 hover:from-emerald-400 hover:to-blue-500 text-white shadow-emerald-500/20 active:scale-95'
                  }`}
                >
                  {isEvaluating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>{lang === 'de' ? 'Antworten werden ausgewertet...' : 'AI Karşılaştırmalı Değerlendirme Yapıyor...'}</span>
                    </>
                  ) : (
                    <>
                      <Award className="w-5 h-5 text-emerald-200" />
                      <span>{lang === 'de' ? 'Lösung & Auswertung Anfordern' : '📋 Çözümü Gönder & AI Değerlendirmesi İste'}</span>
                    </>
                  )}
                </button>
              </div>

            </div>
          )}

        </div>
      )}

      {/* ----------------- 3. AŞAMA: KARŞILAŞTIRMALI DEĞERLENDİRME & PUANLAMA ----------------- */}
      {stage === 'evaluation' && evaluationResult && caseData && (
        <div className="space-y-6">

          {/* Puan ve Karne Özeti Kartı */}
          <div className="bg-gradient-to-r from-teal-950/60 via-slate-900 to-blue-950/60 border-2 border-teal-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20">
                  {lang === 'de' ? 'Prüfungsauswertung & Vergleich' : 'Sınav Değerlendirmesi & Karşılaştırmalı Rapor'}
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-white mt-2">
                  {caseData.title}
                </h2>
              </div>

              {/* Skor Rozeti */}
              <div className="flex items-center space-x-3 bg-slate-950 p-3 rounded-2xl border border-teal-500/40 shrink-0">
                <div className="text-right">
                  <div className="text-xs text-slate-400">{lang === 'de' ? 'Gesamtergebnis' : 'Sınav Skoru'}</div>
                  <div className="text-xl font-black text-teal-300">
                    {evaluationResult.total_score} / {evaluationResult.max_score || 120}
                  </div>
                </div>
                <div className="w-12 h-12 rounded-xl bg-teal-500/20 flex items-center justify-center font-black text-teal-300 text-sm border border-teal-500/30">
                  %{evaluationResult.percentage || 0}
                </div>
              </div>
            </div>

            {/* Genel Geri Bildirim */}
            {evaluationResult.overall_feedback && (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  {lang === 'de' ? 'Gesamtbewertung der Leistung:' : 'Genel Klinik Performans Değerlendirmesi:'}
                </h4>
                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                  {evaluationResult.overall_feedback}
                </p>
              </div>
            )}

            {/* 🌟 UZUN VADELİ GELİŞİM VE İLERLEME ANALİZİ */}
            {evaluationResult.progress_analysis && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-teal-950/40 border-2 border-emerald-500/40 space-y-2 shadow-lg">
                <div className="flex items-center space-x-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>🌟 {lang === 'de' ? 'Entwicklungsfortschritt & Zeitverlauf:' : 'Uzun Vadeli Gelişim & İlerleme Raporu:'}</span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100/90 leading-relaxed whitespace-pre-line">
                  {evaluationResult.progress_analysis}
                </p>
              </div>
            )}

            {/* ⚠️ SIK TEKRARLANAN HATALAR VE KRİTİK UYARILAR (HAFIZA TAKİBİ) */}
            {evaluationResult.recurring_mistakes && evaluationResult.recurring_mistakes.length > 0 && (
              <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-slate-900 to-amber-950/40 border-2 border-rose-500/50 space-y-2.5 shadow-lg">
                <div className="flex items-center space-x-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
                  <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>⚠️ {lang === 'de' ? 'Wiederkehrende Fehler & Warnungen:' : 'Sık Tekrarlanan Hatalar & Kritik Hafıza Uyarısı:'}</span>
                </div>
                <ul className="space-y-1.5 pl-1">
                  {evaluationResult.recurring_mistakes.map((mistake, mIdx) => (
                    <li key={mIdx} className="text-xs text-rose-200/90 flex items-start space-x-2 leading-relaxed">
                      <span className="text-rose-400 font-bold mt-0.5">•</span>
                      <span>{mistake}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Güçlü Yönler & Geliştirilmesi Gerekenler */}
            {(evaluationResult.strengths?.length > 0 || evaluationResult.weaknesses?.length > 0) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                {evaluationResult.strengths?.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
                    <span className="text-xs font-bold text-emerald-400 flex items-center space-x-1.5 uppercase">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{lang === 'de' ? 'Stärken & Beherrschte Themen' : 'Güçlü Yönler & Hakim Konular'}</span>
                    </span>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {evaluationResult.strengths.map((s, idx) => (
                        <li key={idx} className="flex items-start space-x-1.5">
                          <span className="text-emerald-400">✓</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {evaluationResult.weaknesses?.length > 0 && (
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-2">
                    <span className="text-xs font-bold text-amber-400 flex items-center space-x-1.5 uppercase">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>{lang === 'de' ? 'Schwächen & Lernbedarf' : 'Çalışılması Gereken Zayıf Noktalar'}</span>
                    </span>
                    <ul className="space-y-1 text-xs text-slate-300">
                      {evaluationResult.weaknesses.map((w, idx) => (
                        <li key={idx} className="flex items-start space-x-1.5">
                          <span className="text-amber-400">!</span>
                          <span>{w}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Aksiyon Butonları */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center space-x-2 gap-1.5">
                <button
                  type="button"
                  onClick={handleDownloadDirectPdf}
                  disabled={isDownloadingPdf}
                  className="no-print flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                >
                  {isDownloadingPdf ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-white" />
                      <span>PDF Hazırlanıyor...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 text-emerald-200" />
                      <span>📥 4 Sayfalık PDF İndir</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="no-print flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 hover:border-teal-500 text-slate-300 hover:text-white text-xs font-bold shadow-md transition-all"
                >
                  <Printer className="w-4 h-4 text-teal-300" />
                  <span>{lang === 'de' ? 'Drucken / Vorschau' : '🖨️ Yazdır / Önizleme'}</span>
                </button>

                <button
                  onClick={() => setShowHistoryModal(true)}
                  className="no-print flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:text-amber-200 text-xs font-bold shadow-md transition-all"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                  <span>📊 Gelişim Karnesi</span>
                </button>

                <button
                  onClick={handleCopyReport}
                  className="no-print flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 text-xs font-semibold"
                >
                  {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-teal-400" />}
                  <span>{isCopied ? 'Kopyalandı' : (lang === 'de' ? 'Kopieren' : 'Metni Kopyala')}</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setStage('config');
                  setCaseData(null);
                  setEvaluationResult(null);
                  setUserAnswers({});
                  setUploadedImages([]);
                }}
                className="no-print flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-600/20"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{lang === 'de' ? 'Neuer Fall' : 'Yeni Vaka'}</span>
              </button>
            </div>

          </div>

          {/* Soru Soru Karşılaştırma Listesi */}
          <div className="space-y-4">
            {(evaluationResult.evaluations || []).map((item, idx) => {
              const isHigh = item.is_satisfactory !== false && item.score >= (item.max_points || 10) * 0.6;

              return (
                <div
                  key={idx}
                  className="break-inside-avoid bg-slate-900/80 border border-slate-800 rounded-3xl p-5 sm:p-6 space-y-3"
                >
                  {/* Soru Başlığı ve Puan */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-black text-teal-300 px-2 py-0.5 rounded-lg bg-slate-950 border border-teal-500/30">
                          {lang === 'de' ? 'Frage' : 'Soru'} #{item.question_id || idx + 1}
                        </span>
                        {item.category && (
                          <span className="text-[11px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-sm sm:text-base text-slate-100">
                        {item.question}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${
                        isHigh
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                      }`}>
                        {item.score || 0} / {item.max_points || 10} {lang === 'de' ? 'Pkt' : 'Puan'}
                      </span>
                    </div>
                  </div>

                  {/* Yan Yana / Karşılaştırmalı Yanıtlar */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    {/* Kullanıcının Yanıtı (Fotoğraftan okunan el yazısı veya metin) */}
                    <div className="p-4 rounded-2xl bg-slate-950/90 border border-blue-900/40 space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-400 uppercase">
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>{lang === 'de' ? 'Ihre Antwort:' : 'Sizin Yanıtınız (El Yazısı / Metin):'}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                        {item.user_answer || (lang === 'de' ? '(Keine Antwort)' : '(Boş bırakıldı)')}
                      </p>
                    </div>

                    {/* AI İdeal Model Çözümü */}
                    <div className="p-4 rounded-2xl bg-teal-950/30 border border-teal-800/40 space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-xs font-bold text-teal-300 uppercase">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{lang === 'de' ? 'Altuğ AI Musterlösung:' : 'Altuğ AI İdeal Model Çözümü:'}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                        {item.ideal_answer}
                      </p>
                    </div>

                  </div>

                  {/* Geri Bildirim ve Eksik Noktalar */}
                  {(item.feedback || item.missing_points) && (
                    <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-800/30 space-y-1 text-xs">
                      {item.feedback && (
                        <div className="text-slate-300 leading-relaxed">
                          <strong className="text-amber-300">{lang === 'de' ? 'Feedback:' : 'Değerlendirme:'} </strong>
                          {item.feedback}
                        </div>
                      )}
                      {item.missing_points && (
                        <div className="text-slate-400 leading-relaxed pt-1">
                          <strong className="text-teal-300">{lang === 'de' ? 'Fehlende Aspekte:' : 'Geliştirilmesi Gereken Noktalar:'} </strong>
                          {item.missing_points}
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* =========================================================================
          MODAL 1: ÖĞRENCİ GELİŞİM KARNESİ & VAKA GEÇMİŞİ HAFIZASI
         ========================================================================= */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-white">Öğrenci Gelişim Karnesi & Hafızası</h3>
                  <p className="text-xs text-slate-400">Zaman içindeki vaka başarı trendi ve tekrarlayan hata analizi</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {studentAnalytics && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400">Çözülen Vaka</div>
                  <div className="text-xl font-black text-white mt-0.5">{studentAnalytics.total_cases_solved}</div>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400">Ortalama Başarı</div>
                  <div className="text-xl font-black text-teal-300 mt-0.5">%{studentAnalytics.average_percentage}</div>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400">Ortalama Puan</div>
                  <div className="text-xl font-black text-blue-300 mt-0.5">{studentAnalytics.average_score} / 120</div>
                </div>
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400">Gelişim İvmesi</div>
                  <div className="text-xs font-black mt-1.5 flex items-center justify-center space-x-1">
                    {studentAnalytics.recent_trend === 'improving' && (
                      <span className="text-emerald-400 flex items-center">↗ Yükseliyor</span>
                    )}
                    {studentAnalytics.recent_trend === 'declining' && (
                      <span className="text-rose-400 flex items-center">↘ Düşüşte</span>
                    )}
                    {studentAnalytics.recent_trend === 'neutral' && (
                      <span className="text-amber-400 flex items-center">→ Dengeli</span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Sık Tekrarlanan Hata Özeti */}
            {studentAnalytics?.top_recurring_mistakes?.length > 0 && (
              <div className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-2">
                <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Geçmiş Vakalar Boyunca En Sık Tekrarlanan Noktalar</span>
                </h4>
                <ul className="space-y-1 text-xs text-rose-200/80">
                  {studentAnalytics.top_recurring_mistakes.map((item, idx) => (
                    <li key={idx} className="flex items-start space-x-1.5">
                      <span className="text-rose-400 font-bold">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Çözülen Vakaların Kronolojik Listesi */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Geçmiş Çözülen Vaka Sınavları ({caseHistory.length})
              </h4>

              {caseHistory.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-500">
                  Henüz kayıtlı bir vaka sınavı bulunmuyor.
                </div>
              ) : (
                <div className="space-y-2">
                  {caseHistory.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between gap-3"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs text-slate-100">{item.case_title}</div>
                        <div className="text-[10px] text-slate-400">
                          {item.completed_at?.replace('T', ' ').slice(0, 16)} • {item.language === 'de' ? '🇩🇪 Almanca' : '🇹🇷 Türkçe'}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="text-xs font-black text-teal-300 bg-teal-500/10 border border-teal-500/30 px-2.5 py-1 rounded-xl">
                          {item.score}/{item.max_score} (%{item.percentage})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          className="p-1 text-slate-500 hover:text-rose-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 2: YÜKLENEN EL YAZISI FOTOĞRAFI TAM EKRAN ÖNİZLEME
         ========================================================================= */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
          <div className="relative max-w-4xl max-h-[90vh] bg-slate-950 border border-slate-800 rounded-3xl overflow-hidden p-2">
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/70 text-white hover:bg-black"
            >
              <X className="w-6 h-6" />
            </button>
            <img
              src={previewImage}
              alt="Önizleme"
              className="max-h-[85vh] w-auto mx-auto object-contain rounded-2xl"
            />
          </div>
        </div>
      )}

    </div>
  );
}
