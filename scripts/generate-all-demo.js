const fs = require("fs");
const path = require("path");

// All categories with their subcategories
const ALL_CATEGORIES = [
  // CS
  { code: "cs.AI", name: "Artificial Intelligence", source: "arxiv" },
  { code: "cs.AR", name: "Hardware Architecture", source: "arxiv" },
  { code: "cs.CC", name: "Computational Complexity", source: "arxiv" },
  { code: "cs.CE", name: "Computational Engineering", source: "arxiv" },
  { code: "cs.CG", name: "Computational Geometry", source: "arxiv" },
  { code: "cs.CL", name: "Computation and Language", source: "arxiv" },
  { code: "cs.CR", name: "Cryptography and Security", source: "arxiv" },
  { code: "cs.CV", name: "Computer Vision", source: "arxiv" },
  { code: "cs.CY", name: "Computers and Society", source: "arxiv" },
  { code: "cs.DB", name: "Databases", source: "arxiv" },
  { code: "cs.DC", name: "Distributed and Parallel", source: "arxiv" },
  { code: "cs.DL", name: "Digital Libraries", source: "arxiv" },
  { code: "cs.DM", name: "Discrete Mathematics", source: "arxiv" },
  { code: "cs.DS", name: "Data Structures", source: "arxiv" },
  { code: "cs.ET", name: "Emerging Technologies", source: "arxiv" },
  { code: "cs.FL", name: "Formal Languages", source: "arxiv" },
  { code: "cs.GT", name: "Game Theory", source: "arxiv" },
  { code: "cs.HC", name: "Human-Computer Interaction", source: "arxiv" },
  { code: "cs.IR", name: "Information Retrieval", source: "arxiv" },
  { code: "cs.IT", name: "Information Theory", source: "arxiv" },
  { code: "cs.LG", name: "Machine Learning", source: "arxiv" },
  { code: "cs.LO", name: "Logic in Computer Science", source: "arxiv" },
  { code: "cs.MA", name: "Multiagent Systems", source: "arxiv" },
  { code: "cs.NI", name: "Networking and Internet", source: "arxiv" },
  { code: "cs.OS", name: "Operating Systems", source: "arxiv" },
  { code: "cs.PL", name: "Programming Languages", source: "arxiv" },
  { code: "cs.RO", name: "Robotics", source: "arxiv" },
  { code: "cs.SE", name: "Software Engineering", source: "arxiv" },
  { code: "cs.SI", name: "Social and Information Networks", source: "arxiv" },
  { code: "cs.SY", name: "Systems and Control", source: "arxiv" },
  // Economics
  { code: "econ.EM", name: "Econometrics", source: "arxiv" },
  { code: "econ.GN", name: "General Economics", source: "arxiv" },
  { code: "econ.TH", name: "Theoretical Economics", source: "arxiv" },
  // EESS
  { code: "eess.AS", name: "Audio and Speech Processing", source: "arxiv" },
  { code: "eess.IV", name: "Image and Video Processing", source: "arxiv" },
  { code: "eess.SP", name: "Signal Processing", source: "arxiv" },
  { code: "eess.SY", name: "Systems and Control", source: "arxiv" },
  // Math
  { code: "math.AC", name: "Commutative Algebra", source: "arxiv" },
  { code: "math.AG", name: "Algebraic Geometry", source: "arxiv" },
  { code: "math.AP", name: "Analysis of PDEs", source: "arxiv" },
  { code: "math.AT", name: "Algebraic Topology", source: "arxiv" },
  { code: "math.CA", name: "Classical Analysis", source: "arxiv" },
  { code: "math.CO", name: "Combinatorics", source: "arxiv" },
  { code: "math.CT", name: "Category Theory", source: "arxiv" },
  { code: "math.CV", name: "Complex Variables", source: "arxiv" },
  { code: "math.DG", name: "Differential Geometry", source: "arxiv" },
  { code: "math.DS", name: "Dynamical Systems", source: "arxiv" },
  { code: "math.FA", name: "Functional Analysis", source: "arxiv" },
  { code: "math.GM", name: "General Mathematics", source: "arxiv" },
  { code: "math.GN", name: "General Topology", source: "arxiv" },
  { code: "math.GR", name: "Group Theory", source: "arxiv" },
  { code: "math.GT", name: "Geometric Topology", source: "arxiv" },
  { code: "math.HO", name: "History and Overview", source: "arxiv" },
  { code: "math.IT", name: "Information Theory", source: "arxiv" },
  { code: "math.KT", name: "K-Theory and Homology", source: "arxiv" },
  { code: "math.LO", name: "Logic", source: "arxiv" },
  { code: "math.MG", name: "Metric Geometry", source: "arxiv" },
  { code: "math.MP", name: "Mathematical Physics", source: "arxiv" },
  { code: "math.NA", name: "Numerical Analysis", source: "arxiv" },
  { code: "math.NT", name: "Number Theory", source: "arxiv" },
  { code: "math.OA", name: "Operator Algebras", source: "arxiv" },
  { code: "math.OC", name: "Optimization and Control", source: "arxiv" },
  { code: "math.PR", name: "Probability", source: "arxiv" },
  { code: "math.QA", name: "Quantum Algebra", source: "arxiv" },
  { code: "math.RA", name: "Rings and Algebras", source: "arxiv" },
  { code: "math.RT", name: "Representation Theory", source: "arxiv" },
  { code: "math.SG", name: "Symplectic Geometry", source: "arxiv" },
  { code: "math.SP", name: "Spectral Theory", source: "arxiv" },
  { code: "math.ST", name: "Statistics Theory", source: "arxiv" },
  // Astrophysics
  { code: "astro-ph.CO", name: "Cosmology", source: "arxiv" },
  { code: "astro-ph.EP", name: "Earth and Planetary", source: "arxiv" },
  { code: "astro-ph.GA", name: "Galaxies", source: "arxiv" },
  { code: "astro-ph.HE", name: "High Energy Phenomena", source: "arxiv" },
  { code: "astro-ph.IM", name: "Instrumentation", source: "arxiv" },
  { code: "astro-ph.SR", name: "Solar and Stellar", source: "arxiv" },
  // Condensed matter
  { code: "cond-mat.dis-nn", name: "Disordered Systems", source: "arxiv" },
  { code: "cond-mat.mes-hall", name: "Mesoscale", source: "arxiv" },
  { code: "cond-mat.mtrl-sci", name: "Materials Science", source: "arxiv" },
  { code: "cond-mat.other", name: "Other", source: "arxiv" },
  { code: "cond-mat.quant-gas", name: "Quantum Gases", source: "arxiv" },
  { code: "cond-mat.soft", name: "Soft Condensed Matter", source: "arxiv" },
  { code: "cond-mat.stat-mech", name: "Statistical Mechanics", source: "arxiv" },
  { code: "cond-mat.str-el", name: "Strongly Correlated", source: "arxiv" },
  { code: "cond-mat.supr-con", name: "Superconductivity", source: "arxiv" },
  // HEP
  { code: "gr-qc", name: "General Relativity", source: "arxiv" },
  { code: "hep-ex", name: "HEP Experiment", source: "arxiv" },
  { code: "hep-lat", name: "HEP Lattice", source: "arxiv" },
  { code: "hep-ph", name: "HEP Phenomenology", source: "arxiv" },
  { code: "hep-th", name: "HEP Theory", source: "arxiv" },
  { code: "math-ph", name: "Mathematical Physics", source: "arxiv" },
  { code: "quant-ph", name: "Quantum Physics", source: "arxiv" },
  // Nonlinear
  { code: "nlin.AO", name: "Adaptation and Self-Organizing", source: "arxiv" },
  { code: "nlin.CD", name: "Chaotic Dynamics", source: "arxiv" },
  { code: "nlin.CG", name: "Cellular Automata", source: "arxiv" },
  { code: "nlin.PS", name: "Pattern Formation", source: "arxiv" },
  { code: "nlin.SI", name: "Exactly Solvable", source: "arxiv" },
  // Nuclear
  { code: "nucl-ex", name: "Nuclear Experiment", source: "arxiv" },
  { code: "nucl-th", name: "Nuclear Theory", source: "arxiv" },
  // Physics
  { code: "physics.acc-ph", name: "Accelerator Physics", source: "arxiv" },
  { code: "physics.ao-ph", name: "Atmospheric and Oceanic", source: "arxiv" },
  { code: "physics.app-ph", name: "Applied Physics", source: "arxiv" },
  { code: "physics.atm-clus", name: "Atomic and Molecular Clusters", source: "arxiv" },
  { code: "physics.atom-ph", name: "Atomic Physics", source: "arxiv" },
  { code: "physics.bio-ph", name: "Biological Physics", source: "arxiv" },
  { code: "physics.chem-ph", name: "Chemical Physics", source: "arxiv" },
  { code: "physics.class-ph", name: "Classical Physics", source: "arxiv" },
  { code: "physics.comp-ph", name: "Computational Physics", source: "arxiv" },
  { code: "physics.data-an", name: "Data Analysis", source: "arxiv" },
  { code: "physics.flu-dyn", name: "Fluid Dynamics", source: "arxiv" },
  { code: "physics.gen-ph", name: "General Physics", source: "arxiv" },
  { code: "physics.geo-ph", name: "Geophysics", source: "arxiv" },
  { code: "physics.hist-ph", name: "History of Physics", source: "arxiv" },
  { code: "physics.ins-det", name: "Instrumentation", source: "arxiv" },
  { code: "physics.med-ph", name: "Medical Physics", source: "arxiv" },
  { code: "physics.optics", name: "Optics", source: "arxiv" },
  { code: "physics.plasm-ph", name: "Plasma Physics", source: "arxiv" },
  { code: "physics.pop-ph", name: "Popular Physics", source: "arxiv" },
  { code: "physics.soc-ph", name: "Physics and Society", source: "arxiv" },
  { code: "physics.space-ph", name: "Space Physics", source: "arxiv" },
  // Q-Bio
  { code: "q-bio.BM", name: "Biomolecules", source: "arxiv" },
  { code: "q-bio.CB", name: "Cell Behavior", source: "arxiv" },
  { code: "q-bio.GN", name: "Genomics", source: "arxiv" },
  { code: "q-bio.MN", name: "Molecular Networks", source: "arxiv" },
  { code: "q-bio.NC", name: "Neurons and Cognition", source: "arxiv" },
  { code: "q-bio.OT", name: "Other Quantitative Biology", source: "arxiv" },
  { code: "q-bio.PE", name: "Populations and Evolution", source: "arxiv" },
  { code: "q-bio.QM", name: "Quantitative Methods", source: "arxiv" },
  { code: "q-bio.SC", name: "Subcellular Processes", source: "arxiv" },
  { code: "q-bio.TO", name: "Tissues and Organs", source: "arxiv" },
  // Q-Fin
  { code: "q-fin.CP", name: "Computational Finance", source: "arxiv" },
  { code: "q-fin.EC", name: "Economics", source: "arxiv" },
  { code: "q-fin.GN", name: "General Finance", source: "arxiv" },
  { code: "q-fin.MF", name: "Mathematical Finance", source: "arxiv" },
  { code: "q-fin.PM", name: "Portfolio Management", source: "arxiv" },
  { code: "q-fin.PR", name: "Pricing of Securities", source: "arxiv" },
  { code: "q-fin.RM", name: "Risk Management", source: "arxiv" },
  { code: "q-fin.ST", name: "Statistical Finance", source: "arxiv" },
  { code: "q-fin.TR", name: "Trading and Microstructure", source: "arxiv" },
  // Stats
  { code: "stat.AP", name: "Applications", source: "arxiv" },
  { code: "stat.CO", name: "Computation", source: "arxiv" },
  { code: "stat.ME", name: "Methodology", source: "arxiv" },
  { code: "stat.ML", name: "Machine Learning", source: "arxiv" },
  { code: "stat.OT", name: "Other Statistics", source: "arxiv" },
  { code: "stat.TH", name: "Statistics Theory", source: "arxiv" },
  // medRxiv
  { code: "medrxiv.addiction-medicine", name: "Addiction Medicine", source: "medrxiv" },
  { code: "medrxiv.allergy-and-immunology", name: "Allergy and Immunology", source: "medrxiv" },
  { code: "medrxiv.anesthesia", name: "Anesthesia", source: "medrxiv" },
  { code: "medrxiv.cardiovascular-medicine", name: "Cardiovascular Medicine", source: "medrxiv" },
  { code: "medrxiv.dentistry-and-oral-medicine", name: "Dentistry and Oral Medicine", source: "medrxiv" },
  { code: "medrxiv.dermatology", name: "Dermatology", source: "medrxiv" },
  { code: "medrxiv.emergency-medicine", name: "Emergency Medicine", source: "medrxiv" },
  { code: "medrxiv.endocrinology", name: "Endocrinology", source: "medrxiv" },
  { code: "medrxiv.epidemiology", name: "Epidemiology", source: "medrxiv" },
  { code: "medrxiv.forensic-medicine", name: "Forensic Medicine", source: "medrxiv" },
  { code: "medrxiv.gastroenterology", name: "Gastroenterology", source: "medrxiv" },
  { code: "medrxiv.genetic-and-genomic-medicine", name: "Genetic and Genomic Medicine", source: "medrxiv" },
  { code: "medrxiv.geriatric-medicine", name: "Geriatric Medicine", source: "medrxiv" },
  { code: "medrxiv.health-economics", name: "Health Economics", source: "medrxiv" },
  { code: "medrxiv.health-informatics", name: "Health Informatics", source: "medrxiv" },
  { code: "medrxiv.health-policy", name: "Health Policy", source: "medrxiv" },
  { code: "medrxiv.health-systems", name: "Health Systems and Quality Improvement", source: "medrxiv" },
  { code: "medrxiv.hematology", name: "Hematology", source: "medrxiv" },
  { code: "medrxiv.hiv-aids", name: "HIV/AIDS", source: "medrxiv" },
  { code: "medrxiv.infectious-diseases", name: "Infectious Diseases", source: "medrxiv" },
  { code: "medrxiv.intensive-care", name: "Intensive Care", source: "medrxiv" },
  { code: "medrxiv.medical-education", name: "Medical Education", source: "medrxiv" },
  { code: "medrxiv.medical-ethics", name: "Medical Ethics", source: "medrxiv" },
  { code: "medrxiv.nephrology", name: "Nephrology", source: "medrxiv" },
  { code: "medrxiv.neurology", name: "Neurology", source: "medrxiv" },
  { code: "medrxiv.nursing", name: "Nursing", source: "medrxiv" },
  { code: "medrxiv.nutrition", name: "Nutrition", source: "medrxiv" },
  { code: "medrxiv.obstetrics-and-gynecology", name: "Obstetrics and Gynecology", source: "medrxiv" },
  { code: "medrxiv.occupational-and-environmental-health", name: "Occupational and Environmental Health", source: "medrxiv" },
  { code: "medrxiv.oncology", name: "Oncology", source: "medrxiv" },
  { code: "medrxiv.ophthalmology", name: "Ophthalmology", source: "medrxiv" },
  { code: "medrxiv.orthopedics", name: "Orthopedics", source: "medrxiv" },
  { code: "medrxiv.otolaryngology", name: "Otolaryngology", source: "medrxiv" },
  { code: "medrxiv.pain-medicine", name: "Pain Medicine", source: "medrxiv" },
  { code: "medrxiv.palliative-medicine", name: "Palliative Medicine", source: "medrxiv" },
  { code: "medrxiv.pathology", name: "Pathology", source: "medrxiv" },
  { code: "medrxiv.pediatrics", name: "Pediatrics", source: "medrxiv" },
  { code: "medrxiv.pharmacology-and-therapeutics", name: "Pharmacology and Therapeutics", source: "medrxiv" },
  { code: "medrxiv.primary-care-research", name: "Primary Care Research", source: "medrxiv" },
  { code: "medrxiv.psychiatry", name: "Psychiatry and Clinical Psychology", source: "medrxiv" },
  { code: "medrxiv.public-and-global-health", name: "Public and Global Health", source: "medrxiv" },
  { code: "medrxiv.radiology-and-imaging", name: "Radiology and Imaging", source: "medrxiv" },
  { code: "medrxiv.rehabilitation-medicine", name: "Rehabilitation Medicine", source: "medrxiv" },
  { code: "medrxiv.respiratory-medicine", name: "Respiratory Medicine", source: "medrxiv" },
  { code: "medrxiv.rheumatology", name: "Rheumatology", source: "medrxiv" },
  { code: "medrxiv.sexual-and-reproductive-health", name: "Sexual and Reproductive Health", source: "medrxiv" },
  { code: "medrxiv.sports-medicine", name: "Sports Medicine", source: "medrxiv" },
  { code: "medrxiv.surgery", name: "Surgery", source: "medrxiv" },
  { code: "medrxiv.toxicology", name: "Toxicology", source: "medrxiv" },
  { code: "medrxiv.transplantation", name: "Transplantation", source: "medrxiv" },
  { code: "medrxiv.urology", name: "Urology", source: "medrxiv" },
];

