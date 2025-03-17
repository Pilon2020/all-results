import os
import json
import pandas as pd
import uuid
from datetime import datetime, timedelta
import time
from collections import defaultdict
from bson.decimal128 import Decimal128
from bson.json_util import dumps, CANONICAL_JSON_OPTIONS

# ------------------------------
# CONFIGURATION & PERSISTENT IDS
# ------------------------------
excel_path = "C:/Users/pilon/Downloads/2024races.xlsx"
output_dir = os.path.dirname(excel_path)
counter_file = os.path.join(output_dir, "id_counters.json")

if os.path.exists(counter_file):
    with open(counter_file, "r") as f:
        counters = json.load(f)
        race_id_counter = counters.get("race_id_counter", 1)
        participant_id_counter = counters.get("participant_id_counter", 1)
else:
    race_id_counter = 1
    participant_id_counter = 1

# ------------------------------
# READ ALL SHEET NAMES
# ------------------------------
workbook = pd.ExcelFile(excel_path)
sheet_names = workbook.sheet_names

# ------------------------------
# HELPER FUNCTIONS
# ------------------------------
def to_float(value):
    try:
        return float(value) if value not in [None, ""] else None
    except ValueError:
        return None

def to_decimal(value):
    try:
        return Decimal128(str(value)) if value not in [None, ""] else Decimal128("0")
    except Exception:
        return Decimal128("0")

def parse_time_value(time_val):
    """
    Accepts a time value (which may be a numeric Excel fraction, a string, or a datetime)
    and returns a tuple of (formatted_time_str "HH:MM:SS", total_seconds).
    If parsing fails, returns (None, None).
    """
    if pd.isna(time_val):
        return None, None

    t_obj = None
    if isinstance(time_val, (int, float)):
        try:
            numeric_val = float(time_val)
            t_obj = datetime(1899, 12, 30) + timedelta(days=numeric_val)
        except Exception:
            return None, None
    elif isinstance(time_val, str):
        for fmt in ("%H:%M:%S", "%H:%M", "%I:%M:%S %p", "%I:%M %p"):
            try:
                t_obj = datetime.strptime(time_val.strip(), fmt)
                break
            except ValueError:
                continue
    elif isinstance(time_val, datetime):
        t_obj = time_val

    if t_obj is None:
        return None, None

    time_str = t_obj.strftime("%H:%M:%S")
    seconds = t_obj.hour * 3600 + t_obj.minute * 60 + t_obj.second
    return time_str, seconds

# ------------------------------
# STORAGE: Race, Athlete, and Result
# ------------------------------
race_table_data = []
athlete_table_data = []
result_table_data = []
result_id_counter = 1  # Unique result IDs

