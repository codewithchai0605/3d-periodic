"""Crystal lattices (class 12 solid state) and carbon allotropes."""
import itertools, math
import numpy as np
from geom import Mol, unit
from registry import reg, REG

FCC = [(0, 0, 0), (.5, .5, 0), (.5, 0, .5), (0, .5, .5)]
BCC = [(0, 0, 0), (.5, .5, .5)]
SC = [(0, 0, 0)]


def expand(f):
    opts = [[x] if 1e-6 < x < 1 - 1e-6 else [0.0, 1.0] for x in f]
    return list(itertools.product(*opts))


def cubic(id, a, basis, radii):
    """basis: list of (sym, frac, centring) ; returns Mol with every atom touching the unit cell."""
    m = Mol(id)
    seen = set()
    for sym, f0, cent in basis:
        for t in cent:
            f = tuple(((f0[k] + t[k]) % 1.0) for k in range(3))
            for g in expand(f):
                key = (sym,) + tuple(round(x, 4) for x in g)
                if key in seen:
                    continue
                seen.add(key)
                m.add(sym, np.array(g) * a, radii[sym])
    m.cell = {'type': 'cubic', 'a': a}
    return m


def bond_nn(m, tol=0.06):
    n = len(m.atoms)
    ds = [(m.dist(i, j), i, j) for i in range(n) for j in range(i + 1, n)]
    dmin = min(d for d, _, _ in ds)
    for d, i, j in ds:
        if d < dmin * (1 + tol):
            m.bond(i, j, 1)
    return dmin


def nn_key(m, label):
    n = len(m.atoms)
    best = min(((m.dist(i, j), i, j) for i in range(n) for j in range(i + 1, n) if m.atoms[i][0] != m.atoms[j][0] or True), key=lambda x: x[0])
    m.key = {'dist': [best[1], best[2]], 'label': label}


def lat(m, name, formula, shape, facts, notes, label, aliases=(), topic='solid'):
    nn_key(m, label)
    reg(m, name, formula, topic, kind='lattice', shape=shape, geom=None, hybrid=None, angle=None, polar=None, lone=None, facts=facts, notes=notes, aliases=list(aliases))


# ------------------------------------------- metals: SC, BCC, FCC, HCP ----------------------------------
a = 3.35
m = cubic('sc', a, [('Po', (0, 0, 0), SC)], {'Po': a / 2})
lat(m, 'Simple cubic (primitive) unit cell', 'SC', 'Cubic: atoms at the 8 corners', {'Atoms per unit cell (Z)': '8 × 1/8 = 1', 'Coordination number': '6', 'Packing efficiency': '52.4 %', 'Relation of a and r': 'a = 2r', 'Examples': 'Polonium (α-Po)'},
    ['Each corner atom is shared by 8 cells, so Z = 8 × ⅛ = 1. Atoms touch along the cube edge: a = 2r.', 'Packing efficiency = (4/3 πr³) / (2r)³ = π/6 = 52.4 %, the lowest of the common cells; 47.6 % empty space.'], 'Po–Po', ['primitive cubic', 'simple cubic', 'unit cell'])

a = 2.87
m = cubic('bcc', a, [('Fe', (0, 0, 0), BCC)], {'Fe': a * math.sqrt(3) / 4})
lat(m, 'Body-centred cubic (bcc) unit cell', 'BCC', 'Cubic: corners + 1 body-centre atom', {'Atoms per unit cell (Z)': '8 × 1/8 + 1 = 2', 'Coordination number': '8', 'Packing efficiency': '68 %', 'Relation of a and r': '√3 a = 4r', 'Examples': 'Na, K, Fe (α), Cr, W, Ba'},
    ['The body-diagonal is √3 a and carries 4r (corner–centre–corner), so r = √3a/4. Z = 8 × ⅛ + 1 = 2.', 'Packing efficiency = 2 × (4/3 πr³) / a³ = (√3 π/8) = 68 %.'], 'Fe–Fe', ['bcc', 'body centred cubic', 'unit cell'])

