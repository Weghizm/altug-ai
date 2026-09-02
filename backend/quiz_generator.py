import os
import json
import re
import httpx
from typing import List, Dict, Any, Optional

def generate_quiz_prompt(
    topic_title: str,
    context_text: str,
    question_count: int = 5,
    difficulty: str = "Orta",
    question_style: str = "klinik",
    question_type: str = "mcq",
    language: str = "tr"
) -> str:
    """
    LLM için çoktan seçmeli veya klasik açık uçlu soru üretim istemi (TR / DE) hazırlar.
    """
    is_de = language.lower() == "de"
    
    if question_type == "classic":
        if is_de:
            return f"""Du bist ein medizinischer Prüfer für deutsche Staatsexamina, FSP und Kenntnisprüfungen.
Erstelle anhand des folgenden Quelltexts {question_count} offene klassische Fallfragen (Klinische Fallanalysen).

### THEMA:
{topic_title}

### SCHWIERIGKEITSGRAD:
{difficulty}

### QUELLTEXT:
\"\"\"
{context_text}
\"\"\"

### AUSGABEFORMAT:
Antworte AUSSCHLIESSLICH im folgenden reinen JSON-Format:
{{
  "topic": "{topic_title}",
  "difficulty": "{difficulty}",
  "question_type": "classic",
  "questions": [
    {{
      "id": 1,
      "question": "Ausführliche klinische Fallvignette und Fragestellung (z.B. Verdachtsdiagnose, Differentialdiagnosen, Diagnostik- und Therapieplan)...",
      "model_answer": "Musterlösung für die Prüfung (Strukturierte und vollständige Antwort)...",
      "grading_rubric": [
        "1. Nennung der Verdachtsdiagnose (30%)",
        "2. Wichtigste Differentialdiagnosen (30%)",
        "3. Notfalltherapie und Medikamente (40%)"
      ],
      "explanation": "Ausführliche pathophysiologische und klinische Begründung nach deutschen Leitlinien...",
      "key_point": "Klinischer Merksatz für die Praxis."
    }}
  ]
}}
"""
        else:
            return f"""Sen uzman bir tıp akademisyeni ve klinik sınav hazırlayıcısısın.
Aşağıdaki kaynak metni kullanarak {question_count} adet KLASİK AÇIK UÇLU VAKA SORUSU (Klasik Soru & Vaka Çözümü) hazırla.

### KONU BAŞLIĞI:
{topic_title}

### ZORLUK DERECESİ:
{difficulty}

### KAYNAK METİN:
\"\"\"
{context_text}
\"\"\"

### ÇIKTI FORMATI:
Yanıtını SADECE aşağıdaki saf JSON şemasına göre ver:
{{
  "topic": "{topic_title}",
  "difficulty": "{difficulty}",
  "question_type": "classic",
  "questions": [
    {{
      "id": 1,
      "question": "Ayrıntılı klinik hasta vaka senaryosu ve açık uçlu soru kökü (Örn: Hastanın ön tanısı, ayırıcı tanıları, ilk istenecek tetkikler ve tedavi protokolü nedir?)...",
      "model_answer": "İdeal Hekim / Model Cevap Metni (Yapılandırılmış eksiksiz klinik yanıt)...",
      "grading_rubric": [
        "1. Doğru Ön Tanının tespiti (%30)",
        "2. Kritik Ayırıcı Tanıların belirtilmesi (%30)",
        "3. İlk basamak acil tedavi ve ilaç yaklaşımı (%40)"
      ],
      "explanation": "Detaylı patofizyolojik açıklama, tanısal gerekçelendirme ve klinik kılavuz dayanakları...",
      "key_point": "Bu sorudan çıkarılması gereken kilit klinik not / Merksatz."
    }}
  ]
}}
"""

    # Çoktan Seçmeli (MCQ)
    if is_de:
        return f"""Du bist ein medizinischer Prüfer. Erstelle {question_count} Multiple-Choice-Fragen mit jeweils 5 Antwortmöglichkeiten (A, B, C, D, E).

### THEMA: {topic_title}
### SCHWIERIGKEITSGRAD: {difficulty}
### QUELLTEXT:
\"\"\"
{context_text}
\"\"\"

### AUSGABEFORMAT:
{{
  "topic": "{topic_title}",
  "difficulty": "{difficulty}",
  "question_type": "mcq",
  "questions": [
    {{
      "id": 1,
      "question": "Klinische Fallfrage / Frage...",
      "options": [
        "A) Option 1",
        "B) Option 2",
        "C) Option 3",
        "D) Option 4",
        "E) Option 5"
      ],
      "correct_answer_index": 0,
      "explanation": "Ausführliche Erklärung, warum A richtig und die anderen Optionen falsch sind...",
      "key_point": "Klinischer Merksatz."
    }}
  ]
}}
"""

    return f"""Sen uzman bir tıp akademisyenisin. {question_count} adet 5 SEÇENEKLİ (A, B, C, D, E) çoktan seçmeli test sorusu hazırla.

### KONU BAŞLIĞI: {topic_title}
### ZORLUK DERECESİ: {difficulty}
### KAYNAK METİN:
\"\"\"
{context_text}
\"\"\"

### ÇIKTI FORMATI:
{{
  "topic": "{topic_title}",
  "difficulty": "{difficulty}",
  "question_type": "mcq",
  "questions": [
    {{
      "id": 1,
      "question": "Klinik vaka senaryosu ve soru kökü...",
      "options": [
        "A) Birinci seçenek",
        "B) İkinci seçenek",
        "C) Üçüncü seçenek",
        "D) Dördüncü seçenek",
        "E) Beşinci seçenek"
      ],
      "correct_answer_index": 0,
      "explanation": "Detaylı açıklama ve çeldirici analizleri...",
      "key_point": "Kilit klinik not."
    }}
  ]
}}
"""

