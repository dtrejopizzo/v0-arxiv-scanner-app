"""
==================================================================
arXiv + medRxiv Paper Fetcher - Google Colab
==================================================================
1. Copia y pega TODO este codigo en UNA celda de Colab
2. Ejecuta la celda
3. Al terminar descarga all_papers.json automaticamente
==================================================================
"""

# Paso 0: Verificar que requests funcione
import sys
print("=" * 60, flush=True)
print("  ARXIV SCANNER - PAPER FETCHER", flush=True)
print("=" * 60, flush=True)
print(f"Python: {sys.version}", flush=True)

import requests
import xml.etree.ElementTree as ET
import json
import time
import os
from datetime import datetime, timedelta

print("Imports OK", flush=True)

# ── CONFIG ──
PAPERS_PER_CATEGORY = 20
ARXIV_WAIT = 3.5  # arXiv pide 3+ segundos entre requests
MEDRXIV_WAIT = 1.0
OUTPUT_FILE = "/content/all_papers.json"

# ── TEST DE CONECTIVIDAD ──
print("\nTesteando conexion a arXiv...", flush=True)
try:
    test = requests.get(
        "http://export.arxiv.org/api/query?search_query=cat:cs.AI&start=0&max_results=1",
        headers={"User-Agent": "ArxivScanner/1.0 (contact: arxivscanner@example.com)"},
        timeout=30
    )
    print(f"  arXiv responde: HTTP {test.status_code}", flush=True)
    if test.status_code == 200:
        root = ET.fromstring(test.text)
        ns = {"a": "http://www.w3.org/2005/Atom"}
        entries = root.findall("a:entry", ns)
        print(f"  Papers encontrados en test: {len(entries)}", flush=True)
        if len(entries) > 0:
            t = entries[0].find("a:title", ns)
            if t is not None and t.text:
                print(f"  Primer paper: {t.text.strip()[:80]}...", flush=True)
    else:
        print(f"  AVISO: arXiv devolvio status {test.status_code}", flush=True)
        print(f"  Body: {test.text[:500]}", flush=True)
except Exception as e:
    print(f"  ERROR conectando a arXiv: {e}", flush=True)
    print("  Asegurate de tener conexion a internet en Colab", flush=True)

print("\nTesteando conexion a medRxiv...", flush=True)
try:
    today = datetime.now().strftime("%Y-%m-%d")
    week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
    test2 = requests.get(
        f"https://api.medrxiv.org/details/medrxiv/{week_ago}/{today}/0/5",
        timeout=30
    )
    print(f"  medRxiv responde: HTTP {test2.status_code}", flush=True)
    if test2.status_code == 200:
        d = test2.json()
        c = d.get("collection", [])
        print(f"  Papers en test: {len(c)}", flush=True)
except Exception as e:
    print(f"  ERROR conectando a medRxiv: {e}", flush=True)

print("\nConectividad OK. Comenzando descarga...\n", flush=True)

# ── ARXIV: 144 SUBCATEGORIAS ──
ARXIV_CATS = [
    "cs.AI","cs.AR","cs.CC","cs.CE","cs.CG","cs.CL","cs.CR","cs.CV",
    "cs.CY","cs.DB","cs.DC","cs.DL","cs.DM","cs.DS","cs.ET","cs.FL",
    "cs.GT","cs.HC","cs.IR","cs.IT","cs.LG","cs.LO","cs.MA","cs.NI",
    "cs.OS","cs.PL","cs.RO","cs.SE","cs.SI","cs.SY",
    "econ.EM","econ.GN","econ.TH",
    "eess.AS","eess.IV","eess.SP","eess.SY",
    "math.AC","math.AG","math.AP","math.AT","math.CA","math.CO",
    "math.CT","math.CV","math.DG","math.DS","math.FA","math.GM",
    "math.GN","math.GR","math.GT","math.HO","math.IT","math.KT",
    "math.LO","math.MG","math.MP","math.NA","math.NT","math.OA",
    "math.OC","math.PR","math.QA","math.RA","math.RT","math.SG",
    "math.SP","math.ST",
    "astro-ph.CO","astro-ph.EP","astro-ph.GA","astro-ph.HE",
    "astro-ph.IM","astro-ph.SR",
    "cond-mat.dis-nn","cond-mat.mes-hall","cond-mat.mtrl-sci",
    "cond-mat.other","cond-mat.quant-gas","cond-mat.soft",
    "cond-mat.stat-mech","cond-mat.str-el","cond-mat.supr-con",
    "gr-qc","hep-ex","hep-lat","hep-ph","hep-th","math-ph","quant-ph",
    "nlin.AO","nlin.CD","nlin.CG","nlin.PS","nlin.SI",
    "nucl-ex","nucl-th",
    "physics.acc-ph","physics.ao-ph","physics.app-ph","physics.atm-clus",
    "physics.atom-ph","physics.bio-ph","physics.chem-ph","physics.class-ph",
    "physics.comp-ph","physics.data-an","physics.flu-dyn","physics.gen-ph",
    "physics.geo-ph","physics.hist-ph","physics.ins-det","physics.med-ph",
    "physics.optics","physics.plasm-ph","physics.pop-ph","physics.soc-ph",
    "physics.space-ph",
    "q-bio.BM","q-bio.CB","q-bio.GN","q-bio.MN","q-bio.NC",
    "q-bio.OT","q-bio.PE","q-bio.QM","q-bio.SC","q-bio.TO",
    "q-fin.CP","q-fin.EC","q-fin.GN","q-fin.MF","q-fin.PM",
    "q-fin.PR","q-fin.RM","q-fin.ST","q-fin.TR",
    "stat.AP","stat.CO","stat.ME","stat.ML","stat.OT","stat.TH",
]

