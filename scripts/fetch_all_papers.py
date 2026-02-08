"""
=============================================================
arXiv + medRxiv Paper Fetcher
=============================================================
Baja los ultimos 20 papers de CADA subcategoria de arXiv y medRxiv.
Genera un solo archivo: all_papers.json

USO:
  pip install requests
  python fetch_all_papers.py

El script tarda ~30-40 minutos (hay ~195 categorias con esperas de 4s entre requests).
Podes interrumpirlo y retomarlo: guarda progreso parcial.
=============================================================
"""

import requests
import xml.etree.ElementTree as ET
import json
import time
import os
import sys
from datetime import datetime, timedelta

# --- CONFIG ---
PAPERS_PER_CATEGORY = 20
ARXIV_WAIT = 4.0        # seconds between arXiv requests
MEDRXIV_WAIT = 1.0      # seconds between medRxiv requests
OUTPUT_FILE = "all_papers.json"

# --- ALL ARXIV SUBCATEGORIES ---
ARXIV_CATEGORIES = [
    "cs.AI", "cs.AR", "cs.CC", "cs.CE", "cs.CG", "cs.CL", "cs.CR", "cs.CV",
    "cs.CY", "cs.DB", "cs.DC", "cs.DL", "cs.DM", "cs.DS", "cs.ET", "cs.FL",
    "cs.GT", "cs.HC", "cs.IR", "cs.IT", "cs.LG", "cs.LO", "cs.MA", "cs.NI",
    "cs.OS", "cs.PL", "cs.RO", "cs.SE", "cs.SI", "cs.SY",
    "econ.EM", "econ.GN", "econ.TH",
    "eess.AS", "eess.IV", "eess.SP", "eess.SY",
    "math.AC", "math.AG", "math.AP", "math.AT", "math.CA", "math.CO",
    "math.CT", "math.CV", "math.DG", "math.DS", "math.FA", "math.GM",
    "math.GN", "math.GR", "math.GT", "math.HO", "math.IT", "math.KT",
    "math.LO", "math.MG", "math.MP", "math.NA", "math.NT", "math.OA",
    "math.OC", "math.PR", "math.QA", "math.RA", "math.RT", "math.SG",
    "math.SP", "math.ST",
    "astro-ph.CO", "astro-ph.EP", "astro-ph.GA", "astro-ph.HE",
    "astro-ph.IM", "astro-ph.SR",
    "cond-mat.dis-nn", "cond-mat.mes-hall", "cond-mat.mtrl-sci",
    "cond-mat.other", "cond-mat.quant-gas", "cond-mat.soft",
    "cond-mat.stat-mech", "cond-mat.str-el", "cond-mat.supr-con",
    "gr-qc", "hep-ex", "hep-lat", "hep-ph", "hep-th", "math-ph", "quant-ph",
    "nlin.AO", "nlin.CD", "nlin.CG", "nlin.PS", "nlin.SI",
    "nucl-ex", "nucl-th",
    "physics.acc-ph", "physics.ao-ph", "physics.app-ph", "physics.atm-clus",
    "physics.atom-ph", "physics.bio-ph", "physics.chem-ph", "physics.class-ph",
    "physics.comp-ph", "physics.data-an", "physics.flu-dyn", "physics.gen-ph",
    "physics.geo-ph", "physics.hist-ph", "physics.ins-det", "physics.med-ph",
    "physics.optics", "physics.plasm-ph", "physics.pop-ph", "physics.soc-ph",
    "physics.space-ph",
    "q-bio.BM", "q-bio.CB", "q-bio.GN", "q-bio.MN", "q-bio.NC",
    "q-bio.OT", "q-bio.PE", "q-bio.QM", "q-bio.SC", "q-bio.TO",
    "q-fin.CP", "q-fin.EC", "q-fin.GN", "q-fin.MF", "q-fin.PM",
    "q-fin.PR", "q-fin.RM", "q-fin.ST", "q-fin.TR",
    "stat.AP", "stat.CO", "stat.ME", "stat.ML", "stat.OT", "stat.TH",
]

