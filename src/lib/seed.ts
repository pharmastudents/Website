import type { DB, Material, Order, Package, Student, Subject } from "./types";

const SUBJECTS_CONFIG: {
  year: number;
  semester: number;
  items: { name: string; code: string }[];
}[] = [
  {
    year: 1,
    semester: 1,
    items: [
      { name: "Human Anatomy & Physiology I", code: "BP101T" },
      { name: "Pharmaceutical Analysis I", code: "BP102T" },
      { name: "Pharmaceutics I", code: "BP103T" },
      { name: "Pharmaceutical Inorganic Chemistry", code: "BP104T" },
    ],
  },
  {
    year: 1,
    semester: 2,
    items: [
      { name: "Human Anatomy & Physiology II", code: "BP201T" },
      { name: "Pharmaceutical Organic Chemistry I", code: "BP202T" },
      { name: "Biochemistry", code: "BP203T" },
      { name: "Pathophysiology", code: "BP204T" },
    ],
  },
  {
    year: 2,
    semester: 3,
    items: [
      { name: "Pharmaceutical Organic Chemistry II", code: "BP301T" },
      { name: "Physical Pharmaceutics I", code: "BP302T" },
      { name: "Pharmaceutical Microbiology", code: "BP303T" },
      { name: "Pharmaceutical Engineering", code: "BP304T" },
    ],
  },
  {
    year: 2,
    semester: 4,
    items: [
      { name: "Pharmaceutical Organic Chemistry III", code: "BP401T" },
      { name: "Medicinal Chemistry I", code: "BP402T" },
      { name: "Physical Pharmaceutics II", code: "BP403T" },
      { name: "Pharmacology I", code: "BP404T" },
      { name: "Pharmacognosy & Phytochemistry I", code: "BP405T" },
    ],
  },
  {
    year: 3,
    semester: 5,
    items: [
      { name: "Medicinal Chemistry II", code: "BP501T" },
      { name: "Industrial Pharmacy I", code: "BP502T" },
      { name: "Pharmacology II", code: "BP503T" },
      { name: "Pharmacognosy & Phytochemistry II", code: "BP504T" },
      { name: "Pharmaceutical Jurisprudence", code: "BP505T" },
    ],
  },
  {
    year: 3,
    semester: 6,
    items: [
      { name: "Medicinal Chemistry III", code: "BP601T" },
      { name: "Pharmacology III", code: "BP602T" },
      { name: "Herbal Drug Technology", code: "BP603T" },
      { name: "Biopharmaceutics & Pharmacokinetics", code: "BP604T" },
      { name: "Pharmaceutical Biotechnology", code: "BP605T" },
      { name: "Quality Assurance", code: "BP606T" },
    ],
  },
  {
    year: 4,
    semester: 7,
    items: [
      { name: "Instrumental Methods of Analysis", code: "BP701T" },
      { name: "Industrial Pharmacy II", code: "BP702T" },
      { name: "Pharmacy Practice", code: "BP703T" },
      { name: "Novel Drug Delivery Systems", code: "BP704T" },
    ],
  },
  {
    year: 4,
    semester: 8,
    items: [
      { name: "Biostatistics & Research Methodology", code: "BP801T" },
      { name: "Social & Preventive Pharmacy", code: "BP802T" },
      { name: "Pharma Marketing Management", code: "BP803ET" },
      { name: "Project & Viva Preparation", code: "BP804PW" },
    ],
  },
];

export function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function seedSubjects(): Subject[] {
  const list: Subject[] = [];
  for (const group of SUBJECTS_CONFIG) {
    for (const item of group.items) {
      list.push({
        id: slugify(item.name),
        name: item.name,
        code: item.code,
        year: group.year,
        semester: group.semester,
        description: `Official PCI curriculum study modules and exam answers for ${item.name} (${item.code}).`,
        status: "active",
      });
    }
  }
  return list;
}

const AUTHORS = [
  "Dr. S. K. Mukherjee, M.Pharm, Ph.D",
  "Prof. Ananya Sen, Dept of Pharmaceutics",
  "Dr. R. K. Verma, Dept of Pharmacology",
  "Dr. P. Sharma, Medicinal Chemistry Faculty",
  "Academic Rankers Panel, PharmaStudents",
];

