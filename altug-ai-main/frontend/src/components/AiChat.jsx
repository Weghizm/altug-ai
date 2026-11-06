import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, User, Trash2, Sparkles, Copy, Check, BookOpen, Layers, Zap, FileText, AlertCircle, Loader2, Image as ImageIcon, X, Camera, Eye, Plus, Images } from 'lucide-react';

export default function AiChat({ documents, selectedDocId, onSelectDoc }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState([]); // [{ id, base64, mimeType, name }]
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [previewModalImg, setPreviewModalImg] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      const res = await fetch('/api/chat/history?session_id=default');
      const data = await res.json();
      setMessages(data.messages || []);
    } catch (err) {
      console.error('Sohbet geçmişi çekilemedi:', err);
    }
  };

  const handleImageFiles = (files) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImages((prev) => [
          ...prev,
          {
            id: 'chat-img-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
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

  const handleSendMessage = async (customText = null) => {
    const textToSend = customText || inputMessage;
    if ((!textToSend.trim() && selectedImages.length === 0) || isLoading) return;

    const currentImages = [...selectedImages];
    const finalMsgText = textToSend.trim() || (currentImages.length > 0 ? 'Lütfen bu görselleri detaylıca analiz et ve klinik/akademik olarak yorumla.' : '');

    const storedImageFormat = currentImages.length > 1
      ? JSON.stringify(currentImages.map((img) => img.base64))
      : (currentImages[0]?.base64 || null);

    const userMsg = {
      id: 'temp-' + Date.now(),
      role: 'user',
      content: finalMsgText,
      image_data: storedImageFormat,
      created_at: new Date().toISOString()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setSelectedImages([]);
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: finalMsgText,
          doc_id: selectedDocId || undefined,
          session_id: 'default',
          images: currentImages.map((img) => ({
            base64: img.base64,
            mime_type: img.mimeType
          }))
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Yanıt alınamadı.');
      }

      if (data.message) {
        setMessages((prev) => [...prev, data.message]);
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: 'err-' + Date.now(),
          role: 'model',
          content: `⚠️ Bir hata oluştu: ${err.message}`,
          created_at: new Date().toISOString()
        }
      ]);
    } finally {
      setIsLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Sohbet geçmişini temizlemek istediğinize emin misiniz?')) return;
    try {
      await fetch('/api/chat/history?session_id=default', { method: 'DELETE' });
      setMessages([]);
      fetchChatHistory();
    } catch (err) {
      console.error('Geçmiş temizlenemedi:', err);
    }
  };

  const handleCopyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const parseImageData = (imageData) => {
    if (!imageData) return [];
    if (imageData.startsWith('[')) {
      try {
        return JSON.parse(imageData);
      } catch (e) {
        return [imageData];
      }
    }
    return [imageData];
  };

  const quickActions = [
    { label: '📸 Görselleri / EKG\'yi Yorumla', query: 'Yüklediğim görselleri / EKG traselerini sistematik olarak analiz et: Ritim, patolojik dalgalar, olası tanılar ve önerilen acil yaklaşımı belirt.' },
    { label: '🧪 Tahlil / Lab Sonuçlarını Analiz Et', query: 'Görsellerdeki tahlil/laboratuvar parametrelerini referans aralıklarıyla karşılaştırıp patolojik değerleri ve klinik anlamlarını açıkla.' },
    { label: '📝 Fotoğraftaki Soruları Çöz', query: 'Bu fotoğraflarda yer alan soruları adım adım incele, doğru cevabı ve diğer seçeneklerin neden yanlış olduğunu ayrıntılı gerekçelendir.' },
    { label: '📄 Kapsamlı PDF Özeti Çıkar', query: 'Bu PDF belgesinin temel başlıklarını, tanı kriterlerini ve kilit bilgilerini kapsayan ayrıntılı bir klinik özetini çıkar.' },
    { label: '🗂️ Flashcard (Hafıza Kartları)', query: 'Bu konunun ezberlenmesi gereken kilit noktaları için 5 adet Soru-Cevap formatında Flashcard ve akılda kalıcı mnemonikler hazırla.' }
  ];

  const renderFormattedContent = (content) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-2 text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (line.startsWith('### ')) {
            return <h4 key={idx} className="font-bold text-base text-blue-300 mt-3 mb-1">{line.replace('### ', '')}</h4>;
          }
          if (line.startsWith('## ')) {
            return <h3 key={idx} className="font-bold text-lg text-teal-300 mt-4 mb-2">{line.replace('## ', '')}</h3>;
          }
          if (line.startsWith('# ')) {
            return <h2 key={idx} className="font-extrabold text-xl text-white mt-4 mb-2">{line.replace('# ', '')}</h2>;
          }
          if (line.startsWith('- ') || line.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start space-x-2 pl-2">
                <span className="text-teal-400 font-bold">•</span>
                <span>{renderInlineStyles(line.substring(2))}</span>
              </div>
            );
          }
          if (line.startsWith('|')) {
            return (
              <div key={idx} className="font-mono text-xs overflow-x-auto bg-slate-950/70 p-1.5 rounded text-slate-300">
                {line}
              </div>
            );
          }
          if (line.trim() === '') {
            return <div key={idx} className="h-1" />;
          }
          return <p key={idx}>{renderInlineStyles(line)}</p>;
        })}
      </div>
    );
  };

  const renderInlineStyles = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="max-w-5xl mx-auto flex flex-col h-[calc(100vh-140px)] bg-slate-900/70 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      
      {/* Üst Bar / Belge Seçici ve Kontroller */}
      <div className="bg-slate-900/90 border-b border-slate-800 p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
        
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-blue-600 flex items-center justify-center shadow-md shadow-teal-500/20">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm">Altuğ AI</h3>
          </div>
        </div>

        {/* Belge Bağlam Seçimi */}
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-1.5 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300">
            <BookOpen className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <select
              value={selectedDocId || 'all'}
              onChange={(e) => onSelectDoc(e.target.value === 'all' ? null : e.target.value)}
              className="bg-transparent text-slate-200 focus:outline-none text-xs cursor-pointer max-w-[180px] sm:max-w-[240px] truncate"
            >
              <option value="all" className="bg-slate-900 text-slate-200">📚 Tüm Yüklü PDF'ler</option>
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id} className="bg-slate-900 text-slate-200">
                  📄 {doc.filename}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleClearHistory}
            title="Sohbeti Temizle"
            className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-900/50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>

      </div>

      {/* Mesaj Akış Alanı */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.length === 0 && !isLoading && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 my-auto opacity-70">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
              <Bot className="w-6 h-6" />
            </div>
            <div className="text-xs text-slate-400 max-w-sm leading-relaxed">
              PDF belgeleriniz hakkında soru sorabilir, özet çıkarabilir veya birden fazla görsel/fotoğraf (EKG, röntgen, soru vb.) yükleyebilirsiniz.
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const imgList = parseImageData(msg.image_data);

          return (
            <div
              key={msg.id}
              className={`flex items-start space-x-3 ${isUser ? 'flex-row-reverse space-x-reverse' : ''}`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center font-bold text-xs shadow-sm ${
                  isUser
                    ? 'bg-blue-600 text-white'
                    : 'bg-gradient-to-tr from-teal-500 to-indigo-600 text-white'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Mesaj Balonu */}
              <div
                className={`max-w-2xl rounded-2xl p-4 transition-all relative group space-y-2 ${
                  isUser
                    ? 'bg-blue-600 text-white rounded-tr-none shadow-md shadow-blue-600/10'
                    : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-tl-none shadow-md'
                }`}
              >
                {/* Gönderilen Görseller Varsa Grid Olarak Göster */}
                {imgList.length > 0 && (
                  <div className={`grid gap-2 mb-2 ${imgList.length === 1 ? 'grid-cols-1 max-w-sm' : 'grid-cols-2 max-w-md'}`}>
                    {imgList.map((imgSrc, i) => (
                      <div
                        key={i}
                        className="rounded-xl overflow-hidden border border-white/20 cursor-pointer group/img relative"
                        onClick={() => setPreviewModalImg(imgSrc)}
                      >
                        <img
                          src={imgSrc}
                          alt={`Yüklenen Görsel ${i + 1}`}
                          className="w-full h-36 object-cover hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-semibold space-x-1">
                          <Eye className="w-4 h-4" />
                          <span>Büyüt</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isUser ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  renderFormattedContent(msg.content)
                )}

                {/* Kopyalama Butonu */}
                {!isUser && (
                  <button
                    onClick={() => handleCopyText(msg.content, msg.id)}
                    title="Metni Kopyala"
                    className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start space-x-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 text-white flex items-center justify-center">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl rounded-tl-none p-4 text-slate-300 text-xs flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
              <span>Altuğ AI görselleri ve metni analiz ediyor...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Hızlı Aksiyon Butonları (Pills) */}
      <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-800/80 overflow-x-auto flex items-center space-x-2 flex-nowrap shrink-0">
        <span className="text-[11px] font-semibold text-slate-500 shrink-0 flex items-center space-x-1">
          <Zap className="w-3 h-3 text-amber-400" />
          <span>Hızlı:</span>
        </span>
        {quickActions.map((action, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(action.query)}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 hover:bg-teal-950/20 text-slate-300 hover:text-teal-300 whitespace-nowrap transition-all shrink-0"
          >
            {action.label}
          </button>
        ))}
      </div>

      {/* Mesaj & Çoklu Görsel Gönderme Kutusu */}
      <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0 space-y-2">
        
        {/* Seçili Çoklu Görseller Önizleme Şeridi */}
        {selectedImages.length > 0 && (
          <div className="p-2.5 bg-slate-950 border border-teal-500/40 rounded-2xl flex items-center space-x-2 overflow-x-auto">
            {selectedImages.map((img, idx) => (
              <div key={img.id} className="relative group shrink-0">
                <img
                  src={img.base64}
                  alt={img.name || `Görsel ${idx + 1}`}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-800"
                />
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute -top-1 -right-1 p-0.5 rounded-full bg-rose-900 hover:bg-rose-700 text-white shadow-md"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}

            {/* + Butonu */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-12 h-12 rounded-xl border border-dashed border-slate-700 hover:border-teal-400 flex items-center justify-center text-slate-400 hover:text-teal-300 shrink-0"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-semibold text-teal-400 px-2 shrink-0">
              {selectedImages.length} Görsel Seçildi
            </span>
          </div>
        )}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center space-x-2"
        >
          {/* Gizli Dosya Seçici (multiple) */}
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

          {/* Fotoğraf Ekle Butonu */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Görsel / Fotoğraf Ekle (Çoklu Seçim)"
            className={`p-3 rounded-2xl border transition-all flex items-center justify-center shrink-0 ${
              selectedImages.length > 0
                ? 'bg-teal-600 text-white border-teal-400 shadow-md shadow-teal-500/20'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-teal-400 hover:border-slate-700'
            }`}
          >
            <Camera className="w-5 h-5" />
          </button>

          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onPaste={handlePaste}
            placeholder={
              selectedImages.length > 0
                ? `${selectedImages.length} görsel hakkında soru yazın (veya doğrudan Enter'a basın)...`
                : 'Soru sorun, özet isteyin veya birden fazla görsel yapıştırın (Ctrl+V)...'
            }
            disabled={isLoading}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
          />

          <button
            type="submit"
            disabled={(!inputMessage.trim() && selectedImages.length === 0) || isLoading}
            className={`p-3 rounded-2xl transition-all shadow-md ${
              (inputMessage.trim() || selectedImages.length > 0) && !isLoading
                ? 'bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-400 hover:to-blue-500 text-white shadow-teal-500/20'
                : 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700/50'
            }`}
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>

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
