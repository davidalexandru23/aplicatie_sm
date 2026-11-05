#!/usr/bin/env python3
"""
scripts/patch_m1_templates.py
Unified, surgical OpenXML patch script for Milestone 1 / Pillar 1 templates:
1. EVALUAREA RISCURILOR.docx (risk-evaluare)
2. 13 - ACTIVITATI DE BIROU.docx (ipssm-birou)
3. 11 - ALUNECARI.docx (ipssm-alunecari)
4. Detaliu Tematica loc de munca.docx (training-detaliu-loc-munca)
5. DECIZII.docx (decizii-angajator)
6. Anexa fisa postului SSM.docx (hr-anexa-fisa-post)
7. Informare Protectia Datelor.docx (hr-gdpr-informare)
8. Tabel Cursanti exemplu.xlsx (hygiene-tabel-cursanti) - Sheet1 removal
9. Adeverinta participare.docx (hygiene-adeverinta)

Mirrored to:
- templates_registry/normalized/
- handoff/ssm-template-placeholder-pack/templates/
"""

import io
import os
import re
import shutil
import zipfile
import xml.etree.ElementTree as ET

TARGET_DIRS = [
    os.path.abspath('templates_registry/normalized'),
    os.path.abspath('handoff/ssm-template-placeholder-pack/templates'),
]

