import mongoose from "mongoose";

const WorkoutExcerciseSchema = new mongoose.Schema(
  {
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "WorkoutSession",
      required: true,
    },
    excerciseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Exercise",
      required: true,
    },
    sets: {
      type: Number,
      required: true,
    },
    reps: {
      type: Number,
      required: true,
    },
    weight: {
      type: Number,
      required: false,
    },
    date: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

export const WorkoutExcercise = mongoose.model(
  "WorkoutExcercise",
  WorkoutExcerciseSchema
);
