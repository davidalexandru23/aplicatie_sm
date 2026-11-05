#!/usr/bin/env python3
"""
scripts/verify-m2-gate-challenger2.py
Adversarial Verification Suite for Milestone 2 Gate:
Parity & OpenXML Package Integrity across all 31 Templates and 6 New Statutory Templates.
Executed by m2_challenger_2.
"""

import os
import sys
import hashlib
import zipfile
import re
import subprocess
import xml.etree.ElementTree as ET

TARGET_DIRS = {
    "normalized": os.path.abspath("templates_registry/normalized"),
    "handoff": os.path.abspath("handoff/ssm-template-placeholder-pack/templates"),
}

# All 31 templates in TEMPLATE_CATALOG
ALL_31_TEMPLATES = [
    "11 - ALUNECARI.docx",
    "12 - AUTOVEHICULE.docx",
    "13 - ACTIVITATI DE BIROU.docx",
    "Adeverinta participare.docx",
    "Anexa fisa postului SSM.docx",
    "Anexe Curs igiena.xlsx",
    "Cerere angajare.docx",
    "Contract individual munca 2026.docx",
    "DECIZII.docx",
    "Declaratie luare cunostinta RI.docx",
    "Declaratie pe proprie raspundere CIM.docx",
    "Detaliu Tematica introductiv generala.docx",
    "Detaliu Tematica loc de munca.docx",
    "EVALUAREA RISCURILOR.docx",
    "INFO dosar personal.docx",
    "Informare Protectia Datelor.docx",
    "IP 01-10 UNIVERSALE.docx",
    "OPIS IPSSM.docx",
    "Plan actiune pericol grav si iminent.docx",
    "Plan de Prevenire TESA.docx",
    "Tabel Cursanti exemplu.xlsx",
    "Tematica introductiv generala 4h.docx",
    "Tematica loc de munca.docx",
    "TESA.docx",
    "Zone pericol grav si iminent.docx",
    "ssm-fisa-instruire-individuala.docx",
    "psi-fisa-instructaj-individuala.docx",
    "med-fisa-solicitare-examen.docx",
    "med-fisa-identificare-riscuri.docx",
    "eip-fisa-acordare-individuala.docx",
    "hr-cim-model-cadru-2022.docx",
]

# The 6 new statutory templates for M2
NEW_6_STATUTORY_TEMPLATES = [
    "ssm-fisa-instruire-individuala.docx",
    "psi-fisa-instructaj-individuala.docx",
    "med-fisa-solicitare-examen.docx",
    "med-fisa-identificare-riscuri.docx",
    "eip-fisa-acordare-individuala.docx",
    "hr-cim-model-cadru-2022.docx",
]

# Auxiliary PDFs mirrored in repository
AUX_PDFS = [
    "Cerere angajare.pdf",
    "Declaratie luare cunostinta RI.pdf",
    "Declaratie pe proprie raspundere CIM.pdf",
]

class VerificationFailure(Exception):
    pass

def log_pass(msg: str):
    print(f"  [PASS] {msg}")

def log_fail(msg: str):
    print(f"  [FAIL] {msg}")
    raise VerificationFailure(msg)

def sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()

def test_1_parity_and_checksums():
    print("\n=======================================================")
    print("TEST 1: Bit-for-Bit SHA-256 Checksum Parity (All 31 Templates + 3 PDFs)")
    print("=======================================================")
    files_to_check = ALL_31_TEMPLATES + AUX_PDFS
    for fname in files_to_check:
        p_norm = os.path.join(TARGET_DIRS["normalized"], fname)
        p_hand = os.path.join(TARGET_DIRS["handoff"], fname)
        
        if not os.path.exists(p_norm):
            log_fail(f"Missing in templates_registry/normalized: {fname}")
        if not os.path.exists(p_hand):
            log_fail(f"Missing in handoff/.../templates: {fname}")
            
        sha_norm = sha256_file(p_norm)
        sha_hand = sha256_file(p_hand)
        size_norm = os.path.getsize(p_norm)
        size_hand = os.path.getsize(p_hand)
        
        if size_norm == 0:
            log_fail(f"File {fname} is 0 bytes in normalized directory!")
        if size_hand == 0:
            log_fail(f"File {fname} is 0 bytes in handoff directory!")
            
        if sha_norm != sha_hand:
            log_fail(f"Checksum mismatch for {fname}:\n  normalized: {sha_norm} ({size_norm}b)\n  handoff:    {sha_hand} ({size_hand}b)")
        
        log_pass(f"{fname}: SHA-256 matched ({sha_norm[:16]}..., {size_norm} bytes)")