// Seeded random number generator for deterministic output
function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

const firstNames = ["Wei","Sarah","James","Anna","Michael","Rachel","David","Lisa","Thomas","Emma","Carlos","Yuki","Ahmed","Priya","Olga","Marcus","Fatima","Liang","Sophia","Ivan"];
const lastNames = ["Zhang","Chen","Roberts","Kumar","Liu","Petrov","Kim","Wong","Mueller","Johnson","Garcia","Tanaka","Hassan","Patel","Volkov","Williams","Al-Rashid","Wang","Anderson","Kozlov"];

const expertPhrases = [
  "Solid work that addresses a genuine gap in the field.",
  "The methodology is sound but the novelty is incremental.",
  "This pushes the boundary of what we thought was possible.",
  "Good empirical work, though the theoretical grounding could be stronger.",
  "A much-needed contribution that will likely see wide adoption.",
  "The claims are ambitious but the evidence largely supports them.",
  "Technically correct but unlikely to change how the field operates.",
  "Impressive scope and execution. Will be widely cited.",
  "The approach is creative but the evaluation has gaps.",
  "Straightforward extension of prior work, but well executed.",
  "This is what happens when good engineering meets good science.",
  "The framing oversells the contribution but the core result is solid.",
  "Needed more baselines but the results are promising.",
  "A strong benchmark paper that the community has been waiting for.",
  "Not groundbreaking, but a reliable addition to the literature."
];

