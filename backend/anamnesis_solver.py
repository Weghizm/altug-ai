from __future__ import annotations
import os
import re
import json
import httpx
from typing import Dict, Any, Optional, List

ANAMNESIS_PROMPT_TR = """Sen uzman bir tıp akademisyeni ve klinik vaka değerlendiricisisin.
Sana verilen hasta anamnezini, hekim notunu, epikriz belgesini, soru görselini veya klinik vaka metnini titizlikle ve sistematik olarak çöz ve gerekçelendir.

### YÖNERGE:
1. Görseldeki/metindeki tüm klinik verileri (yaş, cinsiyet, ana şikayet, anamnez, özgeçmiş, risk faktörleri, vital bulgular, fizik muayene ve varsa laboratuvar/görüntüleme) yapılandır.
2. En olası Ön Tanıyı (Verdachtsdiagnose) belirle ve patofizyolojik gerekçesini açıkla.
3. En az 3 adet önemli Ayırıcı Tanıyı (Differentialdiagnosen) ve neden düşünüldüğünü/nasıl ayırt edileceğini belirt.
4. İstenmesi gereken ilk basamak ve ileri tetkikleri (Laboratuvar, EKG, Radyoloji, Biyobelirteçler) sırala.
5. Acil müdahale ve idame tedavi planını (Farmakoterapi, girişimsel yaklaşım, monitörizasyon) yaz.
6. Konunun kilit öğrenme noktasını (Klinik İpucu / Merksatz) özetle.

### ÇIKTI FORMATI:
Yanıtını SADECE aşağıdaki JSON formatında saf JSON olarak ver (Markdown kod bloğu ekleme):

{
  "title": "Vakanın / Sorunun Başlığı",
  "anamnesis_summary": "Hasta şikayeti, özgeçmiş, semptomların yapılandırılmış klinik özeti...",
  "suspected_diagnosis": {
    "diagnosis": "Ön Tanı Adı",
    "rationale": "Bu tanının konulmasındaki en güçlü klinik ve patolojik gerekçeler..."
  },
  "differential_diagnoses": [
    {
      "diagnosis": "Ayırıcı Tanı 1",
      "distinction": "Neden düşünüldü ve nasıl ayırt edilir?"
    },
    {
      "diagnosis": "Ayırıcı Tanı 2",
      "distinction": "Neden düşünüldü ve nasıl ayırt edilir?"
    }
  ],
  "recommended_diagnostics": [
    "1. Acil 12 Derivasyonlu EKG...",
    "2. Kardiyak enzimler (Troponin I/T)...",
    "3. ..."
  ],
  "therapy_plan": {
    "emergency_management": "İlk acil yaklaşım ve stabilizasyon adımları...",
    "definitive_treatment": "Kesin ve idame tedavi planı..."
  },
  "detailed_explanation": "Vakanın veya klasik sorunun adım adım ayrıntılı çözümü ve açıklaması...",
  "clinical_pearls": "Bu vakadan çıkarılması gereken en kritik klinik mesaj."
}
"""