def patch_evaluarea_riscurilor(data: bytes) -> bytes:
    in_zip = zipfile.ZipFile(io.BytesIO(data), 'r')
    out_buf = io.BytesIO()
    out_zip = zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED)

    for item in in_zip.infolist():
        content = in_zip.read(item.filename)
        if item.filename == 'word/document.xml':
            text = content.decode('utf-8')

            # 1. P69: replace duplicate adresa with nr reg com and remove static Bucuresti
            p69_old = 'inregistrata la Registrul Comertului Bucuresti sub nr. </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>{PLACEHOLDER_ADRESA_FIRMA}</w:t></w:r>'
            p69_new = 'inregistrata la Registrul Comertului sub nr. </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:b/><w:color w:val="000000"/></w:rPr><w:t>{PLACEHOLDER_NR_REG_COM}</w:t></w:r>'
            if p69_old in text:
                text = text.replace(p69_old, p69_new)
            else:
                assert '{PLACEHOLDER_NR_REG_COM}' in text, 'EVALUAREA RISCURILOR: P69 not found'

            # 2. P336: replace diploma/graduation thesis mention
            p336_old = 'in cadrul lucrarii de absolvire'
            p336_new = 'in cadrul prezentei evaluari de securitate si sanatate in munca'
            if p336_old in text:
                text = text.replace(p336_old, p336_new)

            # 3. P175 & P337: remove stray middle paragraphs
            stray_p175 = '<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:vertAlign w:val="subscript"/><w:color w:val="000000"/></w:rPr></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:vertAlign w:val="subscript"/><w:color w:val="000000"/></w:rPr></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:vertAlign w:val="subscript"/><w:color w:val="000000"/></w:rPr></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr></w:r><w:r><w:t>{PLACEHOLDER_NIVEL_RISC_GLOBAL} - {PLACEHOLDER_CONCLUZII_EVALUARE}</w:t></w:r></w:p>'
            stray_p337 = '<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="24"/><w:sz-cs w:val="24"/><w:color w:val="000000"/></w:rPr></w:r><w:t>{PLACEHOLDER_NIVEL_RISC_GLOBAL} - {PLACEHOLDER_CONCLUZII_EVALUARE}</w:t></w:r></w:p>'
            if stray_p175 in text:
                text = text.replace(stray_p175, '')
            if stray_p337 in text:
                text = text.replace(stray_p337, '')

            # 4. Clean 5 corrupted occurrences
            corrupt = '<w:t>{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx</w:t>'
            if corrupt in text:
                text = text.replace(corrupt, '<w:t>---------xxxxxx-------</w:t>')

            # 5. P970 & P972 evaluator contacts
            p970_old = '<w:t xml:space="preserve"> Bucuresti , str Petcu Avram nr 6 , sector 4, </w:t>'
            p970_new = '<w:t xml:space="preserve">{PLACEHOLDER_ADRESA_PRESTATOR}</w:t>'
            if p970_old in text:
                text = text.replace(p970_old, p970_new)

            p972_old = '<w:t xml:space="preserve">CONTACT: 0040 723.60.13.84</w:t>'
            p972_new = '<w:t xml:space="preserve">CONTACT: {PLACEHOLDER_TELEFON_PRESTATOR}</w:t>'
            if p972_old in text:
                text = text.replace(p972_old, p972_new)

            # 6. Reintegrate Chapters 6 & 7 before closing section
            chap6_7 = (
                '<w:p><w:r><w:br w:type="page"/></w:r></w:p>'
                '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>CAPITOLUL 6: EVALUAREA FACTORILOR DE RISC LA LOCUL DE MUNCĂ</w:t></w:r></w:p>'
                '<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>Postul / Locul de muncă evaluat: {PLACEHOLDER_FUNCTIE}</w:t></w:r></w:p>'
                '<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">Domeniu de activitate (CAEN): {PLACEHOLDER_COD_CAEN} - {PLACEHOLDER_ACTIVITATE_PRINCIPALA}</w:t></w:r></w:p>'
                '<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">Număr lucrători expuși: {PLACEHOLDER_NUMAR_LUCRATORI} | Program de lucru: {PLACEHOLDER_PROGRAM_LUCRU}</w:t></w:r></w:p>'
                '<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:before="120" w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">Evaluarea a fost realizată conform metodei I.N.C.D.P.M. București, prin identificarea factorilor de risc pe cele patru componente fundamentale ale sistemului de muncă: Executant, Sarcina de muncă, Mijloace de producție și Mediul de muncă. Totalul factorilor de risc identificați și analizați: {PLACEHOLDER_NUMAR_FACTORI_RISC}.</w:t></w:r></w:p>'
                '<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:before="240" w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:b/><w:sz w:val="28"/><w:szCs w:val="28"/></w:rPr><w:t>CAPITOLUL 7: CONCLUZII PRIVIND EVALUAREA RISCURILOR</w:t></w:r></w:p>'
                '<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">Nivelul de risc global calculat (Nrg): </w:t></w:r><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/><w:color w:val="0000FF"/></w:rPr><w:t>{PLACEHOLDER_NIVEL_RISC_GLOBAL}</w:t></w:r></w:p>'
                '<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">Repartiția factorilor identificați pe subsisteme: {PLACEHOLDER_REPARTITIE_RISCURI}.</w:t></w:r></w:p>'
                '<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="180"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_CONCLUZII_EVALUARE}</w:t></w:r></w:p>'
                '<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:before="240" w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">COMISIA DE EVALUARE ȘI APROBARE:                                                DATA: {PLACEHOLDER_DATA_DOCUMENT}</w:t></w:r></w:p>'
                '<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="60"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">Evaluator Risc SSM: {PLACEHOLDER_PRESTATOR_SSM} ({PLACEHOLDER_CERTIFICAT_EVALUATOR})</w:t></w:r></w:p>'
                '<w:p><w:pPr><w:jc w:val="both"/><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t xml:space="preserve">Angajator / Reprezentant Legal: {PLACEHOLDER_FIRMA} - {PLACEHOLDER_REPREZENTANT_LEGAL}</w:t></w:r></w:p>'
            )
            if 'CAPITOLUL 6: EVALUAREA FACTORILOR DE RISC LA LOCUL DE MUNCĂ' not in text:
                sect_idx = text.rfind('<w:sectPr')
                assert sect_idx != -1, 'EVALUAREA RISCURILOR: sectPr not found'
                text = text[:sect_idx] + chap6_7 + text[sect_idx:]

            ET.fromstring(text.encode('utf-8'))
            content = text.encode('utf-8')

        out_zip.writestr(item, content)

    in_zip.close()
    out_zip.close()
    return out_buf.getvalue()

