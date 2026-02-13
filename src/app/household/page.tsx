"use client";

import { api } from "~/utils/api";
import { useState, useEffect } from "react";
import Navigation from "~/components/Navigation";
import { Users, Plus, Pencil, Trash2, Flame } from "lucide-react";

export default function HouseholdPage() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const { data: members, isLoading } = api.household.getAll.useQuery();
  const { data: totalCal } = api.household.getTotalDailyCalories.useQuery();
  const { data: activityData } = api.household.getActivityLevel.useQuery();
  const utils = api.useUtils();

  const setActivityLevel = api.household.setActivityLevel.useMutation({
    onSuccess: () => {
      void utils.household.getActivityLevel.invalidate();
      void utils.household.getTotalDailyCalories.invalidate();
      void utils.household.getAll.invalidate();
      void utils.dashboard.getStats.invalidate();
    },
  });

  const deleteMember = api.household.delete.useMutation({
    onSuccess: () => {
      void utils.household.getAll.invalidate();
      void utils.household.getTotalDailyCalories.invalidate();
      void utils.dashboard.getStats.invalidate();
    },
  });

  const totalDaily = totalCal?.totalDailyCalories ?? 0;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navigation />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 mb-2">
          <Users className="h-8 w-8 text-indigo-500" />
          Household Profile
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Add family members with age, weight, and height. The app uses the Mifflin-St Jeor
          equation to estimate each person&apos;s daily calorie needs. &ldquo;Days of Food&rdquo; on
          the dashboard is then calculated as total food calories in your inventory divided by your
          household&apos;s combined daily needs. Your household&apos;s total body weight and the
          activity level below determine daily water need (oz per lb of body weight → daily gallons).
          &ldquo;Water in days&rdquo; on the dashboard = your total water inventory (gallons) ÷ that
          daily need; when available it shows &ldquo;Based on your household.&rdquo;
        </p>

        {totalDaily > 0 && (
          <div className="mb-6 p-4 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
            <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-200">
              <Flame className="h-5 w-5" />
              <span className="font-medium">Total daily calorie needs (household): {totalDaily.toLocaleString()} kcal/day</span>
            </div>
            <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-2">
              The same household and activity level are used for water-in-days when you view the dashboard water metric in &ldquo;days&rdquo; mode.
            </p>
          </div>
        )}

        <section className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Activity level</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
            Adjusts calorie and water estimates. The base calculation (Mifflin-St Jeor) is for maintaining at rest; these options add a multiplier for higher activity. This is not 100% accurate but helps be conservative when planning for strenuous activity.
          </p>
          <div className="space-y-3">
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:has-[:checked]:bg-indigo-900/20">
              <input
                type="radio"
                name="activityLevel"
                checked={activityData?.activityLevel === null || activityData?.activityLevel === undefined}
                onChange={() => setActivityLevel.mutate({ activityLevel: null })}
                className="mt-1 border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Base (sedentary)</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">BMR only; 0.5 oz water per lb. Default if no activity level is set.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:has-[:checked]:bg-indigo-900/20">
              <input
                type="radio"
                name="activityLevel"
                checked={activityData?.activityLevel === "moderate"}
                onChange={() => setActivityLevel.mutate({ activityLevel: "moderate" })}
                className="mt-1 border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Moderately active</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">3–5 exercise days per week. Food: BMR × 1.55 · Water: 0.65 oz per lb.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:has-[:checked]:bg-indigo-900/20">
              <input
                type="radio"
                name="activityLevel"
                checked={activityData?.activityLevel === "very_active"}
                onChange={() => setActivityLevel.mutate({ activityLevel: "very_active" })}
                className="mt-1 border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Very active</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Hard exercise 6–7 days per week. Food: BMR × 1.725 · Water: 0.75 oz per lb.</p>
              </div>
            </label>
            <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 has-[:checked]:border-indigo-500 has-[:checked]:bg-indigo-50 dark:has-[:checked]:bg-indigo-900/20">
              <input
                type="radio"
                name="activityLevel"
                checked={activityData?.activityLevel === "extra_active"}
                onChange={() => setActivityLevel.mutate({ activityLevel: "extra_active" })}
                className="mt-1 border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <div>
                <span className="font-medium text-gray-900 dark:text-white">Extra active</span>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Very hard exercise &amp; physical job. Food: BMR × 1.9 · Water: 0.85 oz per lb.</p>
              </div>
            </label>
          </div>
        </section>

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Family members</h2>
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setShowForm(true);
            }}
            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add member
          </button>
        </div>

        <ul className="space-y-3">
          {members?.map((m) => (
            <li
              key={m.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 flex flex-wrap items-center justify-between gap-2"
            >
              <div>
                <span className="font-medium text-gray-900 dark:text-white">
                  {m.name || "Unnamed"}
                </span>
                <span className="text-gray-500 dark:text-gray-400 ml-2">
                  {m.age}y, {m.weightKg} kg, {m.heightCm} cm, {m.sex}
                </span>
                <span className="block text-sm text-indigo-600 dark:text-indigo-400 mt-1">
                  ~{m.dailyCalories} kcal/day
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(m.id);
                    setShowForm(true);
                  }}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  title="Edit"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm("Remove this family member?")) {
                      deleteMember.mutate({ id: m.id });
                    }
                  }}
                  className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400"
                  title="Remove"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>

        {members?.length === 0 && !showForm && (
          <p className="text-gray-500 dark:text-gray-400 py-6">
            No family members yet. Add members to get an accurate &ldquo;Days of Food&rdquo; on the
            dashboard. Enter weight in kg and height in cm (e.g. 70 kg, 170 cm).
          </p>
        )}

        {showForm && (
          <HouseholdMemberForm
            memberId={editingId}
            onClose={() => {
              setShowForm(false);
              setEditingId(null);
            }}
            onSuccess={() => {
              void utils.household.getAll.invalidate();
              void utils.household.getTotalDailyCalories.invalidate();
              void utils.dashboard.getStats.invalidate();
              setShowForm(false);
              setEditingId(null);
            }}
          />
        )}
      </main>
    </div>
  );
}