const SAMPLE_PAGES_MAP = (subjectName: string, title: string): string[] => [
  `# ${title}\n\n## Section 1: Overview & PCI Syllabus Alignment\n\n**Subject:** ${subjectName}\n**Curriculum Standard:** Pharmacy Council of India (PCI) Unified Regulations\n\n### 1.1 Course Objectives\n- Comprehensive mastery of foundational and advanced principles in ${subjectName}.\n- High-scoring university format presentation: 10-mark long essays, 5-mark short answers, and 2-mark definitions.\n- Clinical correlations and industrial pharmaceutical applications.\n\n### 1.2 Core Classifications & Concepts\nPharmaceutical compounds and therapeutic mechanisms must be approached systematically through:\n1. Chemical structure & IUPAC nomenclature\n2. Mechanism of action (receptor / enzyme kinetics)\n3. Pharmacokinetics (ADME pathways)\n4. Adverse drug reactions and contraindications\n5. University recurring question trends`,

  `## Section 2: In-Depth Mechanisms & Formulations\n\n### 2.1 Theoretical Framework\nUnderstanding drug-receptor binding interactions requires evaluating ionic, hydrogen bonding, and Van der Waals forces. In pharmaceutical formulation, solubility enhancement techniques include:\n- Solid dispersions and complexation (Cyclodextrins)\n- Co-solvency and surfactant micellar solubilization\n- Particle size reduction via micronization and nano-suspensions\n\n> **Exam Tip (Repeated 10-Marker):** Always draw clear chemical structures and reaction flowcharts. University evaluators award 40% of marks based on neat diagrams and structural accuracy.`,

  `## Section 3: High-Frequency University Questions & Answer Hints\n\n### Q1. Discuss the classification, SAR, and clinical applications of key agents (10 Marks)\n**Answer Structure:**\n1. Definition and therapeutic goal\n2. Structural Activity Relationship (SAR) schematic diagram\n3. Individual drug profiles with generic & proprietary brand examples\n4. Storage conditions and regulatory compliance\n\n### Q2. Write short notes on stability testing per ICH guidelines (5 Marks)\n**Answer Structure:**\n- ICH Q1A to Q1F temperature/humidity chambers (25°C/60% RH long term, 40°C/75% RH accelerated).\n- Testing intervals: 0, 3, 6, 9, 12, 18, 24 months.`,

  `## Section 4: Rapid Recap & Viva Reference Guide\n\n### Summary Table\n| Parameter | Standard Criteria | Rapid Revision Note |\n| :--- | :--- | :--- |\n| Disintegration Time | Compressed Tablets: <15 min | Effervescent: <5 min |\n| Bioavailability (F) | Intravenous: 100% (F=1) | Oral: Variable due to first-pass |\n| Receptor Subtypes | Agonist vs Antagonist | Kd, EC50 and Affinity Constants |\n\n*Document strictly protected under PharmaStudents.com Digital Educational Licensing.*`,
];

