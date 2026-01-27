import { Request, Response } from 'express';
import { catchAsync } from '../middlewares';
import { Challenge, User } from '../models';
import { AwardService } from '../services/awardService';

export const getChallenges = catchAsync(async (req: any, res: Response) => {
  const { difficulty, category, search, page = 1, limit = 20 } = req.query;
  const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

  const filter: any = {};

  if (difficulty) {
    filter.difficulty = difficulty;
  }

  if (category) {
    filter.category = category;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { tags: { $in: [new RegExp(search, 'i')] } }
    ];
  }

  const challenges = await Challenge.find(filter)
    .select('-solution -answer') // Don't send solution and answer in list
    .populate('createdBy', 'username avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(parseInt(limit as string));

  const total = await Challenge.countDocuments(filter);

  res.status(200).json({
    success: true,
    challenges,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string))
    }
  });
});

export const getChallengeById = catchAsync(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user._id;

  const challenge = await Challenge.findById(id)
    .populate('createdBy', 'username avatar')
    .populate('completedBy', 'username avatar');

  if (!challenge) {
    return res.status(404).json({ message: 'Challenge not found' });
  }

  const isCompleted = challenge.completedBy?.some(
    (userIdObj: any) => {
      const userIdStr = typeof userIdObj === 'object' && userIdObj._id 
        ? userIdObj._id.toString() 
        : userIdObj.toString();
      return userIdStr === userId.toString();
    }
  );

  const userSolutionData = challenge.userSolutions?.find(
    (sol: any) => {
      const solUserId = typeof sol.userId === 'object' && sol.userId._id 
        ? sol.userId._id.toString() 
        : sol.userId.toString();
      return solUserId === userId.toString();
    }
  );

  const challengeData: any = challenge.toObject();
  const isCreator = challenge.createdBy._id.toString() === userId.toString();
  
  if (!isCompleted && !isCreator) {
    delete challengeData.solution;
    delete challengeData.answer; // Remove answer for security - users shouldn't see the expected answer
  }

  res.status(200).json({
    success: true,
    challenge: challengeData,
    isCompleted,
    userSolution: userSolutionData ? {
      solution: userSolutionData.solution,
      isCorrect: userSolutionData.isCorrect,
      pointsEarned: userSolutionData.pointsEarned,
      submittedAt: userSolutionData.submittedAt
    } : null
  });
});

export const createChallenge = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id;
  const {
    title,
    description,
    difficulty,
    category,
    instructions,
    starterCode,
    solution,
    answer,
    testCases,
    points,
    tags
  } = req.body;

  if (!title || !description || !difficulty || !category || !instructions || !answer) {
    return res.status(400).json({
      message: 'Title, description, difficulty, category, instructions, and answer are required'
    });
  }

  const challenge = await Challenge.create({
    title,
    description,
    difficulty,
    category,
    instructions,
    starterCode,
    solution,
    answer,
    testCases: testCases || [],
    points: points || 10,
    tags: tags || [],
    createdBy: userId
  });

  const populatedChallenge = await Challenge.findById(challenge._id)
    .populate('createdBy', 'username avatar');

  const challengeData: any = populatedChallenge?.toObject();
  
  res.status(201).json({
    success: true,
    message: 'Challenge created successfully',
    challenge: challengeData // Creator can see answer since they created it
  });
});

export const updateChallenge = catchAsync(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user._id;

  const challenge = await Challenge.findById(id);

  if (!challenge) {
    return res.status(404).json({ message: 'Challenge not found' });
  }

  if (challenge.createdBy.toString() !== userId.toString()) {
    return res.status(403).json({ message: 'Only the creator can update this challenge' });
  }

  const {
    title,
    description,
    difficulty,
    category,
    instructions,
    starterCode,
    solution,
    answer,
    testCases,
    points,
    tags
  } = req.body;

  const updateData: any = {};
  if (title) updateData.title = title;
  if (description) updateData.description = description;
  if (difficulty) updateData.difficulty = difficulty;
  if (category) updateData.category = category;
  if (instructions) updateData.instructions = instructions;
  if (starterCode !== undefined) updateData.starterCode = starterCode;
  if (solution !== undefined) updateData.solution = solution;
  if (answer !== undefined) updateData.answer = answer;
  if (testCases) updateData.testCases = testCases;
  if (points) updateData.points = points;
  if (tags) updateData.tags = tags;

  const updatedChallenge = await Challenge.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  ).populate('createdBy', 'username avatar');

  res.status(200).json({
    success: true,
    message: 'Challenge updated successfully',
    challenge: updatedChallenge
  });
});