def patch_activitati_birou(data: bytes) -> bytes:
    in_zip = zipfile.ZipFile(io.BytesIO(data), 'r')
    out_buf = io.BytesIO()
    out_zip = zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED)

    for item in in_zip.infolist():
        content = in_zip.read(item.filename)
        if item.filename in ('word/header1.xml', 'word/header2.xml', 'word/header3.xml'):
            text = content.decode('utf-8')
            old_hp = '<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr></w:p>'
            if old_hp in text:
                new_hp = '<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_FIRMA}   </w:t></w:r></w:p>'
                text = text.replace(old_hp, new_hp)
                ET.fromstring(text.encode('utf-8'))
                content = text.encode('utf-8')
        elif item.filename == 'word/document.xml':
            text = content.decode('utf-8')
            # 1. Replace guard agents with office personnel
            p24_frag = 'particularităţile activităţii agenţilor de'
            if p24_frag in text:
                idx = text.find(p24_frag)
                p_start = max(text.rfind('<w:p>', 0, idx), text.rfind('<w:p ', 0, idx))
                p_end = text.find('</w:p>', idx) + len('</w:p>')
                new_p24 = '<w:p><w:pPr><w:jc w:val="both"/><w:ind w:left="890"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Helvetica" w:hAnsi="Helvetica" w:cs="Helvetica"/><w:sz w:val="24"/><w:sz-cs w:val="24"/></w:rPr><w:t xml:space="preserve">Instrucţiunile prezente completează şi detaliază (ţinând seama de particularităţile activităţilor de birou, lucrului cu echipamente cu ecran de vizualizare şi ale locurilor de muncă aflate în responsabilitatea salariaţilor), prevederile următoarelor acte normative:</w:t></w:r></w:p>'
                text = text[:p_start] + new_p24 + text[p_end:]
            else:
                assert 'activităţilor de birou' in text or 'activitatilor de birou' in text

            # 2. Add PLACEHOLDER_FIRMA at the top of the body
            firma_p = '<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{PLACEHOLDER_FIRMA}</w:t></w:r></w:p>'
            if '{PLACEHOLDER_FIRMA}' not in text and '<w:body>' in text:
                text = text.replace('<w:body>', '<w:body>' + firma_p, 1)

            ET.fromstring(text.encode('utf-8'))
            content = text.encode('utf-8')

        out_zip.writestr(item, content)

    in_zip.close()
    out_zip.close()
    return out_buf.getvalue()

def patch_alunecari(data: bytes) -> bytes:
    in_zip = zipfile.ZipFile(io.BytesIO(data), 'r')
    out_buf = io.BytesIO()
    out_zip = zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED)

    for item in in_zip.infolist():
        content = in_zip.read(item.filename)
        if item.filename in ('word/header1.xml', 'word/header2.xml', 'word/header3.xml'):
            text = content.decode('utf-8')
            old_hp = '<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr></w:p>'
            if old_hp in text:
                new_hp = '<w:p><w:pPr><w:pStyle w:val="Header"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t xml:space="preserve">{PLACEHOLDER_FIRMA}   </w:t></w:r></w:p>'
                text = text.replace(old_hp, new_hp)
                ET.fromstring(text.encode('utf-8'))
                content = text.encode('utf-8')
        elif item.filename == 'word/document.xml':
            text = content.decode('utf-8')
            firma_p = '<w:p><w:pPr><w:jc w:val="left"/><w:spacing w:after="120"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial Narrow"/><w:b/><w:sz w:val="24"/><w:szCs w:val="24"/></w:rPr><w:t>{PLACEHOLDER_FIRMA}</w:t></w:r></w:p>'
            if '{PLACEHOLDER_FIRMA}' not in text and '<w:body>' in text:
                text = text.replace('<w:body>', '<w:body>' + firma_p, 1)
            ET.fromstring(text.encode('utf-8'))
            content = text.encode('utf-8')

        out_zip.writestr(item, content)

    in_zip.close()
    out_zip.close()
    return out_buf.getvalue()

