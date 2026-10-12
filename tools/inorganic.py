import math
import numpy as np
from geom import *
from registry import reg, REG

T = 'vsepr'


def diatomic(id, a, b, d, order):
    m = Mol(id)
    i = m.add(a, (0, 0, -d / 2))
    j = m.add(b, (0, 0, d / 2))
    m.bond(i, j, order)
    m.key = {'dist': [i, j], 'label': f'{a}–{b}'}
    return m


def vs(id, central, base, use, ligs, lp=(), adjust=None):
    m = Mol(id)
    c = m.add(central, (0, 0, 0))
    idx = vsepr(m, c, base, use, ligs, lp, adjust)
    return m, c, idx


def hyd(m, O, X, ref, dih=180, d=0.96, a=108):
    """Attach an H to hydroxyl O (bonded to X) with a dihedral relative to ref (bonded to X)."""
    h = m.zplace('H', O, X, ref, d, a, dih)
    m.bond(O, h, 1)
    return h


# =============================== simple molecules (class 11 VSEPR) ==================================
m = diatomic('h2', 'H', 'H', 0.74, 1)
reg(m, 'Hydrogen', 'H₂', T, shape='Linear (diatomic)', geom='Linear', hybrid='σ(1s–1s) overlap', angle='—', polar=False, dipole=0, lone=0,
    notes=['The simplest covalent bond: two 1s orbitals overlap end-on to make one σ bond.', 'Bond length 74 pm, bond energy 436 kJ/mol. Diamagnetic (σ1s² in MO theory), bond order 1.'])

m = diatomic('o2', 'O', 'O', 1.21, 2)
reg(m, 'Oxygen', 'O₂', T, shape='Linear (diatomic)', geom='Linear', hybrid='1σ + 1π', angle='—', polar=False, dipole=0, lone=2,
    notes=['O=O: one σ and one π bond; bond length 121 pm, bond order 2.', 'Paramagnetic: two unpaired electrons sit in the π*2p orbitals. Lewis structures cannot show this, but molecular orbital theory does.'])

m = diatomic('n2', 'N', 'N', 1.10, 3)
reg(m, 'Nitrogen', 'N₂', T, shape='Linear (diatomic)', geom='Linear', hybrid='1σ + 2π', angle='—', polar=False, dipole=0, lone=1,
    notes=['N≡N: one σ and two π bonds; bond length 110 pm, bond order 3, bond energy 946 kJ/mol.', 'Diamagnetic and very inert because of the strong triple bond. Isoelectronic with CO, CN⁻ and NO⁺.'])

m = diatomic('hcl', 'H', 'Cl', 1.27, 1)
reg(m, 'Hydrogen chloride', 'HCl', T, shape='Linear (diatomic)', geom='Linear', hybrid='σ(s–p) overlap', angle='—', polar=True, dipole=1.08, lone=3,
    notes=['Polar covalent: Cl is more electronegative, so H carries δ⁺ and Cl carries δ⁻. Dipole moment ≈ 1.08 D.', 'Bond length 127 pm. Dipole moment = charge × distance (μ = q × d).'])

m = diatomic('co', 'C', 'O', 1.13, 3)
reg(m, 'Carbon monoxide', 'CO', T, shape='Linear (diatomic)', geom='Linear', hybrid='sp (both atoms)', angle='—', polar=True, dipole=0.11, lone=1,
    notes=['C≡O has one σ and two π bonds; one of the π bonds is a coordinate (dative) bond from O to C.', 'Isoelectronic with N₂ and CN⁻, bond order 3, bond length 113 pm. Toxic because it binds haemoglobin about 200× more strongly than O₂.'])

m, c, i = vs('h2o', 'O', 'tet', [0, 1], [('H', 0.96, 1)] * 2, [2, 3], lambda d, v: list(pair_angle(d[0], d[1], 104.5)))
m.key = {'angle': [1, 0, 2], 'label': 'H–O–H'}
reg(m, 'Water', 'H₂O', T, shape='Bent (V-shaped)', geom='Tetrahedral', hybrid='sp³', angle='104.5°', polar=True, dipole=1.85, lone=2,
    notes=['Four electron pairs (2 bond pairs + 2 lone pairs) → tetrahedral arrangement, bent shape.', 'Lone pair–lone pair repulsion > lone pair–bond pair > bond pair–bond pair, so the angle shrinks from 109.5° to 104.5°.', 'Strongly polar (1.85 D) and forms hydrogen bonds, which explains its high boiling point.'])

m, c, i = vs('h2s', 'S', 'tet', [0, 1], [('H', 1.34, 1)] * 2, [2, 3], lambda d, v: list(pair_angle(d[0], d[1], 92.1)))
m.key = {'angle': [1, 0, 2], 'label': 'H–S–H'}
reg(m, 'Hydrogen sulfide', 'H₂S', T, shape='Bent (V-shaped)', geom='Tetrahedral (textbook)', hybrid='sp³ (textbook)', angle='92°', polar=True, dipole=0.97, lone=2,
    notes=['Bond angle trend down the group: H₂O 104.5° > H₂S 92° > H₂Se 91° > H₂Te 90°.', 'S is larger and less electronegative than O, so bond pairs sit farther from S and repel less; S uses nearly pure p orbitals.'])

m, c, i = vs('nh3', 'N', 'tet', [0, 1, 2], [('H', 1.01, 1)] * 3, [3], lambda d, v: cone(-np.array(v[3]), 3, 107.3))
m.key = {'angle': [1, 0, 2], 'label': 'H–N–H'}
reg(m, 'Ammonia', 'NH₃', T, shape='Trigonal pyramidal', geom='Tetrahedral', hybrid='sp³', angle='107°', polar=True, dipole=1.47, lone=1,
    notes=['3 bond pairs + 1 lone pair: the lone pair pushes the N–H bonds closer, so 107° instead of 109.5°.', 'Dipole moment 1.47 D. In NF₃ it is only 0.23 D because the N–F bond dipoles oppose the lone-pair dipole.', 'Compare: PH₃ 93.5°, AsH₃ 91.8°. Angle falls down the group.'])

m, c, i = vs('ch4', 'C', 'tet', [0, 1, 2, 3], [('H', 1.09, 1)] * 4)
m.key = {'angle': [1, 0, 2], 'label': 'H–C–H'}
reg(m, 'Methane', 'CH₄', T, shape='Tetrahedral', geom='Tetrahedral', hybrid='sp³', angle='109.5°', polar=False, dipole=0, lone=0,
    notes=['Four equivalent σ(sp³–s) bonds, C–H 109 pm, all angles 109.5°.', 'Non-polar because the four bond dipoles cancel by symmetry.'])

m, c, i = vs('bf3', 'B', 'tri', [0, 1, 2], [('F', 1.31, 1)] * 3)
m.key = {'angle': [1, 0, 2], 'label': 'F–B–F'}
reg(m, 'Boron trifluoride', 'BF₃', T, shape='Trigonal planar', geom='Trigonal planar', hybrid='sp²', angle='120°', polar=False, dipole=0, lone=0,
    notes=['Electron-deficient: boron has only 6 electrons, so BF₃ is a Lewis acid (it accepts a pair, forming BF₄⁻ with sp³ B).', 'B–F bond (130 pm) is shorter than expected because of pπ–pπ back-bonding from F lone pairs. Lewis acidity: BBr₃ > BCl₃ > BF₃.'])

m, c, i = vs('becl2', 'Be', 'lin', [0, 1], [('Cl', 1.75, 1)] * 2)
m.key = {'angle': [1, 0, 2], 'label': 'Cl–Be–Cl'}
reg(m, 'Beryllium chloride (gas)', 'BeCl₂', T, shape='Linear', geom='Linear', hybrid='sp', angle='180°', polar=False, dipole=0, lone=0,
    notes=['Gas-phase monomer is linear and sp-hybridised. Be has only 4 electrons in the valence shell (electron-deficient).', 'In the solid state it forms a chain polymer with bridging Cl atoms.'])