a = 3.61
m = cubic('fcc', a, [('Cu', (0, 0, 0), FCC)], {'Cu': a * math.sqrt(2) / 4})
lat(m, 'Face-centred cubic (fcc / ccp) unit cell', 'FCC', 'Cubic: corners + 6 face-centre atoms', {'Atoms per unit cell (Z)': '8 × 1/8 + 6 × 1/2 = 4', 'Coordination number': '12', 'Packing efficiency': '74 %', 'Relation of a and r': '√2 a = 4r', 'Voids per atom': '1 octahedral + 2 tetrahedral', 'Examples': 'Cu, Ag, Au, Al, Ni, Pb'},
    ['Atoms touch along the face diagonal (√2 a = 4r). This is cubic close packing (ABC ABC… layers).', 'Z = 4, so a unit cell has 4 octahedral and 8 tetrahedral voids (N and 2N for N atoms). Packing efficiency = 4 × (4/3 πr³) / a³ = π/(3√2) = 74 %.'], 'Cu–Cu', ['fcc', 'ccp', 'cubic close packed', 'face centred cubic', 'unit cell'])

# HCP (hexagonal prism cell, c/a = 1.633)
a = 3.21
c = 1.633 * a
m = Mol('hcp')
r = a / 2
for z in (0.0, c):
    m.add('Mg', (0, 0, z), r)
    for k in range(6):
        t = math.radians(60 * k)
        m.add('Mg', (a * math.cos(t), a * math.sin(t), z), r)
for k in range(3):
    t = math.radians(30 + 120 * k)
    m.add('Mg', (a / math.sqrt(3) * math.cos(t), a / math.sqrt(3) * math.sin(t), c / 2), r)
m.cell = {'type': 'hex', 'a': a, 'c': c}
lat(m, 'Hexagonal close-packed (hcp) unit cell', 'HCP', 'Hexagonal prism: A-B-A layers', {'Atoms per hexagonal cell (Z)': '12 × 1/6 + 2 × 1/2 + 3 = 6', 'Coordination number': '12', 'Packing efficiency': '74 %', 'Layer sequence': 'ABAB…', 'Examples': 'Mg, Zn, Cd, Ti, Co'},
    ['Same 74 % efficiency and coordination number 12 as ccp, but layers repeat ABAB… (the 3 atoms in the middle sit in the hollows of the top and bottom layers).', 'Per hexagonal cell: 12 corner atoms × ⅙ + 2 face-centre atoms × ½ + 3 inside = 6.'], 'Mg–Mg', ['hcp', 'hexagonal close packed', 'unit cell'])

# ------------------------------------------- ionic structures ----------------------------------------------
a = 5.64
m = cubic('nacl', a, [('Na', (0, 0, 0), FCC), ('Cl', (.5, .5, .5), FCC)], {'Na': 1.02, 'Cl': 1.81})
lat(m, 'Sodium chloride (rock salt) structure', 'NaCl', 'fcc of Cl⁻ with Na⁺ in ALL octahedral voids', {'Formula units per cell (Z)': '4 Na⁺ + 4 Cl⁻', 'Coordination number': '6 : 6 (octahedral)', 'Radius ratio r⁺/r⁻': '0.414 – 0.732 (0.56 here)', 'Edge length': 'a = 2(r⁺ + r⁻)', 'Examples': 'NaCl, KCl, MgO, AgCl, LiF'},
    ['Cl⁻ ions form a face-centred cubic lattice; every octahedral void holds a Na⁺. Each ion has 6 nearest neighbours of opposite charge.', 'Z = 4: Cl⁻ = 8 × ⅛ + 6 × ½ = 4; Na⁺ = 12 edge atoms × ¼ + 1 body-centre = 4.'], 'Na⁺–Cl⁻', ['rock salt', 'sodium chloride', 'ionic crystal', 'octahedral voids'])

a = 4.12
m = cubic('cscl', a, [('Cs', (0, 0, 0), SC), ('Cl', (.5, .5, .5), SC)], {'Cs': 1.67, 'Cl': 1.81})
lat(m, 'Caesium chloride structure', 'CsCl', 'simple cubic of Cl⁻ with Cs⁺ in the body-centre', {'Formula units per cell (Z)': '1 Cs⁺ + 1 Cl⁻', 'Coordination number': '8 : 8 (cubic)', 'Radius ratio r⁺/r⁻': '0.732 – 1.0', 'Edge length': '√3 a = 2(r⁺ + r⁻)', 'Examples': 'CsCl, CsBr, CsI, NH₄Cl (low T)'},
    ['Not "body-centred cubic": the two ions are different, so the lattice is simple cubic with a two-ion basis. Z = 1.', 'The larger cation (r⁺/r⁻ ≥ 0.732) fits in the cubic void, giving 8 : 8 coordination.'], 'Cs⁺–Cl⁻', ['cesium chloride', 'ionic crystal', 'cubic void'])

