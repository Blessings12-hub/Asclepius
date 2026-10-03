// Starter data. Everything here is editable inside the app.
import crypto from "crypto";

// STARTER CURRICULUM, 5 years (MBChB length). This is a TYPICAL medical-school layout built from general
// knowledge. It is NOT the official outline of any university. Replace it with your own school's outline
// (Course outline > Import from your handbook), then edit freely.
const T = (title, topics) => ({ title, topics });
export const STARTER = {
  1: [
    T("Anatomy", ["Upper limb", "Lower limb", "Thorax", "Abdomen and pelvis", "Head and neck", "Neuroanatomy"]),
    T("Physiology", ["Cell and membrane physiology", "Cardiovascular", "Respiratory", "Renal and fluids", "Gastrointestinal", "Endocrine", "Nervous system"]),
    T("Biochemistry", ["Amino acids and proteins", "Enzymes", "Carbohydrate metabolism", "Lipid metabolism", "Molecular biology and genetics"]),
    T("Histology & Embryology", ["Basic tissues", "Organ system histology", "General embryology", "Systemic embryology"]),
    T("Introduction to Clinical Medicine", ["Communication skills", "Medical ethics", "History taking", "Basic life support"]),
  ],
  2: [
    T("Pathology", ["Cell injury and inflammation", "Neoplasia", "Haematology", "Cardiovascular pathology", "Respiratory pathology", "GI and liver pathology", "Renal pathology"]),
    T("Pharmacology", ["General principles", "Autonomic drugs", "Cardiovascular drugs", "Antimicrobials", "CNS drugs", "Endocrine drugs"]),
    T("Microbiology & Parasitology", ["Bacteriology", "Virology", "Mycology", "Parasitology (malaria, helminths)", "Infection control"]),
    T("Immunology", ["Innate and adaptive immunity", "Hypersensitivity", "Autoimmunity", "Immunodeficiency and HIV"]),
    T("Community Health & Epidemiology", ["Epidemiology basics", "Biostatistics", "Primary health care", "Health systems"]),
  ],
  3: [
    T("Internal Medicine", ["Cardiology", "Respiratory medicine", "Gastroenterology", "Nephrology", "Endocrinology", "Infectious diseases", "Haematology"]),
    T("General Surgery", ["Principles of surgery", "Acute abdomen", "Trauma", "Breast and endocrine surgery", "Urology"]),
    T("Clinical Skills", ["Examination of systems", "Procedures", "Interpreting investigations"]),
    T("Behavioural Science", ["Psychology basics", "Sociology and health", "Medical ethics and law"]),
  ],
  4: [
    T("Obstetrics & Gynaecology", ["Antenatal care", "Labour and delivery", "Obstetric emergencies", "Gynaecology", "Family planning"]),
    T("Paediatrics", ["Growth and development", "Neonatology", "Childhood infections and immunisation", "Nutrition", "Paediatric emergencies"]),
    T("Psychiatry", ["Mood disorders", "Psychotic disorders", "Anxiety and substance use", "Psychopharmacology"]),
    T("Neurology", ["Stroke", "Epilepsy", "Neuromuscular disease", "Headache"]),
  ],
  5: [
    T("Emergency Medicine", ["Resuscitation", "Shock", "Poisoning", "Trauma care"]),
    T("Orthopaedics", ["Fractures", "Joint disease", "Paediatric orthopaedics"]),
    T("Ophthalmology & ENT", ["Common eye conditions", "Ear, nose and throat conditions"]),
    T("Family Medicine & Public Health", ["Chronic disease care", "Preventive medicine", "Health programmes"]),
    T("Forensic Medicine", ["Medico-legal practice", "Death and certification"]),
    T("Dermatology & Radiology", ["Common skin diseases", "Imaging basics"]),
  ],
};

