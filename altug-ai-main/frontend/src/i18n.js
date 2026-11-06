export const translations = {
  tr: {
    appName: "Altuğ AI",
    appSubtitle: "",
    assistantBadge: "",
    multimodalBadge: "Multimodal",
    
    // Tabs
    tabAnamnesis: "Anamnez & Klasik Çözücü",
    tabCreate: "Soru Hazırla",
    tabChat: "AI Sohbet & Özet",
    tabDocuments: "PDF Kütüphanesi",
    tabQuizzes: "Kayıtlı Testler",
    tabHistory: "Sonuçlar & Karne",
    
    // Status
    geminiActive: "Gemini 3.6 Aktif",
    apiKeyRequired: "API Anahtarı Gerekli",
    
    // Anamnesis Solver
    anamnesisTitle: "Anamnez Fotoğrafı & Klasik Vaka Çözücü",
    anamnesisSubtitle: "Hasta anamnez formu, epikriz, hekim mektubu (Arztbrief), EKG veya klasik soru fotoğrafını yükleyin; adım adım çözüp gerekçelendirsin.",
    pasteOrUpload: "Fotoğraf Yükleyin veya Yapıştırın (Ctrl + V)",
    orWriteText: "Veya Hasta Hikayesini / Soru Metnini Buraya Yazın:",
    textPlaceholder: "Örn: 55 yaşında erkek hasta, 1 saattir süren sol kola yayılan retrosternal göğüs ağrısı, bulantı ve soğuk terleme ile başvurdu. Özgeçmişinde HT ve DM mevcut...",
    btnSolve: "Anamnezi / Soruyu Çöz ve Açıkla",
    btnSolving: "Klinik Vaka Analiz Ediliyor ve Çözülüyor...",
    langSelect: "Çözüm Dili:",
    langTurkish: "🇹🇷 Türkçe",
    langGerman: "🇩🇪 Deutsch (FSP / KP Uyumlu)",
    
    // Analysis Result Cards
    resultTitle: "Klinik Vaka Değerlendirmesi ve Çözüm Raporu",
    anamnesisSummary: "Yapılandırılmış Anamnez Özeti",
    suspectedDiag: "Ön Tanı (Verdachtsdiagnose)",
    differentialDiag: "Ayırıcı Tanılar (Differentialdiagnosen)",
    diagnostics: "İstenmesi Gereken Tetkikler (Diagnostik & Labor)",
    therapyPlan: "Tedavi & Yönetim Planı (Therapieplan)",
    emergencyMgmt: "İlk Acil Yaklaşım & Stabilizasyon:",
    definitiveTx: "Kesin Tedavi & İdame:",
    detailedExplanation: "Adım Adım Gerekçeli Çözüm & Klinik Akıl Yürütme",
    clinicalPearl: "Kilit Klinik Not / Merksatz",
    btnCopyReport: "Raporu Kopyala",
    btnExportPdf: "PDF Olarak İndir",
    btnNewCase: "Yeni Vaka Çöz",
    
    // Quiz Config
    questionType: "Soru Formatı",
    typeClassic: "Klasik Vaka Sorusu (Açık Uçlu)",
    typeClassicDesc: "Hasta vaka senaryosu, model cevap ve puanlama kriteri",
    typeMcq: "Çoktan Seçmeli Test",
    typeMcqDesc: "5 seçenekli (A-E) test soruları ve çeldirici analizi",
    questionCount: "Soru Sayısı",
    difficulty: "Zorluk Seviyesi",
    diffEasy: "Temel & Tanım",
    diffMed: "Standart Klinik",
    diffHard: "İleri / TUS & Vaka",
    btnGenerateQuiz: "Seçili Konudan Sınavı Hazırla",
    btnGenerating: "Sorular PDF'ten Derleniyor...",
    
    // General
    selectedDoc: "Seçili Belge:",
    allDocs: "📚 Tüm Yüklü PDF'ler",
    clearHistory: "Sohbeti Temizle",
    typeMessage: "Soru sorun, özet isteyin veya görsel yapıştırın (Ctrl+V)...",
  },
  
  de: {
    appName: "Altuğ AI",
    appSubtitle: "",
    assistantBadge: "",
    multimodalBadge: "Multimodal",
    
    // Tabs
    tabAnamnesis: "Anamnese & Fallanalyse",
    tabCreate: "Fragen Erstellen",
    tabChat: "AI Chat & Zusammenfassung",
    tabDocuments: "PDF Bibliothek",
    tabQuizzes: "Gespeicherte Fälle",
    tabHistory: "Ergebnisse & Statistik",
    
    // Status
    geminiActive: "Gemini 3.6 Aktiv",
    apiKeyRequired: "API-Schlüssel Erforderlich",
    
    // Anamnesis Solver
    anamnesisTitle: "Anamnesebogen- & Fallanalyse (FSP / KP)",
    anamnesisSubtitle: "Laden Sie ein Foto eines Anamnesebogens, Arztbriefs, EKGs oder einer Prüfungsfrage hoch. Die KI löst und begründet den Fall schrittweise nach deutschen Leitlinien.",
    pasteOrUpload: "Foto Hochladen oder Einfügen (Strg + V)",
    orWriteText: "Oder Fallbeschreibung / Anamnesetext hier eingeben:",
    textPlaceholder: "Z.B.: 55-jähriger Patient stellt sich mit seit 1 Stunde bestehenden, retrosternalen Druckschmerzen mit Ausstrahlung in den linken Arm, Übelkeit und Kaltschweißigkeit vor...",
    btnSolve: "Fall Analysieren & Lösen",
    btnSolving: "Klinischer Fall wird analysiert...",
    langSelect: "Sprache:",
    langTurkish: "🇹🇷 Türkisch",
    langGerman: "🇩🇪 Deutsch (FSP / KP Standard)",
    
    // Analysis Result Cards
    resultTitle: "Klinischer Fallbericht & Prüfungslösung",
    anamnesisSummary: "Strukturierte Anamnese",
    suspectedDiag: "Verdachtsdiagnose",
    differentialDiag: "Differentialdiagnosen (DD)",
    diagnostics: "Empfohlene Diagnostik (Labor & Bildgebung)",
    therapyPlan: "Therapieplan & Management",
    emergencyMgmt: "Akut- und Notfallmaßnahmen:",
    definitiveTx: "Kausale Therapie & Weiterbehandlung:",
    detailedExplanation: "Schritt-für-Schritt Fallbegründung & Rationale",
    clinicalPearl: "Klinischer Merksatz",
    btnCopyReport: "Bericht Kopieren",
    btnExportPdf: "Als PDF Herunterladen",
    btnNewCase: "Neuer Fall",
    
    // Quiz Config
    questionType: "Fragenformat",
    typeClassic: "Klassische Fallfrage (Offene Frage)",
    typeClassicDesc: "Klinische Fallvignette, Musterlösung und Bewertungskriterien",
    typeMcq: "Multiple-Choice-Test",
    typeMcqDesc: "5 Antwortoptionen (A-E) mit ausführlicher Begründung",
    questionCount: "Anzahl der Fragen",
    difficulty: "Schwierigkeitsgrad",
    diffEasy: "Basiswissen",
    diffMed: "Standard Klinik",
    diffHard: "Fortgeschritten / Facharzt & KP",
    btnGenerateQuiz: "Fallfragen zum Thema Generieren",
    btnGenerating: "Fragen werden aus dem PDF erstellt...",
    
    // General
    selectedDoc: "Dokument:",
    allDocs: "📚 Alle PDF-Dokumente",
    clearHistory: "Verlauf Löschen",
    typeMessage: "Frage stellen, Zusammenfassung fordern oder Bild einfügen (Strg+V)...",
  }
};
