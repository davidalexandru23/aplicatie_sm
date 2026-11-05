#!/usr/bin/env python3
"""
scripts/verify-m1-gate-challenger2.py
Adversarial Verification Suite for Milestone 1 / Pillar 1 Template Rectifications.
Executed by m1_gate_challenger_2.
"""

import os
import sys
import hashlib
import zipfile
import re
import xml.etree.ElementTree as ET

TARGET_DIRS = {
    "normalized": os.path.abspath("templates_registry/normalized"),
    "handoff": os.path.abspath("handoff/ssm-template-placeholder-pack/templates"),
}

TEMPLATES = [
    "EVALUAREA RISCURILOR.docx",
    "13 - ACTIVITATI DE BIROU.docx",
    "11 - ALUNECARI.docx",
    "Detaliu Tematica loc de munca.docx",
    "DECIZII.docx",
    "Anexa fisa postului SSM.docx",
    "Informare Protectia Datelor.docx",
    "Tabel Cursanti exemplu.xlsx",
    "Adeverinta participare.docx",
]

def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

class VerificationFailure(Exception):
    pass

def log_pass(msg: str):
    print(f"  [PASS] {msg}")

def log_fail(msg: str):
    print(f"  [FAIL] {msg}")
    raise VerificationFailure(msg)

def test_1_parity_and_checksums():
    print("\n--- TEST 1: Parity & Checksums across Normalized and Handoff ---")
    for t in TEMPLATES:
        p_norm = os.path.join(TARGET_DIRS["normalized"], t)
        p_hand = os.path.join(TARGET_DIRS["handoff"], t)
        if not os.path.exists(p_norm):
            log_fail(f"Missing in normalized: {t}")
        if not os.path.exists(p_hand):
            log_fail(f"Missing in handoff: {t}")
        
        sha_norm = sha256_file(p_norm)
        sha_hand = sha256_file(p_hand)
        size_norm = os.path.getsize(p_norm)
        size_hand = os.path.getsize(p_hand)
        
        if sha_norm != sha_hand:
            log_fail(f"Checksum mismatch for {t}:\n  norm: {sha_norm} ({size_norm}b)\n  hand: {sha_hand} ({size_hand}b)")
        log_pass(f"{t}: SHA-256 match ({sha_norm[:12]}..., {size_norm} bytes)")

def test_2_zip_and_xml_wellformedness():
    print("\n--- TEST 2: ZIP Package & Full XML Well-Formedness ---")
    total_xml_parts = 0
    for dir_name, dir_path in TARGET_DIRS.items():
        print(f"  Checking directory: {dir_name}")
        for t in TEMPLATES:
            file_path = os.path.join(dir_path, t)
            try:
                with zipfile.ZipFile(file_path, "r") as z:
                    bad_file = z.testzip()
                    if bad_file:
                        log_fail(f"Corrupt ZIP entry {bad_file} in {file_path}")
                    
                    for name in z.namelist():
                        if name.endswith(".xml") or name.endswith(".rels"):
                            xml_bytes = z.read(name)
                            try:
                                ET.fromstring(xml_bytes)
                                total_xml_parts += 1
                            except ET.ParseError as pe:
                                log_fail(f"Malformed XML in {t} -> {name}: {pe}")
            except Exception as e:
                log_fail(f"Failed to inspect ZIP archive {file_path}: {e}")
            log_pass(f"{dir_name}/{t}: valid ZIP, all XML parts well-formed")
    print(f"  Total XML/RELS parts successfully parsed and validated: {total_xml_parts}")