a = 5.41
m = cubic('zns', a, [('S', (0, 0, 0), FCC), ('Zn', (.25, .25, .25), FCC)], {'S': 1.84, 'Zn': 0.74})
bond_nn(m)
lat(m, 'Zinc blende (sphalerite, ZnS) structure', 'ZnS', 'ccp of S²⁻ with Zn²⁺ in ALTERNATE tetrahedral voids', {'Formula units per cell (Z)': '4 Zn²⁺ + 4 S²⁻', 'Coordination number': '4 : 4 (tetrahedral)', 'Radius ratio r⁺/r⁻': '0.225 – 0.414', 'Fraction of tetrahedral voids filled': '50 %', 'Examples': 'ZnS, CuCl, CuBr, AgI, BeO'},
    ['S²⁻ ions form fcc; Zn²⁺ occupies half (alternate) of the 8 tetrahedral voids. Each ion is tetrahedrally surrounded by 4 of the other kind.', 'Zinc blende has the same atomic arrangement as diamond, with two kinds of atom.'], 'Zn–S', ['sphalerite', 'zinc sulfide', 'zinc blende', 'tetrahedral voids'])

a = 5.46
m = cubic('caf2', a, [('Ca', (0, 0, 0), FCC), ('F', (.25, .25, .25), FCC), ('F', (.75, .75, .75), FCC)], {'Ca': 1.00, 'F': 1.33})
lat(m, 'Fluorite (CaF₂) structure', 'CaF₂', 'ccp of Ca²⁺ with F⁻ in ALL tetrahedral voids', {'Formula units per cell (Z)': '4 Ca²⁺ + 8 F⁻', 'Coordination number': 'Ca²⁺ 8 : F⁻ 4', 'Void filling': '100 % of tetrahedral voids', 'Examples': 'CaF₂, BaF₂, SrF₂, UO₂, ThO₂'},
    ['The larger-charged cation forms the fcc lattice (4 Ca²⁺); all 8 tetrahedral voids hold F⁻, giving a 1 : 2 ratio.', 'Coordination number: Ca²⁺ is surrounded by 8 F⁻ (cubic), each F⁻ by 4 Ca²⁺ (tetrahedral).'], 'Ca²⁺–F⁻', ['calcium fluoride', 'fluorite', 'tetrahedral voids'])

a = 5.55
m = cubic('na2o', a, [('O', (0, 0, 0), FCC), ('Na', (.25, .25, .25), FCC), ('Na', (.75, .75, .75), FCC)], {'O': 1.40, 'Na': 1.02})
lat(m, 'Antifluorite (Na₂O) structure', 'Na₂O', 'ccp of O²⁻ with Na⁺ in ALL tetrahedral voids', {'Formula units per cell (Z)': '4 O²⁻ + 8 Na⁺', 'Coordination number': 'Na⁺ 4 : O²⁻ 8', 'Void filling': '100 % of tetrahedral voids', 'Examples': 'Na₂O, K₂O, Li₂O, K₂S'},
    ['Antifluorite is the reverse of fluorite: the ANION forms the fcc lattice and the cations fill all tetrahedral voids (2 per anion), giving an M₂X formula.'], 'Na⁺–O²⁻', ['sodium oxide', 'antifluorite', 'tetrahedral voids'])

a = 3.567
m = cubic('diamond', a, [('C', (0, 0, 0), FCC), ('C', (.25, .25, .25), FCC)], {'C': 0.77})
bond_nn(m)
lat(m, 'Diamond (cubic unit cell)', 'C (diamond)', 'fcc of C with C in alternate tetrahedral voids', {'Atoms per unit cell (Z)': '8', 'Coordination number': '4', 'C–C bond length': '154 pm', 'Hybridisation': 'sp³', 'Packing efficiency': '34 %'},
    ['Every C is sp³ bonded to 4 others in a tetrahedral 3D covalent network; hardest natural substance, electrical insulator, high thermal conductivity.', 'The unit cell has the zinc-blende arrangement with all atoms identical. Very open structure (packing efficiency only 34 %).'], 'C–C', ['diamond', 'allotropes of carbon', 'covalent network'], 'allotropes')

