import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT = asyncHandler(async (req,_, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    console.log('verifyJWT: Incoming token:', token);
    if (!token) {
      console.error('verifyJWT: No token found');
      throw new ApiError(401, "Unauthorized request");
    }

    let decodedToken;
    try {
      decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
      console.log('verifyJWT: Decoded token:', decodedToken);
    } catch (err) {
      console.error('verifyJWT: JWT verification error:', err);
      throw new ApiError(401, "Invalid access token");
    }

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      console.error('verifyJWT: No user found for decoded token:', decodedToken);
      throw new ApiError(401, "Invalid Access Token");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('verifyJWT: Error:', error);
    throw new ApiError(401, "Invalid access token" || error?.message);
  }
});