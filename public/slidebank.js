// Asclepius slide bank: search words for Wikimedia Commons, organised per course and per topic.
// Course and topic names match the Course outline. A topic you add yourself, or a course not listed here,
// still appears in the app and is searched by its own name. Edit freely.
// Format: SLIDEBANK[kind][course title][topic title] = "search one | search two | ..."
(function () {
const B = { micro: {}, macro: {}, ecg: {}, rad: {} };

/* ===================== MICROSCOPY: slides, smears, stains, electron micrographs ===================== */
B.micro = {
"Histology & Embryology": {
 "Basic tissues": "simple squamous epithelium histology | stratified squamous epithelium histology | transitional epithelium urothelium histology | loose connective tissue histology | dense regular connective tissue tendon histology | hyaline cartilage histology | elastic cartilage histology | compact bone ground section histology | adipose tissue histology | skeletal muscle histology | cardiac muscle histology | smooth muscle histology | peripheral nerve histology | motor neuron histology",
 "Organ system histology": "skin thick histology | esophagus histology | stomach fundus histology | small intestine villi histology | colon histology | liver lobule histology | pancreas histology | kidney cortex glomerulus histology | ureter and bladder histology | trachea histology | lung alveoli histology | artery and vein histology | spleen histology | lymph node histology | thymus histology | thyroid histology | adrenal gland histology | pituitary histology | testis seminiferous tubule histology | ovary follicles histology | uterus endometrium histology | cerebellum histology | spinal cord histology | retina histology | cochlea histology",
 "General embryology": "oocyte and zona pellucida micrograph | blastocyst micrograph | human embryo implantation histology | bilaminar germ disc histology | neural tube cross section histology | placenta villi histology | umbilical cord histology",
 "Systemic embryology": "developing heart embryo histology | embryonic gut tube histology | fetal lung development histology | developing kidney metanephros histology | developing eye histology | developing brain embryo histology | fetal gonad histology"
},
"Medical Biology & Genetics": {
 "Cell structure and function": "animal cell electron micrograph | mitochondria electron micrograph | rough endoplasmic reticulum electron micrograph | Golgi apparatus electron micrograph | nucleus electron micrograph | lysosome electron micrograph | plasma membrane electron micrograph",
 "Cell division and the cell cycle": "mitosis stages micrograph | prophase metaphase anaphase telophase micrograph | meiosis micrograph | onion root tip mitosis | apoptosis electron micrograph",
 "Molecular basis of heredity": "polytene chromosome micrograph | Barr body micrograph | DNA electron micrograph | chromosome banding G-banding",
 "Patterns of inheritance": "human karyotype G-banding | sickle cell blood smear micrograph | pedigree chart autosomal dominant",
 "Chromosomal and genetic disorders": "karyotype Down syndrome trisomy 21 | Turner syndrome karyotype | Klinefelter syndrome karyotype | Philadelphia chromosome | fluorescence in situ hybridization FISH micrograph",
 "Population genetics": "sickle cell trait blood smear micrograph | Hardy-Weinberg chart",
 "Medical parasitology basics": "Plasmodium falciparum blood smear | Trypanosoma blood smear | Giardia trophozoite micrograph | Entamoeba histolytica micrograph | Schistosoma egg micrograph | Ascaris egg micrograph",
 "Evolution and ecology": "mosquito Anopheles micrograph | bacterial colony micrograph"
},
"Neuroscience": {
 "Neuron and synapse": "neuron Golgi stain micrograph | synapse electron micrograph | myelinated axon electron micrograph | neuromuscular junction histology",
 "Sensory systems": "retina histology | cochlea organ of Corti histology | taste bud histology | Meissner corpuscle histology | Pacinian corpuscle histology | olfactory epithelium histology",
 "Motor systems": "spinal cord anterior horn histology | motor neuron Nissl stain | cerebellum Purkinje cells histology | skeletal muscle neuromuscular spindle histology",
 "Cranial nerves": "optic nerve histology | trigeminal ganglion histology | brainstem section histology | peripheral nerve cross section histology",
 "Higher functions": "cerebral cortex layers histology | hippocampus histology | Alzheimer disease histopathology plaques tangles | basal ganglia histology"
},
"Pathology": {
 "Cell injury and inflammation": "hydropic change histopathology | fatty change liver histopathology | coagulative necrosis histopathology | liquefactive necrosis histopathology | caseous necrosis histopathology | fat necrosis histopathology | apoptosis histopathology | acute inflammation neutrophils histopathology | chronic inflammation histopathology | granulation tissue histopathology | granuloma giant cell histopathology | amyloid Congo red histopathology",
 "Neoplasia": "adenocarcinoma histopathology | squamous cell carcinoma histopathology | basal cell carcinoma histopathology | lipoma histology | leiomyoma histopathology | fibroadenoma breast histopathology | invasive ductal carcinoma histopathology | papillary thyroid carcinoma histopathology | melanoma histopathology | lymphoma histopathology | Kaposi sarcoma histopathology | metastasis in lymph node histopathology | dysplasia histopathology | carcinoma in situ histopathology",
 "Haematology": "iron deficiency anaemia blood smear | sickle cell anaemia blood smear | megaloblastic anaemia blood smear | acute lymphoblastic leukaemia blood smear | acute myeloid leukaemia Auer rods | chronic myeloid leukaemia blood smear | chronic lymphocytic leukaemia smudge cells | Hodgkin lymphoma Reed-Sternberg cell | multiple myeloma plasma cells bone marrow | bone marrow biopsy histology",
 "Cardiovascular pathology": "atherosclerosis plaque histopathology | myocardial infarction histopathology | thrombus histopathology | rheumatic heart disease Aschoff body | infective endocarditis vegetation histopathology | myocarditis histopathology | hypertensive arteriolosclerosis histopathology | giant cell arteritis histopathology",
 "Respiratory pathology": "lobar pneumonia histopathology | bronchopneumonia histopathology | pulmonary tuberculosis histopathology | emphysema histopathology | chronic bronchitis histopathology | asthma histopathology | pulmonary oedema histopathology | lung squamous cell carcinoma histopathology | small cell lung carcinoma histopathology | silicosis histopathology | pulmonary embolism histopathology",
 "GI and liver pathology": "chronic gastritis Helicobacter histopathology | peptic ulcer histopathology | Crohn disease histopathology | ulcerative colitis histopathology | colon adenomatous polyp histopathology | colorectal adenocarcinoma histopathology | acute hepatitis histopathology | liver cirrhosis histopathology | hepatocellular carcinoma histopathology | alcoholic hepatitis Mallory bodies | pancreatitis histopathology | gallbladder cholecystitis histopathology",
 "Renal pathology": "acute tubular necrosis histopathology | membranous glomerulonephritis histopathology | post-streptococcal glomerulonephritis histopathology | IgA nephropathy histopathology | diabetic nephropathy Kimmelstiel-Wilson | pyelonephritis histopathology | renal cell carcinoma histopathology | polycystic kidney histopathology | amyloidosis kidney histopathology"
},
"Pathological Anatomy": {
 "Methods: autopsy, biopsy and cytology": "H&E stain tissue section micrograph | fine needle aspiration cytology micrograph | Pap smear cytology | frozen section histology | immunohistochemistry micrograph | special stains PAS Masson trichrome micrograph | Ziehl-Neelsen stain micrograph",
 "Cell injury, necrosis and apoptosis": "cell swelling histopathology | fatty liver steatosis histopathology | coagulative necrosis kidney infarct histopathology | caseous necrosis tuberculosis histopathology | apoptotic bodies histopathology | gangrene histopathology | lipofuscin histopathology | hemosiderin Prussian blue histopathology | dystrophic calcification histopathology",
 "Disorders of circulation: thrombosis, embolism, infarction": "chronic passive congestion liver nutmeg histopathology | lung congestion heart failure cells | thrombus lines of Zahn | pulmonary embolism histopathology | fat embolism histopathology | amniotic fluid embolism histopathology | splenic infarct histopathology | cerebral infarct histopathology | haemorrhage histopathology",
 "Inflammation and repair": "acute appendicitis histopathology | fibrinous pericarditis histopathology | abscess histopathology | granulation tissue histopathology | foreign body giant cell histopathology | keloid histopathology | wound healing histopathology | chronic osteomyelitis histopathology",
 "Immunopathology": "amyloidosis Congo red apple-green birefringence | lupus nephritis histopathology | Hashimoto thyroiditis histopathology | rheumatoid nodule histopathology | graft rejection histopathology | vasculitis histopathology | immunofluorescence kidney biopsy",
 "Tumours: classification and spread": "benign tumour histopathology | malignant tumour histopathology | metastasis liver histopathology | lymph node metastasis histopathology | squamous cell carcinoma keratin pearls | adenocarcinoma glands histopathology | osteosarcoma histopathology | glioblastoma histopathology | neuroblastoma histopathology | Wilms tumour histopathology | teratoma histopathology | mitotic figures atypical histopathology",
 "Atherosclerosis and heart disease": "atheroma foam cells histopathology | fibrous cap atherosclerotic plaque | myocardial infarction 1 day histopathology | myocardial infarction healing granulation tissue | cardiac hypertrophy histopathology | dilated cardiomyopathy histopathology | rheumatic myocarditis Aschoff | aortic aneurysm cystic medial degeneration",
 "Lung and respiratory pathology": "lobar pneumonia red hepatization histopathology | bronchopneumonia histopathology | tuberculosis caseating granuloma lung | emphysema histopathology | bronchiectasis histopathology | pneumoconiosis asbestos bodies | lung adenocarcinoma histopathology | mesothelioma histopathology | hyaline membrane disease histopathology | pneumocystis pneumonia histopathology",
 "Gastrointestinal and liver pathology": "Barrett oesophagus histopathology | gastric adenocarcinoma signet ring cells | duodenal ulcer histopathology | coeliac disease villous atrophy histopathology | typhoid ulcer Peyer patches histopathology | amoebic colitis histopathology | viral hepatitis ground glass hepatocytes | cirrhosis regenerative nodules histopathology | hepatocellular carcinoma histopathology | cholangiocarcinoma histopathology",
 "Kidney and urinary tract pathology": "acute glomerulonephritis histopathology | minimal change disease electron micrograph | focal segmental glomerulosclerosis histopathology | chronic pyelonephritis thyroidisation | nephrosclerosis histopathology | renal cell carcinoma clear cell histopathology | transitional cell carcinoma bladder histopathology | schistosomiasis bladder histopathology | prostate adenocarcinoma histopathology | benign prostatic hyperplasia histopathology",
 "Endocrine pathology": "Graves disease thyroid histopathology | colloid goitre histopathology | follicular adenoma thyroid histopathology | papillary thyroid carcinoma Orphan Annie nuclei | medullary thyroid carcinoma histopathology | parathyroid adenoma histopathology | pituitary adenoma histopathology | adrenal cortical adenoma histopathology | phaeochromocytoma histopathology | pancreatic islet amyloid histopathology",
 "Nervous system pathology": "bacterial meningitis histopathology | cerebral abscess histopathology | astrocytoma histopathology | glioblastoma pseudopalisading necrosis | meningioma psammoma bodies | Alzheimer disease plaques tangles | Parkinson disease Lewy body histopathology | multiple sclerosis plaque histopathology | rabies Negri bodies | cerebral infarction histopathology",
 "Infectious disease pathology": "tuberculosis granuloma Langhans giant cell | leprosy lepra cells histopathology | schistosomiasis granuloma histopathology | cryptococcus India ink micrograph | histoplasma histopathology | candida PAS histopathology | cytomegalovirus owl eye inclusion histopathology | herpes virus inclusion histopathology | toxoplasma cyst histopathology | malaria spleen histopathology"
},
"Pathological Physiology": {
 "Aetiology and pathogenesis": "cell injury reversible irreversible histopathology | hydropic degeneration histopathology | apoptosis histopathology",
 "Inflammation and fever": "acute inflammation neutrophil emigration histopathology | leukocyte margination histopathology | granulomatous inflammation histopathology | chronic inflammation lymphocytes plasma cells",
 "Hypoxia": "hypoxic ischaemic neuronal injury histopathology | myocardial ischaemia histopathology | acute tubular necrosis histopathology | centrilobular necrosis liver histopathology",
 "Disorders of carbohydrate and lipid metabolism": "fatty liver histopathology | glycogen storage PAS histopathology | diabetic nephropathy histopathology | xanthoma foam cells histopathology | atherosclerosis plaque histopathology | Gaucher cells histopathology",
 "Acid-base and water-electrolyte disorders": "acute tubular necrosis histopathology | cerebral oedema histopathology | pulmonary oedema histopathology | nephrocalcinosis histopathology",
 "Shock and microcirculation": "disseminated intravascular coagulation fibrin thrombi histopathology | shock lung diffuse alveolar damage histopathology | acute tubular necrosis shock | blood smear schistocytes",
 "Heart, lung, liver and kidney failure": "chronic passive congestion liver histopathology | heart failure cells lung histopathology | cirrhosis histopathology | chronic kidney disease glomerulosclerosis histopathology | pulmonary fibrosis histopathology | myocardial fibrosis histopathology",
 "Tumour growth": "mitotic figure atypical histopathology | dysplasia histopathology | carcinoma in situ histopathology | tumour invasion histopathology | metastasis histopathology | angiogenesis tumour histopathology",
 "Stress and adaptation": "cardiac hypertrophy histopathology | hyperplasia endometrium histopathology | atrophy histopathology | metaplasia Barrett oesophagus histopathology | adrenal cortex stress histology | thymus involution histology"
},
"Microbiology & Parasitology": {
 "Bacteriology": "Gram stain Staphylococcus aureus micrograph | Gram stain Streptococcus micrograph | Gram negative bacilli Escherichia coli micrograph | Neisseria gonorrhoeae Gram stain | Neisseria meningitidis Gram stain CSF | Mycobacterium tuberculosis Ziehl-Neelsen | Vibrio cholerae micrograph | Salmonella micrograph | Clostridium tetani micrograph | Corynebacterium diphtheriae micrograph | Treponema pallidum dark field micrograph | Bacillus anthracis micrograph | Mycobacterium leprae acid fast",
 "Virology": "HIV electron micrograph | hepatitis B virus electron micrograph | influenza virus electron micrograph | rotavirus electron micrograph | herpes simplex virus electron micrograph | measles virus electron micrograph | rabies virus electron micrograph | Ebola virus electron micrograph | cytopathic effect cell culture micrograph | Negri bodies micrograph",
 "Mycology": "Candida albicans Gram stain micrograph | Cryptococcus neoformans India ink | Aspergillus micrograph | dermatophyte KOH preparation micrograph | Histoplasma micrograph | Pneumocystis jirovecii micrograph | Penicillium Aspergillus lactophenol blue",
 "Parasitology (malaria, helminths)": "Plasmodium falciparum ring forms thin blood film | Plasmodium vivax blood smear | Plasmodium malariae blood smear | Plasmodium ovale blood smear | thick blood film malaria | Trypanosoma brucei blood smear | Leishmania amastigotes micrograph | Schistosoma haematobium egg micrograph | Schistosoma mansoni egg micrograph | Ascaris lumbricoides egg micrograph | hookworm egg micrograph | Trichuris trichiura egg micrograph | Taenia egg micrograph | Wuchereria bancrofti microfilaria micrograph | Entamoeba histolytica cyst trophozoite | Giardia lamblia trophozoite | Cryptosporidium oocyst acid fast | Toxoplasma gondii micrograph",
 "Infection control": "bacterial colonies on agar plate | antibiotic sensitivity disk diffusion plate | Gram stain technique micrograph | MRSA culture plate micrograph | autoclave indicator tape micrograph | handwashing agar plate bacteria"
},
"Immunology": {
 "Innate and adaptive immunity": "neutrophil blood smear micrograph | macrophage phagocytosis micrograph | lymphocyte blood smear micrograph | plasma cell histology | lymph node germinal centre histology | natural killer cell micrograph | mast cell histology",
 "Hypersensitivity": "eosinophil blood smear micrograph | mast cell degranulation micrograph | type III hypersensitivity Arthus histopathology | contact dermatitis histopathology | granuloma type IV hypersensitivity histopathology | allergic rhinitis eosinophils histology",
 "Autoimmunity": "antinuclear antibody immunofluorescence patterns | lupus nephritis histopathology | Hashimoto thyroiditis histopathology | rheumatoid arthritis synovium histopathology | LE cell micrograph | pemphigus vulgaris histopathology | coeliac disease histopathology",
 "Immunodeficiency and HIV": "HIV electron micrograph | CD4 T cell HIV micrograph | thymus histology | Pneumocystis pneumonia histopathology | Kaposi sarcoma histopathology | lymph node HIV histopathology | cryptococcal meningitis India ink"
},
"Clinical Immunology & Allergy": {
 "Allergic disease": "eosinophil blood smear | mast cell histology | atopic dermatitis histopathology | asthma airway histopathology | eosinophilic oesophagitis histopathology",
 "Transplant immunology": "acute cellular rejection kidney histopathology | graft versus host disease histopathology | heart transplant rejection histopathology | liver transplant rejection histopathology",
 "Immunodeficiency work-up": "lymph node histology | thymus histology | flow cytometry plot | immunoglobulin immunofluorescence micrograph | HIV lymph node histopathology",
 "Vaccines": "virus electron micrograph | bacterial capsule stain micrograph | vaccine antibody ELISA | Haemophilus influenzae micrograph"
}
};

/* ===================== MICROSCOPY (clinical years): the same discipline, by clinical course ===================== */
Object.assign(B.micro, {
"Internal Medicine": {
 "Cardiology": "myocardial infarction histopathology | infective endocarditis histopathology | rheumatic heart disease Aschoff body | atherosclerosis histopathology | myocarditis histopathology",
 "Respiratory medicine": "lobar pneumonia histopathology | tuberculosis granuloma lung histopathology | emphysema histopathology | lung cancer histopathology | sputum Gram stain micrograph",
 "Gastroenterology": "chronic gastritis histopathology | Crohn disease histopathology | ulcerative colitis histopathology | colon adenocarcinoma histopathology | liver cirrhosis histopathology | coeliac disease histopathology",
 "Nephrology": "glomerulonephritis histopathology | urine sediment casts micrograph | acute tubular necrosis histopathology | renal cell carcinoma histopathology | diabetic nephropathy histopathology",
 "Endocrinology": "Graves disease thyroid histopathology | Hashimoto thyroiditis histopathology | papillary thyroid carcinoma histopathology | pituitary adenoma histopathology | phaeochromocytoma histopathology",
 "Infectious diseases": "malaria blood smear | tuberculosis Ziehl-Neelsen | Gram stain micrograph | cryptococcus India ink | schistosoma egg micrograph | HIV electron micrograph",
 "Haematology": "iron deficiency anaemia blood smear | acute leukaemia blood smear | chronic myeloid leukaemia blood smear | bone marrow smear | sickle cell blood smear | lymphoma histopathology"
},
"Cardiology": {
 "Ischaemic heart disease": "atherosclerosis plaque histopathology | myocardial infarction histopathology | coagulative necrosis myocardium histopathology | healing myocardial infarction histopathology",
 "Heart failure": "heart failure cells lung histopathology | cardiac hypertrophy histopathology | dilated cardiomyopathy histopathology | nutmeg liver histopathology",
 "Arrhythmias and ECG": "cardiac conduction system histology | sinoatrial node histology | Purkinje fibres histology | myocardial fibrosis histopathology",
 "Valvular and congenital heart disease": "rheumatic heart disease Aschoff body | infective endocarditis vegetation histopathology | mitral valve myxomatous degeneration histopathology | calcific aortic stenosis histopathology",
 "Hypertension": "hypertensive arteriolosclerosis histopathology | hyaline arteriolosclerosis histopathology | hyperplastic arteriolosclerosis onion skin histopathology | hypertensive nephrosclerosis histopathology",
 "Cardiomyopathy, myocarditis and pericarditis": "hypertrophic cardiomyopathy myocyte disarray histopathology | dilated cardiomyopathy histopathology | viral myocarditis histopathology | fibrinous pericarditis histopathology | amyloid heart histopathology"
},
"Pulmonology": {
 "Asthma and COPD": "asthma airway histopathology | chronic bronchitis goblet cell histopathology | emphysema histopathology | Charcot-Leyden crystals micrograph | Curschmann spirals micrograph",
 "Pneumonia": "lobar pneumonia histopathology | bronchopneumonia histopathology | Pneumocystis pneumonia histopathology | sputum Gram stain pneumococci micrograph | aspiration pneumonia histopathology",
 "Pleural disease": "pleural effusion cytology micrograph | mesothelioma histopathology | fibrinous pleuritis histopathology | empyema histopathology",
 "Interstitial lung disease": "usual interstitial pneumonia histopathology | sarcoidosis granuloma histopathology | silicosis nodule histopathology | asbestosis asbestos bodies micrograph | hypersensitivity pneumonitis histopathology",
 "Pulmonary embolism and hypertension": "pulmonary embolism histopathology | pulmonary hypertension plexiform lesion histopathology | thrombus histopathology | pulmonary infarct histopathology",
 "Lung cancer": "lung squamous cell carcinoma histopathology | lung adenocarcinoma histopathology | small cell lung carcinoma histopathology | large cell carcinoma lung histopathology | sputum cytology malignant cells micrograph"
},
"Gastroenterology & Hepatology": {
 "Oesophagus and stomach": "Barrett oesophagus histopathology | oesophageal squamous cell carcinoma histopathology | Helicobacter pylori histopathology | gastric ulcer histopathology | gastric adenocarcinoma histopathology",
 "Inflammatory bowel disease": "Crohn disease granuloma histopathology | ulcerative colitis crypt abscess histopathology | microscopic colitis histopathology | coeliac disease histopathology",
 "Liver disease and cirrhosis": "cirrhosis histopathology | chronic hepatitis B ground glass histopathology | alcoholic hepatitis Mallory bodies | haemochromatosis Perls stain | primary biliary cholangitis histopathology | hepatocellular carcinoma histopathology",
 "Pancreas and biliary disease": "acute pancreatitis histopathology | chronic pancreatitis histopathology | pancreatic adenocarcinoma histopathology | cholecystitis histopathology | gallstones cholesterol histopathology",
 "GI bleeding": "peptic ulcer histopathology | oesophageal varices histopathology | angiodysplasia histopathology | colon polyp histopathology | colorectal adenocarcinoma histopathology"
},
"Nephrology": {
 "Acute kidney injury": "acute tubular necrosis histopathology | acute interstitial nephritis histopathology | cortical necrosis histopathology | urine sediment muddy brown casts",
 "Chronic kidney disease": "chronic kidney disease histopathology | glomerulosclerosis histopathology | nephrosclerosis histopathology | chronic pyelonephritis histopathology | polycystic kidney disease histopathology",
 "Glomerular disease": "minimal change disease electron micrograph | membranous nephropathy histopathology | IgA nephropathy histopathology | post-streptococcal glomerulonephritis histopathology | focal segmental glomerulosclerosis histopathology | lupus nephritis histopathology | crescentic glomerulonephritis histopathology",
 "Electrolyte and acid-base disorders": "calcium oxalate crystals urine micrograph | nephrocalcinosis histopathology | urine sediment micrograph | red cell casts urine micrograph",
 "Dialysis and transplantation": "kidney transplant rejection histopathology | amyloidosis kidney Congo red | diabetic nephropathy histopathology | renal biopsy histopathology"
},
"Haematology": {
 "Anaemias": "iron deficiency anaemia blood smear | megaloblastic anaemia blood smear | hypersegmented neutrophil micrograph | sickle cell anaemia blood smear | thalassaemia blood smear | hereditary spherocytosis blood smear | aplastic anaemia bone marrow histology | reticulocytes new methylene blue micrograph",
 "Leukaemias and lymphomas": "acute lymphoblastic leukaemia blood smear | acute myeloid leukaemia blood smear | chronic lymphocytic leukaemia blood smear | chronic myeloid leukaemia blood smear | hairy cell leukaemia micrograph | Hodgkin lymphoma Reed-Sternberg cell | Burkitt lymphoma starry sky histopathology | diffuse large B cell lymphoma histopathology | multiple myeloma bone marrow plasma cells",
 "Bleeding and clotting disorders": "thrombocytopenia blood smear | platelet clumping micrograph | DIC blood smear schistocytes | thrombotic thrombocytopenic purpura blood smear schistocytes | normal platelets blood smear",
 "Transfusion medicine": "agglutination blood group micrograph | rouleaux blood smear | malaria blood smear transfusion | Coombs test agglutination micrograph",
 "Sickle cell disease": "sickle cell blood smear | Howell-Jolly bodies blood smear | target cells blood smear | sickle cell spleen autosplenectomy histopathology | osteonecrosis sickle cell histopathology"
},
"Rheumatology": {
 "Rheumatoid arthritis": "rheumatoid arthritis synovium pannus histopathology | rheumatoid nodule histopathology | synovial fluid micrograph | lymphoid follicle synovium histopathology",
 "SLE and connective tissue disease": "lupus nephritis histopathology | LE cell micrograph | antinuclear antibody immunofluorescence | lupus skin biopsy immunofluorescence | scleroderma skin histopathology",
 "Gout and crystal arthropathy": "monosodium urate crystals polarised light micrograph | calcium pyrophosphate crystals micrograph | gouty tophus histopathology | synovial fluid crystals micrograph",
 "Vasculitis": "giant cell arteritis histopathology | polyarteritis nodosa histopathology | leukocytoclastic vasculitis histopathology | granulomatosis with polyangiitis histopathology | Kawasaki disease histopathology",
 "Spondyloarthropathies": "enthesitis histopathology | psoriatic arthritis histopathology | sacroiliitis histopathology | synovial fluid micrograph"
},
"Endocrinology": {
 "Diabetes mellitus": "pancreatic islet histology | islet amyloid histopathology | diabetic nephropathy Kimmelstiel-Wilson histopathology | diabetic retinopathy histopathology | insulitis histopathology",
 "Thyroid disease": "Graves disease thyroid histopathology | Hashimoto thyroiditis histopathology | colloid goitre histopathology | papillary thyroid carcinoma histopathology | follicular carcinoma thyroid histopathology | medullary thyroid carcinoma histopathology | fine needle aspiration thyroid cytology",
 "Adrenal and pituitary disorders": "pituitary adenoma histopathology | adrenal cortex histology | phaeochromocytoma histopathology | adrenal adenoma Conn histopathology | adrenal hyperplasia histopathology",
 "Metabolic bone disease": "osteoporosis bone histology | osteomalacia histopathology | Paget disease of bone histopathology | parathyroid adenoma histopathology | osteitis fibrosa cystica histopathology",
 "Obesity": "adipose tissue histology | fatty liver steatohepatitis histopathology | adipocyte hypertrophy histology | brown adipose tissue histology"
},
"Infectious Diseases": {
 "Fever and sepsis": "Gram stain blood culture micrograph | malaria blood smear | meningococcus Gram stain | septic shock DIC histopathology | blood culture bacteria micrograph",
 "Respiratory and enteric infections": "sputum Gram stain micrograph | Streptococcus pneumoniae Gram stain | Vibrio cholerae micrograph | Salmonella typhi micrograph | Shigella micrograph | stool ova parasites micrograph | rotavirus electron micrograph",
 "HIV and sexually transmitted infections": "HIV electron micrograph | Neisseria gonorrhoeae Gram stain | Treponema pallidum dark field | Chlamydia trachomatis inclusion micrograph | Trichomonas vaginalis micrograph | herpes virus Tzanck smear micrograph | Candida vaginal smear micrograph",
 "Viral hepatitis": "hepatitis B ground glass hepatocytes histopathology | hepatitis C histopathology | acute hepatitis histopathology | hepatitis A virus electron micrograph | councilman bodies histopathology",
 "Tropical diseases": "Plasmodium falciparum blood smear | Trypanosoma brucei blood smear | Leishmania micrograph | Schistosoma egg micrograph | filaria microfilaria blood smear | Mycobacterium leprae micrograph | Ebola virus electron micrograph | Mycobacterium ulcerans Buruli histopathology",
 "Antimicrobial stewardship": "disk diffusion antibiotic sensitivity plate | MRSA culture micrograph | Gram stain micrograph | MIC test strip Etest | ESBL culture plate"
},
"Dermatology & Venereology": {
 "Eczema and psoriasis": "psoriasis skin histopathology | atopic dermatitis histopathology | spongiotic dermatitis histopathology | lichen planus histopathology | seborrhoeic dermatitis histopathology",
 "Skin infections and infestations": "scabies mite micrograph | dermatophyte KOH micrograph | impetigo Gram stain | leprosy skin histopathology | cutaneous leishmaniasis histopathology | molluscum contagiosum histopathology | herpes zoster histopathology | tinea PAS histopathology",
 "Skin cancers": "basal cell carcinoma histopathology | squamous cell carcinoma skin histopathology | malignant melanoma histopathology | actinic keratosis histopathology | Kaposi sarcoma histopathology | dermatofibrosarcoma histopathology | naevus histopathology",
 "Sexually transmitted infections": "Neisseria gonorrhoeae Gram stain | Treponema pallidum dark field | herpes simplex Tzanck smear | Trichomonas vaginalis micrograph | condyloma histopathology | Chlamydia micrograph | Haemophilus ducreyi micrograph"
},
"Oncology": {
 "Cancer biology and screening": "Pap smear cytology normal | cervical intraepithelial neoplasia histopathology | dysplasia histopathology | mitotic figures atypical | carcinoma in situ histopathology | colonoscopy adenoma histopathology | mammography screening histopathology",
 "Common cancers": "invasive ductal carcinoma breast histopathology | colorectal adenocarcinoma histopathology | lung adenocarcinoma histopathology | cervical squamous carcinoma histopathology | prostate adenocarcinoma histopathology | hepatocellular carcinoma histopathology | gastric adenocarcinoma histopathology | Kaposi sarcoma histopathology | Burkitt lymphoma histopathology | oesophageal carcinoma histopathology",
 "Chemotherapy, radiotherapy and surgery": "radiation changes histopathology | chemotherapy effect tumour histopathology | tumour margin histopathology | surgical resection margin histopathology",
 "Palliative care": "metastasis histopathology | bone metastasis histopathology | liver metastasis histopathology | lymph node metastasis histopathology"
},
"Phthisiology (Tuberculosis)": {
 "Epidemiology and transmission": "Mycobacterium tuberculosis electron micrograph | acid fast bacilli sputum micrograph | tuberculosis granuloma histopathology",
 "Diagnosis": "Ziehl-Neelsen sputum smear | auramine stain Mycobacterium micrograph | caseating granuloma histopathology | Langhans giant cell histopathology | lymph node tuberculosis histopathology | Lowenstein-Jensen culture micrograph",
 "Treatment regimens": "Mycobacterium tuberculosis culture | tuberculosis healing fibrosis histopathology | drug induced hepatitis histopathology",
 "Drug-resistant TB": "Mycobacterium tuberculosis culture MGIT | drug susceptibility testing mycobacterium | tuberculosis cavity histopathology | line probe assay",
 "Prevention": "BCG vaccine scar | tuberculin skin test reaction | tuberculosis granuloma histopathology"
},
"Forensic Medicine": {
 "Medico-legal practice": "wound histology vital reaction | bruise histology age | gunshot wound histopathology | stab wound histopathology | diatoms micrograph drowning | hair microscopy forensic | sperm smear micrograph",
 "Death and certification": "autolysis histology postmortem | myocardial infarction histopathology | hypoxic ischaemic brain injury histopathology | fat embolism histopathology | postmortem changes histology | lividity histology"
},
"Obstetrics & Gynaecology": {
 "Antenatal care": "placenta villi histology | chorionic villi histology | umbilical cord histology | amniotic fluid micrograph | normal placenta histopathology",
 "Labour and delivery": "placenta histopathology | chorioamnionitis histopathology | meconium macrophages placenta | placenta accreta histopathology",
 "Obstetric emergencies": "hydatidiform mole histopathology | choriocarcinoma histopathology | ectopic pregnancy histopathology | retained products of conception histopathology | eclampsia placenta histopathology",
 "Gynaecology": "Pap smear cytology | cervical intraepithelial neoplasia histopathology | endometrial hyperplasia histopathology | endometrial carcinoma histopathology | leiomyoma uterus histopathology | endometriosis histopathology | ovarian serous cystadenoma histopathology | dermoid cyst histopathology | Candida vaginal smear | Trichomonas vaginalis | bacterial vaginosis clue cells",
 "Family planning": "sperm micrograph | endometrium histology | proliferative endometrium histology | secretory endometrium histology | ovulation ferning cervical mucus micrograph"
},
"Urology": {
 "Urinary tract stones": "calcium oxalate crystals urine micrograph | uric acid crystals urine micrograph | struvite crystals micrograph | cystine crystals micrograph | renal calculus histopathology",
 "Prostate disease": "benign prostatic hyperplasia histopathology | prostate adenocarcinoma Gleason histopathology | prostatitis histopathology | prostatic intraepithelial neoplasia histopathology",
 "Urinary tract tumours": "urothelial carcinoma bladder histopathology | renal cell carcinoma histopathology | Wilms tumour histopathology | squamous cell carcinoma bladder schistosomiasis | urine cytology micrograph",
 "Urinary tract infection and obstruction": "urine sediment white cells bacteria micrograph | pyelonephritis histopathology | hydronephrosis histopathology | Schistosoma haematobium egg urine micrograph | cystitis histopathology",
 "Male reproductive disorders": "seminoma histopathology | teratoma testis histopathology | testicular atrophy histopathology | semen analysis sperm micrograph | epididymitis histopathology | testis histology"
},
"Neurology": {
 "Stroke": "cerebral infarct histopathology | intracerebral haemorrhage histopathology | cerebral amyloid angiopathy histopathology | atherosclerosis cerebral artery histopathology",
 "Epilepsy": "hippocampal sclerosis histopathology | cortical dysplasia histopathology | cysticercosis brain histopathology | brain tumour histopathology",
 "Neuromuscular disease": "muscle biopsy histology | Duchenne muscular dystrophy histopathology | neurogenic atrophy muscle histopathology | myasthenia thymus histopathology | nerve biopsy histology | polymyositis histopathology",
 "Headache": "meningitis histopathology | pituitary adenoma histopathology | giant cell arteritis histopathology | CSF cell count micrograph"
},
"Paediatrics": {
 "Growth and development": "growth plate histology | epiphyseal plate histology | rickets histopathology | fetal bone histology",
 "Neonatology": "hyaline membrane disease histopathology | neonatal blood smear nucleated red cells | necrotising enterocolitis histopathology | placenta histopathology",
 "Childhood infections and immunisation": "measles giant cells histopathology | Koplik spots measles | malaria blood smear | pertussis Bordetella micrograph | Haemophilus influenzae Gram stain",
 "Nutrition": "kwashiorkor liver steatosis histopathology | marasmus histopathology | rickets histopathology | iron deficiency blood smear | vitamin A deficiency xerophthalmia histopathology",
 "Paediatric emergencies": "meningococcus Gram stain | malaria blood smear | bronchiolitis histopathology | epiglottitis histopathology | blood smear sepsis"
}
});

window.SLIDEBANK_PART1 = B;
})();

