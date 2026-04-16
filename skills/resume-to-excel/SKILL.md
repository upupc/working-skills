---
name: resume-to-excel
description: >-
  Scan PDF resumes from a directory, extract candidate info (name, phone, email, highlights),
  and populate an Excel template. Use when the user asks to batch-process resumes into a
  spreadsheet, import CVs to Excel, or says "scan resumes", "录入简历", "简历导入Excel".
compatibility: Requires Python 3.10+, pip-installable openpyxl and PyPDF2. Uses a temporary venv.
metadata:
  author: liuyuan
  version: "1.0"
---

# Resume to Excel

Batch-extract structured data from PDF resumes and fill an Excel template.

## When to use

- User provides a directory of PDF resumes and an Excel template file
- User says "扫描简历", "录入简历", "简历导入", "scan resumes", "import resumes to Excel"

## Inputs

The user must provide:
1. **Resume directory** — path to a folder containing `.pdf` resume files
2. **Excel template** — path to an `.xlsx` file (optional; if not provided, copy the bundled template from [assets/campusexcelbatchtemplate.xlsx](assets/campusexcelbatchtemplate.xlsx) to the resume directory)

### Bundled template columns

The default template (`assets/campusexcelbatchtemplate.xlsx`) has the following headers:
- A: 姓名
- B: 手机号码
- C: 邮件地址
- D: 国际区号
- E: 推荐原因
- G-H: 国家或地区 / 区号 (reference data, do not overwrite)

## Execution steps

### Step 1: Set up Python environment

Create a temporary venv to avoid system Python restrictions (PEP 668):

```bash
python3 -m venv /tmp/resume-venv && /tmp/resume-venv/bin/pip install openpyxl PyPDF2
```

### Step 2: Read the Excel template structure

Use openpyxl to inspect the template headers and understand which columns to fill:

```python
import openpyxl
wb = openpyxl.load_workbook('<excel_path>')
ws = wb.active
# Read header row to understand column mapping
for cell in ws[1]:
    print(f'{cell.coordinate}: {cell.value}')
```

### Step 3: Extract text from PDF resumes

Use PyPDF2 to extract text from each PDF in the resume directory:

```python
from PyPDF2 import PdfReader
import os

folder = '<resume_directory>'
for f in sorted(os.listdir(folder)):
    if f.endswith('.pdf'):
        reader = PdfReader(os.path.join(folder, f))
        text = '\n'.join(page.extract_text() or '' for page in reader.pages)
        # Parse text for: name, phone, email, key highlights
```

### Step 4: Parse candidate information

From each resume's extracted text, identify:
- **Name** (姓名) — from filename pattern or resume header
- **Phone** (手机号码) — regex match for Chinese mobile numbers: `1[3-9]\d{9}`
- **Email** (邮件地址) — regex match for email pattern
- **Country code** (国际区号) — default to `86` for Chinese numbers
- **Recommendation reason** (推荐原因) — summarize: school, degree, internship, key skills, awards

**Tips for parsing Chinese resumes:**
- PDF text extraction of Chinese may produce garbled characters (especially stylized fonts). In that case, fall back to extracting info from the filename and any readable portions.
- Filenames often follow the pattern: `【职位】姓名 年份应届生.pdf`
- Phone numbers may appear with `(+86)` prefix — strip it.

### Step 5: Write to Excel

```python
for i, candidate in enumerate(candidates):
    row = i + 2  # row 1 is header
    ws[f'A{row}'] = candidate['name']
    ws[f'B{row}'] = candidate['phone']
    ws[f'C{row}'] = candidate['email']
    ws[f'D{row}'] = candidate['country_code']
    ws[f'E{row}'] = candidate['reason']

wb.save('<excel_path>')
```

### Step 6: Report results

Print a summary table showing all candidates written, so the user can verify before opening the file.

## Edge cases

- **Garbled PDF text**: Some Chinese PDFs use custom fonts that PyPDF2 cannot decode. Extract what you can (phone/email via regex) and supplement from the filename.
- **Multiple phone numbers**: Pick the first one, or the one matching the email prefix if applicable.
- **Excel has extra columns**: Only fill columns that match known fields; leave others empty.
- **Large batch**: Process all PDFs in the directory; do not skip any unless the user specifies a filter.

## Output

The filled Excel file is saved to the resume directory (e.g. `<resume_directory>/campusexcelbatchtemplate.xlsx`). If the user provided a custom Excel path, save to that path instead.