m, c, i = vs('co2', 'C', 'lin', [0, 1], [('O', 1.16, 2)] * 2)
m.key = {'angle': [1, 0, 2], 'label': 'O=C=O'}
reg(m, 'Carbon dioxide', 'CO₂', T, shape='Linear', geom='Linear', hybrid='sp', angle='180°', polar=False, dipole=0, lone=0,
    notes=['2 σ + 2 π bonds; C=O 116 pm (shorter than a normal C=O, ~121 pm).', 'Each C=O bond is polar but the dipoles cancel, so the molecule is non-polar.'])

m, c, i = vs('so2', 'S', 'tri', [0, 1], [('O', 1.43, 2)] * 2, [2], lambda d, v: list(pair_angle(d[0], d[1], 119.5)))
m.key = {'angle': [1, 0, 2], 'label': 'O–S–O'}
reg(m, 'Sulfur dioxide', 'SO₂', T, shape='Bent (V-shaped)', geom='Trigonal planar', hybrid='sp²', angle='119°', polar=True, dipole=1.63, lone=1,
    notes=['2 bond pairs + 1 lone pair on S: bent. Both S–O bonds are identical (resonance).', 'Polar (1.63 D); acidic oxide, bleaches by reduction, causes acid rain.'])

m, c, i = vs('so3', 'S', 'tri', [0, 1, 2], [('O', 1.42, 2)] * 3)
m.key = {'angle': [1, 0, 2], 'label': 'O–S–O'}
reg(m, 'Sulfur trioxide', 'SO₃', T, shape='Trigonal planar', geom='Trigonal planar', hybrid='sp²', angle='120°', polar=False, dipole=0, lone=0,
    notes=['Three equivalent S–O bonds (resonance), S–O 142 pm.', 'Non-polar, strongly acidic oxide: SO₃ + H₂O → H₂SO₄.'])

m, c, i = vs('o3', 'O', 'tri', [0, 1], [('O', 1.28, 1.5)] * 2, [2], lambda d, v: list(pair_angle(d[0], d[1], 116.8)))
m.key = {'angle': [1, 0, 2], 'label': 'O–O–O'}
reg(m, 'Ozone', 'O₃', T, shape='Bent (V-shaped)', geom='Trigonal planar', hybrid='sp²', angle='117°', polar=True, dipole=0.53, lone=1,
    notes=['Two equivalent O–O bonds of 128 pm (between a single 148 pm and a double 121 pm): resonance hybrid, bond order 1.5.', 'Polar even though all atoms are the same: the central O is positive and the end O atoms share the negative charge.'])

m, c, i = vs('pcl3', 'P', 'tet', [0, 1, 2], [('Cl', 2.04, 1)] * 3, [3], lambda d, v: cone(-np.array(v[3]), 3, 100.3))
m.key = {'angle': [1, 0, 2], 'label': 'Cl–P–Cl'}
reg(m, 'Phosphorus trichloride', 'PCl₃', T, shape='Trigonal pyramidal', geom='Tetrahedral', hybrid='sp³', angle='100°', polar=True, dipole=0.56, lone=1,
    notes=['One lone pair on P compresses the Cl–P–Cl angle to about 100°.', 'Hydrolyses in water to H₃PO₃ and HCl.'])

m, c, i = vs('pcl5', 'P', 'tbp', [0, 1, 2, 3, 4], [('Cl', 2.19, 1)] * 2 + [('Cl', 2.04, 1)] * 3)
m.key = {'angle': [1, 0, 2], 'label': 'Cl(ax)–P–Cl(ax)'}
reg(m, 'Phosphorus pentachloride', 'PCl₅', T, shape='Trigonal bipyramidal', geom='Trigonal bipyramidal', hybrid='sp³d', angle='90° and 120°', polar=False, dipole=0, lone=0,
    notes=['Two axial P–Cl bonds (219 pm) are longer than the three equatorial ones (204 pm) because of greater repulsion from the 3 equatorial pairs.', 'Non-polar overall. In the solid state it is ionic: [PCl₄]⁺[PCl₆]⁻.'])


def sf4_adj(d, v):
    lp = np.array(v[4])
    ax = [tilt(d[0], -lp, 3.5), tilt(d[1], -lp, 3.5)]
    return ax + list(pair_angle(d[2], d[3], 101.6))


m, c, i = vs('sf4', 'S', 'tbp', [0, 1, 2, 3], [('F', 1.65, 1)] * 2 + [('F', 1.55, 1)] * 2, [4], sf4_adj)
m.key = {'angle': [1, 0, 2], 'label': 'F(ax)–S–F(ax)'}
reg(m, 'Sulfur tetrafluoride', 'SF₄', T, shape='See-saw (distorted tetrahedral)', geom='Trigonal bipyramidal', hybrid='sp³d', angle='≈ 173° (axial), 101.6° (equatorial)', polar=True, dipole=0.63, lone=1,
    notes=['The lone pair sits in an equatorial position (minimum repulsion), giving the see-saw shape.', '4 bond pairs + 1 lone pair: AX₄E.'])


def clf3_adj(d, v):
    return [tilt(d[0], d[2], 2.5), tilt(d[1], d[2], 2.5), d[2]]


m, c, i = vs('clf3', 'Cl', 'tbp', [0, 1, 2], [('F', 1.70, 1)] * 2 + [('F', 1.60, 1)], [3, 4], clf3_adj)
m.key = {'angle': [1, 0, 3], 'label': 'F(ax)–Cl–F(eq)'}
reg(m, 'Chlorine trifluoride', 'ClF₃', T, shape='T-shaped', geom='Trigonal bipyramidal', hybrid='sp³d', angle='87.5°', polar=True, dipole=0.55, lone=2,
    notes=['Both lone pairs occupy equatorial positions, leaving a T shape (AX₃E₂).', 'Same shape as BrF₃. Compare with BF₃ (trigonal planar, no lone pair).'])

m, c, i = vs('xef2', 'Xe', 'tbp', [0, 1], [('F', 1.98, 1)] * 2, [2, 3, 4])
m.key = {'angle': [1, 0, 2], 'label': 'F–Xe–F'}
reg(m, 'Xenon difluoride', 'XeF₂', T, shape='Linear', geom='Trigonal bipyramidal', hybrid='sp³d', angle='180°', polar=False, dipole=0, lone=3,
    notes=['Three lone pairs lie in the equatorial plane (AX₂E₃), so the two F atoms are axial and linear.', 'Non-polar. Isoelectronic and isostructural with I₃⁻ and ICl₂⁻.'])

m, c, i = vs('sf6', 'S', 'oct', [0, 1, 2, 3, 4, 5], [('F', 1.56, 1)] * 6)
m.key = {'angle': [1, 0, 3], 'label': 'F–S–F'}
reg(m, 'Sulfur hexafluoride', 'SF₆', T, shape='Octahedral', geom='Octahedral', hybrid='sp³d²', angle='90°', polar=False, dipole=0, lone=0,
    notes=['Six equivalent S–F bonds, all angles 90° (and 180° across).', 'Chemically inert (F atoms shield S); a greenhouse gas used as an insulator in switchgear.'])


def brf5_adj(d, v):
    return [d[0]] + [tilt(x, d[0], 5.2) for x in d[1:]]


