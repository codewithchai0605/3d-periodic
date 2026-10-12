"""Organic molecules: 3D coordinates from SMILES via RDKit (ETKDG + MMFF), plus teaching metadata."""
import numpy as np
from rdkit import Chem
from rdkit.Chem import AllChem, rdMolTransforms, rdCIPLabeler
from geom import Mol
from registry import reg


def embed(smiles, seed=7, n=16):
    m = Chem.AddHs(Chem.MolFromSmiles(smiles))
    AllChem.EmbedMultipleConfs(m, n, randomSeed=seed)
    res = AllChem.MMFFOptimizeMoleculeConfs(m, maxIters=5000)
    best = min(range(len(res)), key=lambda i: res[i][1])
    return m, best


def to_mol(id, rd, cid, key=None):
    conf = rd.GetConformer(cid)
    m = Mol(id)
    for a in rd.GetAtoms():
        p = conf.GetAtomPosition(a.GetIdx())
        m.add(a.GetSymbol(), (p.x, p.y, p.z))
    kek = Chem.Mol(rd)
    Chem.Kekulize(kek, clearAromaticFlags=True)
    pi = 0
    orders = {}
    for b in rd.GetBonds():
        o = 1.5 if b.GetIsAromatic() else b.GetBondTypeAsDouble()
        orders[(b.GetBeginAtomIdx(), b.GetEndAtomIdx())] = o
    for b in kek.GetBonds():
        pi += max(0, b.GetBondTypeAsDouble() - 1)
    # charge-separated resonance groups (nitro, carboxylate): make both terminal bonds equal
    for a in rd.GetAtoms():
        nbrs = [n for n in a.GetNeighbors() if n.GetSymbol() == 'O']
        neg = [n for n in nbrs if n.GetFormalCharge() == -1]
        dbl = [n for n in nbrs if n.GetFormalCharge() == 0 and rd.GetBondBetweenAtoms(a.GetIdx(), n.GetIdx()).GetBondTypeAsDouble() == 2.0]
        if neg and dbl:
            for n in neg + dbl:
                i, j = a.GetIdx(), n.GetIdx()
                orders[(i, j) if (i, j) in orders else (j, i)] = 1.5
    for (i, j), o in orders.items():
        m.bond(i, j, o)
    heavy = [a for a in rd.GetAtoms() if a.GetSymbol() != 'H']
    hyb = {}
    for a in heavy:
        if a.GetSymbol() == 'C':
            h = str(a.GetHybridization()).lower()
            hyb[h] = hyb.get(h, 0) + 1
    if key is None:
        key = None
        for a in heavy:
            hn = [n.GetIdx() for n in a.GetNeighbors() if n.GetSymbol() != 'H']
            if len(hn) >= 2:
                key = {'angle': [hn[0], a.GetIdx(), hn[1]], 'label': f'{rd.GetAtomWithIdx(hn[0]).GetSymbol()}–{a.GetSymbol()}–{rd.GetAtomWithIdx(hn[1]).GetSymbol()}'}
                break
        if key is None:
            b = rd.GetBondWithIdx(0)
            i, j = b.GetBeginAtomIdx(), b.GetEndAtomIdx()
            key = {'dist': [i, j], 'label': f'{rd.GetAtomWithIdx(i).GetSymbol()}–{rd.GetAtomWithIdx(j).GetSymbol()}'}
    m.key = key
    return m, int(rd.GetNumBonds()), int(round(pi)), hyb


SUP = {'sp': 'sp', 'sp2': 'sp²', 'sp3': 'sp³'}


def hyb_text(h):
    return ', '.join(f"{n} {SUP.get(k, k)}" for k, n in sorted(h.items(), reverse=True)) + ' carbon' + ('s' if sum(h.values()) > 1 else '')