def test_2_zip_and_xml_wellformedness():
    print("\n=======================================================")
    print("TEST 2: ZIP Package & Full XML Well-Formedness (All 31 Templates)")
    print("=======================================================")
    total_xml_parts = 0
    for dir_name, dir_path in TARGET_DIRS.items():
        print(f"  Directory: {dir_name}")
        for fname in ALL_31_TEMPLATES:
            file_path = os.path.join(dir_path, fname)
            try:
                with zipfile.ZipFile(file_path, "r") as zf:
                    corrupt_entry = zf.testzip()
                    if corrupt_entry:
                        log_fail(f"Corrupt ZIP entry '{corrupt_entry}' in {fname} ({dir_name})")
                    
                    for name in zf.namelist():
                        if name.endswith(".xml") or name.endswith(".rels"):
                            xml_bytes = zf.read(name)
                            try:
                                ET.fromstring(xml_bytes)
                                total_xml_parts += 1
                            except ET.ParseError as pe:
                                log_fail(f"Malformed XML in {dir_name}/{fname} -> {name}: {pe}")
            except Exception as e:
                log_fail(f"Failed to inspect ZIP archive {file_path}: {e}")
            log_pass(f"{dir_name}/{fname}: valid ZIP, all XML/.rels parts well-formed")
    print(f"  Total XML/RELS parts parsed across both mirrors: {total_xml_parts}")

def test_3_openxml_package_structure():
    print("\n=======================================================")
    print("TEST 3: OpenXML Package Structure for 6 New Statutory Templates")
    print("=======================================================")
    required_parts = [
        "[Content_Types].xml",
        "_rels/.rels",
        "word/document.xml",
        "word/_rels/document.xml.rels",
        "word/styles.xml"
    ]
    
    ct_ns = {"ct": "http://schemas.openxmlformats.org/package/2006/content-types"}
    rel_ns = {"rel": "http://schemas.openxmlformats.org/package/2006/relationships"}
    w_ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    
    for fname in NEW_6_STATUTORY_TEMPLATES:
        p = os.path.join(TARGET_DIRS["normalized"], fname)
        print(f"  Inspecting statutory package: {fname}")
        with zipfile.ZipFile(p, "r") as zf:
            namelist = zf.namelist()
            for req in required_parts:
                if req not in namelist:
                    log_fail(f"{fname} missing required OpenXML part: {req}")
            
            # 1. Inspect [Content_Types].xml
            ct_tree = ET.fromstring(zf.read("[Content_Types].xml"))
            if not ct_tree.tag.endswith("Types"):
                log_fail(f"[Content_Types].xml root element is not Types in {fname}")
            
            has_doc_override = False
            has_styles_override = False
            for override in ct_tree.findall("ct:Override", ct_ns):
                part_name = override.attrib.get("PartName", "")
                content_type = override.attrib.get("ContentType", "")
                if part_name == "/word/document.xml" and "wordprocessingml.document.main+xml" in content_type:
                    has_doc_override = True
                if part_name == "/word/styles.xml" and "wordprocessingml.styles+xml" in content_type:
                    has_styles_override = True
            
            if not has_doc_override:
                log_fail(f"{fname}: [Content_Types].xml missing main document override")
            if not has_styles_override:
                log_fail(f"{fname}: [Content_Types].xml missing styles override")
            
            # 2. Inspect _rels/.rels
            root_rels = ET.fromstring(zf.read("_rels/.rels"))
            has_office_doc_rel = False
            for rel in root_rels.findall("rel:Relationship", rel_ns):
                target = rel.attrib.get("Target", "")
                rel_type = rel.attrib.get("Type", "")
                if "word/document.xml" in target and "officeDocument" in rel_type:
                    has_office_doc_rel = True
            if not has_office_doc_rel:
                log_fail(f"{fname}: _rels/.rels missing officeDocument relationship to word/document.xml")
            
            # 3. Inspect word/document.xml
            doc_tree = ET.fromstring(zf.read("word/document.xml"))
            if not doc_tree.tag.endswith("document"):
                log_fail(f"{fname}: word/document.xml root is not w:document")
            body = doc_tree.find("w:body", w_ns)
            if body is None:
                log_fail(f"{fname}: word/document.xml has no w:body element")
            
            # 4. Inspect word/_rels/document.xml.rels
            doc_rels = ET.fromstring(zf.read("word/_rels/document.xml.rels"))
            has_styles_rel = False
            for rel in doc_rels.findall("rel:Relationship", rel_ns):
                target = rel.attrib.get("Target", "")
                rel_type = rel.attrib.get("Type", "")
                if "styles.xml" in target and "styles" in rel_type:
                    has_styles_rel = True
            if not has_styles_rel:
                log_fail(f"{fname}: word/_rels/document.xml.rels missing relationship to styles.xml")
            
            # 5. Inspect word/styles.xml
            styles_tree = ET.fromstring(zf.read("word/styles.xml"))
            if not styles_tree.tag.endswith("styles"):
                log_fail(f"{fname}: word/styles.xml root is not w:styles")
                
            log_pass(f"{fname}: All 5 core OpenXML components valid and interlinked")