m, c, i = vs('brf5', 'Br', 'oct', [0, 2, 3, 4, 5], [('F', 1.68, 1)] + [('F', 1.77, 1)] * 4, [1], brf5_adj)
m.key = {'angle': [1, 0, 2], 'label': 'F(ap)–Br–F(basal)'}
reg(m, 'Bromine pentafluoride', 'BrF₅', T, shape='Square pyramidal', geom='Octahedral', hybrid='sp³d²', angle='84.8°', polar=True, dipole=1.51, lone=1,
    notes=['5 bond pairs + 1 lone pair (AX₅E): the lone pair sits trans to the apical F, and the four basal F atoms bend slightly toward the apical F (84.8° instead of 90°).', 'Same shape as XeOF₄ and IF₅.'])

m, c, i = vs('xef4', 'Xe', 'oct', [2, 3, 4, 5], [('F', 1.95, 1)] * 4, [0, 1])
m.key = {'angle': [1, 0, 3], 'label': 'F–Xe–F'}
reg(m, 'Xenon tetrafluoride', 'XeF₄', T, shape='Square planar', geom='Octahedral', hybrid='sp³d²', angle='90°', polar=False, dipole=0, lone=2,
    notes=['Two lone pairs occupy the axial positions, trans to each other (AX₄E₂), leaving a planar square of F atoms.', 'Non-polar. Prepared by heating Xe and F₂ (1 : 5) at 873 K and 7 bar: Xe + 2F₂ → XeF₄.'])

m, c, i = vs('if7', 'I', 'pbp', list(range(7)), [('F', 1.79, 1)] * 2 + [('F', 1.86, 1)] * 5)
m.key = {'angle': [1, 0, 3], 'label': 'F(ax)–I–F(eq)'}
reg(m, 'Iodine heptafluoride', 'IF₇', T, shape='Pentagonal bipyramidal', geom='Pentagonal bipyramidal', hybrid='sp³d³', angle='90° and 72°', polar=False, dipole=0, lone=0,
    notes=['7 bond pairs: 5 equatorial (72° apart) and 2 axial (90° to the plane). The only common sp³d³ example.', 'Non-polar by symmetry; I is in the +7 oxidation state.'])

m, c, i = vs('xeo3', 'Xe', 'tet', [0, 1, 2], [('O', 1.76, 2)] * 3, [3], lambda d, v: cone(-np.array(v[3]), 3, 103.0))
m.key = {'angle': [1, 0, 2], 'label': 'O–Xe–O'}
reg(m, 'Xenon trioxide', 'XeO₃', T, shape='Trigonal pyramidal', geom='Tetrahedral', hybrid='sp³', angle='≈ 103°', polar=True, dipole=None, lone=1,
    notes=['Xe is in the +6 state; isostructural with ClO₃⁻ and SO₃²⁻ (pyramidal, one lone pair).', 'Dangerously explosive solid. Formed by hydrolysis of XeF₆.'])

m, c, i = vs('xeo4', 'Xe', 'tet', [0, 1, 2, 3], [('O', 1.74, 2)] * 4)
m.key = {'angle': [1, 0, 2], 'label': 'O–Xe–O'}
reg(m, 'Xenon tetroxide', 'XeO₄', T, shape='Tetrahedral', geom='Tetrahedral', hybrid='sp³', angle='109.5°', polar=False, dipole=0, lone=0,
    notes=['Xe is in the +8 state, isoelectronic with IO₄⁻ and isostructural with ClO₄⁻. Unstable and explosive.'])

m, c, i = vs('xeof4', 'Xe', 'oct', [0, 2, 3, 4, 5], [('O', 1.70, 2)] + [('F', 1.90, 1)] * 4, [1])
m.key = {'angle': [1, 0, 2], 'label': 'O=Xe–F'}
reg(m, 'Xenon oxytetrafluoride', 'XeOF₄', T, shape='Square pyramidal', geom='Octahedral', hybrid='sp³d²', angle='≈ 90°', polar=True, dipole=None, lone=1,
    notes=['Xe is +6: 4 Xe–F bonds, one Xe=O and one lone pair (AX₅E), exactly like BrF₅ in shape.', 'Made by partial hydrolysis of XeF₆.'])

m = Mol('hcn')
C0 = m.add('C', (0, 0, 0)); H0 = m.add('H', (0, 0, -1.06)); N0 = m.add('N', (0, 0, 1.16))
m.bond(C0, H0, 1); m.bond(C0, N0, 3); m.key = {'angle': [1, 0, 2], 'label': 'H–C≡N'}
reg(m, 'Hydrogen cyanide', 'HCN', T, shape='Linear', geom='Linear', hybrid='sp', angle='180°', polar=True, dipole=2.98, lone=1,
    notes=['C is sp-hybridised: 2 σ bonds + 2 π bonds (C≡N). Weak acid (pKa 9.2); very poisonous.'])

m = Mol('n2o')
Na = m.add('N', (0, 0, 0)); Nb = m.add('N', (0, 0, 1.13)); Oc = m.add('O', (0, 0, 2.32))
m.bond(Na, Nb, 3); m.bond(Nb, Oc, 1); m.key = {'angle': [0, 1, 2], 'label': 'N–N–O'}
reg(m, 'Nitrous oxide', 'N₂O', T, shape='Linear (N–N–O)', geom='Linear', hybrid='sp (central N)', angle='180°', polar=True, dipole=0.17, lone=0,
    notes=['Laughing gas. Resonance between N≡N⁺–O⁻ and ⁻N=N⁺=O. Central N is sp-hybridised; isoelectronic with CO₂.', 'Asymmetric (N–N–O), so slightly polar.'])

# ---- hydrogen peroxide (non-planar "open book")
m = Mol('h2o2')
o1 = m.add('O', (0, 0, -0.735)); o2 = m.add('O', (0, 0, 0.735)); m.bond(o1, o2, 1)
a = 94.8 * RAD
h1 = m.add('H', m.pos(o1) + 0.96 * np.array([math.sin(a), 0, math.cos(a)]))
h2 = m.add('H', m.pos(o2) + 0.96 * np.array([math.sin(a) * math.cos(111.5 * RAD), math.sin(a) * math.sin(111.5 * RAD), -math.cos(a)]))
m.bond(o1, h1, 1); m.bond(o2, h2, 1); m.key = {'angle': [h1, o1, o2], 'label': 'H–O–O'}
reg(m, 'Hydrogen peroxide', 'H₂O₂', T, shape='Non-planar (open-book)', geom='Tetrahedral about each O', hybrid='sp³ (each O)', angle='94.8° (H–O–O); dihedral 111.5° (gas), 90.2° (solid)', polar=True, dipole=2.1, lone=2,
    notes=['The two O–H bonds lie in two planes like the pages of a half-open book; the dihedral angle is 111.5° in the gas phase and 90.2° in the solid.', 'O–O single bond 147 pm; oxidation state of O is −1. Acts as both oxidising and reducing agent.'])

# =============================== ions ==========================================================
m, c, i = vs('h3o', 'O', 'tet', [0, 1, 2], [('H', 0.98, 1)] * 3, [3], lambda d, v: cone(-np.array(v[3]), 3, 113.0))
m.key = {'angle': [1, 0, 2], 'label': 'H–O–H'}
reg(m, 'Hydronium ion', 'H₃O⁺', 'ions', kind='ion', charge=1, shape='Trigonal pyramidal', geom='Tetrahedral', hybrid='sp³', angle='≈ 113°', polar=True, lone=1,
    notes=['H⁺ attached to a water lone pair by a coordinate bond. This is what "H⁺(aq)" really is.', 'Isoelectronic with NH₃ and, like it, pyramidal with sp³ O.'])

m, c, i = vs('nh4', 'N', 'tet', [0, 1, 2, 3], [('H', 1.03, 1)] * 4)
m.key = {'angle': [1, 0, 2], 'label': 'H–N–H'}
reg(m, 'Ammonium ion', 'NH₄⁺', 'ions', kind='ion', charge=1, shape='Tetrahedral', geom='Tetrahedral', hybrid='sp³', angle='109.5°', polar=False, lone=0,
    notes=['Formed when NH₃ uses its lone pair to bond to H⁺ (coordinate bond). All four N–H bonds are identical.', 'Isoelectronic and isostructural with CH₄.'])

