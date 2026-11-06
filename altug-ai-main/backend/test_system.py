import os
import sys
from pathlib import Path

# Backend modüllerini ekle
sys.path.insert(0, str(Path(__file__).resolve().parent))

from pdf_processor import extract_pdf_structure, get_topic_content
from db import init_db, save_document, get_documents, save_quiz, get_quizzes, save_quiz_result, get_quiz_results
from quiz_generator import generate_mock_quiz

def run_tests():
    print("=" * 60)
    print("       SİSTEM DOĞRULAMA VE ENTEGRASYON TESTLERİ")
    print("=" * 60)
    
    init_db()
    
    # 1. PDF Analizi Testi
    sample_pdf = Path(__file__).resolve().parent.parent / "data" / "uploads" / "ornek_klinik_tip_rehberi.pdf"
    assert sample_pdf.exists(), "Örnek PDF bulunamadı!"
    
    structure = extract_pdf_structure(str(sample_pdf))
    print(f"[OK] PDF Basariyla Okundu: Sayfa Sayisi = {structure['page_count']}")
    print(f"[OK] Cikarilan Konu Basligi Sayisi = {len(structure['topics'])}")
    
    assert len(structure['topics']) > 0, "Konu başlığı çıkarılamadı!"
    for t in structure['topics'][:3]:
        print(f"    - Konu: {t['title']} (Sayfa {t['start_page']}-{t['end_page']})")
        
    # 2. Konu Metin Ayrıştırma Testi
    first_topic = structure['topics'][1]
    content = get_topic_content(str(sample_pdf), first_topic['start_page'], first_topic['end_page'])
    print(f"[OK] Konu Metni Ayristirma: '{first_topic['title']}' icin {len(content)} karakter cekildi.")
    assert len(content) > 50, "Konu içeriği çekilemedi!"
    
    # 3. Veritabanına PDF Kaydetme Testi
    doc_id = "test_doc_1"
    save_document(
        doc_id=doc_id,
        filename="ornek_klinik_tip_rehberi.pdf",
        filepath=str(sample_pdf),
        file_size=sample_pdf.stat().st_size,
        page_count=structure['page_count'],
        topics=structure['topics']
    )
    docs = get_documents()
    print(f"[OK] Veritabani Belge Listeleme: {len(docs)} adet belge kayitli.")
    assert any(d["id"] == doc_id for d in docs), "Belge veritabanına kaydedilemedi!"
    
    # 4. Soru Üretim Testi (Mock & Yapı Kontrolü)
    mock_quiz = generate_mock_quiz(
        topic_title=first_topic['title'],
        question_count=5,
        difficulty="Zor"
    )
    print(f"[OK] Test Uretimi: {len(mock_quiz['questions'])} soru basariyla uretildi.")
    assert len(mock_quiz['questions']) == 5, "İstenen soru sayısı eşleşmiyor!"
    
    # 5. Test Kaydetme ve Çözüm Sonucu Testi
    quiz_id = "test_quiz_1"
    save_quiz(
        quiz_id=quiz_id,
        title=first_topic['title'],
        doc_id=doc_id,
        topics=[first_topic['title']],
        difficulty="Zor",
        question_count=5,
        questions=mock_quiz['questions']
    )
    
    result = save_quiz_result(
        quiz_id=quiz_id,
        quiz_title=first_topic['title'],
        score=4,
        total_questions=5,
        percentage=80.0,
        time_spent=140,
        answers=[{"question_id": 1, "selected_option": 0, "is_correct": True}]
    )
    print(f"[OK] Sinav Sonucu ve Karne Kaydi: Basari %{result['percentage']}, Skor {result['score']}/{result['total_questions']}")
    
    print("\n" + "=" * 60)
    print("  [BASARILI] TUM SISTEM BILESENLERI DOGRULANDI VE HAZIR!")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
