import os
import re
import json
import httpx
from typing import List, Dict, Any, Optional
from db import get_documents, get_document_by_id, get_quiz_results
from pdf_processor import get_topic_content

SYSTEM_INSTRUCTION = """Sen **Altuğ AI** akıllı tıp, sağlık bilimleri ve akademik çalışma asistanısın.
Kullanıcının yüklediği PDF ders kitaplarına, kılavuzlara, test sonuçlarına ve yüklediği görsel/fotoğraflara (EKG, röntgen, tahlil sonuçları, lezyonlar, ders notları, soru fotoğrafları) tam hakimiyetin var.

Temel Görevlerin:
1. **Görsel & Tıbbi Fotoğraf Analizi (Multimodal):** Kullanıcı bir fotoğraf (EKG şeridi, radyoloji grafisi, laboratuvar çıktısı, cilt lezyonu, tıp sorusu vb.) gönderdiğinde görseli titizlikle ve sistematik olarak analiz et:
   - 🔍 **Görseldeki Bulgular:** Görülen çizgiler, derivasyonlar, değerler, lezyon özellikleri veya soru metni.
   - 🩺 **Patolojik Değerlendirme & Tanı / Ayırıcı Tanı:** Olası klinik tablolar veya sorunun doğru çözümü.
   - 💡 **Klinik Yaklaşım & Öneriler:** Yapılması gereken ilk basamak müdahale, ileri tetkik veya kilit öğrenme noktası.
2. **Özet Çıkarma:** Kullanıcı özet istediğinde konunun can alıcı noktalarını, tanımları, patofizyolojiyi, tanı kriterlerini ve tedavi algoritmalarını zengin bir Türkçe Markdown formatında sun.
3. **Soru-Cevap & Açıklama:** PDF içindeki konularla ilgili gelen soruları belgedeki gerçek bilgilere dayanarak sayfa/bölüm referanslarıyla açık ve net yanıtla.
4. **Hafıza Kartları & Mnemonikler:** Zor kavramları akılda tutmak için soru-cevap kartları (flashcards), kısaltmalar ve klinik vaka ipuçları üret.
5. **Format:** Yanıtlarını daima şık, okunaklı Markdown biçimlendirmesi (kalın vurgular, maddeler, karşılaştırma tabloları, `💡 Klinik İpucu` veya `⚠️ Dikkat Edilmesi Gerekenler` kutucukları) ile ver.
"""

def prepare_chat_context(doc_id: Optional[str] = None, user_message: str = "") -> str:
    """
    Kullanıcının sorusuna göre ilgili PDF metinlerini ve varsa geçmiş sınav verilerini derler.
    """
    context_parts = []
    
    # 1. Belge İçerikleri
    if doc_id and doc_id != "all":
        doc = get_document_by_id(doc_id)
        if doc:
            context_parts.append(f"=== AKTİF SEÇİLİ PDF: {doc['filename']} ({doc['page_count']} Sayfa) ===")
            topics_summary = "\n".join([f"- {t['title']} (Sayfa {t['start_page']}-{t['end_page']})" for t in doc.get("topics", [])[:15]])
            context_parts.append(f"İçindekiler ve Konu Başlıkları:\n{topics_summary}")
            
            # Belgenin ilk 15-20 sayfasından metin örneği al
            sample_content = get_topic_content(doc["filepath"], 1, min(15, doc["page_count"]), max_chars=18000)
            context_parts.append(f"Belge Metin İçeriği (Örnek Bölümler):\n{sample_content}")
    else:
        # Tüm belgelerin özet başlıkları
        all_docs = get_documents()
        if all_docs:
            context_parts.append("=== SİSTEMDE YÜKLÜ TÜM PDF BELGELERİ ===")
            for d in all_docs:
                topic_titles = ", ".join([t["title"] for t in d.get("topics", [])[:5]])
                context_parts.append(f"- Belge: {d['filename']} ({d['page_count']} sayfa) -> Başlıca Konular: {topic_titles}")
                
    # 2. Eğer kullanıcı sınav performansı veya zayıf konuları soruyorsa sonuçları ekle
    if any(k in user_message.lower() for k in ["yanlış", "zayıf", "karne", "performans", "sonuç", "nerede hata", "tavsiye"]):
        results = get_quiz_results()
        if results:
            context_parts.append("\n=== KULLANICININ GEÇMİŞ SINAV PERFORMANSI ===")
            for r in results[:5]:
                context_parts.append(f"- Test: {r['quiz_title']} | Başarı: %{r['percentage']} | Skor: {r['score']}/{r['total_questions']}")
                wrong_questions = [a for a in r.get("answers", []) if not a.get("is_correct")]
                if wrong_questions:
                    context_parts.append(f"  * Yanlış Yapılan Sorular:")
                    for w in wrong_questions[:3]:
                        context_parts.append(f"    - Soru: {w.get('question_text')[:100]}... (Doğru Cevap Şıkkı: {w.get('correct_option')})")

    return "\n\n".join(context_parts)