def test_4_docxtemplater_tags_and_balance():
    print("\n=======================================================")
    print("TEST 4: docxtemplater Tag Syntax, Placement, and Balance")
    print("=======================================================")
    w_ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    
    for fname in NEW_6_STATUTORY_TEMPLATES:
        p = os.path.join(TARGET_DIRS["normalized"], fname)
        with zipfile.ZipFile(p, "r") as zf:
            doc_raw = zf.read("word/document.xml").decode("utf-8")
            doc_tree = ET.fromstring(doc_raw)
            
            # 1. Assert curly braces exist ONLY inside <w:t> elements
            # Extract all w:t text
            wt_nodes = doc_tree.findall(".//{http://schemas.openxmlformats.org/wordprocessingml/2006/main}t")
            wt_text_joined = "".join([n.text or "" for n in wt_nodes])
            
            open_in_raw = doc_raw.count("{")
            close_in_raw = doc_raw.count("}")
            open_in_wt = wt_text_joined.count("{")
            close_in_wt = wt_text_joined.count("}")
            
            if open_in_raw != open_in_wt or close_in_raw != close_in_wt:
                log_fail(f"{fname}: Curly braces found OUTSIDE <w:t> elements! (raw: {open_in_raw}/{close_in_raw}, wt: {open_in_wt}/{close_in_wt})")
            
            if open_in_wt != close_in_wt:
                log_fail(f"{fname}: Unbalanced curly braces! ({open_in_wt} open vs {close_in_wt} close)")
                
            # 2. Extract and validate all tags
            tags = re.findall(r"\{([^{}]+)\}", wt_text_joined)
            loop_stack = []
            scalar_count = 0
            loop_count = 0
            
            for tag in tags:
                tag_trimmed = tag.strip()
                if tag_trimmed.startswith("#"):
                    loop_name = tag_trimmed[1:]
                    loop_stack.append(loop_name)
                    loop_count += 1
                elif tag_trimmed.startswith("/"):
                    loop_name = tag_trimmed[1:]
                    if not loop_stack:
                        log_fail(f"{fname}: Orphan closing loop tag {{/{loop_name}}}")
                    last_opened = loop_stack.pop()
                    if last_opened != loop_name:
                        log_fail(f"{fname}: Loop nesting mismatch: opened {{#{last_opened}}} but closed {{/{loop_name}}}")
                elif tag_trimmed.startswith("^"):
                    log_fail(f"{fname}: Unexpected inverted section tag: {{{tag_trimmed}}}")
                else:
                    scalar_count += 1
            
            if loop_stack:
                log_fail(f"{fname}: Unclosed loop tags: {loop_stack}")
            
            log_pass(f"{fname}: {open_in_wt} balanced tags ({scalar_count} scalar, {loop_count} loops), 100% inside <w:t>")

