import mongoose, { model } from "mongoose";

const workoutSessionSchema = new mongoose.Schema({
    userId:{
        type : model.Schema.Types.ObjectId,
        ref:'User',
        required: true
    },
    date:{
        type: Date,
        required: true

    },
    totalVolume:{
        type: Number,
        required: true
    },
    totalSets:{
        type: Number,
        required: true
    },
    totalReps:{
        type: Number,
        required: true
    },
    volumeByMuscleGroup:{
        type: Map,
        of: Number,
        required: true
    }
},{timestamps:true});

export const WorkoutSession = mongoose.model("WorkoutSession", workoutSessionSchema);