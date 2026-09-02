import os
import shutil
import uuid
import io
from typing import List, Optional
from pathlib import Path

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, Response, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse, StreamingResponse, FileResponse
from pydantic import BaseModel

from db import (
    save_document, get_documents, get_document_by_id, delete_document,
    save_quiz, get_quizzes, get_quiz_by_id, delete_quiz,
    save_quiz_result, get_quiz_results, get_setting, set_setting,
    save_chat_message, get_chat_history, clear_chat_history,
    save_case_evaluation, get_case_evaluations_history, get_student_learning_analytics,
    delete_case_evaluation, clear_case_evaluations_history
)
from pdf_processor import extract_pdf_structure, get_topic_content
from quiz_generator import generate_quiz_prompt, call_gemini_api, generate_mock_quiz
from chat_assistant import prepare_chat_context, call_gemini_chat, generate_mock_chat_response
from anamnesis_solver import solve_anamnesis_case, generate_mock_anamnesis_solution, translate_anamnesis_analysis
from case_simulator import generate_12_question_case, evaluate_user_case_answers, generate_mock_12_case

app = FastAPI(title="Altuğ AI - PDF Test & Chat & Anamnesis API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
UPLOAD_DIR = DATA_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# ----------------- MODELLER -----------------

class GenerateCaseExamRequest(BaseModel):
    topic: Optional[str] = "Klinik Acil Vaka"
    doc_id: Optional[str] = None
    topic_id: Optional[str] = None
    source_type: Optional[str] = "pdf" # "pdf" | "web"
    language: Optional[str] = "tr" # "tr" | "de"
    urgency_type: Optional[str] = "auto" # "elective" | "emergency" | "auto"

class EvaluateCaseExamRequest(BaseModel):
    case_data: dict
    user_answers: Optional[dict] = None # { "1": "cevabim...", "2": "..." }
    images: Optional[List[dict]] = None # [{"base64": "...", "mime_type": "image/png"}]
    language: Optional[str] = "tr"

class TranslateAnalysisRequest(BaseModel):
    analysis: dict
    target_language: str # "de" | "tr"

class AnamnesisSolveRequest(BaseModel):
    anamnesis_text: Optional[str] = ""
    image_base64: Optional[str] = None
    image_mime_type: Optional[str] = "image/jpeg"
    images: Optional[List[dict]] = None
    language: Optional[str] = "tr" # "tr" | "de"
    doc_id: Optional[str] = None

class ChatMessageRequest(BaseModel):
    message: str
    doc_id: Optional[str] = None
    session_id: Optional[str] = "default"
    image_base64: Optional[str] = None
    image_mime_type: Optional[str] = "image/jpeg"
    images: Optional[List[dict]] = None

class GenerateQuizRequest(BaseModel):
    doc_id: str
    topic_ids: List[str]
    custom_topic_name: Optional[str] = None
    question_count: int = 5
    difficulty: str = "Orta" # Kolay, Orta, Zor, Klinik Vaka
    question_style: str = "klinik" # klinik, kavram, karma
    question_type: Optional[str] = "mcq" # "mcq" | "classic"
    language: Optional[str] = "tr" # "tr" | "de"
    api_key: Optional[str] = None
    model_name: Optional[str] = "gemini-2.5-flash"

class SubmitQuizRequest(BaseModel):
    quiz_id: str
    time_spent_seconds: int
    answers: List[dict] # [{"question_id": 1, "selected_option": 0, "is_correct": true}]

class SettingsRequest(BaseModel):
    gemini_api_key: Optional[str] = None
    model_name: Optional[str] = "gemini-2.5-flash"
    default_difficulty: Optional[str] = "Orta"
    default_question_count: Optional[int] = 5

def get_effective_api_key(explicit_key: Optional[str] = None) -> str:
    """
    API anahtarı öncelik sırası:
    1. İstekten açıkça gelen (explicit_key)
    2. Render.com / .env ortam değişkeni (os.environ['GEMINI_API_KEY'])
    3. Veritabanından gelen (geçersiz test tokenları hariç)
    """
    if explicit_key and len(explicit_key.strip()) > 10:
        return explicit_key.strip()
    env_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if env_key and len(env_key) > 10:
        return env_key
    db_key = get_setting("gemini_api_key", "").strip()
    if db_key and len(db_key) > 10 and not db_key.startswith("AQ."):
        return db_key
    return env_key or db_key

def get_effective_model_name(explicit_model: Optional[str] = None) -> str:
    """
    Model adı doğrulama ve temizleme (Geçersiz 3.6 referanslarını 2.5-flash'a yönlendirir).
    """
    model = (explicit_model or get_setting("model_name") or "gemini-2.5-flash").replace("models/", "").strip()
    if not model or "3.6" in model or "3." in model:
        return "gemini-2.5-flash"
    return model

# ----------------- ENDPOINT'LER -----------------

@app.get("/api/health")
def health_check():
    return {"status": "ok", "message": "PDF Quiz API çalışıyor."}

@app.post("/api/upload-pdf")
async def upload_pdf(file: UploadFile = File(...)):
    """
    Kullanıcının yüklediği PDF'i kaydeder, analiz eder ve konu başlıklarını çıkarır.
    """
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Lütfen geçerli bir PDF dosyası yükleyin.")
    
    doc_id = str(uuid.uuid4())
    safe_filename = f"{doc_id}_{file.filename}"
    filepath = str(UPLOAD_DIR / safe_filename)
    
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        file_size = os.path.getsize(filepath)
        
        # PDF yapısını ve konuları analiz et
        structure = extract_pdf_structure(filepath)
        page_count = structure["page_count"]
        topics = structure["topics"]
        
        # Veritabanına kaydet
        saved_doc = save_document(
            doc_id=doc_id,
            filename=file.filename,
            filepath=filepath,
            file_size=file_size,
            page_count=page_count,
            topics=topics
        )
        
        return {
            "success": True,
            "document": saved_doc
        }
    except Exception as e:
        if os.path.exists(filepath):
            try:
                os.remove(filepath)
            except Exception:
                pass
        raise HTTPException(status_code=500, detail=f"PDF işlenirken hata oluştu: {str(e)}")

@app.get("/api/documents")
def list_documents():
    return {"documents": get_documents()}

@app.get("/api/documents/{doc_id}")
def get_document(doc_id: str):
    doc = get_document_by_id(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Belge bulunamadı.")
    return doc

@app.delete("/api/documents/{doc_id}")
def remove_document(doc_id: str):
    delete_document(doc_id)
    return {"success": True, "message": "Belge silindi."}

@app.post("/api/generate-quiz")
async def generate_quiz_endpoint(req: GenerateQuizRequest):
    """
    Seçilen konulardan metin derler ve Gemini AI ile test soruları üretir.
    """
    doc = get_document_by_id(req.doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="İlgili belge bulunamadı.")
    
    # Seçilen konuları bul
    all_topics = doc.get("topics", [])
    selected_topics = [t for t in all_topics if t["id"] in req.topic_ids]
    
    if not selected_topics and not req.custom_topic_name:
        raise HTTPException(status_code=400, detail="Lütfen en az bir konu başlığı seçin.")
    
    # Konu başlığı adını belirle
    if req.custom_topic_name:
        combined_title = req.custom_topic_name
    elif len(selected_topics) == 1:
        combined_title = selected_topics[0]["title"]
    else:
        combined_title = " & ".join([t["title"] for t in selected_topics[:3]])
        if len(selected_topics) > 3:
            combined_title += f" (+{len(selected_topics)-3} konu)"

    # Metin içeriklerini topla
    content_chunks = []
    if selected_topics:
        for t in selected_topics:
            s_page = t.get("start_page", 1)
            e_page = t.get("end_page", doc.get("page_count", 1))
            chunk = get_topic_content(doc["filepath"], s_page, e_page, max_chars=15000)
            content_chunks.append(f"### BÖLÜM: {t['title']} (Sayfa {s_page}-{e_page})\n{chunk}")
    else:
        # Tüm belgeden ilk 20 sayfayı al
        content_chunks.append(get_topic_content(doc["filepath"], 1, min(20, doc["page_count"])))
        
    full_context = "\n\n".join(content_chunks)
    
    # API Anahtarını kontrol et (istekten, veritabanından veya env'den)
    api_key = get_effective_api_key(req.api_key)
    model_name = get_effective_model_name(req.model_name)
    
    quiz_data = None
    question_type = req.question_type or "mcq"
    language = req.language or "tr"
    
    if api_key and len(api_key.strip()) > 10:
        try:
            prompt = generate_quiz_prompt(
                topic_title=combined_title,
                context_text=full_context,
                question_count=req.question_count,
                difficulty=req.difficulty,
                question_style=req.question_style,
                question_type=question_type,
                language=language
            )
            quiz_data = await call_gemini_api(prompt, api_key.strip(), model_name=model_name)
        except Exception as e:
            # API hatası olursa kullanıcıya açıkça bildir veya yedek soruya geç
            raise HTTPException(status_code=500, detail=f"Soru üretimi sırasında yapay zeka hatası: {str(e)}")
    else:
        # API anahtarı yoksa test amaçlı zengin şablon sorular üret
        quiz_data = generate_mock_quiz(
            topic_title=combined_title,
            question_count=req.question_count,
            difficulty=req.difficulty,
            question_type=question_type,
            language=language
        )

    # Üretilen testi veritabanına kaydet
    quiz_id = str(uuid.uuid4())
    questions = quiz_data.get("questions", [])
    
    # Standartlaştırma
    for idx, q in enumerate(questions):
        if "id" not in q:
            q["id"] = idx + 1
            
    saved = save_quiz(
        quiz_id=quiz_id,
        title=combined_title,
        doc_id=req.doc_id,
        topics=[t["title"] for t in selected_topics] if selected_topics else [combined_title],
        difficulty=req.difficulty,
        question_count=len(questions),
        questions=questions
    )
    
    return {
        "success": True,
        "quiz": saved,
        "is_mock": quiz_data.get("is_mock", False)
    }

@app.get("/api/quizzes")
def list_quizzes():
    return {"quizzes": get_quizzes()}

@app.get("/api/quizzes/{quiz_id}")
def get_quiz(quiz_id: str):
    quiz = get_quiz_by_id(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Test bulunamadı.")
    return quiz

@app.delete("/api/quizzes/{quiz_id}")
def remove_quiz(quiz_id: str):
    delete_quiz(quiz_id)
    return {"success": True, "message": "Test silindi."}

@app.post("/api/submit-quiz")
def submit_quiz(req: SubmitQuizRequest):
    """
    Sınav sonucunu hesaplar ve kaydeder.
    """
    quiz = get_quiz_by_id(req.quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Test bulunamadı.")
    
    total = len(quiz["questions"])
    correct_count = 0
    detailed_answers = []
    
    user_answers_map = {a["question_id"]: a.get("selected_option") for a in req.answers}
    
    for q in quiz["questions"]:
        q_id = q["id"]
        correct_opt = q["correct_answer_index"]
        user_opt = user_answers_map.get(q_id, None)
        is_correct = (user_opt == correct_opt)
        
        if is_correct:
            correct_count += 1
            
        detailed_answers.append({
            "question_id": q_id,
            "question_text": q["question"],
            "options": q["options"],
            "selected_option": user_opt,
            "correct_option": correct_opt,
            "is_correct": is_correct,
            "explanation": q.get("explanation", ""),
            "key_point": q.get("key_point", "")
        })
        
    percentage = round((correct_count / total * 100), 1) if total > 0 else 0
    
    result = save_quiz_result(
        quiz_id=req.quiz_id,
        quiz_title=quiz["title"],
        score=correct_count,
        total_questions=total,
        percentage=percentage,
        time_spent=req.time_spent_seconds,
        answers=detailed_answers
    )
    
    return {
        "success": True,
        "result": result
    }

@app.get("/api/results")
def list_results():
    return {"results": get_quiz_results()}

@app.get("/api/settings")
def get_app_settings():
    raw_key = get_effective_api_key()
    masked_key = ""
    if raw_key and len(raw_key) > 8:
        masked_key = raw_key[:4] + "..." + raw_key[-4:]
    elif raw_key:
        masked_key = "********"
        
    stored_model = get_effective_model_name()
        
    return {
        "has_api_key": bool(raw_key),
        "masked_api_key": masked_key,
        "model_name": stored_model,
        "default_difficulty": get_setting("default_difficulty", "Orta"),
        "default_question_count": int(get_setting("default_question_count", 5))
    }

@app.post("/api/settings")
def save_app_settings(req: SettingsRequest):
    if req.gemini_api_key is not None and req.gemini_api_key.strip():
        set_setting("gemini_api_key", req.gemini_api_key.strip())
    if req.model_name:
        set_setting("model_name", req.model_name)
    if req.default_difficulty:
        set_setting("default_difficulty", req.default_difficulty)
    if req.default_question_count:
        set_setting("default_question_count", str(req.default_question_count))
        
    return {"success": True, "message": "Ayarlar başarıyla kaydedildi."}

@app.get("/api/export-pdf/{quiz_id}")
def export_quiz_pdf(quiz_id: str, include_answers: bool = Query(True)):
    """
    Testi yazdırılabilir standart bir PDF kitapçığı olarak derler.
    """
    quiz = get_quiz_by_id(quiz_id)
    if not quiz:
        raise HTTPException(status_code=404, detail="Test bulunamadı.")
        
    try:
        from reportlab.lib.pagesizes import A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib import colors
        
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=36,
            leftMargin=36,
            topMargin=36,
            bottomMargin=36
        )
        
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'TitleStyle',
            parent=styles['Heading1'],
            fontSize=16,
            leading=20,
            textColor=colors.HexColor('#1e293b'),
            alignment=1
        )
        meta_style = ParagraphStyle(
            'MetaStyle',
            parent=styles['Normal'],
            fontSize=10,
            leading=13,
            textColor=colors.HexColor('#64748b'),
            alignment=1
        )
        q_style = ParagraphStyle(
            'QuestionStyle',
            parent=styles['Normal'],
            fontSize=10,
            leading=14,
            textColor=colors.HexColor('#0f172a'),
            spaceAfter=6
        )
        opt_style = ParagraphStyle(
            'OptionStyle',
            parent=styles['Normal'],
            fontSize=9,
            leading=13,
            textColor=colors.HexColor('#334155'),
            leftIndent=15,
            spaceAfter=3
        )
        exp_style = ParagraphStyle(
            'ExpStyle',
            parent=styles['Normal'],
            fontSize=9,
            leading=12,
            textColor=colors.HexColor('#047857'),
            leftIndent=10,
            spaceBefore=4,
            spaceAfter=8
        )
        
        elements = []
        
        # Başlık ve Meta Bilgiler
        elements.append(Paragraph(f"<b>{quiz['title']}</b> - Sınav Kitapçığı", title_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(f"Zorluk: {quiz['difficulty']} | Soru Sayısı: {len(quiz['questions'])} | Tarih: {quiz['created_at'][:10]}", meta_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor('#3b82f6'), spaceAfter=15))
        
        # Sorular
        for idx, q in enumerate(quiz['questions']):
            q_num = idx + 1
            elements.append(Paragraph(f"<b>Soru {q_num}:</b> {q['question']}", q_style))
            for opt in q['options']:
                elements.append(Paragraph(opt, opt_style))
            elements.append(Spacer(1, 8))
            
        # Cevap Anahtarı ve Açıklamalar
        if include_answers:
            elements.append(Spacer(1, 15))
            elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor('#94a3b8'), spaceAfter=10))
            elements.append(Paragraph("<b>CEVAP ANAHTARI VE AYRINTILI ÇÖZÜMLER</b>", title_style))
            elements.append(Spacer(1, 10))
            
            for idx, q in enumerate(quiz['questions']):
                q_num = idx + 1
                opt_chars = ["A", "B", "C", "D", "E"]
                c_idx = q['correct_answer_index']
                c_letter = opt_chars[c_idx] if c_idx < len(opt_chars) else "?"
                elements.append(Paragraph(f"<b>Soru {q_num} Doğru Cevap: {c_letter}</b>", q_style))
                elements.append(Paragraph(f"<i>Açıklama:</i> {q.get('explanation', '')}", exp_style))
                if q.get('key_point'):
                    elements.append(Paragraph(f"<b>Kilit Klinik Not:</b> {q['key_point']}", exp_style))
                elements.append(Spacer(1, 4))
                
        doc.build(elements)
        buffer.seek(0)
        
        filename = f"Sinav_{quiz['id'][:8]}.pdf"
        return StreamingResponse(
            buffer,
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF oluşturulamadı: {str(e)}")

# ----------------- CHAT & SOHBET ASİSTANI ENDPOINTLERİ -----------------

@app.post("/api/chat")
async def chat_endpoint(req: ChatMessageRequest):
    """
    Kullanıcı mesajını alır, PDF bağlamını hazırlar ve Gemini 3.6 ile yanıt üretir.
    """
    user_msg = req.message.strip()
    if not user_msg:
        raise HTTPException(status_code=400, detail="Mesaj boş olamaz.")
        
    session_id = req.session_id or "default"
    
    # 1. Kullanıcı mesajını kaydet (varsa görselleri ile birlikte)
    stored_image_data = None
    if req.images and len(req.images) > 0:
        import json
        stored_image_data = json.dumps([img.get("base64") for img in req.images if img.get("base64")])
    elif req.image_base64:
        stored_image_data = req.image_base64

    save_chat_message(
        session_id=session_id,
        role="user",
        content=user_msg,
        doc_id=req.doc_id,
        image_data=stored_image_data
    )
    
    # 2. Önceki sohbet geçmişini çek (son 8 mesaj)
    history = get_chat_history(session_id=session_id, limit=8)
    
    # 3. PDF ve Sınav bağlamını hazırla
    context_text = prepare_chat_context(doc_id=req.doc_id, user_message=user_msg)
    
    # 4. API Anahtarı ve Model belirleme
    api_key = get_effective_api_key()
    model_name = get_effective_model_name()
    
    assistant_response = ""
    if api_key and len(api_key.strip()) > 10:
        try:
            assistant_response = await call_gemini_chat(
                messages=history,
                context_text=context_text,
                api_key=api_key.strip(),
                model_name=model_name,
                image_base64=req.image_base64,
                image_mime_type=req.image_mime_type,
                images=req.images
            )
        except Exception as e:
            assistant_response = f"⚠️ Görsel ve sohbet analizi sırasında bir sorun oluştu: {str(e)}"
    else:
        if req.image_base64:
            assistant_response = """### 📷 Tıbbi Görsel & Fotoğraf Analizi

**1. Tespit Edilen Bulgular:**
- Yüklenen görsel başarıyla alındı ve taranıyor.
- *Görseldeki odak noktaları:* Anatomik yapılar, elektrokardiyografik derivasyon traseleri ve laboratuvar parametre sınırları tespit edildi.

**2. Klinik Değerlendirme & Olası Tanılar:**
- Bulgular fizyolojik ve klinik normlarla karşılaştırıldığında olası ayırıcı tanılar ve ilişkili klinik patolojiler sıralanmaktadır.

**3. Önerilen Yaklaşım:**
- Akut semptomatoloji varlığında acil stabilizasyon ve teyit edici biyokimyasal/radyolojik görüntüleme önerilir.

*(Not: Canlı derin yapay zeka yorumu için Gemini API anahtarınızın aktif olduğundan emin olun.)*
"""
        else:
            assistant_response = generate_mock_chat_response(user_msg, doc_id=req.doc_id)
        
    # 5. Asistan yanıtını kaydet
    saved_assistant_msg = save_chat_message(session_id=session_id, role="model", content=assistant_response, doc_id=req.doc_id)
    
    return {
        "success": True,
        "message": saved_assistant_msg,
        "session_id": session_id
    }

@app.get("/api/chat/history")
def get_chat_history_endpoint(session_id: str = Query("default"), limit: int = Query(50)):
    return {"messages": get_chat_history(session_id=session_id, limit=limit)}

@app.delete("/api/chat/history")
def clear_chat_history_endpoint(session_id: str = Query("default")):
    clear_chat_history(session_id=session_id)
    return {"success": True, "message": "Sohbet geçmişi temizlendi."}

# ----------------- ANAMNEZ & KLASİK SORU ÇÖZÜCÜ ENDPOINTLERİ -----------------

@app.post("/api/solve-anamnesis")
async def solve_anamnesis_endpoint(req: AnamnesisSolveRequest):
    """
    Anamnez fotoğrafını veya metnini TR/DE dillerinde çözer ve gerekçelendirir.
    """
    api_key = get_effective_api_key()
    model_name = get_effective_model_name()
    language = req.language or "tr"
    
    extra_context = ""
    if req.doc_id and req.doc_id != "all":
        doc = get_document_by_id(req.doc_id)
        if doc:
            extra_context = get_topic_content(doc["filepath"], 1, min(10, doc["page_count"]), max_chars=8000)
            
    full_text = req.anamnesis_text or ""
    if extra_context:
        full_text = f"DERS NOTU / KILAVUZ BAĞLAMI:\n{extra_context}\n\nHASTA BİLGİSİ / ANAMNEZ / SORU:\n{full_text}"

    if api_key and len(api_key.strip()) > 10:
        try:
            result = await solve_anamnesis_case(
                anamnesis_text=full_text,
                image_base64=req.image_base64,
                image_mime_type=req.image_mime_type or "image/jpeg",
                images=req.images,
                language=language,
                api_key=api_key.strip(),
                model_name=model_name
            )
            return {"success": True, "analysis": result, "is_mock": False}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Anamnez çözümü sırasında hata oluştu: {str(e)}")
    else:
        mock_res = generate_mock_anamnesis_solution(language=language)
        return {"success": True, "analysis": mock_res, "is_mock": True}

@app.post("/api/translate-analysis")
async def translate_analysis_endpoint(req: TranslateAnalysisRequest):
    """
    Mevcut vaka raporunu tek tıkla diğer dile (Almanca <-> Türkçe) çevirir.
    """
    api_key = get_effective_api_key()
    model_name = get_effective_model_name()
    if api_key and len(api_key.strip()) > 10:
        try:
            translated = await translate_anamnesis_analysis(
                analysis_data=req.analysis,
                target_language=req.target_language,
                api_key=api_key.strip(),
                model_name=model_name
            )
            return {"success": True, "analysis": translated}
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Çeviri hatası: {str(e)}")
    else:
        return {"success": True, "analysis": generate_mock_anamnesis_solution(language=req.target_language)}

# ----------------- 12 SORULUK VAKA OLUŞTURUCU & SINAV SİMÜLATÖRÜ -----------------

@app.post("/api/generate-case-exam")
async def generate_case_exam_endpoint(req: GenerateCaseExamRequest):
    """
    Yüklü PDF'lerden veya Web/Tıp Literatüründen 12 soruluk klinik vaka senaryosu üretir.
    """
    api_key = get_effective_api_key()
    model_name = get_effective_model_name()
    language = req.language or "tr"
    topic = req.topic or "Klinik Acil Vaka"
    source_type = req.source_type or "pdf"
    
    context_text = ""
    if source_type == "pdf" and req.doc_id and req.doc_id != "all":
        doc = get_document_by_id(req.doc_id)
        if doc:
            if req.topic_id:
                topic_obj = next((t for t in doc.get("topics", []) if t.get("id") == req.topic_id), None)
                if topic_obj:
                    context_text = get_topic_content(doc["filepath"], topic_obj["start_page"], topic_obj["end_page"], max_chars=12000)
                    topic = f"{doc['filename']} - {topic_obj['title']}"
            if not context_text:
                context_text = get_topic_content(doc["filepath"], 1, min(15, doc["page_count"]), max_chars=12000)
                if not req.topic:
                    topic = f"{doc['filename']} Genel Vaka"
            
    if api_key and len(api_key.strip()) > 10:
        try:
            case_data = await generate_12_question_case(
                topic=topic,
                context_text=context_text,
                source_type=source_type,
                language=language,
                urgency_type=req.urgency_type or "auto",
                api_key=api_key.strip(),
                model_name=model_name
            )
            return {"success": True, "case": case_data, "is_mock": False}
        except Exception as e:
            err_msg = str(e)
            if "429" in err_msg or "RESOURCE_EXHAUSTED" in err_msg or "quota" in err_msg.lower():
                mock_data = generate_mock_12_case(topic=topic, language=language)
                mock_data["title"] = f"{topic} (Kota Sınırı Nedeniyle Simülatör Şablonu)"
                return {
                    "success": True,
                    "case": mock_data,
                    "is_mock": True,
                    "warning": "Gemini API ücretsiz kota sınırına (Rate Limit) ulaşıldı. Kesinti olmaması için kaliteli simülasyon vaka şablonu yüklendi."
                }
            raise HTTPException(status_code=500, detail=f"Vaka üretimi sırasında hata: {err_msg}")
    else:
        mock_data = generate_mock_12_case(topic=topic, language=language)
        return {"success": True, "case": mock_data, "is_mock": True}

@app.post("/api/evaluate-case-exam")
async def evaluate_case_exam_endpoint(req: EvaluateCaseExamRequest):
    """
    Kullanıcının 12 soruya verdiği yazılı veya el yazısı fotoğraflarındaki yanıtları
    Alman DGAI/ATA standartlarında puanlar, geçmiş vaka performansıyla kıyaslayarak sık tekrarlanan hataları ve gelişimi raporlar.
    """
    api_key = get_effective_api_key()
    model_name = get_effective_model_name()
    language = req.language or "tr"
    
    # Öğrencinin geçmiş 10 vaka performansını yükle
    past_history = get_case_evaluations_history(limit=10)
    
    if api_key and len(api_key.strip()) > 10:
        try:
            eval_data = await evaluate_user_case_answers(
                case_data=req.case_data,
                user_answers=req.user_answers,
                images=req.images,
                past_history=past_history,
                language=language,
                api_key=api_key.strip(),
                model_name=model_name
            )
            
            # Veritabanına kaydet (Öğrenci Gelişim Hafızası)
            eval_id = str(uuid.uuid4())
            case_id = req.case_data.get("case_id", str(uuid.uuid4()))
            case_title = req.case_data.get("title") or req.case_data.get("german", {}).get("title") or req.case_data.get("turkish", {}).get("title") or "Klinik Vaka Sınavı"
            
            save_case_evaluation(
                eval_id=eval_id,
                case_id=case_id,
                case_title=case_title,
                source_type=req.case_data.get("source_type", "web"),
                language=language,
                score=eval_data.get("total_score", 0),
                max_score=eval_data.get("max_score", 120),
                percentage=eval_data.get("percentage", 0),
                overall_feedback=eval_data.get("overall_feedback", ""),
                evaluations=eval_data.get("evaluations", []),
                strengths=eval_data.get("strengths", []),
                weaknesses=eval_data.get("weaknesses", []),
                recurring_mistakes=eval_data.get("recurring_mistakes", [])
            )
            
            return {"success": True, "evaluation": eval_data, "eval_id": eval_id, "is_mock": False}
        except Exception as e:
            err_msg = str(e)
            if "429" in err_msg or "quota" in err_msg.lower():
                raise HTTPException(
                    status_code=429,
                    detail="Google Gemini API kullanım kotanız (Free Tier İstek Limiti) anlık olarak doldu. Lütfen 25-30 saniye bekleyip tekrar 'Çözümü Gönder' butonuna basınız."
                )
            raise HTTPException(status_code=500, detail=f"Değerlendirme sırasında hata: {err_msg}")

    # Çevrimdışı / Mock Değerlendirme (API Anahtarı girilmediğinde)
    is_de = language.lower() == "de"
    active_case = req.case_data.get("german", req.case_data) if is_de else req.case_data.get("turkish", req.case_data)
    if not active_case.get("questions"):
        active_case = req.case_data.get("german") or req.case_data.get("turkish") or req.case_data

    total = 0
    evals = []
    user_ans_dict = req.user_answers or {}
    for q in active_case.get("questions", []):
        qid = str(q["id"])
        ans = user_ans_dict.get(qid, "").strip()
        
        if req.images:
            # Fotoğraf yüklenmiş ama API anahtarı yoksa 0 ver ve uyar
            score = 0
            u_ans_text = "(Für die Bildanalyse ist ein gültiger Gemini-API-Schlüssel erforderlich)" if is_de else "(Fotoğraf analizi için Ayarlar menüsünden geçerli bir Gemini API Anahtarı girilmelidir)"
            fb_text = "Im Offline-Modus ist kein medizinisches OCR möglich. Bitte API-Schlüssel eintragen." if is_de else "Çevrimdışı modda görsel medikal OCR yapılamaz. Lütfen API anahtarı ekleyiniz."
            missing_text = "Keine Bildanalyse im Offline-Modus." if is_de else "Görsel analizi yapılamadı."
        elif len(ans) > 25:
            score = 8
            u_ans_text = ans
            fb_text = "Ihre klinische Herangehensweise entspricht den DGAI-Leitlinien." if is_de else "Klinik yaklaşımınız incelendi. Temel basamaklar DGAI standartlarında doğru yönde."
            missing_text = "Medikamentendosierungen und DGAI-Abläufe noch präzisieren." if is_de else "İlaç dozları ve acil stabilizasyon sıralaması teyit edilmelidir."
        elif len(ans) > 5:
            score = 3
            u_ans_text = ans
            fb_text = "Antwort ist zu kurz und enthält wenig klinische Details." if is_de else "Yanıt çok kısa ve klinik detay içermiyor."
            missing_text = "Mehr pharmakologische Details und Leitlinienprotokolle erforderlich." if is_de else "Daha fazla klinik detay ve kılavuz protokolü eklenmelidir."
        else:
            score = 0
            u_ans_text = ans or ("(Vom Prüfling nicht beantwortet)" if is_de else "(Kullanıcı bu soruyu boş bıraktı)")
            fb_text = "Keine gültige Antwort gegeben." if is_de else "Bu soruya geçerli bir yanıt verilmedi."
            missing_text = "Frage wurde nicht beantwortet." if is_de else "Soru boş bırakıldı."

        total += score
        evals.append({
            "question_id": q["id"],
            "category": q.get("category", ""),
            "question": q["question"],
            "user_answer": u_ans_text,
            "ideal_answer": q["ideal_answer"],
            "score": score,
            "max_points": 10,
            "is_satisfactory": score >= 7,
            "feedback": fb_text,
            "missing_points": missing_text
        })
    
    overall_fb = "Die Fallbearbeitung wurde ausgewertet. Vergleichen Sie Ihre Antworten mit den DGAI-Musterlösungen." if is_de else "Vaka çözümünüz değerlendirildi. İdeal hekim model cevapları ile karşılaştırabilirsiniz."
    if req.images:
        overall_fb = "⚠️ Für die automatische Handschrifterkennung (OCR) ist ein gültiger Gemini-API-Schlüssel in den Einstellungen erforderlich." if is_de else "⚠️ Fotoğraf/El yazısı medikal OCR analizi için Ayarlar menüsünden geçerli bir Gemini API Anahtarı girilmelidir."

    mock_eval = {
        "total_score": total,
        "max_score": 120,
        "percentage": int((total / 120) * 100),
        "overall_feedback": overall_fb,
        "progress_analysis": "Regelmäßige Bearbeitung von Fällen steigert die Prüfungskompetenz deutlich." if is_de else "Öğrenci gelişim takibi ve görsel analizi için API anahtarı ile değerlendirme yapılması önerilir.",
        "recurring_mistakes": [],
        "strengths": [],
        "weaknesses": ["API-Schlüssel für Fotoanalyse hinterlegen" if is_de else "Fotoğraf analizi için Gemini API anahtarı tanımlanmalıdır"] if req.images else (["Antworten vervollständigen" if is_de else "Boş bırakılan veya yetersiz yanıtlar tamamlanmalıdır"]),
        "evaluations": evals
    }
    
    # Mock sonucu da kaydet
    eval_id = str(uuid.uuid4())
    case_title = req.case_data.get("title") or "Klinik Vaka Sınavı"
    save_case_evaluation(
        eval_id=eval_id,
        case_id=req.case_data.get("case_id", str(uuid.uuid4())),
        case_title=case_title,
        source_type=req.case_data.get("source_type", "web"),
        language=language,
        score=total,
        max_score=120,
        percentage=int((total / 120) * 100),
        overall_feedback=mock_eval["overall_feedback"],
        evaluations=evals,
        strengths=mock_eval["strengths"],
        weaknesses=mock_eval["weaknesses"],
        recurring_mistakes=mock_eval["recurring_mistakes"]
    )
    
    return {
        "success": True,
        "evaluation": mock_eval,
        "eval_id": eval_id,
        "is_mock": True
    }

@app.get("/api/case-history")
def get_case_history_endpoint(limit: int = 25):
    """Kullanıcının geçmiş vaka sınav sonuçlarını getirir."""
    history = get_case_evaluations_history(limit=limit)
    return {"success": True, "history": history}

@app.get("/api/case-analytics")
def get_case_analytics_endpoint():
    """Öğrencinin uzun vadeli gelişim analizini, trendini ve sık yapılan hatalarını getirir."""
    analytics = get_student_learning_analytics()
    return {"success": True, "analytics": analytics}

@app.delete("/api/case-history/{eval_id}")
def delete_case_history_endpoint(eval_id: str):
    """Belirli bir vaka sınav sonucunu siler."""
    delete_case_evaluation(eval_id)
    return {"success": True, "message": "Kayıt silindi."}

@app.delete("/api/case-history")
def clear_case_history_endpoint():
    """Tüm vaka geçmişini temizler."""
    clear_case_evaluations_history()
    return {"success": True, "message": "Tüm vaka geçmişi temizlendi."}

@app.post("/api/export-case-pdf")
async def export_case_pdf_endpoint(req: dict = Body(...)):
    """
    12 soruluk iki dilli klinik vaka için 4 sayfalık A4 PDF oluşturup doğrudan indirilebilir dosya döner.
    """
    from case_pdf_generator import generate_4page_booklet_pdf
    from fastapi.responses import Response
    
    try:
        case_data = req.get("case_data", req)
        pdf_bytes = generate_4page_booklet_pdf(case_data)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": "attachment; filename=ATA_Kenntnispruefung_4Seiten_Fall.pdf"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF oluşturma hatası: {str(e)}")

FRONTEND_DIST = Path(__file__).resolve().parent.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=str(FRONTEND_DIST / "assets")), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="Not Found")
        target_file = FRONTEND_DIST / full_path
        if target_file.is_file():
            resp = FileResponse(target_file)
            if target_file.name in ["sw.js", "manifest.json", "index.html"]:
                resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            return resp
        resp = FileResponse(FRONTEND_DIST / "index.html")
        resp.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        return resp



