import express from "express";
import {
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  changePassword,
  getUsers,
  getUserById,
  searchUsers,
  getProfile,
  getUserDetails,
  assignUserRole,
  getAllUsers,
  deleteUser,
  updateUserVerification,
  updateStatus,
} from "../controllers/user.controller";
import { authenticate, requireSuperadmin, upload } from "../middlewares/index";
const userRouter = express.Router();
// global authentication middleware
userRouter.use(authenticate)

userRouter.get("/profile", getProfile);
userRouter.put("/profile", updateProfile);
userRouter.put("/status", updateStatus);

userRouter.post(
  "/avatar",
  (req, _res, next) => {
    req.params.folder = "profiles";
    next();
  },
  upload.single("avatar"),
  uploadAvatar,
);
userRouter.delete("/avatar", deleteAvatar);

userRouter.put("/change-password", changePassword);

userRouter.get("/", requireSuperadmin, getUsers);
userRouter.get("/search", searchUsers);

userRouter.get("/admin/users", requireSuperadmin, getAllUsers);
userRouter.put("/admin/:userId/role", requireSuperadmin, assignUserRole);
userRouter.put("/admin/:userId/verification", requireSuperadmin, updateUserVerification);
userRouter.delete("/admin/:userId", requireSuperadmin, deleteUser);

userRouter.get("/:userId/details", requireSuperadmin, getUserDetails);
userRouter.get("/:userId", requireSuperadmin, getUserById);

export default userRouter;
