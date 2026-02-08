##############################################################################
# ARXIV + MEDRXIV SCANNER - Google Colab
# Copia TODO en una celda de Colab y ejecuta.
# Usa el metodo probado: submittedDate range + cat: filter
##############################################################################

import requests
import xml.etree.ElementTree as ET
import time
import json
import os
import calendar
from datetime import datetime, timedelta

# ── CONFIG ──
PAPERS_PER_CATEGORY = 20
ARXIV_WAIT = 4.0
MEDRXIV_WAIT = 1.5
MEDRXIV_DAYS_BACK = 180
OUTPUT_FILE = "/content/all_papers.json"

# ── ARXIV SUBCATEGORIES (144) ──
ARXIV_CATS = [
    "cs.AI","cs.AR","cs.CC","cs.CE","cs.CG","cs.CL","cs.CR","cs.CV","cs.CY",
    "cs.DB","cs.DC","cs.DL","cs.DM","cs.DS","cs.ET","cs.FL","cs.GT","cs.HC",
    "cs.IR","cs.IT","cs.LG","cs.LO","cs.MA","cs.NI","cs.OS","cs.PL","cs.RO",
    "cs.SE","cs.SI","cs.SY",
    "econ.EM","econ.GN","econ.TH",
    "eess.AS","eess.IV","eess.SP","eess.SY",
    "math.AC","math.AG","math.AP","math.AT","math.CA","math.CO","math.CT",
    "math.CV","math.DG","math.DS","math.FA","math.GM","math.GN","math.GR",
    "math.GT","math.HO","math.IT","math.KT","math.LO","math.MG","math.MP",
    "math.NA","math.NT","math.OA","math.OC","math.PR","math.QA","math.RA",
    "math.RT","math.SG","math.SP","math.ST",
    "astro-ph.CO","astro-ph.EP","astro-ph.GA","astro-ph.HE","astro-ph.IM","astro-ph.SR",
    "cond-mat.dis-nn","cond-mat.mes-hall","cond-mat.mtrl-sci","cond-mat.other",
    "cond-mat.quant-gas","cond-mat.soft","cond-mat.stat-mech","cond-mat.str-el","cond-mat.supr-con",
    "gr-qc","hep-ex","hep-lat","hep-ph","hep-th","math-ph","quant-ph",
    "nlin.AO","nlin.CD","nlin.CG","nlin.PS","nlin.SI",
    "nucl-ex","nucl-th",
    "physics.acc-ph","physics.ao-ph","physics.app-ph","physics.atm-clus","physics.atom-ph",
    "physics.bio-ph","physics.chem-ph","physics.class-ph","physics.comp-ph","physics.data-an",
    "physics.flu-dyn","physics.gen-ph","physics.geo-ph","physics.hist-ph","physics.ins-det",
    "physics.med-ph","physics.optics","physics.plasm-ph","physics.pop-ph","physics.soc-ph",
    "physics.space-ph",
    "q-bio.BM","q-bio.CB","q-bio.GN","q-bio.MN","q-bio.NC","q-bio.OT","q-bio.PE",
    "q-bio.QM","q-bio.SC","q-bio.TO",
    "q-fin.CP","q-fin.EC","q-fin.GN","q-fin.MF","q-fin.PM","q-fin.PR","q-fin.RM",
    "q-fin.ST","q-fin.TR",
    "stat.AP","stat.CO","stat.ME","stat.ML","stat.OT","stat.TH",
]