# ------------------------------------------- graphite (two coronene-like layers) ----------------------------
m = Mol('graphite')
cc = 1.42
def layer(dx, z):
    idx = {}
    centres = [(0, 0)] + [(2.46 * math.cos(math.radians(30 + 60 * k)), 2.46 * math.sin(math.radians(30 + 60 * k))) for k in range(6)]
    pts = []
    for (cx, cy) in centres:
        for j in range(6):
            t = math.radians(60 * j)
            p = (cx + cc * math.cos(t), cy + cc * math.sin(t))
            if not any(math.hypot(p[0] - q[0], p[1] - q[1]) < 0.05 for q in pts):
                pts.append(p)
    ids = [m.add('C', (p[0] + dx, p[1], z)) for p in pts]
    for i in range(len(ids)):
        for j in range(i + 1, len(ids)):
            if abs(m.dist(ids[i], ids[j]) - cc) < 0.05:
                m.bond(ids[i], ids[j], 1.5)
    return ids
l1 = layer(0, -1.675); l2 = layer(cc, 1.675)
pair = min(((math.hypot(m.pos(i)[0] - m.pos(j)[0], m.pos(i)[1] - m.pos(j)[1]), i, j) for i in l1 for j in l2), key=lambda t: t[0])
m.key = {'dist': [pair[1], pair[2]], 'label': 'interlayer spacing'}
reg(m, 'Graphite (two layers)', 'C (graphite)', 'allotropes', shape='Hexagonal layers, 335 pm apart', geom='Layered', hybrid='sp² (each C)', angle='120° within a layer', polar=False, lone=None, aliases=['allotropes of carbon', 'graphite layers'],
    notes=['Each C is sp² bonded to 3 others (C–C 142 pm) in flat hexagonal sheets; the fourth electron is delocalised over the layer, so graphite conducts electricity along the layers.', 'Layers (335 pm apart) are held only by weak van der Waals forces, so they slide over each other: graphite is soft, slippery and used as a lubricant and in pencils. Only two small patches are drawn.'])

# ------------------------------------------- C60 buckminsterfullerene ---------------------------------------
phi = (1 + math.sqrt(5)) / 2
base = [(0, 1, 3 * phi), (1, 2 + phi, 2 * phi), (phi, 2, 2 * phi + 1)]
pts = []
for b in base:
    for sg in itertools.product((1, -1), repeat=3):
        v = [b[k] * sg[k] for k in range(3)]
        for r_ in range(3):
            w = tuple(v[(k + r_) % 3] for k in range(3))
            if not any(np.allclose(w, p) for p in pts):
                pts.append(w)
assert len(pts) == 60, len(pts)
P = np.array(pts) * (1.43 / 2)
m = Mol('c60')
for p in P:
    m.add('C', p)
nb = {i: [] for i in range(60)}
for i in range(60):
    for j in range(i + 1, 60):
        if abs(np.linalg.norm(P[i] - P[j]) - 1.43) < 0.05:
            nb[i].append(j); nb[j].append(i)
edges = {(i, j) for i in nb for j in nb[i] if i < j}
assert len(edges) == 90
pent = set()
def cycles(start, path, length):
    if len(path) == length:
        if start in nb[path[-1]]:
            for a_, b_ in zip(path, path[1:] + [path[0]]):
                pent.add((min(a_, b_), max(a_, b_)))
        return
    for n in nb[path[-1]]:
        if n not in path:
            cycles(start, path + [n], length)
for i in range(60):
    cycles(i, [i], 5)
for (i, j) in sorted(edges):
    m.bond(i, j, 1 if (i, j) in pent else 2)
assert sum(1 for b in m.bonds if b[2] == 2) == 30
m.key = {'dist': [list(edges)[0][0], list(edges)[0][1]], 'label': 'C–C'}
reg(m, 'Buckminsterfullerene', 'C₆₀', 'allotropes', shape='Truncated icosahedron ("football")', geom='Spherical cage', hybrid='≈ sp² (slightly pyramidalised)', angle='—', polar=False, lone=None, aliases=['fullerene', 'buckyball', 'allotropes of carbon', 'c60'],
    notes=['60 C atoms in 12 pentagons + 20 hexagons; every C is bonded to 3 others. There are 30 C=C double bonds (hexagon–hexagon edges) and 60 C–C single bonds (pentagon edges).', 'Discovered in 1985 by Kroto, Curl and Smalley (Nobel Prize 1996). A molecular solid that dissolves in benzene; each C is sp²-like with a fourth electron delocalised on the sphere.'])