m, c, i = vs('no3', 'N', 'tri', [0, 1, 2], [('O', 1.24, 1.33)] * 3)
m.key = {'angle': [1, 0, 2], 'label': 'O–N–O'}
reg(m, 'Nitrate ion', 'NO₃⁻', 'ions', kind='ion', charge=-1, shape='Trigonal planar', geom='Trigonal planar', hybrid='sp²', angle='120°', polar=False, lone=0,
    notes=['Three equivalent N–O bonds (resonance), bond order 1.33, N–O ≈ 124 pm.', 'Isoelectronic with CO₃²⁻. The brown-ring test for nitrate gives [Fe(H₂O)₅NO]²⁺.'])

m, c, i = vs('no2', 'N', 'tri', [0, 1], [('O', 1.24, 1.5)] * 2, [2], lambda d, v: list(pair_angle(d[0], d[1], 115.0)))
m.key = {'angle': [1, 0, 2], 'label': 'O–N–O'}
reg(m, 'Nitrite ion', 'NO₂⁻', 'ions', kind='ion', charge=-1, shape='Bent (V-shaped)', geom='Trigonal planar', hybrid='sp²', angle='115°', polar=True, lone=1,
    notes=['One lone pair on N bends the ion; both N–O bonds equal (bond order 1.5). Isoelectronic with O₃.'])

m, c, i = vs('co3', 'C', 'tri', [0, 1, 2], [('O', 1.29, 1.33)] * 3)
m.key = {'angle': [1, 0, 2], 'label': 'O–C–O'}
reg(m, 'Carbonate ion', 'CO₃²⁻', 'ions', kind='ion', charge=-2, shape='Trigonal planar', geom='Trigonal planar', hybrid='sp²', angle='120°', polar=False, lone=0,
    notes=['Resonance among three structures; each C–O has bond order 1.33 and length 129 pm.', 'Isoelectronic with NO₃⁻.'])

m, c, i = vs('so3_2', 'S', 'tet', [0, 1, 2], [('O', 1.51, 1.33)] * 3, [3], lambda d, v: cone(-np.array(v[3]), 3, 106.0))
m.key = {'angle': [1, 0, 2], 'label': 'O–S–O'}
reg(m, 'Sulfite ion', 'SO₃²⁻', 'ions', kind='ion', charge=-2, shape='Trigonal pyramidal', geom='Tetrahedral', hybrid='sp³', angle='≈ 106°', polar=True, lone=1,
    notes=['S has 3 bond pairs and 1 lone pair, so it is pyramidal (unlike planar SO₃).', 'Isostructural with ClO₃⁻ and XeO₃.'])

m, c, i = vs('so4', 'S', 'tet', [0, 1, 2, 3], [('O', 1.49, 1.5)] * 4)
m.key = {'angle': [1, 0, 2], 'label': 'O–S–O'}
reg(m, 'Sulfate ion', 'SO₄²⁻', 'ions', kind='ion', charge=-2, shape='Tetrahedral', geom='Tetrahedral', hybrid='sp³', angle='109.5°', polar=False, lone=0,
    notes=['All four S–O bonds are equivalent (bond order 1.5, 149 pm) through resonance.', 'Isostructural with PO₄³⁻, ClO₄⁻ and CrO₄²⁻.'])

m, c, i = vs('po4', 'P', 'tet', [0, 1, 2, 3], [('O', 1.54, 1.25)] * 4)
m.key = {'angle': [1, 0, 2], 'label': 'O–P–O'}
reg(m, 'Phosphate ion', 'PO₄³⁻', 'ions', kind='ion', charge=-3, shape='Tetrahedral', geom='Tetrahedral', hybrid='sp³', angle='109.5°', polar=False, lone=0,
    notes=['Bond order 1.25: one double bond shared by four P–O bonds. Conjugate base of H₃PO₄ (after losing all three H⁺).'])

m, c, i = vs('clo3', 'Cl', 'tet', [0, 1, 2], [('O', 1.48, 1.67)] * 3, [3], lambda d, v: cone(-np.array(v[3]), 3, 106.0))
m.key = {'angle': [1, 0, 2], 'label': 'O–Cl–O'}
reg(m, 'Chlorate ion', 'ClO₃⁻', 'ions', kind='ion', charge=-1, shape='Trigonal pyramidal', geom='Tetrahedral', hybrid='sp³', angle='≈ 106°', polar=True, lone=1,
    notes=['Cl(+5): 3 bond pairs + 1 lone pair, pyramidal. Compare ClO₄⁻, which is tetrahedral with no lone pair.'])

m, c, i = vs('clo4', 'Cl', 'tet', [0, 1, 2, 3], [('O', 1.44, 1.75)] * 4)
m.key = {'angle': [1, 0, 2], 'label': 'O–Cl–O'}
reg(m, 'Perchlorate ion', 'ClO₄⁻', 'ions', kind='ion', charge=-1, shape='Tetrahedral', geom='Tetrahedral', hybrid='sp³', angle='109.5°', polar=False, lone=0,
    notes=['Four identical Cl–O bonds (bond order 1.75). Cl is +7. Very stable and a very weak base (conjugate base of the strongest oxoacid, HClO₄).'])

m, c, i = vs('i3', 'I', 'tbp', [0, 1], [('I', 2.93, 1)] * 2, [2, 3, 4])
m.key = {'angle': [1, 0, 2], 'label': 'I–I–I'}
reg(m, 'Triiodide ion', 'I₃⁻', 'ions', kind='ion', charge=-1, shape='Linear', geom='Trigonal bipyramidal', hybrid='sp³d', angle='180°', polar=False, lone=3,
    notes=['Formed when I₂ dissolves in KI solution (I₂ + I⁻ → I₃⁻), giving a brown solution; the starch–iodine blue colour is due to I₃⁻.', 'Central I has 3 lone pairs in the equatorial plane, exactly like XeF₂ (isoelectronic).'])

m, c, i = vs('mno4', 'Mn', 'tet', [0, 1, 2, 3], [('O', 1.63, 1.75)] * 4)
m.key = {'angle': [1, 0, 2], 'label': 'O–Mn–O'}
reg(m, 'Permanganate ion', 'MnO₄⁻', 'ions', kind='ion', charge=-1, shape='Tetrahedral', geom='Tetrahedral', hybrid='sp³ (d³s in valence-bond terms)', angle='109.5°', polar=False, lone=0,
    notes=['Mn is +7 (d⁰), so the deep purple colour is charge transfer (O → Mn), not d–d. It is diamagnetic.', 'Strong oxidising agent: in acid Mn(+7) → Mn²⁺ (5 e⁻); in neutral medium → MnO₂ (3 e⁻).'])

m, c, i = vs('cro4', 'Cr', 'tet', [0, 1, 2, 3], [('O', 1.65, 1.5)] * 4)
m.key = {'angle': [1, 0, 2], 'label': 'O–Cr–O'}
reg(m, 'Chromate ion', 'CrO₄²⁻', 'ions', kind='ion', charge=-2, shape='Tetrahedral', geom='Tetrahedral', hybrid='sp³', angle='109.5°', polar=False, lone=0,
    notes=['Yellow, Cr(+6). In acid it condenses to orange dichromate: 2CrO₄²⁻ + 2H⁺ ⇌ Cr₂O₇²⁻ + H₂O.'])