const redFlagOptions = [
  "Limited evaluation on only a few benchmarks",
  "Comparisons with outdated baselines",
  "Missing ablation studies for key components",
  "Reproducibility concerns due to insufficient implementation details",
  "Small dataset may not generalize to larger-scale settings",
  "Statistical significance not adequately reported",
  "The theoretical claims lack rigorous proofs",
  "Potential confounding variables not addressed",
  "Computational cost not properly discussed",
  "User study sample size is too small for reliable conclusions"
];

function categoryToFilename(cat) {
  return cat.replace(/\./g, "-");
}

function generatePapersForCategory(cat, rng) {
  const papers = [];
  const numPapers = 20;
  const isMedrxiv = cat.source === "medrxiv";
  const baseUrl = isMedrxiv ? "https://www.medrxiv.org/content" : "https://arxiv.org/abs";
  const pdfBase = isMedrxiv ? "https://www.medrxiv.org/content" : "https://arxiv.org/pdf";

  // Topic templates per-field
  const topicVerbs = ["Novel approach to","Improved methods for","Scaling","Rethinking","A unified framework for","Efficient","On the","Towards","Benchmarking","Revisiting"];
  const topicNouns = [cat.name.toLowerCase(), "analysis", "models", "systems", "algorithms", "representations", "optimization", "inference", "estimation", "learning"];
  const adjectives = ["robust","scalable","efficient","interpretable","adaptive","multi-modal","hierarchical","distributed","probabilistic","neural"];

  for (let i = 0; i < numPapers; i++) {
    const verb = topicVerbs[Math.floor(rng() * topicVerbs.length)];
    const adj = adjectives[Math.floor(rng() * adjectives.length)];
    const noun = topicNouns[Math.floor(rng() * topicNouns.length)];
    const title = `${verb} ${adj} ${noun} in ${cat.name}`;

    const numAuthors = 2 + Math.floor(rng() * 4);
    const authors = [];
    for (let a = 0; a < numAuthors; a++) {
      authors.push(`${firstNames[Math.floor(rng() * firstNames.length)]} ${lastNames[Math.floor(rng() * lastNames.length)]}`);
    }

    const day = 1 + Math.floor(rng() * 6);
    const dateStr = `2026-02-0${day}T${10 + Math.floor(rng() * 12)}:00:00Z`;
    const idNum = `2602.${String(10000 + Math.floor(rng() * 89999)).padStart(5, "0")}`;

    const paperId = isMedrxiv ? `medrxiv:10.1101/${idNum}` : `http://arxiv.org/abs/${idNum}v1`;
    const link = isMedrxiv ? `${baseUrl}/10.1101/${idNum}v1` : `${baseUrl}/${idNum}`;
    const pdfLink = isMedrxiv ? `${baseUrl}/10.1101/${idNum}v1.full.pdf` : `${pdfBase}/${idNum}`;

    const summary = `We present ${title.toLowerCase()}. Through extensive experiments, we demonstrate significant improvements over existing methods. Our approach achieves state-of-the-art results on standard benchmarks for ${cat.name.toLowerCase()}, with improvements of ${(5 + rng() * 30).toFixed(1)}% on the primary metric. We provide theoretical analysis and extensive ablation studies to validate our design choices.`;

    const bsIndex = 1 + Math.floor(rng() * 7);
    const sotaScore = 3 + Math.floor(rng() * 7);
    const isSOTA = sotaScore >= 7;

    const numClaims = 2 + Math.floor(rng() * 2);
    const coreClaims = [];
    for (let c = 0; c < numClaims; c++) {
      coreClaims.push(`Key finding ${c + 1}: ${adj} ${noun} approach yields ${(10 + rng() * 40).toFixed(0)}% improvement in ${cat.name.toLowerCase()} tasks`);
    }

    const numFlags = 1 + Math.floor(rng() * 2);
    const redFlags = [];
    const usedFlags = new Set();
    for (let f = 0; f < numFlags; f++) {
      let idx = Math.floor(rng() * redFlagOptions.length);
      while (usedFlags.has(idx)) idx = (idx + 1) % redFlagOptions.length;
      usedFlags.add(idx);
      redFlags.push(redFlagOptions[idx]);
    }

    const expertCommentary = expertPhrases[Math.floor(rng() * expertPhrases.length)];
    const oneLiner = `${adj.charAt(0).toUpperCase() + adj.slice(1)} ${noun} method that ${isSOTA ? "sets a new bar" : "offers incremental gains"} for ${cat.name.toLowerCase()}.`;

    papers.push({
      id: paperId,
      title,
      summary,
      authors,
      published: dateStr,
      updated: dateStr,
      categories: [cat.code],
      primaryCategory: cat.code,
      link,
      pdfLink,
      analysis: {
        bsIndex,
        coreClaims,
        redFlags,
        expertCommentary,
        sotaScore,
        isSOTA,
        oneLiner
      }
    });
  }

  return papers;
}

