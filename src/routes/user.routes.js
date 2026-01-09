import { Router } from "express";
import {
  loginUser,
  logoutUser,
  registerUser,
  refreshAccessToken,
  changeCurrentPassword,
  getCurrentUser,
  updateAccountDetails,
  updateUserProfile,
  googleSignIn,
} from "../controlelr/user.controller.js";
import { getWorkoutActivity, logWorkoutActivity, deleteWorkoutEntry } from "../controlelr/workout.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/google-signin").post(googleSignIn);
router.route("/change-password").post( changeCurrentPassword);
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
router.route("/update-profile").patch(verifyJWT, updateUserProfile);
router.route("/workout-log").post(verifyJWT, logWorkoutActivity);
router.route("/workout-log/:id").delete(verifyJWT, deleteWorkoutEntry);
router.route("/workout-activity").get(verifyJWT, getWorkoutActivity);

export default router;