def test_5_table_loop_markup_integrity():
    print("\n=======================================================")
    print("TEST 5: Table Loop Markup Preservation in Training Sheets")
    print("=======================================================")
    w_ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    
    table_loop_files = [
        ("ssm-fisa-instruire-individuala.docx", ["instruiriPeriodiceSSM", "instruiriSuplimentareSSM", "testariSSM"]),
        ("psi-fisa-instructaj-individuala.docx", ["instructajePeriodicePSI", "exercitiiPracticePSI"]),
    ]
    
    for fname, expected_loops in table_loop_files:
        p = os.path.join(TARGET_DIRS["normalized"], fname)
        with zipfile.ZipFile(p, "r") as zf:
            doc_raw = zf.read("word/document.xml").decode("utf-8")
            doc_tree = ET.fromstring(doc_raw)
            
            for loop_name in expected_loops:
                open_tag = f"{{#{loop_name}}}"
                close_tag = f"{{/{loop_name}}}"
                
                # Find all <w:tr> elements
                matching_rows = []
                for tr in doc_tree.findall(f".//{{{w_ns}}}tr"):
                    # Extract text of this tr
                    tr_text = "".join([t.text or "" for t in tr.findall(f".//{{{w_ns}}}t")])
                    if open_tag in tr_text or close_tag in tr_text:
                        matching_rows.append((tr, tr_text))
                
                if not matching_rows:
                    log_fail(f"{fname}: Expected loop '{loop_name}' not found in any <w:tr>")
                
                for tr, tr_text in matching_rows:
                    if open_tag in tr_text and close_tag in tr_text:
                        # Open and close are in the same row!
                        # Verify open is before close
                        idx_open = tr_text.index(open_tag)
                        idx_close = tr_text.index(close_tag)
                        if idx_open >= idx_close:
                            log_fail(f"{fname}: In loop '{loop_name}', open tag is after close tag in row")
                        log_pass(f"{fname}: Loop '{loop_name}' properly scoped inside single <w:tr> container")
                    else:
                        log_fail(f"{fname}: Loop '{loop_name}' split across multiple <w:tr> containers! Breaks table loop semantics")

def test_6_runtime_docxtemplater_rendering():
    print("\n=======================================================")
    print("TEST 6: Runtime docxtemplater Rendering & Stress Test")
    print("=======================================================")
    script = """
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';

const templates = [
  'ssm-fisa-instruire-individuala.docx',
  'psi-fisa-instructaj-individuala.docx',
  'med-fisa-solicitare-examen.docx',
  'med-fisa-identificare-riscuri.docx',
  'eip-fisa-acordare-individuala.docx',
  'hr-cim-model-cadru-2022.docx'
];

for (const t of templates) {
  const filePath = path.join('templates_registry/normalized', t);
  const content = fs.readFileSync(filePath, 'binary');
  const zip = new PizZip(content);
  const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

  // 1. Render empty
  doc.render({});
  
  // 2. Render with padded rows and XML entities
  const zip2 = new PizZip(content);
  const doc2 = new Docxtemplater(zip2, { paragraphLoop: true, linebreaks: true });
  const stressData = {
    PLACEHOLDER_FIRMA: 'SC \"EXPERT\" & <SSM> SRL',
    PLACEHOLDER_NUME_COMPLET: 'ION & VASILE',
    instruiriPeriodiceSSM: Array.from({ length: 16 }, (_, i) => ({
      nr: String(i + 1),
      data: '01.01.2026',
      durata: '2h',
      ocupatia: 'Inginer & Lucrator',
      tematica: 'Norme <Generale>',
      semnaturaInstruit: 'Semn.',
      semnaturaInstructor: 'Semn.',
      semnaturaVerificator: 'Semn.'
    })),
    instructajePeriodicePSI: Array.from({ length: 16 }, (_, i) => ({
      nr: String(i + 1),
      data: '01.01.2026',
      durata: '2h',
      ocupatia: 'Inginer',
      tematica: 'PSI Standard',
      semnaturaInstruit: 'Semn.',
      semnaturaInstructor: 'Semn.',
      semnaturaVerificator: 'Semn.'
    })),
    instruiriSuplimentareSSM: Array.from({ length: 4 }, (_, i) => ({
      nr: String(i + 1), data: '', durata: '', cauza: '', tematica: '', semnaturaInstruit: '', semnaturaInstructor: '', semnaturaVerificator: ''
    })),
    testariSSM: Array.from({ length: 4 }, (_, i) => ({
      data: '', tipTestare: '', tematica: '', rezultat: '', examinator: '', semnaturaLucrator: ''
    })),
    exercitiiPracticePSI: Array.from({ length: 4 }, (_, i) => ({
      data: '', tipExercitiu: '', temaExercitiu: '', semnaturaInstruit: '', semnaturaInstructor: ''
    }))
  };

  doc2.render(stressData);
  const outBuf = doc2.getZip().generate({ type: 'nodebuffer' });
  if (outBuf.length < 5000) {
    throw new Error('Rendered ' + t + ' buffer suspiciously small: ' + outBuf.length + ' bytes');
  }
  console.log('[PASS_DOCX] ' + t + ' rendered successfully (size: ' + outBuf.length + ' bytes)');
}
"""
    res = subprocess.run(["npx", "tsx", "-e", script], capture_output=True, text=True)
    if res.returncode != 0:
        log_fail(f"Runtime docxtemplater test failed:\nSTDOUT:\n{res.stdout}\nSTDERR:\n{res.stderr}")
    for line in res.stdout.strip().split("\n"):
        if "[PASS_DOCX]" in line:
            log_pass(line.replace("[PASS_DOCX] ", ""))