def test_3_tabel_cursanti_deep_inspection():
    print("\n--- TEST 3: Deep Adversarial Inspection of Tabel Cursanti exemplu.xlsx ---")
    for dir_name, dir_path in TARGET_DIRS.items():
        file_path = os.path.join(dir_path, "Tabel Cursanti exemplu.xlsx")
        with zipfile.ZipFile(file_path, "r") as z:
            names = z.namelist()
            # 1. Assert sheet2.xml physically removed
            if "xl/worksheets/sheet2.xml" in names:
                log_fail(f"{dir_name}/Tabel Cursanti: xl/worksheets/sheet2.xml still physically present!")
            log_pass(f"{dir_name}: xl/worksheets/sheet2.xml physically absent")

            # 2. Inspect [Content_Types].xml
            ct_xml = z.read("[Content_Types].xml").decode("utf-8")
            if "sheet2.xml" in ct_xml:
                log_fail(f"{dir_name}/Tabel Cursanti: [Content_Types].xml still references sheet2.xml!")
            log_pass(f"{dir_name}: [Content_Types].xml has no reference to sheet2.xml")

            # 3. Inspect xl/workbook.xml
            wb_xml = z.read("xl/workbook.xml").decode("utf-8")
            if "Sheet1" in wb_xml:
                log_fail(f"{dir_name}/Tabel Cursanti: xl/workbook.xml still references 'Sheet1'!")
            if "sheetId=\"2\"" in wb_xml:
                log_fail(f"{dir_name}/Tabel Cursanti: xl/workbook.xml still references sheetId 2!")
            if "Registru" in wb_xml:
                log_fail(f"{dir_name}/Tabel Cursanti: xl/workbook.xml references Registru!")
            log_pass(f"{dir_name}: xl/workbook.xml completely clean of Sheet1 / sheetId 2")

            # 4. Inspect xl/_rels/workbook.xml.rels
            wb_rels = z.read("xl/_rels/workbook.xml.rels").decode("utf-8")
            if "sheet2.xml" in wb_rels:
                log_fail(f"{dir_name}/Tabel Cursanti: xl/_rels/workbook.xml.rels still links to sheet2.xml!")
            log_pass(f"{dir_name}: xl/_rels/workbook.xml.rels has no dangling link to sheet2.xml")

            # 5. Verify actual worksheets present
            worksheets = [n for n in names if n.startswith("xl/worksheets/")]
            log_pass(f"{dir_name}: worksheets in package: {worksheets}")
            if worksheets != ["xl/worksheets/sheet1.xml"]:
                log_fail(f"{dir_name}/Tabel Cursanti: expected exactly ['xl/worksheets/sheet1.xml'], got {worksheets}")

            # 6. Verify sheet name in workbook
            wb_root = ET.fromstring(wb_xml.encode("utf-8"))
            ns = {"x": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
            sheets = wb_root.findall(".//x:sheet", ns)
            sheet_names = [s.attrib.get("name") for s in sheets]
            log_pass(f"{dir_name}: sheets in workbook: {sheet_names}")
            if sheet_names != ["Curs (2)"]:
                log_fail(f"{dir_name}/Tabel Cursanti: expected single sheet ['Curs (2)'], got {sheet_names}")

def test_4_detaliu_tematica_deep_inspection():
    print("\n--- TEST 4: Deep Adversarial Inspection of Detaliu Tematica loc de munca.docx ---")
    for dir_name, dir_path in TARGET_DIRS.items():
        file_path = os.path.join(dir_path, "Detaliu Tematica loc de munca.docx")
        with zipfile.ZipFile(file_path, "r") as z:
            names = z.namelist()
            # 1. Assert image14.jpeg removed
            if "word/media/image14.jpeg" in names:
                log_fail(f"{dir_name}/Detaliu Tematica: word/media/image14.jpeg still physically present!")
            log_pass(f"{dir_name}: word/media/image14.jpeg physically absent")

            # 2. Check all text runs in all XML files for ad links, URLs, tinypic
            for n in names:
                if n.endswith(".xml"):
                    root = ET.fromstring(z.read(n))
                    for elem in root.iter():
                        if elem.text:
                            for forbidden in ["tinypic", "http://", "https://", "www."]:
                                if forbidden in elem.text.lower():
                                    log_fail(f"{dir_name}/Detaliu Tematica: found '{forbidden}' in text of {n}: {elem.text}")
                        if elem.tag.endswith("hyperlink"):
                            log_fail(f"{dir_name}/Detaliu Tematica: found hyperlink in {n}: {elem.attrib}")
            log_pass(f"{dir_name}: zero external ad links, URLs, or tinypic references across all XML text elements")

            # 3. Check relationships in footer rels and document rels
            for n in names:
                if n.endswith(".rels"):
                    root = ET.fromstring(z.read(n))
                    for rel in root.iter("{http://schemas.openxmlformats.org/package/2006/relationships}Relationship"):
                        target = rel.attrib.get("Target", "")
                        mode = rel.attrib.get("TargetMode", "")
                        if "tinypic" in target.lower() or mode == "External" or "image14" in target:
                            log_fail(f"{dir_name}/Detaliu Tematica: suspicious relationship in {n}: target={target} mode={mode}")
            log_pass(f"{dir_name}: zero external/ad relationships across all .rels files")

            # 4. Check {PLACEHOLDER_FUNCTIE} in document.xml
            doc_xml = z.read("word/document.xml").decode("utf-8")
            if "{PLACEHOLDER_FUNCTIE}" not in doc_xml:
                log_fail(f"{dir_name}/Detaliu Tematica: missing {{PLACEHOLDER_FUNCTIE}} in document.xml")
            log_pass(f"{dir_name}: {{PLACEHOLDER_FUNCTIE}} successfully present in document title")

def test_5_evaluarea_riscurilor_inspection():
    print("\n--- TEST 5: Deep Inspection of EVALUAREA RISCURILOR.docx ---")
    for dir_name, dir_path in TARGET_DIRS.items():
        file_path = os.path.join(dir_path, "EVALUAREA RISCURILOR.docx")
        with zipfile.ZipFile(file_path, "r") as z:
            doc_xml = z.read("word/document.xml").decode("utf-8")
            
            # P69 RegCom
            if "{PLACEHOLDER_NR_REG_COM}" not in doc_xml:
                log_fail(f"{dir_name}/EVALUAREA RISCURILOR: missing {{PLACEHOLDER_NR_REG_COM}}")
            if "Registrul Comertului Bucuresti" in doc_xml:
                log_fail(f"{dir_name}/EVALUAREA RISCURILOR: static 'Bucuresti' still in RegCom string")
            log_pass(f"{dir_name}: RegCom token dynamic, static Bucuresti removed")

            # Diploma text
            if "in cadrul lucrarii de absolvire" in doc_xml:
                log_fail(f"{dir_name}/EVALUAREA RISCURILOR: obsolete graduation diploma text still present")
            log_pass(f"{dir_name}: diploma text cleanly excised")

            # Corrupted occurrences
            if "{PLACEHOLDER_ADRESA_FIRMA}xxxxxxx" in doc_xml:
                log_fail(f"{dir_name}/EVALUAREA RISCURILOR: corrupted placeholder string still present")
            log_pass(f"{dir_name}: corrupted placeholder strings eliminated")

            # Chapters 6 & 7
            if "CAPITOLUL 6: EVALUAREA FACTORILOR DE RISC LA LOCUL DE MUNCĂ" not in doc_xml:
                log_fail(f"{dir_name}/EVALUAREA RISCURILOR: missing Chapter 6 header")
            if "CAPITOLUL 7: CONCLUZII PRIVIND EVALUAREA RISCURILOR" not in doc_xml:
                log_fail(f"{dir_name}/EVALUAREA RISCURILOR: missing Chapter 7 header")
            
            required_tokens = [
                "{PLACEHOLDER_NIVEL_RISC_GLOBAL}",
                "{PLACEHOLDER_REPARTITIE_RISCURI}",
                "{PLACEHOLDER_NUMAR_FACTORI_RISC}",
                "{PLACEHOLDER_CONCLUZII_EVALUARE}",
                "{PLACEHOLDER_PRESTATOR_SSM}",
                "{PLACEHOLDER_CERTIFICAT_EVALUATOR}",
                "{PLACEHOLDER_TELEFON_PRESTATOR}",
                "{PLACEHOLDER_ADRESA_PRESTATOR}",
                "{PLACEHOLDER_DATA_DOCUMENT}",
            ]
            for tok in required_tokens:
                if tok not in doc_xml:
                    log_fail(f"{dir_name}/EVALUAREA RISCURILOR: missing required token {tok}")
            log_pass(f"{dir_name}: Chapters 6 & 7 and all required evaluator tokens present")

def test_6_ipssm_birou_and_alunecari():
    print("\n--- TEST 6: Inspection of 13 - ACTIVITATI DE BIROU.docx & 11 - ALUNECARI.docx ---")
    for dir_name, dir_path in TARGET_DIRS.items():
        # Birou
        p_birou = os.path.join(dir_path, "13 - ACTIVITATI DE BIROU.docx")
        with zipfile.ZipFile(p_birou, "r") as z:
            doc_xml = z.read("word/document.xml").decode("utf-8")
            if "AGENTI DE PAZA" in doc_xml.upper() or "AGENTILOR DE PAZA" in doc_xml.upper():
                log_fail(f"{dir_name}/Birou: 'agenti de paza' still present in document!")
            if "activităţilor de birou" not in doc_xml and "activitatilor de birou" not in doc_xml:
                log_fail(f"{dir_name}/Birou: 'activităţilor de birou' not found in text!")
            if "{PLACEHOLDER_FIRMA}" not in doc_xml:
                log_fail(f"{dir_name}/Birou: {{PLACEHOLDER_FIRMA}} not in document body!")
            # Check header
            header1 = z.read("word/header1.xml").decode("utf-8")
            if "{PLACEHOLDER_FIRMA}" not in header1:
                log_fail(f"{dir_name}/Birou: {{PLACEHOLDER_FIRMA}} not in header1.xml!")
            log_pass(f"{dir_name}/Birou: guard agent text replaced with office text, {{PLACEHOLDER_FIRMA}} present in header and body")

        # Alunecari
        p_alun = os.path.join(dir_path, "11 - ALUNECARI.docx")
        with zipfile.ZipFile(p_alun, "r") as z:
            doc_xml = z.read("word/document.xml").decode("utf-8")
            if "{PLACEHOLDER_FIRMA}" not in doc_xml:
                log_fail(f"{dir_name}/Alunecari: {{PLACEHOLDER_FIRMA}} not in document body!")
            header1 = z.read("word/header1.xml").decode("utf-8")
            if "{PLACEHOLDER_FIRMA}" not in header1:
                log_fail(f"{dir_name}/Alunecari: {{PLACEHOLDER_FIRMA}} not in header1.xml!")
            log_pass(f"{dir_name}/Alunecari: {{PLACEHOLDER_FIRMA}} present in header and body")

def test_7_decizii_and_salutations():
    print("\n--- TEST 7: Inspection of DECIZII.docx ---")
    for dir_name, dir_path in TARGET_DIRS.items():
        p_dec = os.path.join(dir_path, "DECIZII.docx")
        with zipfile.ZipFile(p_dec, "r") as z:
            doc_xml = z.read("word/document.xml").decode("utf-8")
            # 1. Decizia 10
            if "{PLACEHOLDER_NUMAR_DECIZIE_10}" not in doc_xml:
                log_fail(f"{dir_name}/DECIZII: {{PLACEHOLDER_NUMAR_DECIZIE_10}} not found")
            log_pass(f"{dir_name}: {{PLACEHOLDER_NUMAR_DECIZIE_10}} present")

            # 2. Salutations
            tokens = [
                "{PLACEHOLDER_APELATIV_ADMINISTRATOR}",
                "{PLACEHOLDER_APELATIV_PSI}",
            ]
            for tok in tokens:
                if tok not in doc_xml:
                    log_fail(f"{dir_name}/DECIZII: missing {tok}")
            log_pass(f"{dir_name}: dynamic salutation tokens present ({doc_xml.count('{PLACEHOLDER_APELATIV_ADMINISTRATOR}')} admin, {doc_xml.count('{PLACEHOLDER_APELATIV_PSI}')} psi)")

            # 3. Check for any residual hardcoded Dna
            root = ET.fromstring(doc_xml.encode("utf-8"))
            texts = [e.text for e in root.iter("{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t") if e.text]
            dna_runs = [t for t in texts if "Dna" in t or "dna" in t]
            if dna_runs:
                log_fail(f"{dir_name}/DECIZII: residual Dna found in text runs: {dna_runs}")
            log_pass(f"{dir_name}: 0 hardcoded occurrences of Dna in document runs")

def test_8_anexa_fisa_post_and_gdpr():
    print("\n--- TEST 8: Inspection of Anexa fisa postului SSM & Informare Protectia Datelor ---")
    for dir_name, dir_path in TARGET_DIRS.items():
        # Anexa fisa postului
        p_anexa = os.path.join(dir_path, "Anexa fisa postului SSM.docx")
        with zipfile.ZipFile(p_anexa, "r") as z:
            doc_xml = z.read("word/document.xml").decode("utf-8")
            required_anexa = [
                "{PLACEHOLDER_FIRMA}",
                "{PLACEHOLDER_CUI}",
                "{PLACEHOLDER_NUMAR_CIM}",
                "{PLACEHOLDER_DATA_CIM}",
                "{PLACEHOLDER_FUNCTIE}",
                "{PLACEHOLDER_COD_COR}",
                "{PLACEHOLDER_DATA_SEMNARII}",
            ]
            for tok in required_anexa:
                if tok not in doc_xml:
                    log_fail(f"{dir_name}/Anexa fisa post: missing {tok}")
            log_pass(f"{dir_name}/Anexa fisa post: all header, CIM, COR, and signature tokens present")

        # Informare Protectia Datelor
        p_gdpr = os.path.join(dir_path, "Informare Protectia Datelor.docx")
        with zipfile.ZipFile(p_gdpr, "r") as z:
            doc_xml = z.read("word/document.xml").decode("utf-8")
            if "…{PLACEHOLDER_FIRMA}" in doc_xml or "……" in doc_xml:
                log_fail(f"{dir_name}/GDPR: stray placeholder ellipses still found!")
            if "Art. 6 alin. (1) lit. (b) și (c)" not in doc_xml and "Art. 6 alin. (1) lit. (b)" not in doc_xml:
                log_fail(f"{dir_name}/GDPR: statutory legal basis Art. 6(1)(b)/(c) not found!")
            if "Art. 9 alin. (2) lit. (b)" not in doc_xml:
                log_fail(f"{dir_name}/GDPR: special data legal basis Art. 9(2)(b) not found!")
            log_pass(f"{dir_name}/GDPR: placeholder ellipses excised, statutory GDPR Art 6 and Art 9 bases confirmed")

def test_9_adeverinta_participare():
    print("\n--- TEST 9: Inspection of Adeverinta participare.docx ---")
    for dir_name, dir_path in TARGET_DIRS.items():
        p_adev = os.path.join(dir_path, "Adeverinta participare.docx")
        with zipfile.ZipFile(p_adev, "r") as z:
            doc_xml = z.read("word/document.xml").decode("utf-8")
            required_adev = [
                "{PLACEHOLDER_AVIZ_MS}",
                "{PLACEHOLDER_AVIZ_ME}",
                "{PLACEHOLDER_NIVEL_IGIENA}",
                "{PLACEHOLDER_MODUL_IGIENA}",
                "{PLACEHOLDER_PRESTATOR_SSM}",
            ]
            for tok in required_adev:
                if tok not in doc_xml:
                    log_fail(f"{dir_name}/Adeverinta: missing {tok}")
            log_pass(f"{dir_name}/Adeverinta: tokens intact and ready for sanitized resolver output")

def main():
    print("=" * 70)
    print("  EMPIRICAL ADVERSARIAL INSPECTION — m1_gate_challenger_2")
    print("=" * 70)
    try:
        test_1_parity_and_checksums()
        test_2_zip_and_xml_wellformedness()
        test_3_tabel_cursanti_deep_inspection()
        test_4_detaliu_tematica_deep_inspection()
        test_5_evaluarea_riscurilor_inspection()
        test_6_ipssm_birou_and_alunecari()
        test_7_decizii_and_salutations()
        test_8_anexa_fisa_post_and_gdpr()
        test_9_adeverinta_participare()
        print("\n" + "=" * 70)
        print("  ALL EMPIRICAL ADVERSARIAL TESTS PASSED (0 FAILURES)")
        print("=" * 70)
        sys.exit(0)
    except VerificationFailure as vf:
        print("\n" + "!" * 70)
        print(f"  VERIFICATION FAILED: {vf}")
        print("!" * 70)
        sys.exit(1)

if __name__ == "__main__":
    main()
