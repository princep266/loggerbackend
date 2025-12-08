import mongoose from "mongoose";
import { User } from "./user.model";

const exerciseSchema = new mongoose.model({
    userId:{
        type : mongoose.Schema.Types.ObjectId,
        ref:'User',
        required: true
    },
    bodyPart:{
        type: String,
        required: true,
        enum : ['chest','back','legs','arms','shoulders','core','full body','glutes']
    },
    excerciseName:{
        type: String,
        required: true,
        enum:['barbell bench press','incline DB press' ,'push ups', 'decline bench press','incline bench press','chest dips','cable fly','peck deck','wide push ups','dumbell flys','incline pusj ups','decline push ups','close grip push ups','daimond push ups','archer push ups']
    },
    sets:{
        type: Number,
        required: true
    },
    reps:{
        type: Number,
        required: true
    },
    weight:{
        type: Number,
        required: false
    },
    date:{
        type: Date,
        required: true
    }
},{timestamps:true});