export const deleteChallenge = catchAsync(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user._id;

  const challenge = await Challenge.findById(id);

  if (!challenge) {
    return res.status(404).json({ message: 'Challenge not found' });
  }

  if (challenge.createdBy.toString() !== userId.toString()) {
    return res.status(403).json({ message: 'Only the creator can delete this challenge' });
  }

  await Challenge.findByIdAndDelete(id);

  res.status(200).json({
    success: true,
    message: 'Challenge deleted successfully'
  });
});


export const submitSolution = catchAsync(async (req: any, res: Response) => {
  const { id } = req.params;
  const userId = req.user._id;
  const { solution: userSolution, answer: userAnswer } = req.body;

  if (!userSolution || !userSolution.trim()) {
    return res.status(400).json({ message: 'Solution code is required' });
  }

  const challenge = await Challenge.findById(id);

  if (!challenge) {
    return res.status(404).json({ message: 'Challenge not found' });
  }

  const isCreator = challenge.createdBy.toString() === userId.toString();
  if (isCreator) {
    return res.status(403).json({ message: 'You cannot solve challenges that you created yourself' });
  }

  const isAlreadyCompleted = challenge.completedBy?.some(
    (userIdObj: any) => {
      const userIdStr = typeof userIdObj === 'object' && userIdObj._id 
        ? userIdObj._id.toString() 
        : userIdObj.toString();
      return userIdStr === userId.toString();
    }
  );

  if (isAlreadyCompleted) {
    return res.status(400).json({ message: 'Challenge already completed' });
  }

  let isCorrect = false;
  let hasError = false;

  if (!userAnswer || !userAnswer.trim()) {

    isCorrect = false;
    hasError = true;
  } else {

    const expectedAnswer = challenge.answer || challenge.solution || '';
    
    if (expectedAnswer) {

      const normalizedUserAnswer = userAnswer.trim().toLowerCase();
      const normalizedExpectedAnswer = expectedAnswer.trim().toLowerCase();
      isCorrect = normalizedUserAnswer === normalizedExpectedAnswer;
    } else {

      isCorrect = false;
    }
  }

  const pointsEarned = isCorrect ? challenge.points : 0;

  challenge.userSolutions = challenge.userSolutions || [];
  challenge.userSolutions.push({
    userId: userId as any,
    solution: userSolution,
    answer: userAnswer || '',
    isCorrect,
    pointsEarned,
    submittedAt: new Date()
  });

  challenge.completedBy = challenge.completedBy || [];
  challenge.completedBy.push(userId as any);
  await challenge.save();

  let totalPoints = 0;
  const allChallenges = await Challenge.find({ 'userSolutions.userId': userId });
  allChallenges.forEach((ch) => {
    const userSolution = ch.userSolutions?.find(
      (sol: any) => {
        const solUserId = typeof sol.userId === 'object' && sol.userId._id 
          ? sol.userId._id.toString() 
          : sol.userId.toString();
        return solUserId === userId.toString();
      }
    );
    if (userSolution && userSolution.isCorrect) {
      totalPoints += userSolution.pointsEarned || 0;
    }
  });

  const newlyEarnedAwards = await AwardService.checkAndAwardBadges(userId.toString(), totalPoints);

  res.status(200).json({
    success: true,
    message: isCorrect 
      ? 'Solution submitted successfully! Challenge marked as completed.' 
      : hasError
        ? 'Solution submitted, but no answer provided. Challenge marked as completed with 0 points.'
        : 'Solution submitted, but answer does not match. Challenge marked as completed with 0 points.',
    pointsEarned,
    isCorrect,
    totalPoints,
    hasError,
    newlyEarnedAwards: newlyEarnedAwards.length > 0 ? newlyEarnedAwards : undefined
  });
});

export const getMyChallenges = catchAsync(async (req: any, res: Response) => {
  const userId = req.user._id;

  const challenges = await Challenge.find({ completedBy: userId })
    .select('-solution -answer') // Don't send solution and answer for security
    .populate('createdBy', 'username avatar')
    .sort({ createdAt: -1 });

  let totalPoints = 0;
  challenges.forEach((challenge) => {
    const userSolution = challenge.userSolutions?.find(
      (sol: any) => {
        const solUserId = typeof sol.userId === 'object' && sol.userId._id 
          ? sol.userId._id.toString() 
          : sol.userId.toString();
        return solUserId === userId.toString();
      }
    );
    if (userSolution && userSolution.isCorrect) {
      totalPoints += userSolution.pointsEarned || 0;
    }
  });

  const user = await User.findById(userId).select('awards totalChallengePoints');
  const awards = user?.awards || [];

  res.status(200).json({
    success: true,
    challenges,
    totalPoints,
    awards
  });
});

export const getCategories = catchAsync(async (req: any, res: Response) => {
  const categories = await Challenge.distinct('category');
  res.status(200).json({
    success: true,
    categories: categories.sort()
  });
});

