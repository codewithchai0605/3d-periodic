from geom import centre

REG = {}


def reg(m, name, formula, topic, kind='molecule', **meta):
    """Register a built molecule with its teaching metadata."""
    centre(m)
    REG[m.id] = dict(m=m, name=name, formula=formula, topic=topic, kind=kind, **meta)
    return m
