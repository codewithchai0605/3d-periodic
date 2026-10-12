"""Small geometry toolkit for building 3D molecules: VSEPR templates + Z-matrix style placement."""
import math
import numpy as np

S3 = math.sqrt(3)
RAD = math.pi / 180


def unit(v):
    v = np.asarray(v, float)
    return v / np.linalg.norm(v)


def perp(v):
    v = unit(v)
    a = np.array([1.0, 0, 0]) if abs(v[0]) < 0.9 else np.array([0, 1.0, 0])
    return unit(np.cross(v, a))


def rot(v, axis, ang):
    """Rotate v about axis by ang (radians), Rodrigues."""
    axis = unit(axis)
    v = np.asarray(v, float)
    c, s = math.cos(ang), math.sin(ang)
    return v * c + np.cross(axis, v) * s + axis * np.dot(axis, v) * (1 - c)


def ang(a, b):
    return math.degrees(math.acos(max(-1, min(1, float(np.dot(unit(a), unit(b)))))))


def align(vs, a, b):
    """Rotate every vector in vs by the rotation that takes direction a to direction b."""
    a, b = unit(a), unit(b)
    c = np.cross(a, b)
    d = float(np.dot(a, b))
    if np.linalg.norm(c) < 1e-9:
        if d > 0:
            return [np.asarray(v, float) for v in vs]
        ax = perp(a)
        return [rot(v, ax, math.pi) for v in vs]
    th = math.acos(max(-1, min(1, d)))
    return [rot(v, c, th) for v in vs]


# ---- ideal electron-pair directions -------------------------------------------------------
_T = [(1, 1, 1), (1, -1, -1), (-1, 1, -1), (-1, -1, 1)]
BASE = {
    'lin': [(0, 0, 1), (0, 0, -1)],
    'tri': [(1, 0, 0), (-0.5, S3 / 2, 0), (-0.5, -S3 / 2, 0)],
    'tet': [tuple(unit(v)) for v in _T],
    'tbp': [(0, 0, 1), (0, 0, -1), (1, 0, 0), (-0.5, S3 / 2, 0), (-0.5, -S3 / 2, 0)],
    'oct': [(0, 0, 1), (0, 0, -1), (1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0)],
    'pbp': [(0, 0, 1), (0, 0, -1)] + [(math.cos(2 * math.pi * k / 5), math.sin(2 * math.pi * k / 5), 0) for k in range(5)],
}


def pair_angle(v1, v2, theta):
    """Set the angle between two directions symmetrically about their bisector."""
    b = unit(np.asarray(v1) + np.asarray(v2))
    w = unit(np.asarray(v1) - np.asarray(v2))
    h = math.radians(theta) / 2
    return b * math.cos(h) + w * math.sin(h), b * math.cos(h) - w * math.sin(h)


def cone(axis, n, theta, phase=0.0):
    """n directions around axis with pairwise angle theta (n = 2 or 3)."""
    axis = unit(axis)
    th = math.radians(theta)
    alpha = th / 2 if n == 2 else math.acos(math.sqrt((2 * math.cos(th) + 1) / 3))
    e1 = perp(axis)
    e2 = np.cross(axis, e1)
    return [axis * math.cos(alpha) + (e1 * math.cos(phase + 2 * math.pi * k / n) + e2 * math.sin(phase + 2 * math.pi * k / n)) * math.sin(alpha) for k in range(n)]


def tilt(v, toward, deg):
    """Rotate unit v towards unit 'toward' (assumed perpendicular to v) by deg degrees."""
    t = math.radians(deg)
    return unit(unit(v) * math.cos(t) + unit(toward) * math.sin(t))


