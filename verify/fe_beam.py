"""Euler-Bernoulli FE beam model of a tower (spec §8.2).

Hermite cubic elements, consistent mass matrix, rotational spring k_phi at the base,
point mass at the tip. Independent of the browser code: it shares no code with src/calc.
"""

import numpy as np
from scipy.linalg import eigh


def _element_matrices(ei, mu, le):
    k = ei / le**3 * np.array([
        [12, 6 * le, -12, 6 * le],
        [6 * le, 4 * le**2, -6 * le, 2 * le**2],
        [-12, -6 * le, 12, -6 * le],
        [6 * le, 2 * le**2, -6 * le, 4 * le**2],
    ])
    m = mu * le / 420 * np.array([
        [156, 22 * le, 54, -13 * le],
        [22 * le, 4 * le**2, 13 * le, -3 * le**2],
        [54, 13 * le, 156, -22 * le],
        [-13 * le, -3 * le**2, -22 * le, 4 * le**2],
    ])
    return k, m


def natural_frequencies(z_nodes, ei_el, mu_el, k_phi, m_tip, n_modes=3):
    """Bending natural frequencies [Hz], ascending.

    z_nodes: node heights (n_el + 1), ei_el / mu_el: element bending stiffness [N m^2]
    and mass per metre [kg/m], k_phi: base rotational spring [N m/rad], m_tip: tip mass [kg].
    DOFs per node: (w, theta). Base translation is fixed, base rotation is on the spring.
    """
    z_nodes = np.asarray(z_nodes, dtype=float)
    n_el = len(z_nodes) - 1
    ndof = 2 * (n_el + 1)
    K = np.zeros((ndof, ndof))
    M = np.zeros((ndof, ndof))
    for e in range(n_el):
        k, m = _element_matrices(ei_el[e], mu_el[e], z_nodes[e + 1] - z_nodes[e])
        idx = slice(2 * e, 2 * e + 4)
        K[idx, idx] += k
        M[idx, idx] += m
    K[1, 1] += k_phi
    M[ndof - 2, ndof - 2] += m_tip
    free = np.arange(1, ndof)  # drop base translation
    K = K[np.ix_(free, free)]
    M = M[np.ix_(free, free)]
    w2 = eigh(K, M, eigvals_only=True, subset_by_index=[0, n_modes - 1])
    return np.sqrt(w2) / (2 * np.pi)
