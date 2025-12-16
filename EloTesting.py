import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import itertools
from tqdm import tqdm  # Import tqdm

def generate_athletes(n):
    names = [f"Athlete_{i+1}" for i in range(n)]
    elo_scores = 1400
    return pd.DataFrame({"Athlete": names, "ELO": elo_scores})

def simulate_race(df):
    n = len(df)
    # Use a small deviation so performances are near the ELO value most of the time
    performance_score = df["ELO"] + np.random.normal(0, 3, size=n)
    names = df["Athlete"].tolist()

    # Each athlete has a 2.5% chance of an upset with a small upset magnitude
    for idx in range(n):
        if np.random.rand() < 0.025:
            upset_amount = np.random.randint(20, 40)
            if np.random.rand() < 0.5:
                performance_score[idx] += upset_amount
            else:
                performance_score[idx] -= upset_amount

    finish_places = pd.Series(performance_score).rank(method="min", ascending=False).astype(int)
    p_actual = (finish_places - 1) / (n - 1)
    return pd.DataFrame({
        "Athlete": names,
        "Finish_Place": finish_places,
        "Actual P": p_actual,
        "Performance Score": performance_score
    }).sort_values("Finish_Place").reset_index(drop=True)

def calculate_pairwise_local_elo(df, race_df, Klocal):
    df = df.copy()
    race_df = race_df.reset_index(drop=True)
    local_updates = []

    def clean_name(name):
        return name.split("*")[0]

    for i, row in race_df.iterrows():
        athlete = row["Athlete"]
        athlete_clean = clean_name(athlete)
        athlete_rating = df.loc[df["Athlete"] == athlete_clean, "ELO"].values[0]
        athlete_place = row["Finish_Place"]

        lower = max(0, i - 3)
        upper = min(len(race_df), i + 4)
        opponents = race_df.iloc[lower:upper].drop(index=i)

        rlocal_sum = 0
        for _, opp in opponents.iterrows():
            opponent_clean = clean_name(opp["Athlete"])
            match = df.loc[df["Athlete"] == opponent_clean, "ELO"]
            if match.empty:
                continue
            opponent_rating = match.values[0]
            opp_place = opp["Finish_Place"]

            delta = opponent_rating - athlete_rating
            adjusted_K = Klocal / (1 + abs(delta) / 100)
            # Expected score based on rating difference
            E = 1 / (1 + 10 ** (delta / 400))
            # Actual outcome: 1 if athlete finishes ahead (lower place number), else 0.
            S = 1 if athlete_place < opp_place else 0
            surprise = abs(S - E)
            Rlocal = adjusted_K * surprise * (S - E)
            rlocal_sum += Rlocal

        local_updates.append({"Athlete": athlete, "Rlocal Sum": rlocal_sum})
    
    return pd.DataFrame(local_updates)

def calculate_bulk_elo(df, race_df, Kglobal):
    df = df.copy()
    race_df = race_df.copy()
    # Clean athlete names in the race results if needed
    race_df["Cleaned_Athlete"] = race_df["Athlete"].str.replace("*", "", regex=False)
    df = df.merge(race_df[["Cleaned_Athlete", "Actual P"]], left_on="Athlete", right_on="Cleaned_Athlete")
    df["Rank"] = df["ELO"].rank(method="min", ascending=False).astype(int)
    df["P expected"] = (df["Rank"] - 1) / (len(df) - 1)
    # Use a much smaller Kglobal so that deviations when things are expected are very small.
    df["Delta R Bulk"] = Kglobal * (df["Actual P"] - df["P expected"])
    return df[["Athlete", "Delta R Bulk"]]

