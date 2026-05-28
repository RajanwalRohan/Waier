import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const db = new PrismaClient();

// ─── Helper utilities ────────────────────────────────────
function rand(min: number, max: number) {
  return Math.round((Math.random() * (max - min) + min) * 10) / 10;
}
function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}
function dob(age: number): string {
  const y = 2026 - age;
  const m = randInt(1, 12);
  const d = randInt(1, 28);
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
function pastDate(daysAgo: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

// ─── Realistic population distributions ──────────────────

const FIRST_NAMES_M = ["James","Michael","Robert","David","John","William","Daniel","Marcus","Carlos","Ahmed","Kenji","Raj","Connor","Tyler","Brandon","DeShawn","Mateo","Liam","Noah","Ethan","Diego","Wei","Hiroshi","Amir","Omar","Stefan","Pavel","Tomas","Andre","Kwame"];
const FIRST_NAMES_F = ["Sarah","Emily","Jessica","Ashley","Maria","Priya","Aiko","Fatima","Chen","Sophia","Olivia","Ava","Isabella","Mia","Aaliyah","Jasmine","Elena","Yuki","Nadia","Carmen","Brianna","Kayla","Destiny","Grace","Lily","Zara","Amara","Mei","Sonia","Nina"];
const LAST_NAMES = ["Johnson","Smith","Williams","Brown","Davis","Garcia","Martinez","Anderson","Taylor","Thomas","Jackson","White","Harris","Martin","Thompson","Lee","Kim","Nguyen","Patel","Singh","Tanaka","Müller","Silva","Chen","Ali","Okafor","Washington","Rivera","Scott","Wright"];

const SEXES = ["male", "female"] as const;
const ACTIVITY_LEVELS = ["sedentary", "lightly_active", "moderately_active", "very_active", "extremely_active"] as const;
const FITNESS_GOALS = ["lose_weight", "gain_muscle", "maintain", "improve_endurance", "general_health"] as const;
const CONDITIONS = ["Type 1 Diabetes","Type 2 Diabetes","Hypertension","High Cholesterol","Heart Disease","Asthma","Arthritis","Crohn's Disease","Celiac Disease","Thyroid Disorder","PCOS","Anemia","Osteoporosis","Chronic Kidney Disease"];
const ALLERGENS = ["Milk / Dairy","Eggs","Peanuts","Tree Nuts","Fish","Shellfish","Wheat / Gluten","Soybeans","Sesame"];

// Lifting exercises with typical weight ranges by population segment (kg)
const LIFTS = [
  { name: "Bench Press", mBeg: [40,55], mInt: [60,90], mAdv: [90,140], fBeg: [15,25], fInt: [25,45], fAdv: [45,70] },
  { name: "Squat", mBeg: [50,70], mInt: [80,120], mAdv: [120,200], fBeg: [25,40], fInt: [40,70], fAdv: [70,120] },
  { name: "Deadlift", mBeg: [60,80], mInt: [90,140], mAdv: [140,230], fBeg: [30,50], fInt: [50,80], fAdv: [80,140] },
  { name: "Overhead Press", mBeg: [25,35], mInt: [40,60], mAdv: [60,90], fBeg: [10,18], fInt: [18,30], fAdv: [30,50] },
  { name: "Barbell Row", mBeg: [30,45], mInt: [50,75], mAdv: [75,120], fBeg: [15,25], fInt: [25,45], fAdv: [45,70] },
];

const CARDIO = ["Running","Cycling","Swimming","Jump Rope","Rowing","Elliptical","Hiking","Stair Climber"];
const WORKOUT_NAMES = ["Morning Lift","Evening Session","Full Body","Upper Body","Lower Body","Push Day","Pull Day","Leg Day","HIIT Circuit","Cardio Session","Strength Training","CrossFit WOD"];

// ─── Profile archetypes ──────────────────────────────────

interface PersonArchetype {
  ageRange: [number, number];
  sex: "male" | "female";
  heightRange: [number, number]; // cm
  weightRange: [number, number]; // kg
  activityBias: (typeof ACTIVITY_LEVELS)[number][];
  goalBias: (typeof FITNESS_GOALS)[number][];
  // Daily metric ranges
  steps: [number, number];
  heartRate: [number, number];
  sleepHours: [number, number];
  caloriesBurned: [number, number];
  liftLevel: "beginner" | "intermediate" | "advanced";
  workoutsPerWeek: [number, number];
  conditionChance: number; // 0-1 probability of having a condition
  caloriesLogged: [number, number];
}

const ARCHETYPES: PersonArchetype[] = [
  // Young active males
  { ageRange: [18,25], sex: "male", heightRange: [170,190], weightRange: [65,90], activityBias: ["very_active","extremely_active"], goalBias: ["gain_muscle","improve_endurance"], steps: [8000,15000], heartRate: [55,72], sleepHours: [6,8.5], caloriesBurned: [2200,3200], liftLevel: "intermediate", workoutsPerWeek: [4,6], conditionChance: 0.05, caloriesLogged: [2000,3500] },
  // Young active females
  { ageRange: [18,25], sex: "female", heightRange: [155,175], weightRange: [50,72], activityBias: ["moderately_active","very_active"], goalBias: ["maintain","improve_endurance","general_health"], steps: [7000,13000], heartRate: [58,75], sleepHours: [6.5,9], caloriesBurned: [1600,2400], liftLevel: "intermediate", workoutsPerWeek: [3,5], conditionChance: 0.08, caloriesLogged: [1500,2500] },
  // Young sedentary males
  { ageRange: [18,25], sex: "male", heightRange: [168,185], weightRange: [70,110], activityBias: ["sedentary","lightly_active"], goalBias: ["lose_weight","general_health"], steps: [2000,5000], heartRate: [70,90], sleepHours: [5,7.5], caloriesBurned: [1600,2200], liftLevel: "beginner", workoutsPerWeek: [0,2], conditionChance: 0.1, caloriesLogged: [2200,3800] },
  // Mid-age fit males
  { ageRange: [26,40], sex: "male", heightRange: [170,190], weightRange: [72,95], activityBias: ["moderately_active","very_active"], goalBias: ["maintain","gain_muscle"], steps: [7000,12000], heartRate: [58,75], sleepHours: [6,8], caloriesBurned: [2000,2900], liftLevel: "advanced", workoutsPerWeek: [3,6], conditionChance: 0.12, caloriesLogged: [1800,3000] },
  // Mid-age fit females
  { ageRange: [26,40], sex: "female", heightRange: [155,175], weightRange: [52,75], activityBias: ["moderately_active","very_active"], goalBias: ["maintain","lose_weight","general_health"], steps: [6000,11000], heartRate: [60,78], sleepHours: [6,8.5], caloriesBurned: [1500,2200], liftLevel: "intermediate", workoutsPerWeek: [3,5], conditionChance: 0.15, caloriesLogged: [1400,2200] },
  // Mid-age sedentary
  { ageRange: [26,40], sex: "male", heightRange: [168,185], weightRange: [80,120], activityBias: ["sedentary","lightly_active"], goalBias: ["lose_weight","general_health"], steps: [2500,6000], heartRate: [72,92], sleepHours: [5.5,7.5], caloriesBurned: [1700,2300], liftLevel: "beginner", workoutsPerWeek: [0,2], conditionChance: 0.2, caloriesLogged: [2200,3500] },
  // Mid-age sedentary females
  { ageRange: [26,40], sex: "female", heightRange: [155,170], weightRange: [58,95], activityBias: ["sedentary","lightly_active"], goalBias: ["lose_weight","general_health"], steps: [2000,5500], heartRate: [70,88], sleepHours: [5.5,8], caloriesBurned: [1300,1900], liftLevel: "beginner", workoutsPerWeek: [0,2], conditionChance: 0.2, caloriesLogged: [1600,2800] },
  // Older active males
  { ageRange: [41,60], sex: "male", heightRange: [168,185], weightRange: [75,100], activityBias: ["moderately_active","very_active"], goalBias: ["maintain","general_health","improve_endurance"], steps: [6000,10000], heartRate: [60,78], sleepHours: [6,7.5], caloriesBurned: [1800,2600], liftLevel: "intermediate", workoutsPerWeek: [3,5], conditionChance: 0.25, caloriesLogged: [1700,2600] },
  // Older active females
  { ageRange: [41,60], sex: "female", heightRange: [153,172], weightRange: [55,80], activityBias: ["moderately_active","very_active"], goalBias: ["maintain","general_health"], steps: [5000,9000], heartRate: [62,80], sleepHours: [6,8], caloriesBurned: [1400,2000], liftLevel: "intermediate", workoutsPerWeek: [2,4], conditionChance: 0.3, caloriesLogged: [1400,2100] },
  // Older sedentary
  { ageRange: [41,60], sex: "male", heightRange: [168,183], weightRange: [82,115], activityBias: ["sedentary","lightly_active"], goalBias: ["lose_weight","general_health"], steps: [1500,4500], heartRate: [72,95], sleepHours: [5,7], caloriesBurned: [1500,2100], liftLevel: "beginner", workoutsPerWeek: [0,1], conditionChance: 0.4, caloriesLogged: [2000,3200] },
  // Older sedentary females
  { ageRange: [41,60], sex: "female", heightRange: [153,170], weightRange: [60,100], activityBias: ["sedentary","lightly_active"], goalBias: ["lose_weight","general_health"], steps: [1500,4000], heartRate: [70,90], sleepHours: [5,7.5], caloriesBurned: [1200,1800], liftLevel: "beginner", workoutsPerWeek: [0,1], conditionChance: 0.4, caloriesLogged: [1500,2600] },
  // Senior active
  { ageRange: [61,80], sex: "male", heightRange: [165,180], weightRange: [68,92], activityBias: ["lightly_active","moderately_active"], goalBias: ["maintain","general_health"], steps: [3000,7000], heartRate: [60,80], sleepHours: [5.5,7.5], caloriesBurned: [1400,2000], liftLevel: "beginner", workoutsPerWeek: [1,3], conditionChance: 0.5, caloriesLogged: [1500,2200] },
  { ageRange: [61,80], sex: "female", heightRange: [150,168], weightRange: [52,80], activityBias: ["lightly_active","moderately_active"], goalBias: ["maintain","general_health"], steps: [2500,6000], heartRate: [62,82], sleepHours: [5.5,7.5], caloriesBurned: [1100,1700], liftLevel: "beginner", workoutsPerWeek: [1,3], conditionChance: 0.55, caloriesLogged: [1300,2000] },
  // Powerlifter males
  { ageRange: [20,35], sex: "male", heightRange: [172,192], weightRange: [85,130], activityBias: ["very_active","extremely_active"], goalBias: ["gain_muscle"], steps: [4000,8000], heartRate: [58,72], sleepHours: [7,9], caloriesBurned: [2500,3800], liftLevel: "advanced", workoutsPerWeek: [5,7], conditionChance: 0.05, caloriesLogged: [3000,5000] },
  // Endurance athletes
  { ageRange: [20,45], sex: "male", heightRange: [168,185], weightRange: [60,78], activityBias: ["very_active","extremely_active"], goalBias: ["improve_endurance"], steps: [12000,25000], heartRate: [45,58], sleepHours: [7,9], caloriesBurned: [2500,3500], liftLevel: "beginner", workoutsPerWeek: [5,7], conditionChance: 0.03, caloriesLogged: [2500,4000] },
  { ageRange: [20,45], sex: "female", heightRange: [155,175], weightRange: [48,65], activityBias: ["very_active","extremely_active"], goalBias: ["improve_endurance"], steps: [10000,22000], heartRate: [48,62], sleepHours: [7,9], caloriesBurned: [1800,2800], liftLevel: "beginner", workoutsPerWeek: [5,7], conditionChance: 0.05, caloriesLogged: [2000,3200] },
];

// ─── Seed logic ──────────────────────────────────────────

async function main() {
  console.log("Seeding database with realistic health data...\n");

  const TOTAL_USERS = 200;
  let created = 0;

  for (let i = 0; i < TOTAL_USERS; i++) {
    const arch = pick(ARCHETYPES);
    const age = randInt(arch.ageRange[0], arch.ageRange[1]);
    const sex = arch.sex;
    const firstName = sex === "male" ? pick(FIRST_NAMES_M) : pick(FIRST_NAMES_F);
    const lastName = pick(LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${randInt(1,999)}@seed.waier.test`;

    const heightCm = rand(arch.heightRange[0], arch.heightRange[1]);
    const weightKg = rand(arch.weightRange[0], arch.weightRange[1]);
    const activityLevel = pick(arch.activityBias);
    const fitnessGoal = pick(arch.goalBias);

    // Medical conditions
    const conditions: string[] = [];
    if (Math.random() < arch.conditionChance) {
      const n = randInt(1, 3);
      conditions.push(...pickN(CONDITIONS, n));
    }

    // Food allergies (15% chance)
    const allergies: string[] = [];
    if (Math.random() < 0.15) {
      allergies.push(...pickN(ALLERGENS, randInt(1, 3)));
    }

    const dateOfBirth = dob(age);

    // Create user + profile
    const user = await db.user.create({
      data: {
        id: randomUUID(),
        email,
        name: `${firstName} ${lastName}`,
        passwordHash: "$seed$not-a-real-hash",
        profile: {
          create: {
            dateOfBirth,
            age,
            heightCm,
            weightKg,
            sex,
            fitnessGoal,
            activityLevel,
            unitSystem: "imperial",
            medicalConditions: JSON.stringify(conditions),
            foodAllergies: JSON.stringify(allergies),
            dietaryPreferences: "[]",
          },
        },
      },
    });

    // ─── Generate 30 days of health metrics ────────────
    const daysOfData = 30;
    const metricsData: {
      userId: string;
      type: string;
      value: number;
      unit: string;
      source: string;
      date: Date;
    }[] = [];

    // Per-archetype calibration for the four extra metrics
    const isFit = ["very_active", "extremely_active"].includes(activityLevel);
    const isMod = activityLevel === "moderately_active";
    const hrvBase: [number, number] = isFit ? [55, 95] : isMod ? [40, 70] : [25, 50];
    const respBase: [number, number] = isFit ? [11, 15] : isMod ? [13, 17] : [15, 20];
    const spo2Base: [number, number] = age > 60 ? [94, 98] : [96, 99.5];

    for (let d = 0; d < daysOfData; d++) {
      const date = pastDate(d);
      // Add daily variation (±15%)
      const dayVar = 0.85 + Math.random() * 0.3;

      metricsData.push(
        { userId: user.id, type: "steps", value: Math.round(rand(arch.steps[0], arch.steps[1]) * dayVar), unit: "steps", source: "seed", date },
        { userId: user.id, type: "heart_rate", value: Math.round(rand(arch.heartRate[0], arch.heartRate[1]) * (0.92 + Math.random() * 0.16)), unit: "bpm", source: "seed", date },
        { userId: user.id, type: "sleep_hours", value: Math.round(rand(arch.sleepHours[0], arch.sleepHours[1]) * (0.9 + Math.random() * 0.2) * 10) / 10, unit: "hours", source: "seed", date },
        { userId: user.id, type: "calories_burned", value: Math.round(rand(arch.caloriesBurned[0], arch.caloriesBurned[1]) * dayVar), unit: "kcal", source: "seed", date },
        { userId: user.id, type: "blood_oxygen", value: Math.round(rand(spo2Base[0], spo2Base[1]) * 10) / 10, unit: "percent", source: "seed", date },
        { userId: user.id, type: "hrv", value: Math.round(rand(hrvBase[0], hrvBase[1])), unit: "ms", source: "seed", date },
        { userId: user.id, type: "respiratory_rate", value: Math.round(rand(respBase[0], respBase[1]) * 10) / 10, unit: "brpm", source: "seed", date },
        { userId: user.id, type: "weight", value: Math.round(rand(weightKg - 0.8, weightKg + 0.8) * 10) / 10, unit: "kg", source: "seed", date },
      );

      // Calories logged (meals) — most days
      if (Math.random() < 0.85) {
        metricsData.push(
          { userId: user.id, type: "calories_logged", value: Math.round(rand(arch.caloriesLogged[0], arch.caloriesLogged[1]) * dayVar), unit: "kcal", source: "seed", date },
        );
      }
    }

    // Batch insert metrics
    await db.healthMetric.createMany({ data: metricsData });

    // ─── Generate workouts with exercises ──────────────
    const workoutsPerWeek = randInt(arch.workoutsPerWeek[0], arch.workoutsPerWeek[1]);
    const totalWorkouts = Math.round(workoutsPerWeek * 4.3); // ~30 days

    for (let w = 0; w < totalWorkouts; w++) {
      const dayOffset = Math.round((w / totalWorkouts) * 30);
      const date = pastDate(dayOffset);
      const workoutName = pick(WORKOUT_NAMES);
      const isStrength = !["Cardio Session", "HIIT Circuit"].includes(workoutName);
      const durationMin = isStrength ? randInt(35, 75) : randInt(20, 50);

      const exercises: {
        name: string;
        sets: number | null;
        reps: number | null;
        weightKg: number | null;
        durationSec: number | null;
        order: number;
      }[] = [];

      if (isStrength) {
        // 3-5 lifting exercises
        const numExercises = randInt(3, 5);
        const selectedLifts = pickN(LIFTS, numExercises);
        selectedLifts.forEach((lift, idx) => {
          const level = arch.liftLevel;
          const range = sex === "male"
            ? (level === "advanced" ? lift.mAdv : level === "intermediate" ? lift.mInt : lift.mBeg)
            : (level === "advanced" ? lift.fAdv : level === "intermediate" ? lift.fInt : lift.fBeg);
          exercises.push({
            name: lift.name,
            sets: randInt(3, 5),
            reps: randInt(5, 12),
            weightKg: rand(range[0], range[1]),
            durationSec: null,
            order: idx,
          });
        });
      } else {
        // 1-2 cardio exercises
        const numCardio = randInt(1, 2);
        pickN(CARDIO, numCardio).forEach((name, idx) => {
          exercises.push({
            name,
            sets: null,
            reps: null,
            weightKg: null,
            durationSec: randInt(600, 2400),
            order: idx,
          });
        });
      }

      await db.workout.create({
        data: {
          userId: user.id,
          name: workoutName,
          durationMin,
          date,
          exercises: {
            create: exercises,
          },
        },
      });
    }

    created++;
    if (created % 25 === 0) {
      console.log(`  Created ${created}/${TOTAL_USERS} users...`);
    }
  }

  console.log(`\nDone! Created ${created} users with profiles, health metrics, and workouts.`);

  // Summary stats
  const userCount = await db.user.count();
  const metricCount = await db.healthMetric.count();
  const workoutCount = await db.workout.count();
  const exerciseCount = await db.exercise.count();
  console.log(`  Total users: ${userCount}`);
  console.log(`  Total health metrics: ${metricCount}`);
  console.log(`  Total workouts: ${workoutCount}`);
  console.log(`  Total exercises: ${exerciseCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
