"""Build src/data/molecules.json from the structure definitions.

Usage:  pip install rdkit numpy   (RDKit is only needed to regenerate the organic molecules)
        python tools/build_molecules.py
"""
import json, math, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
import inorganic, organic, solids  # noqa: F401  (importing registers the molecules)
from registry import REG
from solids import FCC, expand

TOPICS = [
    ('vsepr', 'Shapes of molecules (VSEPR)'),
    ('ions', 'Ions & oxoanions'),
    ('acids', 'Oxoacids, oxides & special molecules'),
    ('coord', 'Coordination compounds'),
    ('organic', 'Organic molecules'),
    ('isomers', 'Isomerism'),
    ('conformations', 'Conformations'),
    ('bio', 'Biomolecules & drugs'),
    ('allotropes', 'Allotropes'),
    ('solid', 'Solid state (unit cells)'),
]


def r3(x):
    return round(float(x), 3)


def template(basis):
    out = {}
    for sym, f0, cent in basis:
        for t in cent:
            f = tuple(((f0[k] + t[k]) % 1.0) for k in range(3))
            for g in expand(f):
                lst = out.setdefault(sym, [])
                if not any(np.allclose(g, q, atol=1e-4) for q in lst):
                    lst.append([r3(v) for v in g])
    return out


def main():
    mols = []
    seen = set()
    for id, r in REG.items():
        m = r['m']
        assert id not in seen, id
        seen.add(id)
        n = len(m.atoms)
        for b in m.bonds:
            assert 0 <= b[0] < n and 0 <= b[1] < n and b[0] != b[1], (id, b)
        d = {
            'id': id, 'name': r['name'], 'formula': r['formula'], 'topic': r['topic'], 'kind': r['kind'],
            'charge': r.get('charge', 0),
            'shape': r.get('shape'), 'geom': r.get('geom'), 'hybrid': r.get('hybrid'), 'angle': r.get('angle'),
            'polar': r.get('polar'), 'dipole': r.get('dipole'), 'lone': r.get('lone'),
            'notes': r.get('notes', []), 'aliases': r.get('aliases', []), 'facts': r.get('facts'),
            'sigma': r.get('sigma'), 'pi': r.get('pi'), 'cip': r.get('cip') or None,
            'atoms': [[a[0], r3(a[1][0]), r3(a[1][1]), r3(a[1][2])] + ([a[2]] if a[2] else []) for a in m.atoms],
            'bonds': [[b[0], b[1], b[2]] + ([b[3]] if b[3] else []) for b in m.bonds],
            'lp': [[i, r3(v[0]), r3(v[1]), r3(v[2])] for i, v in m.lp],
            'key': m.key, 'cell': m.cell,
        }
        d = {k: v for k, v in d.items() if v is not None and v != [] and v != ''}
        mols.append(d)

    templates = {
        'rocksalt': {'ratio': 'AB', 'a': '2(rA+rB)', **template([('A', (0, 0, 0), FCC), ('B', (.5, .5, .5), FCC)])},
        'fluorite': {'ratio': 'AB2', 'a': '4(rA+rB)/sqrt3', **template([('A', (0, 0, 0), FCC), ('B', (.25, .25, .25), FCC), ('B', (.75, .75, .75), FCC)])},
    }
    out = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'molecules.json')
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'topics': [{'id': a, 'label': b} for a, b in TOPICS], 'molecules': mols, 'templates': templates}, f, ensure_ascii=False, separators=(',', ':'))
    kb = os.path.getsize(out) / 1024
    from collections import Counter
    c = Counter(m['topic'] for m in mols)
    print(f'{len(mols)} structures, {kb:.0f} KB ->', os.path.relpath(out))
    print({k: c[k] for k, _ in TOPICS})
    missing = [m['id'] for m in mols if not m.get('notes')]
    print('without notes:', missing)


if __name__ == '__main__':
    main()
