import io
import os
import html
from typing import Dict, Any
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
)
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Windows & Linux Unicode Font Kaydı (Türkçe ve Almanca Karakter Desteği için)
FONT_NAME = 'Helvetica'
FONT_BOLD = 'Helvetica-Bold'

linux_font_candidates = [
    ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),
    ('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'),
    ('/usr/share/fonts/truetype/freefont/FreeSans.ttf', '/usr/share/fonts/truetype/freefont/FreeSansBold.ttf')
]

try:
    if os.path.exists('C:/Windows/Fonts/arial.ttf') and os.path.exists('C:/Windows/Fonts/arialbd.ttf'):
        pdfmetrics.registerFont(TTFont('AppArial', 'C:/Windows/Fonts/arial.ttf'))
        pdfmetrics.registerFont(TTFont('AppArialBold', 'C:/Windows/Fonts/arialbd.ttf'))
        FONT_NAME = 'AppArial'
        FONT_BOLD = 'AppArialBold'
    else:
        for reg_path, bold_path in linux_font_candidates:
            if os.path.exists(reg_path) and os.path.exists(bold_path):
                pdfmetrics.registerFont(TTFont('AppUnicode', reg_path))
                pdfmetrics.registerFont(TTFont('AppUnicodeBold', bold_path))
                FONT_NAME = 'AppUnicode'
                FONT_BOLD = 'AppUnicodeBold'
                break
except Exception as e:
    pass

def clean_html_text(text: str) -> str:
    """Metni ReportLab Paragraph uyumlu hale getirir."""
    if not text:
        return ""
    text = str(text)
    text = html.escape(text)
    text = text.replace("&lt;b&gt;", "<b>").replace("&lt;/b&gt;", "</b>")
    text = text.replace("&lt;br/&gt;", "<br/>").replace("&lt;br&gt;", "<br/>")
    text = text.replace("\n", "<br/>")
    return text

