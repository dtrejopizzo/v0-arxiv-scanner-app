export interface ArxivSubcategory {
  code: string
  name: string
  description: string
}

export interface ArxivCategory {
  code: string
  name: string
  icon: string
  source: "arxiv" | "medrxiv"
  subcategories: ArxivSubcategory[]
}

export const ARXIV_CATEGORIES: ArxivCategory[] = [
  {
    code: "cs",
    name: "Computer Science",
    icon: "Monitor",
    source: "arxiv",
    subcategories: [
      { code: "cs.AI", name: "Artificial Intelligence", description: "IA general, razonamiento y planificacion" },
      { code: "cs.AR", name: "Hardware Architecture", description: "Organizacion de sistemas y diseno de hardware" },
      { code: "cs.CC", name: "Computational Complexity", description: "Modelos de computo y limites de complejidad" },
      { code: "cs.CE", name: "Computational Engineering", description: "Aplicaciones en ciencia, ingenieria y finanzas" },
      { code: "cs.CG", name: "Computational Geometry", description: "Algoritmos geometricos y estructuras de datos" },
      { code: "cs.CL", name: "Computation and Language", description: "Procesamiento de Lenguaje Natural (NLP)" },
      { code: "cs.CR", name: "Cryptography and Security", description: "Seguridad, autenticacion y criptografia" },
      { code: "cs.CV", name: "Computer Vision", description: "Procesamiento de imagenes y reconocimiento de patrones" },
      { code: "cs.CY", name: "Computers and Society", description: "Etica, politica publica y educacion" },
      { code: "cs.DB", name: "Databases", description: "Gestion de bases de datos y mineria de datos" },
      { code: "cs.DC", name: "Distributed and Parallel", description: "Algoritmos distribuidos y computacion en la nube" },
      { code: "cs.DL", name: "Digital Libraries", description: "Diseno de bibliotecas digitales" },
      { code: "cs.DM", name: "Discrete Mathematics", description: "Combinatoria, teoria de grafos y probabilidad" },
      { code: "cs.DS", name: "Data Structures", description: "Analisis de algoritmos y estructuras de datos" },
      { code: "cs.ET", name: "Emerging Technologies", description: "Tecnologias no basadas en silicio" },
      { code: "cs.FL", name: "Formal Languages", description: "Automatas y teoria de lenguajes formales" },
      { code: "cs.GT", name: "Game Theory", description: "Interseccion entre computacion y teoria de juegos" },
      { code: "cs.HC", name: "Human-Computer Interaction", description: "Interfaces de usuario y factores humanos" },
      { code: "cs.IR", name: "Information Retrieval", description: "Indexacion, busqueda y analisis de contenido" },
      { code: "cs.IT", name: "Information Theory", description: "Teoria de la informacion y codificacion" },
      { code: "cs.LG", name: "Machine Learning", description: "Aprendizaje supervisado, no supervisado y refuerzo" },
      { code: "cs.LO", name: "Logic in Computer Science", description: "Logica de programas y verificacion" },
      { code: "cs.MA", name: "Multiagent Systems", description: "Agentes inteligentes e interacciones coordinadas" },
      { code: "cs.NI", name: "Networking and Internet", description: "Protocolos de red y arquitectura de Internet" },
      { code: "cs.OS", name: "Operating Systems", description: "Gestion de recursos y sistemas operativos" },
      { code: "cs.PL", name: "Programming Languages", description: "Semantica y caracteristicas de lenguajes" },
      { code: "cs.RO", name: "Robotics", description: "Teoria y aplicaciones roboticas" },
      { code: "cs.SE", name: "Software Engineering", description: "Herramientas de diseno, metricas y testing" },
      { code: "cs.SI", name: "Social and Information Networks", description: "Redes sociales y de informacion" },
      { code: "cs.SY", name: "Systems and Control", description: "Sistemas de control y automatizacion" },
    ],
  },
  {
    code: "econ",
    name: "Economics",
    icon: "TrendingUp",
    source: "arxiv",
    subcategories: [
      { code: "econ.EM", name: "Econometrics", description: "Metodos econometricos y estadisticos" },
      { code: "econ.GN", name: "General Economics", description: "Economia general y topicos transversales" },
      { code: "econ.TH", name: "Theoretical Economics", description: "Teoria economica y modelos formales" },
    ],
  },
  {
    code: "eess",
    name: "Electrical Engineering",
    icon: "Zap",
    source: "arxiv",
    subcategories: [
      { code: "eess.AS", name: "Audio and Speech Processing", description: "Procesamiento de audio y habla" },
      { code: "eess.IV", name: "Image and Video Processing", description: "Procesamiento de imagen y video" },
      { code: "eess.SP", name: "Signal Processing", description: "Procesamiento de senales" },
      { code: "eess.SY", name: "Systems and Control", description: "Sistemas y control" },
    ],
  },
  {
    code: "math",
    name: "Mathematics",
    icon: "Sigma",
    source: "arxiv",
    subcategories: [
      { code: "math.AC", name: "Commutative Algebra", description: "Algebra conmutativa" },
      { code: "math.AG", name: "Algebraic Geometry", description: "Geometria algebraica" },
      { code: "math.AP", name: "Analysis of PDEs", description: "Analisis de ecuaciones en derivadas parciales" },
      { code: "math.AT", name: "Algebraic Topology", description: "Topologia algebraica" },
      { code: "math.CA", name: "Classical Analysis", description: "Analisis clasico y ODEs" },
      { code: "math.CO", name: "Combinatorics", description: "Combinatoria" },
      { code: "math.CT", name: "Category Theory", description: "Teoria de categorias" },
      { code: "math.CV", name: "Complex Variables", description: "Variables complejas" },
      { code: "math.DG", name: "Differential Geometry", description: "Geometria diferencial" },
      { code: "math.DS", name: "Dynamical Systems", description: "Sistemas dinamicos" },
      { code: "math.FA", name: "Functional Analysis", description: "Analisis funcional" },
      { code: "math.GM", name: "General Mathematics", description: "Matematicas generales" },
      { code: "math.GN", name: "General Topology", description: "Topologia general" },
      { code: "math.GR", name: "Group Theory", description: "Teoria de grupos" },
      { code: "math.GT", name: "Geometric Topology", description: "Topologia geometrica" },
      { code: "math.HO", name: "History and Overview", description: "Historia y panorama" },
      { code: "math.IT", name: "Information Theory", description: "Teoria de la informacion" },
      { code: "math.KT", name: "K-Theory and Homology", description: "K-teoria y homologia" },
      { code: "math.LO", name: "Logic", description: "Logica matematica" },
      { code: "math.MG", name: "Metric Geometry", description: "Geometria metrica" },
      { code: "math.MP", name: "Mathematical Physics", description: "Fisica matematica" },
      { code: "math.NA", name: "Numerical Analysis", description: "Analisis numerico" },
      { code: "math.NT", name: "Number Theory", description: "Teoria de numeros" },
      { code: "math.OA", name: "Operator Algebras", description: "Algebras de operadores" },
      { code: "math.OC", name: "Optimization and Control", description: "Optimizacion y control" },
      { code: "math.PR", name: "Probability", description: "Probabilidad" },
      { code: "math.QA", name: "Quantum Algebra", description: "Algebra cuantica" },
      { code: "math.RA", name: "Rings and Algebras", description: "Anillos y algebras" },
      { code: "math.RT", name: "Representation Theory", description: "Teoria de representaciones" },
      { code: "math.SG", name: "Symplectic Geometry", description: "Geometria simplectica" },
      { code: "math.SP", name: "Spectral Theory", description: "Teoria espectral" },
      { code: "math.ST", name: "Statistics Theory", description: "Teoria estadistica" },
    ],
  },
  {
    code: "astro-ph",
    name: "Astrophysics",
    icon: "Star",
    source: "arxiv",
    subcategories: [
      { code: "astro-ph.CO", name: "Cosmology", description: "Cosmologia y astrofisica extragalactica" },
      { code: "astro-ph.EP", name: "Earth and Planetary", description: "Astrofisica planetaria" },
      { code: "astro-ph.GA", name: "Galaxies", description: "Astrofisica de galaxias" },
      { code: "astro-ph.HE", name: "High Energy Phenomena", description: "Fenomenos de alta energia" },
      { code: "astro-ph.IM", name: "Instrumentation", description: "Instrumentacion y metodos" },
      { code: "astro-ph.SR", name: "Solar and Stellar", description: "Astrofisica solar y estelar" },
    ],
  },
  {
    code: "cond-mat",
    name: "Condensed Matter",
    icon: "Atom",
    source: "arxiv",
    subcategories: [
      { code: "cond-mat.dis-nn", name: "Disordered Systems", description: "Sistemas desordenados y redes neuronales" },
      { code: "cond-mat.mes-hall", name: "Mesoscale", description: "Sistemas mesoscopicos y efecto Hall cuantico" },
      { code: "cond-mat.mtrl-sci", name: "Materials Science", description: "Ciencia de materiales" },
      { code: "cond-mat.other", name: "Other", description: "Otros temas de materia condensada" },
      { code: "cond-mat.quant-gas", name: "Quantum Gases", description: "Gases cuanticos" },
      { code: "cond-mat.soft", name: "Soft Condensed Matter", description: "Materia condensada blanda" },
      { code: "cond-mat.stat-mech", name: "Statistical Mechanics", description: "Mecanica estadistica" },
      { code: "cond-mat.str-el", name: "Strongly Correlated", description: "Electrones fuertemente correlacionados" },
      { code: "cond-mat.supr-con", name: "Superconductivity", description: "Superconductividad" },
    ],
  },
  {
    code: "hep",
    name: "High Energy Physics",
    icon: "Orbit",
    source: "arxiv",
    subcategories: [
      { code: "gr-qc", name: "General Relativity", description: "Relatividad general y cosmologia cuantica" },
      { code: "hep-ex", name: "HEP Experiment", description: "Fisica de altas energias experimental" },
      { code: "hep-lat", name: "HEP Lattice", description: "Fisica de altas energias en la red" },
      { code: "hep-ph", name: "HEP Phenomenology", description: "Fenomenologia de altas energias" },
      { code: "hep-th", name: "HEP Theory", description: "Teoria de altas energias" },
      { code: "math-ph", name: "Mathematical Physics", description: "Fisica matematica" },
      { code: "quant-ph", name: "Quantum Physics", description: "Fisica cuantica" },
    ],
  },
  {
    code: "nlin",
    name: "Nonlinear Sciences",
    icon: "Waves",
    source: "arxiv",
    subcategories: [
      { code: "nlin.AO", name: "Adaptation and Self-Organizing", description: "Adaptacion y auto-organizacion" },
      { code: "nlin.CD", name: "Chaotic Dynamics", description: "Dinamica caotica" },
      { code: "nlin.CG", name: "Cellular Automata", description: "Automatas celulares y gases de red" },
      { code: "nlin.PS", name: "Pattern Formation", description: "Formacion de patrones y solitones" },
      { code: "nlin.SI", name: "Exactly Solvable", description: "Sistemas exactamente solubles e integrables" },
    ],
  },
  {
    code: "nucl",
    name: "Nuclear",
    icon: "CircleDot",
    source: "arxiv",
    subcategories: [
      { code: "nucl-ex", name: "Nuclear Experiment", description: "Fisica nuclear experimental" },
      { code: "nucl-th", name: "Nuclear Theory", description: "Teoria nuclear" },
    ],
  },
  {
    code: "physics",
    name: "Physics",
    icon: "FlaskConical",
    source: "arxiv",
    subcategories: [
      { code: "physics.acc-ph", name: "Accelerator Physics", description: "Fisica de aceleradores" },
      { code: "physics.ao-ph", name: "Atmospheric and Oceanic", description: "Fisica atmosferica y oceanica" },
      { code: "physics.app-ph", name: "Applied Physics", description: "Fisica aplicada" },
      { code: "physics.atm-clus", name: "Atomic and Molecular Clusters", description: "Clusters atomicos y moleculares" },
      { code: "physics.atom-ph", name: "Atomic Physics", description: "Fisica atomica" },
      { code: "physics.bio-ph", name: "Biological Physics", description: "Fisica biologica" },
      { code: "physics.chem-ph", name: "Chemical Physics", description: "Fisica quimica" },
      { code: "physics.class-ph", name: "Classical Physics", description: "Fisica clasica" },
      { code: "physics.comp-ph", name: "Computational Physics", description: "Fisica computacional" },
      { code: "physics.data-an", name: "Data Analysis", description: "Analisis de datos, estadistica y probabilidad" },
      { code: "physics.flu-dyn", name: "Fluid Dynamics", description: "Dinamica de fluidos" },
      { code: "physics.gen-ph", name: "General Physics", description: "Fisica general" },
      { code: "physics.geo-ph", name: "Geophysics", description: "Geofisica" },
      { code: "physics.hist-ph", name: "History of Physics", description: "Historia y filosofia de la fisica" },
      { code: "physics.ins-det", name: "Instrumentation", description: "Instrumentacion y detectores" },
      { code: "physics.med-ph", name: "Medical Physics", description: "Fisica medica" },
      { code: "physics.optics", name: "Optics", description: "Optica" },
      { code: "physics.plasm-ph", name: "Plasma Physics", description: "Fisica de plasmas" },
      { code: "physics.pop-ph", name: "Popular Physics", description: "Fisica popular" },
      { code: "physics.soc-ph", name: "Physics and Society", description: "Fisica y sociedad" },
      { code: "physics.space-ph", name: "Space Physics", description: "Fisica espacial" },
    ],
  },
  {
    code: "q-bio",
    name: "Quantitative Biology",
    icon: "Dna",
    source: "arxiv",
    subcategories: [
      { code: "q-bio.BM", name: "Biomolecules", description: "Biomoleculas" },
      { code: "q-bio.CB", name: "Cell Behavior", description: "Comportamiento celular" },
      { code: "q-bio.GN", name: "Genomics", description: "Genomica" },
      { code: "q-bio.MN", name: "Molecular Networks", description: "Redes moleculares" },
      { code: "q-bio.NC", name: "Neurons and Cognition", description: "Neuronas y cognicion" },
      { code: "q-bio.OT", name: "Other Quantitative Biology", description: "Otros temas" },
      { code: "q-bio.PE", name: "Populations and Evolution", description: "Poblaciones y evolucion" },
      { code: "q-bio.QM", name: "Quantitative Methods", description: "Metodos cuantitativos" },
      { code: "q-bio.SC", name: "Subcellular Processes", description: "Procesos subcelulares" },
      { code: "q-bio.TO", name: "Tissues and Organs", description: "Tejidos y organos" },
    ],
  },
  {
    code: "q-fin",
    name: "Quantitative Finance",
    icon: "DollarSign",
    source: "arxiv",
    subcategories: [
      { code: "q-fin.CP", name: "Computational Finance", description: "Finanzas computacionales" },
      { code: "q-fin.EC", name: "Economics", description: "Economia" },
      { code: "q-fin.GN", name: "General Finance", description: "Finanzas generales" },
      { code: "q-fin.MF", name: "Mathematical Finance", description: "Finanzas matematicas" },
      { code: "q-fin.PM", name: "Portfolio Management", description: "Gestion de portafolios" },
      { code: "q-fin.PR", name: "Pricing of Securities", description: "Pricing de valores" },
      { code: "q-fin.RM", name: "Risk Management", description: "Gestion de riesgo" },
      { code: "q-fin.ST", name: "Statistical Finance", description: "Finanzas estadisticas" },
      { code: "q-fin.TR", name: "Trading and Microstructure", description: "Trading y microestructura" },
    ],
  },
  {
    code: "stat",
    name: "Statistics",
    icon: "BarChart3",
    source: "arxiv",
    subcategories: [
      { code: "stat.AP", name: "Applications", description: "Aplicaciones estadisticas" },
      { code: "stat.CO", name: "Computation", description: "Estadistica computacional" },
      { code: "stat.ME", name: "Methodology", description: "Metodologia estadistica" },
      { code: "stat.ML", name: "Machine Learning", description: "Aprendizaje automatico" },
      { code: "stat.OT", name: "Other Statistics", description: "Otros temas" },
      { code: "stat.TH", name: "Statistics Theory", description: "Teoria estadistica" },
    ],
  },
  // ── medRxiv ──────────────────────────────────────
  {
    code: "medrxiv",
    name: "medRxiv",
    icon: "HeartPulse",
    source: "medrxiv",
    subcategories: [
      { code: "medrxiv.addiction-medicine", name: "Addiction Medicine", description: "Medicina de las adicciones" },
      { code: "medrxiv.allergy-and-immunology", name: "Allergy and Immunology", description: "Alergia e inmunologia" },
      { code: "medrxiv.anesthesia", name: "Anesthesia", description: "Anestesia" },
      { code: "medrxiv.cardiovascular-medicine", name: "Cardiovascular Medicine", description: "Medicina cardiovascular" },
      { code: "medrxiv.dentistry-and-oral-medicine", name: "Dentistry and Oral Medicine", description: "Odontologia y medicina oral" },
      { code: "medrxiv.dermatology", name: "Dermatology", description: "Dermatologia" },
      { code: "medrxiv.emergency-medicine", name: "Emergency Medicine", description: "Medicina de emergencia" },
      { code: "medrxiv.endocrinology", name: "Endocrinology", description: "Endocrinologia (incluye diabetes y enfermedades metabolicas)" },
      { code: "medrxiv.epidemiology", name: "Epidemiology", description: "Epidemiologia" },
      { code: "medrxiv.forensic-medicine", name: "Forensic Medicine", description: "Medicina forense" },
      { code: "medrxiv.gastroenterology", name: "Gastroenterology", description: "Gastroenterologia" },
      { code: "medrxiv.genetic-and-genomic-medicine", name: "Genetic and Genomic Medicine", description: "Medicina genetica y genomica" },
      { code: "medrxiv.geriatric-medicine", name: "Geriatric Medicine", description: "Medicina geriatrica" },
      { code: "medrxiv.health-economics", name: "Health Economics", description: "Economia de la salud" },
      { code: "medrxiv.health-informatics", name: "Health Informatics", description: "Informatica de la salud" },
      { code: "medrxiv.health-policy", name: "Health Policy", description: "Politicas de salud" },
      { code: "medrxiv.health-systems", name: "Health Systems and Quality Improvement", description: "Sistemas de salud y mejora de calidad" },
      { code: "medrxiv.hematology", name: "Hematology", description: "Hematologia" },
      { code: "medrxiv.hiv-aids", name: "HIV/AIDS", description: "VIH/SIDA" },
      { code: "medrxiv.infectious-diseases", name: "Infectious Diseases (except HIV/AIDS)", description: "Enfermedades infecciosas (excepto VIH/SIDA)" },
      { code: "medrxiv.intensive-care", name: "Intensive Care and Critical Care Medicine", description: "Medicina intensiva y critica" },
      { code: "medrxiv.medical-education", name: "Medical Education", description: "Educacion medica" },
      { code: "medrxiv.medical-ethics", name: "Medical Ethics", description: "Etica medica" },
      { code: "medrxiv.nephrology", name: "Nephrology", description: "Nefrologia" },
      { code: "medrxiv.neurology", name: "Neurology", description: "Neurologia" },
      { code: "medrxiv.nursing", name: "Nursing", description: "Enfermeria" },
      { code: "medrxiv.nutrition", name: "Nutrition", description: "Nutricion" },
      { code: "medrxiv.obstetrics-and-gynecology", name: "Obstetrics and Gynecology", description: "Obstetricia y ginecologia" },
      { code: "medrxiv.occupational-and-environmental-health", name: "Occupational and Environmental Health", description: "Salud ocupacional y ambiental" },
      { code: "medrxiv.oncology", name: "Oncology", description: "Oncologia" },
      { code: "medrxiv.ophthalmology", name: "Ophthalmology", description: "Oftalmologia" },
      { code: "medrxiv.orthopedics", name: "Orthopedics", description: "Ortopedia" },
      { code: "medrxiv.otolaryngology", name: "Otolaryngology", description: "Otorrinolaringologia" },
      { code: "medrxiv.pain-medicine", name: "Pain Medicine", description: "Medicina del dolor" },
      { code: "medrxiv.palliative-medicine", name: "Palliative Medicine", description: "Medicina paliativa" },
      { code: "medrxiv.pathology", name: "Pathology", description: "Patologia" },
      { code: "medrxiv.pediatrics", name: "Pediatrics", description: "Pediatria" },
      { code: "medrxiv.pharmacology-and-therapeutics", name: "Pharmacology and Therapeutics", description: "Farmacologia y terapeutica" },
      { code: "medrxiv.primary-care-research", name: "Primary Care Research", description: "Investigacion en atencion primaria" },
      { code: "medrxiv.psychiatry", name: "Psychiatry and Clinical Psychology", description: "Psiquiatria y psicologia clinica" },
      { code: "medrxiv.public-and-global-health", name: "Public and Global Health", description: "Salud publica y global" },
      { code: "medrxiv.radiology-and-imaging", name: "Radiology and Imaging", description: "Radiologia e imagenologia" },
      { code: "medrxiv.rehabilitation-medicine", name: "Rehabilitation Medicine and Physical Therapy", description: "Medicina de rehabilitacion y fisioterapia" },
      { code: "medrxiv.respiratory-medicine", name: "Respiratory Medicine", description: "Medicina respiratoria" },
      { code: "medrxiv.rheumatology", name: "Rheumatology", description: "Reumatologia" },
      { code: "medrxiv.sexual-and-reproductive-health", name: "Sexual and Reproductive Health", description: "Salud sexual y reproductiva" },
      { code: "medrxiv.sports-medicine", name: "Sports Medicine", description: "Medicina deportiva" },
      { code: "medrxiv.surgery", name: "Surgery", description: "Cirugia" },
      { code: "medrxiv.toxicology", name: "Toxicology", description: "Toxicologia" },
      { code: "medrxiv.transplantation", name: "Transplantation", description: "Trasplantes" },
      { code: "medrxiv.urology", name: "Urology", description: "Urologia" },
    ],
  },
]

/**
 * Helper: get all arXiv categories only
 */
export const ARXIV_ONLY = ARXIV_CATEGORIES.filter((c) => c.source === "arxiv")

/**
 * Helper: get all medRxiv categories only
 */
export const MEDRXIV_ONLY = ARXIV_CATEGORIES.filter((c) => c.source === "medrxiv")

/**
 * Check if a category code belongs to medRxiv
 */
export function isMedRxivCategory(code: string): boolean {
  return code.startsWith("medrxiv.")
}

/**
 * Convert a medRxiv internal code to the subject name used by the medRxiv API
 * e.g. "medrxiv.cardiovascular-medicine" -> "Cardiovascular Medicine"
 */
export function getMedRxivSubjectName(code: string): string | null {
  for (const cat of ARXIV_CATEGORIES) {
    if (cat.source !== "medrxiv") continue
    const sub = cat.subcategories.find((s) => s.code === code)
    if (sub) return sub.name
  }
  return null
}
