"""Committed fixtures must match a fresh regeneration within a numeric tolerance (spec §8.4)."""

from generate_fixtures import check_fixtures


def test_committed_fixtures_are_fresh():
    assert check_fixtures(rel=1e-4) == []