export function seedMaterials(subjects: Subject[]): Material[] {
  const materials: Material[] = [];
  const prices = [199, 249, 179, 299, 149];

  subjects.forEach((subject, index) => {
    const price = prices[index % prices.length]!;
    const author = AUTHORS[index % AUTHORS.length]!;

    // 1. Complete Notes (Premium)
    materials.push({
      id: `${subject.id}-notes`,
      title: `${subject.name} — Complete Semester Notes`,
      description: `Complete syllabus-aligned master notes for ${subject.name} (${subject.code || ""}), formatted for university examinations and rapid scoring.`,
      year: subject.year,
      semester: subject.semester,
      subjectId: subject.id,
      type: "PDF Notes",
      price,
      isPremium: true,
      author,
      pages: 84 + (index % 5) * 12,
      comboEligible: true,
      sourceType: "upload",
      fileName: `${subject.id}-complete-notes.pdf`,
      fileSize: "8.4 MB",
      topics: ["Unit 1-5 Complete Coverage", "Chemical Reactions & SAR", "Diagrams & Mechanisms", "Repeated 10-Mark Answers"],
      published: true,
      status: "Published",
      order: 1,
      demo: true,
      sampleContent: SAMPLE_PAGES_MAP(subject.name, `${subject.name} — Complete Notes`),
      createdAt: new Date(2026, 0, 10 + (index % 20)).toISOString(),
    });

    // 2. Free Revision Notes (Free)
    materials.push({
      id: `${subject.id}-revision`,
      title: `${subject.name} — Rapid Revision Guide`,
      description: `Free one-look revision sheet covering key definitions, reaction summaries, and repeated exam questions for ${subject.name}.`,
      year: subject.year,
      semester: subject.semester,
      subjectId: subject.id,
      type: "Revision Notes",
      price: 0,
      isPremium: false,
      author,
      pages: 18 + (index % 3) * 4,
      comboEligible: false,
      sourceType: "upload",
      fileName: `${subject.id}-revision-sheet.pdf`,
      fileSize: "2.1 MB",
      topics: ["Formula & Definition recap", "Most repeated questions", "Last-night rapid flowchart"],
      published: true,
      status: "Published",
      order: 2,
      demo: true,
      sampleContent: SAMPLE_PAGES_MAP(subject.name, `${subject.name} — Rapid Revision Guide`),
      createdAt: new Date(2026, 0, 11 + (index % 20)).toISOString(),
    });

    // 3. Question Bank (Every other subject)
    if (index % 2 === 0) {
      materials.push({
        id: `${subject.id}-questions`,
        title: `${subject.name} — University Question Bank & Hints`,
        description: `Solved previous 5-year university questions and 10-mark answer models for ${subject.name}.`,
        year: subject.year,
        semester: subject.semester,
        subjectId: subject.id,
        type: "Important Questions",
        price: 149,
        isPremium: true,
        author,
        pages: 42 + (index % 4) * 8,
        comboEligible: true,
        sourceType: "upload",
        fileName: `${subject.id}-question-bank.pdf`,
        fileSize: "4.7 MB",
        topics: ["Solved 10-markers", "Solved 5-markers", "Answer blueprints & diagrams"],
        published: true,
        status: "Published",
        order: 3,
        demo: true,
        sampleContent: SAMPLE_PAGES_MAP(subject.name, `${subject.name} — Solved Question Bank`),
        createdAt: new Date(2026, 0, 12 + (index % 20)).toISOString(),
      });
    }
  });

  return materials;
}

export function seedPackages(subjects: Subject[], materials: Material[]): Package[] {
  const packages: Package[] = [
    {
      id: "pkg-sem-1",
      name: "Semester 1 Complete Mastery Package",
      type: "semester",
      year: 1,
      semester: 1,
      subjectIds: subjects.filter((s) => s.semester === 1).map((s) => s.id),
      materialIds: materials.filter((m) => m.semester === 1 && m.isPremium).map((m) => m.id),
      originalPrice: 1499,
      offerPrice: 999,
      savingsPercent: 33,
      description: "All 4 core subjects of B.Pharm 1st Semester including complete notes and question banks.",
      badge: "Best Seller",
    },
    {
      id: "pkg-sem-3",
      name: "Semester 3 Complete Package",
      type: "semester",
      year: 2,
      semester: 3,
      subjectIds: subjects.filter((s) => s.semester === 3).map((s) => s.id),
      materialIds: materials.filter((m) => m.semester === 3 && m.isPremium).map((m) => m.id),
      originalPrice: 1599,
      offerPrice: 999,
      savingsPercent: 37,
      description: "Complete notes for POC-II, Physical Pharmaceutics, Microbiology, and Pharmaceutical Engineering.",
      badge: "Popular",
    },
    {
      id: "pkg-sem-5",
      name: "Semester 5 Complete Package",
      type: "semester",
      year: 3,
      semester: 5,
      subjectIds: subjects.filter((s) => s.semester === 5).map((s) => s.id),
      materialIds: materials.filter((m) => m.semester === 5 && m.isPremium).map((m) => m.id),
      originalPrice: 1799,
      offerPrice: 1099,
      savingsPercent: 39,
      description: "Medicinal Chemistry II, Pharmacology II, Industrial Pharmacy I, and Jurisprudence bundle.",
      badge: "High Yield",
    },
    {
      id: "pkg-year-1",
      name: "1st Year Full Annual Bundle (Sem 1 & 2)",
      type: "year",
      year: 1,
      subjectIds: subjects.filter((s) => s.year === 1).map((s) => s.id),
      materialIds: materials.filter((m) => m.year === 1 && m.isPremium).map((m) => m.id),
      originalPrice: 3499,
      offerPrice: 2499,
      savingsPercent: 29,
      description: "Complete academic package for B.Pharm 1st Year covering both Semester 1 and Semester 2.",
      badge: "Annual Value",
    },
    {
      id: "pkg-year-2",
      name: "2nd Year Full Annual Bundle (Sem 3 & 4)",
      type: "year",
      year: 2,
      subjectIds: subjects.filter((s) => s.year === 2).map((s) => s.id),
      materialIds: materials.filter((m) => m.year === 2 && m.isPremium).map((m) => m.id),
      originalPrice: 3899,
      offerPrice: 2499,
      savingsPercent: 36,
      description: "All Semester 3 & 4 subjects: Organic Chemistry, Medicinal Chemistry, Pharmacology, and Microbiology.",
      badge: "Top Choice",
    },
    {
      id: "pkg-year-3",
      name: "3rd Year Full Annual Bundle (Sem 5 & 6)",
      type: "year",
      year: 3,
      subjectIds: subjects.filter((s) => s.year === 3).map((s) => s.id),
      materialIds: materials.filter((m) => m.year === 3 && m.isPremium).map((m) => m.id),
      originalPrice: 3999,
      offerPrice: 2499,
      savingsPercent: 38,
      description: "Complete high-yield preparation bundle for B.Pharm 3rd Year including GPAT-aligned summaries.",
      badge: "GPAT Focused",
    },
    {
      id: "pkg-year-4",
      name: "4th Year Final Year Package (Sem 7 & 8)",
      type: "year",
      year: 4,
      subjectIds: subjects.filter((s) => s.year === 4).map((s) => s.id),
      materialIds: materials.filter((m) => m.year === 4 && m.isPremium).map((m) => m.id),
      originalPrice: 3699,
      offerPrice: 2299,
      savingsPercent: 38,
      description: "Advanced instrumental analysis, NDDS, biostatistics, and viva preparation bundle.",
      badge: "Finalist Prep",
    },
  ];

  return packages;
}