def org(id, name, formula, smiles, notes, shape=None, polar=None, dipole=None, aliases=(), topic='organic', set_dihedral=None, dih_key=None, geom=None, key=None, seed=7, extra=None):
    rd, cid = embed(smiles, seed)
    if set_dihedral:
        i, j, k, l, deg = set_dihedral
        rdMolTransforms.SetDihedralDeg(rd.GetConformer(cid), i, j, k, l, deg)
    m, sigma, pi, hyb = to_mol(id, rd, cid, key)
    if dih_key:
        m.key = {'dihedral': list(dih_key), 'label': 'H–C–C–H' if rd.GetAtomWithIdx(dih_key[0]).GetSymbol() == 'H' else 'C–C–C–C'}
    chir = ''
    try:
        rdCIPLabeler.AssignCIPLabels(rd)
        labels = [(a.GetIdx(), a.GetProp('_CIPCode')) for a in rd.GetAtoms() if a.HasProp('_CIPCode')]
        chir = ', '.join(f'{c}' for _, c in labels)
    except Exception:
        pass
    meta = dict(shape=shape, geom=geom, hybrid=hyb_text(hyb), angle=None, polar=polar, dipole=dipole, lone=None, notes=notes, aliases=list(aliases), sigma=sigma, pi=pi, cip=chir)
    if extra:
        meta.update(extra)
    reg(m, name, formula, topic, **meta)
    return rd, m


