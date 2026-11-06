import sqlite3
import json
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
DB_PATH = DATA_DIR / "app_data.db"

def get_db_connection():
    os.makedirs(DATA_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # PDF Belgeleri tablosu
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        page_count INTEGER NOT NULL,
        uploaded_at TEXT NOT NULL,
        topics_json TEXT NOT NULL
    )
    """)
    
    # Üretilen Testler tablosu
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quizzes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        doc_id TEXT,
        topics_json TEXT NOT NULL,
        difficulty TEXT NOT NULL,
        question_count INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        questions_json TEXT NOT NULL
    )
    """)
    
    # Çözülen Test Sonuçları / Geçmiş tablosu
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS quiz_results (
        id TEXT PRIMARY KEY,
        quiz_id TEXT NOT NULL,
        quiz_title TEXT NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        percentage REAL NOT NULL,
        time_spent_seconds INTEGER NOT NULL,
        completed_at TEXT NOT NULL,
        answers_json TEXT NOT NULL,
        FOREIGN KEY(quiz_id) REFERENCES quizzes(id)
    )
    """)
    
    # Uygulama Ayarları tablosu (API Anahtarı, Tercihler vb.)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
    )
    """)
    
    # Sohbet Geçmişi tablosu
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        doc_id TEXT,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        image_data TEXT,
        created_at TEXT NOT NULL
    )
    """)
    
    # Klinik Vaka Sınav & Değerlendirme Geçmişi (Öğrenci Gelişim Hafızası)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS case_evaluations (
        id TEXT PRIMARY KEY,
        case_id TEXT,
        case_title TEXT NOT NULL,
        source_type TEXT NOT NULL,
        language TEXT NOT NULL,
        score INTEGER NOT NULL,
        max_score INTEGER NOT NULL,
        percentage REAL NOT NULL,
        overall_feedback TEXT,
        evaluations_json TEXT NOT NULL,
        strengths_json TEXT,
        weaknesses_json TEXT,
        recurring_mistakes_json TEXT,
        completed_at TEXT NOT NULL
    )
    """)
    
    conn.commit()
    conn.close()

def save_document(doc_id: str, filename: str, filepath: str, file_size: int, page_count: int, topics: List[Dict]) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
    INSERT OR REPLACE INTO documents (id, filename, filepath, file_size, page_count, uploaded_at, topics_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (doc_id, filename, filepath, file_size, page_count, now, json.dumps(topics, ensure_ascii=False)))
    conn.commit()
    conn.close()
    return {
        "id": doc_id,
        "filename": filename,
        "file_size": file_size,
        "page_count": page_count,
        "uploaded_at": now,
        "topics": topics
    }

def get_documents() -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, filename, filepath, file_size, page_count, uploaded_at, topics_json FROM documents ORDER BY uploaded_at DESC")
    rows = cursor.fetchall()
    docs = []
    for r in rows:
        docs.append({
            "id": r["id"],
            "filename": r["filename"],
            "filepath": r["filepath"],
            "file_size": r["file_size"],
            "page_count": r["page_count"],
            "uploaded_at": r["uploaded_at"],
            "topics": json.loads(r["topics_json"])
        })
    conn.close()
    return docs

def get_document_by_id(doc_id: str) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, filename, filepath, file_size, page_count, uploaded_at, topics_json FROM documents WHERE id = ?", (doc_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        return None
    return {
        "id": r["id"],
        "filename": r["filename"],
        "filepath": r["filepath"],
        "file_size": r["file_size"],
        "page_count": r["page_count"],
        "uploaded_at": r["uploaded_at"],
        "topics": json.loads(r["topics_json"])
    }

def delete_document(doc_id: str):
    doc = get_document_by_id(doc_id)
    if doc and os.path.exists(doc["filepath"]):
        try:
            os.remove(doc["filepath"])
        except Exception:
            pass
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
    conn.commit()
    conn.close()

def save_quiz(quiz_id: str, title: str, doc_id: Optional[str], topics: List[str], difficulty: str, question_count: int, questions: List[Dict]) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
    INSERT OR REPLACE INTO quizzes (id, title, doc_id, topics_json, difficulty, question_count, created_at, questions_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (quiz_id, title, doc_id, json.dumps(topics, ensure_ascii=False), difficulty, question_count, now, json.dumps(questions, ensure_ascii=False)))
    conn.commit()
    conn.close()
    return {
        "id": quiz_id,
        "title": title,
        "doc_id": doc_id,
        "topics": topics,
        "difficulty": difficulty,
        "question_count": question_count,
        "created_at": now,
        "questions": questions
    }

def get_quizzes() -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, doc_id, topics_json, difficulty, question_count, created_at, questions_json FROM quizzes ORDER BY created_at DESC")
    rows = cursor.fetchall()
    quizzes = []
    for r in rows:
        quizzes.append({
            "id": r["id"],
            "title": r["title"],
            "doc_id": r["doc_id"],
            "topics": json.loads(r["topics_json"]),
            "difficulty": r["difficulty"],
            "question_count": r["question_count"],
            "created_at": r["created_at"],
            "questions": json.loads(r["questions_json"])
        })
    conn.close()
    return quizzes

