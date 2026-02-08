"""
==================================================================
arXiv + medRxiv Paper Fetcher - Google Colab Version
==================================================================
Copia y pega TODO este codigo en UNA sola celda de Google Colab.
Ejecuta la celda. Al terminar, se descarga all_papers.json.

- 144 subcategorias arXiv (20 papers c/u)
- 51 subcategorias medRxiv (20 papers c/u)
- Tiempo estimado: ~15 minutos (arXiv 3s espera + medRxiv 1s)
- Guarda progreso: si se corta, re-ejecuta y continua
==================================================================
"""

import requests
import xml.etree.ElementTree as ET
import json
import time
import os
from datetime import datetime, timedelta

# ── CONFIG ──
PAPERS_PER_CATEGORY = 20
ARXIV_WAIT = 3.5
MEDRXIV_WAIT = 1.0
OUTPUT_FILE = "/content/all_papers.json"

# ── ARXIV CATEGORIES (144) ──
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

# ── MEDRXIV CATEGORIES (51) ──
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
#  FUNCIONES
# ═══════════════════════════════════════════

def fetch_arxiv(category, max_results=20):
    """Baja papers de arXiv API."""
    url = (
        f"http://export.arxiv.org/api/query?"
        f"search_query=cat:{category}"
        f"&start=0&max_results={max_results}"
        f"&sortBy=submittedDate&sortOrder=descending"
    )
    try:
        resp = requests.get(url, headers={"User-Agent": "ArxivScanner/1.0"}, timeout=30)
        if resp.status_code != 200:
            return []
    except Exception as e:
        print(f"    ERROR: {e}")
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

        categories = [c.get("term","") for c in entry.findall("a:category", ns) if c.get("term")]

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
    start_date = (datetime.now() - timedelta(days=120)).strftime("%Y-%m-%d")

    papers = []
    cursor = 0
    page_size = 100
    max_pages = 10

    for page in range(max_pages):
        if len(papers) >= max_results:
            break

        url = f"https://api.medrxiv.org/details/medrxiv/{start_date}/{end_date}/{cursor}/{page_size}"
        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code != 200:
                break
            data = resp.json()
        except Exception as e:
            print(f"    ERROR page {page}: {e}")
            break

        collection = data.get("collection", [])
        if not collection:
            break

        for item in collection:
            cat = item.get("category", "")
            if subject_name.lower() not in cat.lower():
                continue

            doi = item.get("doi", "")
            title = item.get("title", "").strip()
            abstract = item.get("abstract", "").strip()

            # Evitar duplicados
            if any(p["title"] == title for p in papers):
                continue

            papers.append({
                "id": doi.split("/")[-1] if doi else f"{code}-{cursor}",
                "title": title,
                "summary": abstract,
                "published": item.get("date", ""),
                "authors": [a.strip() for a in item.get("authors", "").split(";") if a.strip()][:10],
                "link": f"https://www.medrxiv.org/content/{doi}v{item.get('version','1')}",
                "pdfLink": f"https://www.medrxiv.org/content/{doi}v{item.get('version','1')}.full.pdf",
                "categories": [cat],
                "primaryCategory": code,
                "source": "medrxiv",
            })

            if len(papers) >= max_results:
                break

        cursor += page_size
        if len(papers) < max_results:
            time.sleep(MEDRXIV_WAIT)

    return papers[:max_results]


def save(data):
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)


# ═══════════════════════════════════════════
#  MAIN
# ═══════════════════════════════════════════

# Cargar progreso previo (por si se interrumpio)
all_data = {}
if os.path.exists(OUTPUT_FILE):
    with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
        all_data = json.load(f)
    print(f"Progreso previo cargado: {len(all_data)} categorias ya descargadas.\n")

total = len(ARXIV_CATS) + len(MEDRXIV_CATS)
done = 0

# ── arXiv ──
print("=" * 60)
print(f"  ARXIV: {len(ARXIV_CATS)} subcategorias x {PAPERS_PER_CATEGORY} papers")
print("=" * 60)

for cat in ARXIV_CATS:
    done += 1
    if cat in all_data and len(all_data[cat]) > 0:
        print(f"[{done}/{total}] {cat}: ya descargado ({len(all_data[cat])}) - SKIP")
        continue

    print(f"[{done}/{total}] {cat}: descargando...", end=" ", flush=True)
    papers = fetch_arxiv(cat, PAPERS_PER_CATEGORY)
    all_data[cat] = papers
    print(f"OK -> {len(papers)} papers")
    save(all_data)
    time.sleep(ARXIV_WAIT)

# ── medRxiv ──
print("\n" + "=" * 60)
print(f"  MEDRXIV: {len(MEDRXIV_CATS)} subcategorias x {PAPERS_PER_CATEGORY} papers")
print("=" * 60)

for code, subject in MEDRXIV_CATS.items():
    done += 1
    if code in all_data and len(all_data[code]) > 0:
        print(f"[{done}/{total}] {code}: ya descargado ({len(all_data[code])}) - SKIP")
        continue

    print(f"[{done}/{total}] {code} ({subject}): descargando...", end=" ", flush=True)
    papers = fetch_medrxiv(code, subject, PAPERS_PER_CATEGORY)
    all_data[code] = papers
    print(f"OK -> {len(papers)} papers")
    save(all_data)
    time.sleep(MEDRXIV_WAIT)

# ── Resumen ──
total_papers = sum(len(v) for v in all_data.values())
with_data = sum(1 for v in all_data.values() if len(v) > 0)
empty = sum(1 for v in all_data.values() if len(v) == 0)

print("\n" + "=" * 60)
print("  COMPLETADO")
print("=" * 60)
print(f"  Categorias totales:   {len(all_data)}")
print(f"  Con papers:           {with_data}")
print(f"  Sin papers:           {empty}")
print(f"  Total papers bajados: {total_papers}")
print(f"  Archivo:              {OUTPUT_FILE}")

if empty > 0:
    print(f"\n  Categorias sin papers:")
    for k, v in all_data.items():
        if len(v) == 0:
            print(f"    - {k}")

print("=" * 60)

# ── Descargar automaticamente en Colab ──
try:
    from google.colab import files
    print("\nDescargando all_papers.json...")
    files.download(OUTPUT_FILE)
except ImportError:
    print(f"\nArchivo guardado en: {OUTPUT_FILE}")
    print("(No estas en Colab, descargalo manualmente)")
