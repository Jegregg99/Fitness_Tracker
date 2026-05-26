import React, { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { db } from "./firebase";
import {
  doc,
  setDoc,
  getDoc
} from "firebase/firestore";
import {
  Dumbbell,
  Plus,
  Trash2,
  Save,
  TrendingUp,
  CalendarDays,
  Download,
  RotateCcw
} from "lucide-react";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid
} from "recharts";

const STORAGE_KEY = "iphone_fitness_tracker_v1";

const defaultExercises = [
  "Bench Press",
  "Squat",
  "Deadlift",
  "Shoulder Press",
  "Lat Pulldown",
  "Row",
  "Biceps Curl",
  "Triceps Pushdown",
  "Leg Press",
  "Treadmill"
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function emptySet() {
  return {
    reps: "",
    weight: "",
    notes: ""
  };
}

function emptyWorkout() {
  return {
    id: crypto.randomUUID(),
    date: todayISO(),
    title: "Workout",
    bodyWeight: "",
    exercises: [
      {
        id: crypto.randomUUID(),
        name: "Bench Press",
        sets: [emptySet()]
      }
    ],
    notes: ""
  };
}

export default function FitnessTrackerApp() {
  const [workouts, setWorkouts] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const fileInputRef = useRef(null);
    const CLOUD_DOC_ID = "main-workouts";

useEffect(() => {
  async function loadCloudData() {

    try {
      const docRef = doc(db, "fitnessData", CLOUD_DOC_ID);

      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data();

        setWorkouts(data.workouts || []);
        setActiveId(data.activeId || null);

        return;
      }

    } catch (error) {
      console.error("Cloud load failed:", error);
    }

    const saved = localStorage.getItem(STORAGE_KEY);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);

        setWorkouts(parsed.workouts || []);
        setActiveId(parsed.activeId || parsed.workouts?.[0]?.id || null);

        return;

      } catch (error) {
        console.error(error);
      }
    }

    const first = emptyWorkout();

    setWorkouts([first]);
    setActiveId(first.id);
  }

  loadCloudData();

}, []);

useEffect(() => {

  async function saveData() {

    if (!workouts.length) return;

    const data = {
      workouts,
      activeId
    };

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(data)
    );

    try {

      await setDoc(
        doc(db, "fitnessData", CLOUD_DOC_ID),
        data
      );

      console.log("Cloud save successful");

    } catch (error) {

      console.error("Cloud save failed:", error);

    }
  }

  saveData();

}, [workouts, activeId]);

  const activeWorkout =
    workouts.find((w) => w.id === activeId) || workouts[0];

  const sortedWorkouts = useMemo(() => {
    return [...workouts].sort((a, b) =>
      b.date.localeCompare(a.date)
    );
  }, [workouts]);

  const bodyWeightData = useMemo(() => {
    return [...workouts]
      .filter((w) => w.bodyWeight !== "")
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((w) => ({
        date: w.date.slice(5),
        weight: Number(w.bodyWeight)
      }));
  }, [workouts]);

  const totalSets = useMemo(() => {
    if (!activeWorkout) return 0;

    return activeWorkout.exercises.reduce(
      (sum, ex) => sum + ex.sets.length,
      0
    );
  }, [activeWorkout]);

  function updateWorkout(patch) {
    setWorkouts((current) =>
      current.map((w) =>
        w.id === activeWorkout.id
          ? { ...w, ...patch }
          : w
      )
    );
  }

  function updateExercise(exerciseId, patch) {
    updateWorkout({
      exercises: activeWorkout.exercises.map((ex) =>
        ex.id === exerciseId
          ? { ...ex, ...patch }
          : ex
      )
    });
  }

  function updateSet(exerciseId, setIndex, patch) {
    const exercises = activeWorkout.exercises.map((ex) => {
      if (ex.id !== exerciseId) return ex;

      const sets = ex.sets.map((set, index) =>
        index === setIndex
          ? { ...set, ...patch }
          : set
      );

      return {
        ...ex,
        sets
      };
    });

    updateWorkout({ exercises });
  }

  function addWorkout() {
    const next = emptyWorkout();

    setWorkouts((current) => [next, ...current]);
    setActiveId(next.id);
  }

  function deleteWorkout(id) {
    const remaining = workouts.filter((w) => w.id !== id);

    if (!remaining.length) {
      const next = emptyWorkout();
      setWorkouts([next]);
      setActiveId(next.id);
      return;
    }

    setWorkouts(remaining);

    if (activeId === id) {
      setActiveId(remaining[0].id);
    }
  }

  function addExercise() {
    updateWorkout({
      exercises: [
        ...activeWorkout.exercises,
        {
          id: crypto.randomUUID(),
          name: "",
          sets: [emptySet()]
        }
      ]
    });
  }

  function removeExercise(exerciseId) {
    updateWorkout({
      exercises: activeWorkout.exercises.filter(
        (ex) => ex.id !== exerciseId
      )
    });
  }

  function addSet(exerciseId) {
    const exercise = activeWorkout.exercises.find(
      (ex) => ex.id === exerciseId
    );

    updateExercise(exerciseId, {
      sets: [...exercise.sets, emptySet()]
    });
  }

  function removeSet(exerciseId, setIndex) {
    const exercise = activeWorkout.exercises.find(
      (ex) => ex.id === exerciseId
    );

    const nextSets = exercise.sets.filter(
      (_, index) => index !== setIndex
    );

    updateExercise(exerciseId, {
      sets: nextSets.length ? nextSets : [emptySet()]
    });
  }

