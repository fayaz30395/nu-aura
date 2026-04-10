/**
 * Unit Tests for Wellness Service
 * Run with: npx vitest run lib/services/wellness.service.test.ts
 */

import {describe, it, expect, beforeEach, vi} from 'vitest';

// Mock the API client
vi.mock('@/lib/api/client', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}));

import {wellnessService} from './wellness.service';
import {apiClient} from '@/lib/api/client';

// Minimal inline mock types
interface MockWellnessDashboard {
  totalPoints: number;
  pointsThisMonth: number;
  currentStreak: number;
  challengesCompleted: number;
  activeChallenges: MockWellnessChallenge[];
  featuredPrograms: MockWellnessProgram[];
  recentHealthLogs: MockHealthLog[];
  leaderboard: MockLeaderboardEntry[];
}

interface MockWellnessProgram {
  id: string;
  name: string;
  description?: string;
  programType: string;
  category: string;
  startDate?: string;
  endDate?: string;
  isActive: boolean;
  isFeatured: boolean;
}

interface MockWellnessChallenge {
  id: string;
  programId?: string;
  name: string;
  description?: string;
  challengeType: string;
  startDate: string;
  endDate: string;
  pointsReward: number;
  isTeamBased: boolean;
  isActive: boolean;
  isJoined?: boolean;
}

interface MockHealthLog {
  id?: string;
  employeeId?: string;
  metricType: string;
  value: number;
  unit?: string;
  loggedAt: string;
  notes?: string;
}

interface MockWellnessPoints {
  id: string;
  employeeId: string;
  employeeName?: string;
  totalPoints: number;
  currentBalance: number;
  pointsEarnedThisMonth?: number;
  level?: number;
  streak?: number;
}

interface MockLeaderboardEntry {
  rank: number;
  employeeId: string;
  employeeName: string;
  points: number;
  avatar?: string;
}

const mockedApiClient = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