export function seedStudents(): Student[] {
  return [
    {
      id: "student",
      name: "Ravi Kumar",
      email: "student@studentpharma.in",
      mobile: "9000000000",
      college: "Government College of Pharmacy, Hyderabad",
      year: 2,
      semester: 3,
      // demo password: demo1234
      passwordHash: "24879e68434224f3f2fb556a229c436b966c429b2dfcdf08a27130506c1b4486",
      lastLogin: new Date(2026, 2, 1, 14, 20).toISOString(),
      createdAt: new Date(2026, 0, 5).toISOString(),
    },
    {
      id: "student-2",
      name: "Pooja Sharma",
      email: "pooja.sharma@gmail.com",
      mobile: "9876543211",
      college: "Delhi Institute of Pharmaceutical Sciences & Research",
      year: 1,
      semester: 1,
      passwordHash: "24879e68434224f3f2fb556a229c436b966c429b2dfcdf08a27130506c1b4486",
      lastLogin: new Date(2026, 2, 2, 10, 15).toISOString(),
      createdAt: new Date(2026, 0, 15).toISOString(),
    },
    {
      id: "student-3",
      name: "Mohammed Faizan",
      email: "faizan.pharma@outlook.com",
      mobile: "9845123456",
      college: "Al-Ameen College of Pharmacy, Bangalore",
      year: 3,
      semester: 5,
      passwordHash: "24879e68434224f3f2fb556a229c436b966c429b2dfcdf08a27130506c1b4486",
      lastLogin: new Date(2026, 2, 3, 9, 30).toISOString(),
      createdAt: new Date(2026, 0, 22).toISOString(),
    },
    {
      id: "student-4",
      name: "Sneha Patil",
      email: "sneha.p@gmail.com",
      mobile: "9765432109",
      college: "Bombay College of Pharmacy, Mumbai",
      year: 4,
      semester: 7,
      passwordHash: "24879e68434224f3f2fb556a229c436b966c429b2dfcdf08a27130506c1b4486",
      lastLogin: new Date(2026, 2, 3, 16, 45).toISOString(),
      createdAt: new Date(2026, 1, 2).toISOString(),
    },
    {
      id: "student-5",
      name: "Aditya Verma",
      email: "aditya.v@gmail.com",
      mobile: "9123456780",
      college: "JSS College of Pharmacy, Ooty",
      year: 2,
      semester: 4,
      passwordHash: "24879e68434224f3f2fb556a229c436b966c429b2dfcdf08a27130506c1b4486",
      lastLogin: new Date(2026, 2, 1, 11, 0).toISOString(),
      createdAt: new Date(2026, 1, 10).toISOString(),
    },
  ];
}