def get_quiz_by_id(quiz_id: str) -> Optional[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, title, doc_id, topics_json, difficulty, question_count, created_at, questions_json FROM quizzes WHERE id = ?", (quiz_id,))
    r = cursor.fetchone()
    conn.close()
    if not r:
        return None
    return {
        "id": r["id"],
        "title": r["title"],
        "doc_id": r["doc_id"],
        "topics": json.loads(r["topics_json"]),
        "difficulty": r["difficulty"],
        "question_count": r["question_count"],
        "created_at": r["created_at"],
        "questions": json.loads(r["questions_json"])
    }

def delete_quiz(quiz_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM quizzes WHERE id = ?", (quiz_id,))
    cursor.execute("DELETE FROM quiz_results WHERE quiz_id = ?", (quiz_id,))
    conn.commit()
    conn.close()

def save_quiz_result(quiz_id: str, quiz_title: str, score: int, total_questions: int, percentage: float, time_spent: int, answers: List[Dict]) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    result_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO quiz_results (id, quiz_id, quiz_title, score, total_questions, percentage, time_spent_seconds, completed_at, answers_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (result_id, quiz_id, quiz_title, score, total_questions, percentage, time_spent, now, json.dumps(answers, ensure_ascii=False)))
    conn.commit()
    conn.close()
    return {
        "id": result_id,
        "quiz_id": quiz_id,
        "quiz_title": quiz_title,
        "score": score,
        "total_questions": total_questions,
        "percentage": percentage,
        "time_spent_seconds": time_spent,
        "completed_at": now,
        "answers": answers
    }

def get_quiz_results() -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, quiz_id, quiz_title, score, total_questions, percentage, time_spent_seconds, completed_at, answers_json FROM quiz_results ORDER BY completed_at DESC")
    rows = cursor.fetchall()
    results = []
    for r in rows:
        results.append({
            "id": r["id"],
            "quiz_id": r["quiz_id"],
            "quiz_title": r["quiz_title"],
            "score": r["score"],
            "total_questions": r["total_questions"],
            "percentage": r["percentage"],
            "time_spent_seconds": r["time_spent_seconds"],
            "completed_at": r["completed_at"],
            "answers": json.loads(r["answers_json"])
        })
    conn.close()
    return results

def get_setting(key: str, default: Any = None) -> Any:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM settings WHERE key = ?", (key,))
    r = cursor.fetchone()
    conn.close()
    if r:
        return r["value"]
    return default

def set_setting(key: str, value: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", (key, value))
    conn.commit()
    conn.close()

def save_chat_message(session_id: str, role: str, content: str, doc_id: Optional[str] = None, image_data: Optional[str] = None) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    msg_id = str(uuid.uuid4())
    now = datetime.now().isoformat()
    try:
        cursor.execute("""
        INSERT INTO chat_messages (id, session_id, doc_id, role, content, image_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (msg_id, session_id, doc_id, role, content, image_data, now))
    except sqlite3.OperationalError:
        # Eğer image_data kolonu henüz yoksa ekle
        cursor.execute("ALTER TABLE chat_messages ADD COLUMN image_data TEXT")
        cursor.execute("""
        INSERT INTO chat_messages (id, session_id, doc_id, role, content, image_data, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (msg_id, session_id, doc_id, role, content, image_data, now))
        
    conn.commit()
    conn.close()
    return {
        "id": msg_id,
        "session_id": session_id,
        "doc_id": doc_id,
        "role": role,
        "content": content,
        "image_data": image_data,
        "created_at": now
    }

def get_chat_history(session_id: str = "default", limit: int = 50) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
        SELECT id, session_id, doc_id, role, content, image_data, created_at
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY created_at ASC
        LIMIT ?
        """, (session_id, limit))
    except sqlite3.OperationalError:
        cursor.execute("""
        SELECT id, session_id, doc_id, role, content, created_at
        FROM chat_messages
        WHERE session_id = ?
        ORDER BY created_at ASC
        LIMIT ?
        """, (session_id, limit))
        
    rows = cursor.fetchall()
    history = [dict(r) for r in rows]
    conn.close()
    return history

def clear_chat_history(session_id: str = "default"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
    conn.commit()
    conn.close()

# ----------------- KLİNİK VAKA GEÇMİŞİ & ÖĞRENCİ GELİŞİM HAFIZASI -----------------

def save_case_evaluation(
    eval_id: str,
    case_id: str,
    case_title: str,
    source_type: str,
    language: str,
    score: int,
    max_score: int,
    percentage: float,
    overall_feedback: str,
    evaluations: List[Dict],
    strengths: Optional[List[str]] = None,
    weaknesses: Optional[List[str]] = None,
    recurring_mistakes: Optional[List[str]] = None
) -> Dict:
    conn = get_db_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat()
    cursor.execute("""
    INSERT OR REPLACE INTO case_evaluations (
        id, case_id, case_title, source_type, language, score, max_score, percentage,
        overall_feedback, evaluations_json, strengths_json, weaknesses_json, recurring_mistakes_json, completed_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        eval_id,
        case_id or str(uuid.uuid4()),
        case_title,
        source_type or "web",
        language or "tr",
        score,
        max_score,
        percentage,
        overall_feedback,
        json.dumps(evaluations, ensure_ascii=False),
        json.dumps(strengths or [], ensure_ascii=False),
        json.dumps(weaknesses or [], ensure_ascii=False),
        json.dumps(recurring_mistakes or [], ensure_ascii=False),
        now
    ))
    conn.commit()
    conn.close()
    return {
        "id": eval_id,
        "case_id": case_id,
        "case_title": case_title,
        "score": score,
        "max_score": max_score,
        "percentage": percentage,
        "completed_at": now
    }

def get_case_evaluations_history(limit: int = 25) -> List[Dict]:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
    SELECT id, case_id, case_title, source_type, language, score, max_score, percentage,
           overall_feedback, evaluations_json, strengths_json, weaknesses_json, recurring_mistakes_json, completed_at
    FROM case_evaluations
    ORDER BY completed_at DESC
    LIMIT ?
    """, (limit,))
    rows = cursor.fetchall()
    history = []
    for r in rows:
        d = dict(r)
        d["evaluations"] = json.loads(d["evaluations_json"]) if d["evaluations_json"] else []
        d["strengths"] = json.loads(d["strengths_json"]) if d["strengths_json"] else []
        d["weaknesses"] = json.loads(d["weaknesses_json"]) if d["weaknesses_json"] else []
        d["recurring_mistakes"] = json.loads(d["recurring_mistakes_json"]) if d["recurring_mistakes_json"] else []
        history.append(d)
    conn.close()
    return history

def get_student_learning_analytics() -> Dict[str, Any]:
    """
    Öğrencinin geçmiş tüm vaka çözümlerini analiz ederek gelişim trendini ve sık yapılan hataları hesaplar.
    """
    history = get_case_evaluations_history(limit=50)
    if not history:
        return {
            "total_cases_solved": 0,
            "average_score": 0,
            "average_percentage": 0,
            "recent_trend": "neutral",
            "top_recurring_mistakes": [],
            "recent_scores": [],
            "overall_summary": "Henüz çözülmüş bir vaka bulunmuyor. İlk vakanızı çözerek gelişiminizi takip etmeye başlayabilirsiniz."
        }
    
    total_cases = len(history)
    total_score = sum(h["score"] for h in history)
    total_max = sum(h["max_score"] for h in history)
    avg_percentage = round((total_score / total_max * 100), 1) if total_max > 0 else 0
    
    # Skor geçmişi (Zaman sırasına göre)
    sorted_history = sorted(history, key=lambda x: x["completed_at"])
    recent_scores = [
        {
            "id": h["id"],
            "title": h["case_title"],
            "score": h["score"],
            "max_score": h["max_score"],
            "percentage": h["percentage"],
            "date": h["completed_at"][:10]
        }
        for h in sorted_history[-10:]
    ]
    
    # Trend hesaplama (Son 3 vs İlk 3)
    recent_trend = "neutral"
    if len(recent_scores) >= 3:
        first_half = sum(s["percentage"] for s in recent_scores[:len(recent_scores)//2]) / (len(recent_scores)//2)
        second_half = sum(s["percentage"] for s in recent_scores[len(recent_scores)//2:]) / (len(recent_scores) - len(recent_scores)//2)
        if second_half > first_half + 5:
            recent_trend = "improving"
        elif second_half < first_half - 5:
            recent_trend = "declining"
    
    # Sık tekrarlanan hata maddelerini topla
    all_weaknesses = []
    for h in history:
        all_weaknesses.extend(h.get("weaknesses", []))
        all_weaknesses.extend(h.get("recurring_mistakes", []))
        
    return {
        "total_cases_solved": total_cases,
        "average_score": round(total_score / total_cases, 1),
        "average_percentage": avg_percentage,
        "recent_trend": recent_trend,
        "recent_scores": recent_scores,
        "top_recurring_mistakes": all_weaknesses[-6:] if all_weaknesses else [],
        "overall_summary": f"Toplam {total_cases} vaka tamamlandı. Ortalama başarı: %{avg_percentage}."
    }

def delete_case_evaluation(eval_id: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM case_evaluations WHERE id = ?", (eval_id,))
    conn.commit()
    conn.close()

def clear_case_evaluations_history():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM case_evaluations")
    conn.commit()
    conn.close()

# Veritabanını ilk başlatmada hazırla
init_db()

