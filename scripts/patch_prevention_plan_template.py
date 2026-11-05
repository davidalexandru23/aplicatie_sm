#!/usr/bin/env python3
"""
Patch 'Plan de Prevenire TESA.docx' to replace static pseudo-table paragraphs with a dynamic
Word table looped via {#planPrevenire}...{/planPrevenire}.
Applies identically to both templates_registry/normalized and handoff/ssm-template-placeholder-pack/templates.
"""

import os
import zipfile
import xml.etree.ElementTree as ET

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
ET.register_namespace('w', W_NS)

TARGET_PATHS = [
    "templates_registry/normalized/Plan de Prevenire TESA.docx",
    "handoff/ssm-template-placeholder-pack/templates/Plan de Prevenire TESA.docx"
]

TABLE_XML = """
<w:tbl xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:tblPr>
    <w:tblW w:w="0" w:type="auto"/>
    <w:tblBorders>
      <w:top w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
      <w:left w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
      <w:bottom w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
      <w:right w:val="single" w:sz="4" w:space="0" w:color="A0A0A0"/>
      <w:insideH w:val="single" w:sz="4" w:space="0" w:color="C0C0C0"/>
      <w:insideV w:val="single" w:sz="4" w:space="0" w:color="C0C0C0"/>
    </w:tblBorders>
    <w:tblLayout w:type="fixed"/>
  </w:tblPr>
  <w:tblGrid>
    <w:gridCol w:w="500"/>
    <w:gridCol w:w="2400"/>
    <w:gridCol w:w="1400"/>
    <w:gridCol w:w="1400"/>
    <w:gridCol w:w="1200"/>
    <w:gridCol w:w="800"/>
    <w:gridCol w:w="1400"/>
    <w:gridCol w:w="900"/>
    <w:gridCol w:w="1100"/>
  </w:tblGrid>
  <w:tr>
    <w:trPr>
      <w:tblHeader/>
      <w:cantSplit/>
    </w:trPr>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="500" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="E9ECEF"/>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/></w:rPr><w:t>Nr. crt.</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="2400" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="E9ECEF"/>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/></w:rPr><w:t>Riscuri evaluate / Factor de risc</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="1400" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="E9ECEF"/>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/></w:rPr><w:t>Măsuri tehnice</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="1400" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="E9ECEF"/>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/></w:rPr><w:t>Măsuri organizatorice</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="1200" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="E9ECEF"/>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/></w:rPr><w:t>Măsuri igienico-sanitare</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="800" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="E9ECEF"/>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/></w:rPr><w:t>Măsuri de altă natură</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="1400" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="E9ECEF"/>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/></w:rPr><w:t>Acțiuni în scopul realizării măsurii</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="900" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="E9ECEF"/>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/></w:rPr><w:t>Termen de realizare</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr>
        <w:tcW w:w="1100" w:type="dxa"/>
        <w:shd w:val="clear" w:color="auto" w:fill="E9ECEF"/>
        <w:vAlign w:val="center"/>
      </w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/></w:rPr><w:t>Persoana care răspunde</w:t></w:r></w:p>
    </w:tc>
  </w:tr>
  <w:tr>
    <w:trPr>
      <w:cantSplit/>
    </w:trPr>
    <w:tc>
      <w:tcPr><w:tcW w:w="500" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>{#planPrevenire}{nr}</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="2400" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="16"/></w:rPr><w:t>{riscEvaluat}</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1400" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>{masuriTehnice}</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1400" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>{masuriOrganizatorice}</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1200" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>{masuriIgienicoSanitare}</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="800" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>{masuriAltaNatura}</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1400" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>{actiuni}</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="900" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>{termen}</w:t></w:r></w:p>
    </w:tc>
    <w:tc>
      <w:tcPr><w:tcW w:w="1100" w:type="dxa"/><w:vAlign w:val="center"/></w:tcPr>
      <w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:sz w:val="16"/></w:rPr><w:t>{responsabil}{/planPrevenire}</w:t></w:r></w:p>
    </w:tc>
  </w:tr>
</w:tbl>
"""

table_elem = ET.fromstring(TABLE_XML)

for docx_path in TARGET_PATHS:
    if not os.path.exists(docx_path):
        print(f"Skipping {docx_path} - not found")
        continue

    temp_path = docx_path + ".tmp"
    with zipfile.ZipFile(docx_path, 'r') as zin, zipfile.ZipFile(temp_path, 'w', compression=zipfile.ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            content = zin.read(item.filename)
            if item.filename == "word/document.xml":
                root = ET.fromstring(content)
                body = root.find(f"{{{W_NS}}}body")
                children = list(body)
                
                # We keep children 0..5 (APROBAT, ADMINISTRATOR, {PLACEHOLDER_REPREZENTANT_LEGAL}, PLAN DE PREVENIRE..., TESA)
                # We replace 6..467 with table_elem
                # We keep 468..end (Legenda, INTOCMIT, SERVICIU EXTERN, {PLACEHOLDER_PRESTATOR_SSM}, {PLACEHOLDER_SPECIALIST_SSM}, {PLACEHOLDER_FIRMA}...)
                
                prefix = children[:6]
                # Find start of footer/legend (paragraph 468 had 'Legenda:')
                suffix_start_idx = -1
                for idx in range(len(children) - 1, 0, -1):
                    txt = ''.join(children[idx].itertext()).strip()
                    if "Legenda:" in txt or "INTOCMIT" in txt:
                        suffix_start_idx = idx
                        break
                
                if suffix_start_idx == -1:
                    suffix_start_idx = 468

                suffix = children[suffix_start_idx:]
                
                # Clear body and reassemble
                for c in list(body):
                    body.remove(c)
                
                for c in prefix:
                    body.append(c)
                
                body.append(table_elem)
                
                for c in suffix:
                    body.append(c)
                
                content = ET.tostring(root, encoding='utf-8', xml_declaration=True)
            
            zout.writestr(item, content)

    os.replace(temp_path, docx_path)
    print(f"Patched {docx_path} successfully!")