export function seedOrders(): Order[] {
  return [
    {
      id: "ORD-2026-1001",
      studentId: "student",
      studentName: "Ravi Kumar",
      studentEmail: "student@studentpharma.in",
      productId: "human-anatomy-and-physiology-ii-notes",
      productType: "material",
      productTitle: "Human Anatomy & Physiology II — Complete Semester Notes",
      materialIds: ["human-anatomy-and-physiology-ii-notes"],
      amount: 199,
      discount: 0,
      finalAmount: 199,
      gateway: "razorpay",
      status: "Paid",
      transactionId: "pay_N98KLa01ZxcB7",
      orderDate: new Date(2026, 1, 15, 14, 20).toISOString(),
      paymentDate: new Date(2026, 1, 15, 14, 21).toISOString(),
      termsAccepted: true,
      termsAcceptedAt: new Date(2026, 1, 15, 14, 19).toISOString(),
      termsVersion: "2026-v1.0",
    },
    {
      id: "ORD-2026-1002",
      studentId: "student",
      studentName: "Ravi Kumar",
      studentEmail: "student@studentpharma.in",
      productId: "pkg-sem-3",
      productType: "semester",
      productTitle: "Semester 3 Complete Package",
      materialIds: [
        "pharmaceutical-organic-chemistry-ii-notes",
        "physical-pharmaceutics-i-notes",
        "pharmaceutical-microbiology-notes",
        "pharmaceutical-engineering-notes",
      ],
      amount: 1599,
      discount: 600,
      finalAmount: 999,
      gateway: "razorpay",
      status: "Paid",
      transactionId: "pay_Q82LK91KdsM9",
      orderDate: new Date(2026, 1, 20, 11, 5).toISOString(),
      paymentDate: new Date(2026, 1, 20, 11, 6).toISOString(),
      termsAccepted: true,
      termsAcceptedAt: new Date(2026, 1, 20, 11, 4).toISOString(),
      termsVersion: "2026-v1.0",
    },
    {
      id: "ORD-2026-1003",
      studentId: "student-2",
      studentName: "Pooja Sharma",
      studentEmail: "pooja.sharma@gmail.com",
      productId: "pkg-sem-1",
      productType: "semester",
      productTitle: "Semester 1 Complete Mastery Package",
      materialIds: [
        "human-anatomy-and-physiology-i-notes",
        "pharmaceutical-analysis-i-notes",
        "pharmaceutics-i-notes",
        "pharmaceutical-inorganic-chemistry-notes",
      ],
      amount: 1499,
      discount: 500,
      finalAmount: 999,
      gateway: "razorpay",
      status: "Paid",
      transactionId: "pay_K71MN81PaQs2",
      orderDate: new Date(2026, 1, 25, 16, 40).toISOString(),
      paymentDate: new Date(2026, 1, 25, 16, 41).toISOString(),
      termsAccepted: true,
      termsAcceptedAt: new Date(2026, 1, 25, 16, 39).toISOString(),
      termsVersion: "2026-v1.0",
    },
    {
      id: "ORD-2026-1004",
      studentId: "student-3",
      studentName: "Mohammed Faizan",
      studentEmail: "faizan.pharma@outlook.com",
      productId: "pkg-year-3",
      productType: "year",
      productTitle: "3rd Year Full Annual Bundle (Sem 5 & 6)",
      materialIds: [
        "medicinal-chemistry-ii-notes",
        "pharmacology-ii-notes",
        "industrial-pharmacy-i-notes",
        "pharmaceutical-jurisprudence-notes",
      ],
      amount: 3999,
      discount: 1500,
      finalAmount: 2499,
      gateway: "razorpay",
      status: "Paid",
      transactionId: "pay_X91PL29SfaW1",
      orderDate: new Date(2026, 2, 1, 9, 10).toISOString(),
      paymentDate: new Date(2026, 2, 1, 9, 11).toISOString(),
      termsAccepted: true,
      termsAcceptedAt: new Date(2026, 2, 1, 9, 9).toISOString(),
      termsVersion: "2026-v1.0",
    },
    {
      id: "ORD-2026-1005",
      studentId: "student-4",
      studentName: "Sneha Patil",
      studentEmail: "sneha.p@gmail.com",
      productId: "novel-drug-delivery-systems-notes",
      productType: "material",
      productTitle: "Novel Drug Delivery Systems — Complete Semester Notes",
      materialIds: ["novel-drug-delivery-systems-notes"],
      amount: 299,
      discount: 0,
      finalAmount: 299,
      gateway: "razorpay",
      status: "Pending",
      transactionId: "pay_pending_01",
      orderDate: new Date(2026, 2, 2, 18, 30).toISOString(),
      termsAccepted: true,
      termsAcceptedAt: new Date(2026, 2, 2, 18, 29).toISOString(),
      termsVersion: "2026-v1.0",
    },
    {
      id: "ORD-2026-1006",
      studentId: "student-5",
      studentName: "Aditya Verma",
      studentEmail: "aditya.v@gmail.com",
      productId: "medicinal-chemistry-i-notes",
      productType: "material",
      productTitle: "Medicinal Chemistry I — Complete Semester Notes",
      materialIds: ["medicinal-chemistry-i-notes"],
      amount: 249,
      discount: 0,
      finalAmount: 249,
      gateway: "razorpay",
      status: "Refunded",
      transactionId: "pay_ref_88291",
      orderDate: new Date(2026, 1, 28, 12, 15).toISOString(),
      paymentDate: new Date(2026, 1, 28, 12, 16).toISOString(),
      termsAccepted: true,
      termsAcceptedAt: new Date(2026, 1, 28, 12, 14).toISOString(),
      termsVersion: "2026-v1.0",
    },
  ];
}

