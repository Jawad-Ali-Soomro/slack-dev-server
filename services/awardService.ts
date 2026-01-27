import { User } from '../models';

export interface Award {
  id: string;
  name: string;
  icon: string;
  description: string;
  pointsRequired: number;
  color: string;
}

export const AWARDS: Award[] = [
  {
    id: 'first_steps',
    name: 'First Steps',
    icon: '🌟',
    description: 'Earned your first 10 points',
    pointsRequired: 10,
    color: 'text-yellow-500'
  },
  {
    id: 'rising_star',
    name: 'Rising Star',
    icon: '⭐',
    description: 'Reached 50 points',
    pointsRequired: 50,
    color: 'text-yellow-400'
  },
  {
    id: 'code_warrior',
    name: 'Code Warrior',
    icon: '⚔️',
    description: 'Achieved 100 points',
    pointsRequired: 100,
    color: 'text-blue-500'
  },
  {
    id: 'challenge_master',
    name: 'Challenge Master',
    icon: '🏆',
    description: 'Reached 250 points',
    pointsRequired: 250,
    color: 'text-purple-500'
  },
  {
    id: 'elite_coder',
    name: 'Elite Coder',
    icon: '💎',
    description: 'Achieved 500 points',
    pointsRequired: 500,
    color: 'text-indigo-500'
  },
  {
    id: 'legend',
    name: 'Legend',
    icon: '👑',
    description: 'Reached 1000 points',
    pointsRequired: 1000,
    color: 'text-amber-500'
  },
  {
    id: 'grandmaster',
    name: 'Grandmaster',
    icon: '🎖️',
    description: 'Achieved 2500 points',
    pointsRequired: 2500,
    color: 'text-red-500'
  },
  {
    id: 'immortal',
    name: 'Immortal',
    icon: '🔥',
    description: 'Reached 5000 points',
    pointsRequired: 5000,
    color: 'text-orange-500'
  }
];

export class AwardService {
  /**
   * Check and award badges based on total points
   */
  static async checkAndAwardBadges(userId: string, totalPoints: number): Promise<Award[]> {
    const user = await User.findById(userId);
    if (!user) {
      return [];
    }

    const newlyEarnedAwards: Award[] = [];
    const userAwardIds = user.awards?.map(a => a.awardId) || [];

    for (const award of AWARDS) {

      if (totalPoints >= award.pointsRequired && !userAwardIds.includes(award.id)) {

        user.awards = user.awards || [];
        user.awards.push({
          awardId: award.id,
          name: award.name,
          icon: award.icon,
          description: award.description,
          pointsRequired: award.pointsRequired,
          earnedAt: new Date()
        });

        newlyEarnedAwards.push(award);
      }
    }

    user.totalChallengePoints = totalPoints;

    if (newlyEarnedAwards.length > 0) {
      await user.save();
    }

    return newlyEarnedAwards;
  }

  /**
   * Get all awards for a user
   */
  static async getUserAwards(userId: string): Promise<any[]> {
    const user = await User.findById(userId).select('awards totalChallengePoints');
    if (!user) {
      return [];
    }

    return user.awards || [];
  }

  /**
   * Get available awards (all awards with earned status)
   */
  static getAvailableAwards(userAwardIds: string[] = []): (Award & { earned: boolean })[] {
    return AWARDS.map(award => ({
      ...award,
      earned: userAwardIds.includes(award.id)
    }));
  }
}