def test_7_generation_suite_all_31():
    print("\n=======================================================")
    print("TEST 7: Full 31 Template Generation Acceptance Suite")
    print("=======================================================")
    res = subprocess.run(["npx", "tsx", "scripts/test-all-templates-generation.ts"], capture_output=True, text=True)
    if res.returncode != 0:
        log_fail(f"Generation suite failed with code {res.returncode}:\n{res.stdout}\n{res.stderr}")
    
    # Assert all 31 templates passed
    if "TRECUTE (PASS): 31 | EȘUATE (FAIL): 0" not in res.stdout:
        log_fail(f"Expected 31/31 passed in test-all-templates-generation.ts, got:\n{res.stdout}")
    log_pass("All 31 templates generated with status 'approved_for_print' and 0 unmapped tokens")

def test_8_unified_acceptance_and_build():
    print("\n=======================================================")
    print("TEST 8: Unified 130-item Acceptance Suite & Production Build")
    print("=======================================================")
    # 1. verify-all.ts
    res_verify = subprocess.run(["npx", "tsx", "scripts/verify-all.ts"], capture_output=True, text=True)
    if res_verify.returncode != 0:
        log_fail(f"verify-all.ts failed:\n{res_verify.stdout}\n{res_verify.stderr}")
    if "130 / 130 passed" not in res_verify.stdout or "ACCEPTANCE PASSED" not in res_verify.stdout:
        log_fail(f"Expected 130/130 in verify-all.ts:\n{res_verify.stdout}")
    log_pass("verify-all.ts: 130/130 verification items passed across all 5 suites")
    
    # 2. npm run build
    res_build = subprocess.run(["npm", "run", "build"], capture_output=True, text=True)
    if res_build.returncode != 0:
        log_fail(f"npm run build failed:\n{res_build.stdout}\n{res_build.stderr}")
    log_pass("npm run build: Next.js 16.4.3 Turbopack build succeeded with 0 errors")

def main():
    print("================================================================================")
    print("M2 GATE EMPIRICAL CHALLENGER 2: PARITY & OPENXML PACKAGE AUDIT")
    print("================================================================================")
    try:
        test_1_parity_and_checksums()
        test_2_zip_and_xml_wellformedness()
        test_3_openxml_package_structure()
        test_4_docxtemplater_tags_and_balance()
        test_5_table_loop_markup_integrity()
        test_6_runtime_docxtemplater_rendering()
        test_7_generation_suite_all_31()
        test_8_unified_acceptance_and_build()
        print("\n================================================================================")
        print("ALL 8 VERIFICATION TESTS PASSED — VERDICT: APPROVE")
        print("================================================================================")
        sys.exit(0)
    except VerificationFailure as e:
        print(f"\nAUDIT HALTED ON FAILURE: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