# ── MEDRXIV: 51 SUBCATEGORIAS ──
MEDRXIV_CATS = {
    "medrxiv.addiction-medicine": "Addiction Medicine",
    "medrxiv.allergy-and-immunology": "Allergy and Immunology",
    "medrxiv.anesthesia": "Anesthesia",
    "medrxiv.cardiovascular-medicine": "Cardiovascular Medicine",
    "medrxiv.dentistry-and-oral-medicine": "Dentistry and Oral Medicine",
    "medrxiv.dermatology": "Dermatology",
    "medrxiv.emergency-medicine": "Emergency Medicine",
    "medrxiv.endocrinology": "Endocrinology",
    "medrxiv.epidemiology": "Epidemiology",
    "medrxiv.forensic-medicine": "Forensic Medicine",
    "medrxiv.gastroenterology": "Gastroenterology",
    "medrxiv.genetic-and-genomic-medicine": "Genetic and Genomic Medicine",
    "medrxiv.geriatric-medicine": "Geriatric Medicine",
    "medrxiv.health-economics": "Health Economics",
    "medrxiv.health-informatics": "Health Informatics",
    "medrxiv.health-policy": "Health Policy",
    "medrxiv.health-systems": "Health Systems and Quality Improvement",
    "medrxiv.hematology": "Hematology",
    "medrxiv.hiv-aids": "HIV/AIDS",
    "medrxiv.infectious-diseases": "Infectious Diseases",
    "medrxiv.intensive-care": "Intensive Care and Critical Care Medicine",
    "medrxiv.medical-education": "Medical Education",
    "medrxiv.medical-ethics": "Medical Ethics",
    "medrxiv.nephrology": "Nephrology",
    "medrxiv.neurology": "Neurology",
    "medrxiv.nursing": "Nursing",
    "medrxiv.nutrition": "Nutrition",
    "medrxiv.obstetrics-and-gynecology": "Obstetrics and Gynecology",
    "medrxiv.occupational-and-environmental-health": "Occupational and Environmental Health",
    "medrxiv.oncology": "Oncology",
    "medrxiv.ophthalmology": "Ophthalmology",
    "medrxiv.orthopedics": "Orthopedics",
    "medrxiv.otolaryngology": "Otolaryngology",
    "medrxiv.pain-medicine": "Pain Medicine",
    "medrxiv.palliative-medicine": "Palliative Medicine",
    "medrxiv.pathology": "Pathology",
    "medrxiv.pediatrics": "Pediatrics",
    "medrxiv.pharmacology-and-therapeutics": "Pharmacology and Therapeutics",
    "medrxiv.primary-care-research": "Primary Care Research",
    "medrxiv.psychiatry": "Psychiatry and Clinical Psychology",
    "medrxiv.public-and-global-health": "Public and Global Health",
    "medrxiv.radiology-and-imaging": "Radiology and Imaging",
    "medrxiv.rehabilitation-medicine": "Rehabilitation Medicine and Physical Therapy",
    "medrxiv.respiratory-medicine": "Respiratory Medicine",
    "medrxiv.rheumatology": "Rheumatology",
    "medrxiv.sexual-and-reproductive-health": "Sexual and Reproductive Health",
    "medrxiv.sports-medicine": "Sports Medicine",
    "medrxiv.surgery": "Surgery",
    "medrxiv.toxicology": "Toxicology",
    "medrxiv.transplantation": "Transplantation",
    "medrxiv.urology": "Urology",
}