def generate_4page_booklet_pdf(case_data: Dict[str, Any]) -> bytes:
    buffer = io.BytesIO()
    
    # A4: 210 x 297 mm. Margins: 8 mm
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        leftMargin=8*mm,
        rightMargin=8*mm,
        topMargin=8*mm,
        bottomMargin=8*mm
    )
    
    usable_width = 210*mm - 16*mm # 194 mm
    col_width = (usable_width - 4*mm) / 2 # ~95 mm
    
    # Stiller
    header_style = ParagraphStyle(
        'HeaderStyle',
        fontName=FONT_BOLD,
        fontSize=8.5,
        leading=10.5,
        textColor=colors.black
    )
    
    title_style = ParagraphStyle(
        'TitleStyle',
        fontName=FONT_BOLD,
        fontSize=9.5,
        leading=11.5,
        textColor=colors.black
    )
    
    label_style = ParagraphStyle(
        'LabelStyle',
        fontName=FONT_BOLD,
        fontSize=7.5,
        leading=9,
        textColor=colors.black
    )
    
    body_style = ParagraphStyle(
        'BodyStyle',
        fontName=FONT_NAME,
        fontSize=6.8,
        leading=8.2,
        textColor=colors.black
    )
    
    story = []
    
    de = case_data.get('german', case_data)
    tr = case_data.get('turkish', case_data)
    
    # =========================================================================
    # 1. SAYFA: 🇩🇪 DEUTSCH - ANAMNESE & 12 FRAGEN
    # =========================================================================
    story.append(Paragraph('🇩🇪 SEITE 1/4: KLINISCHER FALLBERICHT (ANAMNESE &amp; 12 PRÜFUNGSFRAGEN)', header_style))
    story.append(Spacer(1, 1.5*mm))
    
    # Başlık ve Profil
    p_info = de.get('patient_profile', {})
    prof_text = f"Alter: {p_info.get('age', '-')} J., Geschlecht: {p_info.get('gender', '-')} | Leitsymptom: {clean_html_text(p_info.get('chief_complaint', '-'))}"
    title_p = Paragraph(f"<b>{clean_html_text(de.get('title', 'Klinischer Fall'))}</b><br/><font size=6.5 color='#333333'>{prof_text}</font>", title_style)
    
    t_prof = Table([[title_p]], colWidths=[usable_width])
    t_prof.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.black),
        ('BACKGROUND', (0,0), (-1,-1), colors.white),
        ('PADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_prof)
    story.append(Spacer(1, 1*mm))
    
    # Anamnese & Befunde
    anamnese_text = f"<b>Aktuelle Anamnese &amp; Vorgeschichte:</b><br/>{clean_html_text(de.get('patient_story', ''))}"
    befunde_text = f"<b>Vitalparameter &amp; Befunde:</b><br/>{clean_html_text(de.get('vital_and_findings', ''))}"
    
    p_ana = Paragraph(anamnese_text, body_style)
    p_bef = Paragraph(befunde_text, body_style)
    
    t_story = Table([[p_ana], [p_bef]], colWidths=[usable_width])
    t_story.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.8, colors.black),
        ('LINEBELOW', (0,0), (-1,0), 0.5, colors.HexColor('#94a3b8')),
        ('PADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(t_story)
    story.append(Spacer(1, 1*mm))
    
    story.append(Paragraph('12 PRÜFUNGSFRAGEN ZUM FALL:', label_style))
    story.append(Spacer(1, 0.8*mm))
    
    # 12 Soru - 2 Sütunlu Izgara (6 Sol, 6 Sağ)
    de_questions = de.get('questions', [])
    q_left = de_questions[:6]
    q_right = de_questions[6:12]
    
    grid_data = []
    for i in range(max(len(q_left), len(q_right))):
        col1 = ''
        col2 = ''
        if i < len(q_left):
            ql = q_left[i]
            col1 = Paragraph(f"<b>Frage #{ql.get('id')}: {clean_html_text(ql.get('category'))}</b><br/>{clean_html_text(ql.get('question'))}", body_style)
        if i < len(q_right):
            qr = q_right[i]
            col2 = Paragraph(f"<b>Frage #{qr.get('id')}: {clean_html_text(qr.get('category'))}</b><br/>{clean_html_text(qr.get('question'))}", body_style)
        grid_data.append([col1, col2])
    
    if not grid_data:
        grid_data = [['', '']]
        
    t_qgrid = Table(grid_data, colWidths=[col_width, col_width])
    t_qgrid.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.8, colors.black),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#94a3b8')),
        ('PADDING', (0,0), (-1,-1), 2.2),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_qgrid)
    
    # =========================================================================
    # 2. SAYFA: 🇩🇪 DEUTSCH - STRUKTURIERTE EPIKRISE & 12 MUSTERLÖSUNGEN
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph('🇩🇪 SEITE 2/4: STRUKTURIERTE EPIKRISE &amp; 12 MUSTERLÖSUNGEN (DGAI-STANDARD)', header_style))
    story.append(Spacer(1, 1.5*mm))
    
    # Epikrise Box
    epikrise_text = f"<b>Strukturierte Anamnese-Zusammenfassung (Arztbrief / Übergabe):</b><br/>{clean_html_text(de.get('anamnesis_summary', de.get('patient_story', '')))}"
    p_epi = Paragraph(epikrise_text, body_style)
    t_epi = Table([[p_epi]], colWidths=[usable_width])
    t_epi.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.black),
        ('PADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(t_epi)
    story.append(Spacer(1, 1*mm))
    
    story.append(Paragraph('12 MUSTERLÖSUNGEN DER PRÜFUNGSFRAGEN:', label_style))
    story.append(Spacer(1, 0.8*mm))
    
    # 12 Musterlösungen - 2 Sütunlu Izgara
    sol_grid_de = []
    for i in range(max(len(q_left), len(q_right))):
        col1 = ''
        col2 = ''
        if i < len(q_left):
            ql = q_left[i]
            col1 = Paragraph(f"<b>Frage #{ql.get('id')}: {clean_html_text(ql.get('category'))}</b> ({ql.get('max_points', 10)} Pkt)<br/><b>Q:</b> {clean_html_text(ql.get('question'))}<br/><b>Lösung:</b> {clean_html_text(ql.get('ideal_answer'))}", body_style)
        if i < len(q_right):
            qr = q_right[i]
            col2 = Paragraph(f"<b>Frage #{qr.get('id')}: {clean_html_text(qr.get('category'))}</b> ({qr.get('max_points', 10)} Pkt)<br/><b>Q:</b> {clean_html_text(qr.get('question'))}<br/><b>Lösung:</b> {clean_html_text(qr.get('ideal_answer'))}", body_style)
        sol_grid_de.append([col1, col2])
        
    if not sol_grid_de:
        sol_grid_de = [['', '']]
        
    t_sol_de = Table(sol_grid_de, colWidths=[col_width, col_width])
    t_sol_de.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.8, colors.black),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#94a3b8')),
        ('PADDING', (0,0), (-1,-1), 2),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_sol_de)
    
    # =========================================================================
    # 3. SAYFA: 🇹🇷 TÜRKÇE - ANAMNEZ & 12 SORU
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph('🇹🇷 SAYFA 3/4: KLİNİK VAKA ÖYKÜSÜ (TÜRKÇE ANAMNEZ &amp; 12 SORU)', header_style))
    story.append(Spacer(1, 1.5*mm))
    
    p_info_tr = tr.get('patient_profile', {})
    prof_text_tr = f"Yaş: {p_info_tr.get('age', '-')} | Cinsiyet: {p_info_tr.get('gender', '-')} | Şikayet: {clean_html_text(p_info_tr.get('chief_complaint', '-'))}"
    title_p_tr = Paragraph(f"<b>{clean_html_text(tr.get('title', 'Klinik Vaka'))}</b><br/><font size=6.5 color='#333333'>{prof_text_tr}</font>", title_style)
    
    t_prof_tr = Table([[title_p_tr]], colWidths=[usable_width])
    t_prof_tr.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.black),
        ('PADDING', (0,0), (-1,-1), 3),
    ]))
    story.append(t_prof_tr)
    story.append(Spacer(1, 1*mm))
    
    anamnese_text_tr = f"<b>Hasta Anamnezi ve Geliş Hikayesi:</b><br/>{clean_html_text(tr.get('patient_story', ''))}"
    befunde_text_tr = f"<b>Fizik Muayene ve Vital Bulgular:</b><br/>{clean_html_text(tr.get('vital_and_findings', ''))}"
    
    p_ana_tr = Paragraph(anamnese_text_tr, body_style)
    p_bef_tr = Paragraph(befunde_text_tr, body_style)
    
    t_story_tr = Table([[p_ana_tr], [p_bef_tr]], colWidths=[usable_width])
    t_story_tr.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.8, colors.black),
        ('LINEBELOW', (0,0), (-1,0), 0.5, colors.HexColor('#94a3b8')),
        ('PADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(t_story_tr)
    story.append(Spacer(1, 1*mm))
    
    story.append(Paragraph('VAKAYLA İLGİLİ 12 KLİNİK SORU:', label_style))
    story.append(Spacer(1, 0.8*mm))
    
    tr_questions = tr.get('questions', [])
    q_left_tr = tr_questions[:6]
    q_right_tr = tr_questions[6:12]
    
    grid_data_tr = []
    for i in range(max(len(q_left_tr), len(q_right_tr))):
        col1 = ''
        col2 = ''
        if i < len(q_left_tr):
            ql = q_left_tr[i]
            col1 = Paragraph(f"<b>Soru #{ql.get('id')}: {clean_html_text(ql.get('category'))}</b><br/>{clean_html_text(ql.get('question'))}", body_style)
        if i < len(q_right_tr):
            qr = q_right_tr[i]
            col2 = Paragraph(f"<b>Soru #{qr.get('id')}: {clean_html_text(qr.get('category'))}</b><br/>{clean_html_text(qr.get('question'))}", body_style)
        grid_data_tr.append([col1, col2])
        
    if not grid_data_tr:
        grid_data_tr = [['', '']]
        
    t_qgrid_tr = Table(grid_data_tr, colWidths=[col_width, col_width])
    t_qgrid_tr.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.8, colors.black),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#94a3b8')),
        ('PADDING', (0,0), (-1,-1), 2.2),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_qgrid_tr)
    
    # =========================================================================
    # 4. SAYFA: 🇹🇷 TÜRKÇE - EPİKRİZ & 12 MODEL ÇÖZÜM
    # =========================================================================
    story.append(PageBreak())
    story.append(Paragraph('🇹🇷 SAYFA 4/4: YAPILANDIRILMIŞ EPİKRİZ ÖZETİ &amp; 12 MODEL ÇÖZÜM', header_style))
    story.append(Spacer(1, 1.5*mm))
    
    epikrise_text_tr = f"<b>Yapılandırılmış Anamnez ve Epikriz Özeti:</b><br/>{clean_html_text(tr.get('anamnesis_summary', tr.get('patient_story', '')))}"
    p_epi_tr = Paragraph(epikrise_text_tr, body_style)
    t_epi_tr = Table([[p_epi_tr]], colWidths=[usable_width])
    t_epi_tr.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 1, colors.black),
        ('PADDING', (0,0), (-1,-1), 2.5),
    ]))
    story.append(t_epi_tr)
    story.append(Spacer(1, 1*mm))
    
    story.append(Paragraph('12 SORUNUN İDEAL HEKİM MODEL ÇÖZÜMLERİ:', label_style))
    story.append(Spacer(1, 0.8*mm))
    
    sol_grid_tr = []
    for i in range(max(len(q_left_tr), len(q_right_tr))):
        col1 = ''
        col2 = ''
        if i < len(q_left_tr):
            ql = q_left_tr[i]
            col1 = Paragraph(f"<b>Soru #{ql.get('id')}: {clean_html_text(ql.get('category'))}</b> ({ql.get('max_points', 10)} Puan)<br/><b>Soru:</b> {clean_html_text(ql.get('question'))}<br/><b>Model Çözüm:</b> {clean_html_text(ql.get('ideal_answer'))}", body_style)
        if i < len(q_right_tr):
            qr = q_right_tr[i]
            col2 = Paragraph(f"<b>Soru #{qr.get('id')}: {clean_html_text(qr.get('category'))}</b> ({qr.get('max_points', 10)} Puan)<br/><b>Soru:</b> {clean_html_text(qr.get('question'))}<br/><b>Model Çözüm:</b> {clean_html_text(qr.get('ideal_answer'))}", body_style)
        sol_grid_tr.append([col1, col2])
        
    if not sol_grid_tr:
        sol_grid_tr = [['', '']]
        
    t_sol_tr = Table(sol_grid_tr, colWidths=[col_width, col_width])
    t_sol_tr.setStyle(TableStyle([
        ('BOX', (0,0), (-1,-1), 0.8, colors.black),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor('#94a3b8')),
        ('PADDING', (0,0), (-1,-1), 2),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(t_sol_tr)
    
    # PDF'i Derle
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
