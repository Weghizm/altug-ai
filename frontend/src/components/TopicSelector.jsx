import React, { useState } from 'react';
import { Search, CheckSquare, Square, Layers, BookOpen, ChevronRight, Eye } from 'lucide-react';

export default function TopicSelector({ topics, selectedTopicIds, onToggleTopic, onSelectAll, onClearAll, customTopic, onCustomTopicChange }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [previewTopic, setPreviewTopic] = useState(null);

  const filteredTopics = (topics || []).filter((t) =>
    t.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 space-y-4">
      
      {/* Başlık ve Butonlar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-200">Konu Başlığı Seçimi</h3>
            <p className="text-xs text-slate-400">
              PDF'ten çıkarılan <span className="text-teal-400 font-medium">{topics?.length || 0}</span> konu arasından test hazırlamak istediklerinizi seçin.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Tümünü Seç
          </button>
          <button
            type="button"
            onClick={onClearAll}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          >
            Temizle
          </button>
          <span className="text-xs px-2.5 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
            {selectedTopicIds.length} Seçili
          </span>
        </div>
      </div>

      {/* Arama Çubuğu */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Konu başlıklarında ara (örn: Kardiyoloji, Anatomi, Farmakoloji, Enfeksiyon...)"
          className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
        />
      </div>

      {/* Konu Listesi */}
      <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
        {filteredTopics.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-sm">
            {searchQuery ? 'Aramanıza uygun konu başlığı bulunamadı.' : 'Bu belgede henüz konu başlığı bulunamadı.'}
          </div>
        ) : (
          filteredTopics.map((topic) => {
            const isSelected = selectedTopicIds.includes(topic.id);
            return (
              <div
                key={topic.id}
                onClick={() => onToggleTopic(topic.id)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between group ${
                  isSelected
                    ? 'bg-blue-600/15 border-blue-500/50 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0 pr-2">
                  <div className={`shrink-0 transition-colors ${isSelected ? 'text-blue-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
                    {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-blue-200 font-semibold' : 'text-slate-300'}`}>
                      {topic.title}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                      <span>Sayfa {topic.start_page} - {topic.end_page}</span>
                      {topic.source === 'toc' && (
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-teal-400 border border-teal-500/20">
                          İçindekiler
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {topic.preview && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewTopic(topic);
                    }}
                    title="Bölüm İçeriğini Önizle"
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 shrink-0"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Özel Konu Tanımlama */}
      <div className="pt-2 border-t border-slate-800/80">
        <label className="block text-xs font-medium text-slate-400 mb-1">
          Veya PDF İçinden Özel Bir Konu / Soru Alanı Belirtin (Opsiyonel):
        </label>
        <input
          type="text"
          value={customTopic}
          onChange={(e) => onCustomTopicChange(e.target.value)}
          placeholder="Örn: Akut Koroner Sendromlar ve EKG Değişiklikleri"
          className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-teal-500"
        />
      </div>

      {/* Önizleme Modal */}
      {previewTopic && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-semibold text-slate-200 text-sm truncate pr-2">{previewTopic.title}</h4>
              <button
                onClick={() => setPreviewTopic(null)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800"
              >
                Kapat
              </button>
            </div>
            <div className="text-xs text-slate-400 space-y-2 max-h-60 overflow-y-auto bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <p className="font-medium text-teal-400">Sayfa {previewTopic.start_page} - {previewTopic.end_page} İçerik Özeti:</p>
              <p className="whitespace-pre-line text-slate-300">{previewTopic.preview || 'Önizleme metni bulunmuyor.'}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