describe('WellnessService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDashboard', () => {
    it('should fetch wellness dashboard successfully', async () => {
      const mockDashboard: MockWellnessDashboard = {
        totalPoints: 5000,
        pointsThisMonth: 300,
        currentStreak: 15,
        challengesCompleted: 8,
        activeChallenges: [
          {
            id: 'chal-1',
            name: 'Step Challenge',
            challengeType: 'STEPS',
            startDate: '2024-03-01',
            endDate: '2024-03-31',
            pointsReward: 500,
            isTeamBased: false,
            isActive: true,
            isJoined: true,
          },
        ],
        featuredPrograms: [
          {
            id: 'prog-1',
            name: 'Yoga Program',
            programType: 'ONGOING',
            category: 'PHYSICAL_FITNESS',
            isActive: true,
            isFeatured: true,
          },
        ],
        recentHealthLogs: [
          {
            id: 'log-1',
            metricType: 'STEPS',
            value: 8000,
            unit: 'steps',
            loggedAt: '2024-03-18T10:00:00',
          },
        ],
        leaderboard: [
          {
            rank: 1,
            employeeId: 'emp-1',
            employeeName: 'Alice Johnson',
            points: 5000,
          },
        ],
      };

      mockedApiClient.get.mockResolvedValueOnce({data: mockDashboard});

      const result = await wellnessService.getDashboard();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/wellness/dashboard');
      expect(result).toEqual(mockDashboard);
      expect(result.totalPoints).toBe(5000);
    });

    it('should handle error when fetching dashboard', async () => {
      const error = new Error('Failed to fetch dashboard');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(wellnessService.getDashboard()).rejects.toThrow('Failed to fetch dashboard');
    });
  });

  describe('createProgram', () => {
    it('should create a new wellness program', async () => {
      const programData: Partial<MockWellnessProgram> = {
        name: 'Fitness Program',
        programType: 'ONGOING',
        category: 'PHYSICAL_FITNESS',
        isActive: true,
        isFeatured: false,
      };

      const mockProgram: MockWellnessProgram = {
        id: 'prog-new-1',
        ...programData,
        isActive: true,
        isFeatured: false,
      };

      mockedApiClient.post.mockResolvedValueOnce({data: mockProgram});

      const result = await wellnessService.createProgram(programData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/wellness/programs', programData);
      expect(result.id).toBe('prog-new-1');
      expect(result.name).toBe('Fitness Program');
    });

    it('should handle error when creating program', async () => {
      const error = {response: {status: 400, data: {message: 'Invalid program data'}}};
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(wellnessService.createProgram({})).rejects.toEqual(error);
    });
  });

  describe('getActivePrograms', () => {
    it('should fetch all active wellness programs', async () => {
      const mockPrograms: MockWellnessProgram[] = [
        {
          id: 'prog-1',
          name: 'Yoga Program',
          programType: 'ONGOING',
          category: 'PHYSICAL_FITNESS',
          isActive: true,
          isFeatured: true,
        },
        {
          id: 'prog-2',
          name: 'Meditation Program',
          programType: 'ONGOING',
          category: 'MENTAL_HEALTH',
          isActive: true,
          isFeatured: false,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockPrograms});

      const result = await wellnessService.getActivePrograms();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/wellness/programs/active');
      expect(result).toHaveLength(2);
      expect(result[0].isActive).toBe(true);
    });

    it('should handle error when fetching active programs', async () => {
      const error = new Error('API error');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(wellnessService.getActivePrograms()).rejects.toThrow('API error');
    });
  });

  describe('getFeaturedPrograms', () => {
    it('should fetch featured wellness programs', async () => {
      const mockPrograms: MockWellnessProgram[] = [
        {
          id: 'prog-1',
          name: 'Yoga Program',
          programType: 'ONGOING',
          category: 'PHYSICAL_FITNESS',
          isActive: true,
          isFeatured: true,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockPrograms});

      const result = await wellnessService.getFeaturedPrograms();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/wellness/programs/featured');
      expect(result).toHaveLength(1);
      expect(result[0].isFeatured).toBe(true);
    });

    it('should handle empty featured programs list', async () => {
      mockedApiClient.get.mockResolvedValueOnce({data: []});

      const result = await wellnessService.getFeaturedPrograms();

      expect(result).toEqual([]);
    });
  });

  describe('createChallenge', () => {
    it('should create challenge under a program', async () => {
      const programId = 'prog-1';
      const challengeData: Partial<MockWellnessChallenge> = {
        name: 'March Step Challenge',
        challengeType: 'STEPS',
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        pointsReward: 500,
        isTeamBased: false,
      };

      const mockChallenge: MockWellnessChallenge = {
        id: 'chal-1',
        programId: programId,
        ...challengeData,
        isActive: true,
      };

      mockedApiClient.post.mockResolvedValueOnce({data: mockChallenge});

      const result = await wellnessService.createChallenge(programId, challengeData);

      expect(mockedApiClient.post).toHaveBeenCalledWith(
        '/wellness/programs/prog-1/challenges',
        challengeData
      );
      expect(result.id).toBe('chal-1');
      expect(result.programId).toBe(programId);
    });

    it('should create standalone challenge when programId is null', async () => {
      const challengeData: Partial<MockWellnessChallenge> = {
        name: 'General Challenge',
        challengeType: 'STEPS',
        startDate: '2024-03-01',
        endDate: '2024-03-31',
        pointsReward: 300,
        isTeamBased: false,
      };

      const mockChallenge: MockWellnessChallenge = {
        id: 'chal-2',
        ...challengeData,
        isActive: true,
      };

      mockedApiClient.post.mockResolvedValueOnce({data: mockChallenge});

      const result = await wellnessService.createChallenge(null, challengeData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/wellness/challenges', challengeData);
      expect(result.id).toBe('chal-2');
      expect(result.programId).toBeUndefined();
    });

    it('should handle error when creating challenge', async () => {
      const error = {response: {status: 400, data: {message: 'Invalid challenge data'}}};
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(wellnessService.createChallenge('prog-1', {})).rejects.toEqual(error);
    });
  });

  describe('getActiveChallenges', () => {
    it('should fetch all active challenges', async () => {
      const mockChallenges: MockWellnessChallenge[] = [
        {
          id: 'chal-1',
          name: 'Step Challenge',
          challengeType: 'STEPS',
          startDate: '2024-03-01',
          endDate: '2024-03-31',
          pointsReward: 500,
          isTeamBased: false,
          isActive: true,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockChallenges});

      const result = await wellnessService.getActiveChallenges();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/wellness/challenges/active');
      expect(result).toHaveLength(1);
      expect(result[0].isActive).toBe(true);
    });

    it('should handle error when fetching active challenges', async () => {
      const error = new Error('Server error');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(wellnessService.getActiveChallenges()).rejects.toThrow('Server error');
    });
  });

  describe('getUpcomingChallenges', () => {
    it('should fetch upcoming challenges', async () => {
      const mockChallenges: MockWellnessChallenge[] = [
        {
          id: 'chal-3',
          name: 'April Fitness Challenge',
          challengeType: 'EXERCISE_MINUTES',
          startDate: '2024-04-01',
          endDate: '2024-04-30',
          pointsReward: 600,
          isTeamBased: true,
          isActive: false,
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockChallenges});

      const result = await wellnessService.getUpcomingChallenges();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/wellness/challenges/upcoming');
      expect(result).toHaveLength(1);
      expect(result[0].startDate).toBe('2024-04-01');
    });

    it('should handle empty upcoming challenges', async () => {
      mockedApiClient.get.mockResolvedValueOnce({data: []});

      const result = await wellnessService.getUpcomingChallenges();

      expect(result).toEqual([]);
    });
  });

  describe('joinChallenge', () => {
    it('should join challenge with team info', async () => {
      mockedApiClient.post.mockResolvedValueOnce({});

      await wellnessService.joinChallenge('chal-1', 'team-1', 'Team Alpha');

      const expectedUrl = '/wellness/challenges/chal-1/join?teamId=team-1&teamName=Team+Alpha';
      expect(mockedApiClient.post).toHaveBeenCalledWith(expectedUrl);
    });

    it('should join challenge without team info', async () => {
      mockedApiClient.post.mockResolvedValueOnce({});

      await wellnessService.joinChallenge('chal-1');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/wellness/challenges/chal-1/join?');
    });

    it('should join challenge with only teamId', async () => {
      mockedApiClient.post.mockResolvedValueOnce({});

      await wellnessService.joinChallenge('chal-1', 'team-1');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/wellness/challenges/chal-1/join?teamId=team-1');
    });

    it('should handle error when joining challenge', async () => {
      const error = new Error('Already joined');
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(wellnessService.joinChallenge('chal-1')).rejects.toThrow('Already joined');
    });
  });

  describe('leaveChallenge', () => {
    it('should leave challenge successfully', async () => {
      mockedApiClient.post.mockResolvedValueOnce({});

      await wellnessService.leaveChallenge('chal-1');

      expect(mockedApiClient.post).toHaveBeenCalledWith('/wellness/challenges/chal-1/leave');
    });

    it('should handle error when leaving challenge', async () => {
      const error = new Error('Not joined');
      mockedApiClient.post.mockRejectedValueOnce(error);

      await expect(wellnessService.leaveChallenge('chal-1')).rejects.toThrow('Not joined');
    });
  });

  describe('logHealth', () => {
    it('should log health metric successfully', async () => {
      const healthData: MockHealthLog = {
        metricType: 'STEPS',
        value: 8000,
        unit: 'steps',
        loggedAt: '2024-03-18T10:00:00',
      };

      const mockLog: MockHealthLog = {
        id: 'log-1',
        employeeId: 'emp-1',
        ...healthData,
      };

      mockedApiClient.post.mockResolvedValueOnce({data: mockLog});

      const result = await wellnessService.logHealth(healthData);

      expect(mockedApiClient.post).toHaveBeenCalledWith('/wellness/health-logs', healthData);
      expect(result.id).toBe('log-1');
      expect(result.value).toBe(8000);
    });

    it('should handle error when logging health', async () => {
      const error = {response: {status: 400, data: {message: 'Invalid value'}}};
      mockedApiClient.post.mockRejectedValueOnce(error);

      const healthData: MockHealthLog = {
        metricType: 'STEPS',
        value: -100,
        loggedAt: '2024-03-18T10:00:00',
      };

      await expect(wellnessService.logHealth(healthData)).rejects.toEqual(error);
    });
  });

  describe('getHealthLogs', () => {
    it('should fetch health logs for date range', async () => {
      const startDate = '2024-03-01';
      const endDate = '2024-03-31';
      const mockLogs: MockHealthLog[] = [
        {
          id: 'log-1',
          metricType: 'STEPS',
          value: 8000,
          unit: 'steps',
          loggedAt: '2024-03-15T10:00:00',
        },
        {
          id: 'log-2',
          metricType: 'SLEEP_HOURS',
          value: 7,
          unit: 'hours',
          loggedAt: '2024-03-15T22:00:00',
        },
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockLogs});

      const result = await wellnessService.getHealthLogs(startDate, endDate);

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        `/wellness/health-logs`, {params: {startDate, endDate}}
      );
      expect(result).toHaveLength(2);
    });

    it('should handle empty health logs', async () => {
      mockedApiClient.get.mockResolvedValueOnce({data: []});

      const result = await wellnessService.getHealthLogs('2024-03-01', '2024-03-05');

      expect(result).toEqual([]);
    });

    it('should handle error when fetching health logs', async () => {
      const error = new Error('Date range invalid');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(wellnessService.getHealthLogs('2024-03-31', '2024-03-01')).rejects.toThrow(
        'Date range invalid'
      );
    });
  });

  describe('getMyPoints', () => {
    it('should fetch personal wellness points', async () => {
      const mockPoints: MockWellnessPoints = {
        id: 'points-1',
        employeeId: 'emp-1',
        employeeName: 'John Doe',
        totalPoints: 5000,
        currentBalance: 4500,
        pointsEarnedThisMonth: 300,
        level: 5,
        streak: 15,
      };

      mockedApiClient.get.mockResolvedValueOnce({data: mockPoints});

      const result = await wellnessService.getMyPoints();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/wellness/points');
      expect(result.totalPoints).toBe(5000);
      expect(result.streak).toBe(15);
    });

    it('should handle error when fetching points', async () => {
      const error = new Error('Unauthorized');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(wellnessService.getMyPoints()).rejects.toThrow('Unauthorized');
    });
  });

  describe('getLeaderboard', () => {
    it('should fetch leaderboard with default limit', async () => {
      const mockLeaderboard: MockLeaderboardEntry[] = [
        {rank: 1, employeeId: 'emp-1', employeeName: 'Alice Johnson', points: 5000},
        {rank: 2, employeeId: 'emp-2', employeeName: 'Bob Smith', points: 4800},
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockLeaderboard});

      const result = await wellnessService.getLeaderboard();

      expect(mockedApiClient.get).toHaveBeenCalledWith('/wellness/leaderboard?limit=10');
      expect(result).toHaveLength(2);
      expect(result[0].rank).toBe(1);
    });

    it('should fetch leaderboard with custom limit', async () => {
      const mockLeaderboard: MockLeaderboardEntry[] = [
        {rank: 1, employeeId: 'emp-1', employeeName: 'Alice Johnson', points: 5000},
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockLeaderboard});

      const result = await wellnessService.getLeaderboard(20);

      expect(mockedApiClient.get).toHaveBeenCalledWith('/wellness/leaderboard?limit=20');
      expect(result).toHaveLength(1);
    });

    it('should handle error when fetching leaderboard', async () => {
      const error = new Error('Failed to load leaderboard');
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(wellnessService.getLeaderboard()).rejects.toThrow('Failed to load leaderboard');
    });
  });

  describe('getChallengeLeaderboard', () => {
    it('should fetch challenge leaderboard with default limit', async () => {
      const mockLeaderboard: MockLeaderboardEntry[] = [
        {rank: 1, employeeId: 'emp-1', employeeName: 'Alice Johnson', points: 1000},
        {rank: 2, employeeId: 'emp-3', employeeName: 'Charlie Brown', points: 950},
      ];

      mockedApiClient.get.mockResolvedValueOnce({data: mockLeaderboard});

      const result = await wellnessService.getChallengeLeaderboard('chal-1');

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/wellness/challenges/chal-1/leaderboard?limit=10'
      );
      expect(result).toHaveLength(2);
    });

    it('should fetch challenge leaderboard with custom limit', async () => {
      const mockLeaderboard: MockLeaderboardEntry[] = [];

      mockedApiClient.get.mockResolvedValueOnce({data: mockLeaderboard});

      const result = await wellnessService.getChallengeLeaderboard('chal-1', 50);

      expect(mockedApiClient.get).toHaveBeenCalledWith(
        '/wellness/challenges/chal-1/leaderboard?limit=50'
      );
      expect(result).toEqual([]);
    });

    it('should handle error when fetching challenge leaderboard', async () => {
      const error = {response: {status: 404, data: {message: 'Challenge not found'}}};
      mockedApiClient.get.mockRejectedValueOnce(error);

      await expect(wellnessService.getChallengeLeaderboard('non-existent')).rejects.toEqual(error);
    });
  });
});