function buildSotaRanking(papers) {
  return papers
    .filter(p => p.analysis && p.analysis.sotaScore >= 5)
    .sort((a, b) => b.analysis.sotaScore - a.analysis.sotaScore)
    .slice(0, 10)
    .map(p => ({
      id: p.id,
      title: p.title,
      authors: p.authors,
      link: p.link,
      pdfLink: p.pdfLink,
      sotaScore: p.analysis.sotaScore,
      bsIndex: p.analysis.bsIndex,
      oneLiner: p.analysis.oneLiner,
      isSOTA: p.analysis.isSOTA,
      analysis: p.analysis
    }));
}

// Main
const outDir = path.resolve(process.cwd(), "public", "data", "analyses");
fs.mkdirSync(outDir, { recursive: true });

let generated = 0;
let skipped = 0;

for (const cat of ALL_CATEGORIES) {
  const filename = categoryToFilename(cat.code) + ".json";
  const filepath = path.join(outDir, filename);

  // Skip existing files (preserve cs-AI and cs-LG which have hand-crafted data)
  if (fs.existsSync(filepath)) {
    skipped++;
    continue;
  }

  const seed = cat.code.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const rng = mulberry32(seed);

  const papers = generatePapersForCategory(cat, rng);
  const sotaRanking = buildSotaRanking(papers);

  const data = {
    category: cat.code,
    categoryName: cat.name,
    generatedAt: "2026-02-07T01:00:00.000Z",
    paperCount: papers.length,
    analyzedCount: papers.length,
    papers,
    sotaRanking
  };

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  generated++;
}

console.log("Done. Generated:", generated, "Skipped:", skipped, "Total categories:", ALL_CATEGORIES.length);