# --- ALL MEDRXIV SUBCATEGORIES ---
# code -> API subject name mapping
MEDRXIV_CATEGORIES = {
    "medrxiv.addiction-medicine": "Addiction Medicine",
    "medrxiv.allergy-and-immunology": "Allergy and Immunology",
    "medrxiv.anesthesia": "Anesthesia",
    "medrxiv.cardiovascular-medicine": "Cardiovascular Medicine",
    "medrxiv.dentistry-and-oral-medicine": "Dentistry and Oral Medicine",
    "medrxiv.dermatology": "Dermatology",
    "medrxiv.emergency-medicine": "Emergency Medicine",
    "medrxiv.endocrinology": "Endocrinology (including Diabetes Mellitus and Metabolic Disease)",
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
    "medrxiv.infectious-diseases": "Infectious Diseases (except HIV/AIDS)",
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


def fetch_arxiv_papers(category, max_results=20):
    """Fetch latest papers from arXiv API for a given category."""
    url = (
        f"http://export.arxiv.org/api/query?"
        f"search_query=cat:{category}"
        f"&start=0&max_results={max_results}"
        f"&sortBy=submittedDate&sortOrder=descending"
    )
    headers = {"User-Agent": "ArxivScanner-Fetcher/1.0"}

    try:
        resp = requests.get(url, headers=headers, timeout=30)
        if resp.status_code != 200:
            print(f"  ERROR: HTTP {resp.status_code} for {category}")
            return []
    except Exception as e:
        print(f"  ERROR: {e}")
        return []

    root = ET.fromstring(resp.text)
    ns = {"atom": "http://www.w3.org/2005/Atom"}
    entries = root.findall("atom:entry", ns)

    papers = []
    for entry in entries:
        title_el = entry.find("atom:title", ns)
        summary_el = entry.find("atom:summary", ns)
        id_el = entry.find("atom:id", ns)
        published_el = entry.find("atom:published", ns)

        if title_el is None or id_el is None:
            continue

        paper_id = id_el.text.strip().split("/")[-1]
        title = title_el.text.strip().replace("\n", " ").replace("  ", " ")
        summary = (summary_el.text.strip().replace("\n", " ").replace("  ", " ")
                   if summary_el is not None and summary_el.text else "")
        published = published_el.text.strip() if published_el is not None and published_el.text else ""
        authors = [
            a.find("atom:name", ns).text
            for a in entry.findall("atom:author", ns)
            if a.find("atom:name", ns) is not None
        ]

        # Get all category tags
        categories = [
            c.get("term", "")
            for c in entry.findall("atom:category", ns)
            if c.get("term")
        ]

        # PDF link
        pdf_link = ""
        for link in entry.findall("atom:link", ns):
            if link.get("title") == "pdf":
                pdf_link = link.get("href", "")
                break
        if not pdf_link:
            pdf_link = id_el.text.strip().replace("/abs/", "/pdf/")

        papers.append({
            "id": paper_id,
            "title": title,
            "summary": summary,
            "published": published,
            "authors": authors[:10],  # cap at 10 to save space
            "link": id_el.text.strip(),
            "pdfLink": pdf_link,
            "categories": categories,
            "primaryCategory": category,
            "source": "arxiv",
        })

    return papers


def fetch_medrxiv_papers(code, subject_name, max_results=20):
    """Fetch latest papers from medRxiv API for a given subject."""
    # medRxiv API: /details/medrxiv/{start_date}/{end_date}/{cursor}/{page_size}
    # We search a wide date range to ensure we get enough papers
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")

    papers = []
    cursor = 0
    page_size = 100  # fetch more than needed, then filter by subject

    # We may need multiple pages if the subject is rare
    attempts = 0
    max_attempts = 5

    while len(papers) < max_results and attempts < max_attempts:
        url = f"https://api.medrxiv.org/details/medrxiv/{start_date}/{end_date}/{cursor}/{page_size}"
        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code != 200:
                print(f"  ERROR: HTTP {resp.status_code} for {code}")
                break
            data = resp.json()
        except Exception as e:
            print(f"  ERROR: {e}")
            break

        collection = data.get("collection", [])
        if not collection:
            break

        for item in collection:
            item_category = item.get("category", "")
            # Match by subject name (case-insensitive partial match)
            if subject_name.lower() not in item_category.lower():
                continue

            doi = item.get("doi", "")
            papers.append({
                "id": doi.split("/")[-1] if doi else str(cursor),
                "title": item.get("title", "").strip(),
                "summary": item.get("abstract", "").strip(),
                "published": item.get("date", ""),
                "authors": [a.strip() for a in item.get("authors", "").split(";") if a.strip()][:10],
                "link": f"https://www.medrxiv.org/content/{doi}",
                "pdfLink": f"https://www.medrxiv.org/content/{doi}.full.pdf",
                "categories": [item_category],
                "primaryCategory": code,
                "source": "medrxiv",
            })

            if len(papers) >= max_results:
                break

        # If we haven't found enough, advance cursor
        cursor += page_size
        attempts += 1
        if len(papers) < max_results:
            time.sleep(MEDRXIV_WAIT)

    return papers[:max_results]


def main():
    # Load previous progress if exists
    all_data = {}
    if os.path.exists(OUTPUT_FILE):
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            all_data = json.load(f)
        print(f"Cargado progreso previo: {len(all_data)} categorias ya descargadas.")

    total_cats = len(ARXIV_CATEGORIES) + len(MEDRXIV_CATEGORIES)
    done = 0

    # ── arXiv ──
    print(f"\n{'='*60}")
    print(f"  ARXIV: {len(ARXIV_CATEGORIES)} subcategorias")
    print(f"{'='*60}\n")

    for cat in ARXIV_CATEGORIES:
        done += 1
        if cat in all_data and len(all_data[cat]) > 0:
            print(f"[{done}/{total_cats}] {cat}: ya existe ({len(all_data[cat])} papers) - SKIP")
            continue

        print(f"[{done}/{total_cats}] {cat}: bajando {PAPERS_PER_CATEGORY} papers...", end=" ", flush=True)
        papers = fetch_arxiv_papers(cat, PAPERS_PER_CATEGORY)
        all_data[cat] = papers
        print(f"OK ({len(papers)} papers)")

        # Save after each category (resume support)
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(all_data, f, ensure_ascii=False)

        time.sleep(ARXIV_WAIT)

    # ── medRxiv ──
    print(f"\n{'='*60}")
    print(f"  MEDRXIV: {len(MEDRXIV_CATEGORIES)} subcategorias")
    print(f"{'='*60}\n")

    for code, subject in MEDRXIV_CATEGORIES.items():
        done += 1
        if code in all_data and len(all_data[code]) > 0:
            print(f"[{done}/{total_cats}] {code}: ya existe ({len(all_data[code])} papers) - SKIP")
            continue

        print(f"[{done}/{total_cats}] {code}: bajando '{subject}'...", end=" ", flush=True)
        papers = fetch_medrxiv_papers(code, subject, PAPERS_PER_CATEGORY)
        all_data[code] = papers
        print(f"OK ({len(papers)} papers)")

        # Save after each category
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump(all_data, f, ensure_ascii=False)

        time.sleep(MEDRXIV_WAIT)

    # ── Summary ──
    total_papers = sum(len(v) for v in all_data.values())
    cats_with_data = sum(1 for v in all_data.values() if len(v) > 0)
    cats_empty = sum(1 for v in all_data.values() if len(v) == 0)

    print(f"\n{'='*60}")
    print(f"  COMPLETADO")
    print(f"{'='*60}")
    print(f"  Total categorias: {len(all_data)}")
    print(f"  Con papers:       {cats_with_data}")
    print(f"  Sin papers:       {cats_empty}")
    print(f"  Total papers:     {total_papers}")
    print(f"  Archivo:          {OUTPUT_FILE}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