ANAMNESIS_PROMPT_DE = """Du bist ein erfahrener medizinischer Facharzt und Prüfer für deutsche Approbationsprüfungen (Fachsprachprüfung - FSP & Kenntnisprüfung - KP).
Analysiere und löse den bereitgestellten Anamnesebogen, Arztbrief, klinischen Fall oder das Fragenfoto systematisch auf Deutsch nach aktuellen deutschen Leitlinien (AWMF, DGK, DGIM).

### ANWEISUNGEN:
1. Erfasse alle klinischen Informationen strukturiert (Leitsymptom, aktuelle Anamnese, Vorerkrankungen, Medikamente, Risikofaktoren, Vitalparameter, körperliche Untersuchung, Befunde).
2. Formuliere eine fundierte Verdachtsdiagnose mit präziser pathophysiologischer Begründung.
3. Nenne mindestens 3 wichtige Differentialdiagnosen (DD) und erkläre die klinische Abgrenzung.
4. Erstelle einen strukturierten Diagnostikplan (Notfall-Labor, Bildgebung, weiterführende apparative Diagnostik).
5. Definiere den Akut- und Dauertherapieplan (Erstmaßnahmen, Pharmakotherapie mit Wirkstoffen, Interventionen).
6. Formuliere einen praxisrelevanten klinischen Merksatz.

### AUSGABEFORMAT:
Antworte AUSSCHLIESSLICH im folgenden reinen JSON-Format (kein Markdown-Codeblock):

{
  "title": "Titel des Falls / der Frage",
  "anamnesis_summary": "Strukturierte Anamnese (Aktuelle Beschwerden, Vorgeschichte, Befunde)...",
  "suspected_diagnosis": {
    "diagnosis": "Verdachtsdiagnose",
    "rationale": "Ausführliche pathophysiologische und klinische Begründung..."
  },
  "differential_diagnoses": [
    {
      "diagnosis": "Differentialdiagnose 1",
      "distinction": "Klinische Begründung und diagnostische Abgrenzung..."
    },
    {
      "diagnosis": "Differentialdiagnose 2",
      "distinction": "Klinische Begründung und diagnostische Abgrenzung..."
    }
  ],
  "recommended_diagnostics": [
    "1. Notfall-EKG (12-Kanal)...",
    "2. Notfalllabor (Troponin, D-Dimer, BGA)...",
    "3. ..."
  ],
  "therapy_plan": {
    "emergency_management": "Akutmaßnahmen und Notfalltherapie...",
    "definitive_treatment": "Kausale Therapie und Weiterbehandlung..."
  },
  "detailed_explanation": "Schritt-für-Schritt klinische Falllösung und Begründung...",
  "clinical_pearls": "Wichtiger klinischer Merksatz für die Praxis und Prüfung."
}
"""

async def solve_anamnesis_case(
    anamnesis_text: str = "",
    image_base64: Optional[str] = None,
    image_mime_type: Optional[str] = "image/jpeg",
    images: Optional[List[Dict[str, str]]] = None,
    language: str = "tr",
    api_key: str = "",
    model_name: str = "gemini-3.6-flash"
) -> Dict[str, Any]:
    """
    Anamnez görsellerini (tek veya çoklu) veya metnini Gemini 3.6 Flash ile derinlemesine analiz eder (TR / DE).
    """
    system_prompt = ANAMNESIS_PROMPT_DE if language.lower() == "de" else ANAMNESIS_PROMPT_TR
    clean_model = (model_name or "gemini-3.6-flash").replace("models/", "").strip()

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    user_text = f"{system_prompt}\n\n"
    if anamnesis_text.strip():
        user_text += f"### GİRİLEN ANAMNEZ / VAKA METNİ:\n\"\"\"\n{anamnesis_text.strip()}\n\"\"\"\n\n"
    user_text += "Lütfen yukarıdaki görsel(leri) ve/veya vaka metnini birlikte ve kapsamlı şekilde analiz ederek JSON formatında çözümü hazırla."

    parts = [{"text": user_text}]
    
    # Çoklu görsel listesi varsa ekle
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

    models_to_try = [clean_model]
    for alt in ["gemini-3.7-flash", "gemini-3.6-pro", "gemini-3.5-flash", "gemini-1.5-flash"]:
        if alt not in models_to_try:
            models_to_try.append(alt)

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": parts}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }

    last_error = None
    async with httpx.AsyncClient(timeout=120.0) as client:
        for current_model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={api_key}"
            try:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        res_parts = candidates[0].get("content", {}).get("parts", [])
                        if res_parts:
                            raw_text = res_parts[0].get("text", "").strip()
                            clean_text = re.sub(r'^```(json)?', '', raw_text, flags=re.MULTILINE)
                            clean_text = re.sub(r'```$', '', clean_text, flags=re.MULTILINE).strip()
                            return json.loads(clean_text)
                last_error = f"Model {current_model} Hatası ({response.status_code}): {response.text}"
            except Exception as e:
                last_error = f"Model {current_model} Hatası: {str(e)}"

    raise RuntimeError(last_error or "Anamnez analizi için denenen tüm Gemini modellerinden yanıt alınamadı.")