/* ===================== MACROSCOPY: gross specimens, dissections, cut organs, clinical appearance ===================== */
(function () {
const B = window.SLIDEBANK_PART1;
B.macro = {
"Anatomy": {
 "Upper limb": "shoulder dissection anatomy | brachial plexus dissection | arm muscles dissection | forearm flexor muscles dissection | carpal tunnel dissection | hand dissection tendons | axilla dissection anatomy",
 "Lower limb": "gluteal region dissection | thigh muscles dissection | femoral triangle dissection | popliteal fossa dissection | knee joint dissection | leg muscles dissection | foot sole dissection",
 "Thorax": "thoracic cavity dissection | heart anterior view dissection | heart chambers dissection | coronary arteries cadaver | lungs gross anatomy | mediastinum dissection | diaphragm anatomy dissection",
 "Abdomen and pelvis": "abdominal cavity dissection | stomach gross anatomy | liver gross anatomy | small intestine gross anatomy | kidney gross anatomy dissection | male pelvis sagittal section | female pelvis sagittal section | inguinal canal dissection",
 "Head and neck": "neck dissection anatomy | cadaver face dissection | cranial cavity skull base | skull anatomy bones | larynx dissection | tongue dissection | orbit dissection anatomy | parotid gland dissection",
 "Neuroanatomy": "human brain gross anatomy | brain base circle of Willis | brain coronal section | brain sagittal section | brainstem gross anatomy | spinal cord gross anatomy | cerebellum gross anatomy"
},
"Neuroscience": {
 "Neuron and synapse": "human brain gross specimen | spinal cord cross section specimen | peripheral nerve dissection",
 "Sensory systems": "human eye dissection | ear dissection anatomy | brain somatosensory cortex gross | spinal cord posterior column specimen",
 "Motor systems": "brain motor cortex gross specimen | internal capsule brain section | brainstem cross section specimen | spinal cord anterior horn gross",
 "Cranial nerves": "cranial nerves brainstem base | brain inferior view cranial nerves | skull base foramina cranial nerves | optic chiasm dissection",
 "Higher functions": "human brain lateral view gross | frontal lobe gross brain | hippocampus brain dissection | brain coronal section basal ganglia"
},
"Operative Surgery & Topographic Anatomy": {
 "Surgical instruments and suturing": "surgical instruments set | suture techniques interrupted | needle holder forceps scalpel | suture materials | simple interrupted suture wound",
 "Topographic anatomy of the head and neck": "neck triangles anatomy dissection | scalp layers dissection | carotid sheath dissection | thyroid gland dissection | tracheostomy anatomy",
 "Chest and abdomen": "intercostal space chest drain anatomy | abdominal wall layers dissection | laparotomy incision | McBurney incision appendectomy | inguinal hernia repair anatomy | thoracotomy",
 "Limbs and vascular access": "femoral vein cannulation anatomy | radial artery anatomy dissection | saphenous vein anatomy | venous cutdown | tourniquet limb amputation",
 "Basic operations": "appendectomy surgery | cholecystectomy specimen | hernia repair mesh | tracheostomy surgery | chest tube insertion | amputation stump",
 "Surgical approaches": "midline laparotomy incision | Kocher incision | Pfannenstiel incision | deltopectoral approach | thoracotomy approach | posterior approach hip"
},
"Pathology": {
 "Cell injury and inflammation": "fatty liver gross pathology | coagulative necrosis infarct gross pathology | caseous necrosis gross pathology | fat necrosis gross pathology | abscess gross pathology | acute appendicitis gross pathology | gangrene gross pathology | amyloid spleen gross pathology",
 "Neoplasia": "colon adenocarcinoma gross pathology | lipoma gross specimen | leiomyoma uterus gross pathology | breast carcinoma gross pathology | squamous cell carcinoma skin gross | lung cancer gross pathology | liver metastases gross pathology | osteosarcoma gross pathology | melanoma gross",
 "Haematology": "splenomegaly gross pathology | lymphadenopathy gross | leukaemic infiltration liver spleen gross | bone marrow gross specimen | petechiae purpura skin | anaemia conjunctival pallor",
 "Cardiovascular pathology": "myocardial infarction gross pathology | coronary atherosclerosis gross pathology | atherosclerosis aorta gross pathology | cardiac hypertrophy gross pathology | rheumatic mitral stenosis gross pathology | infective endocarditis gross pathology | aortic aneurysm gross pathology | mural thrombus gross",
 "Respiratory pathology": "lobar pneumonia gross pathology | bronchopneumonia gross pathology | pulmonary tuberculosis gross pathology | emphysema lung gross pathology | pulmonary embolism gross pathology | lung cancer gross pathology | anthracosis lung gross | pulmonary oedema gross pathology",
 "GI and liver pathology": "peptic ulcer gross pathology | gastric carcinoma gross pathology | Crohn disease gross pathology | ulcerative colitis gross pathology | colon polyp gross pathology | liver cirrhosis gross pathology | hepatocellular carcinoma gross pathology | gallstones gross pathology | acute pancreatitis gross pathology",
 "Renal pathology": "kidney infarct gross pathology | polycystic kidney gross pathology | pyelonephritis gross pathology | hydronephrosis gross pathology | renal cell carcinoma gross pathology | contracted kidney gross pathology | renal calculi gross"
},
"Pathological Anatomy": {
 "Methods: autopsy, biopsy and cytology": "autopsy organ examination | autopsy Y incision | biopsy specimen formalin fixed | surgical specimen cut section | specimen photography gross examination | organ weighing autopsy",
 "Cell injury, necrosis and apoptosis": "fatty liver gross pathology | coagulative necrosis kidney infarct gross | caseous necrosis lymph node gross | gangrene toe gross | brown atrophy heart gross | liquefactive necrosis brain gross",
 "Disorders of circulation: thrombosis, embolism, infarction": "nutmeg liver gross pathology | pulmonary embolism saddle gross | thrombus gross pathology | splenic infarct gross pathology | cerebral infarct gross pathology | haemorrhagic infarct lung gross | cerebral haemorrhage gross pathology | pulmonary congestion brown induration",
 "Inflammation and repair": "fibrinous pericarditis gross pathology | abscess gross pathology | acute appendicitis gross | chronic cholecystitis gross | keloid scar | granulation tissue wound gross | bronchopneumonia gross pathology",
 "Immunopathology": "amyloid spleen sago gross pathology | amyloid kidney gross pathology | lupus butterfly rash | rheumatoid nodule gross | transplant rejection kidney gross | glomerulonephritis kidney gross pathology",
 "Tumours: classification and spread": "benign tumour gross specimen | malignant tumour gross pathology | liver metastases gross pathology | lung metastases gross pathology | colorectal carcinoma gross pathology | breast cancer gross pathology | ovarian cystadenoma gross pathology | teratoma gross pathology | brain tumour gross pathology | osteosarcoma gross",
 "Atherosclerosis and heart disease": "aorta atherosclerosis gross pathology | coronary thrombosis gross pathology | myocardial infarction gross TTC stain | heart hypertrophy gross pathology | ruptured ventricle gross pathology | dilated cardiomyopathy gross pathology | rheumatic valve gross pathology",
 "Lung and respiratory pathology": "lobar pneumonia gross pathology | bronchopneumonia gross | tuberculosis cavity gross pathology | miliary tuberculosis gross pathology | emphysema gross pathology | bronchiectasis gross pathology | lung abscess gross pathology | lung carcinoma gross pathology | pleural effusion gross pathology | pneumothorax gross",
 "Gastrointestinal and liver pathology": "oesophageal varices gross pathology | gastric ulcer gross pathology | gastric carcinoma gross pathology | typhoid ileum ulcer gross pathology | ulcerative colitis gross pathology | colon carcinoma gross pathology | liver cirrhosis gross pathology | hepatocellular carcinoma gross pathology | gallstones gross pathology | pancreatitis gross pathology",
 "Kidney and urinary tract pathology": "acute pyelonephritis gross pathology | chronic pyelonephritis gross pathology | hydronephrosis gross pathology | polycystic kidney gross pathology | renal cell carcinoma gross pathology | renal calculi gross pathology | bladder tumour gross pathology | prostate hyperplasia gross pathology",
 "Endocrine pathology": "goitre gross pathology | thyroid carcinoma gross pathology | adrenal tumour gross pathology | phaeochromocytoma gross pathology | pituitary adenoma gross pathology | acromegaly clinical appearance | pancreas gross pathology",
 "Nervous system pathology": "meningitis gross brain pathology | brain abscess gross pathology | cerebral infarct gross pathology | subdural haematoma gross pathology | glioblastoma gross pathology | meningioma gross pathology | Alzheimer brain atrophy gross | hydrocephalus brain gross",
 "Infectious disease pathology": "tuberculosis gross pathology | miliary tuberculosis liver gross | typhoid gross pathology | amoebic liver abscess gross pathology | hydatid cyst gross pathology | schistosomiasis liver gross pathology | cysticercosis brain gross pathology | leprosy clinical appearance | malaria spleen gross"
},
"Microbiology & Parasitology": {
 "Bacteriology": "Staphylococcus aureus colonies agar plate | Escherichia coli colonies MacConkey agar | Pseudomonas aeruginosa culture plate | Streptococcus haemolysis blood agar | Salmonella colonies XLD agar | Mycobacterium tuberculosis colonies Lowenstein-Jensen | Bacillus anthracis colonies",
 "Virology": "measles rash clinical | chickenpox rash clinical | herpes zoster rash clinical | cold sore herpes labialis | mumps parotid swelling | Kaposi sarcoma clinical",
 "Mycology": "Candida oral thrush clinical | tinea corporis clinical | Aspergillus colony culture plate | Cryptococcus colonies Sabouraud agar | tinea capitis clinical | nail onychomycosis",
 "Parasitology (malaria, helminths)": "Ascaris adult worm specimen | hookworm adult specimen | Taenia saginata tapeworm specimen | Schistosoma haematobium haematuria | elephantiasis filariasis clinical | Anopheles mosquito | tsetse fly | hydatid cyst gross specimen | Guinea worm Dracunculus | tick bite",
 "Infection control": "personal protective equipment | hand hygiene technique | sterilisation autoclave | sharps container | wound infection clinical | hospital isolation room"
},
"Forensic Medicine": {
 "Medico-legal practice": "gunshot wound entrance | stab wound | bruise ageing colour | abrasion laceration injury | burn injury degree | strangulation ligature mark | defence wounds",
 "Death and certification": "rigor mortis | livor mortis postmortem lividity | decomposition stages | postmortem examination organs | drowning froth | autopsy brain removal"
},
"Internal Medicine": {
 "Cardiology": "myocardial infarction gross pathology | cardiac hypertrophy gross | rheumatic heart valves gross | jugular venous distension | peripheral oedema pitting | xanthelasma | clubbing hands",
 "Respiratory medicine": "lung tuberculosis gross pathology | emphysema gross | lung cancer gross | finger clubbing | pleural effusion gross | central cyanosis",
 "Gastroenterology": "liver cirrhosis gross | ascites clinical | jaundice sclera | caput medusae | oesophageal varices | spider naevi",
 "Nephrology": "kidney gross anatomy cut | polycystic kidney gross | contracted kidney gross | nephrotic oedema periorbital | kidney stones specimen",
 "Endocrinology": "goitre clinical | exophthalmos Graves clinical | Cushing syndrome clinical | acromegaly clinical | myxoedema face | diabetic foot ulcer",
 "Infectious diseases": "oral candidiasis HIV clinical | Kaposi sarcoma skin | herpes zoster clinical | typhoid gross pathology | miliary tuberculosis gross | tuberculous lymphadenitis scrofula",
 "Haematology": "splenomegaly gross | lymphadenopathy neck clinical | conjunctival pallor anaemia | petechiae purpura | koilonychia | angular stomatitis"
},
"Cardiology": {
 "Ischaemic heart disease": "myocardial infarction gross pathology | coronary artery atherosclerosis gross | coronary thrombosis gross | heart aneurysm left ventricle gross | coronary artery bypass graft",
 "Heart failure": "dilated heart gross pathology | cardiac hypertrophy gross | pulmonary oedema gross | jugular venous distension | pitting oedema legs | hepatomegaly congestion nutmeg liver",
 "Arrhythmias and ECG": "heart conduction system dissection | pacemaker implanted chest | pacemaker lead heart | cardiac anatomy atria dissection",
 "Valvular and congenital heart disease": "rheumatic mitral stenosis gross pathology | aortic stenosis calcific gross | infective endocarditis gross | ventricular septal defect gross | tetralogy of Fallot gross | patent ductus arteriosus gross | atrial septal defect gross | mechanical heart valve",
 "Hypertension": "left ventricular hypertrophy gross pathology | hypertensive kidney gross pathology | hypertensive brain haemorrhage gross | aortic dissection gross pathology | retinal hypertensive changes",
 "Cardiomyopathy, myocarditis and pericarditis": "dilated cardiomyopathy gross | hypertrophic cardiomyopathy gross | fibrinous pericarditis gross | pericardial effusion gross | constrictive pericarditis gross | myocarditis gross"
},
"Pulmonology": {
 "Asthma and COPD": "emphysema lung gross pathology | chronic bronchitis gross | barrel chest clinical | inhaler spacer device | pursed lip breathing | asthma peak flow meter",
 "Pneumonia": "lobar pneumonia gross pathology | bronchopneumonia gross | lung abscess gross | consolidation lung gross | empyema gross",
 "Pleural disease": "pleural effusion gross | pneumothorax gross | pleural plaques asbestos gross | mesothelioma gross | chest drain intercostal",
 "Interstitial lung disease": "pulmonary fibrosis honeycomb lung gross | sarcoidosis gross | silicosis lung gross | asbestosis gross | clubbing fingers",
 "Pulmonary embolism and hypertension": "pulmonary embolism saddle gross | thrombus pulmonary artery gross | pulmonary infarct gross | cor pulmonale gross | leg deep vein thrombosis clinical",
 "Lung cancer": "lung carcinoma gross pathology | lung tumour resection specimen | lung metastases gross | Pancoast tumour | superior vena cava obstruction clinical"
},
"Gastroenterology & Hepatology": {
 "Oesophagus and stomach": "oesophageal carcinoma gross pathology | oesophageal varices gross | gastric ulcer gross | gastric carcinoma gross pathology | hiatus hernia | Barrett oesophagus endoscopy",
 "Inflammatory bowel disease": "Crohn disease gross pathology | ulcerative colitis gross pathology | cobblestone mucosa Crohn | pseudopolyps colitis | toxic megacolon",
 "Liver disease and cirrhosis": "cirrhosis gross pathology | fatty liver gross | hepatocellular carcinoma gross | ascites | jaundice clinical | hepatomegaly | liver metastases gross",
 "Pancreas and biliary disease": "gallstones gross | acute cholecystitis gross | pancreatic carcinoma gross | acute pancreatitis fat necrosis gross | choledocholithiasis",
 "GI bleeding": "oesophageal varices | peptic ulcer bleeding gross | colon polyp gross | haemorrhoids | melaena stool | angiodysplasia colon"
},
"Nephrology": {
 "Acute kidney injury": "acute tubular necrosis kidney gross | kidney cortical necrosis gross | obstructive uropathy gross | urinary catheter bag",
 "Chronic kidney disease": "contracted kidney gross | chronic pyelonephritis gross | polycystic kidney gross | uraemic frost | arteriovenous fistula forearm",
 "Glomerular disease": "glomerulonephritis kidney gross | nephrotic syndrome oedema clinical | large white kidney gross | periorbital oedema nephrotic | haematuria urine sample",
 "Electrolyte and acid-base disorders": "Trousseau sign hypocalcaemia | Chvostek sign | tetany carpopedal spasm | urine colour samples",
 "Dialysis and transplantation": "haemodialysis machine | peritoneal dialysis catheter | kidney transplant surgery | arteriovenous fistula | transplanted kidney specimen"
},
"Haematology": {
 "Anaemias": "conjunctival pallor anaemia | koilonychia | angular stomatitis | glossitis anaemia | palmar crease pallor | thalassaemia facies",
 "Leukaemias and lymphomas": "lymphadenopathy neck lymphoma | splenomegaly leukaemia gross | gum hypertrophy leukaemia | Burkitt lymphoma jaw clinical | Hodgkin lymphoma lymph node gross",
 "Bleeding and clotting disorders": "petechiae | purpura ecchymosis | haemarthrosis haemophilia knee | epistaxis | gum bleeding",
 "Transfusion medicine": "blood bag transfusion | blood group cross matching | transfusion reaction | blood donation",
 "Sickle cell disease": "sickle cell dactylitis hands | sickle cell leg ulcer | splenic infarct sickle cell gross | sickle cell jaundice | avascular necrosis femoral head gross"
},
"Rheumatology": {
 "Rheumatoid arthritis": "rheumatoid arthritis hands deformity | rheumatoid nodules elbow | ulnar deviation hands | swan neck boutonniere deformity | rheumatoid knee gross",
 "SLE and connective tissue disease": "lupus malar rash | discoid lupus lesions | Raynaud phenomenon fingers | scleroderma hands sclerodactyly | systemic sclerosis face",
 "Gout and crystal arthropathy": "gout tophi hands | acute gout big toe | gouty tophus ear | gout joint gross specimen",
 "Vasculitis": "palpable purpura vasculitis | Kawasaki disease clinical | giant cell arteritis temporal artery | polyarteritis nodosa gross | digital gangrene",
 "Spondyloarthropathies": "ankylosing spondylitis spine specimen | psoriatic arthritis hands | dactylitis sausage digit | reactive arthritis balanitis | bamboo spine gross"
},
"Endocrinology": {
 "Diabetes mellitus": "diabetic foot ulcer | diabetic gangrene toe | necrobiosis lipoidica | lipohypertrophy insulin injection | diabetic kidney gross | insulin pen",
 "Thyroid disease": "goitre clinical | thyroid gland gross | exophthalmos Graves | thyroid carcinoma gross | myxoedema facies | pretibial myxoedema",
 "Adrenal and pituitary disorders": "Cushing syndrome moon face | acromegaly hands face | adrenal gland gross | Addison disease pigmentation | pituitary adenoma gross | striae abdomen Cushing",
 "Metabolic bone disease": "osteoporosis bone gross specimen | kyphosis dowager hump | rickets clinical legs | Paget disease skull | osteomalacia",
 "Obesity": "central obesity clinical | acanthosis nigricans | body mass index measurement | waist circumference measurement | fatty liver gross"
},
"Infectious Diseases": {
 "Fever and sepsis": "meningococcal septicaemia purpura | petechial rash sepsis | malaria spleen gross | purpura fulminans | sepsis skin lesions",
 "Respiratory and enteric infections": "typhoid ileal ulcer gross | cholera rice water stool | lobar pneumonia gross | diphtheria membrane throat | pertussis clinical",
 "HIV and sexually transmitted infections": "oral candidiasis HIV | Kaposi sarcoma lesions | oral hairy leukoplakia | genital warts | genital herpes lesions | syphilis chancre | primary syphilis lesion | secondary syphilis palms rash",
 "Viral hepatitis": "jaundice sclera | hepatitis liver gross | cirrhosis liver gross | hepatocellular carcinoma gross | ascites",
 "Tropical diseases": "elephantiasis filariasis | hydrocoele filariasis | leprosy skin lesions | Buruli ulcer | trypanosomiasis sleeping sickness | schistosomiasis liver gross | hydatid cyst | cutaneous leishmaniasis | rabies | tetanus risus sardonicus | Ebola clinical",
 "Antimicrobial stewardship": "antibiotic sensitivity plate | culture plates bacteria | drug rash antibiotic | Stevens-Johnson syndrome clinical | intravenous antibiotic infusion"
},
"Dermatology & Venereology": {
 "Eczema and psoriasis": "atopic eczema clinical | psoriasis plaques clinical | seborrhoeic dermatitis clinical | contact dermatitis clinical | lichen planus clinical | nail psoriasis",
 "Skin infections and infestations": "impetigo clinical | cellulitis clinical | scabies burrows | tinea corporis ringworm | pediculosis head lice | herpes zoster dermatome rash | leprosy clinical lesions | molluscum contagiosum | cutaneous larva migrans",
 "Skin cancers": "basal cell carcinoma clinical | squamous cell carcinoma skin clinical | melanoma clinical ABCDE | actinic keratosis clinical | Kaposi sarcoma skin | acral lentiginous melanoma",
 "Sexually transmitted infections": "genital herpes clinical | syphilis chancre | genital warts clinical | gonorrhoea urethral discharge | chancroid | secondary syphilis rash"
},
"Dermatology & Radiology": {
 "Common skin diseases": "acne vulgaris clinical | urticaria wheals | vitiligo clinical | psoriasis plaques | tinea clinical | eczema clinical | scabies clinical",
 "Imaging basics": "skin lesion dermoscopy | dermoscopy melanoma | wood lamp examination | skin biopsy punch"
},
"Oncology": {
 "Cancer biology and screening": "colon polyp gross specimen | cervical cancer screening VIA acetowhite | breast self examination | mammogram | colonoscopy polyp",
 "Common cancers": "breast carcinoma gross pathology | colorectal carcinoma gross pathology | cervical carcinoma gross pathology | prostate gross pathology | Kaposi sarcoma clinical | oesophageal carcinoma gross | Burkitt lymphoma jaw | hepatocellular carcinoma gross | lung carcinoma gross",
 "Chemotherapy, radiotherapy and surgery": "radiotherapy machine linear accelerator | radiotherapy skin reaction | chemotherapy alopecia | mastectomy specimen | surgical resection tumour specimen",
 "Palliative care": "cachexia clinical | malignant ascites | bone metastases specimen | pressure sore stage | fungating breast tumour"
},
"Phthisiology (Tuberculosis)": {
 "Epidemiology and transmission": "tuberculosis gross lung pathology | primary complex Ghon focus gross | tuberculosis cough droplets | miliary tuberculosis gross",
 "Diagnosis": "tuberculous lymphadenitis scrofula clinical | caseous necrosis gross | tuberculous cavity lung gross | tuberculin skin test Mantoux | sputum collection pot",
 "Treatment regimens": "tuberculosis tablets fixed dose combination | directly observed therapy DOT | drug induced jaundice | isoniazid neuropathy",
 "Drug-resistant TB": "tuberculosis cavity lung gross | fibrocaseous tuberculosis gross | respirator N95 mask",
 "Prevention": "BCG vaccination scar | BCG injection | tuberculosis ventilation | tuberculosis mask"
},
"Obstetrics & Gynaecology": {
 "Antenatal care": "gravid uterus gross | fundal height measurement | placenta gross normal | umbilical cord gross | fetus in utero gross | Leopold manoeuvres",
 "Labour and delivery": "partograph | vaginal delivery crowning | placenta delivered gross | episiotomy | caesarean section | forceps delivery",
 "Obstetric emergencies": "ectopic pregnancy gross ruptured tube | hydatidiform mole gross | placenta praevia gross | placental abruption gross | postpartum haemorrhage | uterine rupture gross | eclampsia",
 "Gynaecology": "uterine fibroids gross | ovarian cyst gross | ovarian cystadenoma gross | endometrial polyp gross | cervical cancer gross pathology | hysterectomy specimen | dermoid cyst gross",
 "Family planning": "intrauterine device IUD | contraceptive implant arm | combined oral contraceptive pill | condoms male female | tubal ligation"
},
"Urology": {
 "Urinary tract stones": "renal calculi specimen | staghorn calculus gross | bladder stone gross | ureteric stone | kidney stone types",
 "Prostate disease": "benign prostatic hyperplasia gross | prostate carcinoma gross | prostate gland gross anatomy | enlarged bladder hypertrophy trabeculation",
 "Urinary tract tumours": "bladder carcinoma gross | renal cell carcinoma gross | Wilms tumour gross | haematuria urine sample",
 "Urinary tract infection and obstruction": "hydronephrosis gross | pyelonephritis gross | pyonephrosis gross | urinary catheter | urine dipstick",
 "Male reproductive disorders": "testicular tumour gross | hydrocoele clinical | varicocele clinical | testicular torsion | phimosis | hypospadias clinical"
},
"Neurology": {
 "Stroke": "cerebral infarct gross pathology | intracerebral haemorrhage gross | subarachnoid haemorrhage gross | circle of Willis aneurysm gross | facial droop stroke",
 "Epilepsy": "hippocampal sclerosis gross | brain tumour gross | neurocysticercosis gross | tongue biting seizure",
 "Neuromuscular disease": "muscle wasting hands | foot drop clinical | Duchenne muscular dystrophy calf pseudohypertrophy | Gowers sign | ptosis myasthenia",
 "Headache": "meningitis brain gross | subarachnoid haemorrhage gross | pituitary tumour gross | temporal artery giant cell arteritis"
},
"General Surgery": {
 "Principles of surgery": "operating theatre | surgical scrubbing hand | wound closure sutures | surgical drain | surgical stapler",
 "Acute abdomen": "acute appendicitis gross | perforated peptic ulcer gross | bowel obstruction gross | strangulated hernia gross | intussusception gross | volvulus sigmoid gross | peritonitis gross",
 "Trauma": "ruptured spleen gross | liver laceration gross | pelvic fracture | stab wound abdomen | seat belt sign | burns clinical",
 "Breast and endocrine surgery": "breast carcinoma gross | fibroadenoma gross | goitre thyroid gross | thyroidectomy specimen | breast abscess | peau d'orange breast",
 "Urology": "renal calculi specimen | prostate hyperplasia gross | hydrocoele | bladder tumour gross | testicular tumour gross"
},
"Neurosurgery": {
 "Head injury": "subdural haematoma gross | extradural haematoma gross | skull fracture | cerebral contusion gross | diffuse axonal injury gross",
 "Raised intracranial pressure": "brain herniation gross | papilloedema | hydrocephalus gross | cerebral oedema gross | Cushing triad",
 "Spinal cord compression": "spinal cord compression gross | vertebral metastasis gross | spinal tuberculosis Pott disease | spinal cord gross anatomy | vertebral fracture gross",
 "Brain tumours": "glioblastoma gross | meningioma gross | pituitary adenoma gross | metastatic brain tumour gross | acoustic neuroma gross | craniotomy",
 "Hydrocephalus": "hydrocephalus infant clinical | hydrocephalus brain gross | ventriculoperitoneal shunt | spina bifida clinical | sunsetting eyes hydrocephalus"
},
"Paediatric Surgery": {
 "Congenital anomalies": "cleft lip clinical | cleft palate clinical | hypospadias | gastroschisis | omphalocele | spina bifida | imperforate anus | club foot talipes",
 "Neonatal surgical emergencies": "gastroschisis newborn | exomphalos | oesophageal atresia | intestinal atresia gross | necrotising enterocolitis gross | malrotation volvulus gross",
 "Hernias and the acute abdomen in children": "inguinal hernia infant clinical | umbilical hernia child | intussusception gross | pyloric stenosis olive | appendicitis child gross",
 "Paediatric trauma": "supracondylar fracture child | burns child | foreign body ingestion | child abuse bruising | greenstick fracture"
},
"Cardiothoracic Surgery": {
 "Chest trauma": "flail chest | tension pneumothorax | haemothorax chest drain | rib fractures gross | cardiac tamponade",
 "Coronary and valve surgery": "coronary artery bypass graft | saphenous vein graft harvest | mechanical heart valve | heart valve replacement surgery | open heart surgery",
 "Lung and pleural surgery": "lobectomy specimen | thoracotomy | pleurodesis | empyema drainage | lung resection specimen",
 "Thoracic outlet and mediastinum": "cervical rib | thymoma gross | mediastinal tumour gross | thoracic outlet syndrome | superior vena cava syndrome clinical"
},
"Orthopaedics": {
 "Fractures": "fracture reduction plaster cast | open fracture clinical | external fixator | intramedullary nail | femoral neck fracture gross | callus fracture healing gross",
 "Joint disease": "osteoarthritis joint gross specimen | rheumatoid arthritis hands | total hip replacement | knee replacement | septic arthritis knee | gout tophi",
 "Paediatric orthopaedics": "club foot talipes | developmental dysplasia of hip clinical | Perthes disease | scoliosis clinical | rickets bowed legs | osteomyelitis child"
},
"Paediatrics": {
 "Growth and development": "growth chart measurement | infant weighing scale | developmental milestones | head circumference measurement | primitive reflexes newborn",
 "Neonatology": "newborn jaundice phototherapy | premature baby incubator | kangaroo mother care | umbilical cord stump | neonatal resuscitation",
 "Childhood infections and immunisation": "measles rash child | chickenpox child | mumps child | BCG vaccination | oral polio vaccine drops | whooping cough child",
 "Nutrition": "kwashiorkor child | marasmus child | severe acute malnutrition MUAC | rickets child | vitamin A deficiency eye | breastfeeding",
 "Paediatric emergencies": "meningitis child clinical | severe dehydration child | status epilepticus child | foreign body airway child | burns child"
},
"Emergency Medicine": {
 "Resuscitation": "cardiopulmonary resuscitation | defibrillator AED | endotracheal intubation | bag valve mask | recovery position",
 "Shock": "capillary refill test | intravenous cannulation | haemorrhagic shock clinical | septic shock skin mottling | fluid resuscitation drip",
 "Poisoning": "snake bite clinical | organophosphate poisoning | activated charcoal | paracetamol overdose | scorpion sting",
 "Trauma care": "cervical collar spinal immobilisation | pelvic binder | chest drain | tourniquet haemorrhage | burn first aid | fracture splint"
},
"Ophthalmology & ENT": {
 "Common eye conditions": "cataract clinical | conjunctivitis clinical | trachoma trichiasis | pterygium | glaucoma optic disc | retinoblastoma leukocoria | xerophthalmia",
 "Ear, nose and throat conditions": "otitis media tympanic membrane | tonsillitis clinical | nasal polyps | epistaxis | tonsillectomy specimen | cholesteatoma | neck swelling lymph nodes"
}
};

/* ===================== ECG TRAINER: tracings by course and topic ===================== */
B.ecg = {
"Propaedeutics of Internal Diseases": {
 "ECG basics": "normal sinus rhythm electrocardiogram | normal 12-lead ECG | ECG waves and intervals P QRS T | ECG lead placement electrodes | Einthoven triangle ECG | ECG paper grid calibration | cardiac axis normal ECG | ECG rate calculation",
 "Cardiovascular examination": "sinus tachycardia ECG | sinus bradycardia ECG | atrial fibrillation ECG | premature ventricular contraction ECG | left ventricular hypertrophy ECG | pericarditis ECG",
 "Respiratory examination": "P pulmonale ECG | right axis deviation COPD ECG | pulmonary embolism ECG S1Q3T3 | multifocal atrial tachycardia ECG | right ventricular hypertrophy ECG",
 "Laboratory and instrumental methods": "Holter monitor ECG recording | exercise stress test ECG ST depression | ambulatory ECG monitoring | ECG artefact tremor | 12-lead ECG machine",
 "Symptoms and syndromes": "anterior STEMI ECG | inferior myocardial infarction ECG | unstable angina ST depression ECG | left bundle branch block ECG | complete heart block ECG | ventricular tachycardia ECG | syncope ECG bradycardia"
},
"Cardiology": {
 "Ischaemic heart disease": "anterior STEMI ECG | inferior myocardial infarction ECG | lateral myocardial infarction ECG | posterior myocardial infarction ECG | NSTEMI ST depression ECG | Wellens syndrome T wave ECG | hyperacute T waves ECG | pathological Q waves ECG | ST elevation evolution ECG | stable angina exercise ECG",
 "Heart failure": "left ventricular hypertrophy ECG | left bundle branch block ECG | atrial fibrillation rapid ventricular response ECG | dilated cardiomyopathy ECG | low voltage ECG | biventricular pacing ECG",
 "Arrhythmias and ECG": "sinus arrhythmia ECG | atrial fibrillation ECG | atrial flutter sawtooth ECG | supraventricular tachycardia ECG | AV nodal re-entrant tachycardia ECG | Wolff-Parkinson-White delta wave ECG | ventricular tachycardia ECG | torsades de pointes ECG | ventricular fibrillation ECG | first degree AV block ECG | Mobitz type 1 Wenckebach ECG | Mobitz type 2 ECG | complete heart block ECG | premature ventricular contractions bigeminy ECG | premature atrial contraction ECG | junctional rhythm ECG | paced rhythm ECG | sick sinus syndrome ECG | right bundle branch block ECG | left anterior fascicular block ECG",
 "Valvular and congenital heart disease": "P mitrale left atrial enlargement ECG | mitral stenosis atrial fibrillation ECG | right ventricular hypertrophy ECG | atrial septal defect ECG | tetralogy of Fallot ECG | aortic stenosis left ventricular strain ECG | infective endocarditis PR prolongation ECG",
 "Hypertension": "left ventricular hypertrophy strain pattern ECG | Sokolow-Lyon voltage criteria ECG | left atrial abnormality ECG | hypertensive heart disease ECG",
 "Cardiomyopathy, myocarditis and pericarditis": "hypertrophic cardiomyopathy ECG | pericarditis diffuse ST elevation PR depression ECG | pericardial effusion electrical alternans ECG | myocarditis ECG | Brugada syndrome ECG | arrhythmogenic right ventricular cardiomyopathy epsilon wave ECG | takotsubo ECG"
},
"ECG & Imaging Interpretation": {
 "ECG patterns": "normal sinus rhythm ECG | atrial fibrillation ECG | ventricular tachycardia ECG | STEMI ECG | left bundle branch block ECG | right bundle branch block ECG | complete heart block ECG | hyperkalaemia ECG | long QT ECG | pericarditis ECG | left ventricular hypertrophy ECG | Wolff-Parkinson-White ECG | pulmonary embolism ECG | axis deviation ECG",
},
"Internal Medicine": {
 "Cardiology": "anterior STEMI ECG | inferior myocardial infarction ECG | atrial fibrillation ECG | ventricular tachycardia ECG | complete heart block ECG | left bundle branch block ECG | pericarditis ECG",
 "Respiratory medicine": "pulmonary embolism ECG | P pulmonale COPD ECG | multifocal atrial tachycardia ECG | right ventricular hypertrophy ECG",
 "Nephrology": "hyperkalaemia ECG peaked T waves | hypokalaemia ECG U waves | hypocalcaemia ECG prolonged QT | hypercalcaemia ECG short QT | uraemic pericarditis ECG",
 "Endocrinology": "hyperthyroidism atrial fibrillation ECG | hypothyroidism bradycardia low voltage ECG | hypokalaemia ECG diabetic ketoacidosis | hyperkalaemia Addison ECG",
 "Infectious diseases": "myocarditis ECG | rheumatic fever PR prolongation ECG | diphtheria myocarditis heart block ECG | Chagas disease ECG right bundle branch block"
},
"Emergency Medicine": {
 "Resuscitation": "ventricular fibrillation ECG | pulseless ventricular tachycardia ECG | asystole ECG | pulseless electrical activity ECG | torsades de pointes ECG | cardiac arrest rhythm strip",
 "Shock": "sinus tachycardia ECG | cardiogenic shock STEMI ECG | pulmonary embolism ECG | cardiac tamponade electrical alternans ECG",
 "Poisoning": "tricyclic antidepressant overdose ECG wide QRS | digoxin toxicity ECG scooped ST | organophosphate poisoning ECG QT | beta blocker overdose bradycardia ECG | hyperkalaemia ECG",
 "Trauma care": "hypothermia Osborn J wave ECG | myocardial contusion ECG | hyperkalaemia crush injury ECG | commotio cordis ECG"
},
"Clinical Pharmacology": {
 "Drug interactions": "QT prolongation drug induced ECG | torsades de pointes ECG | digoxin toxicity ECG | verapamil beta blocker heart block ECG",
 "Adverse drug reactions": "drug induced long QT ECG | digoxin effect ECG scooped ST | tricyclic antidepressant ECG | amiodarone ECG | antiarrhythmic proarrhythmia ECG",
 "Prescribing in special groups": "elderly bradycardia ECG | QT interval measurement ECG | renal failure hyperkalaemia ECG",
 "Therapeutic drug monitoring": "digoxin level ECG | QT interval measurement ECG | lithium toxicity ECG",
 "Rational use of antibiotics": "macrolide QT prolongation ECG | fluoroquinolone QT ECG | chloroquine QT ECG | hydroxychloroquine QT ECG"
},
"Nephrology": {
 "Acute kidney injury": "hyperkalaemia ECG peaked T waves | hyperkalaemia sine wave ECG | acute kidney injury ECG | hypocalcaemia ECG",
 "Chronic kidney disease": "left ventricular hypertrophy ECG | uraemic pericarditis ECG | hyperkalaemia ECG | long QT hypocalcaemia ECG",
 "Glomerular disease": "hypertensive heart disease ECG | nephrotic syndrome ECG low voltage | pericardial effusion ECG",
 "Electrolyte and acid-base disorders": "hyperkalaemia ECG | hypokalaemia ECG U wave | hypocalcaemia ECG | hypercalcaemia ECG | hypomagnesaemia ECG | hypermagnesaemia ECG",
 "Dialysis and transplantation": "hyperkalaemia pre dialysis ECG | post dialysis ECG | arrhythmia dialysis ECG | uraemic pericarditis ECG"
},
"Endocrinology": {
 "Diabetes mellitus": "silent myocardial infarction diabetes ECG | hypokalaemia DKA ECG | hyperkalaemia ECG | hypoglycaemia ECG",
 "Thyroid disease": "thyrotoxicosis atrial fibrillation ECG | sinus tachycardia hyperthyroid ECG | hypothyroidism low voltage bradycardia ECG",
 "Adrenal and pituitary disorders": "Addison disease hyperkalaemia ECG | Conn syndrome hypokalaemia ECG | phaeochromocytoma ECG | Cushing syndrome ECG",
 "Metabolic bone disease": "hypercalcaemia short QT ECG | hypocalcaemia long QT ECG | hyperparathyroidism ECG",
 "Obesity": "low voltage ECG obesity | left axis deviation obesity ECG | sleep apnoea atrial fibrillation ECG"
},
"Geriatrics": {
 "Ageing physiology": "sinus bradycardia elderly ECG | first degree AV block elderly ECG | bundle branch block elderly ECG | normal ECG elderly",
 "Falls and frailty": "syncope bradyarrhythmia ECG | sick sinus syndrome ECG | complete heart block ECG | long pause ECG | atrial fibrillation ECG",
 "Dementia and delirium": "atrial fibrillation stroke ECG | QT prolongation antipsychotic ECG",
 "Polypharmacy": "digoxin toxicity ECG | QT prolonging drugs ECG | beta blocker bradycardia ECG",
 "Palliative and end-of-life care": "agonal rhythm ECG | dying heart rhythm ECG | bradycardia terminal ECG"
},
"Physiology": {
 "Cell and membrane physiology": "cardiac action potential ECG correlation | pacemaker potential sinoatrial node | membrane potential action potential",
 "Cardiovascular": "normal sinus rhythm ECG | cardiac cycle ECG Wiggers diagram | ECG waves and intervals P QRS T | cardiac axis normal ECG | heart rate variability respiratory sinus arrhythmia ECG | cardiac conduction system",
 "Respiratory": "respiratory sinus arrhythmia ECG | pulmonary hypertension ECG",
 "Renal and fluids": "hyperkalaemia ECG | hypokalaemia ECG | hypocalcaemia ECG",
 "Gastrointestinal": "vagal bradycardia ECG",
 "Endocrine": "thyroid ECG hyperthyroid | hypokalaemia ECG",
 "Nervous system": "vagal stimulation bradycardia ECG | autonomic nervous system heart rate ECG | sympathetic tachycardia ECG"
},
"Medical Physics & Biophysics": {
 "Bioelectricity and membrane potentials": "Einthoven triangle ECG | ECG waves and intervals | cardiac dipole vector ECG | cardiac action potential | ECG lead placement electrodes | vectorcardiogram",
 "Medical imaging physics": "ECG gated cardiac CT | echocardiography ECG | ECG machine amplifier",
 "Acoustics and ultrasound": "echocardiography ECG trace | phonocardiogram ECG | Doppler echocardiography",
 "Mechanics and fluid flow in the body": "pulse wave arterial pressure | cardiac cycle pressure volume loop | phonocardiogram"
},
"Clinical Skills": {
 "Examination of systems": "pulse examination radial | normal sinus rhythm ECG | irregularly irregular pulse ECG",
 "Procedures": "12-lead ECG recording electrode placement | ECG lead placement electrodes | ECG machine | rhythm strip",
 "Interpreting investigations": "normal 12-lead ECG | ECG interpretation approach | atrial fibrillation ECG | anterior STEMI ECG | hyperkalaemia ECG | ECG axis determination"
}
};

window.SLIDEBANK_PART2 = B;
})();