function HouseholdMemberForm({
  memberId,
  onClose,
  onSuccess,
}: {
  memberId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [sex, setSex] = useState<"male" | "female">("male");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const { data: members } = api.household.getAll.useQuery();
  const editing = members?.find((m) => m.id === memberId);

  useEffect(() => {
    setFieldErrors({});
    if (editing) {
      setName(editing.name ?? "");
      setAge(String(editing.age));
      setWeightKg(String(editing.weightKg));
      setHeightCm(String(editing.heightCm));
      setSex(editing.sex as "male" | "female");
    } else {
      setName("");
      setAge("");
      setWeightKg("");
      setHeightCm("");
      setSex("male");
    }
  }, [editing]);

  const createMember = api.household.create.useMutation({
    onSuccess: () => {
      onSuccess();
    },
  });
  const updateMember = api.household.update.useMutation({
    onSuccess: () => {
      onSuccess();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const err: Record<string, string> = {};
    const ageTrim = age.trim();
    const weightTrim = weightKg.trim();
    const heightTrim = heightCm.trim();
    if (!ageTrim) err.age = "Age is required";
    else {
      const a = parseInt(ageTrim, 10);
      if (Number.isNaN(a) || a < 0 || a > 120) err.age = "Enter a valid age (0–120)";
    }
    if (!weightTrim) err.weightKg = "Weight is required";
    else {
      const w = parseFloat(weightTrim);
      if (Number.isNaN(w) || w <= 0) err.weightKg = "Enter a valid weight";
    }
    if (!heightTrim) err.heightCm = "Height is required";
    else {
      const h = parseFloat(heightTrim);
      if (Number.isNaN(h) || h <= 0) err.heightCm = "Enter a valid height";
    }
    if (Object.keys(err).length > 0) {
      setFieldErrors(err);
      return;
    }
    setFieldErrors({});
    const a = parseInt(ageTrim, 10);
    const w = parseFloat(weightTrim);
    const h = parseFloat(heightTrim);
    if (editing) {
      updateMember.mutate({
        id: editing.id,
        name: name.trim() || null,
        age: a,
        weightKg: w,
        heightCm: h,
        sex,
      });
    } else {
      createMember.mutate({
        name: name.trim() || undefined,
        age: a,
        weightKg: w,
        heightCm: h,
        sex,
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {editing ? "Edit family member" : "Add family member"}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name (optional)
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mom, Child 1"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Age (years) *
              </label>
              <input
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(e) => {
                  setAge(e.target.value);
                  if (fieldErrors.age) setFieldErrors((prev) => { const next = { ...prev }; delete next.age; return next; });
                }}
                className={`w-full px-3 py-2 border ${fieldErrors.age ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              {fieldErrors.age && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.age}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sex *
              </label>
              <select
                value={sex}
                onChange={(e) => setSex(e.target.value as "male" | "female")}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Weight (kg) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={weightKg}
                onChange={(e) => {
                  setWeightKg(e.target.value);
                  if (fieldErrors.weightKg) setFieldErrors((prev) => { const next = { ...prev }; delete next.weightKg; return next; });
                }}
                placeholder="e.g. 70"
                className={`w-full px-3 py-2 border ${fieldErrors.weightKg ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              {fieldErrors.weightKg && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.weightKg}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Height (cm) *
              </label>
              <input
                type="number"
                step="0.1"
                min={1}
                value={heightCm}
                onChange={(e) => {
                  setHeightCm(e.target.value);
                  if (fieldErrors.heightCm) setFieldErrors((prev) => { const next = { ...prev }; delete next.heightCm; return next; });
                }}
                placeholder="e.g. 170"
                className={`w-full px-3 py-2 border ${fieldErrors.heightCm ? "border-red-500 dark:border-red-500" : "border-gray-300 dark:border-gray-600"} rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
              />
              {fieldErrors.heightCm && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{fieldErrors.heightCm}</p>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Use metric: weight in kilograms, height in centimeters. (1 lb ≈ 0.45 kg, 1 in ≈ 2.54 cm)
          </p>
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={createMember.isPending || updateMember.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              {editing ? "Save" : "Add"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
          {(createMember.isError || updateMember.isError) && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {createMember.error?.message ?? updateMember.error?.message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