def generate_mock_anamnesis_solution(language: str = "tr") -> Dict[str, Any]:
    """
    API anahtarı olmadan veya test için örnek anamnez çözümü.
    """
    if language.lower() == "de":
        return {
            "title": "Akutes Koronarsyndrom (STEMI) - Fallanalyse",
            "anamnesis_summary": "62-jähriger männlicher Patient mit akut einsetzenden, retrosternalen Druckschmerzen mit Ausstrahlung in den linken Arm und Unterkiefer seit 45 Minuten. Begleitsymptome: Kaltschweißigkeit, Dyspnoe, Übelkeit. Vorerkrankungen: Arterielle Hypertonie, Nikotinabusus (30 py).",
            "suspected_diagnosis": {
                "diagnosis": "Akuter Myokardinfarkt mit ST-Hebung (STEMI) der Vorderwand",
                "rationale": "Typischer Vernichtungsschmerz mit typischer Ausstrahlung, vegetativer Begleitsymptomatik und kardiovaskulärem Risikoprofil. Im EKG signifikante ST-Hebungen in V1-V4."
            },
            "differential_diagnoses": [
                {
                    "diagnosis": "Akute Aortendissektion (Typ Stanford A)",
                    "distinction": "Reißender Schmerz mit Ausstrahlung in den Rücken, Blutdruckdifferenz zwischen den Armen. Ausschluss mittels CT-Angiographie."
                },
                {
                    "diagnosis": "Lungenarterienembolie (LAE)",
                    "distinction": "Plötzliche Dyspnoe, pleuritischer Schmerz, Sinustachykardie oder SI-QIII-Typ. Bestimmung von D-Dimeren und CT-Pulmonalisangiographie."
                }
            ],
            "recommended_diagnostics": [
                "1. Sofortiges 12-Kanal-EKG (innerhalb von 10 Minuten)",
                "2. Notfall-Labor (hs-Troponin T/I, CK, CK-MB, D-Dimer, BGA, Elektrolyte)",
                "3. Notfall-Echokardiographie (Wandbewegungsstörungen, Aortenwurzel)",
                "4. Notfall-Koronarangiographie (Herzkatheterlabor)"
            ],
            "therapy_plan": {
                "emergency_management": "Oberkörperhochlagerung, Sauerstoff bei SpO2 < 90%, kontinuierliches Monitoring, 2x großlumige venöse Zugänge, Schmerztherapie (Morphin i.v.), Sedierung bei Angst.",
                "definitive_treatment": "Duale Thrombozytenaggregationshemmung (DAPT: ASS 150-300 mg p.o./i.v. + Ticagrelor 180 mg) + Heparin i.v. Unverzügliche perkutane Koronarintervention (PCI, Zielzeit < 90-120 min)."
            },
            "detailed_explanation": "Bei dem vorliegenden Patienten handelt es sich um einen zeitkritischen kardialen Notfall. Die Diagnose eines STEMI erfordert keine Troponin-Werte vor der Reperfusion; die Indikation zur sofortigen Koronarangiographie wird primär anhand des klinischen Bildes und des EKGs gestellt.",
            "clinical_pearls": "Time is muscle! Bei V.a. STEMI darf der Transport ins Herzkatheterlabor durch keine weiteren diagnostischen Maßnahmen verzögert werden."
        }
    else:
        return {
            "title": "Akut Koroner Sendrom (STEMI) - Detaylı Anamnez ve Vaka Çözümü",
            "anamnesis_summary": "62 yaşında erkek hasta, 45 dakika önce ani başlayan, göğüs arkasında baskı tarzında (retrosternal) sol kola ve çeneye yayılan şiddetli göğüs ağrısı ile başvurdu. Eşlik eden semptomlar: Soğuk terleme, dispne ve bulantı. Özgeçmiş: Hipertansiyon, 30 paket/yıl sigara.",
            "suspected_diagnosis": {
                "diagnosis": "Akut ST Yükselmeli Ön Duvar Miyokard Enfarktüsü (Anterior STEMI)",
                "rationale": "Baskı tarzında tipik anjinal ağrı, sol kol/çene yayılımı, vejetatif semptomlar ve yüksek kardiyovasküler risk faktörleri tablosuyla tam uyumludur."
            },
            "differential_diagnoses": [
                {
                    "diagnosis": "Aort Diseksiyonu (Stanford Tip A)",
                    "distinction": "Sırta vuran yırtıcı ağrı, kollar arası tansiyon farkı. Kontrastlı Toraks BT anjiyo ile dışlanır."
                },
                {
                    "diagnosis": "Pulmoner Emboli",
                    "distinction": "Plöretik ağrı, taşipne, hipoksi, D-Dimer yüksekliği ve EKG'de S1Q3T3 paterni ile ayırt edilir."
                }
            ],
            "recommended_diagnostics": [
                "1. İlk 10 dakikada 12 Derivasyonlu EKG",
                "2. Kardiyak Biyobelirteçler (Yüksek duyarlılıklı Troponin I/T, CK-MB)",
                "3. Yatak Başı Ekokardiyografi (Duvar hareket kusurları)",
                "4. Acil Koroner Anjiyografi (İlk 120 dakika içinde primer PKG)"
            ],
            "therapy_plan": {
                "emergency_management": "Monitörizasyon, SpO2 < 90% ise O2, İV damar yolu, Morfin 2-4 mg İV (ağrı ve anksiyete için), Nitrogliserin (hipotansiyon yoksa).",
                "definitive_treatment": "İkili Antiagregan Tedavi (Aspirin 300 mg çiğnetme + Tikagrelor 180 mg) + Unfraksiyone Heparin 70-100 IU/kg. Derhal Primer Perkütan Koroner Girişim (PKG)."
            },
            "detailed_explanation": "Klinik yaklaşımda STEMI tanısı konduğu anda laboratuvar sonucu beklenmeden anjiyo ünitesi aktive edilmelidir. Süreç zamanla yarışır (Time is Muscle).",
            "clinical_pearls": "STEMI'de reperfüzyon için biyobelirteç sonucu beklenmez; EKG ST elevasyonu ve tipik klinik doğrudan anjiyo endikasyonudur."
        }

