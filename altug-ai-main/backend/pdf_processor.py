import os
import re
import fitz  # PyMuPDF
from typing import List, Dict, Any, Optional

def extract_pdf_structure(filepath: str) -> Dict[str, Any]:
    """
    PDF dosyasını analiz eder, sayfa sayısını, meta verileri ve konu başlıklarını çıkarır.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"PDF dosyası bulunamadı: {filepath}")

    doc = fitz.open(filepath)
    page_count = len(doc)
    
    # 1. Adım: PDF Dahili İçindekiler Tablosu (TOC / Bookmarks) Kontrolü
    toc = doc.get_toc(simple=True)
    topics = []
    
    if toc and len(toc) > 0:
        for i, item in enumerate(toc):
            lvl, title, page = item
            title = title.strip()
            if not title:
                continue
            
            # Sonraki konunun başlangıç sayfasına göre bitiş sayfası belirleme
            next_page = page_count
            for next_item in toc[i+1:]:
                if next_item[2] >= page:
                    next_page = next_item[2]
                    break
            
            # Önizleme metni çek
            start_p = max(1, min(page, page_count))
            end_p = max(start_p, min(next_page, page_count))
            preview_text = get_text_range(doc, start_p, min(start_p + 1, end_p))[:300]
            
            topics.append({
                "id": f"toc_{i+1}",
                "title": title,
                "level": lvl,
                "start_page": start_p,
                "end_page": end_p,
                "source": "toc",
                "preview": preview_text.strip()
            })
            
    # 2. Adım: Eğer TOC yoksa veya çok az konu varsa, Başlık ve Font Analizi Yap
    if len(topics) < 2:
        detected_topics = detect_headings_by_text(doc)
        if detected_topics and len(detected_topics) > len(topics):
            topics = detected_topics
            
    # 3. Adım: Eğer hala konu bulunamadıysa mantıksal sayfa bloklarına böl
    if len(topics) == 0:
        topics = create_fallback_page_chunks(doc)
        
    doc.close()
    
    return {
        "page_count": page_count,
        "topics": topics
    }

def detect_headings_by_text(doc: fitz.Document) -> List[Dict[str, Any]]:
    """
    Sayfaları tarayarak font büyüklüğü, kalınlık ve başlık kalıplarına göre konuları tespit eder.
    """
    candidates = []
    heading_patterns = [
        re.compile(r'^(BÖLÜM|Bölüm|CHAPTER|Chapter|ÜNİTE|Ünite|KONU|Konu)\s*([0-9IVXLCDM]+)?[:.\s\-]+(.+)', re.IGNORECASE),
        re.compile(r'^([0-9]{1,2}\.[0-9]{0,2})\s+([A-ZÇĞİÖŞÜ][A-Za-zÇĞİÖŞÜa-z0-9\s,\-–/()]{3,80})$'),
        re.compile(r'^([A-ZÇĞİÖŞÜ0-9\s,\-–/()]{4,70})$'), # Tümü büyük harf başlıklar
    ]
    
    for page_idx in range(len(doc)):
        page_num = page_idx + 1
        page = doc[page_idx]
        blocks = page.get_text("dict").get("blocks", [])
        
        for b in blocks:
            if b.get("type") != 0: # Sadece metin blokları
                continue
            for line in b.get("lines", []):
                line_text = "".join(span.get("text", "") for span in line.get("spans", [])).strip()
                if not line_text or len(line_text) < 4 or len(line_text) > 90:
                    continue
                
                # Sayfa numarası veya üstbilgi/altbilgi elenmesi
                if line_text.isdigit() or re.match(r'^(sayfa|page|\d+/\d+)', line_text, re.IGNORECASE):
                    continue
                
                # İlk span'in font boyutu ve kalınlığı
                spans = line.get("spans", [])
                max_size = max((s.get("size", 10) for s in spans), default=10)
                is_bold = any(("bold" in s.get("font", "").lower() or s.get("flags", 0) & 2 != 0) for s in spans)
                
                is_heading = False
                matched_title = line_text
                
                for pat in heading_patterns:
                    match = pat.match(line_text)
                    if match:
                        is_heading = True
                        break
                
                # Font boyutu belirgin şekilde büyükse (örn >= 13pt) ve kalınsa başlık say
                if max_size >= 14.0 or (max_size >= 12.0 and is_bold):
                    is_heading = True
                
                if is_heading:
                    # Yinelenen başlık kontrolü
                    if not any(c["title"].lower() == matched_title.lower() for c in candidates):
                        candidates.append({
                            "title": matched_title,
                            "page": page_num,
                            "size": max_size
                        })

    # Konu aralıklarını yapılandır
    topics = []
    page_count = len(doc)
    
    # En fazla 40 anlamlı konu başlığı al
    candidates = candidates[:40]
    
    for i, c in enumerate(candidates):
        start_p = c["page"]
        next_p = candidates[i+1]["page"] if i + 1 < len(candidates) else page_count
        end_p = max(start_p, next_p)
        
        preview = get_text_range(doc, start_p, min(start_p + 1, end_p))[:250]
        
        topics.append({
            "id": f"head_{i+1}",
            "title": c["title"],
            "level": 1,
            "start_page": start_p,
            "end_page": end_p,
            "source": "heuristic",
            "preview": preview.strip()
        })
        
    return topics

def create_fallback_page_chunks(doc: fitz.Document) -> List[Dict[str, Any]]:
    """
    Eğer hiç başlık bulunamazsa belgeyi 5-10 sayfalık mantıksal bölümlere ayırır.
    """
    topics = []
    page_count = len(doc)
    chunk_size = 5 if page_count <= 30 else 10
    
    idx = 1
    for start_p in range(1, page_count + 1, chunk_size):
        end_p = min(start_p + chunk_size - 1, page_count)
        
        # İlk sayfanın ilk anlamlı satırını başlık yapmaya çalış
        first_page = doc[start_p - 1]
        text_lines = [l.strip() for l in first_page.get_text().split("\n") if l.strip() and len(l.strip()) > 3]
        title_candidate = text_lines[0] if text_lines else f"Bölüm {idx} (Sayfa {start_p}-{end_p})"
        if len(title_candidate) > 60:
            title_candidate = title_candidate[:57] + "..."
            
        topics.append({
            "id": f"chunk_{idx}",
            "title": f"{idx}. Kısım: {title_candidate}",
            "level": 1,
            "start_page": start_p,
            "end_page": end_p,
            "source": "chunk",
            "preview": (first_page.get_text()[:250]).strip()
        })
        idx += 1
        
    return topics

def get_text_range(doc: fitz.Document, start_page: int, end_page: int) -> str:
    """
    Belirli sayfa aralığındaki metni temizleyip birleştirir.
    """
    text_parts = []
    start_idx = max(0, start_page - 1)
    end_idx = min(len(doc), end_page)
    
    for p in range(start_idx, end_idx):
        page_text = doc[p].get_text("text")
        if page_text:
            text_parts.append(f"--- Sayfa {p + 1} ---\n" + page_text)
            
    return "\n\n".join(text_parts)

def get_topic_content(filepath: str, start_page: int, end_page: int, max_chars: int = 40000) -> str:
    """
    Verilen PDF ve sayfa aralığından test üretimi için gereken metin içeriğini çeker.
    """
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"PDF bulunamadı: {filepath}")
        
    doc = fitz.open(filepath)
    content = get_text_range(doc, start_page, end_page)
    doc.close()
    
    if len(content) > max_chars:
        # Karakter limiti aşıldığında anlamlı özetleme/kırpma
        content = content[:max_chars] + "\n\n[...Metin devamı sınırlandı...]"
        
    return content