/* ===================== IMAGING TRAINER: X-ray, CT, MRI, ultrasound by course and topic ===================== */
(function () {
const B = window.SLIDEBANK_PART2;
B.rad = {
"Basic Radiology & Imaging": {
 "X-ray principles": "normal chest radiograph PA | normal abdominal radiograph | normal skull X-ray | normal pelvis X-ray | normal hand X-ray | normal knee X-ray | X-ray densities five basic radiographic densities | chest X-ray lateral view normal",
 "Ultrasound": "normal abdominal ultrasound | normal liver ultrasound | normal kidney ultrasound | normal gallbladder ultrasound | obstetric ultrasound first trimester | fetal ultrasound | FAST ultrasound | echocardiography four chamber view | thyroid ultrasound",
 "CT and MRI basics": "normal CT head | normal CT chest | normal CT abdomen | normal MRI brain T1 T2 | normal MRI knee | normal MRI spine | CT versus MRI comparison | CT window lung mediastinum",
 "Radiation safety": "lead apron radiation protection | radiation warning symbol | dosimeter badge | radiation shielding X-ray room | ALARA radiation protection | thyroid shield"
},
"ECG & Imaging Interpretation": {
 "Chest X-ray": "normal chest radiograph | pneumonia chest X-ray | pneumothorax chest X-ray | tension pneumothorax chest X-ray | pleural effusion chest X-ray | pulmonary tuberculosis chest X-ray | cardiomegaly chest X-ray | pulmonary oedema chest X-ray | lung cancer chest X-ray | collapse lobar chest X-ray | hiatus hernia chest X-ray | widened mediastinum chest X-ray",
 "Abdominal imaging": "small bowel obstruction abdominal X-ray | large bowel obstruction abdominal X-ray | pneumoperitoneum X-ray | sigmoid volvulus X-ray | toxic megacolon X-ray | renal stones abdominal X-ray | gallstones ultrasound | appendicitis ultrasound | abdominal CT",
 "CT and ultrasound basics": "subdural haematoma CT | ischaemic stroke CT | intracerebral haemorrhage CT | pulmonary embolism CT angiography | appendicitis CT | liver ultrasound | hydronephrosis ultrasound | obstetric ultrasound",
},
"Anatomy": {
 "Upper limb": "shoulder X-ray normal | humerus X-ray normal | elbow X-ray normal | wrist X-ray normal | hand X-ray normal | shoulder MRI normal | elbow MRI normal",
 "Lower limb": "pelvis X-ray normal | hip X-ray normal | knee X-ray normal | ankle X-ray normal | foot X-ray normal | knee MRI normal | hip MRI normal",
 "Thorax": "normal chest radiograph | CT chest normal anatomy | heart chest X-ray borders | CT mediastinum normal | MRI heart normal | chest X-ray lateral normal",
 "Abdomen and pelvis": "CT abdomen normal anatomy | abdominal X-ray normal | abdominal ultrasound normal | MRI pelvis normal | barium meal normal | intravenous urogram normal",
 "Head and neck": "skull X-ray normal | CT head normal | MRI brain normal sagittal | cervical spine X-ray normal | orthopantomogram dental | CT paranasal sinuses normal | neck ultrasound",
 "Neuroanatomy": "MRI brain axial normal | MRI brain sagittal midline | CT brain normal | MRI brain coronal | cerebral angiography normal | MRI spinal cord normal"
},
"Medical Physics & Biophysics": {
 "Radiation physics and dosimetry": "X-ray tube diagram | radiation dosimeter badge | lead apron radiation protection | radiation warning symbol | X-ray spectrum",
 "Medical imaging physics": "X-ray machine | CT scanner gantry | MRI scanner | gamma camera | PET scan | CT versus MRI comparison | MRI T1 T2 weighted comparison",
 "Acoustics and ultrasound": "ultrasound transducer probe | Doppler ultrasound | abdominal ultrasound normal | echocardiography | ultrasound artefact acoustic shadow"
},
"Pulmonology": {
 "Asthma and COPD": "COPD chest X-ray hyperinflation | emphysema chest X-ray | emphysema CT bullae | asthma chest X-ray normal | bronchiectasis CT",
 "Pneumonia": "lobar pneumonia chest X-ray | bronchopneumonia chest X-ray | pneumonia CT | lung abscess chest X-ray | atypical pneumonia chest X-ray | pneumocystis chest X-ray",
 "Pleural disease": "pleural effusion chest X-ray | pleural effusion ultrasound | pneumothorax chest X-ray | tension pneumothorax chest X-ray | empyema CT | pleural plaques asbestos chest X-ray | hydropneumothorax chest X-ray",
 "Interstitial lung disease": "pulmonary fibrosis chest X-ray | usual interstitial pneumonia HRCT | sarcoidosis chest X-ray hilar lymphadenopathy | silicosis chest X-ray | honeycombing CT | miliary pattern chest X-ray",
 "Pulmonary embolism and hypertension": "pulmonary embolism CT angiography | pulmonary embolism chest X-ray Westermark | pulmonary hypertension chest X-ray | V/Q scan pulmonary embolism | pulmonary artery enlargement chest X-ray",
 "Lung cancer": "lung cancer chest X-ray | lung cancer CT | solitary pulmonary nodule chest X-ray | lung metastases chest X-ray cannonball | hilar mass chest X-ray | pleural effusion malignant chest X-ray"
},
"Cardiology": {
 "Ischaemic heart disease": "coronary angiography | coronary CT calcium | myocardial perfusion scan | chest X-ray normal heart | cardiac MRI infarct",
 "Heart failure": "cardiomegaly chest X-ray | pulmonary oedema chest X-ray | Kerley B lines chest X-ray | pleural effusion heart failure chest X-ray | echocardiography dilated left ventricle",
 "Arrhythmias and ECG": "pacemaker chest X-ray | implantable cardioverter defibrillator chest X-ray | echocardiography left atrium | chest X-ray atrial enlargement",
 "Valvular and congenital heart disease": "mitral stenosis chest X-ray | echocardiography mitral stenosis | aortic stenosis echocardiography | tetralogy of Fallot chest X-ray boot shaped | patent ductus arteriosus chest X-ray | atrial septal defect chest X-ray | prosthetic heart valve chest X-ray",
 "Hypertension": "hypertensive heart chest X-ray | aortic dissection CT | aortic dissection chest X-ray | left ventricular hypertrophy echocardiography | coarctation of aorta chest X-ray rib notching",
 "Cardiomyopathy, myocarditis and pericarditis": "dilated cardiomyopathy chest X-ray | hypertrophic cardiomyopathy echocardiography | pericardial effusion echocardiography | pericardial effusion chest X-ray water bottle | constrictive pericarditis CT calcification | cardiac MRI myocarditis"
},
"Gastroenterology & Hepatology": {
 "Oesophagus and stomach": "barium swallow oesophagus normal | achalasia barium swallow | oesophageal carcinoma barium | hiatus hernia chest X-ray | barium meal gastric ulcer | gastric cancer CT",
 "Inflammatory bowel disease": "Crohn disease barium small bowel | ulcerative colitis barium enema | toxic megacolon abdominal X-ray | Crohn disease CT enterography | lead pipe colon",
 "Liver disease and cirrhosis": "cirrhosis ultrasound | cirrhosis CT | fatty liver ultrasound | hepatocellular carcinoma CT | liver metastases CT | liver abscess ultrasound | ascites ultrasound",
 "Pancreas and biliary disease": "gallstones ultrasound | acute cholecystitis ultrasound | pancreatitis CT | pancreatic cancer CT | ERCP cholangiogram | choledocholithiasis MRCP",
 "GI bleeding": "angiography GI bleeding | CT angiography gastrointestinal bleeding | barium enema polyp | varices endoscopy | colon cancer barium enema apple core"
},
"Nephrology": {
 "Acute kidney injury": "hydronephrosis ultrasound | renal ultrasound normal | obstructive uropathy CT | renal vein thrombosis CT | kidney ultrasound doppler",
 "Chronic kidney disease": "small kidneys ultrasound chronic kidney disease | polycystic kidney ultrasound | polycystic kidney CT | renal ultrasound echogenic",
 "Glomerular disease": "renal ultrasound normal | kidney ultrasound echogenic cortex | intravenous urogram normal | nephrotic syndrome ascites ultrasound",
 "Electrolyte and acid-base disorders": "nephrocalcinosis X-ray | renal stones abdominal X-ray | chest X-ray fluid overload | rickets X-ray",
 "Dialysis and transplantation": "renal transplant ultrasound | arteriovenous fistula ultrasound | peritoneal dialysis catheter X-ray | renal angiography | renal scintigraphy"
},
"Urology": {
 "Urinary tract stones": "renal stones abdominal X-ray | kidney stone CT | staghorn calculus X-ray | kidney stone ultrasound | intravenous urogram stone | ureteric stone CT",
 "Prostate disease": "prostate ultrasound transrectal | prostate MRI | benign prostatic hyperplasia ultrasound | bone scan prostate metastases | pelvis X-ray sclerotic metastases",
 "Urinary tract tumours": "bladder cancer CT | bladder ultrasound tumour | renal cell carcinoma CT | renal tumour ultrasound | intravenous urogram filling defect",
 "Urinary tract infection and obstruction": "hydronephrosis ultrasound | pyelonephritis CT | micturating cystourethrogram vesicoureteric reflux | pyonephrosis ultrasound | emphysematous pyelonephritis CT",
 "Male reproductive disorders": "testicular ultrasound normal | testicular tumour ultrasound | hydrocoele ultrasound | varicocele ultrasound | testicular torsion doppler ultrasound"
},
"Neurology": {
 "Stroke": "ischaemic stroke CT | ischaemic stroke MRI diffusion | intracerebral haemorrhage CT | subarachnoid haemorrhage CT | cerebral angiography aneurysm | carotid ultrasound stenosis",
 "Epilepsy": "MRI brain hippocampal sclerosis | CT brain tumour | neurocysticercosis CT | EEG epilepsy",
 "Neuromuscular disease": "MRI spine cord | MRI muscle | nerve conduction study | MRI brain demyelination",
 "Headache": "CT brain normal | MRI brain pituitary adenoma | subarachnoid haemorrhage CT | MRI brain tumour | venous sinus thrombosis CT"
},
"Neurosurgery": {
 "Head injury": "extradural haematoma CT | subdural haematoma CT | skull fracture X-ray | cerebral contusion CT | diffuse axonal injury MRI | depressed skull fracture CT",
 "Raised intracranial pressure": "hydrocephalus CT | cerebral oedema CT | midline shift CT | brain herniation CT | brain tumour CT mass effect",
 "Spinal cord compression": "spinal cord compression MRI | vertebral metastasis MRI | Pott disease spine X-ray | vertebral fracture X-ray | disc prolapse MRI | cervical spine fracture X-ray",
 "Brain tumours": "glioblastoma MRI | meningioma MRI | pituitary adenoma MRI | brain metastases MRI | acoustic neuroma MRI | brain tumour CT",
 "Hydrocephalus": "hydrocephalus CT | hydrocephalus MRI | ventriculoperitoneal shunt X-ray | infant cranial ultrasound hydrocephalus | Dandy-Walker MRI"
},
"Orthopaedics": {
 "Fractures": "Colles fracture X-ray | hip fracture X-ray | femoral shaft fracture X-ray | scaphoid fracture X-ray | tibial fracture X-ray | supracondylar fracture X-ray | clavicle fracture X-ray | vertebral compression fracture X-ray | open fracture external fixator X-ray",
 "Joint disease": "osteoarthritis knee X-ray | rheumatoid arthritis hands X-ray | gout X-ray punched out erosions | septic arthritis hip X-ray | hip replacement X-ray | knee MRI meniscal tear | osteonecrosis femoral head X-ray",
 "Paediatric orthopaedics": "developmental dysplasia of hip X-ray | developmental dysplasia of hip ultrasound | Perthes disease X-ray | slipped upper femoral epiphysis X-ray | club foot X-ray | scoliosis X-ray | rickets X-ray | osteomyelitis child X-ray"
},
"Rheumatology": {
 "Rheumatoid arthritis": "rheumatoid arthritis hands X-ray | rheumatoid arthritis feet X-ray | rheumatoid arthritis MRI | atlantoaxial subluxation X-ray",
 "SLE and connective tissue disease": "scleroderma hands X-ray calcinosis | lupus arthritis X-ray | interstitial lung disease HRCT scleroderma | pericardial effusion SLE",
 "Gout and crystal arthropathy": "gout hands X-ray | gout foot X-ray | chondrocalcinosis knee X-ray | gouty tophus CT dual energy",
 "Vasculitis": "angiography vasculitis | Takayasu arteritis CT angiography | giant cell arteritis ultrasound halo | polyarteritis nodosa angiography aneurysms",
 "Spondyloarthropathies": "ankylosing spondylitis spine X-ray bamboo | sacroiliitis X-ray | sacroiliitis MRI | psoriatic arthritis hands X-ray pencil in cup | reactive arthritis X-ray"
},
"Endocrinology": {
 "Diabetes mellitus": "diabetic foot X-ray osteomyelitis | Charcot foot X-ray | diabetic foot MRI | emphysematous cholecystitis CT",
 "Thyroid disease": "thyroid ultrasound nodule | goitre chest X-ray tracheal deviation | thyroid scintigraphy Graves | thyroid scintigraphy hot nodule | retrosternal goitre CT",
 "Adrenal and pituitary disorders": "pituitary adenoma MRI | adrenal adenoma CT | phaeochromocytoma CT | adrenal MRI | skull X-ray pituitary fossa",
 "Metabolic bone disease": "osteoporosis X-ray | bone density DEXA scan | Paget disease skull X-ray | rickets X-ray | osteomalacia Looser zones X-ray | hyperparathyroidism hand X-ray subperiosteal resorption",
 "Obesity": "fatty liver ultrasound | abdominal CT visceral fat | knee osteoarthritis X-ray | gallstones ultrasound"
},
"Haematology": {
 "Anaemias": "thalassaemia skull X-ray hair on end | thalassaemia chest X-ray | iron deficiency barium meal | splenomegaly ultrasound",
 "Leukaemias and lymphomas": "lymphoma CT chest mediastinal mass | lymphoma chest X-ray | lymphoma CT abdomen | PET CT lymphoma | leukaemia chest X-ray",
 "Bleeding and clotting disorders": "haemophilia knee X-ray arthropathy | haemarthrosis knee MRI | intracranial haemorrhage CT | haematoma CT",
 "Transfusion medicine": "chest X-ray transfusion related lung injury | pulmonary oedema chest X-ray | central venous catheter chest X-ray",
 "Sickle cell disease": "sickle cell hand foot syndrome X-ray | sickle cell avascular necrosis hip X-ray | sickle cell chest X-ray | sickle cell vertebrae H shaped X-ray | sickle cell spleen CT"
},
"Infectious Diseases": {
 "Fever and sepsis": "chest X-ray pneumonia sepsis | abdominal CT abscess | liver abscess ultrasound | brain abscess CT | echocardiography vegetation endocarditis",
 "Respiratory and enteric infections": "pneumonia chest X-ray | tuberculosis chest X-ray | amoebic liver abscess ultrasound | typhoid ileal perforation X-ray | pneumoperitoneum X-ray",
 "HIV and sexually transmitted infections": "Pneumocystis pneumonia chest X-ray | HIV tuberculosis chest X-ray | cerebral toxoplasmosis CT | cryptococcal meningitis CT | lymphoma HIV CT | Kaposi sarcoma chest X-ray",
 "Viral hepatitis": "liver ultrasound cirrhosis | hepatocellular carcinoma CT | acute hepatitis ultrasound gallbladder wall thickening | ascites ultrasound",
 "Tropical diseases": "hydatid cyst liver ultrasound | hydatid cyst CT | neurocysticercosis CT | schistosomiasis periportal fibrosis ultrasound | amoebic liver abscess CT | mycetoma X-ray | filariasis ultrasound filarial dance sign | Pott disease spine X-ray",
 "Antimicrobial stewardship": "chest X-ray resolving pneumonia | abscess CT drainage | osteomyelitis MRI | lung abscess chest X-ray"
},
"Phthisiology (Tuberculosis)": {
 "Epidemiology and transmission": "pulmonary tuberculosis chest X-ray | primary tuberculosis Ghon complex chest X-ray | miliary tuberculosis chest X-ray | tuberculosis hilar lymphadenopathy chest X-ray",
 "Diagnosis": "tuberculosis cavity chest X-ray | tuberculosis CT chest | tree in bud CT tuberculosis | tuberculous pleural effusion chest X-ray | tuberculous pericarditis echocardiography | Pott disease MRI",
 "Treatment regimens": "tuberculosis chest X-ray before treatment | tuberculosis chest X-ray healing fibrosis | tuberculosis chest X-ray follow up",
 "Drug-resistant TB": "cavitary tuberculosis chest X-ray | multidrug resistant tuberculosis chest X-ray | fibrocavitary tuberculosis CT | destroyed lung tuberculosis X-ray",
 "Prevention": "tuberculosis screening chest X-ray | computer aided detection chest X-ray | tuberculosis contact screening chest X-ray"
},
"Oncology": {
 "Cancer biology and screening": "mammogram normal | mammogram breast cancer | low dose CT lung cancer screening | colonoscopy polyp | cervical cancer screening",
 "Common cancers": "breast cancer mammogram | lung cancer CT | colon cancer barium enema | liver metastases CT | prostate cancer bone scan | hepatocellular carcinoma CT | gastric cancer CT | cervical cancer MRI | lymphoma CT",
 "Chemotherapy, radiotherapy and surgery": "radiotherapy planning CT | PET CT response | linear accelerator radiotherapy | radiation pneumonitis chest X-ray | implanted port chest X-ray",
 "Palliative care": "bone metastases X-ray | bone scan metastases | brain metastases CT | pathological fracture X-ray | spinal cord compression MRI"
},
"Emergency Medicine": {
 "Resuscitation": "endotracheal tube chest X-ray position | central line chest X-ray position | nasogastric tube chest X-ray | chest X-ray cardiac arrest",
 "Shock": "FAST ultrasound free fluid | echocardiography shock | inferior vena cava ultrasound | chest X-ray tension pneumothorax | CT abdomen haemorrhage",
 "Poisoning": "chest X-ray aspiration | abdominal X-ray tablets | CT brain overdose | pulmonary oedema chest X-ray",
 "Trauma care": "pelvic fracture X-ray | cervical spine X-ray trauma | trauma CT pan scan | FAST ultrasound trauma | rib fractures chest X-ray | pneumothorax chest X-ray trauma | splenic laceration CT | liver laceration CT"
},
"Paediatrics": {
 "Growth and development": "bone age hand X-ray | hand wrist X-ray growth plates | rickets X-ray | growth plate X-ray child",
 "Neonatology": "respiratory distress syndrome chest X-ray neonate | necrotising enterocolitis abdominal X-ray | neonatal cranial ultrasound | transient tachypnoea newborn chest X-ray | meconium aspiration chest X-ray | hip ultrasound infant",
 "Childhood infections and immunisation": "pneumonia child chest X-ray | bronchiolitis chest X-ray | croup steeple sign neck X-ray | epiglottitis thumb sign X-ray | tuberculosis child chest X-ray | osteomyelitis child X-ray",
 "Nutrition": "rickets X-ray wrist | scurvy X-ray | kwashiorkor chest X-ray | malnutrition abdominal X-ray",
 "Paediatric emergencies": "foreign body airway child X-ray | foreign body ingestion child X-ray | intussusception ultrasound target sign | pyloric stenosis ultrasound | skull fracture child X-ray | button battery ingestion X-ray"
},
"Paediatric Surgery": {
 "Congenital anomalies": "oesophageal atresia X-ray | duodenal atresia double bubble X-ray | Hirschsprung disease contrast enema | congenital diaphragmatic hernia X-ray | spina bifida ultrasound | imperforate anus X-ray",
 "Neonatal surgical emergencies": "duodenal atresia double bubble X-ray | necrotising enterocolitis abdominal X-ray pneumatosis | malrotation volvulus upper GI contrast | gastroschisis antenatal ultrasound | congenital diaphragmatic hernia chest X-ray",
 "Hernias and the acute abdomen in children": "intussusception ultrasound | intussusception contrast enema | pyloric stenosis ultrasound | appendicitis child ultrasound | inguinal hernia ultrasound",
 "Paediatric trauma": "supracondylar fracture child X-ray | greenstick fracture X-ray | skull fracture child X-ray | child abuse skeletal survey X-ray | foreign body ingestion X-ray"
},
"Cardiothoracic Surgery": {
 "Chest trauma": "rib fractures chest X-ray | flail chest X-ray | haemothorax chest X-ray | pneumothorax chest X-ray | aortic injury chest X-ray | pulmonary contusion CT",
 "Coronary and valve surgery": "coronary angiography | CABG chest X-ray sternal wires | prosthetic valve chest X-ray | echocardiography aortic valve | coronary CT angiography",
 "Lung and pleural surgery": "lobectomy chest X-ray | pneumonectomy chest X-ray | empyema CT | pleural effusion ultrasound | chest drain chest X-ray | lung cancer CT",
 "Thoracic outlet and mediastinum": "cervical rib X-ray | thymoma CT | mediastinal mass chest X-ray | anterior mediastinal mass CT | widened mediastinum chest X-ray"
},
"Obstetrics & Gynaecology": {
 "Antenatal care": "obstetric ultrasound first trimester | obstetric ultrasound anomaly scan | nuchal translucency ultrasound | fetal biometry ultrasound | placenta ultrasound | twin pregnancy ultrasound",
 "Labour and delivery": "cervical length ultrasound | cephalopelvimetry X-ray pelvis | fetal presentation ultrasound | breech presentation ultrasound | cardiotocography",
 "Obstetric emergencies": "ectopic pregnancy ultrasound | placenta praevia ultrasound | placental abruption ultrasound | hydatidiform mole ultrasound snowstorm | retained products of conception ultrasound",
 "Gynaecology": "uterine fibroids ultrasound | ovarian cyst ultrasound | polycystic ovary ultrasound | endometrial thickness ultrasound | hysterosalpingogram | pelvic MRI cervical cancer | ovarian cancer CT",
 "Family planning": "intrauterine device ultrasound | IUD X-ray | hysterosalpingogram | contraceptive implant ultrasound"
},
"General Surgery": {
 "Principles of surgery": "chest X-ray preoperative | surgical drain X-ray | retained surgical instrument X-ray | postoperative chest X-ray",
 "Acute abdomen": "small bowel obstruction abdominal X-ray | pneumoperitoneum erect chest X-ray | appendicitis CT | appendicitis ultrasound | sigmoid volvulus X-ray | acute cholecystitis ultrasound | diverticulitis CT | mesenteric ischaemia CT",
 "Trauma": "FAST ultrasound | splenic laceration CT | liver laceration CT | pelvic fracture X-ray | pneumothorax chest X-ray trauma | CT abdomen trauma",
 "Breast and endocrine surgery": "mammogram normal | breast cancer mammogram | breast ultrasound fibroadenoma | breast ultrasound cyst | thyroid ultrasound nodule | goitre chest X-ray",
 "Urology": "renal stones abdominal X-ray | kidney stone CT | hydronephrosis ultrasound | bladder tumour ultrasound | testicular ultrasound"
},
"Internal Medicine": {
 "Cardiology": "cardiomegaly chest X-ray | pulmonary oedema chest X-ray | echocardiography normal | coronary angiography | pericardial effusion echocardiography | mitral stenosis chest X-ray",
 "Respiratory medicine": "pneumonia chest X-ray | pleural effusion chest X-ray | pneumothorax chest X-ray | lung cancer chest X-ray | pulmonary tuberculosis chest X-ray | COPD chest X-ray",
 "Gastroenterology": "liver ultrasound cirrhosis | gallstones ultrasound | small bowel obstruction X-ray | Crohn disease barium | barium swallow | pancreatitis CT",
 "Nephrology": "hydronephrosis ultrasound | polycystic kidney ultrasound | small kidneys ultrasound | renal stones X-ray | renal artery stenosis angiography",
 "Endocrinology": "thyroid ultrasound | pituitary adenoma MRI | adrenal adenoma CT | goitre chest X-ray | DEXA bone density",
 "Infectious diseases": "tuberculosis chest X-ray | Pneumocystis chest X-ray | liver abscess ultrasound | hydatid cyst ultrasound | neurocysticercosis CT",
 "Haematology": "lymphoma CT | mediastinal mass chest X-ray | splenomegaly ultrasound | thalassaemia skull X-ray | myeloma skull X-ray pepper pot | sickle cell hip X-ray"
},
"Ophthalmology & ENT": {
 "Common eye conditions": "orbital CT | orbital cellulitis CT | optic nerve MRI | fundus photograph normal retina | fundus photograph diabetic retinopathy | optical coherence tomography retina | orbit X-ray foreign body",
 "Ear, nose and throat conditions": "sinus X-ray sinusitis | CT paranasal sinuses sinusitis | mastoid CT | neck X-ray soft tissue epiglottitis | CT neck abscess | thyroid ultrasound | temporal bone CT"
},
"Dermatology & Radiology": {
 "Common skin diseases": "skin ultrasound | soft tissue ultrasound abscess | MRI soft tissue mass | foreign body soft tissue X-ray",
 "Imaging basics": "normal chest radiograph | normal abdominal ultrasound | normal CT head | normal MRI brain | normal hand X-ray | X-ray machine | CT scanner | MRI scanner"
},
"Forensic Medicine": {
 "Medico-legal practice": "gunshot wound X-ray bullet | skeletal survey child abuse X-ray | fracture healing X-ray ageing | postmortem CT | foreign body X-ray",
 "Death and certification": "postmortem CT | bone age X-ray | dental X-ray orthopantomogram age estimation | identification X-ray comparison"
},
"Propaedeutics of Internal Diseases": {
 "Laboratory and instrumental methods": "normal chest radiograph | normal abdominal ultrasound | echocardiography normal | barium meal normal | normal CT chest | normal intravenous urogram | spirometry flow volume loop | endoscopy normal stomach"
}
};

window.SLIDEBANK = B;
})();

