import fitz  # PyMuPDF
from pathlib import Path

def create_sample_medical_pdf():
    doc = fitz.open()
    
    # 1. Sayfa: Kapak ve İçindekiler
    page1 = doc.new_page()
    text1 = """KLİNİK TIP VE DERS NOTLARI REHBERİ
Hazırlayan: Sağlık Bilimleri Çalışma Grubu
Sürüm: 2026.1

İÇİNDEKİLER VE TEMEL KONU BAŞLIKLARI:
1. Kardiyovasküler Sistem: Akut Koroner Sendromlar ve Kalp Yetersizliği
2. Solunum Sistemi: Pnömoniler, KOAH ve Akut Dispne Yönetimi
3. Endokrinoloji: Diyabetes Mellitus, Hipoglisemi ve Tiroid Hastalıkları
4. Acil Tıp ve Toksikoloji: Temel ve İleri Yaşam Desteği (BLS/ACLS)
5. Klinik Farmakoloji: Akılcı Antibiyotik ve Analjezik Tedavisi
"""
    page1.insert_text((50, 60), text1, fontsize=12, lineheight=1.4)
    
    # 2. Sayfa: Kardiyoloji
    page2 = doc.new_page()
    text2 = """BÖLÜM 1: KARDİYOVASKÜLER SİSTEM HASTALIKLARI

1.1. Akut Koroner Sendromlar (AKS) ve Tanısal Yaklaşım
Akut koroner sendromlar; ST yükselmeli miyokard enfarktüsü (STEMI), ST yükselmesiz miyokard enfarktüsü (NSTEMI) ve kararsız (unstable) anjina pektoris klinik tablolarını kapsar. 
Göğüs ağrısı ile acile başvuran her hastada ilk 10 dakika içerisinde 12 derivasyonlu EKG çekilmeli ve değerlendirilmelidir.

STEMI tanısında EKG'de en az iki komşu derivasyonda ST elevasyonu (V2-V3 için yaş ve cinsiyete göre değişken, diğer derivasyonlarda >= 1 mm) aranır. 
İlk basamak tedavide antiagregan tedavi (Aspirin 300 mg çiğnetme ve Tikagrelor/Klopidogrel yüklemesi), nitrogliserin (hipotansiyon veya sağ ventrikül enfarktüsü yoksa) ve ağrı kontrolü sağlanır. 
STEMI hastasında reperfüzyon stratejisi primer Perkütan Koroner Girişim (PKG)'dir. PKG süresi 120 dakikayı aşacaksa ilk 30 dakikada fibrinolitik tedavi düşünülmelidir.

1.2. Akut Kalp Yetersizliği ve Akciğer Ödemi
Akut dekompanse kalp yetersizliğinde dispne, ortopne, paroksismal nokturnal dispne ve periferik ödem tipiktir. 
Biyobelirteç olarak BNP ve NT-proBNP tanısal doğruluk sağlar. Tedavide intravenöz kıvrım diüretikleri (Furosemid), vazodilatörler ve solunum desteği (NIMV/CPAP) esastır.
"""
    page2.insert_text((50, 60), text2, fontsize=11, lineheight=1.35)

    # 3. Sayfa: Solunum Sistemi
    page3 = doc.new_page()
    text3 = """BÖLÜM 2: SOLUNUM SİSTEMİ HASTALIKLARI

2.1. Toplumda Gelişen Pnömoni (TGP) ve CURB-65 Skoru
Pnömoni, akciğer parankiminin enfeksiyonudur. En sık rastlanan etken Streptococcus pneumoniae (Pnömokok)'dur. 
Klinik belirtiler; prodüktif öksürük, pürülan balgam, yüksek ateş, plöretik göğüs ağrısı ve rallerdir.

Hastaneye yatış kararında CURB-65 skorlama sistemi kullanılır:
- C (Konfüzyon)
- U (Üre > 19 mg/dL / BUN > 20 mg/dL)
- R (Solunum Sayısı >= 30/dk)
- B (Kan Basıncı: Sistolik < 90 veya Diyastolik <= 60 mmHg)
- 65 (Yaş >= 65)
Skor 0-1 olan hastalar ayaktan, 2 olanlar serviste, 3 ve üzeri olanlar yoğun bakım veya yakın takipte tedavi edilir.

2.2. KOAH Akut Alevlenmesi
Alevlenmede en önemli kriterler Anthonisen kriterleridir: Nefes darlığında artış, balgam miktarında artış ve balgam pürülansında artış. 
Tedavide inhale kısa etkili beta-2 agonistler (SABA) + ipratropium, sistemik kortikosteroid ve pürülans varsa antibiyotik verilir.
"""
    page3.insert_text((50, 60), text3, fontsize=11, lineheight=1.35)

    # 4. Sayfa: Endokrinoloji
    page4 = doc.new_page()
    text4 = """BÖLÜM 3: ENDOKRİNOLOJİ VE METABOLİZMA

3.1. Tip 2 Diyabetes Mellitus ve Glisemik Kontrol
Diyabet tanısı; Açlık plazma glukozu >= 126 mg/dL, OGTT 2. saat glukozu >= 200 mg/dL veya HbA1c >= %6.5 olmasıyla konur. 
İlk basamak farmakoterapi kontrendikasyon (GFR < 30 mL/dk) yoksa Metformin'dir. 
Kardiyovasküler hastalığı veya kalp yetersizliği olan bireylerde SGLT-2 inhibitörleri ve GLP-1 reseptör agonistleri önceliklidir.

3.2. Hipoglisemi Protokolü ve Diyabetik Ketoasidoz (DKA)
Kan glukozunun < 70 mg/dL olması hipoglisemidir. Bilinci açık hastada 15-20 gram hızlı etkili oral glukoz (15 kuralı: al, 15 dk sonra ölç) verilir. 
DKA'da hiperglisemi, metabolik asidoz (anyon açığı yüksek) ve ketonemi mevcuttur. Tedavinin ilk ve en kritik adımı agresif İV izotonik NaCl hidrasyonu ve potasyum takibidir.
"""
    page4.insert_text((50, 60), text4, fontsize=11, lineheight=1.35)

    # 5. Sayfa: Acil & Farmakoloji
    page5 = doc.new_page()
    text5 = """BÖLÜM 4: ACİL TIP VE TOKSİKOLOJİ

4.1. Kardiyopulmoner Resüsitasyon (CPR / ACLS)
Nabızsız arrest ritimleri: Ventriküler Fibrilasyon (VF) ve Nabızsız Ventriküler Taşikardi (pVT) şoklanabilir ritimlerdir; Asistoli ve Nabızsız Elektriksel Aktivite (PEA) şoklanamaz.
Şoklanabilir ritimde defibrilasyon sonrası derhal göğüs basısına devam edilir, 2. şoktan sonra Adrenalin (1 mg İV), 3. şoktan sonra Amiodaron (300 mg İV) uygulanır.
Göğüs kompresyon oranı yetişkinde 30:2, derinlik 5-6 cm, hız 100-120/dk olmalıdır.

BÖLÜM 5: KLİNİK FARMAKOLOJİ VE AKILCI İLAÇ KULLANIMI
- Beta-laktam antibiyotikler (Penisilinler, Sefalosporinler): Bakteri hücre duvar sentezini inhibe eder.
- Florokinolonlar (Siprofloksasin, Levofloksasin): DNA giraz inhibisyonu yapar, tendinit ve QT uzaması riski taşır.
- Aminoglikozidler (Gentamisin, Amikasin): 30S ribozomal alt birime bağlanır; nefrotoksisite ve ototoksisite riski vardır.
"""
    page5.insert_text((50, 60), text5, fontsize=11, lineheight=1.35)

    # TOC (İçindekiler / Bookmarks) ekleme
    toc = [
        [1, "Kapak ve Genel Bakış", 1],
        [1, "Bölüm 1: Kardiyovasküler Sistem Hastalıkları", 2],
        [2, "1.1. Akut Koroner Sendromlar (AKS)", 2],
        [2, "1.2. Akut Kalp Yetersizliği", 2],
        [1, "Bölüm 2: Solunum Sistemi Hastalıkları", 3],
        [2, "2.1. Toplumda Gelişen Pnömoni ve CURB-65", 3],
        [2, "2.2. KOAH Akut Alevlenmesi", 3],
        [1, "Bölüm 3: Endokrinoloji ve Metabolizma", 4],
        [2, "3.1. Tip 2 Diyabetes Mellitus", 4],
        [2, "3.2. Hipoglisemi ve DKA Yönetimi", 4],
        [1, "Bölüm 4: Acil Tıp ve Toksikoloji (CPR/ACLS)", 5],
        [1, "Bölüm 5: Klinik Farmakoloji ve Antibiyotikler", 5],
    ]
    doc.set_toc(toc)
    
    output_path = Path(__file__).resolve().parent.parent / "data" / "uploads" / "ornek_klinik_tip_rehberi.pdf"
    doc.save(str(output_path))
    doc.close()
    print(f"Örnek PDF oluşturuldu: {output_path}")

if __name__ == "__main__":
    create_sample_medical_pdf()