async def call_gemini_api(prompt: str, api_key: str, model_name: str = "gemini-3.6-flash") -> Dict[str, Any]:
    """
    Google Gemini REST API üzerinden çağrı yapar.
    """
    clean_model = "gemini-3.6-flash"
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.3,
            "responseMimeType": "application/json"
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
            raise RuntimeError(f"Gemini API Hatası ({response.status_code}): {error_msg}")
            
        data = response.json()
        candidates = data.get("candidates", [])
        if not candidates:
            raise RuntimeError("Gemini modelinden geçerli bir yanıt adayı dönmedi.")
            
        parts = candidates[0].get("content", {}).get("parts", [])
        if not parts:
            raise RuntimeError("Model boş bir yanıt içeriği üretti.")
            
        raw_text = parts[0].get("text", "").strip()
        clean_text = re.sub(r'^```(json)?', '', raw_text, flags=re.MULTILINE)
        clean_text = re.sub(r'```$', '', clean_text, flags=re.MULTILINE).strip()
        
        try:
            return json.loads(clean_text)
        except Exception:
            s = clean_text.find('{')
            e = clean_text.rfind('}')
            if s != -1 and e != -1:
                return json.loads(clean_text[s:e+1])
            raise

def generate_mock_quiz(
    topic_title: str,
    question_count: int = 5,
    difficulty: str = "Orta",
    question_type: str = "mcq",
    language: str = "tr"
) -> Dict[str, Any]:
    """
    API anahtarı olmadan veya çevrimdışı kullanım için örnek soru veri havuzu.
    """
    is_de = language.lower() == "de"
    
    if question_type == "classic":
        if is_de:
            sample_classic = [
                {
                    "id": 1,
                    "question": f"Fallanalyse zum Thema '{topic_title}': Ein 58-jähriger Patient stellt sich mit plötzlich aufgetretenen thorakalen Schmerzen und Ruhedyspnoe in der Notaufnahme vor. Beschreiben Sie die erforderliche klinische Erstdiagnostik, die wahrscheinlichste Verdachtsdiagnose sowie die Akuttherapiemaßnahmen.",
                    "model_answer": "1. Sofortiges 12-Kanal-EKG (<10 min) + kontinuierliches Monitoring.\n2. Verdachtsdiagnose: Akutes Koronarsyndrom (STEMI/NSTEMI).\n3. Akuttherapie: MONA-Schema (Morphin, O2 bei Bedarf, Nitrat, ASS 150-300 mg i.v. + Heparin).\n4. Bei STEMI: Sofortige Koronarangiographie (PCI).",
                    "grading_rubric": [
                        "12-Kanal-EKG innerhalb von 10 Minuten gefordert (25%)",
                        "Korrekte Verdachtsdiagnose und DD formuliert (25%)",
                        "Akuttherapie mit DAPT und Antikoagulation genannt (30%)",
                        "Indikation zur Notfall-Herzkatheteruntersuchung erkannt (20%)"
                    ],
                    "explanation": "Bei akutem Thoraxschmerz steht die zeitnahe Differenzierung zwischen STEMI, Lungenembolie und Aortendissektion an oberster Stelle.",
                    "key_point": "Zeit ist Myokard: Keine Reperfusionsverzögerung durch zeitraubende Laborwert-Wartezeiten bei eindeutigem EKG."
                }
            ]
        else:
            sample_classic = [
                {
                    "id": 1,
                    "question": f"'{topic_title}' konusu kapsamında: 58 yaşında erkek hasta acil servise ani başlayan şiddetli göğüs ağrısı, soğuk terleme ve nefes darlığı ile getiriliyor. Bu hastada ilk 10 dakikada yapılması gereken tanısal yaklaşımı, en olası Ön Tanıyı ve ilk basamak acil medikal tedavi adımlarını gerekçeleriyle açıklayınız.",
                    "model_answer": "1. Tanısal Yaklaşım: İlk 10 dakikada 12 derivasyonlu EKG çekimi, vital bulgu takibi ve damar yolu açılması.\n2. Ön Tanı: Akut Koroner Sendrom (STEMI / NSTEMI).\n3. Acil Tedavi: Monitörizasyon, oksijen (SpO2 < %90 ise), Aspirin 300 mg çiğnetme + P2Y12 inhibitörü (Tikagrelor 180 mg), Unfraksiyone Heparin ve acil PKG için anjiyo laboratuvarı aktivasyonu.",
                    "grading_rubric": [
                        "İlk 10 dakikada EKG çekiminin ve ABC stabilizasyonunun belirtilmesi (%30)",
                        "Akut Koroner Sendrom ön tanısının gerekçelendirilmesi (%30)",
                        "İkili antiagregan ve acil reperfüzyon (PKG) protokolünün doğru yazılması (%40)"
                    ],
                    "explanation": "Akut göğüs ağrısında zaman miyokard dokusudur. STEMI tespit edildiğinde biyobelirteç beklenmeden reperfüzyon kararı verilmelidir.",
                    "key_point": "Kritik hastada ilk adım daima ABC stabilizasyonu, 12 derivasyonlu EKG ve acil reperfüzyon hazırlığıdır."
                }
            ]
        selected = (sample_classic * ((question_count // len(sample_classic)) + 1))[:question_count]
        for idx, q in enumerate(selected):
            q["id"] = idx + 1
        return {
            "topic": topic_title,
            "difficulty": difficulty,
            "question_type": "classic",
            "questions": selected,
            "is_mock": True
        }

    # MCQ Mock
    sample_pool = [
        {
            "id": 1,
            "question": f"'{topic_title}' konusu değerlendirildiğinde; 45 yaşında erkek hasta acil servise ani başlayan göğüs ağrısı ve nefes darlığı ile başvuruyor. İlk ve en öncelikli yapılması gereken yaklaşım aşağıdakilerden hangisidir?",
            "options": [
                "A) ABC stabilitesini sağlamak, monitörizasyon ve ilk 10 dakikada 12 derivasyonlu EKG çekmek",
                "B) İleri tetkik için hastayı derhal kontrastsız toraks BT'ye göndermek",
                "C) Tanı kesinleşene kadar medikal tedavi uygulamamak",
                "D) Yalnızca oral analjezik verip taburcu etmek",
                "E) Sadece akciğer grafisi çekip beklemek"
            ],
            "correct_answer_index": 0,
            "explanation": "Doğru Seçenek: A. Acil yaklaşımda ilk adım daima ABC değerlendirmesi, hızlı monitörizasyon ve EKG'dir.",
            "key_point": "Kritik hastada ilk adım daima ABC stabilizasyonu ve EKG'dir."
        }
    ]
    selected = (sample_pool * ((question_count // len(sample_pool)) + 1))[:question_count]
    for idx, q in enumerate(selected):
        q["id"] = idx + 1
    return {
        "topic": topic_title,
        "difficulty": difficulty,
        "question_type": "mcq",
        "questions": selected,
        "is_mock": True
    }
