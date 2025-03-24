require("dotenv").config();
const { MongoClient } = require("mongodb");
const uri = process.env.MONGO_URI;
const dbName = process.env.DB_NAME || "AllResults";
const client = new MongoClient(uri);
const crypto = require('crypto');
const readline = require("readline");

async function matchParticipantsToAthletes() {
  try {
    await client.connect();
    console.log("Connected to database:", dbName);

    const db = client.db(dbName);
    const participantsCol = db.collection("Participants Table");
    const athletesCol = db.collection("athlete_table");

    const participants = await participantsCol.find({ processed: false }).toArray();
    console.log(`Found ${participants.length} unprocessed participants.`);

    const proceed = await waitForConfirmation();

    function waitForConfirmation(prompt = "Start matching? (Y/n): ") {
      return new Promise((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        rl.question(prompt, (answer) => {
          rl.close();
          resolve(answer.trim().toLowerCase() === "y");
        });
      });
    }

    if (!proceed) {
      console.log("Aborted by user.");
      await client.close();
      return;
    }

    for (const p of participants) {
      const {
        Participant_ID,
        First_Name,
        Last_Name,
        Race_ID,
        Age_Group,
        Gender,
        Team,
        Division,
        Wave_Start,
        usat_license,
      } = p;

      const age = Age_Group;
      const race_year = Wave_Start?.getFullYear();
      const estDobYear = race_year - age;

      let matchedAthlete = null;

      // Step 1: Match by USAT License
      if (usat_license) {
        matchedAthlete = await athletesCol.findOne({ usat_license });
        if (matchedAthlete) {
          console.log("Matched by USAT License");
        }
      }

      // Step 2: Fallback to name/gender/age/team
      if (!matchedAthlete) {
        const query = {
          First_Name: new RegExp(`^${First_Name}$`, "i"),
          Last_Name: new RegExp(`^${Last_Name}$`, "i"),
        };
        const candidates = await athletesCol.find(query).toArray();

        for (const a of candidates) {
          let match = true;

          if (a.dob_year && estDobYear && Math.abs(a.dob_year - estDobYear) > 1) {
            match = false;
          }

          if (match) {
            matchedAthlete = a;
            console.log("Fallback matched with:", a._id);
            break;
          }
        }
      }

      if (matchedAthlete) {
        const updateResult = await athletesCol.updateOne(
          { _id: matchedAthlete._id },
          { $addToSet: { participants: Participant_ID } }
        );

        if (updateResult.modifiedCount > 0) {
          console.log(`Linked ${Participant_ID} to athlete ${matchedAthlete._id}`);
        } else {
          console.log(`ℹParticipant ${Participant_ID} already linked`);
        }
      } else {
        const newAthlete = {
          Athlete_ID: crypto.randomUUID(),
          First_Name,
          Last_Name,
          Gender,
          dob_year: estDobYear,
          usat_license,
          participants: [Participant_ID]
        };

        const result = await athletesCol.insertOne(newAthlete);
        console.log(`Created new athlete with _id: ${result.insertedId}`);
      }

      // Mark participant as processed
      await participantsCol.updateOne(
        { Participant_ID },
        { $set: { processed: true } }
      );
    }

    console.log("\n Athlete matching complete.");
  } catch (err) {
    console.error(" Error during matching:", err);
  } finally {
    await client.close();
    console.log("Connection closed.");
  }
}

matchParticipantsToAthletes();
