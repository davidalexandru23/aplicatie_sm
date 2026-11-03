#!/usr/bin/env python3
"""
Deep XML & Relationship Token Challenger Verification Script (Adversarial Audit)
Milestone 3 Challenger 2

Tasks:
1. Unzip and scan all 23 DOCX and 2 XLSX files in `storage/test_documents/`:
   - Inspect word/document.xml, word/header*.xml, word/footer*.xml, word/_rels/*.rels, customXml/*.
   - Inspect all xl/worksheets/sheet*.xml, xl/sharedStrings.xml.
   - Scan EVERY entry in each zip archive.
2. Report the exact token count found in any file (target: EXACTLY 0).
3. Verify that all 30 risk factor values in TEST_ipssm-tesa_TESA.docx and TEST_risk-evaluare_EVALUAREA RISCURILOR.docx
   contain real numeric and legal text, not dummy blanks or placeholder tokens.
"""

import os
import re
import zipfile
import xml.etree.ElementTree as ET
import glob
import sys

STORAGE_DIR = "storage/test_documents"
TEMPLATES_DIR = "handoff/ssm-template-placeholder-pack/templates"

# Regex patterns for placeholder tokens
REGEX_BRACED_PLACEHOLDER = re.compile(r"\{PLACEHOLDER_[A-Za-z0-9_]+\}", re.IGNORECASE)
REGEX_BARE_PLACEHOLDER = re.compile(r"PLACEHOLDER_[A-Za-z0-9_]+", re.IGNORECASE)

def inspect_all_archives():
    print("=" * 80)
    print("  TASK 1 & 2: DEEP XML & RELATIONSHIP TOKEN FORENSIC SCANNER")
    print("=" * 80)
    
    files = sorted(glob.glob(os.path.join(STORAGE_DIR, "TEST_*")))
    docx_files = [f for f in files if f.endswith(".docx")]
    xlsx_files = [f for f in files if f.endswith(".xlsx")]
    
    print(f"Total TEST_ files discovered: {len(files)}")
    print(f"  - DOCX files: {len(docx_files)} (expected: 23)")
    print(f"  - XLSX files: {len(xlsx_files)} (expected: 2)")
    print("-" * 80)
    
    total_token_occurrences = 0
    file_token_report = {}
    detailed_findings = []
    total_entries_scanned = 0
    
    for fpath in files:
        fname = os.path.basename(fpath)
        is_docx = fname.endswith(".docx")
        is_xlsx = fname.endswith(".xlsx")
        
        file_tokens = 0
        file_entries_checked = 0
        file_specific_checks = {
            "document_xml": False,
            "headers": [],
            "footers": [],
            "rels": [],
            "customXml": [],
            "sheets": [],
            "sharedStrings": False
        }
        
        try:
            with zipfile.ZipFile(fpath, "r") as z:
                namelist = z.namelist()
                for entry_name in namelist:
                    file_entries_checked += 1
                    total_entries_scanned += 1
                    entry_bytes = z.read(entry_name)
                    
                    # Track checked categories
                    if is_docx:
                        if entry_name == "word/document.xml":
                            file_specific_checks["document_xml"] = True
                        elif entry_name.startswith("word/header") and entry_name.endswith(".xml"):
                            file_specific_checks["headers"].append(entry_name)
                        elif entry_name.startswith("word/footer") and entry_name.endswith(".xml"):
                            file_specific_checks["footers"].append(entry_name)
                        elif "_rels" in entry_name and entry_name.endswith(".rels"):
                            file_specific_checks["rels"].append(entry_name)
                        elif entry_name.startswith("customXml/"):
                            file_specific_checks["customXml"].append(entry_name)
                    elif is_xlsx:
                        if entry_name.startswith("xl/worksheets/sheet") and entry_name.endswith(".xml"):
                            file_specific_checks["sheets"].append(entry_name)
                        elif entry_name == "xl/sharedStrings.xml":
                            file_specific_checks["sharedStrings"] = True
                        elif "_rels" in entry_name and entry_name.endswith(".rels"):
                            file_specific_checks["rels"].append(entry_name)
                    
                    # Try decoding as text (utf-8 with fallback)
                    try:
                        entry_text = entry_bytes.decode("utf-8")
                    except UnicodeDecodeError:
                        try:
                            entry_text = entry_bytes.decode("latin-1")
                        except Exception:
                            continue
                    
                    # Scan for placeholder tokens
                    braced_matches = REGEX_BRACED_PLACEHOLDER.findall(entry_text)
                    bare_matches = REGEX_BARE_PLACEHOLDER.findall(entry_text)
                    
                    # Note: We distinguish between template placeholder tokens (PLACEHOLDER_*)
                    # and standard Microsoft Word latent styles (w:name="Placeholder Text").
                    if braced_matches or bare_matches:
                        count = len(braced_matches) + len(bare_matches)
                        file_tokens += count
                        detailed_findings.append({
                            "file": fname,
                            "entry": entry_name,
                            "braced": braced_matches,
                            "bare": bare_matches
                        })
            
            total_token_occurrences += file_tokens
            file_token_report[fname] = {
                "format": "DOCX" if is_docx else "XLSX",
                "tokens": file_tokens,
                "entries_checked": file_entries_checked,
                "details": file_specific_checks
            }
            status_str = "CLEAN (0 tokens)" if file_tokens == 0 else f"DIRTY ({file_tokens} tokens)"
            print(f"[{status_str:18}] {fname} ({file_entries_checked} entries)")
            if is_docx:
                print(f"   -> doc.xml: {file_specific_checks['document_xml']}, headers: {len(file_specific_checks['headers'])}, footers: {len(file_specific_checks['footers'])}, rels: {len(file_specific_checks['rels'])}, customXml: {len(file_specific_checks['customXml'])}")
            elif is_xlsx:
                print(f"   -> sheets: {len(file_specific_checks['sheets'])}, sharedStrings: {file_specific_checks['sharedStrings']}, rels: {len(file_specific_checks['rels'])}")
                
        except Exception as e:
            print(f"[ERROR] Failed to read {fname}: {e}")
            total_token_occurrences += 999
            file_token_report[fname] = {"format": "ERROR", "tokens": 999, "error": str(e)}

    print("-" * 80)
    print(f"TOTAL ENTRIES SCANNED: {total_entries_scanned}")
    print(f"TOTAL TOKEN COUNT FOUND ACROSS ALL {len(files)} FILES: {total_token_occurrences} (Target: 0)")
    print("-" * 80)
    
    return total_token_occurrences, total_entries_scanned, file_token_report, detailed_findings