def patch_detaliu_tematica(data: bytes) -> bytes:
    in_zip = zipfile.ZipFile(io.BytesIO(data), 'r')
    out_buf = io.BytesIO()
    out_zip = zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED)

    for item in in_zip.infolist():
        # Exclude TinyPic external ad image
        if item.filename == 'word/media/image14.jpeg':
            continue

        content = in_zip.read(item.filename)
        if item.filename in ('word/footer1.xml', 'word/footer2.xml'):
            text = content.decode('utf-8')
            text = re.sub(r'<w:r[^>]*>.*?<w:drawing>.*?</w:drawing>.*?</w:r>', '', text, flags=re.DOTALL)
            text = re.sub(r'<w:r[^>]*><w:tab/></w:r>', '', text)
            ET.fromstring(text.encode('utf-8'))
            content = text.encode('utf-8')
        elif item.filename in ('word/_rels/footer1.xml.rels', 'word/_rels/footer2.xml.rels'):
            content = b'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"/>'
        elif item.filename == 'word/document.xml':
            text = content.decode('utf-8')
            target = '<w:t>PRIVIND EFECTUAREA INSTRUIRII LA LOCUL DE MUNCA</w:t>'
            replacement = '<w:t>PRIVIND EFECTUAREA INSTRUIRII LA LOCUL DE MUNCA - POSTUL: {PLACEHOLDER_FUNCTIE}</w:t>'
            if target in text:
                text = text.replace(target, replacement)
            else:
                assert '{PLACEHOLDER_FUNCTIE}' in text
            ET.fromstring(text.encode('utf-8'))
            content = text.encode('utf-8')

        out_zip.writestr(item, content)

    in_zip.close()
    out_zip.close()
    return out_buf.getvalue()

def patch_decizii(data: bytes) -> bytes:
    in_zip = zipfile.ZipFile(io.BytesIO(data), 'r')
    out_buf = io.BytesIO()
    out_zip = zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED)

    for item in in_zip.infolist():
        content = in_zip.read(item.filename)
        if item.filename == 'word/document.xml':
            text = content.decode('utf-8')

            # 1. Decizia 10 standardization
            p10_pat = r'(<w:t>Nr</w:t>.*?<w:t>\.10</w:t>.*?<w:t[^>]*>\s*din\s*</w:t>)'
            if re.search(p10_pat, text, flags=re.DOTALL):
                text = re.sub(p10_pat, r'<w:t>Nr. {PLACEHOLDER_NUMAR_DECIZIE_10} din </w:t>', text, flags=re.DOTALL)
            else:
                assert '{PLACEHOLDER_NUMAR_DECIZIE_10}' in text, 'DECIZII: Decizia 10 not found'

            # 2. P458 Membru comisie: inject PLACEHOLDER_APELATIV_MEMBRU_COMISIE before PLACEHOLDER_MEMBRU_COMISIE
            p458_target_raw = 'Dna. </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
            p458_target_admin = '{PLACEHOLDER_APELATIV_ADMINISTRATOR} </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
            p458_repl = '{PLACEHOLDER_APELATIV_MEMBRU_COMISIE} </w:t></w:r><w:r w:rsidR="00327F80"><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ro-RO"/></w:rPr><w:t>{PLACEHOLDER_MEMBRU_COMISIE}'
            if p458_target_raw in text:
                text = text.replace(p458_target_raw, p458_repl)
            elif p458_target_admin in text:
                text = text.replace(p458_target_admin, p458_repl)
            else:
                assert '{PLACEHOLDER_APELATIV_MEMBRU_COMISIE}' in text, 'DECIZII: P458 target not found'

            # 3. Tiparul 1: single-run Dna.
            text = text.replace('Dna. </w:t>', '{PLACEHOLDER_APELATIV_ADMINISTRATOR} </w:t>')

            # 4. Tiparul 2: fragmented runs Dna ... .
            pat2 = r'Dna</w:t></w:r>(?:<w:proofErr[^>]*/>)*<w:r[^>]*><w:rPr>.*?</w:rPr><w:t[^>]*>\.\s*</w:t></w:r>(\s*<w:r[^>]*>(?:<w:rPr>.*?</w:rPr>)?<w:t>)\{(PLACEHOLDER_[A-Z0-9_]+)\}'
            def repl2(m):
                ph = m.group(2)
                salut = '{PLACEHOLDER_APELATIV_ADMINISTRATOR}' if ph == 'PLACEHOLDER_REPREZENTANT_LEGAL' else '{PLACEHOLDER_APELATIV_PSI}'
                return f'{salut} </w:t></w:r>{m.group(1)}{{{ph}}}'
            text = re.sub(pat2, repl2, text, flags=re.DOTALL)

            # Validate that 0 occurrences of Dna remain
            assert text.count('Dna') == 0, f"DECIZII: {text.count('Dna')} occurrences of Dna still remain!"

            ET.fromstring(text.encode('utf-8'))
            content = text.encode('utf-8')

        out_zip.writestr(item, content)

    in_zip.close()
    out_zip.close()
    return out_buf.getvalue()

