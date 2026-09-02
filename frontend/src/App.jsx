import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import PdfUploader from './components/PdfUploader';
import TopicSelector from './components/TopicSelector';
import QuizConfig from './components/QuizConfig';
import QuizPlayer from './components/QuizPlayer';
import QuizResult from './components/QuizResult';
import SavedQuizzes from './components/SavedQuizzes';
import HistoryResults from './components/HistoryResults';
import SettingsModal from './components/SettingsModal';
import AiChat from './components/AiChat';
import AnamnesisSolver from './components/AnamnesisSolver';
import { Sparkles, BookOpen, AlertCircle, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { translations } from './i18n';

export default function App() {
  const [lang, setLang] = useState('tr'); // 'tr' | 'de'
  const t = translations[lang] || translations.tr;

  const [activeTab, setActiveTab] = useState('anamnesis'); // 'anamnesis', 'create', 'chat', 'documents', 'quizzes', 'history', 'player', 'result'
  
  // Data States
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [selectedTopicIds, setSelectedTopicIds] = useState([]);
  const [customTopic, setCustomTopic] = useState('');
  
  // Quiz Generator Configs
  const [questionCount, setQuestionCount] = useState(5);
  const [difficulty, setDifficulty] = useState('Orta');
  const [questionStyle, setQuestionStyle] = useState('klinik');
  const [questionType, setQuestionType] = useState('mcq'); // 'mcq' | 'classic'
  
  // Running Quiz & Results
  const [currentQuiz, setCurrentQuiz] = useState(null);
  const [currentResult, setCurrentResult] = useState(null);
  const [quizzes, setQuizzes] = useState([]);
  const [results, setResults] = useState([]);
  
  // App Settings & Modals
  const [settings, setSettings] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoBanner, setInfoBanner] = useState('');

  // İlk veri yükleme
  useEffect(() => {
    fetchDocuments();
    fetchQuizzes();
    fetchResults();
    fetchSettings();
  }, []);

  const fetchDocuments = async () => {
    try {
      const res = await fetch('/api/documents');
      const data = await res.json();
      if (data.documents) {
        setDocuments(data.documents);
        if (data.documents.length > 0 && !selectedDocId) {
          setSelectedDocId(data.documents[0].id);
        }
      }
    } catch (err) {
      console.error('Belgeler yüklenemedi:', err);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await fetch('/api/quizzes');
      const data = await res.json();
      if (data.quizzes) {
        setQuizzes(data.quizzes);
      }
    } catch (err) {
      console.error('Testler yüklenemedi:', err);
    }
  };

  const fetchResults = async () => {
    try {
      const res = await fetch('/api/results');
      const data = await res.json();
      if (data.results) {
        setResults(data.results);
      }
    } catch (err) {
      console.error('Sonuçlar yüklenemedi:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      const data = await res.json();
      setSettings(data);
      if (data.default_difficulty) setDifficulty(data.default_difficulty);
      if (data.default_question_count) setQuestionCount(data.default_question_count);
    } catch (err) {
      console.error('Ayarlar yüklenemedi:', err);
    }
  };

  const handleUploadSuccess = (newDoc) => {
    setDocuments((prev) => [newDoc, ...prev]);
    setSelectedDocId(newDoc.id);
    setSelectedTopicIds([]);
    setCustomTopic('');
    setInfoBanner(`"${newDoc.filename}" yüklendi ve ${newDoc.topics.length} konu çıkarıldı!`);
    setTimeout(() => setInfoBanner(''), 6000);
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm('Bu belgeyi silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      if (selectedDocId === docId) {
        setSelectedDocId(documents.find((d) => d.id !== docId)?.id || null);
        setSelectedTopicIds([]);
      }
    } catch (err) {
      console.error('Belge silinemedi:', err);
    }
  };

  const handleToggleTopic = (topicId) => {
    setSelectedTopicIds((prev) =>
      prev.includes(topicId) ? prev.filter((id) => id !== topicId) : [...prev, topicId]
    );
  };

  const handleSelectAllTopics = () => {
    const currentDoc = documents.find((d) => d.id === selectedDocId);
    if (currentDoc && currentDoc.topics) {
      setSelectedTopicIds(currentDoc.topics.map((t) => t.id));
    }
  };

  const handleClearAllTopics = () => {
    setSelectedTopicIds([]);
  };

  const handleGenerateQuiz = async () => {
    if (!selectedDocId) {
      setErrorMessage(lang === 'de' ? 'Bitte wählen Sie zuerst ein PDF-Dokument aus.' : 'Lütfen önce bir PDF dosyası seçin veya yükleyin.');
      return;
    }
    if (selectedTopicIds.length === 0 && !customTopic.trim()) {
      setErrorMessage(lang === 'de' ? 'Bitte wählen Sie mindestens ein Thema aus.' : 'Lütfen test üretmek için en az bir konu başlığı seçin.');
      return;
    }

    setErrorMessage('');
    setIsGenerating(true);

    try {
      const res = await fetch('/api/generate-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doc_id: selectedDocId,
          topic_ids: selectedTopicIds,
          custom_topic_name: customTopic.trim() || undefined,
          question_count: questionCount,
          difficulty: difficulty,
          question_style: questionStyle,
          question_type: questionType,
          language: lang
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Test üretimi sırasında bir hata oluştu.');
      }

      if (data.quiz) {
        setCurrentQuiz(data.quiz);
        setActiveTab('player');
        fetchQuizzes();
      }
    } catch (err) {
      setErrorMessage(err.message || 'Soru oluşturulamadı.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmitQuiz = async (submission) => {
    try {
      const res = await fetch('/api/submit-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission)
      });

      const data = await res.json();
      if (data.result) {
        setCurrentResult(data.result);
        setActiveTab('result');
        fetchResults();
      }
    } catch (err) {
      console.error('Sınav gönderilemedi:', err);
    }
  };

  const handlePlayExistingQuiz = (quiz) => {
    setCurrentQuiz(quiz);
    setActiveTab('player');
  };

  const handleDeleteQuiz = async (quizId) => {
    if (!window.confirm('Bu testi silmek istediğinize emin misiniz?')) return;
    try {
      await fetch(`/api/quizzes/${quizId}`, { method: 'DELETE' });
      setQuizzes((prev) => prev.filter((q) => q.id !== quizId));
    } catch (err) {
      console.error('Test silinemedi:', err);
    }
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });
      fetchSettings();
    } catch (err) {
      console.error('Ayarlar kaydedilemedi:', err);
    }
  };

  const activeDoc = documents.find((d) => d.id === selectedDocId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      
      {/* Üst Menü / Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasApiKey={settings?.has_api_key}
        onOpenSettings={() => setIsSettingsOpen(true)}
        lang={lang}
        setLang={setLang}
      />

      {/* Ana İçerik */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Bilgilendirme ve Hata Bildirimleri */}
        {infoBanner && (
          <div className="mb-6 p-4 rounded-2xl bg-teal-950/40 border border-teal-700/60 text-teal-300 flex items-center justify-between text-xs sm:text-sm animate-pulse-subtle">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-teal-400" />
              <span>{infoBanner}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center justify-between text-xs sm:text-sm">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage('')} className="text-xs text-rose-400 underline">Kapat</button>
          </div>
        )}

        {/* 1. SEKME: ANAMNEZ VE KLASİK VAKA ÇÖZÜCÜ */}
        {activeTab === 'anamnesis' && (
          <AnamnesisSolver
            lang={lang}
            setLang={setLang}
            documents={documents}
            selectedDocId={selectedDocId}
          />
        )}

        {/* 2. SEKME: SORU HAZIRLA (KLASİK & ÇOKTAN SEÇMELİ) */}
        {activeTab === 'create' && (
          <div className="space-y-6">
            
            {/* Karşılama Banner'ı */}
            <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/20 to-teal-900/30 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>{lang === 'de' ? 'Intelligente Fallfragen-Engine' : 'Yapay Zeka Destekli Soru Motoru'}</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {lang === 'de' ? 'Klassische Fallfragen & Multiple-Choice aus PDFs' : 'PDF\'lerinizden Klasik Vaka Soruları & Test Hazırlayın'}
                </h1>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {lang === 'de' 
                    ? 'Laden Sie Ihre Skripte oder Lehrbücher hoch. Wählen Sie ein Thema aus, um offene klinische Fallanalysen oder 5-fach Multiple-Choice-Fragen zu generieren.'
                    : 'Tıp kitaplarınızı ve ders notlarınızı yükleyin. Seçtiğiniz konudan ister açık uçlu klasik vaka soruları, ister 5 şıklı test üretin.'}
                </p>
              </div>

              {!settings?.has_api_key && (
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="px-4 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold flex items-center space-x-2 shrink-0 transition-all"
                >
                  <span>Gemini API Key Tanımla</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Çalışma Alanı */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Sol Sütun: PDF Seçimi ve Konu Listesi */}
              <div className="lg:col-span-7 space-y-6">
                
                {/* PDF Seçimi & Yükleme */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200 flex items-center space-x-2">
                      <BookOpen className="w-4 h-4 text-blue-400" />
                      <span>{t.selectedDoc}</span>
                    </h3>
                    <button
                      onClick={() => setActiveTab('documents')}
                      className="text-xs text-blue-400 hover:underline"
                    >
                      {lang === 'de' ? 'Neues PDF Hochladen →' : 'Yeni PDF Yükle →'}
                    </button>
                  </div>

                  {documents.length === 0 ? (
                    <div className="p-6 text-center border border-dashed border-slate-700 rounded-2xl bg-slate-950/40">
                      <p className="text-xs text-slate-400 mb-3">
                        {lang === 'de' ? 'Keine PDF-Dokumente vorhanden.' : 'Henüz yüklü bir PDF belgesi bulunmuyor.'}
                      </p>
                      <button
                        onClick={() => setActiveTab('documents')}
                        className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md"
                      >
                        {lang === 'de' ? 'PDF Hochladen' : 'Hemen PDF Yükle'}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <select
                        value={selectedDocId || ''}
                        onChange={(e) => {
                          setSelectedDocId(e.target.value);
                          setSelectedTopicIds([]);
                        }}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-100 font-medium focus:outline-none focus:border-blue-500"
                      >
                        {documents.map((doc) => (
                          <option key={doc.id} value={doc.id}>
                            📄 {doc.filename} ({doc.page_count} {lang === 'de' ? 'Seiten' : 'Sayfa'} - {doc.topics?.length || 0} {lang === 'de' ? 'Themen' : 'Konu'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Konu Başlığı Seçici */}
                {activeDoc && (
                  <TopicSelector
                    topics={activeDoc.topics}
                    selectedTopicIds={selectedTopicIds}
                    onToggleTopic={handleToggleTopic}
                    onSelectAll={handleSelectAllTopics}
                    onClearAll={handleClearAllTopics}
                    customTopic={customTopic}
                    onCustomTopicChange={setCustomTopic}
                  />
                )}

              </div>

              {/* Sağ Sütun: Sınav Yapılandırması */}
              <div className="lg:col-span-5">
                <QuizConfig
                  questionCount={questionCount}
                  setQuestionCount={setQuestionCount}
                  difficulty={difficulty}
                  setDifficulty={setDifficulty}
                  questionStyle={questionStyle}
                  setQuestionStyle={setQuestionStyle}
                  questionType={questionType}
                  setQuestionType={setQuestionType}
                  onGenerateQuiz={handleGenerateQuiz}
                  isGenerating={isGenerating}
                  disabled={!selectedDocId || (selectedTopicIds.length === 0 && !customTopic.trim())}
                  lang={lang}
                />
              </div>

            </div>

          </div>
        )}

        {/* 3. SEKME: AI SOHBET & ÖZET ASİSTANI */}
        {activeTab === 'chat' && (
          <AiChat
            documents={documents}
            selectedDocId={selectedDocId}
            onSelectDoc={setSelectedDocId}
          />
        )}

        {/* 4. SEKME: PDF KÜTÜPHANESİ */}
        {activeTab === 'documents' && (
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-100">{t.tabDocuments}</h2>
                <p className="text-xs text-slate-400">
                  {lang === 'de' ? 'Verwalten Sie Ihre medizinischen Skripte und Lehrbücher.' : 'Ders notlarınızı, tıp kitaplarınızı ve makalelerinizi yönetin.'}
                </p>
              </div>
            </div>

            <PdfUploader
              documents={documents}
              selectedDocId={selectedDocId}
              onSelectDoc={(id) => {
                setSelectedDocId(id);
                setSelectedTopicIds([]);
                setActiveTab('create');
              }}
              onUploadSuccess={handleUploadSuccess}
              onDeleteDoc={handleDeleteDoc}
            />
          </div>
        )}

        {/* 5. SEKME: KAYITLI TESTLER */}
        {activeTab === 'quizzes' && (
          <SavedQuizzes
            quizzes={quizzes}
            onPlayQuiz={handlePlayExistingQuiz}
            onDeleteQuiz={handleDeleteQuiz}
          />
        )}

        {/* 6. SEKME: GEÇMİŞ & KARNE */}
        {activeTab === 'history' && (
          <HistoryResults
            results={results}
            onSelectResult={(res) => {
              setCurrentResult(res);
              setActiveTab('result');
            }}
          />
        )}

        {/* 7. EKRAN: İNTERAKTİF SINAV OYNATICI */}
        {activeTab === 'player' && currentQuiz && (
          <QuizPlayer
            quiz={currentQuiz}
            onSubmitQuiz={handleSubmitQuiz}
            onCancel={() => setActiveTab('create')}
          />
        )}

        {/* 8. EKRAN: SINAV SONUCU & KARNE */}
        {activeTab === 'result' && currentResult && (
          <QuizResult
            result={currentResult}
            onRetake={() => {
              const q = quizzes.find((item) => item.id === currentResult.quiz_id) || currentQuiz;
              if (q) {
                setCurrentQuiz(q);
                setActiveTab('player');
              }
            }}
            onNewQuiz={() => setActiveTab('create')}
          />
        )}

      </main>

      {/* Ayarlar Modalı */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
      />

    </div>
  );
}
