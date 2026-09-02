import os
import re
import json
import uuid
import httpx
from typing import Dict, Any, List, Optional
from db import get_documents, get_document_by_id
from pdf_processor import get_topic_content

CASE_GEN_PROMPT_BILINGUAL = """Du bist Chefarzt der Anästhesiologie, Fachprüfer und Vorsitzender der Prüfungskommission für die staatliche KENNTNISPRÜFUNG / ANERKENNUNGSPRÜFUNG für ANÄSTHESIETECHNISCHE ASSISTENTEN (ATA) in Deutschland gemäß dem ATA-OTA-Gesetz (ATA-OTA-G).

Erstelle anhand des Themas/Quelltexts ein hochprofessionelles, 4-SEITIGES ZWEISPRACHIGES (DEUTSCH + TÜRKISCH) KLINISCHES PRÜFUNGS- UND STUDIENBUCH für die deutsche ATA-Kenntnisprüfung.

### UNTERSCHEIDUNG ZWISCHEN ELEKTIVEN EINGRIFFEN UND NOTFÄLLEN (STRENG BEACHTEN!):
- **WENN EIN ELEKTIVER / GEPLANTER EINGRIFF (z.B. elektive Cholezystektomie, Hüft-TEP, Knie-TEP, Strumaresektion, Leistenhernie, Kropf-OP, Katarakt, Tonsillektomie) gefordert ist:**
  * Der Patient ist PLANMÄSSIG VORBEREITET, Nüchternheitsgrenzen sind vollständig eingehalten (mind. 6h feste Nahrung, 2h klare Flüssigkeiten).
  * Prämedikationsvisite ist erfolgt: ASA-Klassifikation (ASA I-III), Mallampati I-IV, Cormack-Lehane, Zahnstatus, Gerinnung.
  * Narkoseführung: Sanfte, kontrollierte Narkoseeinleitung (TIVA oder balancierte Anästhesie), elektive endotracheale Intubation, Larynxmaske (LMA) oder Regionalanästhesie (Spinal/Epidural/Plexus).
  * KEINE RSI! RSI ist bei nüchternen elektiven Patienten ohne Regurgitationsrisiko kontraindiziert bzw. nicht indiziert.
  * Frage 7 lautet: "Atemwegsmanagement & Narkoseeinleitung (Elektive Intubation / LMA)".

- **WENN EIN NOTFALL / AKUTER EINGRIFF (z.B. Ileus, akutes Abdomen, perforierte Appendizitis, Polytrauma, Aortenruptur, Notsectio) gefordert ist:**
  * Der Patient ist NICHT NÜCHTERN oder gilt als vollmagig (Aspirationsrisiko).
  * Indikation zur Rapid Sequence Induction (RSI / Crash-Induction): Präoxygenierung (FiO2 1.0), Absaugbereitschaft mit Yankauer, zügige Gabe von Hypnotikum und Muskelrelaxanz (Rocuronium 1.0-1.2 mg/kg oder Succinylcholin), Verzicht auf Zwischenbeatmung, Videolaryngoskopie.
  * Frage 7 lautet: "Atemwegsmanagement & Notfall-RSI (Rapid Sequence Induction)".

### DEUTSCHE ANÄSTHESIE- UND PRÜFUNGSSTANDARDS (DGAI, BDA, RKI, AWMF):
1. **ATA-Kompetenzbereich (ATA-OTA-G):** Vorbereitung Narkosearbeitsplatz, DGAI-Gerätecheck, 4-Augen-Prinzip beim Medikamentenaufzug, Assistenz bei Einleitung/Ausleitung, sterile Kautelen (RKI), Aufwachraum (AWR).
2. **Pharmakotherapie:** Hypnotika (Propofol, Etomidat, Thiopental), Opioide (Sufentanil, Fentanyl, Remifentanil, Piritramid nach BtMG), Muskelrelaxanzien (Rocuronium 0.6 mg/kg elektiv vs. 1.0-1.2 mg/kg RSI + Sugammadex/Bridion), Notfallmedikamente (Akrinor, Noradrenalin, Atropin, Dantrolen bei MH, Lipofundin 20% bei LAST).
3. **Patientensicherheit:** Team Time-Out (WHO), SBAR-Übergabe, Vermeidung von Lagerungsschäden (N. ulnaris, N. peroneus), PONV-Prophylaxe (Dexamethason, Ondansetron).

### 4-SEITEN STRUKTUR:
- **SEITE 1 (🇩🇪 DEUTSCH):** Klinischer Fallbericht / Anamnese, Vorerkrankungen, Medikamente, Vitalparameter & Befunde + 12 Prüfungsfragen (Fragen 1-12).
- **SEITE 2 (🇩🇪 DEUTSCH):** Strukturierte Anamnese-Zusammenfassung (Arztbrief/Epikrise/Übergabe) + 12 detaillierte Musterlösungen nach DGAI/RKI-Standard.
- **SEITE 3 (🇹🇷 TÜRKÇE):** Sayfa 1'in eksiksiz Türkçe karşılığı (Hasta Anamnezi, Muayene, Vital Bulgular + 12 Sınav Sorusu).
- **SEITE 4 (🇹🇷 TÜRKÇE):** Sayfa 2'nin eksiksiz Türkçe karşılığı (Almanya standartlarında Yapılandırılmış Epikriz & 12 Model Çözüm).

### DIE 6 PFLICHTFRAGEN-KATEGORIEN:
1. **Hastalığı Açıkla / Krankheit erklären:** Krankheitsbild, Pathophysiologie und spezifische Anästhesierelevanz / perioperative Risiken (ASA-Klasse).
2. **Tedavi Yöntemleri / Therapiemethoden & Anästhesie:** Narkoseverfahren (TIVA/Balanciert/Regional/LMA), Ablauf des Anästhesiemanagements.
3. **Hastayla İletişim / Patientenkommunikation & Aufklärung:** Aufklärungsbestätigung, perioperative Betreuung, Nüchternheit, Angstmanagement, Aufwachraum.
4. **Hijyen Önlemleri / Hygienemaßnahmen (RKI):** OP-Asepsis, 5 Momente der Händehygiene (WHO), Sterilität bei Gefäßzugängen/Spinalanästhesie.
5. **İlaçlar 1: Farmakoterapi & İlaç Seçimi / Pharmakotherapie & Medikamentenwahl:** Welche Medikamente (Hypnotika, Opioide, Muskelrelaxanzien, Notfallmedikamente) sind indiziert? Exakte DGAI-Standarddosierungen und Applikationswege.
6. **İlaçlar 2: Reseptör Etkisi, Yan Etkiler, Kontrendikasyonlar & TABLO / Rezeptor-Pharmakologie, Nebenwirkungen & Kontraindikationen (TABELLE):** Welche Rezeptoren stimulieren/blockieren die gewählten Medikamente? Nebenwirkungen, Kontraindikationen.
   *WICHTIG / DİKKAT:* Die Musterlösung (ideal_answer) MUSS ZWINGEND als übersichtliche TABELLE aufgebaut sein: [Medikament | Rezeptor & Wirkmechanismus | Wichtigste Nebenwirkungen | Kontraindikationen & Komplikationen].
+ 6 Vertiefungsfragen (Atemwegsmanagement, Narkosegeräte-Check, Notfallkomplikationen wie Maligne Hyperthermie/LAST/Blutung, Monitoring, Lagerung & BtMG, Aufwachraum).

### AUSGABEFORMAT:
Antworte AUSSCHLIESSLICH im folgenden reinen JSON-Format:
{
  "german": {
    "title": "Titel des Falles (z.B. Elektive laparoskopische Cholezystektomie - Anästhesie-Management)",
    "patient_profile": { "age": "52", "gender": "weiblich", "chief_complaint": "Geplante elektive Operation bei symptomatischer Cholezystolithiasis" },
    "patient_story": "Ausführliche Patientenanamnese mit Vorerkrankungen, Medikamenten, Nüchternheitsstatus...",
    "vital_and_findings": "Körperlicher Untersuchungsbefund, Vitalparameter (RR, HF, SpO2), Labor, EKG, ASA-Klasse...",
    "anamnesis_summary": "Strukturierte Anamnese-Zusammenfassung und Anästhesie-Planung nach DGAI-Standard...",
    "questions": [
      { "id": 1, "category": "Krankheit erklären", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 2, "category": "Therapiemethoden", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 3, "category": "Arzt-Patienten-Kommunikation", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 4, "category": "Hygienemaßnahmen (RKI)", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 5, "category": "Pharmakotherapie & Medikamente", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 6, "category": "Rezeptor-Pharmakologie & Tabelle", "question": "...", "ideal_answer": "Detaillierte TABELLE: [Medikament | Rezeptor/Wirkung | Nebenwirkungen | Kontraindikationen]...", "max_points": 10 },
      { "id": 7, "category": "Atemwegsmanagement & Einleitung", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 8, "category": "Narkosegeräte-Check & Vorbereitung", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 9, "category": "Notfall- & Komplikationsmanagement", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 10, "category": "Monitoring & Vitalparameter", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 11, "category": "Lagerung & BtMG-Dokumentation", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 12, "category": "Aufwachraum & Postoperative Übergabe", "question": "...", "ideal_answer": "...", "max_points": 10 }
    ]
  },
  "turkish": {
    "title": "Vakanın Başlığı (Örn: Elektif Laparoskopik Kolesistektomi - Anestezi Yönetimi)",
    "patient_profile": { "age": "52", "gender": "Kadın", "chief_complaint": "Semptomatik safra kesesi taşı nedeniyle planlı elektif ameliyat" },
    "patient_story": "Ayrıntılı hasta öyküsü, özgeçmiş, kullandığı ilaçlar, açlık durumu (6h/2h tam), anestezi riskleri...",
    "vital_and_findings": "Fizik muayene, vital parametreler (TA, Nabız, SpO2), laboratuvar ve EKG bulguları, ASA skoru...",
    "anamnesis_summary": "DGAI ve Almanya ATA standartlarına uygun yapılandırılmış anestezi ve epikriz planı...",
    "questions": [
      { "id": 1, "category": "Hastalığı Açıkla", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 2, "category": "Tedavi & Anestezi Protokolü", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 3, "category": "Hastayla İletişim & Aydınlatma", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 4, "category": "Hijyen Önlemleri (RKI Standardı)", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 5, "category": "İlaç Seçimi & Farmakoterapi", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 6, "category": "Reseptörler, Yan Etkiler & TABLO", "question": "...", "ideal_answer": "Ayrıntılı TABLO: [İlaç Adı | Reseptör & Etki | Yan Etkiler | Kontrendikasyonlar & Komplikasyonlar]...", "max_points": 10 },
      { "id": 7, "category": "Havayolu Yönetimi & İndüksiyon", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 8, "category": "Cihaz Kontrolü & Hazırlık", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 9, "category": "Acil Durum & Komplikasyon Yönetimi", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 10, "category": "Monitörizasyon & Vital Bulgular", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 11, "category": "Hasta Pozisyonu & Narkotik Belgeleme", "question": "...", "ideal_answer": "...", "max_points": 10 },
      { "id": 12, "category": "Derlenme Odası (Aufwachraum) & Teslim", "question": "...", "ideal_answer": "...", "max_points": 10 }
    ]
  }
}
"""

