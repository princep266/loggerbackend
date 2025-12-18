import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { Exercise } from "../models/exercise.model.js";
import { WorkoutSession } from "../models/workoutSession.model.js";
import { WorkoutExcercise } from "../models/workoutExercise.model.js";

const allowedBodyParts = [
  "chest",
  "back",
  "legs",
  "arms",
  "shoulders",
  "core",
  "full body",
  "glutes",
];

const allowedExerciseNames = [
  "barbell bench press",
  "incline DB press",
  "push ups",
  "decline bench press",
  "incline bench press",
  "chest dips",
  "cable fly",
  "peck deck",
  "wide push ups",
  "dumbell flys",
  "incline pusj ups",
  "decline push ups",
  "close grip push ups",
  "daimond push ups",
  "archer push ups",
];

const startAndEndOfDay = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const ensureExerciseForUser = async ({ userId, bodyPart, excerciseName, isCustom }) => {
  const normalizedName = excerciseName.toLowerCase();
  let exercise = await Exercise.findOne({ userId, excerciseName: normalizedName });
  if (!exercise) {
    exercise = await Exercise.create({
      userId,
      bodyPart,
      excerciseName: normalizedName,
      isCustom: Boolean(isCustom),
    });
  }
  return exercise;
};

const logWorkoutActivity = asyncHandler(async (req, res) => {
  const { bodyPart, exerciseName, sets, reps, weight = 0, date, isCustom } = req.body;

  if (!bodyPart || !exerciseName || sets === undefined || reps === undefined) {
    throw new ApiError(400, "bodyPart, exerciseName, sets, and reps are required");
  }

  if (!allowedBodyParts.includes(bodyPart)) {
    throw new ApiError(400, "Invalid bodyPart provided");
  }

  const trimmedExerciseName = typeof exerciseName === "string" ? exerciseName.trim() : "";
  const normalizedExerciseName = trimmedExerciseName.toLowerCase();

  if (!trimmedExerciseName) {
    throw new ApiError(400, "exerciseName must be a non-empty string");
  }

  const canonicalExerciseName =
    allowedExerciseNames.find((name) => name.toLowerCase() === normalizedExerciseName) || trimmedExerciseName;

  if (!isCustom && !allowedExerciseNames.find((name) => name.toLowerCase() === normalizedExerciseName)) {
    throw new ApiError(400, "Unknown exerciseName; mark as custom or use a supported one");
  }

  const numericSets = Number(sets);
  const numericReps = Number(reps);
  const numericWeight = Number(weight) || 0;

  if (Number.isNaN(numericSets) || Number.isNaN(numericReps) || numericSets <= 0 || numericReps <= 0) {
    throw new ApiError(400, "sets and reps must be positive numbers");
  }

  const activityDate = date ? new Date(date) : new Date();
  if (Number.isNaN(activityDate.getTime())) {
    throw new ApiError(400, "Invalid date provided");
  }

  const { start, end } = startAndEndOfDay(activityDate);

  let session = await WorkoutSession.findOne({
    userId: req.user._id,
    date: { $gte: start, $lte: end },
  });

  if (!session) {
    session = await WorkoutSession.create({
      userId: req.user._id,
      date: activityDate,
      totalVolume: 0,
      totalSets: 0,
      totalReps: 0,
      volumeByMuscleGroup: new Map(),
    });
  }

  const exercise = await ensureExerciseForUser({
    userId: req.user._id,
    bodyPart,
    excerciseName: canonicalExerciseName,
    isCustom,
  });

  const totalReps = numericSets * numericReps;
  const volume = numericWeight * totalReps;

  const workoutExercise = await WorkoutExcercise.create({
    sessionId: session._id,
    excerciseId: exercise._id,
    sets: numericSets,
    reps: numericReps,
    weight: numericWeight,
    date: activityDate,
  });

  session.totalVolume += volume;
  session.totalSets += numericSets;
  session.totalReps += totalReps;

  const currentVolumeForBodyPart = session.volumeByMuscleGroup.get(bodyPart) || 0;
  session.volumeByMuscleGroup.set(bodyPart, currentVolumeForBodyPart + volume);

  await session.save();

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        {
          session,
          workoutExercise,
        },
        "Workout activity logged successfully"
      )
    );
});

const getWorkoutActivity = asyncHandler(async (req, res) => {
  const sessions = await WorkoutSession.find({ userId: req.user._id })
    .sort({ date: -1 })
    .lean();

  const sessionIds = sessions.map((s) => s._id);

  const exercises = await WorkoutExcercise.find({ sessionId: { $in: sessionIds } })
    .populate("excerciseId")
    .lean();

  const exercisesBySession = exercises.reduce((acc, entry) => {
    const key = entry.sessionId.toString();
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {});

  const activity = sessions.map((session) => ({
    ...session,
    exercises: exercisesBySession[session._id.toString()] || [],
  }));

  return res
    .status(200)
    .json(new ApiResponse(200, activity, "Workout activity fetched successfully"));
});

// Delete a single logged workout entry and update the parent session aggregates.
const deleteWorkoutEntry = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    throw new ApiError(400, "Workout entry id is required");
  }

  // Load the workout exercise with its session and exercise so we can validate ownership
  // and update aggregates and volume by muscle group.
  const workoutExercise = await WorkoutExcercise.findById(id)
    .populate("sessionId")
    .populate("excerciseId");

  if (!workoutExercise) {
    throw new ApiError(404, "Workout entry not found");
  }

  const session = workoutExercise.sessionId;

  // Ensure the entry belongs to the current user
  if (!session || String(session.userId) !== String(req.user._id)) {
    throw new ApiError(403, "You are not allowed to delete this workout entry");
  }

  const numericSets = Number(workoutExercise.sets) || 0;
  const numericReps = Number(workoutExercise.reps) || 0;
  const numericWeight = Number(workoutExercise.weight) || 0;
  const totalReps = numericSets * numericReps;
  const volume = numericWeight * totalReps;

  // Adjust session aggregates safely (never go below zero)
  session.totalVolume = Math.max(0, (session.totalVolume || 0) - volume);
  session.totalSets = Math.max(0, (session.totalSets || 0) - numericSets);
  session.totalReps = Math.max(0, (session.totalReps || 0) - totalReps);

  // Adjust per‑muscle volume if possible
  if (workoutExercise.excerciseId && workoutExercise.excerciseId.bodyPart) {
    const bodyPart = workoutExercise.excerciseId.bodyPart;
    const currentVolumeForBodyPart = session.volumeByMuscleGroup.get(bodyPart) || 0;
    const newVolumeForBodyPart = Math.max(0, currentVolumeForBodyPart - volume);
    session.volumeByMuscleGroup.set(bodyPart, newVolumeForBodyPart);
  }

  await session.save();
  await workoutExercise.deleteOne();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Workout entry deleted successfully"));
});

export { logWorkoutActivity, getWorkoutActivity, deleteWorkoutEntry };