# ═══════════════════════════════════════════
#  FUNCIONES DE DESCARGA
# ═══════════════════════════════════════════

def fetch_arxiv(category, max_results=20):
    """Baja papers de arXiv API con manejo de errores verbose."""
    url = (
        f"http://export.arxiv.org/api/query?"
        f"search_query=cat:{category}"
        f"&start=0&max_results={max_results}"
        f"&sortBy=submittedDate&sortOrder=descending"
    )
    resp = requests.get(
        url,
        headers={"User-Agent": "ArxivScanner/1.0 (contact: arxivscanner@example.com)"},
        timeout=60
    )
    if resp.status_code != 200:
        print(f"HTTP {resp.status_code}", flush=True)
        return []

    root = ET.fromstring(resp.text)
    ns = {"a": "http://www.w3.org/2005/Atom"}
    papers = []

    for entry in root.findall("a:entry", ns):
        id_el = entry.find("a:id", ns)
        title_el = entry.find("a:title", ns)
        summary_el = entry.find("a:summary", ns)
        published_el = entry.find("a:published", ns)

        if not id_el or not title_el:
            continue

        paper_id = id_el.text.strip().split("/")[-1]
        title = " ".join(title_el.text.strip().split())
        summary = " ".join(summary_el.text.strip().split()) if summary_el is not None and summary_el.text else ""
        published = published_el.text.strip() if published_el is not None and published_el.text else ""

        authors = []
        for a in entry.findall("a:author", ns):
            name_el = a.find("a:name", ns)
            if name_el is not None and name_el.text:
                authors.append(name_el.text.strip())

        categories = [c.get("term", "") for c in entry.findall("a:category", ns) if c.get("term")]

        pdf_link = ""
        for link in entry.findall("a:link", ns):
            if link.get("title") == "pdf":
                pdf_link = link.get("href", "")
                break
        if not pdf_link and id_el.text:
            pdf_link = id_el.text.strip().replace("/abs/", "/pdf/")

        papers.append({
            "id": paper_id,
            "title": title,
            "summary": summary,
            "published": published,
            "authors": authors[:10],
            "link": id_el.text.strip(),
            "pdfLink": pdf_link,
            "categories": categories,
            "primaryCategory": category,
            "source": "arxiv",
        })

    return papers


def fetch_medrxiv(code, subject_name, max_results=20):
    """Baja papers de medRxiv API filtrando por subject."""
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=180)).strftime("%Y-%m-%d")

    papers = []
    cursor = 0
    page_size = 100
    max_pages = 15  # buscar hasta 1500 papers para encontrar 20 del subject

    for page in range(max_pages):
        if len(papers) >= max_results:
            break

        url = f"https://api.medrxiv.org/details/medrxiv/{start_date}/{end_date}/{cursor}/{page_size}"
        resp = requests.get(url, timeout=60)
        if resp.status_code != 200:
            print(f"HTTP {resp.status_code}", flush=True)
            break

        data = resp.json()
        collection = data.get("collection", [])
        if not collection:
            break

        for item in collection:
            cat = item.get("category", "")
            # Matching flexible: el subject debe estar contenido en la categoria
            if subject_name.lower() not in cat.lower():
                continue

            doi = item.get("doi", "")
            title = item.get("title", "").strip()
            abstract = item.get("abstract", "").strip()

            if any(p["title"] == title for p in papers):
                continue

            version = item.get("version", "1")
            papers.append({
                "id": doi.split("/")[-1] if doi else f"{code}-{cursor}",
                "title": title,
                "summary": abstract,
                "published": item.get("date", ""),
                "authors": [a.strip() for a in item.get("authors", "").split(";") if a.strip()][:10],
                "link": f"https://www.medrxiv.org/content/{doi}v{version}",
                "pdfLink": f"https://www.medrxiv.org/content/{doi}v{version}.full.pdf",
                "categories": [cat],
                "primaryCategory": code,
                "source": "medrxiv",
            })

            if len(papers) >= max_results:
                break

        cursor += page_size
        time.sleep(MEDRXIV_WAIT)

    return papers[:max_results]