m = Mol('cr2o7')
Ob = m.add('O', (0, 0, 0))
th = 63 * RAD
Cr1 = m.add('Cr', 1.79 * np.array([-math.sin(th), 0, math.cos(th)]))
Cr2 = m.add('Cr', 1.79 * np.array([math.sin(th), 0, math.cos(th)]))
m.bond(Ob, Cr1, 1); m.bond(Ob, Cr2, 1)
tet = [unit(v) for v in BASE['tet']]
rotated = align(tet, tet[0], unit(m.pos(Ob) - m.pos(Cr1)))
for d in rotated[1:4]:
    o = m.add('O', m.pos(Cr1) + d * 1.63); m.bond(Cr1, o, 1.67)
for d in rotated[1:4]:
    d2 = np.array([-d[0], d[1], d[2]])
    o = m.add('O', m.pos(Cr2) + d2 * 1.63); m.bond(Cr2, o, 1.67)
m.key = {'angle': [Cr1, Ob, Cr2], 'label': 'Cr–O–Cr'}
reg(m, 'Dichromate ion', 'Cr₂O₇²⁻', 'ions', kind='ion', charge=-2, shape='Two tetrahedra sharing a corner O', geom='Tetrahedral about each Cr', hybrid='sp³ (each Cr)', angle='Cr–O–Cr ≈ 126°', polar=True, lone=None,
    notes=['Two CrO₄ tetrahedra joined through one bridging O (Cr–O–Cr ≈ 126°); 6 terminal Cr–O bonds are shorter (≈163 pm) than the bridging ones.', 'Orange; Cr is +6 throughout. In acid it oxidises Fe²⁺, I⁻, SO₃²⁻ and alcohols; Cr(+6) → Cr³⁺ (6 e⁻ per dichromate).'])

# =============================== oxoacids, oxides & special molecules ===============================
m = Mol('hno3')
N = m.add('N', (0, 0, 0))
pol = lambda r, deg: (r * math.cos(deg * RAD), r * math.sin(deg * RAD), 0)
O1 = m.add('O', pol(1.21, 0)); O2 = m.add('O', pol(1.20, 130)); OH = m.add('O', pol(1.41, 245))
H = m.zplace('H', OH, N, O1, 0.96, 102, 0)
m.bond(N, O1, 1.5); m.bond(N, O2, 1.5); m.bond(N, OH, 1); m.bond(OH, H, 1)
m.key = {'angle': [O1, N, O2], 'label': 'O–N–O'}
reg(m, 'Nitric acid', 'HNO₃', 'acids', shape='Planar (trigonal planar at N)', geom='Trigonal planar', hybrid='sp² (N)', angle='O–N–O ≈ 130°', polar=True, lone=0,
    notes=['N is +5 and sp²-hybridised; the two terminal N–O bonds are equivalent by resonance (≈121 pm) and shorter than N–OH (141 pm).', 'Strong monobasic acid and a powerful oxidising agent. Nitrate (NO₃⁻) is planar.'])

# H2SO4
m = Mol('h2so4')
S = m.add('S', (0, 0, 0))
tetv = [unit(v) for v in BASE['tet']]
dd = list(pair_angle(tetv[0], tetv[1], 123.0)) + list(pair_angle(tetv[2], tetv[3], 101.0))
Od1 = m.add('O', dd[0] * 1.43); Od2 = m.add('O', dd[1] * 1.43)
Oh1 = m.add('O', dd[2] * 1.57); Oh2 = m.add('O', dd[3] * 1.57)
m.bond(S, Od1, 2); m.bond(S, Od2, 2); m.bond(S, Oh1, 1); m.bond(S, Oh2, 1)
hyd(m, Oh1, S, Od1, 180); hyd(m, Oh2, S, Od2, 180)
m.key = {'angle': [Od1, S, Od2], 'label': 'O=S=O'}
reg(m, 'Sulfuric acid', 'H₂SO₄', 'acids', shape='Tetrahedral at S', geom='Tetrahedral', hybrid='sp³ (S)', angle='O=S=O ≈ 123°, HO–S–OH ≈ 101°', polar=True, lone=0,
    notes=['S is +6 with 2 S=O (143 pm) and 2 S–OH (157 pm) bonds. Dibasic: two ionisable H atoms.', 'Strong dehydrating and oxidising agent (hot, conc.). Manufactured by the Contact process.'])

# H3PO4 / H3PO3 / H3PO2
def phos(id, name, formula, nOH, nH, notes, basicity):
    m = Mol(id)
    P = m.add('P', (0, 0, 0))
    d = tetv
    lig = [('O', 1.48 if nH else 1.46, 2)] + [('OH', 1.57, 1)] * nOH + [('H', 1.42, 1)] * nH
    atoms = []
    for v, (s, L, o) in zip(d, lig):
        a = m.add('O' if s == 'OH' else s, v * L); m.bond(P, a, o); atoms.append((s, a))
    ref = atoms[0][1]
    for s, a in atoms:
        if s == 'OH':
            hyd(m, a, P, ref, 180)
    m.key = {'dist': [P, ref], 'label': 'P=O'}
    reg(m, name, formula, 'acids', shape='Tetrahedral at P', geom='Tetrahedral', hybrid='sp³ (P)', angle='≈ 109.5°', polar=True, lone=0, notes=notes)
    return m


phos('h3po4', 'Phosphoric acid', 'H₃PO₄', 3, 0, ['One P=O and three P–OH bonds; P is +5. Tribasic (3 ionisable H atoms). Used in fertilisers and cola drinks.', 'Its conjugate bases are H₂PO₄⁻, HPO₄²⁻ and PO₄³⁻.'], 3)
phos('h3po3', 'Phosphorous acid', 'H₃PO₃', 2, 1, ['P(+3) with one P–H, one P=O and two P–OH. Only the two O–H hydrogens ionise, so it is DIBASIC although it has three H atoms.', 'Disproportionates on heating: 4H₃PO₃ → 3H₃PO₄ + PH₃. A reducing agent.'], 2)
phos('h3po2', 'Hypophosphorous acid', 'H₃PO₂', 1, 2, ['P(+1) with two P–H, one P=O and one P–OH. Only ONE ionisable H, so it is monobasic.', 'Strong reducing agent (reduces Ag⁺ to Ag), because of the two P–H bonds.'], 1)

m = Mol('hclo4')
Cl = m.add('Cl', (0, 0, 0))
Os = [m.add('O', tetv[k] * 1.41) for k in range(3)]
for o in Os: m.bond(Cl, o, 2)
Oh = m.add('O', tetv[3] * 1.64); m.bond(Cl, Oh, 1); hyd(m, Oh, Cl, Os[0], 180)
m.key = {'angle': [Os[0], Cl, Os[1]], 'label': 'O=Cl=O'}
reg(m, 'Perchloric acid', 'HClO₄', 'acids', shape='Tetrahedral at Cl', geom='Tetrahedral', hybrid='sp³ (Cl)', angle='≈ 109.5°', polar=True, lone=0,
    notes=['Cl is +7. The strongest common oxoacid, because ClO₄⁻ spreads its negative charge over four O atoms (most stable conjugate base).', 'Acid strength: HClO < HClO₂ < HClO₃ < HClO₄.'])

m = Mol('h3bo3')
B = m.add('B', (0, 0, 0))
Ob_ = [m.add('O', (1.36 * math.cos(k * 2 * math.pi / 3), 1.36 * math.sin(k * 2 * math.pi / 3), 0)) for k in range(3)]
for o in Ob_: m.bond(B, o, 1)
for k, o in enumerate(Ob_):
    h = m.zplace('H', o, B, Ob_[(k + 1) % 3], 0.97, 113, 180); m.bond(o, h, 1)