function exportData() {
  const blob = new Blob(
    [JSON.stringify(workouts, null, 2)],
    {
      type: "application/json"
    }
  );

  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = "fitness-tracker-data.json";
  a.click();

  URL.revokeObjectURL(url);
}

function importData(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = (e) => {
    try {
      const importedWorkouts = JSON.parse(e.target.result);

      if (!Array.isArray(importedWorkouts)) {
        alert("Invalid backup file.");
        return;
      }

      setWorkouts(importedWorkouts);
      setActiveId(importedWorkouts[0]?.id || null);

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          workouts: importedWorkouts,
          activeId: importedWorkouts[0]?.id || null
        })
      );

      alert("Backup imported successfully.");
    } catch (error) {
      alert("Could not import this file.");
      console.error(error);
    }
  };

  reader.readAsText(file);
  event.target.value = "";
}

  function resetDemo() {
    const first = emptyWorkout();

    setWorkouts([first]);
    setActiveId(first.id);

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        workouts: [first],
        activeId: first.id
      })
    );
  }

  if (!activeWorkout) return null;

  return (
    <div className="min-h-screen bg-slate-50 p-3 text-slate-900 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-4">

        <motion.header
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white p-5 shadow-sm"
        >

          <div className="flex items-start justify-between gap-3">

            <div>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Dumbbell size={18} />
                iPhone Fitness Tracker
              </div>

              <h1 className="mt-2 text-3xl font-semibold tracking-tight">
                Track today. Improve tomorrow.
              </h1>

              <p className="mt-2 text-sm text-slate-600">
                Log workouts, sets, reps, weight,
                body weight, and notes.
              </p>
            </div>

            <button
              onClick={addWorkout}
              className="rounded-2xl bg-black px-4 py-2 text-white"
            >
              <div className="flex items-center gap-2">
                <Plus size={18} />
                New
              </div>
            </button>

          </div>
        </motion.header>

        <div className="rounded-3xl bg-white p-4 shadow-sm">

          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">
              Workout History
            </h2>

            <CalendarDays
              size={18}
              className="text-slate-500"
            />
          </div>

          <div className="space-y-2">
            {sortedWorkouts.map((workout) => (
              <button
                key={workout.id}
                onClick={() => setActiveId(workout.id)}
                className={`w-full rounded-2xl border p-3 text-left ${
                  workout.id === activeWorkout.id
                    ? "bg-black text-white"
                    : "bg-white"
                }`}
              >
                <div className="font-medium">
                  {workout.title}
                </div>

                <div className="text-xs opacity-70">
                  {workout.date}
                </div>
              </button>
            ))}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">

            <button
              onClick={exportData}
              className="rounded-2xl border p-3"
            >
              <div className="flex items-center justify-center gap-2">
                <Download size={16} />
                Export
              </div>
            </button>

<button
  onClick={() => fileInputRef.current.click()}
  className="rounded-2xl border p-3"
>
  Import
</button>

<input
  ref={fileInputRef}
  type="file"
  accept="application/json"
  onChange={importData}
  className="hidden"
/>

<button
  onClick={resetDemo}
  className="rounded-2xl border p-3"
>
  <div className="flex items-center justify-center gap-2">
    <RotateCcw size={16} />
    Reset
  </div>
</button>

          </div>
        </div>

        <div className="rounded-3xl bg-white p-4 shadow-sm space-y-4">

          <input
            value={activeWorkout.title}
            onChange={(e) =>
              updateWorkout({
                title: e.target.value
              })
            }
            placeholder="Workout Name"
            className="w-full rounded-2xl border p-3"
          />

          <input
            type="date"
            value={activeWorkout.date}
            onChange={(e) =>
              updateWorkout({
                date: e.target.value
              })
            }
            className="w-full rounded-2xl border p-3"
          />

          <input
            value={activeWorkout.bodyWeight}
            onChange={(e) =>
              updateWorkout({
                bodyWeight: e.target.value
              })
            }
            placeholder="Body Weight"
            className="w-full rounded-2xl border p-3"
          />

        </div>

        {activeWorkout.exercises.map((exercise) => (
          <div
            key={exercise.id}
            className="rounded-3xl bg-white p-4 shadow-sm space-y-3"
          >

            <input
              value={exercise.name}
              onChange={(e) =>
                updateExercise(exercise.id, {
                  name: e.target.value
                })
              }
              placeholder="Exercise Name"
              className="w-full rounded-2xl border p-3"
            />

            {exercise.sets.map((set, index) => (
              <div
                key={index}
                className="grid grid-cols-3 gap-2"
              >

                <input
                  value={set.reps}
                  onChange={(e) =>
                    updateSet(
                      exercise.id,
                      index,
                      {
                        reps: e.target.value
                      }
                    )
                  }
                  placeholder="Reps"
                  className="rounded-2xl border p-3"
                />

                <input
                  value={set.weight}
                  onChange={(e) =>
                    updateSet(
                      exercise.id,
                      index,
                      {
                        weight: e.target.value
                      }
                    )
                  }
                  placeholder="Weight"
                  className="rounded-2xl border p-3"
                />

                <button
                  onClick={() =>
                    removeSet(
                      exercise.id,
                      index
                    )
                  }
                  className="rounded-2xl border"
                >
                  <Trash2 size={18} />
                </button>

              </div>
            ))}

            <div className="grid grid-cols-2 gap-2">

              <button
                onClick={() =>
                  addSet(exercise.id)
                }
                className="rounded-2xl bg-black p-3 text-white"
              >
                Add Set
              </button>

              <button
                onClick={() =>
                  removeExercise(exercise.id)
                }
                className="rounded-2xl border p-3"
              >
                Remove
              </button>

            </div>

          </div>
        ))}

        <button
          onClick={addExercise}
          className="w-full rounded-3xl bg-black p-4 text-white"
        >
          <div className="flex items-center justify-center gap-2">
            <Plus size={18} />
            Add Exercise
          </div>
        </button>

        <div className="rounded-3xl bg-white p-4 shadow-sm">

          <div className="mb-3 flex items-center gap-2">
            <TrendingUp size={18} />
            <h2 className="font-semibold">
              Body Weight Trend
            </h2>
          </div>

          <div className="h-56">

            {bodyWeightData.length >= 2 ? (
              <ResponsiveContainer
                width="100%"
                height="100%"
              >

                <LineChart data={bodyWeightData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />

                  <Line
                    type="monotone"
                    dataKey="weight"
                    strokeWidth={3}
                  />
                </LineChart>

              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Add body weight entries to see a chart.
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}