/* ===================== ANATOMY 3D: model searches by course and topic ===================== */
(function () {
const B = window.SLIDEBANK;
B.anat = {
"Anatomy": {
 "Upper limb": "shoulder joint | humerus | scapula | clavicle | forearm bones radius ulna | hand bones | arm muscles | brachial plexus",
 "Lower limb": "pelvis | femur | hip joint | knee joint | tibia fibula | foot bones | thigh muscles | leg muscles",
 "Thorax": "ribcage | sternum | heart | lungs | thoracic vertebrae | diaphragm | mediastinum | trachea bronchi",
 "Abdomen and pelvis": "stomach | liver | kidney | intestines | pancreas spleen | pelvis female | pelvis male | urinary bladder",
 "Head and neck": "skull | mandible | larynx | tongue | eye | ear | cervical spine | facial muscles",
 "Neuroanatomy": "brain | brainstem | cerebellum | spinal cord | nervous system | cranial nerves | ventricles brain | circle of Willis"
},
"Neuroscience": {
 "Neuron and synapse": "neuron | synapse | nervous system | myelin axon",
 "Sensory systems": "eye | inner ear cochlea | skin sensory receptors | tongue taste",
 "Motor systems": "brain motor cortex | spinal cord | cerebellum | basal ganglia",
 "Cranial nerves": "cranial nerves | brainstem | skull base | optic nerve",
 "Higher functions": "brain lobes | hippocampus limbic system | cerebral cortex | thalamus hypothalamus"
},
"Histology & Embryology": {
 "Basic tissues": "bone tissue | muscle fibre | cartilage | skin layers",
 "Organ system histology": "skin | liver lobule | kidney nephron | lung alveoli | villi small intestine",
 "General embryology": "embryo development | fertilisation | blastocyst | placenta",
 "Systemic embryology": "fetal heart development | embryo gut | fetus | neural tube"
},
"Operative Surgery & Topographic Anatomy": {
 "Surgical instruments and suturing": "surgical instruments | scalpel | forceps",
 "Topographic anatomy of the head and neck": "neck | thyroid gland | larynx trachea | carotid artery",
 "Chest and abdomen": "thorax | abdomen organs | abdominal wall | diaphragm",
 "Limbs and vascular access": "arm veins arteries | leg veins arteries | femoral artery | hand",
 "Basic operations": "appendix | gallbladder | hernia | intestines",
 "Surgical approaches": "abdomen layers | thorax | pelvis | spine"
},
"Cardiology": {
 "Ischaemic heart disease": "heart coronary arteries | heart | blood vessels",
 "Heart failure": "heart chambers | heart | lungs",
 "Arrhythmias and ECG": "heart conduction system | heart | heart chambers",
 "Valvular and congenital heart disease": "heart valves | heart | congenital heart defect",
 "Hypertension": "aorta | blood vessels | kidney | heart",
 "Cardiomyopathy, myocarditis and pericarditis": "heart | pericardium | heart chambers"
},
"Pulmonology": {
 "Asthma and COPD": "lungs | bronchi | respiratory system",
 "Pneumonia": "lungs | respiratory system | bronchi",
 "Pleural disease": "lungs pleura | ribcage | thorax",
 "Interstitial lung disease": "lungs | alveoli | respiratory system",
 "Pulmonary embolism and hypertension": "pulmonary artery | heart | lungs",
 "Lung cancer": "lungs | trachea bronchi | thorax"
},
"Gastroenterology & Hepatology": {
 "Oesophagus and stomach": "oesophagus | stomach | digestive system",
 "Inflammatory bowel disease": "intestines | colon | digestive system",
 "Liver disease and cirrhosis": "liver | biliary system | digestive system",
 "Pancreas and biliary disease": "pancreas | gallbladder | biliary tree",
 "GI bleeding": "stomach | intestines | digestive system"
},
"Nephrology": {
 "Acute kidney injury": "kidney | urinary system | nephron",
 "Chronic kidney disease": "kidney | urinary system",
 "Glomerular disease": "nephron | glomerulus | kidney",
 "Electrolyte and acid-base disorders": "kidney nephron | urinary system",
 "Dialysis and transplantation": "kidney | arteriovenous fistula | urinary system"
},
"Orthopaedics": {
 "Fractures": "skeleton | femur | humerus | pelvis | spine",
 "Joint disease": "knee joint | hip joint | shoulder joint | hand bones",
 "Paediatric orthopaedics": "hip joint | foot bones | spine scoliosis | skeleton child"
},
"Obstetrics & Gynaecology": {
 "Antenatal care": "pregnancy uterus fetus | placenta | female pelvis",
 "Labour and delivery": "female pelvis | fetal skull | birth canal",
 "Obstetric emergencies": "uterus | placenta | female pelvis",
 "Gynaecology": "uterus ovaries | female reproductive system | female pelvis",
 "Family planning": "female reproductive system | uterus | male reproductive system"
},
"Urology": {
 "Urinary tract stones": "kidney | ureter | urinary bladder",
 "Prostate disease": "prostate | male reproductive system | urinary bladder",
 "Urinary tract tumours": "kidney | urinary bladder | urinary system",
 "Urinary tract infection and obstruction": "urinary system | kidney | ureter",
 "Male reproductive disorders": "testis | male reproductive system | penis"
},
"Neurosurgery": {
 "Head injury": "skull | brain | meninges",
 "Raised intracranial pressure": "brain ventricles | brain | skull",
 "Spinal cord compression": "spine vertebrae | spinal cord | intervertebral disc",
 "Brain tumours": "brain | skull | pituitary",
 "Hydrocephalus": "brain ventricles | skull infant | brain"
}
};
})();
