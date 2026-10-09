// A library of structures for the compounds a medical student meets in chemistry and biochemistry, as SMILES.
// One line per compound:  name | other names ~ SMILES ~ formula (only used by the self-check in test-mol.mjs)
// Written the way the textbooks draw them: amino acids and organic acids neutral, metabolite acids as the ion at pH 7 (pyruvate, lactate, citrate...).
// {R} and {CoA} are labelled groups. Stereochemistry is not drawn.~ 
const RAW = `
# ---------- inorganic ----------
water | h2o | dihydrogen monoxide ~ O ~ H2O
carbon dioxide | co2 ~ O=C=O ~ CO2
carbon monoxide | co ~ [C-]#[O+] ~ CO
oxygen | o2 | molecular oxygen | dioxygen ~ O=O ~ O2
nitrogen | n2 | dinitrogen ~ N#N ~ N2
hydrogen | h2 | dihydrogen ~ [H][H] ~ H2
ammonia | nh3 ~ N ~ H3N
ammonium | ammonium ion | nh4+ ~ [NH4+] ~ H4N+
hydroxide | hydroxide ion | oh- ~ [OH-] ~ HO-
hydronium | hydronium ion | h3o+ ~ [OH3+] ~ H3O+
hydrogen peroxide | h2o2 ~ OO ~ H2O2
hydrogen chloride | hydrochloric acid | hcl ~ Cl ~ ClH
hydrogen sulfide | hydrogen sulphide | h2s ~ S ~ H2S
sulfur dioxide | sulphur dioxide | so2 ~ O=S=O ~ O2S
sulfur trioxide | so3 ~ O=S(=O)=O ~ O3S
nitrous oxide | n2o | laughing gas ~ [N-]=[N+]=O ~ N2O
nitric oxide | no ~ [N]=O ~ NO
nitrogen dioxide | no2 ~ [O-][N+]=O ~ NO2
ozone | o3 ~ [O-][O+]=O ~ O3
chlorine | cl2 ~ ClCl ~ Cl2
bromine | br2 ~ BrBr ~ Br2
iodine | i2 ~ II ~ I2
fluorine | f2 ~ FF ~ F2
hypochlorous acid | hocl ~ OCl ~ ClHO
hypochlorite | ocl- ~ [O-]Cl ~ ClO-
chloride | chloride ion | cl- ~ [Cl-] ~ Cl-
sodium ion | na+ | sodium ~ [Na+] ~ Na+
potassium ion | k+ | potassium ~ [K+] ~ K+
calcium ion | ca2+ | calcium ~ [Ca+2] ~ Ca+2
magnesium ion | mg2+ | magnesium ~ [Mg+2] ~ Mg+2
iron(ii) | fe2+ | ferrous ion | ferrous ~ [Fe+2] ~ Fe+2
iron(iii) | fe3+ | ferric ion | ferric ~ [Fe+3] ~ Fe+3
zinc ion | zn2+ | zinc ~ [Zn+2] ~ Zn+2
copper(ii) | cu2+ | copper ion ~ [Cu+2] ~ Cu+2
hydrogen ion | proton | h+ ~ [H+] ~ H+
sulfuric acid | sulphuric acid | h2so4 ~ OS(=O)(=O)O ~ H2O4S
nitric acid | hno3 ~ O[N+](=O)[O-] ~ HNO3
nitrous acid | hno2 ~ ON=O ~ HNO2
phosphoric acid | h3po4 | orthophosphoric acid ~ OP(=O)(O)O ~ H3O4P
carbonic acid | h2co3 ~ OC(=O)O ~ CH2O3
bicarbonate | hydrogen carbonate | hco3- | bicarbonate ion ~ OC(=O)[O-] ~ CHO3-
carbonate | co3 2- | carbonate ion ~ [O-]C(=O)[O-] ~ CO3-2
phosphate | po4 3- | orthophosphate ~ [O-]P(=O)([O-])[O-] ~ O4P-3
hydrogen phosphate | hpo4 2- | monohydrogen phosphate | inorganic phosphate | pi ~ OP(=O)([O-])[O-] ~ HO4P-2
dihydrogen phosphate | h2po4- ~ OP(=O)(O)[O-] ~ H2O4P-
pyrophosphate | ppi | diphosphate ~ [O-]P([O-])(=O)OP([O-])([O-])=O ~ O7P2-4
sulfate | sulphate | so4 2- ~ [O-]S(=O)(=O)[O-] ~ O4S-2
nitrate | no3- ~ [O-][N+](=O)[O-] ~ NO3-
nitrite | no2- ~ [O-]N=O ~ NO2-
cyanide | cn- ~ [C-]#N ~ CN-
sodium chloride | nacl | table salt ~ [Na+].[Cl-] ~ ClNa
sodium hydroxide | naoh | caustic soda ~ [Na+].[OH-] ~ HNaO
potassium hydroxide | koh ~ [K+].[OH-] ~ HKO
potassium chloride | kcl ~ [K+].[Cl-] ~ ClK
calcium chloride | cacl2 ~ [Ca+2].[Cl-].[Cl-] ~ CaCl2
calcium carbonate | caco3 ~ [Ca+2].[O-]C([O-])=O ~ CCaO3
calcium hydroxide | ca(oh)2 | slaked lime ~ [Ca+2].[OH-].[OH-] ~ CaH2O2
magnesium hydroxide | mg(oh)2 ~ [Mg+2].[OH-].[OH-] ~ H2MgO2
magnesium sulfate | mgso4 | epsom salt ~ [Mg+2].[O-]S([O-])(=O)=O ~ MgO4S
sodium bicarbonate | sodium hydrogen carbonate | nahco3 | baking soda ~ [Na+].OC([O-])=O ~ CHNaO3
sodium carbonate | na2co3 ~ [Na+].[Na+].[O-]C([O-])=O ~ CNa2O3
sodium sulfate | na2so4 ~ [Na+].[Na+].[O-]S([O-])(=O)=O ~ Na2O4S
ammonium chloride | nh4cl ~ [NH4+].[Cl-] ~ ClH4N
silver nitrate | agno3 ~ [Ag+].[O-][N+]([O-])=O ~ AgNO3
copper(ii) sulfate | copper sulfate | cuso4 ~ [Cu+2].[O-]S([O-])(=O)=O ~ CuO4S
potassium permanganate | kmno4 ~ [K+].[O-][Mn](=O)(=O)=O ~ KMnO4
iron(iii) chloride | ferric chloride | fecl3 ~ [Fe+3].[Cl-].[Cl-].[Cl-] ~ Cl3Fe
sodium nitrite | nano2 ~ [Na+].[O-]N=O ~ NNaO2
# ---------- hydrocarbons and simple organic ----------
methane | ch4 ~ C ~ CH4
ethane ~ CC ~ C2H6
propane ~ CCC ~ C3H8
butane | n-butane ~ CCCC ~ C4H10
isobutane | 2-methylpropane ~ CC(C)C ~ C4H10
pentane ~ CCCCC ~ C5H12
hexane ~ CCCCCC ~ C6H14
octane ~ CCCCCCCC ~ C8H18
cyclopropane ~ C1CC1 ~ C3H6
cyclobutane ~ C1CCC1 ~ C4H8
cyclopentane ~ C1CCCC1 ~ C5H10
cyclohexane ~ C1CCCCC1 ~ C6H12
ethene | ethylene ~ C=C ~ C2H4
propene | propylene ~ C=CC ~ C3H6
1-butene | but-1-ene ~ C=CCC ~ C4H8
2-butene | but-2-ene ~ CC=CC ~ C4H8
1,3-butadiene | butadiene ~ C=CC=C ~ C4H6
isoprene | 2-methylbuta-1,3-diene ~ C=CC(C)=C ~ C5H8
ethyne | acetylene ~ C#C ~ C2H2
propyne ~ C#CC ~ C3H4
benzene ~ c1ccccc1 ~ C6H6
toluene | methylbenzene ~ Cc1ccccc1 ~ C7H8
xylene | o-xylene | dimethylbenzene ~ Cc1ccccc1C ~ C8H10
styrene | vinylbenzene ~ C=Cc1ccccc1 ~ C8H8
naphthalene ~ c1ccc2ccccc2c1 ~ C10H8
anthracene ~ c1ccc2cc3ccccc3cc2c1 ~ C14H10
phenol | carbolic acid ~ Oc1ccccc1 ~ C6H6O
catechol | 1,2-dihydroxybenzene ~ Oc1ccccc1O ~ C6H6O2
hydroquinone ~ Oc1ccc(O)cc1 ~ C6H6O2
resorcinol ~ Oc1cccc(O)c1 ~ C6H6O2
cresol | p-cresol ~ Cc1ccc(O)cc1 ~ C7H8O
aniline | aminobenzene ~ Nc1ccccc1 ~ C6H7N
nitrobenzene ~ [O-][N+](=O)c1ccccc1 ~ C6H5NO2
chlorobenzene ~ Clc1ccccc1 ~ C6H5Cl
bromobenzene ~ Brc1ccccc1 ~ C6H5Br
benzaldehyde ~ O=Cc1ccccc1 ~ C7H6O
benzoic acid ~ OC(=O)c1ccccc1 ~ C7H6O2
benzoate | sodium benzoate ~ [O-]C(=O)c1ccccc1 ~ C7H5O2-
acetophenone ~ CC(=O)c1ccccc1 ~ C8H8O
benzyl alcohol ~ OCc1ccccc1 ~ C7H8O
benzamide ~ NC(=O)c1ccccc1 ~ C7H7NO
salicylic acid ~ OC(=O)c1ccccc1O ~ C7H6O3
pyridine ~ c1ccncc1 ~ C5H5N
pyrimidine ~ c1cncnc1 ~ C4H4N2
pyrrole ~ c1cc[nH]c1 ~ C4H5N
furan ~ c1ccoc1 ~ C4H4O
thiophene ~ c1ccsc1 ~ C4H4S
imidazole ~ c1c[nH]cn1 ~ C3H4N2
indole ~ c1ccc2[nH]ccc2c1 ~ C8H7N
purine ~ c1ncc2[nH]cnc2n1 ~ C5H4N4
quinoline ~ c1ccc2ncccc2c1 ~ C9H7N
piperidine ~ C1CCNCC1 ~ C5H11N
pyrrolidine ~ C1CCNC1 ~ C4H9N
tetrahydrofuran | thf ~ C1CCOC1 ~ C4H8O
dioxane | 1,4-dioxane ~ C1COCCO1 ~ C4H8O2
methanol | methyl alcohol | wood alcohol ~ CO ~ CH4O
ethanol | ethyl alcohol | alcohol ~ CCO ~ C2H6O
propan-1-ol | 1-propanol | propanol | n-propanol ~ CCCO ~ C3H8O
propan-2-ol | 2-propanol | isopropanol | isopropyl alcohol ~ CC(C)O ~ C3H8O
butan-1-ol | 1-butanol | butanol ~ CCCCO ~ C4H10O
tert-butanol | tert-butyl alcohol | 2-methylpropan-2-ol ~ CC(C)(C)O ~ C4H10O
cyclohexanol ~ OC1CCCCC1 ~ C6H12O
ethylene glycol | ethane-1,2-diol ~ OCCO ~ C2H6O2
propylene glycol | propane-1,2-diol ~ CC(O)CO ~ C3H8O2
glycerol | glycerin | glycerine | propane-1,2,3-triol ~ OCC(O)CO ~ C3H8O3
formaldehyde | methanal ~ C=O ~ CH2O
acetaldehyde | ethanal ~ CC=O ~ C2H4O
propanal | propionaldehyde ~ CCC=O ~ C3H6O
acetone | propanone | propan-2-one | dimethyl ketone ~ CC(C)=O ~ C3H6O
butanone | methyl ethyl ketone | mek ~ CCC(C)=O ~ C4H8O
cyclohexanone ~ O=C1CCCCC1 ~ C6H10O
formic acid | methanoic acid ~ OC=O ~ CH2O2
acetic acid | ethanoic acid | ch3cooh ~ CC(O)=O ~ C2H4O2
propionic acid | propanoic acid ~ CCC(O)=O ~ C3H6O2
butyric acid | butanoic acid ~ CCCC(O)=O ~ C4H8O2
valeric acid | pentanoic acid ~ CCCCC(O)=O ~ C5H10O2
oxalic acid | ethanedioic acid ~ OC(=O)C(O)=O ~ C2H2O4
malonic acid | propanedioic acid ~ OC(=O)CC(O)=O ~ C3H4O4
succinic acid | butanedioic acid ~ OC(=O)CCC(O)=O ~ C4H6O4
glutaric acid ~ OC(=O)CCCC(O)=O ~ C5H8O4
adipic acid ~ OC(=O)CCCCC(O)=O ~ C6H10O4
maleic acid ~ OC(=O)C=CC(O)=O ~ C4H4O4
acrylic acid | propenoic acid ~ C=CC(O)=O ~ C3H4O2
lactic acid | 2-hydroxypropanoic acid ~ CC(O)C(O)=O ~ C3H6O3
citric acid ~ OC(=O)CC(O)(CC(O)=O)C(O)=O ~ C6H8O7
tartaric acid ~ OC(C(O)C(O)=O)C(O)=O ~ C4H6O6
glycolic acid ~ OCC(O)=O ~ C2H4O3
formate | methanoate ~ [O-]C=O ~ CHO2-
acetate | ethanoate | ch3coo- ~ CC([O-])=O ~ C2H3O2-
propionate | propanoate ~ CCC([O-])=O ~ C3H5O2-
butyrate | butanoate ~ CCCC([O-])=O ~ C4H7O2-
oxalate | ethanedioate ~ [O-]C(=O)C([O-])=O ~ C2O4-2
methyl acetate ~ CC(=O)OC ~ C3H6O2
ethyl acetate | ethyl ethanoate ~ CCOC(C)=O ~ C4H8O2
methyl formate ~ COC=O ~ C2H4O2
ethyl formate ~ CCOC=O ~ C3H6O2
acetic anhydride | ethanoic anhydride ~ CC(=O)OC(C)=O ~ C4H6O3
acetyl chloride | ethanoyl chloride ~ CC(Cl)=O ~ C2H3ClO
acetamide ~ CC(N)=O ~ C2H5NO
formamide ~ NC=O ~ CH3NO
urea | carbamide ~ NC(N)=O ~ CH4N2O
guanidine ~ NC(N)=N ~ CH5N3
dimethyl ether | methoxymethane ~ COC ~ C2H6O
diethyl ether | ether | ethoxyethane ~ CCOCC ~ C4H10O
methylamine ~ CN ~ CH5N
dimethylamine ~ CNC ~ C2H7N
trimethylamine ~ CN(C)C ~ C3H9N
ethylamine ~ CCN ~ C2H7N
diethylamine ~ CCNCC ~ C4H11N
ethanolamine | 2-aminoethanol ~ NCCO ~ C2H7NO
choline ~ C[N+](C)(C)CCO ~ C5H14NO+
chloromethane | methyl chloride ~ CCl ~ CH3Cl
dichloromethane | methylene chloride ~ ClCCl ~ CH2Cl2
chloroform | trichloromethane ~ ClC(Cl)Cl ~ CHCl3
carbon tetrachloride | tetrachloromethane ~ ClC(Cl)(Cl)Cl ~ CCl4
chloroethane | ethyl chloride ~ CCCl ~ C2H5Cl
bromoethane | ethyl bromide ~ CCBr ~ C2H5Br
iodomethane | methyl iodide ~ CI ~ CH3I
vinyl chloride | chloroethene ~ C=CCl ~ C2H3Cl
acetonitrile | methyl cyanide ~ CC#N ~ C2H3N
dimethyl sulfoxide | dmso ~ CS(C)=O ~ C2H6OS
methanethiol | methyl mercaptan ~ CS ~ CH4S
ethanethiol | ethyl mercaptan ~ CCS ~ C2H6S
# ---------- drugs and common compounds ----------
aspirin | acetylsalicylic acid ~ CC(=O)Oc1ccccc1C(O)=O ~ C9H8O4
paracetamol | acetaminophen ~ CC(=O)Nc1ccc(O)cc1 ~ C8H9NO2
ibuprofen ~ CC(C)Cc1ccc(cc1)C(C)C(O)=O ~ C13H18O2
caffeine ~ Cn1cnc2c1c(=O)n(C)c(=O)n2C ~ C8H10N4O2
nicotine ~ CN1CCCC1c1cccnc1 ~ C10H14N2
metformin ~ CN(C)C(=N)NC(N)=N ~ C4H11N5
lidocaine ~ CCN(CC)CC(=O)Nc1c(C)cccc1C ~ C14H22N2O
# ---------- carbohydrates ----------
glucose | d-glucose | dextrose | blood sugar | alpha-d-glucose | beta-d-glucose ~ OCC1OC(O)C(O)C(O)C1O ~ C6H12O6
galactose | d-galactose ~ OCC1OC(O)C(O)C(O)C1O ~ C6H12O6
mannose | d-mannose ~ OCC1OC(O)C(O)C(O)C1O ~ C6H12O6
fructose | d-fructose | fruit sugar ~ OCC1OC(O)(CO)C(O)C1O ~ C6H12O6
ribose | d-ribose ~ OCC1OC(O)C(O)C1O ~ C5H10O5
deoxyribose | 2-deoxyribose | 2-deoxy-d-ribose ~ OCC1OC(O)CC1O ~ C5H10O4
xylose ~ OC1COC(O)C(O)C1O ~ C5H10O5
glyceraldehyde | d-glyceraldehyde ~ O=CC(O)CO ~ C3H6O3
dihydroxyacetone | dha ~ OCC(=O)CO ~ C3H6O3
erythrose ~ O=CC(O)C(O)CO ~ C4H8O4
sucrose | table sugar | cane sugar ~ OCC1OC(OC2(CO)OC(CO)C(O)C2O)C(O)C(O)C1O ~ C12H22O11
maltose | malt sugar | cellobiose ~ OCC1OC(OC2C(O)C(O)C(O)OC2CO)C(O)C(O)C1O ~ C12H22O11
lactose | milk sugar ~ OCC1OC(OC2C(O)C(O)C(O)OC2CO)C(O)C(O)C1O ~ C12H22O11
isomaltose | alpha-1,6 disaccharide | glycogen branch point | alpha-1,6 glycosidic bond ~ OCC1OC(OCC2OC(O)C(O)C(O)C2O)C(O)C(O)C1O ~ C12H22O11
maltotriose | amylose fragment | starch fragment | alpha-1,4 glucose chain | glycogen chain | alpha-1,4 glycosidic bond ~ OCC1OC(OC2C(O)C(O)C(OC3C(O)C(O)C(O)OC3CO)OC2CO)C(O)C(O)C1O ~ C18H32O16
glucosamine ~ NC1C(O)OC(CO)C(O)C1O ~ C6H13NO5
n-acetylglucosamine | glcnac ~ CC(=O)NC1C(O)OC(CO)C(O)C1O ~ C8H15NO6
glucuronic acid | glucuronate ~ OC1OC(C(O)=O)C(O)C(O)C1O ~ C6H10O7
gluconic acid | gluconate ~ OCC(O)C(O)C(O)C(O)C(O)=O ~ C6H12O7
sorbitol | glucitol ~ OCC(O)C(O)C(O)C(O)CO ~ C6H14O6
mannitol ~ OCC(O)C(O)C(O)C(O)CO ~ C6H14O6
xylitol ~ OCC(O)C(O)C(O)CO ~ C5H12O5
inositol | myo-inositol ~ OC1C(O)C(O)C(O)C(O)C1O ~ C6H12O6
ascorbic acid | vitamin c ~ OCC(O)C1OC(=O)C(O)=C1O ~ C6H8O6
glucose 6-phosphate | glucose-6-phosphate | g6p | d-glucose 6-phosphate ~ OC1OC(COP([O-])([O-])=O)C(O)C(O)C1O ~ C6H11O9P-2
glucose 1-phosphate | glucose-1-phosphate | g1p ~ OCC1OC(OP([O-])([O-])=O)C(O)C(O)C1O ~ C6H11O9P-2
fructose 6-phosphate | fructose-6-phosphate | f6p ~ OCC1(O)OC(COP([O-])([O-])=O)C(O)C1O ~ C6H11O9P-2
fructose 1-phosphate | fructose-1-phosphate | f1p ~ OC1C(O)C(COP([O-])([O-])=O)OC1(O)CO ~ C6H11O9P-2
fructose 1,6-bisphosphate | fructose-1,6-bisphosphate | fructose 1,6-bisphosphate | fbp | f1,6bp | fructose 1,6-diphosphate ~ [O-]P([O-])(=O)OCC1(O)OC(COP([O-])([O-])=O)C(O)C1O ~ C6H10O12P2-4
fructose 2,6-bisphosphate | fructose-2,6-bisphosphate | f2,6bp ~ [O-]P([O-])(=O)OC1(CO)OC(COP([O-])([O-])=O)C(O)C1O ~ C6H10O12P2-4
dihydroxyacetone phosphate | dhap ~ OCC(=O)COP([O-])([O-])=O ~ C3H5O6P-2
glyceraldehyde 3-phosphate | glyceraldehyde-3-phosphate | g3p | gap | d-glyceraldehyde 3-phosphate ~ O=CC(O)COP([O-])([O-])=O ~ C3H5O6P-2
1,3-bisphosphoglycerate | 1,3-bpg | 1,3-diphosphoglycerate | 1,3-bisphosphoglyceric acid ~ [O-]P([O-])(=O)OC(=O)C(O)COP([O-])([O-])=O ~ C3H4O10P2-4
2,3-bisphosphoglycerate | 2,3-bpg | 2,3-dpg ~ [O-]C(=O)C(OP([O-])([O-])=O)COP([O-])([O-])=O ~ C3H3O10P2-5
3-phosphoglycerate | 3-pg | 3-phosphoglyceric acid ~ OC(COP([O-])([O-])=O)C([O-])=O ~ C3H4O7P-3
2-phosphoglycerate | 2-pg | 2-phosphoglyceric acid ~ OCC(OP([O-])([O-])=O)C([O-])=O ~ C3H4O7P-3
phosphoenolpyruvate | pep ~ C=C(OP([O-])([O-])=O)C([O-])=O ~ C3H2O6P-3
glycerol 3-phosphate | glycerol-3-phosphate | glycerol phosphate | sn-glycerol 3-phosphate | g3p (glycerol) ~ OCC(O)COP([O-])([O-])=O ~ C3H7O6P-2
6-phosphogluconate | 6-phosphogluconic acid | 6-phosphogluconate ~ [O-]C(=O)C(O)C(O)C(O)C(O)COP([O-])([O-])=O ~ C6H10O10P-3
ribose 5-phosphate | ribose-5-phosphate | r5p ~ OC1OC(COP([O-])([O-])=O)C(O)C1O ~ C5H9O8P-2
ribulose 5-phosphate | ribulose-5-phosphate | xylulose 5-phosphate | xylulose-5-phosphate | ru5p | xu5p ~ OCC(=O)C(O)C(O)COP([O-])([O-])=O ~ C5H9O8P-2
erythrose 4-phosphate | erythrose-4-phosphate | e4p ~ O=CC(O)C(O)COP([O-])([O-])=O ~ C4H7O7P-2
sedoheptulose 7-phosphate | sedoheptulose-7-phosphate | s7p ~ OCC(=O)C(O)C(O)C(O)C(O)COP([O-])([O-])=O ~ C7H13O10P-2
# ---------- glycolysis, TCA and small metabolites ----------
pyruvate | pyruvic acid | 2-oxopropanoate | 2-oxopropanoic acid ~ CC(=O)C([O-])=O ~ C3H3O3-
lactate | l-lactate | d-lactate | lactic acid (lactate) ~ CC(O)C([O-])=O ~ C3H5O3-
acetyl-coa | acetyl coa | acetyl coenzyme a | acetyl-coenzyme a | acetyl coa ~ CC(=O)S{CoA} ~ C2H3{CoA}OS
malonyl-coa | malonyl coa | malonyl coenzyme a ~ [O-]C(=O)CC(=O)S{CoA} ~ C3H2{CoA}O3S-
acetoacetyl-coa | acetoacetyl coa ~ CC(=O)CC(=O)S{CoA} ~ C4H5{CoA}O2S
hmg-coa | hmg coa | 3-hydroxy-3-methylglutaryl-coa | 3-hydroxy-3-methylglutaryl coa ~ CC(O)(CC([O-])=O)CC(=O)S{CoA} ~ C6H8{CoA}O4S-
propionyl-coa | propionyl coa ~ CCC(=O)S{CoA} ~ C3H5{CoA}OS
succinyl-coa | succinyl coa ~ [O-]C(=O)CCC(=O)S{CoA} ~ C4H4{CoA}O3S-
methylmalonyl-coa | methylmalonyl coa ~ CC(C([O-])=O)C(=O)S{CoA} ~ C4H4{CoA}O3S-
acyl-coa | acyl coa | fatty acyl-coa | fatty acyl coa | acyl coenzyme a ~ {R}C(=O)S{CoA} ~ 
palmitoyl-coa | palmitoyl coa ~ CCCCCCCCCCCCCCCC(=O)S{CoA} ~ C16H31{CoA}OS
hydroxy acyl-coa | 3-hydroxyacyl-coa | l-3-hydroxyacyl-coa | beta-hydroxyacyl-coa ~ {R}C(O)CC(=O)S{CoA} ~ 
enoyl-coa | trans-enoyl-coa | trans-delta2-enoyl-coa ~ {R}C=CC(=O)S{CoA} ~ 
3-ketoacyl-coa | beta-ketoacyl-coa | ketoacyl-coa ~ {R}C(=O)CC(=O)S{CoA} ~ 
coenzyme a | coa | coa-sh | coash | hs-coa ~ CC(C)(COP(O)(=O)OP(O)(=O)OCC1OC(C(O)C1OP(O)(O)=O)n1cnc2c(N)ncnc12)C(O)C(=O)NCCC(=O)NCCS ~ C21H36N7O16P3S
oxaloacetate | oxaloacetic acid | oaa | oxalacetate ~ [O-]C(=O)CC(=O)C([O-])=O ~ C4H2O5-2
citrate | citric acid (citrate) | tricarboxylate ~ OC(CC([O-])=O)(CC([O-])=O)C([O-])=O ~ C6H5O7-3
cis-aconitate | aconitate | cis-aconitic acid ~ [O-]C(=O)CC(=CC([O-])=O)C([O-])=O ~ C6H3O6-3
isocitrate | isocitric acid ~ [O-]C(=O)CC(C([O-])=O)C(O)C([O-])=O ~ C6H5O7-3
alpha-ketoglutarate | a-ketoglutarate | 2-oxoglutarate | alpha-ketoglutaric acid | oxoglutarate | akg | α-ketoglutarate ~ [O-]C(=O)CCC(=O)C([O-])=O ~ C5H4O5-2
succinate | succinic acid (succinate) ~ [O-]C(=O)CCC([O-])=O ~ C4H4O4-2
fumarate | fumaric acid ~ [O-]C(=O)C=CC([O-])=O ~ C4H2O4-2
malate | malic acid | l-malate ~ [O-]C(=O)CC(O)C([O-])=O ~ C4H4O5-2
glyoxylate | glyoxylic acid ~ O=CC([O-])=O ~ C2HO3-
glycerate ~ OCC(O)C([O-])=O ~ C3H5O4-
acetoacetate | acetoacetic acid ~ CC(=O)CC([O-])=O ~ C4H5O3-
beta-hydroxybutyrate | 3-hydroxybutyrate | b-hydroxybutyrate | d-3-hydroxybutyrate | beta-hydroxybutyric acid ~ CC(O)CC([O-])=O ~ C4H7O3-
mevalonate | mevalonic acid ~ CC(O)(CCO)CC([O-])=O ~ C6H11O4-
carbamoyl phosphate | carbamoyl-phosphate ~ NC(=O)OP([O-])([O-])=O ~ CH2NO5P-2
creatine ~ CN(CC(O)=O)C(N)=N ~ C4H9N3O2
creatinine ~ CN1CC(=O)NC1=N ~ C4H7N3O
phosphocreatine | creatine phosphate ~ CN(CC([O-])=O)C(=N)NP([O-])([O-])=O ~ C4H7N3O5P-3
uric acid | urate ~ O=c1[nH]c2[nH]c(=O)[nH]c2c(=O)[nH]1 ~ C5H4N4O3
hippuric acid | hippurate ~ OC(=O)CNC(=O)c1ccccc1 ~ C9H9NO3
taurine ~ NCCS(O)(=O)=O ~ C2H7NO3S
carnitine ~ C[N+](C)(C)CC(O)CC([O-])=O ~ C7H15NO3
acetylcarnitine ~ CC(=O)OC(C[N+](C)(C)C)CC([O-])=O ~ C9H17NO4
lipoic acid | lipoate ~ OC(=O)CCCCC1CCSS1 ~ C8H14O2S2
s-adenosylmethionine | sam | adomet ~ C[S+](CCC(N)C(O)=O)CC1OC(C(O)C1O)n1cnc2c(N)ncnc12 ~ C15H23N6O5S+
# ---------- amino acids (neutral form) ----------
glycine | gly ~ NCC(O)=O ~ C2H5NO2
alanine | ala | l-alanine ~ CC(N)C(O)=O ~ C3H7NO2
valine | val ~ CC(C)C(N)C(O)=O ~ C5H11NO2
leucine | leu ~ CC(C)CC(N)C(O)=O ~ C6H13NO2
isoleucine | ile ~ CCC(C)C(N)C(O)=O ~ C6H13NO2
proline | pro ~ OC(=O)C1CCCN1 ~ C5H9NO2
phenylalanine | phe ~ NC(Cc1ccccc1)C(O)=O ~ C9H11NO2
tryptophan | trp ~ NC(Cc1c[nH]c2ccccc12)C(O)=O ~ C11H12N2O2
methionine | met ~ CSCCC(N)C(O)=O ~ C5H11NO2S
serine | ser ~ NC(CO)C(O)=O ~ C3H7NO3
threonine | thr ~ CC(O)C(N)C(O)=O ~ C4H9NO3
cysteine | cys ~ NC(CS)C(O)=O ~ C3H7NO2S
tyrosine | tyr ~ NC(Cc1ccc(O)cc1)C(O)=O ~ C9H11NO3
asparagine | asn ~ NC(CC(N)=O)C(O)=O ~ C4H8N2O3
glutamine | gln ~ NC(CCC(N)=O)C(O)=O ~ C5H10N2O3
aspartic acid | aspartate | asp ~ NC(CC(O)=O)C(O)=O ~ C4H7NO4
glutamic acid | glutamate | glu ~ NC(CCC(O)=O)C(O)=O ~ C5H9NO4
lysine | lys ~ NCCCCC(N)C(O)=O ~ C6H14N2O2
arginine | arg ~ NC(CCCNC(N)=N)C(O)=O ~ C6H14N4O2
histidine | his ~ NC(Cc1c[nH]cn1)C(O)=O ~ C6H9N3O2
ornithine ~ NCCCC(N)C(O)=O ~ C5H12N2O2
citrulline ~ NC(=O)NCCCC(N)C(O)=O ~ C6H13N3O3
argininosuccinate | argininosuccinic acid ~ OC(=O)C(CCCNC(N)=NC(CC(O)=O)C(O)=O)N ~ C10H18N4O6
homocysteine ~ NC(CCS)C(O)=O ~ C4H9NO2S
cystine ~ NC(CSSCC(N)C(O)=O)C(O)=O ~ C6H12N2O4S2
disulfide bond | disulphide bond | disulfide bridge | cystine bridge ~ NC(CSSCC(N)C(O)=O)C(O)=O ~ C6H12N2O4S2
gaba | gamma-aminobutyric acid | 4-aminobutanoic acid ~ NCCCC(O)=O ~ C4H9NO2
beta-alanine ~ NCCC(O)=O ~ C3H7NO2
glutathione | gsh ~ NC(CCC(=O)NC(CS)C(=O)NCC(O)=O)C(O)=O ~ C10H17N3O6S
dipeptide | peptide bond | gly-ala | glycylalanine ~ NCC(=O)NC(C)C(O)=O ~ C5H10N2O3
tripeptide | gly-ala-ser ~ NCC(=O)NC(C)C(=O)NC(CO)C(O)=O ~ C8H15N3O5
polypeptide | peptide | peptide chain | polypeptide chain | protein | protein backbone | primary structure | amino acid chain ~ NC({R1})C(=O)NC({R2})C(=O)NC({R3})C(O)=O ~ 
# ---------- lipids ----------
lauric acid | dodecanoic acid ~ CCCCCCCCCCCC(O)=O ~ C12H24O2
myristic acid | tetradecanoic acid ~ CCCCCCCCCCCCCC(O)=O ~ C14H28O2
palmitic acid | palmitate | hexadecanoic acid | palmitic acid (c16:0) ~ CCCCCCCCCCCCCCCC(O)=O ~ C16H32O2
stearic acid | stearate | octadecanoic acid ~ CCCCCCCCCCCCCCCCCC(O)=O ~ C18H36O2
oleic acid | oleate | cis-9-octadecenoic acid ~ CCCCCCCCC=CCCCCCCCC(O)=O ~ C18H34O2
linoleic acid | linoleate ~ CCCCCC=CCC=CCCCCCCCC(O)=O ~ C18H32O2
alpha-linolenic acid | linolenic acid ~ CCC=CCC=CCC=CCCCCCCCC(O)=O ~ C18H30O2
arachidonic acid | arachidonate ~ CCCCCC=CCC=CCC=CCC=CCCCC(O)=O ~ C20H32O2
fatty acid | free fatty acid | fatty acids ~ {R}C(O)=O ~ 
triacylglycerol | triglyceride | triacylglycerols | triglycerides | tag | fat | triacylglycerol (fat) ~ {R1}C(=O)OCC(OC(=O){R2})COC(=O){R3} ~ 
diacylglycerol | diglyceride | dag ~ {R1}C(=O)OCC(O)COC(=O){R2} ~ 
monoacylglycerol | monoglyceride | mag ~ {R1}C(=O)OCC(O)CO ~ 
phosphatidic acid | phosphatidate ~ {R1}C(=O)OCC(OC(=O){R2})COP([O-])([O-])=O ~ 
phosphatidylcholine | lecithin | pc ~ {R1}C(=O)OCC(OC(=O){R2})COP([O-])(=O)OCC[N+](C)(C)C ~ 
phosphatidylethanolamine | cephalin | pe ~ {R1}C(=O)OCC(OC(=O){R2})COP([O-])(=O)OCC[NH3+] ~ 
phosphatidylserine | ps ~ {R1}C(=O)OCC(OC(=O){R2})COP([O-])(=O)OCC(N)C(O)=O ~ 
phospholipid | glycerophospholipid ~ {R1}C(=O)OCC(OC(=O){R2})COP([O-])(=O)O{X} ~ 
sphingosine ~ CCCCCCCCCCCCCC=CC(O)C(N)CO ~ C18H37NO2
ceramide ~ CCCCCCCCCCCCCC=CC(O)C(CO)NC(=O){R} ~ 
sphingomyelin ~ CCCCCCCCCCCCCC=CC(O)C(COP([O-])(=O)OCC[N+](C)(C)C)NC(=O){R} ~ 
cholesterol ~ CC(C)CCCC(C)C1CCC2C3CC=C4CC(O)CCC4(C)C3CCC12C ~ C27H46O
cholic acid | cholate ~ CC(CCC(O)=O)C1CCC2C3C(O)CC4CC(O)CCC4(C)C3CC(O)C12C ~ C24H40O5
testosterone ~ CC12CCC3C(CCC4=CC(=O)CCC34C)C1CCC2O ~ C19H28O2
estradiol | oestradiol | 17-beta-estradiol ~ CC12CCC3C(CCc4cc(O)ccc34)C1CCC2O ~ C18H24O2
progesterone ~ CC(=O)C1CCC2C3CCC4=CC(=O)CCC4(C)C3CCC12C ~ C21H30O2
cortisol | hydrocortisone ~ CC12CCC(=O)C=C1CCC1C2C(O)CC2(C)C1CCC2(O)C(=O)CO ~ C21H30O5
aldosterone ~ CC12CCC(=O)C=C1CCC1C2C(O)CC2(C=O)C1CCC2C(=O)CO ~ C21H28O5
retinol | vitamin a ~ CC1=C(C=CC(C)=CC=CC(C)=CCO)C(C)(C)CCC1 ~ C20H30O
vitamin d3 | cholecalciferol | vitamin d ~ CC(C)CCCC(C)C1CCC2C1(C)CCCC2=CC=C1CC(O)CCC1=C ~ C27H44O
vitamin e | alpha-tocopherol | tocopherol ~ Cc1c(C)c2OC(C)(CCCC(C)CCCC(C)CCCC(C)C)CCc2c(C)c1O ~ C29H50O2
vitamin k | vitamin k1 | phylloquinone ~ CC1=C(CC=C(C)CCCC(C)CCCC(C)CCCC(C)C)C(=O)c2ccccc2C1=O ~ C31H46O2
# ---------- nucleic acids ----------
adenine ~ Nc1ncnc2[nH]cnc12 ~ C5H5N5
guanine ~ Nc1nc2[nH]cnc2c(=O)[nH]1 ~ C5H5N5O
cytosine ~ Nc1cc[nH]c(=O)n1 ~ C4H5N3O
thymine ~ Cc1c[nH]c(=O)[nH]c1=O ~ C5H6N2O2
uracil ~ O=c1cc[nH]c(=O)[nH]1 ~ C4H4N2O2
hypoxanthine ~ O=c1[nH]cnc2[nH]cnc12 ~ C5H4N4O
xanthine ~ O=c1[nH]c(=O)c2[nH]cnc2[nH]1 ~ C5H4N4O2
adenosine ~ Nc1ncnc2n(cnc12)C1OC(CO)C(O)C1O ~ C10H13N5O4
guanosine ~ Nc1nc2n(cnc2c(=O)[nH]1)C1OC(CO)C(O)C1O ~ C10H13N5O5
cytidine ~ Nc1ccn(C2OC(CO)C(O)C2O)c(=O)n1 ~ C9H13N3O5
uridine ~ O=c1ccn(C2OC(CO)C(O)C2O)c(=O)[nH]1 ~ C9H12N2O6
thymidine | deoxythymidine ~ Cc1cn(C2CC(O)C(CO)O2)c(=O)[nH]c1=O ~ C10H14N2O5
deoxyadenosine ~ Nc1ncnc2n(cnc12)C1CC(O)C(CO)O1 ~ C10H13N5O3
amp | adenosine monophosphate | adenosine 5'-monophosphate | adenylate ~ Nc1ncnc2n(cnc12)C1OC(COP(O)(O)=O)C(O)C1O ~ C10H14N5O7P
adp | adenosine diphosphate ~ Nc1ncnc2n(cnc12)C1OC(COP(O)(=O)OP(O)(O)=O)C(O)C1O ~ C10H15N5O10P2
atp | adenosine triphosphate ~ Nc1ncnc2n(cnc12)C1OC(COP(O)(=O)OP(O)(=O)OP(O)(O)=O)C(O)C1O ~ C10H16N5O13P3
camp | cyclic amp | cyclic adenosine monophosphate | 3',5'-cyclic amp ~ Nc1ncnc2n(cnc12)C1OC2COP(O)(=O)OC2C1O ~ C10H12N5O6P
gtp | guanosine triphosphate ~ Nc1nc2n(cnc2c(=O)[nH]1)C1OC(COP(O)(=O)OP(O)(=O)OP(O)(O)=O)C(O)C1O ~ C10H16N5O14P3
gdp | guanosine diphosphate ~ Nc1nc2n(cnc2c(=O)[nH]1)C1OC(COP(O)(=O)OP(O)(O)=O)C(O)C1O ~ C10H15N5O11P2
utp | uridine triphosphate ~ O=c1ccn(C2OC(COP(O)(=O)OP(O)(=O)OP(O)(O)=O)C(O)C2O)c(=O)[nH]1 ~ C9H15N2O15P3
dna | dna nucleotide | deoxyribonucleotide | dna backbone | dna strand | phosphodiester bond | dinucleotide ~ Cc1cn(C2CC(OP(O)(=O)OCC3OC(CC3O)n3cnc4c(N)ncnc34)C(CO)O2)c(=O)[nH]c1=O ~ C20H26N7O10P
nad+ | nad | nicotinamide adenine dinucleotide | nad(+) ~ NC(=O)c1ccc[n+](c1)C1OC(COP([O-])(=O)OP(O)(=O)OCC2OC(C(O)C2O)n2cnc3c(N)ncnc23)C(O)C1O ~ C21H27N7O14P2
nadh | nadh + h+ ~ NC(=O)C1=CN(C=CC1)C1OC(COP(O)(=O)OP(O)(=O)OCC2OC(C(O)C2O)n2cnc3c(N)ncnc23)C(O)C1O ~ C21H29N7O14P2
fad | flavin adenine dinucleotide ~ Cc1cc2nc3c(=O)[nH]c(=O)nc-3n(CC(O)C(O)C(O)COP(O)(=O)OP(O)(=O)OCC3OC(C(O)C3O)n3cnc4c(N)ncnc34)c2cc1C ~ C27H33N9O15P2
# ---------- vitamins, hormones, neurotransmitters ----------
thiamine | vitamin b1 | thiamin ~ Cc1ncc(C[n+]2csc(CCO)c2C)c(N)n1 ~ C12H17N4OS+
riboflavin | vitamin b2 ~ Cc1cc2nc3c(=O)[nH]c(=O)nc-3n(CC(O)C(O)C(O)CO)c2cc1C ~ C17H20N4O6
niacin | nicotinic acid | vitamin b3 ~ OC(=O)c1cccnc1 ~ C6H5NO2
nicotinamide | niacinamide ~ NC(=O)c1cccnc1 ~ C6H6N2O
pantothenic acid | vitamin b5 | pantothenate ~ CC(C)(CO)C(O)C(=O)NCCC(O)=O ~ C9H17NO5
pyridoxine | vitamin b6 ~ Cc1ncc(CO)c(CO)c1O ~ C8H11NO3
pyridoxal phosphate | plp | pyridoxal 5'-phosphate | pyridoxal-5-phosphate ~ Cc1ncc(COP(O)(O)=O)c(C=O)c1O ~ C8H10NO6P
biotin | vitamin b7 ~ OC(=O)CCCCC1SCC2NC(=O)NC12 ~ C10H16N2O3S
folic acid | folate | vitamin b9 ~ Nc1nc2ncc(CNc3ccc(cc3)C(=O)NC(CCC(O)=O)C(O)=O)nc2c(=O)[nH]1 ~ C19H19N7O6
dopamine ~ NCCc1ccc(O)c(O)c1 ~ C8H11NO2
l-dopa | levodopa | dopa ~ NC(Cc1ccc(O)c(O)c1)C(O)=O ~ C9H11NO4
noradrenaline | norepinephrine ~ NCC(O)c1ccc(O)c(O)c1 ~ C8H11NO3
adrenaline | epinephrine ~ CNCC(O)c1ccc(O)c(O)c1 ~ C9H13NO3
serotonin | 5-ht | 5-hydroxytryptamine ~ NCCc1c[nH]c2ccc(O)cc12 ~ C10H12N2O
melatonin ~ COc1ccc2[nH]cc(CCNC(C)=O)c2c1 ~ C13H16N2O2
histamine ~ NCCc1c[nH]cn1 ~ C5H9N3
acetylcholine | ach ~ CC(=O)OCC[N+](C)(C)C ~ C7H16NO2+
thyroxine | t4 | l-thyroxine ~ NC(Cc1cc(I)c(Oc2cc(I)c(O)c(I)c2)c(I)c1)C(O)=O ~ C15H11I4NO4
triiodothyronine | t3 ~ NC(Cc1cc(I)c(Oc2ccc(O)c(I)c2)c(I)c1)C(O)=O ~ C15H12I3NO4
`;