def patch_anexa_fisa_post(data: bytes) -> bytes:
    in_zip = zipfile.ZipFile(io.BytesIO(data), 'r')
    out_buf = io.BytesIO()
    out_zip = zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED)

    for item in in_zip.infolist():
        content = in_zip.read(item.filename)
        if item.filename == 'word/document.xml':
            text = content.decode('utf-8')

            # 1. Company and CIM header before Table 0
            if '{PLACEHOLDER_FIRMA}' not in text and '<w:body>' in text:
                header_xml = (
                    '<w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:sz w:val="22"/><w:szCs w:val="22"/></w:rPr><w:t>S.C. {PLACEHOLDER_FIRMA} S.R.L.</w:t></w:r></w:p>'
                    '<w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>CUI: {PLACEHOLDER_CUI}</w:t></w:r></w:p>'
                    '<w:p><w:pPr><w:jc w:val="left"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:i/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:i/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr><w:t>Anexă la Contractul Individual de Muncă nr. {PLACEHOLDER_NUMAR_CIM} din {PLACEHOLDER_DATA_CIM}</w:t></w:r></w:p>'
                    '<w:p><w:pPr><w:spacing w:line="120" w:lineRule="auto"/></w:pPr></w:p>'
                )
                text = text.replace('<w:body>', '<w:body>' + header_xml, 1)

            # 2. Subtitle Job and COR in Table 0
            if 'POSTUL / FUNCȚIA: {PLACEHOLDER_FUNCTIE}' not in text and '</w:tc></w:tr></w:tbl>' in text:
                t0_sub = (
                    '<w:p><w:pPr><w:spacing w:line="288" w:lineRule="auto"/><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr></w:pPr>'
                    '<w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:b/><w:bCs/><w:sz w:val="20"/><w:szCs w:val="20"/></w:rPr>'
                    '<w:t>POSTUL / FUNCȚIA: {PLACEHOLDER_FUNCTIE} (COD COR: {PLACEHOLDER_COD_COR})</w:t></w:r></w:p>'
                )
                text = text.replace('</w:tc></w:tr></w:tbl>', t0_sub + '</w:tc></w:tr></w:tbl>', 1)

            # 3. Replace SALARIAT with dynamic Job and COR
            if '<w:t>SALARIAT</w:t>' in text:
                text = text.replace('<w:t>SALARIAT</w:t>', '<w:t>{PLACEHOLDER_FUNCTIE} (COR {PLACEHOLDER_COD_COR})</w:t>')

            # 4. Insert signing dates in signature table
            date_run = '<w:r><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/><w:sz w:val="16"/><w:szCs w:val="16"/></w:rPr><w:t>{PLACEHOLDER_DATA_SEMNARII}</w:t></w:r>'
            p_admin_date = '<w:p w14:paraId="259D332F" w14:textId="464E2554" w:rsidR="00187B1F" w:rsidRPr="009D5082" w:rsidRDefault="00187B1F" w:rsidP="0050768F"><w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/></w:rPr></w:pPr>'
            p_emp_date = '<w:p w14:paraId="196916C1" w14:textId="3C41F399" w:rsidR="004C54A7" w:rsidRPr="009D5082" w:rsidRDefault="004C54A7" w:rsidP="004C54A7"><w:pPr><w:jc w:val="center"/><w:rPr><w:rFonts w:ascii="Arial Narrow" w:hAnsi="Arial Narrow" w:cs="Arial"/><w:color w:val="000000" w:themeColor="text1"/></w:rPr></w:pPr>'
            if p_admin_date in text and p_admin_date + date_run not in text:
                text = text.replace(p_admin_date + '</w:p>', p_admin_date + date_run + '</w:p>')
            if p_emp_date in text and p_emp_date + date_run not in text:
                text = text.replace(p_emp_date + '</w:p>', p_emp_date + date_run + '</w:p>')

            ET.fromstring(text.encode('utf-8'))
            content = text.encode('utf-8')

        out_zip.writestr(item, content)

    in_zip.close()
    out_zip.close()
    return out_buf.getvalue()