m.key = {'angle': [Ob_[0], B, Ob_[1]], 'label': 'O–B–O'}
reg(m, 'Boric acid', 'H₃BO₃', 'acids', shape='Trigonal planar', geom='Trigonal planar', hybrid='sp² (B)', angle='120°', polar=False, lone=0,
    notes=['B(OH)₃ is a weak MONOBASIC acid, not because it loses H⁺ but because it accepts OH⁻ (Lewis acid): B(OH)₃ + 2H₂O → [B(OH)₄]⁻ + H₃O⁺.', 'In the solid, molecules are joined by hydrogen bonds into planar layers, which makes it slippery.'])

# CrO5
m = Mol('cro5')
Cr = m.add('Cr', (0, 0, 0)); Oap = m.add('O', (0, 0, 1.58)); m.bond(Cr, Oap, 2)
for sgn in (1, -1):
    az = sgn * 115 * RAD
    mid = np.array([1.68 * math.cos(az), 1.68 * math.sin(az), -0.30]); t = np.array([-math.sin(az), math.cos(az), 0])
    oa = m.add('O', mid + 0.70 * t); ob = m.add('O', mid - 0.70 * t)
    m.bond(Cr, oa, 1); m.bond(Cr, ob, 1); m.bond(oa, ob, 1)
m.key = {'dist': [Cr, Oap], 'label': 'Cr=O'}
reg(m, 'Chromium pentoxide (chromium peroxide)', 'CrO₅', 'acids', shape='Butterfly: one oxo + two side-on peroxo groups', geom='Pentagonal-pyramidal-like', hybrid='—', angle='—', polar=True, lone=0, aliases=['CrO5', 'chromium peroxide', 'blue peroxide'],
    notes=['Cr is +6, not +10: the one oxide O (−2) and the two peroxide groups O₂²⁻ (−2 each) total −6, so Cr must be +6.', 'Contains two peroxy (O–O) linkages and one Cr=O bond: 1 Cr=O, 4 Cr–O, 2 O–O. Counting four O atoms as −2 each would wrongly give +10.', 'Blue colour (chromium peroxide test for H₂O₂ / chromate: blue in ether or amyl alcohol layer).'])

# diborane
m = Mol('b2h6')
B1 = m.add('B', (-0.88, 0, 0)); B2 = m.add('B', (0.88, 0, 0))
Hb1 = m.add('H', (0, 0, 0.99)); Hb2 = m.add('H', (0, 0, -0.99))
terms = []
for B_, s in ((B1, -1), (B2, 1)):
    for sg in (1, -1):
        h = m.add('H', m.pos(B_) + np.array([s * 1.19 * math.cos(60.75 * RAD), sg * 1.19 * math.sin(60.75 * RAD), 0]))
        m.bond(B_, h, 1); terms.append(h)
for B_ in (B1, B2):
    m.bond(B_, Hb1, 1, 'bridge'); m.bond(B_, Hb2, 1, 'bridge')
m.key = {'angle': [terms[0], B1, terms[1]], 'label': 'terminal H–B–H'}
reg(m, 'Diborane', 'B₂H₆', 'acids', shape='Two tetrahedra sharing an edge (banana bonds)', geom='Tetrahedral about each B', hybrid='sp³ (each B)', angle='terminal H–B–H 121.5°; bridge B–H–B 83°', polar=False, lone=0,
    notes=['12 valence electrons for 8 bonds: 4 normal terminal B–H bonds (2c–2e) and 2 three-centre two-electron (3c–2e) "banana" bridge bonds.', 'Terminal B–H 119 pm are shorter than bridge B–H 133 pm. The two B and four terminal H lie in one plane; the bridging H atoms are above and below it.'])

# N2O4
m = Mol('n2o4')
Na = m.add('N', (-0.89, 0, 0)); Nb = m.add('N', (0.89, 0, 0)); m.bond(Na, Nb, 1)
for N_, s in ((Na, -1), (Nb, 1)):
    for sg in (1, -1):
        o = m.add('O', m.pos(N_) + 1.19 * np.array([s * math.cos(67.5 * RAD), sg * math.sin(67.5 * RAD), 0])); m.bond(N_, o, 1.5)
m.key = {'dist': [Na, Nb], 'label': 'N–N'}
reg(m, 'Dinitrogen tetroxide', 'N₂O₄', 'acids', shape='Planar', geom='Trigonal planar about each N', hybrid='sp² (each N)', angle='O–N–O ≈ 135°', polar=False, lone=0,
    notes=['Colourless dimer of brown NO₂ (2NO₂ ⇌ N₂O₄); N–N is very long and weak (178 pm).', 'Planar with N(+4) in each half; diamagnetic because the odd electrons of two NO₂ pair up.'])

# P4, P4O6, P4O10
m = Mol('p4')
# tetv are unit vectors of (±1,±1,±1)/√3; scale so every P–P edge is 2.21 Å
Ps_pos = [np.array(v) * (2.21 / (2 * math.sqrt(2))) * math.sqrt(3) for v in tetv]
Ps = [m.add('P', p) for p in Ps_pos]
for i in range(4):
    for j in range(i + 1, 4): m.bond(Ps[i], Ps[j], 1)
for i in range(4): m.lp.append((Ps[i], unit(Ps_pos[i])))
m.key = {'angle': [Ps[1], Ps[0], Ps[2]], 'label': 'P–P–P'}
reg(m, 'White phosphorus', 'P₄', 'allotropes', shape='Tetrahedral molecule', geom='Tetrahedron', hybrid='mainly p orbitals', angle='60°', polar=False, lone=1,
    notes=['Four P atoms at the corners of a tetrahedron: 6 P–P single bonds, one lone pair per P. The 60° angle is highly strained, so P₄ is very reactive (stored under water).', 'Red phosphorus is polymeric and much less reactive.'])


def p4o(id, terminal):
    m = Mol(id)
    c = (2.83 if terminal else 2.95) / (2 * math.sqrt(2))
    pp = [np.array(v) * c * math.sqrt(3) for v in tetv]
    Ps = [m.add('P', p) for p in pp]
    L = 1.60 if terminal else 1.65
    for i in range(4):
        for j in range(i + 1, 4):
            mid = (pp[i] + pp[j]) / 2
            h = math.sqrt(L * L - (np.linalg.norm(pp[i] - pp[j]) / 2) ** 2)
            o = m.add('O', mid + unit(mid) * h)
            m.bond(Ps[i], o, 1); m.bond(Ps[j], o, 1)
    if terminal:
        for i in range(4):
            o = m.add('O', pp[i] + unit(pp[i]) * 1.43); m.bond(Ps[i], o, 2)
    else:
        for i in range(4): m.lp.append((Ps[i], unit(pp[i])))
    return m, Ps


m, Ps = p4o('p4o6', False)
m.key = {'angle': [4, Ps[0], 5], 'label': 'O–P–O'}
reg(m, 'Phosphorus(III) oxide', 'P₄O₆', 'allotropes', shape='Adamantane-like cage', geom='P₄ tetrahedron with 6 bridging O', hybrid='sp³ (P)', angle='O–P–O ≈ 100°; P–O–P ≈ 127°', polar=False, lone=1, aliases=['P4O6', 'phosphorus trioxide'],
    notes=['A tetrahedral P₄ skeleton with an O atom inserted into each of the six P–P bonds: 12 P–O bonds, 6 bridging O, each P keeps one lone pair.', 'Anhydride of H₃PO₃. P is in the +3 state.'])
m, Ps = p4o('p4o10', True)
m.key = {'dist': [Ps[0], 10], 'label': 'P–O (terminal)'}
reg(m, 'Phosphorus(V) oxide', 'P₄O₁₀', 'allotropes', shape='Adamantane-like cage with terminal P=O', geom='Tetrahedral about each P', hybrid='sp³ (P)', angle='O–P–O ≈ 101°; P–O–P ≈ 124°', polar=False, lone=0, aliases=['P4O10', 'phosphorus pentoxide'],
    notes=['P₄O₆ cage plus one terminal P=O on each P: 16 P–O bonds in all (12 P–O–P bridge bonds + 4 P=O). P is +5.', 'A powerful dehydrating agent; anhydride of H₃PO₄.'])