async def call_gemini_chat(
    messages: List[Dict[str, str]],
    context_text: str,
    api_key: str,
    model_name: str = "gemini-3.6-flash",
    image_base64: Optional[str] = None,
    image_mime_type: Optional[str] = "image/jpeg",
    images: Optional[List[Dict[str, str]]] = None
) -> str:
    """
    Gemini 3.6 Flash ile çok turlu ve çoklu görsel destekli (multimodal) sohbet yanıtı üretir.
    """
    clean_model = (model_name or "gemini-3.6-flash").replace("models/", "").strip()

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    # Gemini mesaj formatına dönüştür
    contents = []
    
    first_user_injected = False
    for idx, msg in enumerate(messages):
        role = "user" if msg["role"] == "user" else "model"
        text = msg["content"]
        is_last_message = (idx == len(messages) - 1)
        
        if role == "user" and not first_user_injected:
            text = f"{SYSTEM_INSTRUCTION}\n\n[DOKÜMAN & PROJE BAĞLAMI]:\n\"\"\"\n{context_text}\n\"\"\"\n\nKullanıcı Mesajı: {text}"
            first_user_injected = True
            
        parts = [{"text": text}]
        
        # Son mesajda çoklu veya tekil görsel varsa inline_data olarak ekle
        if is_last_message and role == "user":
            if images and isinstance(images, list):
                for img in images:
                    b64 = img.get("base64") or img.get("data")
                    if b64:
                        raw_b64 = b64.split(",", 1)[1] if "," in b64 else b64
                        m_type = img.get("mime_type") or img.get("mimeType") or "image/jpeg"
                        parts.append({
                            "inline_data": {
                                "mime_type": m_type,
                                "data": raw_b64
                            }
                        })
            elif image_base64:
                raw_b64 = image_base64.split(",", 1)[1] if "," in image_base64 else image_base64
                parts.append({
                    "inline_data": {
                        "mime_type": image_mime_type or "image/jpeg",
                        "data": raw_b64
                    }
                })
            
        contents.append({
            "role": role,
            "parts": parts
        })
        
    if not contents:
        parts = [{"text": f"{SYSTEM_INSTRUCTION}\n\nMerhaba Altuğ AI, bana nasıl yardımcı olabilirsin?"}]
        if image_base64:
            raw_b64 = image_base64.split(",", 1)[1] if "," in image_base64 else image_base64
            parts.append({
                "inline_data": {
                    "mime_type": image_mime_type or "image/jpeg",
                    "data": raw_b64
                }
            })
        contents.append({
            "role": "user",
            "parts": parts
        })

    clean_model = "gemini-3.5-flash-lite"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={api_key}"
    payload = {
        "contents": contents,
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 3000
        }
    }
    
    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            error_msg = response.text
            try:
                err_json = response.json()
                if "error" in err_json and "message" in err_json["error"]:
                    error_msg = err_json["error"]["message"]
            except Exception:
                pass
            raise RuntimeError(f"Gemini Chat Hatası ({response.status_code}): {error_msg}")
            
        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise RuntimeError("Yapay zekadan yanıt alınamadı.")
            
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise RuntimeError("Boş yanıt döndü.")
            
        return parts[0].get("text", "").strip()

def generate_mock_chat_response(user_message: str, doc_id: Optional[str] = None) -> str:
    """
    API anahtarı henüz girilmemişse veya çevrimdışı test için zengin mock yanıt üretir.
    """
    msg_lower = user_message.lower()
    
    if "özet" in msg_lower:
        return """### 📄 PDF Kapsamlı Konu Özeti

**1. Temel Klinik Kavramlar:**
- **Akut Koroner Sendromlar (AKS):** STEMI, NSTEMI ve Kararsız Anjina klinik spektrumudur. İlk 10 dakikada EKG değerlendirmesi zorunludur.
- **Toplumda Gelişen Pnömoni:** CURB-65 skoru (Konfüzyon, Üre, Solunum, Tansiyon, Yaş >=65) yatış kararını belirler.

**2. Tanı ve Tedavi Algoritmaları:**
| Durum | İlk Basamak Tetkik | Altın Standart Tedavi |
|---|---|---|
| **STEMI** | 12 Derivasyonlu EKG | Primer PKG (<120 dk) / Fibrinolitik |
| **Pnömoni (CURB >= 2)** | Akciğer Grafisi, Balgam | İntravenöz Antibiyotik |
| **Tip 2 Diyabet** | Açlık Glukozu, HbA1c | Metformin + Yaşam Tarzı |

💡 **Kilit Klinik İpucu:** Kritik acil hastalarında ilk basamak daima ABC (Havayolu, Solunum, Dolaşım) stabilizasyonudur!
"""
    elif "flashcard" in msg_lower or "kart" in msg_lower:
        return """### 🗂️ Hızlı Tekrar ve Hafıza Kartları (Flashcards)

**Kart 1: STEMI'de Zamanlama**
- **Soru:** STEMI hastasında kapı-balon (Primer PKG) hedef süresi ne kadardır?
- **Cevap:** İdeal olarak ilk 90-120 dakika. PKG yapılamıyorsa ilk 30 dakikada fibrinolitik uygulanmalıdır.

**Kart 2: CURB-65 Skoru Harfleri**
- **C:** Confusion (Konfüzyon)
- **U:** Urea / BUN (>19 mg/dL)
- **R:** Respiratory Rate (>=30/dk)
- **B:** Blood Pressure (Sistolik <90 veya Diyastolik <=60)
- **65:** Yaş >= 65

💡 **Mnemonik:** *CURB* kriterlerini unutmamak için hastanın **C**anlılığı, **U**resi, **R**espirasyonu ve **B**asıncı olarak kodlayabilirsiniz.
"""
    else:
        return f"""Merhaba! Ben **Altuğ AI** ders ve klinik çalışma asistanınızım. 

Yüklediğiniz PDF belgelerini inceledim. Sorduğunuz *"{user_message}"* konusu hakkında size şunları sunabilirim:
- 📖 **Konu Özeti ve Şemalar:** İstediğiniz bölümü derinlemesine özetleyebilirim.
- ❓ **Soru-Cevap:** Anlamadığınız mekanizmaları ve ilaç etkilerini açıklayabilirim.
- 🩺 **Klinik Vaka Senaryoları:** Sizi test etmek için klinik vaka hazırlayabilirim.

Hangi konuyla devam etmek istersiniz?"""