# ------------------------------
# MAIN LOOP OVER EACH SHEET
# ------------------------------
for sheet_name in sheet_names:
    # 1) READ RACE METADATA (first two rows)
    race_meta_df = pd.read_excel(
        excel_path,
        sheet_name=sheet_name,
        nrows=2,       # header + race metadata
        header=0
    )
    # 2) READ PARTICIPANTS (skip the first 2 rows so that row 3 becomes the header)
    participants_df = pd.read_excel(
        excel_path,
        sheet_name=sheet_name,
        skiprows=2,
        header=0
    )

    # Extract race metadata from the first row of race_meta_df
    race_row = race_meta_df.iloc[0]
    date_value = race_row.get("Date")
    location = race_row.get("Location")
    latitude = race_row.get("Latitude")
    longitude = race_row.get("Longitude")
    total_distance = race_row.get("Total_Distance")
    swim_distance = race_row.get("Swim_Distance")
    bike_distance = race_row.get("Bike_Distance")
    run_distance = race_row.get("Run_Distance")
    official_website = race_row.get("Official Website")
    # Use race type from metadata if available; otherwise, default to "Triathlon"
    race_type = str(race_row.get("Race Type", "Triathlon")).title()

    # Convert date_value to datetime object
    if isinstance(date_value, str):
        try:
            date_obj = datetime.strptime(date_value, "%Y-%m-%d")
        except ValueError:
            try:
                date_obj = datetime.strptime(date_value, "%m/%d/%Y")
            except ValueError:
                date_obj = None
    elif isinstance(date_value, datetime):
        date_obj = date_value
    else:
        date_obj = None

    distance_type = "Unknown"

    # Generate unique Race_ID and Race UUID
    current_race_id = race_id_counter
    race_id_counter += 1
    race_uuid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{sheet_name}-distance-{current_race_id}"))

    race_entry = {
        "_id": race_uuid,
        "Name": sheet_name.title(),
        "Date": date_obj,
        "Location": location.title() if isinstance(location, str) else location,
        "Latitude": to_decimal(latitude),
        "Longitude": to_decimal(longitude),
        "Total_Distance": to_float(total_distance),
        "Swim_Distance": to_float(swim_distance),
        "Bike_Distance": to_float(bike_distance),
        "Run_Distance": to_float(run_distance),
        "Total_Participants": len(participants_df),
        "Official_Website": official_website,
        "Race_Type": race_type,
        "Distance_Type": distance_type,
        "Race_ID": current_race_id
    }
    race_table_data.append(race_entry)

    # ------------------------------------
    # 3) BUILD ATHLETE & RESULT ENTRIES
    # ------------------------------------
    for _, row in participants_df.iterrows():
        current_participant_id = participant_id_counter
        participant_id_counter += 1

        bib_number = row.get("Bib")
        first_name = str(row.get("First Name", "")).strip().title() if pd.notna(row.get("First Name")) else None
        last_name  = str(row.get("Last Name", "")).strip().title() if pd.notna(row.get("Last Name")) else None
        age_group = row.get("Age")
        gender = str(row.get("Gender", "")).strip().title() if pd.notna(row.get("Gender")) else None
        team = str(row.get("Team", "")).strip() if pd.notna(row.get("Team")) else None
        division = str(row.get("Division", "")).strip().title() if pd.notna(row.get("Division")) else None
        distance = row.get("Distance")  # Extract Distance from participant row

        # Convert Bib to int if possible
        if pd.notna(bib_number):
            try:
                bib_number = int(bib_number)
            except:
                bib_number = None

        # Convert Age to int if possible
        if pd.notna(age_group):
            try:
                age_group = int(age_group)
            except:
                age_group = None

        # Process Wave_Start time
        wave_start = row.get("Start")
        wave_start_value = None
        if pd.notna(wave_start):
            t_obj = None
            try:
                numeric_val = float(wave_start)
                t_obj = datetime(1899, 12, 30) + pd.to_timedelta(numeric_val, unit='D')
            except:
                pass
            if t_obj is None:
                try:
                    t_obj = pd.to_datetime(wave_start, errors='coerce')
                except:
                    t_obj = None
            if t_obj is None and isinstance(wave_start, str):
                for fmt in ("%H:%M:%S", "%H:%M", "%I:%M:%S %p", "%I:%M %p"):
                    try:
                        t_obj = datetime.strptime(wave_start.strip(), fmt)
                        break
                    except ValueError:
                        continue
            if t_obj is not None and not pd.isna(t_obj) and date_obj:
                combined_dt = datetime.combine(date_obj.date(), t_obj.time())
                epoch = datetime(1970, 1, 1)
                millis = int((combined_dt - epoch).total_seconds() * 1000)
                wave_start_value = {"$date": {"$numberLong": str(millis)}}

        athlete_entry = {
            "Participant_ID": current_participant_id,
            "Race_ID": current_race_id,
            "Bib_Number": bib_number,
            "First_Name": first_name,
            "Last_Name": last_name,
            "Age_Group": age_group,
            "Gender": gender,
            "Team": team,
            "Division": division,
            "Wave_Start": wave_start_value
        }
        athlete_table_data.append(athlete_entry)

        # Process time splits
        swim_split  = row.get("Swim Split")
        t1_split    = row.get("T1")
        bike_split  = row.get("Bike Split")
        t2_split    = row.get("T2")
        run_split   = row.get("Run Split")
        finish_val  = row.get("Finish")
        penalty_val = row.get("Penalty")
        finish_stat = row.get("Finish Status")

        swim_str, _ = parse_time_value(swim_split)
        t1_str, _   = parse_time_value(t1_split)
        bike_str, _ = parse_time_value(bike_split)
        t2_str, _   = parse_time_value(t2_split)
        run_str, _  = parse_time_value(run_split)
        total_str, total_secs = parse_time_value(finish_val)
        penalty_str, _ = parse_time_value(penalty_val)

        if pd.isna(finish_stat):
            finish_status = "FINISHED"
        else:
            finish_status = str(finish_stat).strip().upper()

        # Only store numeric finish time if FINISHED
        if finish_status != "FINISHED":
            total_secs = None

        # Determine age bucket for ranking:
        # For Collegiate division, use "Collegiate"; otherwise, use age ranges.
        if division == "Collegiate":
            age_bucket = "Collegiate"
        else:
            if age_group is not None:
                if 18 <= age_group <= 24:
                    age_bucket = "18-24"
                elif 25 <= age_group <= 29:
                    age_bucket = "25-29"
                elif 30 <= age_group <= 34:
                    age_bucket = "30-34"
                elif 35 <= age_group <= 39:
                    age_bucket = "35-39"
                elif 40 <= age_group <= 44:
                    age_bucket = "40-44"
                elif 45 <= age_group <= 49:
                    age_bucket = "45-49"
                elif 50 <= age_group <= 54:
                    age_bucket = "50-54"
                elif 55 <= age_group <= 59:
                    age_bucket = "55-59"
                elif 60 <= age_group <= 64:
                    age_bucket = "60-64"
                else:
                    age_bucket = "65+"
            else:
                age_bucket = None

        result_entry = {
            "Result_ID": result_id_counter,
            "_race_id": current_race_id,  # For grouping by race
            "Participant_ID": current_participant_id,
            "First Name": first_name,
            "Last Name": last_name,
            "Total_Time": total_str,
            "Swim_Time": swim_str,
            "T1_Time": t1_str,
            "Bike_Time": bike_str,
            "T2_Time": t2_str,
            "Run_Time": run_str,
            "Penalty_Time": penalty_str,
            "Overall_Rank": None,
            "Division_Gender_Rank": None,
            "Age_Group_Rank": None,
            # "Distance_Rank": None,
            "Finish_Status": finish_status,
            # Temporary fields for ranking groups
            "_finish_seconds": total_secs,
            "_gender": gender,
            "_age_bucket": age_bucket,
            "_division": division,
            "_distance": to_float(distance)
        }
        result_table_data.append(result_entry)
        result_id_counter += 1