export function createSeedDB(): DB {
  const subjects = seedSubjects();
  const materials = seedMaterials(subjects);
  const packages = seedPackages(subjects, materials);
  const students = seedStudents();
  const orders = seedOrders();

  // Initial purchases matching paid orders for demo student
  const purchases = [
    {
      id: "pur-1",
      studentId: "student",
      materialId: "human-anatomy-and-physiology-ii-notes",
      amount: 199,
      status: "unlocked" as const,
      createdAt: new Date(2026, 1, 15).toISOString(),
    },
    {
      id: "pur-2",
      studentId: "student",
      materialId: "pharmaceutical-organic-chemistry-ii-notes",
      amount: 249,
      status: "unlocked" as const,
      createdAt: new Date(2026, 1, 20).toISOString(),
    },
    {
      id: "pur-3",
      studentId: "student",
      materialId: "physical-pharmaceutics-i-notes",
      amount: 249,
      status: "unlocked" as const,
      createdAt: new Date(2026, 1, 20).toISOString(),
    },
  ];

  return {
    version: 2,
    subjects,
    materials,
    students,
    admin: {
      id: "admin",
      userId: "siddu",
      name: "Siddu",
      email: "siddu@gmail.com",
      phone: "7801064412",
      // initial demo administrator credentials: Siddu@2026 / @2026 (hashed)
      passwordHash: "89c7ee9fe1da615168cec7d6837c6d38cc0f2e0bf1d23945b4c16d0340bdc7e0",
    },
    purchases,
    orders,
    packages,
    favorites: [
      { studentId: "student", materialId: "human-anatomy-and-physiology-ii-notes" },
      { studentId: "student", materialId: "pharmaceutical-organic-chemistry-ii-notes" },
    ],
    recent: [
      {
        studentId: "student",
        materialId: "human-anatomy-and-physiology-ii-notes",
        at: new Date(2026, 2, 2).toISOString(),
      },
    ],
    drive: {
      connected: true,
      rootFolderId: "1PS_PharmaVault_BPharm_2026",
      rootFolderName: "PharmaStudents Official Cloud Vault",
      clientIdConfigured: true,
      note: "Primary storage repository for verified PCI B.Pharm digital notes.",
    },
    paymentGateway: {
      gateway: "razorpay",
      keyId: "rzp_test_pharma_2026_demo",
      secretKeyConfigured: true,
      webhookConfigured: true,
      currency: "INR",
      mode: "test",
      status: "active",
    },
    websiteSettings: {
      siteName: "PharmaStudents.com",
      tagline: "Your B.Pharm Journey, Organized.",
      supportEmail: "support@pharmastudents.com",
      supportPhone: "+91 78010 64412",
      currencySymbol: "₹",
      announcement: "New PCI 2026 Semester notes and formula cheat-sheets are now live!",
      allowRegistrations: true,
    },
    accessLogs: [
      {
        id: "log-1",
        studentId: "student",
        studentEmail: "student@studentpharma.in",
        materialId: "human-anatomy-and-physiology-ii-notes",
        materialTitle: "Human Anatomy & Physiology II — Complete Semester Notes",
        accessedAt: new Date(2026, 2, 2, 15, 30).toISOString(),
      },
    ],
  };
}