class Mol:
    def __init__(self, id):
        self.id = id
        self.atoms = []   # [sym, np.array, radius or None]
        self.bonds = []   # (i, j, order, style)
        self.lp = []      # (atom index, direction)
        self.key = None   # {"angle":[i,j,k]} or {"dist":[i,j]}
        self.cell = None  # lattice cell description

    def add(self, sym, pos, r=None):
        self.atoms.append([sym, np.asarray(pos, float), r])
        return len(self.atoms) - 1

    def bond(self, i, j, order=1, style=None):
        self.bonds.append((i, j, order, style))

    def pos(self, i):
        return self.atoms[i][1]

    def zplace(self, sym, a, b, c, dist, angle, dihedral):
        """New atom bonded to a with angle (new-a-b) and dihedral (new-a-b-c)."""
        A, B, C = self.pos(c), self.pos(b), self.pos(a)
        bc = unit(C - B)
        n = unit(np.cross(B - A, bc))
        m = np.cross(n, bc)
        th, ph = angle * RAD, dihedral * RAD
        d = np.array([-dist * math.cos(th), dist * math.sin(th) * math.cos(ph), dist * math.sin(th) * math.sin(ph)])
        return self.add(sym, C + d[0] * bc + d[1] * m + d[2] * n)

    def dist(self, i, j):
        return float(np.linalg.norm(self.pos(i) - self.pos(j)))

    def angle(self, i, j, k):
        return ang(self.pos(i) - self.pos(j), self.pos(k) - self.pos(j))

    def dihedral(self, i, j, k, l):
        b0 = self.pos(i) - self.pos(j)
        b1 = unit(self.pos(k) - self.pos(j))
        b2 = self.pos(l) - self.pos(k)
        v = b0 - np.dot(b0, b1) * b1
        w = b2 - np.dot(b2, b1) * b1
        x = np.dot(v, w)
        y = np.dot(np.cross(b1, v), w)
        return math.degrees(math.atan2(y, x))


def vsepr(m, c, base, use, ligs, lp=(), adjust=None, origin=None):
    """Place ligands round atom c on the chosen electron-pair positions.

    ligs: list of (symbol, length, order[, style]) aligned with `use`.
    adjust: function(dirs, base_vectors) -> new dirs (to set experimental angles).
    Returns the list of ligand atom indices.
    """
    vecs = [unit(v) for v in BASE[base]]
    dirs = [vecs[i] for i in use]
    if adjust:
        dirs = adjust(dirs, vecs)
    out = []
    for d, lig in zip(dirs, ligs):
        sym, L, order = lig[0], lig[1], lig[2]
        style = lig[3] if len(lig) > 3 else None
        a = m.add(sym, m.pos(c) + d * L)
        m.bond(c, a, order, style)
        out.append(a)
    for j in lp:
        m.lp.append((c, vecs[j]))
    return out


def ligand(m, M, d, kind, dist):
    """Attach a simple ligand to metal M along direction d. Returns the donor atom index."""
    d = unit(d)
    p = m.pos(M) + d * dist
    if kind in ('Cl', 'F', 'Br', 'I'):
        a = m.add(kind, p)
        m.bond(M, a, 1, 'dative')
        return a
    if kind == 'NH3':
        N = m.add('N', p)
        m.bond(M, N, 1, 'dative')
        e1 = perp(d)
        e2 = np.cross(d, e1)
        al = math.radians(70.5)
        for k in range(3):
            ph = math.radians(20 + 120 * k)
            h = m.add('H', p + (d * math.cos(al) + (e1 * math.cos(ph) + e2 * math.sin(ph)) * math.sin(al)) * 1.01)
            m.bond(N, h, 1)
        return N
    if kind in ('CN', 'CO'):
        C = m.add('C', p)
        m.bond(M, C, 1, 'dative')
        X = m.add('N' if kind == 'CN' else 'O', p + d * (1.16 if kind == 'CN' else 1.14))
        m.bond(C, X, 3)
        return C
    raise ValueError(kind)


def centre(m):
    P = np.array([a[1] for a in m.atoms])
    c = P.mean(axis=0)
    for a in m.atoms:
        a[1] = a[1] - c
    m.lp = [(i, v) for i, v in m.lp]
    return m
