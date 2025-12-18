import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

const generateAccessandRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) throw new Error("User not found for token generation");

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    // console.log("🔵 Access Token:", accessToken); 
    // console.log("🔵 Access Token:", refreshToken); 

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Error in generateAccessandRefreshTokens:", error); 
    throw new ApiError(
      500,
      "something went wrong while generating Access and Refresh Tokens "
    );
  }
};


const registerUser = asyncHandler(async (req, res) => {
  // get user details from frontend
  // validation - not empty
  // check if user already exists: username, email
  // create user object - create entry in db
  // remove password and refresh token field from response
  // check for user creation
  // return res

  const { username, email, password, gender, age, height, weight, activity } = req.body;
  //console.log("email: ", email);
  // console.log(req.body)
  console.log({email, username, password, gender, age, height, weight, activity})

  if ([username, email, password].some((field) => field?.trim() === "")) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ username }, { email }],
  });

  if (existedUser) {
    throw new ApiError(409, "User with email or username already exists");
  }
  //console.log(req.files);

  // Build user object with optional onboarding fields
  const userData = {
    username,
    email,
    password,
  };

  // Add optional onboarding fields if provided
  if (gender) userData.gender = gender;
  if (age !== undefined && age !== null) userData.age = Number(age);
  if (height !== undefined && height !== null) userData.height = Number(height);
  if (weight !== undefined && weight !== null) userData.weight = Number(weight);
  if (activity) userData.activity = activity;

  const user = await User.create(userData);

  // Generate tokens for the newly registered user
  const { accessToken, refreshToken } = await generateAccessandRefreshTokens(user._id);

  // console.log("user", user);

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  console.log('createdUser', createdUser);

  const options = {
    httpOnly: true,
    secure: true,
  };

  return res
    .status(201)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(new ApiResponse(200, {
      user: createdUser,
      accessToken,
      refreshToken,
    }, "User registered Successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  //get user details
  //usernaem or email & password
  //find the user
  //check password
  //generate refresh & access token
  //send cookie

  const { email, username, password } = req.body;

  console.log("Login attempt:", { email, username, passwordLength: password?.length });

  if (!username && !email) {
    throw new ApiError(401, "username or email is required");
  }

  if (!password) {
    throw new ApiError(401, "password is required");
  }

  // Find user by email or username (case-insensitive email search)
  const searchConditions = [];
  
  if (email) {
    searchConditions.push({ email: { $regex: new RegExp(`^${email.trim()}$`, 'i') } });
  }
  if (username) {
    searchConditions.push({ username: username.trim() });
  }
  
  const user = await User.findOne({
    $or: searchConditions
  }).select("+password");

  console.log("User found:", user ? { id: user._id, email: user.email, username: user.username } : "No user found");

  if (!user) {
    throw new ApiError(404, "user does not exist ");
  }

  console.log("Comparing password...");
  const isPasswordvalid = await bcrypt.compare(password, user.password);
  console.log("Password valid:", isPasswordvalid);

  if (!isPasswordvalid) {
    throw new ApiError(401, "password is incorrect");
  }

  const { accessToken, refreshToken } = await generateAccessandRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  console.log("loggedInUser", loggedInUser);

  return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "user logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $unset: {
        refreshToken: 1, // this removes the field from document
      },
    },
    {
      new: true,
    }
  );

  const options = {
    httpOnly: true,
    secure: true,
  };

  console.log("logging out user:", req.user._id);

  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged Out"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies.refreshToken || req.body.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id);

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const options = {
      httpOnly: true,
      secure: true,
    };

    const { accessToken, newRefreshToken } =
      await generateAccessandRefreshTokens(user._id);

    return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", newRefreshToken, options)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

const changeCurrentPassword = asyncHandler(async (req, res) => {
  const { email, newPassword } = req.body;

  const user = await User.findOne({ email }).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  
  user.password = newPassword;
  await user.save({ validateBeforeSave: false });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});


const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, { user: req.user }, "User fetched successfully"));
});

const updateAccountDetails = asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    throw new ApiError(400, "All fields are required");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: {
        email: email,
      },
    },
    { new: true }
  ).select("-password");

  return res
    .status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"));
});

const updateUserProfile = asyncHandler(async (req, res) => {
  const { gender, age, height, weight, activity } = req.body;

  // Build update object with only provided fields
  const updateData = {};
  if (gender !== undefined) updateData.gender = gender;
  if (age !== undefined && age !== null) updateData.age = Number(age);
  if (height !== undefined && height !== null) updateData.height = Number(height);
  if (weight !== undefined && weight !== null) updateData.weight = Number(weight);
  if (activity !== undefined) updateData.activity = activity;

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "At least one field must be provided for update");
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    {
      $set: updateData,
    },
    { new: true }
  ).select("-password -refreshToken");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile updated successfully"));
});


export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserProfile,
};