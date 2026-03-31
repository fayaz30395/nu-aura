import { apiClient } from '../../api/client';
import type {
  WellnessProgram,
  WellnessChallenge,
  HealthLog,
  WellnessPoints,
  WellnessDashboard,
  LeaderboardEntry,
} from '../../types/grow/wellness';

const BASE_URL = '/wellness';

export const wellnessService = {
  // Dashboard
  async getDashboard(): Promise<WellnessDashboard> {
    const response = await apiClient.get<WellnessDashboard>(`${BASE_URL}/dashboard`);
    return response.data;
  },

  // Programs
  async createProgram(data: Partial<WellnessProgram>): Promise<WellnessProgram> {
    const response = await apiClient.post<WellnessProgram>(`${BASE_URL}/programs`, data);
    return response.data;
  },

  async getActivePrograms(): Promise<WellnessProgram[]> {
    const response = await apiClient.get<WellnessProgram[]>(`${BASE_URL}/programs/active`);
    return response.data;
  },

  async getFeaturedPrograms(): Promise<WellnessProgram[]> {
    const response = await apiClient.get<WellnessProgram[]>(`${BASE_URL}/programs/featured`);
    return response.data;
  },

  // Challenges
  async createChallenge(programId: string | null, data: Partial<WellnessChallenge>): Promise<WellnessChallenge> {
    const url = programId
      ? `${BASE_URL}/programs/${programId}/challenges`
      : `${BASE_URL}/challenges`;
    const response = await apiClient.post<WellnessChallenge>(url, data);
    return response.data;
  },

  async getActiveChallenges(): Promise<WellnessChallenge[]> {
    const response = await apiClient.get<WellnessChallenge[]>(`${BASE_URL}/challenges/active`);
    return response.data;
  },

  async getUpcomingChallenges(): Promise<WellnessChallenge[]> {
    const response = await apiClient.get<WellnessChallenge[]>(`${BASE_URL}/challenges/upcoming`);
    return response.data;
  },

  async joinChallenge(challengeId: string, teamId?: string, teamName?: string): Promise<void> {
    const params = new URLSearchParams();
    if (teamId) params.append('teamId', teamId);
    if (teamName) params.append('teamName', teamName);
    await apiClient.post(`${BASE_URL}/challenges/${challengeId}/join?${params.toString()}`);
  },

  async leaveChallenge(challengeId: string): Promise<void> {
    await apiClient.post(`${BASE_URL}/challenges/${challengeId}/leave`);
  },

  // Health Logging
  async logHealth(data: HealthLog): Promise<HealthLog> {
    const response = await apiClient.post<HealthLog>(`${BASE_URL}/health-logs`, data);
    return response.data;
  },

  async getHealthLogs(startDate: string, endDate: string): Promise<HealthLog[]> {
    const response = await apiClient.get<HealthLog[]>(
      `${BASE_URL}/health-logs?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data;
  },

  // Points & Leaderboard
  async getMyPoints(): Promise<WellnessPoints> {
    const response = await apiClient.get<WellnessPoints>(`${BASE_URL}/points`);
    return response.data;
  },

  async getLeaderboard(limit = 10): Promise<LeaderboardEntry[]> {
    const response = await apiClient.get<LeaderboardEntry[]>(`${BASE_URL}/leaderboard?limit=${limit}`);
    return response.data;
  },

  async getChallengeLeaderboard(challengeId: string, limit = 10): Promise<LeaderboardEntry[]> {
    const response = await apiClient.get<LeaderboardEntry[]>(
      `${BASE_URL}/challenges/${challengeId}/leaderboard?limit=${limit}`
    );
    return response.data;
  },
};
