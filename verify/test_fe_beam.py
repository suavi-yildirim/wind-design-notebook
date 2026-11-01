"""Analytic checks for the Euler-Bernoulli FE beam model (spec §8.2)."""

import math

import numpy as np
import pytest
from scipy.optimize import brentq

from fe_beam import natural_frequencies

EI = 1.0e11
MU = 2000.0
L = 100.0


def uniform(n_el, ei=EI, mu=MU, length=L):
    z = np.linspace(0.0, length, n_el + 1)
    return z, np.full(n_el, ei), np.full(n_el, mu)


def test_uniform_cantilever():
    z, ei, mu = uniform(50)
    f = natural_frequencies(z, ei, mu, k_phi=1e15, m_tip=0.0)[0]
    exact = 1.8751**2 / (2 * math.pi) * math.sqrt(EI / (MU * L**4))
    assert f == pytest.approx(exact, rel=1e-3)


def test_tip_mass():
    ratio = 0.5  # M / (mu L)

    def eq(bl):
        return (1 + math.cos(bl) * math.cosh(bl)
                + ratio * bl * (math.cos(bl) * math.sinh(bl) - math.sin(bl) * math.cosh(bl)))

    bl = brentq(eq, 0.5, 1.875)
    exact = bl**2 / (2 * math.pi) * math.sqrt(EI / (MU * L**4))
    z, ei, mu = uniform(50)
    f = natural_frequencies(z, ei, mu, k_phi=1e15, m_tip=ratio * MU * L)[0]
    assert f == pytest.approx(exact, rel=1e-3)


def test_rigid_on_spring():
    k_phi, mu0, m_tip, h = 1e9, 1000.0, 1e4, 100.0
    z, ei, mu = uniform(50, ei=1e16, mu=mu0, length=h)
    f = natural_frequencies(z, ei, mu, k_phi=k_phi, m_tip=m_tip)[0]
    inertia = mu0 * h**3 / 3 + m_tip * h**2
    exact = math.sqrt(k_phi / inertia) / (2 * math.pi)
    assert f == pytest.approx(exact, rel=5e-3)


def test_mesh_convergence():
    f50 = natural_frequencies(*uniform(50), k_phi=1e11, m_tip=1e5)[0]
    f200 = natural_frequencies(*uniform(200), k_phi=1e11, m_tip=1e5)[0]
    assert abs(f50 - f200) / f200 < 1e-3


def test_returns_ascending_modes():
    f = natural_frequencies(*uniform(20), k_phi=1e11, m_tip=1e5, n_modes=3)
    assert len(f) == 3 and np.all(np.diff(f) > 0)


def test_rigid_base_is_clamped():
    """An infinite or near-rigid spring must behave as a clamped base, not as an ill-conditioned penalty."""
    exact = 1.8751**2 / (2 * math.pi) * math.sqrt(EI / (MU * L**4))
    for k_phi in (math.inf, 1e15, 1e30):
        f = natural_frequencies(*uniform(50), k_phi=k_phi, m_tip=0.0)[0]
        assert f == pytest.approx(exact, rel=1e-3), k_phi
