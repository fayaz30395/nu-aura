/**
 * Unit Tests for Survey Service
 */
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {surveyService} from './survey.service';
import {apiClient} from '@/lib/api/client';

vi.mock('@/lib/api/client', () => ({
  apiClient: {get: vi.fn(), post: vi.fn(), put: vi.fn(), patch: vi.fn(), delete: vi.fn()},
}));

const mock = apiClient as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  patch: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const BASE = '/survey-management';

interface Survey {
  id: string;
  title: string;
  status: string;
  tenantId: string;
}

type SurveyStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'CLOSED';

const makeSurvey = (overrides: Partial<Survey> = {}): Survey => ({
  id: 's-1', title: 'Engagement Survey', status: 'DRAFT', tenantId: 't-1', ...overrides,
});

describe('SurveyService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createSurvey', () => {
    it('should create a survey', async () => {
      const survey = makeSurvey();
      mock.post.mockResolvedValueOnce({data: survey});
      const result = await surveyService.createSurvey({title: 'Engagement Survey'} as Parameters<typeof surveyService.createSurvey>[0]);
      expect(result).toEqual(survey);
      expect(mock.post).toHaveBeenCalledWith(BASE, expect.any(Object));
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Validation error'));
      await expect(surveyService.createSurvey({title: ''} as Parameters<typeof surveyService.createSurvey>[0])).rejects.toThrow('Validation error');
    });
  });

  describe('updateSurvey', () => {
    it('should update a survey', async () => {
      const survey = makeSurvey({title: 'Updated Survey'});
      mock.put.mockResolvedValueOnce({data: survey});
      const result = await surveyService.updateSurvey('s-1', {title: 'Updated Survey'} as Parameters<typeof surveyService.updateSurvey>[1]);
      expect(result).toEqual(survey);
      expect(mock.put).toHaveBeenCalledWith(`${BASE}/s-1`, expect.any(Object));
    });

    it('should throw on 404', async () => {
      mock.put.mockRejectedValueOnce(new Error('Not Found'));
      await expect(surveyService.updateSurvey('bad', {} as Parameters<typeof surveyService.updateSurvey>[1])).rejects.toThrow('Not Found');
    });
  });

  describe('updateStatus', () => {
    it('should update survey status', async () => {
      const survey = makeSurvey({status: 'ACTIVE'});
      mock.patch.mockResolvedValueOnce({data: survey});
      const result = await surveyService.updateStatus('s-1', 'ACTIVE' as SurveyStatus);
      expect(result).toEqual(survey);
      expect(mock.patch).toHaveBeenCalledWith(`${BASE}/s-1/status?status=ACTIVE`);
    });

    it('should throw on error', async () => {
      mock.patch.mockRejectedValueOnce(new Error('Conflict'));
      await expect(surveyService.updateStatus('s-1', 'ACTIVE' as SurveyStatus)).rejects.toThrow('Conflict');
    });
  });

  describe('launchSurvey', () => {
    it('should launch a survey', async () => {
      const survey = makeSurvey({status: 'ACTIVE'});
      mock.post.mockResolvedValueOnce({data: survey});
      const result = await surveyService.launchSurvey('s-1');
      expect(result).toEqual(survey);
      expect(mock.post).toHaveBeenCalledWith(`${BASE}/s-1/launch`);
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Bad Request'));
      await expect(surveyService.launchSurvey('s-1')).rejects.toThrow('Bad Request');
    });
  });

  describe('completeSurvey', () => {
    it('should complete a survey', async () => {
      const survey = makeSurvey({status: 'COMPLETED'});
      mock.post.mockResolvedValueOnce({data: survey});
      const result = await surveyService.completeSurvey('s-1');
      expect(result).toEqual(survey);
      expect(mock.post).toHaveBeenCalledWith(`${BASE}/s-1/complete`);
    });

    it('should throw on error', async () => {
      mock.post.mockRejectedValueOnce(new Error('Server error'));
      await expect(surveyService.completeSurvey('s-1')).rejects.toThrow('Server error');
    });
  });

  describe('getSurveyById', () => {
    it('should return a survey by ID', async () => {
      const survey = makeSurvey();
      mock.get.mockResolvedValueOnce({data: survey});
      const result = await surveyService.getSurveyById('s-1');
      expect(result).toEqual(survey);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/s-1`);
    });

    it('should throw on 404', async () => {
      mock.get.mockRejectedValueOnce(new Error('Not Found'));
      await expect(surveyService.getSurveyById('bad')).rejects.toThrow('Not Found');
    });
  });

  describe('getAllSurveys', () => {
    it('should return paginated surveys', async () => {
      const page = {content: [makeSurvey()], totalElements: 1, totalPages: 1, size: 20, number: 0};
      mock.get.mockResolvedValueOnce({data: page});
      const result = await surveyService.getAllSurveys();
      expect(result).toEqual(page);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}?page=0&size=20`);
    });

    it('should support custom pagination', async () => {
      mock.get.mockResolvedValueOnce({data: {content: [], totalElements: 0, totalPages: 0, size: 5, number: 2}});
      await surveyService.getAllSurveys(2, 5);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}?page=2&size=5`);
    });
  });

  describe('getSurveysByStatus', () => {
    it('should return surveys filtered by status', async () => {
      const surveys = [makeSurvey({status: 'ACTIVE'})];
      mock.get.mockResolvedValueOnce({data: surveys});
      const result = await surveyService.getSurveysByStatus('ACTIVE' as SurveyStatus);
      expect(result).toEqual(surveys);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/status/ACTIVE`);
    });

    it('should return empty array for status with no results', async () => {
      mock.get.mockResolvedValueOnce({data: []});
      const result = await surveyService.getSurveysByStatus('CLOSED' as SurveyStatus);
      expect(result).toHaveLength(0);
    });
  });

  describe('getActiveSurveys', () => {
    it('should return active surveys', async () => {
      const surveys = [makeSurvey({status: 'ACTIVE'})];
      mock.get.mockResolvedValueOnce({data: surveys});
      const result = await surveyService.getActiveSurveys();
      expect(result).toEqual(surveys);
      expect(mock.get).toHaveBeenCalledWith(`${BASE}/active`);
    });

    it('should throw on error', async () => {
      mock.get.mockRejectedValueOnce(new Error('Network error'));
      await expect(surveyService.getActiveSurveys()).rejects.toThrow('Network error');
    });
  });

  describe('deleteSurvey', () => {
    it('should delete a survey', async () => {
      mock.delete.mockResolvedValueOnce({data: undefined});
      await surveyService.deleteSurvey('s-1');
      expect(mock.delete).toHaveBeenCalledWith(`${BASE}/s-1`);
    });

    it('should throw on error', async () => {
      mock.delete.mockRejectedValueOnce(new Error('Not Found'));
      await expect(surveyService.deleteSurvey('bad')).rejects.toThrow('Not Found');
    });
  });
});