def save_progress(data):
    """Guarda el JSON con todo el progreso actual."""
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


# ═══════════════════════════════════════════
#  EJECUCION PRINCIPAL
# ═══════════════════════════════════════════

# Cargar progreso previo si existe
all_data = {}
if os.path.exists(OUTPUT_FILE):
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            all_data = json.load(f)
        print(f"Progreso previo: {len(all_data)} categorias ya descargadas.\n", flush=True)
    except Exception:
        all_data = {}

total = len(ARXIV_CATS) + len(MEDRXIV_CATS)
done = 0
errors = []

# ═══ FASE 1: arXiv ═══
print("=" * 60, flush=True)
print(f"  FASE 1: arXiv - {len(ARXIV_CATS)} subcategorias", flush=True)
print("=" * 60, flush=True)

for i, cat in enumerate(ARXIV_CATS):
    done += 1

    # Skip si ya existe con datos
    if cat in all_data and len(all_data[cat]) > 0:
        print(f"  [{done}/{total}] {cat}: SKIP (ya tiene {len(all_data[cat])} papers)", flush=True)
        continue

    print(f"  [{done}/{total}] {cat}: bajando... ", end="", flush=True)
    try:
        papers = fetch_arxiv(cat, PAPERS_PER_CATEGORY)
        all_data[cat] = papers
        print(f"{len(papers)} papers", flush=True)
        if len(papers) == 0:
            errors.append(f"{cat}: 0 papers")
        save_progress(all_data)
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        errors.append(f"{cat}: {e}")
        all_data[cat] = []
        save_progress(all_data)

    # Esperar entre requests (arXiv pide min 3 segundos)
    time.sleep(ARXIV_WAIT)

# ═══ FASE 2: medRxiv ═══
print("\n" + "=" * 60, flush=True)
print(f"  FASE 2: medRxiv - {len(MEDRXIV_CATS)} subcategorias", flush=True)
print("=" * 60, flush=True)

for code, subject in MEDRXIV_CATS.items():
    done += 1

    if code in all_data and len(all_data[code]) > 0:
        print(f"  [{done}/{total}] {code}: SKIP (ya tiene {len(all_data[code])} papers)", flush=True)
        continue

    print(f"  [{done}/{total}] {code} ({subject}): bajando... ", end="", flush=True)
    try:
        papers = fetch_medrxiv(code, subject, PAPERS_PER_CATEGORY)
        all_data[code] = papers
        print(f"{len(papers)} papers", flush=True)
        if len(papers) == 0:
            errors.append(f"{code}: 0 papers")
        save_progress(all_data)
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        errors.append(f"{code}: {e}")
        all_data[code] = []
        save_progress(all_data)

    time.sleep(MEDRXIV_WAIT)

# ═══ RESUMEN FINAL ═══
total_papers = sum(len(v) for v in all_data.values())
with_data = sum(1 for v in all_data.values() if len(v) > 0)
empty = sum(1 for v in all_data.values() if len(v) == 0)

print("\n" + "=" * 60, flush=True)
print("  COMPLETADO", flush=True)
print("=" * 60, flush=True)
print(f"  Categorias totales:   {len(all_data)}", flush=True)
print(f"  Con papers:           {with_data}", flush=True)
print(f"  Sin papers:           {empty}", flush=True)
print(f"  Total papers:         {total_papers}", flush=True)
print(f"  Archivo:              {OUTPUT_FILE}", flush=True)

if errors:
    print(f"\n  Errores/avisos ({len(errors)}):", flush=True)
    for e in errors:
        print(f"    - {e}", flush=True)

if empty > 0:
    print(f"\n  Categorias sin papers ({empty}):", flush=True)
    for k, v in all_data.items():
        if len(v) == 0:
            print(f"    - {k}", flush=True)

print("=" * 60, flush=True)

# Tamano del archivo
file_size = os.path.getsize(OUTPUT_FILE)
print(f"\n  Tamano del archivo: {file_size / 1024 / 1024:.1f} MB", flush=True)

# ── Descargar en Colab ──
try:
    from google.colab import files
    print("\nDescargando all_papers.json a tu maquina...", flush=True)
    files.download(OUTPUT_FILE)
    print("Descarga iniciada!", flush=True)
except ImportError:
    print(f"\nNo estas en Colab. Archivo guardado en: {OUTPUT_FILE}", flush=True)