O = 'organic'
# ---------------------------------------- alkanes and conformations -----------------------------------
org('ethane_staggered', 'Ethane – staggered conformation', 'C₂H₆', 'CC', ['Every C–H bond on one carbon sits midway between the C–H bonds on the other (dihedral 60°). This is the most stable conformation.', 'Rotation about C–C is nearly free (barrier ≈ 12 kJ/mol): the staggered and eclipsed forms interconvert millions of times per second.'], shape='Tetrahedral at each C', polar=False, dipole=0, topic='conformations', set_dihedral=(2, 0, 1, 5, 60), dih_key=(2, 0, 1, 5), aliases=['conformers of ethane', 'newman'])
org('ethane_eclipsed', 'Ethane – eclipsed conformation', 'C₂H₆', 'CC', ['C–H bonds on the two carbons are directly in line (dihedral 0°). It is the least stable conformation: ≈ 12 kJ/mol (torsional strain) above the staggered form.', 'Torsional strain comes from repulsion between bonding electron pairs on adjacent carbons.'], shape='Tetrahedral at each C', polar=False, dipole=0, topic='conformations', set_dihedral=(2, 0, 1, 5, 0), dih_key=(2, 0, 1, 5), aliases=['conformers of ethane'])
org('butane_anti', 'n-Butane – anti conformation', 'C₄H₁₀', 'CCCC', ['The two CH₃ groups are 180° apart (dihedral C–C–C–C = 180°): the most stable conformer of butane.', 'Energy order: anti < gauche (+3.8 kJ/mol) < partially eclipsed < fully eclipsed.'], shape='Zig-zag chain', polar=False, dipole=0, topic='conformations', set_dihedral=(0, 1, 2, 3, 180), dih_key=(0, 1, 2, 3), aliases=['butane conformations'])
org('butane_gauche', 'n-Butane – gauche conformation', 'C₄H₁₀', 'CCCC', ['The CH₃ groups are 60° apart. About 3.8 kJ/mol less stable than anti because of steric (van der Waals) repulsion.'], shape='Chain', polar=False, topic='conformations', set_dihedral=(0, 1, 2, 3, 60), dih_key=(0, 1, 2, 3))
org('butane_eclipsed', 'n-Butane – fully eclipsed conformation', 'C₄H₁₀', 'CCCC', ['The two CH₃ groups are directly eclipsed (dihedral 0°): the highest-energy conformation of butane (≈ 19 kJ/mol above anti) from torsional + steric strain.'], shape='Chain', polar=False, topic='conformations', set_dihedral=(0, 1, 2, 3, 0), dih_key=(0, 1, 2, 3))
org('propane', 'Propane', 'C₃H₈', 'CCC', ['10 σ bonds (2 C–C + 8 C–H); ∠C–C–C ≈ 112° (slightly more than 109.5° because of CH₃ repulsion).'], shape='Zig-zag', polar=False, dipole=0.08)
org('isobutane', 'Isobutane (2-methylpropane)', 'C₄H₁₀', 'CC(C)C', ['Chain isomer of n-butane (same formula C₄H₁₀, branched skeleton). Branching lowers the boiling point: −11.7 °C vs −0.5 °C for n-butane.', 'Central C is bonded to three CH₃ groups and one H (a tertiary C–H).'], shape='Tetrahedral', polar=False, aliases=['2-methylpropane'], topic='isomers')
org('neopentane', 'Neopentane (2,2-dimethylpropane)', 'C₅H₁₂', 'CC(C)(C)C', ['Most branched isomer of pentane: nearly spherical, so weakest van der Waals forces and the lowest boiling point: 9.5 °C vs isopentane 28 °C and n-pentane 36 °C.', 'Central quaternary C has no hydrogens.'], shape='Tetrahedral', polar=False, dipole=0, topic='isomers', aliases=['2,2-dimethylpropane'])
org('cyclopropane', 'Cyclopropane', 'C₃H₆', 'C1CC1', ['C–C–C angle is forced to 60°, far from 109.5°: large angle strain (Baeyer strain, deviation 24°44′), and bent "banana" bonds. It is the most reactive cycloalkane.'], shape='Planar triangle', polar=False, dipole=0, aliases=['baeyer strain'])
org('cyclohexane', 'Cyclohexane (chair)', 'C₆H₁₂', 'C1CCCCC1', ['The chair conformation is strain-free: C–C–C ≈ 111° and all bonds staggered. Twelve H atoms are 6 axial (up/down) and 6 equatorial.', 'Boat and twist-boat forms are 30–45 kJ/mol less stable.'], shape='Chair', polar=False, dipole=0, aliases=['chair conformation'], topic='conformations')
# ---------------------------------------- alkenes, alkynes ---------------------------------------------
org('ethene', 'Ethene (ethylene)', 'C₂H₄', 'C=C', ['Both C are sp²: 5 σ bonds (1 C–C, 4 C–H) and 1 π bond. All six atoms lie in one plane, H–C–H ≈ 117°.', 'C=C 134 pm. The π bond (side-on overlap) prevents rotation, which is the origin of cis–trans isomerism.'], shape='Planar', polar=False, dipole=0, aliases=['ethylene'])
org('propene', 'Propene', 'C₃H₆', 'C=CC', ['CH₂=CH–CH₃: two sp² carbons and one sp³ carbon; 8 σ + 1 π bonds. Markovnikov addition: H adds to the C bearing more H atoms.'], shape='Planar at C=C', polar=True, dipole=0.37, aliases=['propylene'])
org('butadiene', '1,3-Butadiene', 'C₄H₆', 'C=CC=C', ['Conjugated diene: the central C–C (146 pm) is shorter than a normal C–C (154 pm) because of π-electron delocalisation over all four carbons (sp²).', 'Planar s-trans form shown; it undergoes 1,2- and 1,4-addition.'], shape='Planar', polar=False, dipole=0, aliases=['conjugation'])
org('allene', 'Propadiene (allene)', 'C₃H₄', 'C=C=C', ['The central C is sp-hybridised (180° C=C=C); the two terminal CH₂ planes are at 90° to each other because the two π bonds use perpendicular p orbitals.'], shape='Linear C₃ skeleton; CH₂ planes perpendicular', polar=False, dipole=0.0, aliases=['cumulene', 'propadiene'])
org('ethyne', 'Ethyne (acetylene)', 'C₂H₂', 'C#C', ['Both C are sp: 3 σ bonds + 2 π bonds. Linear (180°), C≡C 120 pm, C–H 106 pm.', 'The sp C–H is the most acidic hydrocarbon C–H (pKa ≈ 25) because sp orbitals have 50% s-character.'], shape='Linear', polar=False, dipole=0, aliases=['acetylene'])
org('cis_2_butene', 'cis-2-Butene', 'C₄H₈', 'C/C=C\\C', ['Same groups on the same side of the C=C: (Z)-isomer. Geometrical isomerism arises from restricted rotation about C=C.', 'Polar (μ ≈ 0.3 D) and slightly higher boiling point (3.7 °C) than the trans isomer (0.9 °C), which is non-polar and more stable.'], shape='Planar at C=C', polar=True, dipole=0.3, topic='isomers', aliases=['Z-2-butene', 'geometrical isomerism'])
org('trans_2_butene', 'trans-2-Butene', 'C₄H₈', 'C/C=C/C', ['CH₃ groups on opposite sides of the C=C: (E)-isomer. Dipole moments of the two C–CH₃ bonds cancel, so it is non-polar and more stable than cis (less steric strain); it packs better, so its melting point is higher.'], shape='Planar at C=C', polar=False, dipole=0, topic='isomers', aliases=['E-2-butene', 'geometrical isomerism'])
# ---------------------------------------- aromatics ---------------------------------------------------
org('benzene', 'Benzene', 'C₆H₆', 'c1ccccc1', ['Planar regular hexagon: six sp² carbons, 12 σ bonds and 3 π bonds delocalised over the ring (6 π electrons = aromatic, Hückel 4n+2). All C–C are 139 pm (between 154 and 134).', 'Resonance energy ≈ 150 kJ/mol makes it much more stable than hypothetical cyclohexatriene; it does substitution (not addition) reactions.'], shape='Planar hexagon', polar=False, dipole=0, aliases=['aromatic', 'kekule', 'resonance'])
org('toluene', 'Toluene (methylbenzene)', 'C₇H₈', 'Cc1ccccc1', ['CH₃ is an activating, ortho/para-directing group. Side-chain oxidation (KMnO₄) gives benzoic acid.'], shape='Planar ring + CH₃', polar=True, dipole=0.36, aliases=['methylbenzene'])
org('phenol', 'Phenol', 'C₆H₅OH', 'Oc1ccccc1', ['The O lone pair is delocalised into the ring (sp² O), so the C–O bond is shorter and phenol is far more acidic (pKa 10) than ethanol (pKa 16).', 'OH is a strongly activating, ortho/para-directing group; it gives a violet colour with neutral FeCl₃.'], shape='Planar', polar=True, aliases=['carbolic acid', 'hydroxybenzene'])
org('aniline', 'Aniline', 'C₆H₅NH₂', 'Nc1ccccc1', ['The N lone pair is partly delocalised into the ring (hence aniline is a weaker base than methylamine); NH₂ is activating and ortho/para-directing.', 'Gives the diazonium salt with HNO₂ at 0–5 °C.'], shape='Planar ring; slightly pyramidal N', polar=True, dipole=1.53, aliases=['aminobenzene', 'phenylamine'])
org('nitrobenzene', 'Nitrobenzene', 'C₆H₅NO₂', '[O-][N+](=O)c1ccccc1', ['The NO₂ group is planar with the ring; both N–O bonds are equal (resonance). It is a deactivating, meta-directing group.', 'Prepared by nitrating benzene with conc. HNO₃ + conc. H₂SO₄ (the nitronium ion NO₂⁺ is the electrophile).'], shape='Planar', polar=True, dipole=4.22, aliases=['nitration'])
org('benzoic_acid', 'Benzoic acid', 'C₆H₅COOH', 'OC(=O)c1ccccc1', ['COOH is a deactivating, meta-directing group. Stronger acid (pKa 4.2) than acetic acid (4.76) because the sp² ring stabilises the carboxylate.'], shape='Planar', polar=True)
org('chlorobenzene', 'Chlorobenzene', 'C₆H₅Cl', 'Clc1ccccc1', ['Cl is deactivating but ortho/para-directing. The C–Cl bond is stronger and shorter than in alkyl chlorides (partial double-bond character by resonance), so it resists nucleophilic substitution.'], shape='Planar', polar=True, dipole=1.69)
org('naphthalene', 'Naphthalene', 'C₁₀H₈', 'c1ccc2ccccc2c1', ['Two fused benzene rings: planar, 10 sp² carbons, 10 π electrons (aromatic). It sublimes easily (moth balls).', 'Resonance energy ≈ 255 kJ/mol. Substitution happens first at the α-position (C1).'], shape='Planar, fused rings', polar=False, dipole=0)
# ---------------------------------------- haloalkanes -------------------------------------------------
org('chloromethane', 'Chloromethane (methyl chloride)', 'CH₃Cl', 'CCl', ['Tetrahedral C; polar C–Cl bond (μ = 1.87 D). The simplest haloalkane; SN2 substrate.'], shape='Tetrahedral', polar=True, dipole=1.87, aliases=['methyl chloride'])
org('dichloromethane', 'Dichloromethane', 'CH₂Cl₂', 'ClCCl', ['Dipole 1.60 D. Compare the methane series: CH₃Cl 1.87 D, CH₂Cl₂ 1.60 D, CHCl₃ 1.04 D, CCl₄ 0.'], shape='Tetrahedral', polar=True, dipole=1.60, aliases=['methylene chloride'])
org('chloroform', 'Chloroform (trichloromethane)', 'CHCl₃', 'ClC(Cl)Cl', ['Tetrahedral but unsymmetrical, so polar (1.04 D). Oxidised slowly by air/light to toxic phosgene (COCl₂), so it is stored in dark bottles.'], shape='Tetrahedral', polar=True, dipole=1.04, aliases=['trichloromethane'])
org('ccl4', 'Carbon tetrachloride', 'CCl₄', 'ClC(Cl)(Cl)Cl', ['Perfect tetrahedron (Cl–C–Cl = 109.5°): four polar C–Cl bonds cancel, so CCl₄ is NON-polar (μ = 0).', 'Not hydrolysed by water (no vacant orbital on C for attack).'], shape='Tetrahedral', polar=False, dipole=0, aliases=['tetrachloromethane'])
# ---------------------------------------- oxygen & nitrogen compounds ----------------------------------
org('methanol', 'Methanol', 'CH₃OH', 'CO', ['O is sp³ with two lone pairs; C–O–H ≈ 108.5°, smaller than the C–O–C angle in ethers. Hydrogen bonding gives it a high boiling point (65 °C).'], shape='Tetrahedral at C; bent at O', polar=True, dipole=1.70, aliases=['methyl alcohol', 'wood spirit'])
org('ethanol', 'Ethanol', 'C₂H₅OH', 'CCO', ['Isomer of dimethyl ether (same formula C₂H₆O) but boils at 78 °C because of hydrogen bonding; dimethyl ether boils at −24 °C. A classic functional-group isomer pair.'], shape='Tetrahedral at C; bent at O', polar=True, dipole=1.69, aliases=['ethyl alcohol'], topic='isomers')
org('dimethyl_ether', 'Dimethyl ether', 'CH₃OCH₃', 'COC', ['C–O–C angle ≈ 111° (bigger than H–O–H in water because of the bulky CH₃ groups). No O–H, so no hydrogen bonding and a much lower boiling point than ethanol.'], shape='Bent at O', polar=True, dipole=1.30, aliases=['methoxymethane'], topic='isomers')
org('diethyl_ether', 'Diethyl ether', 'C₂H₅OC₂H₅', 'CCOCC', ['An ether: sp³ O bonded to two ethyl groups, C–O–C ≈ 112°. Volatile, highly flammable solvent; forms explosive peroxides on standing.'], shape='Bent at O', polar=True, dipole=1.15, aliases=['ethoxyethane', 'ether'])
org('ethylene_glycol', 'Ethylene glycol (ethane-1,2-diol)', 'HOCH₂CH₂OH', 'OCCO', ['A dihydric alcohol (two –OH): strong hydrogen bonding makes it viscous and gives a high boiling point (197 °C). Used as antifreeze.'], shape='Chain', polar=True, aliases=['glycol', 'antifreeze', 'ethane-1,2-diol'])
org('glycerol', 'Glycerol (propane-1,2,3-triol)', 'HOCH₂CH(OH)CH₂OH', 'OCC(O)CO', ['A trihydric alcohol, viscous because of extensive hydrogen bonding. The backbone of fats and oils (triglycerides); nitrated to give nitroglycerine.'], shape='Chain', polar=True, aliases=['glycerine', 'propane-1,2,3-triol'])
org('formaldehyde', 'Methanal (formaldehyde)', 'HCHO', 'C=O', ['Planar: C is sp² (3 σ + 1 π), H–C–H ≈ 116°, H–C=O ≈ 122°. Polar C=O (μ = 2.33 D); the carbonyl C is electrophilic.', 'Aqueous solution (formalin, 40%) preserves biological specimens.'], shape='Trigonal planar', polar=True, dipole=2.33, aliases=['formaldehyde', 'formalin'])
org('acetaldehyde', 'Ethanal (acetaldehyde)', 'CH₃CHO', 'CC=O', ['Carbonyl carbon is sp², CH₃ carbon sp³. Gives positive Tollens’, Fehling’s and iodoform tests.'], shape='Trigonal planar at C=O', polar=True, dipole=2.7, aliases=['acetaldehyde'])
org('acetone', 'Propanone (acetone)', 'CH₃COCH₃', 'CC(C)=O', ['Simplest ketone: C=O carbon sp², C–C(=O)–C ≈ 116°. Highly polar (2.88 D). Gives the iodoform test (methyl ketone) but not Tollens’ or Fehling’s.'], shape='Trigonal planar at C=O', polar=True, dipole=2.88, aliases=['dimethyl ketone', 'propanone'])
org('formic_acid', 'Methanoic acid (formic acid)', 'HCOOH', 'OC=O', ['Has both an aldehyde-like H–C=O and a carboxyl group, so it can reduce Tollens’ reagent. Strongest simple carboxylic acid (pKa 3.75).'], shape='Planar', polar=True, aliases=['formic acid', 'methanoic acid'])
org('acetic_acid', 'Ethanoic acid (acetic acid)', 'CH₃COOH', 'CC(=O)O', ['Carboxyl carbon is sp²; the carboxylate ion CH₃COO⁻ has two equal C–O bonds (resonance), which explains why carboxylic acids are much more acidic than alcohols.', 'Forms hydrogen-bonded dimers; vinegar is 5–8% acetic acid.'], shape='Trigonal planar at COOH', polar=True, dipole=1.74, aliases=['acetic acid', 'vinegar'])
org('ethyl_acetate', 'Ethyl ethanoate (ethyl acetate)', 'CH₃COOC₂H₅', 'CC(=O)OCC', ['An ester made from acetic acid and ethanol (Fischer esterification, with conc. H₂SO₄). Fruity smell; hydrolysed by acid or base (saponification).'], shape='Planar ester group', polar=True, dipole=1.78, aliases=['ester'])
org('acetamide', 'Ethanamide (acetamide)', 'CH₃CONH₂', 'CC(N)=O', ['The amide N lone pair is delocalised into C=O (resonance), so N is planar (sp²), the C–N bond is short, and amides are very weak bases. Hofmann bromamide reaction converts it to methylamine.'], shape='Planar amide group', polar=True, aliases=['acetamide', 'amide'])
org('urea', 'Urea (carbamide)', 'NH₂CONH₂', 'NC(N)=O', ['First organic compound synthesised from an inorganic one (Wöhler, 1828: NH₄OCN → urea). Planar amide groups; 46% nitrogen, an important fertiliser.'], shape='Planar', polar=True, aliases=['carbamide', 'wohler'])
org('acetonitrile', 'Ethanenitrile (acetonitrile)', 'CH₃CN', 'CC#N', ['The C≡N carbon is sp (linear C–C≡N, 180°), 2 π bonds. A strongly polar aprotic solvent (3.92 D). Hydrolyses to acetic acid.'], shape='Linear C–C≡N', polar=True, dipole=3.92, aliases=['methyl cyanide', 'cyanide', 'nitrile'])
org('oxalic_acid', 'Oxalic acid (ethanedioic acid)', 'HOOC–COOH', 'OC(=O)C(O)=O', ['The simplest dicarboxylic acid; dibasic. Used as a primary standard in redox titration with KMnO₄ (5H₂C₂O₄ + 2MnO₄⁻ + 6H⁺ → 10CO₂ + 2Mn²⁺ + 8H₂O).'], shape='Planar', polar=False, aliases=['ethanedioic acid', 'oxalate'])
org('methylamine', 'Methylamine', 'CH₃NH₂', 'CN', ['N is sp³ with one lone pair (pyramidal); C–N–H ≈ 110°. A stronger base than ammonia in the gas phase and in water (alkyl groups push electrons to N).'], shape='Pyramidal at N', polar=True, dipole=1.31, aliases=['amine'])
org('dimethylamine', 'Dimethylamine', 'CH₃NHCH₃', 'CNC', ['A secondary amine: N bonded to 2 C and 1 H, with one lone pair. Basic strength in water: (CH₃)₂NH > CH₃NH₂ > (CH₃)₃N > NH₃.'], shape='Pyramidal at N', polar=True, dipole=1.0, aliases=['secondary amine'])
org('trimethylamine', 'Trimethylamine', '(CH₃)₃N', 'CN(C)C', ['A tertiary amine: no N–H bonds, so no hydrogen bonding between its molecules. C–N–C ≈ 111°. Smells of fish.'], shape='Trigonal pyramidal', polar=True, dipole=0.61, aliases=['tertiary amine'])
# ---------------------------------------- biomolecules and drugs -----------------------------------------
org('glycine', 'Glycine (zwitterion)', '⁺H₃N–CH₂–COO⁻', '[NH3+]CC(=O)[O-]', ['In water and in the solid state amino acids exist as zwitterions: the –COOH gives H⁺ to –NH₂, so the molecule has both +NH₃ and COO⁻ and is neutral overall.', 'Glycine is the only achiral amino acid (its α-carbon bears two H atoms). It has high melting point and solubility like an ionic salt.'], shape='Tetrahedral at C and N', polar=True, aliases=['amino acid', 'zwitterion'], topic='bio')
rd, m = org('l_alanine', 'L-Alanine (zwitterion)', 'CH₃CH(NH₃⁺)COO⁻', 'C[C@H]([NH3+])C(=O)[O-]', ['A chiral α-amino acid with four different groups on the α-carbon. Natural proteins contain only L-amino acids (almost all with S configuration; cysteine is the exception).'], shape='Tetrahedral at Cα', polar=True, aliases=['alanine', 'chirality', 'optical isomer'], topic='bio')
org('r_lactic', '(R)-Lactic acid', 'CH₃CH(OH)COOH', 'C[C@@H](O)C(=O)O', ['Mirror image (enantiomer) of (S)-lactic acid. A chiral centre has four different groups: –H, –OH, –CH₃, –COOH. Enantiomers rotate plane-polarised light equally in opposite directions.'], shape='Tetrahedral at chiral C', polar=True, aliases=['enantiomer', 'optical isomerism', 'D-lactic'], topic='isomers')
org('s_lactic', '(S)-Lactic acid', 'CH₃CH(OH)COOH', 'C[C@H](O)C(=O)O', ['Found in sour milk and in muscle during exercise (L-(+)-lactic acid). Compare it with the R form: the two are non-superimposable mirror images.'], shape='Tetrahedral at chiral C', polar=True, aliases=['enantiomer', 'optical isomerism', 'L-lactic'], topic='isomers')
org('alpha_glucose', 'α-D-Glucopyranose', 'C₆H₁₂O₆', 'OC[C@H]1O[C@H](O)[C@H](O)[C@@H](O)[C@@H]1O', ['The cyclic six-membered (pyranose) chair form of glucose. In the α anomer the anomeric –OH (C1) is axial, trans to the CH₂OH group.', 'Anomers differ only at C1; they interconvert in water (mutarotation) through the open-chain form.'], shape='Chair (pyranose ring)', polar=True, aliases=['glucose', 'carbohydrate', 'anomer'], topic='bio')
org('beta_glucose', 'β-D-Glucopyranose', 'C₆H₁₂O₆', 'OC[C@H]1O[C@@H](O)[C@H](O)[C@@H](O)[C@@H]1O', ['In the β anomer the C1 –OH is equatorial, cis to the CH₂OH. All large groups equatorial makes β-D-glucose the most stable form (64% at equilibrium). Cellulose is a polymer of β-glucose; starch of α-glucose.'], shape='Chair (pyranose ring)', polar=True, aliases=['glucose', 'carbohydrate', 'anomer', 'cellulose'], topic='bio')
org('aspirin', 'Aspirin (acetylsalicylic acid)', 'CH₃COOC₆H₄COOH', 'CC(=O)Oc1ccccc1C(O)=O', ['Analgesic, antipyretic and anti-platelet drug; made by acetylating salicylic acid with acetic anhydride. Contains an ester and a carboxylic acid on a benzene ring.'], shape='Planar ring with twisted ester', polar=True, aliases=['acetylsalicylic acid', 'drug', 'analgesic'], topic='bio')
org('paracetamol', 'Paracetamol (acetaminophen)', 'CH₃CONHC₆H₄OH', 'CC(=O)Nc1ccc(O)cc1', ['Antipyretic and mild analgesic (not anti-inflammatory); contains a phenolic –OH and an amide. Made by acetylating p-aminophenol.'], shape='Planar ring + amide', polar=True, aliases=['acetaminophen', 'drug', 'antipyretic'], topic='bio')