# S8 crown
m = Mol('s8')
def s8_angle(R):
    d = 2.05
    dz = 0.5 * math.sqrt(d * d - (2 * R * math.sin(math.pi / 8)) ** 2)
    P = [np.array([R * math.cos(k * math.pi / 4), R * math.sin(k * math.pi / 4), dz if k % 2 else -dz]) for k in range(8)]
    return P, ang(P[0] - P[1], P[2] - P[1])
lo, hi = 2.0, 2.6
for _ in range(60):
    mid = (lo + hi) / 2
    if s8_angle(mid)[1] < 108: lo = mid
    else: hi = mid
P, a_ = s8_angle((lo + hi) / 2)
Ss = [m.add('S', p) for p in P]
for k in range(8): m.bond(Ss[k], Ss[(k + 1) % 8], 1)
m.key = {'angle': [Ss[0], Ss[1], Ss[2]], 'label': 'S–S–S'}
reg(m, 'Octasulfur (rhombic sulfur)', 'S₈', 'allotropes', shape='Puckered crown ring', geom='Bent at each S', hybrid='sp³ (each S)', angle='S–S–S ≈ 108°', polar=False, lone=2,
    notes=['Eight S atoms in a non-planar crown ring; S–S 205 pm. Rhombic (α) and monoclinic (β) sulfur both contain S₈ rings and differ in how the rings pack.', 'Each S has 2 bond pairs and 2 lone pairs.'])

# Al2Cl6
m = Mol('al2cl6')
a_, b_ = 1.603, 1.521
A1 = m.add('Al', (-a_, 0, 0)); A2 = m.add('Al', (a_, 0, 0))
Cb1 = m.add('Cl', (0, b_, 0)); Cb2 = m.add('Cl', (0, -b_, 0))
for A_ in (A1, A2):
    m.bond(A_, Cb1, 1, 'dative'); m.bond(A_, Cb2, 1, 'dative')
for A_, s in ((A1, -1), (A2, 1)):
    for sg in (1, -1):
        c_ = m.add('Cl', m.pos(A_) + 2.06 * np.array([s * math.cos(59 * RAD), 0, sg * math.sin(59 * RAD)])); m.bond(A_, c_, 1)
m.key = {'angle': [Cb1, A1, Cb2], 'label': 'Cl(bridge)–Al–Cl(bridge)'}
reg(m, 'Aluminium chloride (dimer)', 'Al₂Cl₆', 'acids', shape='Two tetrahedra sharing an edge', geom='Tetrahedral about each Al', hybrid='sp³ (each Al)', angle='terminal Cl–Al–Cl ≈ 118°, bridge ≈ 87°', polar=False, lone=0, aliases=['AlCl3', 'Al2Cl6'],
    notes=['AlCl₃ is electron-deficient (6 e⁻), so it dimerises: each bridging Cl uses a lone pair to form a coordinate bond to the other Al, completing the octet.', 'Terminal Al–Cl 206 pm vs bridging 221 pm. Above ~800 °C it dissociates to planar sp² AlCl₃. A Lewis acid (Friedel–Crafts catalyst).'])

# ================================ coordination compounds ==============================================
OCT = [unit(v) for v in BASE['oct']]


def complex_(id, M, dirs, kinds, dists, name, formula, charge, **meta):
    m = Mol(id)
    c = m.add(M, (0, 0, 0))
    for d, k, L in zip(dirs, kinds, dists):
        ligand(m, c, d, k, L)
    reg(m, name, formula, 'coord', kind='ion' if charge else 'molecule', charge=charge, **meta)
    return m


def first_donors(m):
    return [i for i, a in enumerate(m.atoms) if i and any(b[0] == 0 and b[1] == i for b in m.bonds)]


m = complex_('fecn6', 'Fe', OCT, ['CN'] * 6, [1.92] * 6, 'Hexacyanoferrate(II) (ferrocyanide)', '[Fe(CN)₆]⁴⁻', -4,
             shape='Octahedral', geom='Octahedral', hybrid='d²sp³ (inner orbital)', angle='90°', polar=False, lone=0,
             notes=['Fe²⁺ is d⁶; strong-field CN⁻ pairs up the electrons (t₂g⁶), so the complex is low spin and DIAMAGNETIC. It uses d²sp³ (inner-orbital) hybridisation.', 'The ferricyanide [Fe(CN)₆]³⁻ (Fe³⁺, d⁵) has one unpaired electron. Prussian blue is formed with Fe³⁺ / Fe²⁺ ions.'])
d = first_donors(REG['fecn6']['m']); REG['fecn6']['m'].key = {'angle': [d[0], 0, d[2]], 'label': 'C–Fe–C'}

m = complex_('conh36', 'Co', OCT, ['NH3'] * 6, [1.96] * 6, 'Hexaamminecobalt(III)', '[Co(NH₃)₆]³⁺', 3,
             shape='Octahedral', geom='Octahedral', hybrid='d²sp³ (inner orbital)', angle='90°', polar=False, lone=0,
             notes=['Co³⁺ is d⁶; NH₃ is a strong-field ligand, so the electrons pair (t₂g⁶ e_g⁰): low spin, diamagnetic, inner-orbital complex. Orange-yellow.', 'Compare [CoF₆]³⁻: weak-field F⁻ gives a high-spin sp³d² complex with 4 unpaired electrons.'])
d = first_donors(REG['conh36']['m']); REG['conh36']['m'].key = {'angle': [d[0], 0, d[2]], 'label': 'N–Co–N'}

TET = [unit(v) for v in BASE['tet']]
m = complex_('nico4', 'Ni', TET, ['CO'] * 4, [1.84] * 4, 'Tetracarbonylnickel(0)', '[Ni(CO)₄]', 0,
             shape='Tetrahedral', geom='Tetrahedral', hybrid='sp³', angle='109.5°', polar=False, lone=0, aliases=['nickel carbonyl'],
             notes=['Ni(0) is 3d⁸4s² → 3d¹⁰ with CO (strong field, π-acceptor); sp³ hybridisation, diamagnetic. Used in the Mond process to purify nickel.', 'Metal carbonyl: CO donates a σ pair and Ni back-donates into CO π* (synergic bonding).'])
d = first_donors(REG['nico4']['m']); REG['nico4']['m'].key = {'angle': [d[0], 0, d[1]], 'label': 'C–Ni–C'}

m = complex_('nicl4', 'Ni', TET, ['Cl'] * 4, [2.28] * 4, 'Tetrachloronickelate(II)', '[NiCl₄]²⁻', -2,
             shape='Tetrahedral', geom='Tetrahedral', hybrid='sp³', angle='109.5°', polar=False, lone=0,
             notes=['Ni²⁺ is d⁸. Weak-field Cl⁻ does not pair the electrons, so it uses sp³ and is PARAMAGNETIC (2 unpaired e⁻).', 'Contrast with [Ni(CN)₄]²⁻: strong-field CN⁻ gives a diamagnetic square-planar dsp² complex.'])
d = first_donors(REG['nicl4']['m']); REG['nicl4']['m'].key = {'angle': [d[0], 0, d[1]], 'label': 'Cl–Ni–Cl'}

SQ = [OCT[2], OCT[3], OCT[4], OCT[5]]
m = complex_('nicn4', 'Ni', SQ, ['CN'] * 4, [1.86] * 4, 'Tetracyanonickelate(II)', '[Ni(CN)₄]²⁻', -2,
             shape='Square planar', geom='Square planar', hybrid='dsp²', angle='90°', polar=False, lone=0,
             notes=['Ni²⁺ d⁸ with strong-field CN⁻: the 8 d electrons pair up, freeing one d orbital for dsp² hybridisation. Diamagnetic.'])