# ------------------------------
# RANKING PROCESS
# ------------------------------
def rank_category(group, rank_field):
    """Sort a group by finish time and assign incremental rank."""
    sorted_group = sorted(group, key=lambda r: r["_finish_seconds"])
    for i, r in enumerate(sorted_group, start=1):
        r[rank_field] = i

# Group results by race
results_by_race = defaultdict(list)
for res in result_table_data:
    results_by_race[res["_race_id"]].append(res)

# Process each race separately
for race_id, results in results_by_race.items():
    # Check if this race is a Mixed Relay; if so, skip ranking
    race_meta = next((r for r in race_table_data if r["Race_ID"] == race_id), None)
    if race_meta and "Mixed Relay" in race_meta.get("Race_Type", "").lower():
        continue  # Skip ranking entirely for Mixed Relay races


    # Filter finished results with a valid finish time
    finished = [
        r for r in results
        if r["Finish_Status"] == "FINISHED"
        and r["_finish_seconds"] is not None
        and "mixed relay" not in r.get("Race_Type", "").lower()
    ]

    
    # 1. Overall Rank: Group by (Distance, Division) This catagory rank - Think Overall Open Racers (All)
    overall_groups = defaultdict(list)
    for r in finished:
        key = (r["_distance"], r["_division"])
        overall_groups[key].append(r)
    for group in overall_groups.values():
        rank_category(group, "Overall_Rank")
    
    # 2. Division Gender Rank: Group by (Distance, Division, Gender) - Gender Rank Open Racers (Gender)
    division_gender_groups = defaultdict(list)
    for r in finished:
        key = (r["_distance"], r["_division"], r["_gender"])
        division_gender_groups[key].append(r)
    for group in division_gender_groups.values():
        rank_category(group, "Division_Gender_Rank")
    
    # 3. Age Group Rank: Group by (Distance, Division, Age Bucket, Gender) - 18-24 Rank Open Racers (AG)
    age_group_groups = defaultdict(list)
    for r in finished:
        key = (r["_distance"], r["_division"], r["_age_bucket"], r["_gender"])
        age_group_groups[key].append(r)
    for group in age_group_groups.values():
        rank_category(group, "Age_Group_Rank")
    
    
    # # 4. Total Rank: Group by (Distance) - Race Finish order including collegiate athletes
    # distance_groups = defaultdict(list)
    # for r in finished:
    #     key = (r['_distance'])
    #     distance_groups[key].append(r)
    # for group in distance_groups.values():
    #     rank_category(group, "Distance_Rank")
        
# Remove temporary ranking fields
for res in result_table_data:
    for temp_field in ["_finish_seconds", "_gender", "_age_bucket", "_division", "_distance"]:
        res.pop(temp_field, None)

# ------------------------------
# WRITE OUTPUT FILES
# ------------------------------
race_json_file_path = os.path.join(output_dir, "Race_Table.json")
athlete_json_file_path = os.path.join(output_dir, "Athlete_Table.json")
result_json_file_path = os.path.join(output_dir, "Result_Table.json")

with open(race_json_file_path, "w") as jf:
    jf.write(dumps(race_table_data, indent=4, json_options=CANONICAL_JSON_OPTIONS))
with open(athlete_json_file_path, "w") as jf:
    jf.write(dumps(athlete_table_data, indent=4, json_options=CANONICAL_JSON_OPTIONS))
with open(result_json_file_path, "w") as jf:
    jf.write(dumps(result_table_data, indent=4, json_options=CANONICAL_JSON_OPTIONS))

print(f"\nRace data exported to: {race_json_file_path}")
print(f"Athlete data exported to: {athlete_json_file_path}")
print(f"Result data exported to: {result_json_file_path}")

# ------------------------------
# UPDATE PERSISTENT COUNTERS
# ------------------------------
new_counters = {
    "race_id_counter": race_id_counter,
    "participant_id_counter": participant_id_counter
}
with open(counter_file, "w") as f:
    json.dump(new_counters, f, indent=4)

print(f"Updated counters: {new_counters}")
