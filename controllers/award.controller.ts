import { Response } from 'express';
import { catchAsync } from '../middlewares';
import { AwardService } from '../services/awardService';
import { User } from '../models';

// Get user's awards
export const getUserAwards = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select('awards totalChallengePoints');
  const userAwardIds = user?.awards?.map(a => a.awardId) || [];
  const availableAwards = AwardService.getAvailableAwards(userAwardIds);

  res.status(200).json({
    success: true,
    awards: user?.awards || [],
    availableAwards,
    totalPoints: user?.totalChallengePoints || 0
  });
});

// Get all available awards
export const getAllAwards = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id;

  const user = await User.findById(userId).select('awards');
  const userAwardIds = user?.awards?.map(a => a.awardId) || [];
  const availableAwards = AwardService.getAvailableAwards(userAwardIds);

  res.status(200).json({
    success: true,
    awards: availableAwards
  });
});