def update_elo(df, local_df, bulk_df, race_df, alpha, max_change):
    # Rename current ratings for clarity
    df = df.rename(columns={"ELO": "Old ELO"})
    merged = df.merge(local_df, on="Athlete")
    merged = merged.merge(bulk_df, on="Athlete")
    merged = merged.merge(race_df[["Athlete", "Finish_Place"]], on="Athlete")
    
    # Adjust weights:
    # alpha now represents the global (minimal) weight, and 1-alpha represents the local (more impactful) weight.
    merged["Total Change"] = alpha * merged["Delta R Bulk"] + (1 - alpha) * merged["Rlocal Sum"]
    
    # Optionally, remove or relax caps—here we clip to keep extreme outliers in check, but you can adjust max_change.
    merged["Total Change"] = merged["Total Change"].clip(-max_change, max_change)
    
    # Remove normalization if you want the changes to be absolute and not forced to zero-sum,
    # which allows athletes to drop consistently even when others are doing poorly.
    # (Comment out or remove the next normalization line if desired.)
    # merged["Total Change"] -= merged["Total Change"].mean()
    
    merged["New ELO"] = merged["Old ELO"] + merged["Total Change"]
    return merged[["Athlete", "Finish_Place", "Old ELO", "New ELO", "Total Change"]].sort_values("Finish_Place")

# -----------------------------------------------------
# Simulation Parameters for initial simulation

n_athletes = 10
n_races = 20

# Use a lower Kglobal to keep global updates minimal. For example:
Klocal = 4.5      # Local updates remain as before
Kglobal = 1       # Much lower global multiplier
# Set alpha low so that local component drives most fluctuations (e.g., 20% global, 80% local)
alpha = 0.2       
max_change = 20   # You can adjust or remove this cap as needed

# Remove regression (i.e. set decay factor to 1 or simply skip the regression step)
decay_factor = 1.0

# Initialize athlete pool
athletes = generate_athletes(n_athletes)
elo_history = {athlete: [elo] for athlete, elo in zip(athletes["Athlete"], athletes["ELO"])}

# Simulate races
for race_num in range(1, n_races + 1):
    race = simulate_race(athletes)
    local = calculate_pairwise_local_elo(athletes, race, Klocal=Klocal)
    bulk = calculate_bulk_elo(athletes, race, Kglobal=Kglobal)
    elo_summary = update_elo(athletes, local, bulk, race, alpha, max_change)

    # Update ELOs in athlete pool (without regression toward a floor)
    updated_elos = elo_summary[["Athlete", "New ELO"]]
    athletes["ELO"] = athletes.merge(updated_elos, on="Athlete")["New ELO"]

    # Track ELO history without pulling scores upward
    for athlete, new_elo in zip(updated_elos["Athlete"], athletes["ELO"]):
        clean = athlete.split("*")[0]
        elo_history[clean].append(new_elo)

# Plot the ELO progression over the races for the initial simulation
plt.figure(figsize=(14, 8))
for athlete, history in elo_history.items():
    plt.plot(history, label=athlete)
plt.title("ELO Rating Over Races (No Artificial Floor)")
plt.xlabel("Race Number")
plt.ylabel("ELO Rating")
plt.legend(loc='upper right', bbox_to_anchor=(1.15, 1.05), ncol=1)
plt.grid(True)
plt.tight_layout()
plt.show()


# -----------------------------------------------------
# Optionally, if you are exploring parameter spaces for faster simulation,
# make the corresponding adjustments here as well:
n_athletes = 5
n_races = 10

Klocal_values = np.linspace(4.5, 5.5, 10)
# Use lower Kglobal values for minimal global impact
Kglobal_values = np.linspace(0.5, 2, 5)
# Maintain a lower alpha (global weight)
alpha_values = np.linspace(0.15, 0.25, 10)
max_change_values = np.linspace(15, 22.5, 10)
decay_factors = [1.0]  # No regression; ratings evolve solely based on race outcomes

results_summary = []
param_grid = list(itertools.product(Klocal_values, Kglobal_values, alpha_values, max_change_values, decay_factors))
total_iterations = len(param_grid)

