import mongoose from "mongoose";

const WorkoutExcerciseSchema = new mongoose.Schema({
    sessionId:{
        type : mongoose.Schema.Types.ObjectId,
        ref:'WorkoutSession',
        required: true
    },
    excerciseId:{
        type : mongoose.Schema.Types.ObjectId,
        ref:'Exercise',
        required: true
    }
},{timestamps:true});

export const WorkoutExcercise = mongoose.model("WorkoutExcercise", WorkoutExcerciseSchema);