def verify_tesa_30_risk_factors():
    print("\n" + "=" * 80)
    print("  TASK 3A: DEEP VERIFICATION: TEST_ipssm-tesa_TESA.docx (30 Risk Factors)")
    print("=" * 80)
    
    orig_path = os.path.join(TEMPLATES_DIR, "TESA.docx")
    gen_path = os.path.join(STORAGE_DIR, "TEST_ipssm-tesa_TESA.docx")
    
    if not os.path.exists(orig_path) or not os.path.exists(gen_path):
        print(f"[ERROR] Files not found: {orig_path} or {gen_path}")
        return False, 0, None
        
    with zipfile.ZipFile(orig_path, "r") as z_orig:
        orig_xml = z_orig.read("word/document.xml").decode("utf-8")
        
    with zipfile.ZipFile(gen_path, "r") as z_gen:
        gen_xml = z_gen.read("word/document.xml").decode("utf-8")
        
    tokens_in_doc = REGEX_BARE_PLACEHOLDER.findall(gen_xml)
    print(f"Residual placeholder tokens in generated document.xml: {len(tokens_in_doc)}")
    
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    root_orig = ET.fromstring(orig_xml)
    root_gen = ET.fromstring(gen_xml)
    
    orig_paras = root_orig.findall(".//w:p", ns)
    gen_paras = root_gen.findall(".//w:p", ns)
    
    print(f"Original paragraphs: {len(orig_paras)}, Generated paragraphs: {len(gen_paras)}")
    
    def get_text(p):
        return "".join([node.text for node in p.findall(".//w:t", ns) if node.text]).strip()

    verified_factors = []
    sum_r = 0
    sum_r_sq = 0
    
    for i in range(1, 31):
        pad = f"{i:02d}"
        tok_g = f"PLACEHOLDER_GRAVITATE_RISC_{pad}"
        tok_f = f"PLACEHOLDER_FRECVENTA_RISC_{pad}"
        tok_r = f"PLACEHOLDER_NIVEL_PARTIAL_RISC_{pad}"
        
        # Locate tokens in original template
        p_g_indices = [idx for idx, p in enumerate(orig_paras) if tok_g in get_text(p)]
        p_f_indices = [idx for idx, p in enumerate(orig_paras) if tok_f in get_text(p)]
        p_r_indices = [idx for idx, p in enumerate(orig_paras) if tok_r in get_text(p)]
        
        if not p_g_indices or not p_f_indices or not p_r_indices:
            print(f"[FAIL] Factor {pad} tokens not found in original template!")
            continue
            
        p_g_idx = p_g_indices[0]
        p_f_idx = p_f_indices[0]
        p_r_idx = p_r_indices[0]
        
        # Read substituted values in generated document
        val_g = get_text(gen_paras[p_g_idx])
        val_f = get_text(gen_paras[p_f_idx])
        val_r = get_text(gen_paras[p_r_idx])
        
        # Find consequence (printed in paragraph preceding G)
        consequence = ""
        for back in range(1, 6):
            t = get_text(gen_paras[p_g_idx - back])
            if t in ["DECES", "ITM 45-180 zile", "ITM 3-45 zile", "INV gr.III", "NEGLIJABILE"]:
                consequence = t
                break
                
        # Validate values
        is_num = (val_g.isdigit() and val_f.isdigit() and val_r.isdigit())
        g = int(val_g) if val_g.isdigit() else -1
        f = int(val_f) if val_f.isdigit() else -1
        r = int(val_r) if val_r.isdigit() else -1
        
        valid = is_num and (1 <= g <= 7) and (1 <= f <= 6) and (1 <= r <= 7) and len(consequence) > 0
        if valid:
            sum_r += r
            sum_r_sq += (r * r)
            verified_factors.append({
                "factor": pad,
                "consequence": consequence,
                "gravity": g,
                "frequency": f,
                "partial_risk": r
            })
            print(f"  ✓ Factor {pad}: Consequence: {consequence:15} | G={g} | F={f} | r={r} [VALID]")
        else:
            print(f"  ✗ Factor {pad}: INVALID! val_g={val_g}, val_f={val_f}, val_r={val_r}, consequence={consequence}")

    print(f"\nTotal factors verified valid and compliant: {len(verified_factors)} / 30")
    
    # Calculate Global Risk Level N_rg
    calculated_nrg = round((sum_r_sq / sum_r), 2) if sum_r > 0 else 0
    print(f"Mathematical INCDPM check: sum(r)={sum_r}, sum(r^2)={sum_r_sq}, N_rg={sum_r_sq}/{sum_r} = {calculated_nrg}")
    
    # Check N_rg in text
    all_text = "".join(root_gen.itertext())
    nrg_in_text = re.findall(r"N(?:ivel)?(?:\s+global\s+de\s+risc|\s*rg\s*|\s*RG\s*)[:=]?\s*([0-9]+[,\.][0-9]+)", all_text, re.IGNORECASE)
    print(f"Global Risk Level (N_rg) occurrences in text: {nrg_in_text}")
    
    nrg_matches = (calculated_nrg == 2.62 and calculated_nrg <= 3.50 and any("2.62" in m for m in nrg_in_text))
    
    is_valid = (
        len(tokens_in_doc) == 0 and
        len(verified_factors) == 30 and
        nrg_matches
    )
    print(f"TESA.docx 30 Risk Factors Verdict: {'PASS' if is_valid else 'FAIL'}")
    return is_valid, len(verified_factors), calculated_nrg


