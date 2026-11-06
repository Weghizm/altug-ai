import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, Trash2, CheckCircle, AlertCircle, Loader2, Sparkles, BookOpen } from 'lucide-react';

export default function PdfUploader({ documents, selectedDocId, onSelectDoc, onUploadSuccess, onDeleteDoc }) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Lütfen geçerli bir PDF dosyası seçin.');
      return;
    }

    setErrorMessage('');
    setIsUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'PDF yüklenirken bir sorun oluştu.');
      }

      if (data.success && data.document) {
        onUploadSuccess(data.document);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Yükleme başarısız oldu.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      
      {/* Sürükle Bırak Yükleme Alanı */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[0.99]'
            : 'border-slate-700 bg-slate-900/50 hover:border-slate-500 hover:bg-slate-900/80'
        } ${isUploading ? 'opacity-70 pointer-events-none' : ''}`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          accept=".pdf"
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30 shadow-inner">
            {isUploading ? (
              <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
            ) : (
              <UploadCloud className="w-7 h-7" />
            )}
          </div>
          
          <div>
            <h3 className="text-base font-semibold text-slate-200">
              {isUploading ? 'PDF Analiz Ediliyor ve Konu Başlıkları Çıkarılıyor...' : 'PDF Dosyanızı Yükleyin'}
            </h3>
            <p className="text-sm text-slate-400 mt-1">
              Ders notları, tıp kitapları, klinik kılavuzları buraya sürükleyin veya <span className="text-blue-400 underline">dosya seçin</span>
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-slate-500 pt-2">
            <span>• Otomatik İçindekiler & Bölüm Tespiti</span>
            <span>• Yüksek Doğruluk</span>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800 text-rose-300 flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Yüklenen PDF'ler Listesi */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center space-x-2">
            <BookOpen className="w-4 h-4 text-blue-400" />
            <span>Yüklü PDF Belgeleri ({documents.length})</span>
          </h4>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center border border-slate-800/80 rounded-xl bg-slate-900/30">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Henüz bir PDF yüklenmedi.</p>
            <p className="text-xs text-slate-500 mt-1">Yukarıdaki alandan ilk PDF belgenizi yükleyerek başlayabilirsiniz.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {documents.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              const topicCount = doc.topics ? doc.topics.length : 0;
              return (
                <div
                  key={doc.id}
                  onClick={() => onSelectDoc(doc.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-blue-950/30 border-blue-500/60 shadow-md shadow-blue-500/5 ring-1 ring-blue-500/30'
                      : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2.5 rounded-lg shrink-0 ${isSelected ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 pr-2">
                        <h5 className="text-sm font-medium text-slate-200 truncate" title={doc.filename}>
                          {doc.filename}
                        </h5>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-slate-400">
                          <span>{doc.page_count} sayfa</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span className="text-teal-400 font-medium">{topicCount} konu başlığı</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteDoc(doc.id);
                      }}
                      title="Belgeyi Sil"
                      className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      {new Date(doc.uploaded_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {isSelected ? (
                      <span className="flex items-center space-x-1 text-blue-400 font-medium">
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Seçili Belge</span>
                      </span>
                    ) : (
                      <span className="text-slate-400 group-hover:text-slate-200 font-medium">
                        Test İçin Seç →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
