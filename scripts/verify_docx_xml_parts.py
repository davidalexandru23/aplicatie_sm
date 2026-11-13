#!/usr/bin/env python3
"""
Empirical XML Verification Oracle for OpenXML DOCX archives.
Parses every .xml and .rels file using standard Python xml.etree.ElementTree.
Validates:
1. XML well-formedness (no syntax / parse errors)
2. No raw unescaped ampersands in XML data
3. No unescaped angle brackets or tag breakages
"""

import sys
import zipfile
import re
import xml.etree.ElementTree as ET

# Regex matching raw ampersands NOT part of valid XML entities
RAW_AMP_REGEX = re.compile(r'&(?!(?:amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)')

def verify_docx(docx_path: str) -> dict:
    results = {
        'path': docx_path,
        'total_parts': 0,
        'xml_parts': 0,
        'rels_parts': 0,
        'errors': [],
        'raw_ampersands': []
    }

    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            results['total_parts'] = len(z.namelist())
            for name in z.namelist():
                is_xml = name.endswith('.xml')
                is_rels = name.endswith('.rels')
                if not (is_xml or is_rels):
                    continue

                if is_xml:
                    results['xml_parts'] += 1
                if is_rels:
                    results['rels_parts'] += 1

                raw_bytes = z.read(name)
                raw_text = raw_bytes.decode('utf-8', errors='replace')

                # 1. Check XML well-formedness with ElementTree
                try:
                    root = ET.fromstring(raw_bytes)
                except ET.ParseError as pe:
                    results['errors'].append(f"{name}: XML ParseError - {pe}")
                    continue
                except Exception as ex:
                    results['errors'].append(f"{name}: Unexpected parsing exception - {ex}")
                    continue

                # 2. Check for raw unescaped ampersands
                raw_amps = RAW_AMP_REGEX.findall(raw_text)
                if raw_amps:
                    results['raw_ampersands'].append(f"{name}: found {len(raw_amps)} raw unescaped '&'")

    except zipfile.BadZipFile as bz:
        results['errors'].append(f"Bad zip file: {bz}")
    except Exception as ex:
        results['errors'].append(f"Fatal error reading zip: {ex}")

    return results

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: verify_docx_xml_parts.py <docx_path_1> [docx_path_2 ...]")
        sys.exit(1)

    all_passed = True
    total_xml_parts = 0
    total_rels_parts = 0

    for arg in sys.argv[1:]:
        res = verify_docx(arg)
        total_xml_parts += res['xml_parts']
        total_rels_parts += res['rels_parts']

        if res['errors'] or res['raw_ampersands']:
            all_passed = False
            print(f"FAILED: {arg}")
            for err in res['errors']:
                print(f"  [ERROR] {err}")
            for amp in res['raw_ampersands']:
                print(f"  [RAW_AMP] {amp}")
        else:
            print(f"OK ({res['xml_parts']} xml, {res['rels_parts']} rels): {arg}")

    print(f"\nSummary: Verified {len(sys.argv) - 1} documents, {total_xml_parts} xml parts, {total_rels_parts} rels parts.")
    if not all_passed:
        sys.exit(1)
    print("ALL XML AND RELS PARTS PARSED CLEANLY WITH ZERO SYNTAX ERRORS!")
    sys.exit(0)