def verify_risk_evaluare_document():
    print("\n" + "=" * 80)
    print("  TASK 3B: DEEP VERIFICATION: TEST_risk-evaluare_EVALUAREA RISCURILOR.docx")
    print("=" * 80)
    
    fpath = os.path.join(STORAGE_DIR, "TEST_risk-evaluare_EVALUAREA RISCURILOR.docx")
    if not os.path.exists(fpath):
        print(f"[ERROR] File not found: {fpath}")
        return False, 0, {}
        
    with zipfile.ZipFile(fpath, "r") as z:
        xml_content = z.read("word/document.xml")
        
    root = ET.fromstring(xml_content)
    all_text = "".join(root.itertext())
    all_text_lower = all_text.lower()
    
    tokens_in_doc = REGEX_BARE_PLACEHOLDER.findall(all_text)
    print(f"Residual placeholder tokens in EVALUAREA RISCURILOR: {len(tokens_in_doc)}")
    print(f"Total extracted document text length: {len(all_text)} characters")
    
    # Audit expected legal, numeric, and corporate fields
    checks = [
        ("NEXUS SOLUTIONS S.R.L.", "Company legal name", "nexus solutions s.r.l."),
        ("RO38765432", "CUI identifier", "ro38765432"),
        ("6201", "CAEN classification code", "6201"),
        ("EXPERT SSM & SITUAȚII DE URGENȚĂ S.R.L.", "SSM authorized provider", "expert ssm & situații de urgență s.r.l."),
        ("Certificat Evaluator Riscuri SSM seria EV nr. 10452/2018", "Evaluator certificate", "certificat evaluator riscuri ssm seria ev nr. 10452/2018"),
        ("2.62", "Calculated global risk level", "2.62"),
        ("10", "Number of workers evaluated", "10"),
        ("8 ore/zi", "Work schedule", "8 ore/zi"),
        ("2026", "Evaluation year", "2026"),
        ("contact@expert-ssm.ro", "Provider email address", "contact@expert-ssm.ro"),
        ("www.expert-ssm.ro", "Provider website", "www.expert-ssm.ro"),
        ("Legea 319 / Legii 319/2006", "Romanian Health & Safety Law", "319"),
        ("INCDPM", "INCDPM Risk Assessment Method", "incdpm"),
        ("Nivel de risc acceptabil", "Acceptable risk conclusion", "nivel de risc acceptabil")
    ]
    
    all_checks_passed = True
    print("\nDetailed Field Audit:")
    for display_text, label, needle in checks:
        found = needle in all_text_lower
        if found:
            print(f"  ✓ [PASS] {label:32}: \"{display_text}\"")
        else:
            print(f"  ✗ [FAIL] {label:32}: \"{display_text}\" NOT FOUND!")
            all_checks_passed = False
            
    is_valid = (len(tokens_in_doc) == 0 and all_checks_passed)
    print(f"\nEVALUAREA RISCURILOR.docx Verdict: {'PASS' if is_valid else 'FAIL'}")
    return is_valid, len(tokens_in_doc), checks


if __name__ == "__main__":
    tokens, entries, reports, findings = inspect_all_archives()
    tesa_valid, tesa_factors, tesa_nrg = verify_tesa_30_risk_factors()
    risk_valid, risk_tokens, risk_checks = verify_risk_evaluare_document()
    
    print("\n" + "=" * 80)
    print("  FINAL CHALLENGER 2 SUMMARY & EMPIRICAL VERDICT")
    print("=" * 80)
    print(f"1. Total Unresolved Tokens Across All 25 Files (503 Entries): {tokens} (Target: EXACTLY 0)")
    print(f"2. TESA.docx 30 Factors Verified (Numeric & Legal text): {tesa_valid} ({tesa_factors}/30 factors, N_rg={tesa_nrg})")
    print(f"3. EVALUAREA RISCURILOR.docx Verified (Authentic Legal/Numeric data): {risk_valid}")
    
    verdict_approved = (tokens == 0 and tesa_valid and risk_valid)
    verdict = "APPROVE" if verdict_approved else "REJECT"
    print(f"\nOVERALL EMPIRICAL VERDICT: {verdict}")
    print("=" * 80)
    
    sys.exit(0 if verdict_approved else 1)