def patch_gdpr_informare(data: bytes) -> bytes:
    in_zip = zipfile.ZipFile(io.BytesIO(data), 'r')
    out_buf = io.BytesIO()
    out_zip = zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED)

    replacements = [
        (
            '3.3  interesul legitim al …{PLACEHOLDER_FIRMA} desfășurare în bune condiții a activitatilor sale conform obiectului de activitate.',
            '3.3 prelucrarea categoriilor speciale de date (sănătate) în temeiul Art. 9 alin. (2) lit. (b) din GDPR, precum și interesul legitim al {PLACEHOLDER_FIRMA} conform Art. 6 alin. (1) lit. (f) din GDPR în vederea desfășurării în bune condiții a activităților sale, asigurării securității și protecției patrimoniului.'
        ),
        (
            'Dreptul de opozitie se poate exercita printr-o cerere scrisa (semnata si datata), adresata ……{PLACEHOLDER_FIRMA}.',
            'Dreptul de opoziție se poate exercita printr-o cerere scrisă (semnată și datată), adresată către {PLACEHOLDER_FIRMA}.'
        ),
        (
            'existente in cadrul firmei …………{PLACEHOLDER_FIRMA}.',
            'existente în cadrul firmei {PLACEHOLDER_FIRMA}.'
        ),
        (
            'Mentionez ca in exprimarea consimtamantului nu am fost influentat sau constrans, sens in care imi exprim acordul liber si in cunostinta de cauza.',
            'Declar că am primit, am citit integral și am înțeles conținutul prezentei Note de informare. Confirm că am luat la cunoștință faptul că prelucrarea datelor mele cu caracter personal se întemeiază pe dispozițiile Art. 6 alin. (1) lit. (b) și (c), precum și ale Art. 9 alin. (2) lit. (b) din Regulamentul (UE) 2016/679 (GDPR), fiindu-mi garantată exercitarea deplină a drepturilor conferite de lege.'
        )
    ]

    for item in in_zip.infolist():
        content = in_zip.read(item.filename)
        if item.filename == 'word/document.xml':
            text = content.decode('utf-8')
            for old_text, new_text in replacements:
                if old_text in text:
                    text = text.replace(old_text, new_text)
                else:
                    assert '{PLACEHOLDER_FIRMA}' in text, 'GDPR Informare: placeholder not found'

            ET.fromstring(text.encode('utf-8'))
            content = text.encode('utf-8')

        out_zip.writestr(item, content)

    in_zip.close()
    out_zip.close()
    return out_buf.getvalue()