# ── MEDRXIV SUBCATEGORIES (51) ──
MEDRXIV_CATS = {
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

# ══════════════════════════════════════════════════════════════
# FETCH FUNCTIONS
# ══════════════════════════════════════════════════════════════

def fetch_arxiv(category, max_results=20):
    """
    Metodo PROBADO: usa submittedDate range con cat: filter.
    Busca mes a mes hacia atras hasta tener suficientes papers.
    """
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    headers = {'User-Agent': 'ArxReader-UltraScan-Bot/3.0'}
    papers = []
    seen_ids = set()

    now = datetime.now()

    # Buscar mes a mes hacia atras (max 6 meses)
    for months_back in range(6):
        if len(papers) >= max_results:
            break

        target = now - timedelta(days=30 * months_back)
        year = target.year
        month = target.month
        last_day = calendar.monthrange(year, month)[1]

        date_query = f"submittedDate:[{year}{month:02d}010000+TO+{year}{month:02d}{last_day}2359]"
        url = (
            f"http://export.arxiv.org/api/query?"
            f"search_query=cat:{category}+AND+{date_query}"
            f"&start=0&max_results={max_results}"
            f"&sortBy=submittedDate&sortOrder=descending"
        )

        try:
            resp = requests.get(url, headers=headers, timeout=30)
            if resp.status_code == 500:
                print(f"(500 error, retrying in 20s) ", end="", flush=True)
                time.sleep(20)
                resp = requests.get(url, headers=headers, timeout=30)
            if resp.status_code != 200:
                print(f"(HTTP {resp.status_code}) ", end="", flush=True)
                continue
        except Exception as e:
            print(f"(request error: {e}) ", end="", flush=True)
            continue

        root = ET.fromstring(resp.text)
        entries = root.findall('atom:entry', ns)

        for entry in entries:
            if len(papers) >= max_results:
                break

            id_el = entry.find('atom:id', ns)
            title_el = entry.find('atom:title', ns)

            if id_el is None or title_el is None:
                continue

            pid = id_el.text.strip().split('/')[-1]

            # Skip duplicates
            if pid in seen_ids:
                continue

            title = ' '.join(title_el.text.strip().split()) if title_el.text else ''
            if not title or title.startswith('Error'):
                continue

            seen_ids.add(pid)

            summary_el = entry.find('atom:summary', ns)
            pub_el = entry.find('atom:published', ns)
            summary = ' '.join(summary_el.text.strip().split()) if summary_el is not None and summary_el.text else ''
            published = pub_el.text.strip() if pub_el is not None and pub_el.text else ''
            authors = [a.find('atom:name', ns).text for a in entry.findall('atom:author', ns)
                       if a.find('atom:name', ns) is not None and a.find('atom:name', ns).text]
            categories = [c.get('term', '') for c in entry.findall('atom:category', ns) if c.get('term')]
            link = id_el.text.strip()

            papers.append({
                "id": pid,
                "title": title,
                "summary": summary,
                "published": published,
                "authors": authors[:10],
                "link": link,
                "pdfLink": link.replace('/abs/', '/pdf/'),
                "categories": categories if categories else [category],
                "primaryCategory": category,
                "source": "arxiv",
            })

        # Wait between month queries
        if len(papers) < max_results and months_back < 5:
            time.sleep(ARXIV_WAIT)

    return papers


def fetch_medrxiv(code, subject_name, max_results=20):
    """Baja papers de medRxiv API filtrando por subject."""
    end_date = datetime.now().strftime("%Y-%m-%d")
    start_date = (datetime.now() - timedelta(days=MEDRXIV_DAYS_BACK)).strftime("%Y-%m-%d")

    papers = []
    cursor = 0
    page_size = 100
    max_pages = 20

    for page in range(max_pages):
        if len(papers) >= max_results:
            break

        url = f"https://api.medrxiv.org/details/medrxiv/{start_date}/{end_date}/{cursor}/{page_size}"
        try:
            resp = requests.get(url, timeout=30)
            if resp.status_code != 200:
                print(f"(HTTP {resp.status_code}) ", end="", flush=True)
                break
            data = resp.json()
        except Exception as e:
            print(f"(error: {e}) ", end="", flush=True)
            break

        collection = data.get("collection", [])
        if not collection:
            break

        for item in collection:
            cat = item.get("category", "")
            # Match: subject name contained in category (case insensitive)
            if subject_name.lower() not in cat.lower():
                continue

            doi = item.get("doi", "")
            title = item.get("title", "").strip()
            if not title:
                continue
            # Skip duplicates by title
            if any(p["title"] == title for p in papers):
                continue

            version = item.get("version", "1")
            papers.append({
                "id": doi.split("/")[-1] if doi else f"{code}-{cursor}-{len(papers)}",
                "title": title,
                "summary": item.get("abstract", "").strip(),
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

        if len(collection) < page_size:
            break

        cursor += page_size
        time.sleep(MEDRXIV_WAIT)

    return papers[:max_results]


# ══════════════════════════════════════════════════════════════
# MAIN
# ══════════════════════════════════════════════════════════════

print("=" * 60, flush=True)
print("  ARXIV + MEDRXIV PAPER FETCHER", flush=True)
print(f"  {PAPERS_PER_CATEGORY} papers x {len(ARXIV_CATS) + len(MEDRXIV_CATS)} categories", flush=True)
print("=" * 60, flush=True)

# ── TEST ──
print("\n[TEST] arXiv...", flush=True)
test_papers = fetch_arxiv("cs.AI", 2)
print(f"  cs.AI test: {len(test_papers)} papers", flush=True)
if test_papers:
    print(f"  First: {test_papers[0]['title'][:80]}...", flush=True)
else:
    print("  WARNING: 0 papers from test. arXiv may be having issues.", flush=True)

print("[TEST] medRxiv...", flush=True)
test_med = fetch_medrxiv("medrxiv.oncology", "Oncology", 2)
print(f"  Oncology test: {len(test_med)} papers", flush=True)
if test_med:
    print(f"  First: {test_med[0]['title'][:80]}...", flush=True)

print("\n" + "=" * 60, flush=True)

# ── LOAD CHECKPOINT ──
all_data = {}
if os.path.exists(OUTPUT_FILE):
    try:
        with open(OUTPUT_FILE, "r", encoding="utf-8") as f:
            all_data = json.load(f)
        print(f"Checkpoint: {len(all_data)} categories already done.\n", flush=True)
    except:
        all_data = {}

total = len(ARXIV_CATS) + len(MEDRXIV_CATS)
idx = 0
errors = []

# ═══ PHASE 1: arXiv ═══
print(f"\n--- ARXIV ({len(ARXIV_CATS)} categories) ---\n", flush=True)
for cat in ARXIV_CATS:
    idx += 1
    if cat in all_data and len(all_data[cat]) > 0:
        print(f"  [{idx}/{total}] {cat}: SKIP ({len(all_data[cat])} papers)", flush=True)
        continue

    print(f"  [{idx}/{total}] {cat}: ", end="", flush=True)
    try:
        papers = fetch_arxiv(cat, PAPERS_PER_CATEGORY)
        all_data[cat] = papers
        print(f"{len(papers)} papers", flush=True)
        if len(papers) == 0:
            errors.append(f"{cat}: 0 papers")
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        errors.append(f"{cat}: {e}")
        all_data[cat] = []

    # Save after every category
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False)

    time.sleep(ARXIV_WAIT)

# ═══ PHASE 2: medRxiv ═══
print(f"\n--- MEDRXIV ({len(MEDRXIV_CATS)} categories) ---\n", flush=True)
for code, subject in MEDRXIV_CATS.items():
    idx += 1
    if code in all_data and len(all_data[code]) > 0:
        print(f"  [{idx}/{total}] {code}: SKIP ({len(all_data[code])} papers)", flush=True)
        continue

    print(f"  [{idx}/{total}] {code}: ", end="", flush=True)
    try:
        papers = fetch_medrxiv(code, subject, PAPERS_PER_CATEGORY)
        all_data[code] = papers
        print(f"{len(papers)} papers", flush=True)
        if len(papers) == 0:
            errors.append(f"{code}: 0 papers")
    except Exception as e:
        print(f"ERROR: {e}", flush=True)
        errors.append(f"{code}: {e}")
        all_data[code] = []

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(all_data, f, ensure_ascii=False)

    time.sleep(MEDRXIV_WAIT)

# ═══ SUMMARY ═══
total_papers = sum(len(v) for v in all_data.values())
with_data = sum(1 for v in all_data.values() if len(v) > 0)
empty = sum(1 for v in all_data.values() if len(v) == 0)

print("\n" + "=" * 60, flush=True)
print("  DONE", flush=True)
print(f"  Categories: {len(all_data)} ({with_data} with papers, {empty} empty)", flush=True)
print(f"  Total papers: {total_papers}", flush=True)
file_size = os.path.getsize(OUTPUT_FILE) / 1024 / 1024
print(f"  File size: {file_size:.1f} MB", flush=True)

if errors:
    print(f"\n  Issues ({len(errors)}):", flush=True)
    for e in errors[:20]:
        print(f"    - {e}", flush=True)

print("=" * 60, flush=True)

# ── DOWNLOAD ──
try:
    from google.colab import files
    print("\nDescargando all_papers.json...", flush=True)
    files.download(OUTPUT_FILE)
except ImportError:
    print(f"\nArchivo guardado en: {OUTPUT_FILE}", flush=True)