d = first_donors(REG['nicn4']['m']); REG['nicn4']['m'].key = {'angle': [d[0], 0, d[2]], 'label': 'C–Ni–C'}

m = complex_('ptcl4', 'Pt', SQ, ['Cl'] * 4, [2.31] * 4, 'Tetrachloroplatinate(II)', '[PtCl₄]²⁻', -2,
             shape='Square planar', geom='Square planar', hybrid='dsp²', angle='90°', polar=False, lone=0,
             notes=['Pt²⁺ is d⁸. Heavy 5d metals strongly favour square-planar dsp² geometry, even with weak ligands like Cl⁻. Diamagnetic.'])
d = first_donors(REG['ptcl4']['m']); REG['ptcl4']['m'].key = {'angle': [d[0], 0, d[2]], 'label': 'Cl–Pt–Cl'}

m = complex_('cisplatin', 'Pt', SQ, ['NH3', 'Cl', 'NH3', 'Cl'], [2.05, 2.32, 2.05, 2.32], 'cis-Diamminedichloroplatinum(II) (cisplatin)', 'cis-[Pt(NH₃)₂Cl₂]', 0,
             shape='Square planar (cis)', geom='Square planar', hybrid='dsp²', angle='≈ 90°', polar=True, lone=0, aliases=['cisplatin', 'cis platin'],
             notes=['Geometrical isomerism in a square-planar [MA₂B₂] complex: identical ligands adjacent = cis, opposite = trans.', 'The cis isomer is polar (μ ≠ 0) and is the anticancer drug cisplatin; the trans isomer (transplatin) is non-polar and inactive.'])
d = [i for i, a in enumerate(REG['cisplatin']['m'].atoms) if a[0] == 'N']; REG['cisplatin']['m'].key = {'angle': [d[0], 0, d[1]], 'label': 'N–Pt–N (cis)'}
m = complex_('transplatin', 'Pt', SQ, ['NH3', 'NH3', 'Cl', 'Cl'], [2.05, 2.05, 2.32, 2.32], 'trans-Diamminedichloroplatinum(II)', 'trans-[Pt(NH₃)₂Cl₂]', 0,
             shape='Square planar (trans)', geom='Square planar', hybrid='dsp²', angle='180° (N–Pt–N)', polar=False, lone=0, aliases=['transplatin'],
             notes=['Trans isomer: identical ligands opposite each other, so the dipoles cancel (non-polar).'])
d = [i for i, a in enumerate(REG['transplatin']['m'].atoms) if a[0] == 'N']; REG['transplatin']['m'].key = {'angle': [d[0], 0, d[1]], 'label': 'N–Pt–N (trans)'}

m = complex_('cunh34', 'Cu', SQ, ['NH3'] * 4, [2.03] * 4, 'Tetraamminecopper(II)', '[Cu(NH₃)₄]²⁺', 2,
             shape='Square planar', geom='Square planar', hybrid='dsp²', angle='90°', polar=False, lone=0,
             notes=['Cu²⁺ (d⁹) gives the deep blue colour seen when excess ammonia is added to Cu²⁺(aq). One unpaired electron, so paramagnetic.', 'NCERT treats it as dsp² square planar (the electron is promoted to 4p).'])
d = first_donors(REG['cunh34']['m']); REG['cunh34']['m'].key = {'angle': [d[0], 0, d[2]], 'label': 'N–Cu–N'}

LIN = [OCT[0], OCT[1]]
m = complex_('agnh32', 'Ag', LIN, ['NH3'] * 2, [2.13] * 2, 'Diamminesilver(I) (Tollens’ reagent)', '[Ag(NH₃)₂]⁺', 1,
             shape='Linear', geom='Linear', hybrid='sp', angle='180°', polar=False, lone=0, aliases=["Tollens' reagent", 'tollens'],
             notes=['Ag⁺ is d¹⁰ (diamagnetic) and forms linear sp complexes. Tollens’ reagent oxidises aldehydes, depositing a silver mirror.'])
d = first_donors(REG['agnh32']['m']); REG['agnh32']['m'].key = {'angle': [d[0], 0, d[1]], 'label': 'N–Ag–N'}

TRANS = ['NH3', 'NH3', 'NH3', 'NH3', 'Cl', 'Cl']
m = complex_('trans_conh34cl2', 'Co', [OCT[2], OCT[3], OCT[4], OCT[5], OCT[0], OCT[1]], TRANS, [1.96] * 4 + [2.29] * 2, 'trans-Dichlorotetraamminecobalt(III)', 'trans-[CoCl₂(NH₃)₄]⁺', 1,
             shape='Octahedral (trans)', geom='Octahedral', hybrid='d²sp³', angle='90°, 180° (Cl–Co–Cl)', polar=False, lone=0,
             notes=['Octahedral [MA₄B₂]: two Cl⁻ opposite each other = trans (green, "praseo" salt), non-polar.'])
d = [i for i, a in enumerate(m.atoms) if a[0] == 'Cl']; m.key = {'angle': [d[0], 0, d[1]], 'label': 'Cl–Co–Cl (trans)'}
cm = Mol('cis_conh34cl2'); c0 = cm.add('Co', (0, 0, 0))
for dd_, k_, L_ in zip([OCT[1], OCT[3], OCT[4], OCT[5], OCT[0], OCT[2]], ['NH3', 'NH3', 'NH3', 'NH3', 'Cl', 'Cl'], [1.96] * 4 + [2.29] * 2):
    ligand(cm, c0, dd_, k_, L_)
dd2 = [i for i, a in enumerate(cm.atoms) if a[0] == 'Cl']; cm.key = {'angle': [dd2[0], 0, dd2[1]], 'label': 'Cl–Co–Cl (cis)'}
reg(cm, 'cis-Dichlorotetraamminecobalt(III)', 'cis-[CoCl₂(NH₃)₄]⁺', 'coord', kind='ion', charge=1, shape='Octahedral (cis)', geom='Octahedral', hybrid='d²sp³', angle='90° (Cl–Co–Cl)', polar=True, lone=0,
    notes=['The two Cl⁻ occupy adjacent corners (90° apart) = cis (violet, "violeo" salt); polar. Octahedral [MA₄B₂] shows only two geometrical isomers: cis and trans.'])

# ferrocene
m = Mol('ferrocene')
Fe = m.add('Fe', (0, 0, 0))
for z in (1.66, -1.66):
    ring = []
    for k in range(5):
        a_ = k * 2 * math.pi / 5
        ring.append(m.add('C', (1.208 * math.cos(a_), 1.208 * math.sin(a_), z)))
    for k in range(5):
        m.bond(ring[k], ring[(k + 1) % 5], 1.5)
        m.bond(Fe, ring[k], 1, 'dative')
        a_ = k * 2 * math.pi / 5
        h = m.add('H', (2.28 * math.cos(a_), 2.28 * math.sin(a_), z * 1.02)); m.bond(ring[k], h, 1)
m.key = {'dist': [Fe, 1], 'label': 'Fe–C'}
reg(m, 'Ferrocene', 'Fe(C₅H₅)₂', 'coord', shape='Sandwich (eclipsed rings)', geom='Fe(II) between two cyclopentadienyl rings', hybrid='—', angle='rings parallel, 332 pm apart', polar=False, lone=0, aliases=['bis(cyclopentadienyl)iron', 'sandwich compound'],
    notes=['An organometallic "sandwich" compound: Fe²⁺ between two planar C₅H₅⁻ (Cp) rings, each donating 6 π electrons. 18-electron rule: 6 (Fe²⁺) + 12 = 18.', 'Diamagnetic and very stable; all five carbons of each ring bond to Fe (η⁵ bonding). Rings are eclipsed in the gas phase.'])