for Klocal, Kglobal, alpha, max_change, decay in tqdm(param_grid, total=total_iterations, desc="Testing parameter grid"):
    athletes = generate_athletes(n_athletes)
    elo_history = {athlete: [elo] for athlete, elo in zip(athletes["Athlete"], athletes["ELO"])}

    for race_num in range(1, n_races + 1):
        race = simulate_race(athletes)
        local = calculate_pairwise_local_elo(athletes, race, Klocal=Klocal)
        bulk = calculate_bulk_elo(athletes, race, Kglobal=Kglobal)
        elo_summary = update_elo(athletes, local, bulk, race, alpha, max_change)

        updated_elos = elo_summary[["Athlete", "New ELO"]]
        athletes["ELO"] = athletes.merge(updated_elos, on="Athlete")["New ELO"]
        athletes["ELO"] = athletes["ELO"] * decay + 1400 * (1 - decay)  # With decay factor=1, this is a no-op

        for athlete, new_elo in zip(updated_elos["Athlete"], athletes["ELO"]):
            clean = athlete.split("*")[0]
            elo_history[clean].append(new_elo)

    final_elos = [history[-1] for history in elo_history.values()]
    volatility = np.std(final_elos)

    results_summary.append({
        "Klocal": Klocal,
        "Kglobal": Kglobal,
        "alpha": alpha,
        "max_change": max_change,
        "decay": decay,
        "Volatility": volatility
    })

results_df = pd.DataFrame(results_summary).sort_values("Volatility")
print(results_df)

# For selected variants, simulate and plot ELO progression for Athlete_1:
sorted_df = results_df.reset_index(drop=True)
n_total = len(sorted_df)
least_volatile = sorted_df.head(2)
most_volatile = sorted_df.tail(2)
middle_volatile = sorted_df.iloc[n_total//2 - 2:n_total//2 + 3]
selected_variants = pd.concat([least_volatile, middle_volatile, most_volatile]).reset_index(drop=True)

elo_variants_selected = []
for idx, row in selected_variants.iterrows():
    Klocal = row["Klocal"]
    Kglobal = row["Kglobal"]
    alpha = row["alpha"]
    max_change = row["max_change"]
    decay = row["decay"]

    athletes = generate_athletes(n_athletes)
    elo_history = {athlete: [elo] for athlete, elo in zip(athletes["Athlete"], athletes["ELO"])}
    athlete_1_name = list(elo_history.keys())[0]

    for race_num in range(1, n_races + 1):
        race = simulate_race(athletes)
        local = calculate_pairwise_local_elo(athletes, race, Klocal=Klocal)
        bulk = calculate_bulk_elo(athletes, race, Kglobal=Kglobal)
        elo_summary = update_elo(athletes, local, bulk, race, alpha, max_change)    

        updated_elos = elo_summary[["Athlete", "New ELO"]]
        athletes["ELO"] = athletes.merge(updated_elos, on="Athlete")["New ELO"]
        athletes["ELO"] = athletes["ELO"] * decay + 1400 * (1 - decay)

        for athlete, new_elo in zip(updated_elos["Athlete"], athletes["ELO"]):
            clean = athlete.split("*")[0]
            elo_history[clean].append(new_elo)

    elo_variants_selected.append({
        "label": f"Kloc:{Klocal} Kglob:{Kglobal} α:{alpha} Δ:{max_change} decay:{decay}",
        "elos": elo_history[athlete_1_name]
    })

plt.figure(figsize=(16, 9))
for variant in elo_variants_selected:
    plt.plot(range(len(variant["elos"])), variant["elos"], label=variant["label"], linewidth=2)
plt.title("ELO Progression for Athlete_1 (Selected Parameter Variants)")
plt.xlabel("Race Number")
plt.ylabel("ELO Rating")
plt.legend(bbox_to_anchor=(1.05, 1), loc='upper left', fontsize="x-small")
plt.grid(True)
plt.tight_layout()
plt.show()