const key = (s) => String(s || "").toLowerCase()
  .replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080)).replace(/[⁺]/g, "+").replace(/[⁻−]/g, "-")
  .replace(/^(d|l|dl|alpha|beta|α|β|\(s\)|\(r\)|all-trans|cis|trans)[\s-]+(?=[a-z])/, "")
  .replace(/\bacid\b/g, "acid").replace(/[\s,'’"`´()\[\]{}\-_/·.:;]/g, "");
export const compoundList = [];
const byKey = new Map();
for (const line of RAW.split("\n")) {
  const t = line.trim(); if (!t || t.startsWith("#")) continue;
  const [names, smiles, formula] = t.split("~").map((x) => x.trim());
  if (!smiles) continue;
  const list = names.split("|").map((x) => x.trim()).filter(Boolean);
  compoundList.push({ name: list[0], names: list, smiles, formula });
  for (const nm of list) { const k = key(nm); if (k && !byKey.has(k)) byKey.set(k, smiles); }
}
// cofactors and ions that are written as text on a reaction arrow, not drawn
export const PILL = /^(atp|adp|amp|gtp|gdp|utp|nad\+?|nadh|nadp\+?|nadph|fad|fadh2?|fmn|coa|coash|coa-sh|hscoa|pi|ppi|h\+|tpp|udp|cdp)$/;
export const isPill = (name) => PILL.test(String(name || "").toLowerCase().replace(/[₀-₉]/g, (d) => String(d.charCodeAt(0) - 0x2080)).replace(/⁺/g, "+").replace(/[⁻−]/g, "-").replace(/[\s()]/g, ""));

const STEMS = [[/ic acid$/, "ate"], [/ate$/, "ic acid"], [/ic acid$/, "ic acid"]];
// name (and formula) in, SMILES out; "" when the library does not know the compound
export function lookupSmiles(name, formula) {
  const n = String(name || "").trim();
  const base = n.replace(/\s*\(.*?\)\s*/g, " ").trim();
  for (const cand of [n, base, base.replace(/^(an?|the)\s+/i, "")]) { const s = byKey.get(key(cand)); if (s) return s; }
  for (const [re, rep] of STEMS) { if (re.test(base.toLowerCase())) { const s = byKey.get(key(base.toLowerCase().replace(re, rep))); if (s) return s; } }
  const f = key(formula); if (f && f.length > 1) { const s = byKey.get(f); if (s) return s; }
  return "";
}