async def generate_12_question_case(
    topic: str = "",
    context_text: str = "",
    source_type: str = "pdf",
    language: str = "tr",
    urgency_type: str = "auto",
    api_key: str = "",
    model_name: str = "gemini-3.6-flash"
) -> Dict[str, Any]:
    """
    Gemini 3.6 Flash ile Yüklü PDF'lerden veya Web'den 4 SAYFALIK İKİ DİLLİ (Almanca + Türkçe) klinik vaka kitapçığı üretir.
    """
    clean_model = model_name.replace("models/", "").strip()
    if "2.5" in clean_model or "1.5" in clean_model:
        clean_model = "gemini-3.6-flash"

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    urgency_directive = ""
    if urgency_type == "elective":
        urgency_directive = "\n### ÖNEMLİ TALİMAT: Bu vaka KESİNLİKLE ELEKTİF / PLANLANMIŞ BİR AMELİYATTIR (Elektiver Eingriff). Hasta açtır (6h/2h açlık tamdır), preoperatif viziti yapılmıştır. Kesinlikle acil RSI vakası YAPMA! Standart kontrollü elektif anestezi ve entübasyon/LMA yönetimi uygula.\n"
    elif urgency_type == "emergency":
        urgency_directive = "\n### ÖNEMLİ TALİMAT: Bu vaka KESİNLİKLE BİR ACİL / AKUT AMELİYATTIR (Notfalleingriff). Hasta tok / açlık süresi belirsizdir. Aspirasyon riski ve acil RSI (Rapid Sequence Induction) protokolünü uygula.\n"
    else:
        # Otomatik mod: Konu başlığını analiz et
        lower_t = topic.lower()
        if any(w in lower_t for w in ["elektif", "planlı", "planli", "elektiv", "geplant", "cholezystektomie", "kolesistektomi", "tep", "protez", "tiroid", "hernie", "fıtık", "fitik", "struma"]):
            urgency_directive = "\n### ÖNEMLİ TALİMAT: Bu vaka ELEKTİF / PLANLANMIŞ BİR AMELİYATTIR (Elektiver Eingriff). Hasta açtır (Nüchternheit eingehalten), elektif anestezi uygula, acil RSI yapma.\n"
        elif any(w in lower_t for w in ["acil", "akut", "notfall", "ileus", "ruptur", "rüptür", "perforasyon", "travma", "trauma", "kanama"]):
            urgency_directive = "\n### ÖNEMLİ TALİMAT: Bu vaka ACİL BİR AMELİYATTIR (Notfalleingriff). Acil RSI protokolü uygula.\n"

    if source_type == "web":
        user_text = f"""{CASE_GEN_PROMPT_BILINGUAL}
{urgency_directive}
### [KAYNAK: DÜNYA TIP LİTERATÜRÜ & WEB KLİNİK VAKA ARŞİVİ]
'{topic}' konusu kapsamında uluslararası tıp kılavuzlarına (DGAI, BDA, AWMF, DGIM) ve FSP/KP sınav standartlarına tam uygun, 4 sayfalık hem Almanca hem Türkçe tam eşlenik klinik vaka ve 12 soru JSON çıktısını oluştur.
"""
    else:
        user_text = f"""{CASE_GEN_PROMPT_BILINGUAL}
{urgency_directive}
### [KAYNAK: YÜKLÜ PDF DERS NOTU / KİTAP]
Konu: {topic}
"""
        if context_text.strip():
            user_text += f"\nPDF METİN İÇERİĞİ:\n\"\"\"\n{context_text[:12000]}\n\"\"\"\n"
        user_text += "\nLütfen bu PDF içeriğindeki bilgilere dayanarak 4 sayfalık iki dilli (Almanca ve Türkçe) klinik vaka JSON dosyasını oluştur."

    payload = {
        "contents": [{"parts": [{"text": user_text}]}],
        "generationConfig": {
            "temperature": 0.3,
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Vaka Üretim Hatası ({response.status_code}): {response.text}")
            
        data = response.json()
        parts = data.get("candidates", [])[0].get("content", {}).get("parts", [])
        raw_text = parts[0].get("text", "").strip()
        clean_text = re.sub(r'^```(json)?', '', raw_text, flags=re.MULTILINE)
        clean_text = re.sub(r'```$', '', clean_text, flags=re.MULTILINE).strip()
        
        result = json.loads(clean_text)
        result["case_id"] = str(uuid.uuid4())
        result["source_type"] = source_type

        # Geriye dönük uyumluluk için seçili dili ana alanlara da kopyala
        active_lang_key = "german" if language.lower() == "de" else "turkish"
        active_obj = result.get(active_lang_key) or result.get("german") or result.get("turkish") or {}
        
        result["title"] = active_obj.get("title", topic)
        result["patient_profile"] = active_obj.get("patient_profile", {})
        result["patient_story"] = active_obj.get("patient_story", "")
        result["vital_and_findings"] = active_obj.get("vital_and_findings", "")
        result["anamnesis_summary"] = active_obj.get("anamnesis_summary", "")
        result["questions"] = active_obj.get("questions", [])
        
        return result

async def evaluate_user_case_answers(
    case_data: Dict[str, Any],
    user_answers: Optional[Dict[str, str]] = None,
    images: Optional[List[Dict[str, str]]] = None,
    past_history: Optional[List[Dict[str, Any]]] = None,
    language: str = "tr",
    api_key: str = "",
    model_name: str = "gemini-3.6-flash"
) -> Dict[str, Any]:
    """
    Kullanıcının 12 soruya verdiği yazılı veya el yazısı fotoğraflarındaki (OCR) yanıtları
    Alman DGAI/ATA standartlarındaki ideal model cevaplarla karşılaştırır, puanlar,
    öğrencinin geçmiş vaka performansıyla kıyaslayarak sık tekrarlanan hataları ve gelişimi raporlar.
    """
    is_de = language.lower() == "de"
    active_case = case_data.get("german", case_data) if is_de else case_data.get("turkish", case_data)
    if not active_case.get("questions"):
        active_case = case_data.get("german") or case_data.get("turkish") or case_data

    user_answers = user_answers or {}
    clean_model = model_name.replace("models/", "").strip()
    if "2.5" in clean_model or "1.5" in clean_model:
        clean_model = "gemini-3.6-flash"

    # Geçmiş vaka hafızası özeti
    history_context = ""
    if past_history and len(past_history) > 0:
        history_context = "\n### ÖĞRENCİNİN GEÇMİŞ VAKA HAFIZASI (LONGITUDINAL PERFORMANCE):\n"
        history_context += f"- Daha önce çözülen toplam vaka sayısı: {len(past_history)}\n"
        for idx, h in enumerate(past_history[:5]):
            history_context += f"  * Vaka #{idx+1} ({h.get('case_title', 'Vaka')}): Başarı %{h.get('percentage', 0)} - Skor: {h.get('score')}/{h.get('max_score')}\n"
            if h.get("weaknesses"):
                history_context += f"    Önceki Eksikler: {', '.join(h.get('weaknesses')[:3])}\n"
            if h.get("recurring_mistakes"):
                history_context += f"    Önceki Tekrarlayan Hatalar: {', '.join(h.get('recurring_mistakes')[:2])}\n"

    if is_de:
        eval_prompt = f"""Du bist Prüfer der staatlichen Prüfungskommission für die ATA-Kenntnisprüfung (Anästhesietechnische Assistenten) in Deutschland gemäß ATA-OTA-G, DGAI und RKI.
Bewerte die Antworten des Prüflings auf die 12 Fallfragen im strikten Vergleich zur Musterlösung und den deutschen Anästhesie-Standards.
Alle Auswertungen, Feedbacks und Erklärungen MÜSSEN vollständig auf DEUTSCH sein.

{history_context}

### WICHTIGE BEWERTUNGSKRITERIEN & BILD-VALIDIERUNG:
1. BILD-VALIDIERUNG (STRIKT): Falls die hochgeladenen Fotos unleserlich, leer, zufällig oder völlig irrelevant für diese medizinische Prüfung sind (z.B. Landschaften, Tiere, Memes, beliebige Gegenstände ohne medizinische Handschrift):
   - Vergib ZWINGEND 0 Punkte für alle Fragen (score: 0)!
   - user_answer: "(Keine lesbare handschriftliche Antwort zu dieser Frage im Bild gefunden)"
   - is_satisfactory: false
   - overall_feedback: "⚠️ Die hochgeladenen Bilder enthalten keine gültigen handschriftlichen Antworten zu diesem Fall. Ergebnis: 0/120 Punkte. Bitte laden Sie lesbare Fotos Ihrer bearbeiteten Prüfungsbögen hoch."
   - total_score: 0, percentage: 0.
2. Wenn lesbare handschriftliche Notizen vorhanden sind: Lies die handschriftlichen Antworten des Prüflings sorgfältig aus den Bildern (OCR) und bewerte sie streng nach DGAI/RKI-Standard.
3. Prüfe auf WIEDERKEHRENDE FEHLER (Recurring Mistakes): Macht der Prüfling dieselben Fehler wie in früheren Fällen (z.B. fehlende Akrinor-Dosierung, RKI 5-Momente, BtMG 4-Augen-Prinzip)? Hebe diese im Feld 'recurring_mistakes' ausdrücklich hervor!
4. Prüfe auf FORTSCHRITT & ENTWICKLUNG (Progress): Zeigt der Prüfling Verbesserungen im Vergleich zu früheren Fällen? Würdige dies im Feld 'progress_analysis'!

### KLINISCHER FALL (DEUTSCH):
Titel: {active_case.get('title')}
Anamnese: {active_case.get('patient_story')}
Befunde: {active_case.get('vital_and_findings')}

### FRAGEN UND MUSTERLÖSUNGEN (DEUTSCH):
"""
        for q in active_case.get("questions", []):
            qid = str(q["id"])
            u_ans = user_answers.get(qid, "").strip()
            eval_prompt += f"\n--- FRAGE #{q['id']} ({q.get('category')}) ---\n"
            eval_prompt += f"Frage: {q['question']}\n"
            eval_prompt += f"Musterlösung: {q['ideal_answer']}\n"
            if u_ans:
                eval_prompt += f"Eingegebene Textantwort: {u_ans}\n"
            else:
                eval_prompt += "Antwort: (Aus den hochgeladenen handschriftlichen Fotos entnehmen oder bewerten)\n"

        eval_prompt += """
### AUSGABEFORMAT:
Antworte AUSSCHLIESSLICH im folgenden reinen JSON-Format auf DEUTSCH:
{
  "total_score": 85,
  "max_score": 120,
  "percentage": 71,
  "overall_feedback": "Zusammenfassende Beurteilung der klinischen und anästhesiologischen Leistung nach deutschem ATA-Standard...",
  "progress_analysis": "Beurteilung der Entwicklung im Zeitverlauf (z.B. 'Große Fortschritte in der Pharmakologie im Vergleich zu den letzten 5 Fällen!')...",
  "recurring_mistakes": [
    "Wiederkehrender Fehler: In den letzten 3 Fällen wurde erneut das 4-Augen-Prinzip bei Opiaten vergessen.",
    "Wiederkehrender Fehler: ..."
  ],
  "strengths": [
    "Sicheres Atemwegsmanagement bei RSI",
    "Präzise Dosierung von Propofol und Rocuronium"
  ],
  "weaknesses": [
    "Fehlende Nennung von Akrinor bei intraoperativer Hypotonie",
    "Unvollständige RKI-Händehygiene-Schritte"
  ],
  "evaluations": [
    {
      "question_id": 1,
      "category": "Krankheit erklären",
      "question": "...",
      "user_answer": "Handschriftlich erkannte oder eingegebene Antwort des Prüflings...",
      "ideal_answer": "...",
      "score": 8,
      "max_points": 10,
      "is_satisfactory": true,
      "feedback": "Präzises Feedback zur fachlichen Richtigkeit nach DGAI/RKI-Standard...",
      "missing_points": "Was hat gefehlt oder hätte besser sein können..."
    }
  ]
}
"""
    else:
        eval_prompt = f"""Sen Almanya ATA (Anestezi Teknikeri) Kenntnisprüfung sınav komisyonu başkanısın.
Adayın 12 soruluk anestezi ve klinik vakaya verdiği yanıtları Alman DGAI, BDA, RKI ve ATA-OTA-G standartlarındaki ideal model çözümlerle karşılaştırarak titizlikle puanla ve kapsamlı analiz raporu hazırla.
Tüm geri bildirim ve açıklamaları TÜRKÇE olarak hazırla.

{history_context}

### ÇOK KRİTİK DEĞERLENDİRME, GÖRSEL DOĞRULAMA VE GELİŞİM HAFIZASI KURALLARI:
1. GÖRSEL GEÇERLİLİK VE İLGİLİLİK KONTROLÜ (ÇOK KATI):
   - Eğer yüklenen fotoğraf(lar) sınav kağıdı/el yazısı çözümü ile İLGİSİZSE (örn: araba, kedi, manzara, rastgele nesne, boş kağıt, anlamsız karalama veya sınav dışı herhangi bir görsel), ya da görselde bu 12 soruya dair hiçbir tıbbi el yazısı/yanıt bulunmuyorsa:
     * KESİNLİKLE PUAN VERME! Tüm soruların puanını 0 yap (score: 0, total_score: 0, percentage: 0)!
     * user_answer: "(Yüklenen görselde bu soruya ait tıbbi bir el yazısı/çözüm tespit edilemedi - Geçersiz Görsel)"
     * is_satisfactory: false
     * feedback: "Yüklenen görsel sınav çözümü içermiyor veya vaka ile ilgisiz."
     * overall_feedback: "⚠️ Yüklenen görsel(ler) bu klinik vaka sınavına ait geçerli bir el yazısı çözümü içermiyor. Sınavdan 0/120 puan aldınız. Lütfen çözdüğünüz sınav kitapçığının net fotoğraflarını yükleyiniz."
2. Fotoğrafta Okunabilir Tıbbi El Yazısı Varsa: Yüklenen fotoğraflardaki el yazılarını dikkatle oku (Medikal OCR), hangi soruya ait olduğunu tespit et ve gerçek tıbbi doğruluğuna göre puanla.
3. TEKRARLAYAN HATALARI YAKALA (Recurring Mistakes): Aday geçmiş vakalarda yaptığı hataları bu vakada da tekrarlıyor mu? (Örn: "Son 3 vakadır Akrinor dozajını yazmıyorsun", "RKI 5 el hijyeni adımını yine atladın", "4-Göz ilkesini yine unuttun"). Bunu 'recurring_mistakes' listesinde özel olarak uyar!
4. GELİŞİMİ VE İLERLEMEYİ ÖDÜLLENDİR (Progress Analysis): Adayın ilk vakalarına kıyasla gösterdiği başarı artışını, kavradığı konuları 'progress_analysis' alanında övgü ve motivasyonla belirt (Örn: "Son 10 vakadır farmakoloji ve havayolu yönetiminde %35 artış gösterdin, harika bir ivme!").

### KLİNİK VAKA (TÜRKÇE):
Başlık: {active_case.get('title')}
Hasta Öyküsü: {active_case.get('patient_story')}
Vital & Bulgular: {active_case.get('vital_and_findings')}

### SORULAR VE İDEAL MODEL ÇÖZÜMLER (TÜRKÇE):
"""
        for q in active_case.get("questions", []):
            qid = str(q["id"])
            u_ans = user_answers.get(qid, "").strip()
            eval_prompt += f"\n--- SORU #{q['id']} ({q.get('category')}) ---\n"
            eval_prompt += f"Soru: {q['question']}\n"
            eval_prompt += f"İdeal Model Çözüm: {q['ideal_answer']}\n"
            if u_ans:
                eval_prompt += f"Kullanıcı Metin Yanıtı: {u_ans}\n"
            else:
                eval_prompt += "Kullanıcı Yanıtı: (Yüklenen el yazısı fotoğraflarından oku ve analiz et)\n"

        eval_prompt += """
### ÇIKTI FORMATI:
Yanıtını SADECE aşağıdaki saf JSON formatında ver:
{
  "total_score": 85,
  "max_score": 120,
  "percentage": 71,
  "overall_feedback": "Genel klinik ve anestezi performansı değerlendirmesi...",
  "progress_analysis": "Öğrencinin zaman içindeki gelişim analizi (Örn: 'İlk vakalarına göre havayolu ve farmakoloji alanında belirgin bir sıçrama yaptın!')...",
  "recurring_mistakes": [
    "Sık Tekrarlanan Hata: Son 4 vakada olduğu gibi bu vakada da Akrinor dozajını unuttun.",
    "Sık Tekrarlanan Hata: Narkotik ilaçlarda 4-Göz İlkesi (4-Augen-Prinzip) adımını yine atladın."
  ],
  "strengths": [
    "RSI ve preoksijenizasyon protokolüne tam hakimiyet",
    "Rokuronyum ve Sugammadex doz hesaplaması kusursuz"
  ],
  "weaknesses": [
    "İntraoperatif hipotansiyonda vazopressör basamakları eksik",
    "RKI steril örtüm kurallarında detay eksikliği"
  ],
  "evaluations": [
    {
      "question_id": 1,
      "category": "Hastalığı Açıkla",
      "question": "...",
      "user_answer": "Kullanıcının fotoğraftan okunan el yazısı veya metin yanıtı...",
      "ideal_answer": "...",
      "score": 8,
      "max_points": 10,
      "is_satisfactory": true,
      "feedback": "Kullanıcı yanıtının doğruluğu hakkında DGAI standartlarında geri bildirim...",
      "missing_points": "Eksik bırakılan kritik noktalar..."
    }
  ]
}
"""

    parts = [{"text": eval_prompt}]
    
    # Çoklu el yazısı fotoğrafı varsa multimodal payload'a ekle
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

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient(timeout=150.0) as client:
        response = await client.post(url, headers=headers, json=payload)
        if response.status_code != 200:
            raise RuntimeError(f"Değerlendirme API Hatası ({response.status_code}): {response.text}")
            
        data = response.json()
        cand_parts = data.get("candidates", [])[0].get("content", {}).get("parts", [])
        raw_text = cand_parts[0].get("text", "").strip()
        clean_text = re.sub(r'^```(json)?', '', raw_text, flags=re.MULTILINE)
        clean_text = re.sub(r'```$', '', clean_text, flags=re.MULTILINE).strip()
        
        return json.loads(clean_text)

def generate_mock_12_case(topic: str = "Akut Koroner Sendrom", language: str = "tr") -> Dict[str, Any]:
    """
    Çevrimdışı / API anahtarsız test için 4 SAYFALIK İKİ DİLLİ (Almanca + Türkçe) vaka şablonu.
    """
    de_questions = [
        { "id": 1, "category": "Krankheit erklären", "question": "Erklären Sie die Pathophysiologie und das Krankheitsbild dieses Patienten.", "ideal_answer": "Akuter Myokardinfarkt mit ST-Hebung (STEMI) infolge einer akuten thrombotischen Okklusion eines Koronargefäßes nach atherosklerotischer Plaque-Ruptur mit transmuraler Myokardischämie.", "max_points": 10 },
        { "id": 2, "category": "Therapiemethoden", "question": "Beschreiben Sie das Akut- und Reperfusionsmanagement (DAPT, Antikoagulation, Notfall-PCI).", "ideal_answer": "Sofortige DAPT (ASS 150-300 mg p.o./i.v. + Ticagrelor 180 mg), Unfraktioniertes Heparin 70-100 IE/kg i.v., Notfall-Koronarangiographie (Katheterlabor-Zielzeit < 90-120 min), Schmerztherapie mit Morphin.", "max_points": 10 },
        { "id": 3, "category": "Arzt-Patienten-Kommunikation", "question": "Wie führen Sie das Aufklärungsgespräch bezüglich der Notfall-Herzkatheteruntersuchung und managen die Angst des Patienten?", "ideal_answer": "Strukturierte, beruhigende und verständliche Aufklärung über Dringlichkeit, Nutzen (Lebensrettung durch Reperfusion) und Risiken (Blutung, Rhythmusstörungen) der PCI; Einholen der mündlichen/schriftlichen Einwilligung.", "max_points": 10 },
        { "id": 4, "category": "Hygienemaßnahmen (RKI)", "question": "Welche Hygiene- und Sterilitätsmaßnahmen sind im Herzkatheterlabor und bei Gefäßpunktionen einzuhalten?", "ideal_answer": "Chirurgische Händedesinfektion nach WHO, sterile Schutzkittel und Handschuhe, sterile Abdeckung des Punktionsgebiets (A. radialis/femoralis), Hautantisepsis mit Chlorhexidin-Alkohol.", "max_points": 10 },
        { "id": 5, "category": "Pharmakotherapie & Medikamente", "question": "Welche Medikamente sind in diesem Akutfall primär indiziert? Nennen Sie Wirkstoffgruppen, Applikationswege und genaue Dosierungen.", "ideal_answer": "1. ASS 150-300 mg i.v./p.o. (Thrombozytenaggregationshemmer), 2. Ticagrelor 180 mg p.o. (P2Y12-Inhibitor), 3. Heparin 5000 IE i.v. (Antikoagulation), 4. Morphin 3-5 mg i.v. (Analgesie), 5. Nitroglycerin 1-2 Hübe s.l. (bei RR syst. > 100 mmHg).", "max_points": 10 },
        { "id": 6, "category": "Rezeptor-Pharmakologie & Tabelle", "question": "Welche Rezeptoren beeinflussen/blockieren die eingesetzten Medikamente? Welche Nebenwirkungen, krankheitsspezifischen Komplikationen und Kontraindikationen bestehen? (Antwort als strukturierte Tabelle)", "ideal_answer": "TABELLE DER MEDIKAMENTEN-PHARMAKOLOGIE:\n• ASS: Hemmt COX-1 (TXA2-Block) | NW: Magenulzera, Blutung | KI: Ulkuskrankheit, Hämorrhagische Diathese\n• Ticagrelor: Allosterischer P2Y12-Rezeptor-Antagonist | NW: Dyspnoe, Blutung | KI: Z.n. intrakranieller Blutung\n• Heparin: Bindet Antithrombin III (Faktor Xa/IIa-Inaktivierung) | NW: HIT Typ II, Blutung | KI: Schwere Thrombozytopenie\n• Morphin: Agonist an My-Opioidrezeptoren | NW: Atemdepression, Sedierung, Übelkeit | KI: Schwere COPD, Koma", "max_points": 10 },
        { "id": 7, "category": "Atemwegsmanagement & RSI", "question": "Wie sichern Sie den Atemweg bei einer akuten Narkoseinduktion bei kardial instabilem Patienten?", "ideal_answer": "Präoxygenierung mit FiO2 1.0, kardiostabile Narkoseeinleitung mit Etomidat (0.2-0.3 mg/kg) + Fentanyl/Sufentanil, Muskelrelaxierung mit Rocuronium (1.0 mg/kg), endotracheale Intubation unter Videolaryngoskopie.", "max_points": 10 },
        { "id": 8, "category": "Narkosegeräte-Check & Vorbereitung", "question": "Welche Schritte umfasst der DGAI-Gerätecheck vor Beginn der Narkose?", "ideal_answer": "1. Dichtigkeits- und Druckprüfung des Narkosesystems, 2. Narkosegasabsaugung (NGA), 3. O2-Notfallversorgung und Ambu-Beutel, 4. Absaugbereitschaft mit Yankauer-Katheter, 5. Notspritzen (Atropin, Akrinor, Noradrenalin).", "max_points": 10 },
        { "id": 9, "category": "Notfall- & Komplikationsmanagement", "question": "Welche akuten kardiogenen Komplikationen können in den ersten 24 Stunden auftreten?", "ideal_answer": "Maligne Herzrhythmusstörungen (Kammerflimmern, ventrikuläre Tachykardie), kardiogener Schock, akute Linksherzinsuffizienz mit Lungenödem, Papillarmuskelabriss mit akuter Mitralinsuffizienz.", "max_points": 10 },
        { "id": 10, "category": "Monitoring & Vitalparameter", "question": "Wie bewerten Sie die Sauerstoffsättigung von 91% und welche Indikation besteht für O2-Gabe?", "ideal_answer": "Sauerstoffgabe ist leitliniengerecht nur bei einer SpO2 < 90% indiziert. Eine routinemäßige Hyperoxie sollte vermieden werden, da sie zu koronarer Vasokonstriktion und Reperfusionsschäden führen kann.", "max_points": 10 },
        { "id": 11, "category": "Lagerung & BtMG-Dokumentation", "question": "Welche rechtlichen und pflegerischen Vorgaben gelten für Opiate (BtMG) und die Patientenlagerung?", "ideal_answer": "BtMG: Aufzug und Verabreichung von Opiaten (Morphin, Fentanyl) nach 4-Augen-Prinzip und lückenlose Buchführung im BTM-Buch. Lagerung: Oberkörperhochlagerung (30°), Druckentlastung N. ulnaris und Fersen.", "max_points": 10 },
        { "id": 12, "category": "Aufwachraum & Postoperative Übergabe", "question": "Welche Kriterien müssen im Aufwachraum (AWR) vor Verlegung auf die Normalstation erfüllt sein?", "ideal_answer": "Stabile Hämodynamik (RR, HF), normotrope SpO2 > 94%, Schmerzfreiheit (NRS < 3), keine Nachblutung an der Punktionsstelle, vollständige Erholung der Schutzreflexe (Aldrete-Score > 9).", "max_points": 10 }
    ]

    tr_questions = [
        { "id": 1, "category": "Hastalığı Açıkla", "question": "Bu hastadaki hastalığı, patofizyolojik oluşum mekanizmasını ve miyokard dokusundaki hücresel süreci açıklayınız.", "ideal_answer": "Akut ST Yükselmeli Anterior Miyokard Enfarktüsü (STEMI). Koroner arterdeki aterosklerotik plağın rüptürü sonrası gelişen trombüsün damarı tam tıkaması sonucu transmural iskemi ve nekroz gelişmesidir.", "max_points": 10 },
        { "id": 2, "category": "Tedavi & Anestezi Protokolü", "question": "Hastanın ilk basamak acil tedavi ve acil reperfüzyon (PKG) protokolünü (ilaç isimleri ve dozları dahil) detaylandırınız.", "ideal_answer": "ABC stabilizasyonu, Aspirin 150-300 mg çiğnetme + Tikagrelor 180 mg yükleme, Unfraksiyone Heparin 70-100 IU/kg i.v., ilk 90-120 dakikada acil anjiyografi ve Primer Perkütan Koroner Girişim (PKG).", "max_points": 10 },
        { "id": 3, "category": "Hastayla İletişim & Aydınlatma", "question": "Hastaya ve yakınlarına acil anjiyo/ameliyat sürecini açıklama, aydınlatılmış onam alma ve anksiyeteyi yönetme adımlarını anlatınız.", "ideal_answer": "İşlemin hayat kurtarıcı aciliyeti sakin ve net bir dille aktarılmalı; olası riskler (kanama, aritmi) ve faydalar açıklanarak yazılı/sözlü aydınlatılmış onam alınmalı, empatiyle güven verilmelidir.", "max_points": 10 },
        { "id": 4, "category": "Hijyen Önlemleri (RKI Standardı)", "question": "Anjiyografi laboratuvarı ve acil girişim sürecinde uyulması gereken asepsi, cerrahi el yıkama ve enfeksiyon kontrol kurallarını yazınız.", "ideal_answer": "WHO kriterlerine uygun cerrahi el antisepsisi, steril önlük ve eldiven giyilmesi, ponksiyon bölgesinin (radial/femoral) klorheksidinli alkolle dezenfeksiyonu ve steril örtüm yapılması.", "max_points": 10 },
        { "id": 5, "category": "İlaç Seçimi & Farmakoterapi", "question": "Bu acil vakada hangi ilaçlar etkilidir? İlaç gruplarını, uygulama yollarını ve DGAI kılavuzlarına uygun standart dozajlarını belirtiniz.", "ideal_answer": "1. Aspirin: 150-300 mg çiğneme/iv (Antiagregan), 2. Tikagrelor: 180 mg oral (P2Y12 inhibitörü), 3. Heparin: 5000 IU iv (Antikoagülasyon), 4. Morfin: 3-5 mg iv (Analjezi), 5. Nitrat: 1-2 puf dilaltı (Sistolik TA > 100 ise).", "max_points": 10 },
        { "id": 6, "category": "Reseptörler, Yan Etkiler & TABLO", "question": "Kullanılan ilaçlar vücutta hangi reseptörleri etkiler veya bloke eder? Yan etkileri, hastalıklara göre komplikasyonları ve kontrendikasyonları nelerdir? (Cevabı yapılandırılmış TABLO olarak veriniz)", "ideal_answer": "FARMAKOLOJİ VE RESEPTÖR ANALİZ TABLOSU:\n• Aspirin: Trombosit COX-1 enzim inhibisyonu (TxA2 blokajı) | Yan Etki: GİS kanama, dispepsi | Kontrendikasyon: Aktif peptik ülser, kanama diyatezi\n• Tikagrelor: Trombosit P2Y12 ADP reseptör blokajı | Yan Etki: Dispne, majör kanama | Kontrendikasyon: Geçirilmiş intrakraniyal kanama\n• Heparin: Antitrombin III aktivasyonu (Faktör Xa/IIa inaktivasyonu) | Yan Etki: HIT Tip 2, kanama | Kontrendikasyon: Şiddetli trombositopeni\n• Morfin: Santral Sinir Sistemi Mü-Opioid reseptör agonisti | Yan Etki: Solunum depresyonu, sedasyon, bulantı | Kontrendikasyon: Şiddetli KOAH, solunum yetmezliği", "max_points": 10 },
        { "id": 7, "category": "Havayolu Yönetimi & RSI", "question": "Kardiyak açıdan anstabil bir hastada acil anestezi indüksiyonu ve havayolu emniyeti nasıl sağlanır?", "ideal_answer": "%100 O2 ile 3-5 dk preoksijenizasyon, kardiyostabil Etomidat (0.2-0.3 mg/kg) + Fentanil/Süfentanil, Rokuronyum (1.0 mg/kg) ile hızlı seri indüksiyon (RSI) ve videolaringoskopi eşliğinde entübasyon.", "max_points": 10 },
        { "id": 8, "category": "Cihaz Kontrolü & Hazırlık", "question": "DGAI standartlarına göre anesteziye başlamadan önce yapılması gereken cihaz ve oda hazırlığı basamakları nelerdir?", "ideal_answer": "1. Anestezi cihazı kaçak ve ventilatör testi, 2. Narkoz gaz tahliye (NGA) kontrolü, 3. Acil O2 tüpü ve manuel balon (Ambu), 4. Vakum/aspiratör çalışırlığı (Yankauer), 5. Acil ilaçlar (Atropin, Akrinor, Noradrenalin).", "max_points": 10 },
        { "id": 9, "category": "Acil Durum & Komplikasyon Yönetimi", "question": "Erken dönemde (ilk 24 saat) gelişebilecek ölümcül aritmi ve mekanik komplikasyonlar nelerdir?", "ideal_answer": "Ventriküler Fibrilasyon (VF) / VT, Kardiyojenik Şok, Akut Sol Ventrikül Yetmezliği ve Akciğer Ödemi, Papiller Adale Rüptürüne bağlı Akut Mitral Yetersizliği.", "max_points": 10 },
        { "id": 10, "category": "Monitörizasyon & Vital Bulgular", "question": "Hastanın SpO2 değeri %91'dir. Oksijen tedavisi başlama kriteri nedir ve neden hiperoksiden kaçınılmalıdır?", "ideal_answer": "Kılavuzlara göre SpO2 < %90 olmadıkça rutin oksijen verilmemelidir. Gereksiz hiperoksi koroner vazokonstriksiyona yol açarak serbest oksijen radikali ve reperfüzyon hasarını artırabilir.", "max_points": 10 },
        { "id": 11, "category": "Hasta Pozisyonu & Narkotik Belgeleme", "question": "Narkotik ilaçların yasal belgelenmesi (BtMG) ve ameliyat masasında hasta pozisyon güvenliği nasıl sağlanır?", "ideal_answer": "BtMG kuralları gereği kırmızı reçeteli narkotikler (Morfin, Fentanil) 4-Göz Prensibiyle iki sağlık personeli tarafından çekilir ve kayıt defterine işlenir. Pozisyonda 30° baş yukarı ve sinir bası koruması sağlanır.", "max_points": 10 },
        { "id": 12, "category": "Derlenme Odası (Aufwachraum) & Teslim", "question": "Derlenme odasında (AWR) hastanın servise nakil kriterleri nelerdir?", "ideal_answer": "Stabil hemodinami (TA, Nabız), oda havasında SpO2 > %94, kontrol altına alınmış ağrı (NRS < 3), ponksiyon bölgesinde hematom/kanama olmaması, motor ve duyu reflekslerinin tam geri dönmesi (Aldrete Skoru > 9).", "max_points": 10 }
    ]

    return {
        "case_id": str(uuid.uuid4()),
        "source_type": "web",
        "german": {
            "title": f"Akuter klinischer Fall: {topic} (FSP / KP Prüfungssimulation)",
            "patient_profile": { "age": "63", "gender": "männlich", "chief_complaint": "Retrosternaler Vernichtungsschmerz seit 1 Stunde" },
            "patient_story": "Ein 63-jähriger Patient stellt sich notfallmäßig mit seit ca. 60 Minuten bestehenden, stärksten retrosternalen Druck- und Vernichtungsschmerzen vor. Die Schmerzen strahlen in den linken Arm, die Schulter und den Unterkiefer aus. Begleitend bestehen vegetative Symptome wie Kaltschweißigkeit, Übelkeit und Tachypnoe. Vorerkrankungen: Arterielle Hypertonie seit 10 Jahren, Nikotinabusus (35 pack years).",
            "vital_and_findings": "RR: 155/95 mmHg, HF: 104/min rhythmisch, SpO2: 91% unter Raumluft, Temp: 36.8°C. Auskultation Cor: rein, tachykard. Pulmo: vesikuläres Atemgeräusch bds., keine Rasselgeräusche. 12-Kanal-EKG: Signifikante ST-Strecken-Hebungen in den Ableitungen V1-V4 mit spiegelbildlichen Senkungen in II, III, aVF.",
            "anamnesis_summary": "63-jähriger männlicher Patient mit akutem retrosternalem Vernichtungsschmerz und vegetativer Begleitsymptomatik bei bekanntem kardiovaskulärem Risikoprofil (art. Hypertonie, Nikotin). Im Notfall-EKG zeigt sich das Bild eines akuten anterioren ST-Hebungsinfarkts (STEMI). Indikation zur sofortigen Koronarangiographie mit PCI.",
            "questions": de_questions
        },
        "turkish": {
            "title": f"Klinik Vaka Simülasyonu: {topic}",
            "patient_profile": { "age": "63", "gender": "Erkek", "chief_complaint": "1 saattir süren şiddetli göğüs ağrısı" },
            "patient_story": "63 yaşında erkek hasta, yaklaşık 1 saat önce başlayan sol kola, omuza ve alt çeneye yayılan şiddetli retrosternal baskı tarzında göğüs ağrısı ile acil servise başvurdu. Ağrıya soğuk terleme, bulantı ve nefes darlığı eşlik ediyor. Özgeçmişinde 10 yıldır Esansiyel Hipertansiyon ve 35 paket/yıl sigara öyküsü mevcut.",
            "vital_and_findings": "TA: 155/95 mmHg, Nabız: 104/dk, Solunum: 24/dk, SpO2: %91 (oda havasında), Ateş: 36.8°C. Kardiyak odyogram: Taşikardik, ek ses/üfürüm yok. Akciğer: Doğal veziküler solunum sesleri, ral yok. 12 Derivasyonlu EKG: V1-V4 derivasyonlarında belirgin ST elevasyonu ve inferior derivasyonlarda resiprokal ST depresyonu.",
            "anamnesis_summary": "Kardiyovasküler risk faktörleri bulunan (HT, Sigara) 63 yaşında erkek hasta, tipik retrosternal göğüs ağrısı ve soğuk terleme ile başvurdu. Acil çekilen EKG'sinde Akut Anterior ST Yükselmeli Miyokard Enfarktüsü (STEMI) saptandı. Acil Primer Perkütan Koroner Girişim (PKG) endikasyonu mevcuttur.",
            "questions": tr_questions
        },
        "title": f"Akuter Fall: {topic}" if language.lower() == "de" else f"Klinik Vaka: {topic}",
        "patient_profile": { "age": "63", "gender": "männlich" if language.lower() == "de" else "Erkek", "chief_complaint": "Retrosternaler Schmerz" },
        "patient_story": "Ein 63-jähriger Patient..." if language.lower() == "de" else "63 yaşında erkek hasta...",
        "vital_and_findings": "RR: 155/95 mmHg..." if language.lower() == "de" else "TA: 155/95 mmHg...",
        "anamnesis_summary": "63-jähriger Patient..." if language.lower() == "de" else "63 yaşında erkek hasta...",
        "questions": de_questions if language.lower() == "de" else tr_questions
    }