def patch_excel_tabel_cursanti(data: bytes) -> bytes:
    in_zip = zipfile.ZipFile(io.BytesIO(data), 'r')
    out_buf = io.BytesIO()
    out_zip = zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED)

    for item in in_zip.infolist():
        filename = item.filename
        content = in_zip.read(filename)

        # 1. Exclude sheet2.xml physical file
        if filename == 'xl/worksheets/sheet2.xml':
            continue

        # 2. Clean [Content_Types].xml
        if filename == '[Content_Types].xml':
            root = ET.fromstring(content)
            for child in list(root):
                if child.attrib.get('PartName') == '/xl/worksheets/sheet2.xml':
                    root.remove(child)
            content = ET.tostring(root, encoding='utf-8', xml_declaration=True)

        # 3. Clean xl/workbook.xml
        elif filename == 'xl/workbook.xml':
            root = ET.fromstring(content)
            ns = {'x': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
            sheets_el = root.find('x:sheets', ns)
            if sheets_el is not None:
                for s in list(sheets_el):
                    if s.attrib.get('name') == 'Sheet1' or s.attrib.get('sheetId') == '2':
                        sheets_el.remove(s)
            content = ET.tostring(root, encoding='utf-8', xml_declaration=True)

        # 4. Clean xl/_rels/workbook.xml.rels
        elif filename == 'xl/_rels/workbook.xml.rels':
            root = ET.fromstring(content)
            for child in list(root):
                target = child.attrib.get('Target', '')
                if target in ['/xl/worksheets/sheet2.xml', 'worksheets/sheet2.xml']:
                    root.remove(child)
            content = ET.tostring(root, encoding='utf-8', xml_declaration=True)

        out_zip.writestr(item, content)

    in_zip.close()
    out_zip.close()
    return out_buf.getvalue()

def patch_adeverinta_participare(data: bytes) -> bytes:
    in_zip = zipfile.ZipFile(io.BytesIO(data), 'r')
    out_buf = io.BytesIO()
    out_zip = zipfile.ZipFile(out_buf, 'w', zipfile.ZIP_DEFLATED)

    for item in in_zip.infolist():
        content = in_zip.read(item.filename)
        if item.filename == 'word/document.xml':
            text = content.decode('utf-8')
            target = 'nivelul {PLACEHOLDER_NIVEL_IGIENA}'
            if target in text:
                text = text.replace(target, '{PLACEHOLDER_NIVEL_IGIENA}')
            else:
                assert '{PLACEHOLDER_NIVEL_IGIENA}' in text, 'Adeverinta participare: PLACEHOLDER_NIVEL_IGIENA not found'
            ET.fromstring(text.encode('utf-8'))
            content = text.encode('utf-8')
        out_zip.writestr(item, content)

    in_zip.close()
    out_zip.close()
    return out_buf.getvalue()

PATCH_MAP = [
    ('EVALUAREA RISCURILOR.docx', patch_evaluarea_riscurilor),
    ('13 - ACTIVITATI DE BIROU.docx', patch_activitati_birou),
    ('11 - ALUNECARI.docx', patch_alunecari),
    ('Detaliu Tematica loc de munca.docx', patch_detaliu_tematica),
    ('DECIZII.docx', patch_decizii),
    ('Anexa fisa postului SSM.docx', patch_anexa_fisa_post),
    ('Informare Protectia Datelor.docx', patch_gdpr_informare),
    ('Tabel Cursanti exemplu.xlsx', patch_excel_tabel_cursanti),
    ('Adeverinta participare.docx', patch_adeverinta_participare),
]

def main():
    print('Starting template rectification on both target directories...')
    for filename, patch_fn in PATCH_MAP:
        print(f'\nApplying patch to: {filename}')
        # We read from the first dir (normalized)
        src_path = os.path.join(TARGET_DIRS[0], filename)
        with open(src_path, 'rb') as f:
            raw_bytes = f.read()

        patched_bytes = patch_fn(raw_bytes)

        # Write to both directories
        for target_dir in TARGET_DIRS:
            dest_path = os.path.join(target_dir, filename)
            with open(dest_path, 'wb') as f:
                f.write(patched_bytes)
            print(f'  ✓ Saved: {dest_path} ({len(patched_bytes)} bytes)')

    print('\n✓ All templates successfully rectified and mirrored across both directories!')

if __name__ == '__main__':
    main()
