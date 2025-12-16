import numpy as np
import pandas as pd
from typing import Dict, Iterable, List, Tuple, Any, Optional

# --------------------------------------------
# Core math (race-subset only)
# --------------------------------------------

def _expected_win_prob(delta_opp_minus_self: np.ndarray) -> np.ndarray:
    # E = 1 / (1 + 10^(delta/400))
    return 1.0 / (1.0 + np.power(10.0, delta_opp_minus_self / 400.0))


def local_updates_for_race(
    elos_race: np.ndarray,
    order: np.ndarray,
    Klocal: float,
    window: int = 3
) -> np.ndarray:
    """
    Local pairwise updates using only athletes in this race.
    O(n_race * window)
    """
    n = elos_race.size
    local = np.zeros(n, dtype=np.float64)

    for pos in range(n):
        ri = elos_race[order[pos]]

        lo = max(0, pos - window)
        hi = min(n, pos + window + 1)

        opp_pos = np.arange(lo, hi, dtype=np.int32)
        opp_pos = opp_pos[opp_pos != pos]
        if opp_pos.size == 0:
            continue

        opp_idx = order[opp_pos]
        rj = elos_race[opp_idx]

        delta = rj - ri
        adjusted_k = Klocal / (1.0 + (np.abs(delta) / 100.0))
        E = _expected_win_prob(delta)

        # S=1 if athlete beats opponent (finishes ahead => smaller pos)
        S = (pos < opp_pos).astype(np.float64)

        surprise = np.abs(S - E)
        local[order[pos]] = np.sum(adjusted_k * surprise * (S - E))

    return local


def bulk_updates_for_race(
    elos_race: np.ndarray,
    finish_positions: np.ndarray,
    Kglobal: float
) -> np.ndarray:
    """
    Bulk update compares actual percentile vs expected percentile computed
    within THIS race subset only.
    """
    n = elos_race.size
    if n <= 1:
        return np.zeros(n, dtype=np.float64)

    # actual percentile from finish positions (0 best)
    p_actual = finish_positions / (n - 1)

    # expected percentile from ELO rank within race (higher ELO => expected better)
    expected_order = np.argsort(-elos_race, kind="mergesort")
    expected_pos = np.empty(n, dtype=np.int32)
    expected_pos[expected_order] = np.arange(n, dtype=np.int32)
    p_expected = expected_pos / (n - 1)

    return Kglobal * (p_actual - p_expected)


def apply_race_update(
    elos_race: np.ndarray,
    finish_positions: np.ndarray,
    Klocal: float,
    Kglobal: float,
    alpha: float,
    window: int = 3,
    max_change: Optional[float] = 20.0
) -> Tuple[np.ndarray, np.ndarray]:
    """
    Returns (new_elos_race, total_change)
    alpha weights bulk; (1-alpha) weights local
    """
    order = np.argsort(finish_positions, kind="mergesort")  # 0 best
    local = local_updates_for_race(elos_race, order, Klocal=Klocal, window=window)
    bulk = bulk_updates_for_race(elos_race, finish_positions, Kglobal=Kglobal)

    total = alpha * bulk + (1.0 - alpha) * local
    if max_change is not None:
        total = np.clip(total, -max_change, max_change)

    return elos_race + total, total


# --------------------------------------------
# Rating store + backfill + incremental updates
# --------------------------------------------

class EloStore:
    """
    Minimal in-memory store. In production you’d persist this to MongoDB.
    """
    def __init__(self, base_elo: float = 1400.0):
        self.base_elo = float(base_elo)
        self._elos: Dict[str, float] = {}

    def get_many(self, athlete_ids: List[str]) -> np.ndarray:
        return np.array([self._elos.get(a, self.base_elo) for a in athlete_ids], dtype=np.float64)

    def set_many(self, athlete_ids: List[str], new_elos: np.ndarray) -> None:
        for a, r in zip(athlete_ids, new_elos):
            self._elos[a] = float(r)

    def to_dataframe(self) -> pd.DataFrame:
        return pd.DataFrame({"Athlete": list(self._elos.keys()), "ELO": list(self._elos.values())}).sort_values("ELO", ascending=False)


def update_from_race_results(
    store: EloStore,
    athlete_ids: List[str],
    finish_places: List[int],
    Klocal: float = 4.5,
    Kglobal: float = 1.0,
    alpha: float = 0.2,
    window: int = 3,
    max_change: Optional[float] = 20.0
) -> pd.DataFrame:
    """
    Incremental update for ONE race.
    athlete_ids: participants in this race
    finish_places: 1 = winner, 2 = 2nd, ...
    Updates only these athletes in the store.
    Returns a summary dataframe for logging/auditing.
    """
    if len(athlete_ids) != len(finish_places):
        raise ValueError("athlete_ids and finish_places must be same length")
    n = len(athlete_ids)
    if n == 0:
        return pd.DataFrame(columns=["Athlete", "Finish_Place", "Old_ELO", "New_ELO", "Delta"])

    # Convert to 0-based finish positions
    finish_places_arr = np.asarray(finish_places, dtype=np.int32)
    finish_positions = finish_places_arr - 1  # 0 best

    # Pull current ratings for just these athletes
    old_elos = store.get_many(athlete_ids)

    # Update within this race subset
    new_elos, delta = apply_race_update(
        elos_race=old_elos,
        finish_positions=finish_positions,
        Klocal=Klocal,
        Kglobal=Kglobal,
        alpha=alpha,
        window=window,
        max_change=max_change
    )

    # Persist
    store.set_many(athlete_ids, new_elos)

    # Return summary for debugging/logging
    out = pd.DataFrame({
        "Athlete": athlete_ids,
        "Finish_Place": finish_places_arr,
        "Old_ELO": old_elos,
        "New_ELO": new_elos,
        "Delta": delta
    }).sort_values("Finish_Place").reset_index(drop=True)

    return out


def backfill_all_races(
    store: EloStore,
    races: Iterable[Dict[str, Any]],
    *,
    Klocal: float = 4.5,
    Kglobal: float = 1.0,
    alpha: float = 0.2,
    window: int = 3,
    max_change: Optional[float] = 20.0
) -> None:
    """
    One-time large backfill. Feed races in chronological order.
    Each race dict should have:
      - "athlete_ids": List[str]
      - "finish_places": List[int] (1..n)
    """
    for race in races:
        update_from_race_results(
            store,
            athlete_ids=race["athlete_ids"],
            finish_places=race["finish_places"],
            Klocal=Klocal,
            Kglobal=Kglobal,
            alpha=alpha,
            window=window,
            max_change=max_change
        )


# --------------------------------------------
# Example usage (no plotting)
# --------------------------------------------
if __name__ == "__main__":
    store = EloStore(base_elo=1400)

    # Backfill (big batch) - assume sorted by date already
    historical = [
        {"athlete_ids": ["A", "B", "C", "D"], "finish_places": [1, 2, 3, 4]},
        {"athlete_ids": ["A", "C", "E"], "finish_places": [2, 1, 3]},
    ]
    backfill_all_races(store, historical)

    # Incremental (small incoming race)
    summary = update_from_race_results(
        store,
        athlete_ids=["B", "C", "E", "F"],
        finish_places=[4, 1, 2, 3],
    )
    print(summary)
    print(store.to_dataframe().head(10))