async def translate_anamnesis_analysis(
    analysis_data: Dict[str, Any],
    target_language: str = "de",
    api_key: str = "",
    model_name: str = "gemini-3.6-flash"
) -> Dict[str, Any]:
    """
    Mevcut vaka çözümünü tek tıkla diğer dile (Almanca <-> Türkçe) eksiksiz ve terminolojiye uygun çevirir.
    """
    is_de = target_language.lower() == "de"
    clean_model = (model_name or "gemini-3.6-flash").replace("models/", "").strip()

    if is_de:
        prompt = f"""Du bist ein hochqualifizierter medizinischer Fachübersetzer und Prüfer für deutsche Approbationsprüfungen (FSP / Kenntnisprüfung).
Übersetze und adaptiere die folgende klinische Fallanalyse vollständig und fachgerecht ins DEUTSCHE.
Verwende präzise deutsche medizinische Nomenklatur und Fachbegriffe (z.B. Verdachtsdiagnose, Differentialdiagnosen, Notfalltherapie, Leitsymptom, Aufklärungspflicht, Körperverletzung usw.).

### ZU ÜBERSETZENDE FALLANALYSE (JSON):
\"\"\"
{json.dumps(analysis_data, ensure_ascii=False, indent=2)}
\"\"\"

### AUSGABEFORMAT:
Antworte AUSSCHLIESSLICH im exakt gleichen JSON-Schema auf Deutsch (reines JSON ohne Markdown-Codeblock):
"""
    else:
        prompt = f"""Sen uzman bir tıp hekimi ve tıbbi çevirmensin.
Aşağıdaki klinik vaka analizini eksiksiz, anlaşılır ve Türk tıbbi terminolojisine uygun olarak TÜRKÇEYE çevir ve uyarla.

### ÇEVRİLECEK VAKA ANALİZİ (JSON):
\"\"\"
{json.dumps(analysis_data, ensure_ascii=False, indent=2)}
\"\"\"

### ÇIKTI FORMATI:
Birebir aynı JSON şemasında Türkçe olarak saf JSON ver:
"""

    models_to_try = [clean_model]
    for alt in ["gemini-3.7-flash", "gemini-3.6-pro", "gemini-3.5-flash", "gemini-1.5-flash"]:
        if alt not in models_to_try:
            models_to_try.append(alt)

    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json"
        }
    }

    last_error = None
    async with httpx.AsyncClient(timeout=120.0) as client:
        for current_model in models_to_try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{current_model}:generateContent?key={api_key}"
            try:
                response = await client.post(url, headers=headers, json=payload)
                if response.status_code == 200:
                    data = response.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            raw_text = parts[0].get("text", "").strip()
                            clean_text = re.sub(r'^```(json)?', '', raw_text, flags=re.MULTILINE)
                            clean_text = re.sub(r'```$', '', clean_text, flags=re.MULTILINE).strip()
                            return json.loads(clean_text)
                last_error = f"Model {current_model} Hatası ({response.status_code}): {response.text}"
            except Exception as e:
                last_error = f"Model {current_model} Hatası: {str(e)}"

    raise RuntimeError(last_error or "Çeviri için denenen tüm Gemini modellerinden yanıt alınamadı.")