// Deterministic ids, so seeding twice (or on two servers at once) can never create duplicates.
const cid = (y, t) => crypto.createHash("sha1").update(y + ":" + t).digest("hex").slice(0, 12);
export const courseId = cid;
export const seedCourses = () =>
  Object.entries(STARTER).flatMap(([y, l]) => l.map((c) => ({ id: cid(y, c.title), year: +y, title: c.title, topics: c.topics })));

// Study-reference starter rows. Written from general textbook knowledge, NOT a verified formulary.
// No doses on purpose. Check against your own textbook / lab / national guidelines, then edit freely.
const D = (name, cls, use, adverse, notes) => ({ name, cls, use, adverse, notes });
const L = (test, range, notes = "") => ({ test, range, notes });

export const seedRefs = () => {
  const withIds = (a) => a.map((r) => ({ id: crypto.randomBytes(6).toString("hex"), ...r }));
  return {
    drugs: withIds([
      D("Metformin", "Biguanide", "Lowers hepatic glucose output, improves insulin sensitivity. First-line type 2 diabetes.", "GI upset, B12 deficiency (long term), lactic acidosis (rare)", "Avoid in severe renal impairment; hold during acute illness and around iodinated contrast."),
      D("Lisinopril", "ACE inhibitor", "Blocks angiotensin II formation. Hypertension, heart failure, diabetic kidney disease.", "Dry cough, hyperkalaemia, angioedema, first-dose hypotension", "Contraindicated in pregnancy. Check creatinine and potassium."),
      D("Losartan", "ARB (AT1 blocker)", "Blocks angiotensin II at the AT1 receptor. Alternative when ACE inhibitor cough occurs.", "Hyperkalaemia, hypotension, dizziness", "Contraindicated in pregnancy. Do not combine casually with ACE inhibitors."),
      D("Amlodipine", "Dihydropyridine calcium channel blocker", "Vasodilation via L-type Ca channel block. Hypertension, angina.", "Ankle oedema, flushing, headache", "Oedema is not helped by diuretics as much as expected (it is vasodilatory)."),
      D("Atenolol", "Beta-1 selective blocker", "Lowers heart rate, contractility, renin. Hypertension, angina, post-MI, AF rate control.", "Bradycardia, fatigue, cold extremities, bronchospasm, can mask hypoglycaemia", "Do not stop abruptly. Caution in asthma/COPD and heart block."),
      D("Furosemide", "Loop diuretic", "Blocks Na-K-2Cl cotransporter in the thick ascending limb. Oedema, heart failure.", "Hypokalaemia, hyponatraemia, dehydration, ototoxicity, hyperuricaemia", "Monitor electrolytes and renal function."),
      D("Hydrochlorothiazide", "Thiazide diuretic", "Blocks Na-Cl cotransporter in the distal tubule. Hypertension.", "Hypokalaemia, hyponatraemia, hypercalcaemia, hyperglycaemia, hyperuricaemia (gout)", "Thiazides reduce urinary calcium loss."),
      D("Spironolactone", "Aldosterone antagonist (K-sparing)", "Blocks aldosterone receptor. Heart failure, ascites, hyperaldosteronism.", "Hyperkalaemia, gynaecomastia", "Watch potassium, especially with ACE inhibitors / ARBs."),
      D("Atorvastatin", "Statin (HMG-CoA reductase inhibitor)", "Lowers LDL cholesterol; cardiovascular prevention.", "Myalgia, myopathy/rhabdomyolysis (rare), raised liver enzymes", "Avoid in pregnancy. Interacts with some macrolides and azole antifungals (CYP3A4)."),
      D("Aspirin (low dose)", "Antiplatelet (COX inhibitor)", "Irreversibly blocks platelet thromboxane A2 production.", "GI irritation/bleeding, bronchospasm in sensitive asthmatics, tinnitus at high doses", "Avoid in children with viral illness (Reye syndrome)."),
      D("Warfarin", "Vitamin K antagonist", "Blocks vitamin K epoxide reductase, lowering factors II, VII, IX, X (and protein C/S).", "Bleeding, teratogenic, skin necrosis at start", "Monitor INR. Many drug and food interactions. Reversal: vitamin K, prothrombin complex concentrate."),
      D("Amoxicillin", "Aminopenicillin (beta-lactam)", "Blocks bacterial cell wall synthesis (penicillin-binding proteins).", "Diarrhoea, rash, hypersensitivity/anaphylaxis", "Check penicillin allergy. Rash is common if given during infectious mononucleosis."),
      D("Gentamicin", "Aminoglycoside", "Binds 30S ribosome; bactericidal against many Gram-negatives.", "Nephrotoxicity, ototoxicity, neuromuscular blockade", "Narrow safety margin: monitor levels and renal function; avoid with other nephrotoxins."),
      D("Ciprofloxacin", "Fluoroquinolone", "Inhibits DNA gyrase / topoisomerase IV.", "Tendinopathy/rupture, QT prolongation, CNS effects, C. difficile", "Absorption reduced by calcium, iron, magnesium, aluminium. Generally avoided in children."),
      D("Rifampicin", "Antimycobacterial (RNA polymerase inhibitor)", "Tuberculosis, leprosy; part of standard TB regimens.", "Orange body fluids, hepatotoxicity, flu-like syndrome", "Strong enzyme inducer: lowers levels of many drugs (hormonal contraception, warfarin, some antiretrovirals)."),
      D("Isoniazid", "Antimycobacterial", "Inhibits mycolic acid synthesis. Tuberculosis.", "Peripheral neuropathy, hepatotoxicity, drug-induced lupus", "Give pyridoxine (B6) to prevent neuropathy. Acetylator status varies."),
      D("Artemether-lumefantrine", "Artemisinin combination therapy", "Treatment of uncomplicated P. falciparum malaria.", "Headache, dizziness, nausea, QT prolongation", "Take with fatty food for lumefantrine absorption. Follow your national malaria guideline."),
      D("Omeprazole", "Proton pump inhibitor", "Irreversibly blocks gastric H+/K+ ATPase. Reflux, peptic ulcer.", "Headache, hypomagnesaemia, C. difficile risk, reduced B12/iron absorption long term", "Reassess long-term use."),
      D("Salbutamol", "Short-acting beta-2 agonist", "Bronchodilator for asthma/COPD relief.", "Tremor, tachycardia, hypokalaemia", "Overuse signals poorly controlled asthma."),
      D("Prednisolone", "Glucocorticoid", "Anti-inflammatory and immunosuppressive.", "Hyperglycaemia, osteoporosis, adrenal suppression, mood change, infection risk, peptic ulcer", "Do not stop abruptly after prolonged use."),
      D("Paracetamol", "Analgesic / antipyretic", "Pain and fever.", "Hepatotoxicity in overdose", "Overdose antidote: N-acetylcysteine. Respect maximum daily limits."),
      D("Ibuprofen", "NSAID (non-selective COX inhibitor)", "Pain, inflammation, fever.", "GI ulcer/bleeding, acute kidney injury, fluid retention, bronchospasm in sensitive asthmatics", "Avoid in late pregnancy. ACE inhibitor + diuretic + NSAID is a classic kidney-injury combination."),
      D("Morphine", "Opioid (mu agonist)", "Severe pain.", "Respiratory depression, constipation, nausea, sedation, dependence", "Naloxone reverses. Metabolites accumulate in renal impairment."),
      D("Digoxin", "Cardiac glycoside", "Inhibits Na+/K+ ATPase. AF rate control, heart failure.", "Nausea, visual disturbance (yellow-green), arrhythmias", "Narrow therapeutic index. Hypokalaemia increases toxicity."),
    ]),
    labs: withIds([
      L("Sodium", "135-145 mmol/L"),
      L("Potassium", "3.5-5.0 mmol/L", "Haemolysed samples read falsely high."),
      L("Chloride", "98-106 mmol/L"),
      L("Bicarbonate", "22-28 mmol/L"),
      L("Urea", "2.5-7.1 mmol/L (BUN about 7-20 mg/dL)"),
      L("Creatinine", "Male about 60-110, female about 45-90 umol/L (about 0.7-1.2 / 0.5-1.0 mg/dL)", "Depends on muscle mass, age and sex."),
      L("eGFR", ">=90 normal (G1); 60-89 (G2); 45-59 (G3a); 30-44 (G3b); 15-29 (G4); <15 (G5) mL/min/1.73m2", "Staging needs persistence over 3 months plus markers of damage for G1-G2."),
      L("Glucose, fasting", "3.9-5.5 mmol/L (70-99 mg/dL)", "Diabetes: fasting 7.0 mmol/L (126 mg/dL) or more, confirmed."),
      L("HbA1c", "Below 5.7% normal; 5.7-6.4% prediabetes; 6.5% (48 mmol/mol) or more diabetes", "These are the ADA cut-offs; some guidelines (e.g. UK, WHO) define prediabetes differently. Unreliable in anaemia and haemoglobinopathies."),
      L("Calcium (total)", "2.2-2.6 mmol/L (8.5-10.5 mg/dL)", "Correct for albumin."),
      L("Magnesium", "0.7-1.0 mmol/L"),
      L("Phosphate", "0.8-1.5 mmol/L"),
      L("Albumin", "35-50 g/L (3.5-5.0 g/dL)"),
      L("Bilirubin (total)", "About 3-17 umol/L (0.2-1.0 mg/dL)"),
      L("ALT", "Roughly up to 40 U/L", "Lab-dependent."),
      L("AST", "Roughly up to 40 U/L", "Lab-dependent."),
      L("ALP", "About 30-130 U/L", "Higher in children, pregnancy and bone growth."),
      L("Haemoglobin", "Male about 13.5-17.5 g/dL; female about 12.0-15.5 g/dL", "WHO anaemia cut-offs: below 13 (men), below 12 (non-pregnant women), below 11 (pregnancy)."),
      L("MCV", "80-100 fL", "Low: microcytic. High: macrocytic."),
      L("Haematocrit", "Male about 0.41-0.50; female about 0.36-0.46 L/L"),
      L("WBC", "4.0-11.0 x10^9/L"),
      L("Platelets", "150-400 x10^9/L"),
      L("Reticulocytes", "About 0.5-2.5%"),
      L("ESR", "Rule of thumb: men under age/2, women under (age+10)/2 mm/h", "Non-specific."),
      L("CRP", "Roughly under 5-10 mg/L", "Lab-dependent."),
      L("INR", "0.8-1.2 normal; on warfarin target is usually 2.0-3.0 (higher for some indications)"),
      L("aPTT", "Roughly 25-40 s", "Lab-dependent. Monitors unfractionated heparin."),
      L("Lactate", "0.5-2.0 mmol/L"),
      L("Troponin", "Assay-specific: compare with your lab's 99th percentile cut-off", "Interpret with the clinical picture and serial values."),
      L("Arterial blood gas", "pH 7.35-7.45; PaCO2 4.7-6.0 kPa (35-45 mmHg); PaO2 10-13 kPa (75-100 mmHg) on air; HCO3 22-26 mmol/L"),
      L("TSH", "About 0.4-4.0 mIU/L", "Lab-dependent."),
      L("Free T4", "About 10-22 pmol/L", "Assay-dependent."),
      L("Total cholesterol", "Desirable below 5.2 mmol/L (200 mg/dL)", "LDL targets depend on cardiovascular risk."),
      L("Triglycerides", "Below 1.7 mmol/L (150 mg/dL)", "Fasting sample."),
      L("Uric acid", "Male about 200-430, female about 140-360 umol/L"),
      L("Urine albumin:creatinine ratio", "Below 3 mg/mmol (below 30 mg/g)"),
      L("Ferritin", "About 30-400 ug/L (male), 15-150 ug/L (female)", "Acute-phase reactant: can be normal or high in inflammation despite iron deficiency."),
      L("CD4 count", "About 500-1500 cells/uL (adults)", "Follow your national HIV guidelines for treatment thresholds."),
    ]),
  };
};
