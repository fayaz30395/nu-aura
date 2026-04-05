import {apiClient} from '../../api/client';
import {
  CandidateMatchResponse,
  CandidateScreeningSummaryRequest,
  CandidateScreeningSummaryResponse,
  FeedbackSynthesisRequest,
  FeedbackSynthesisResponse,
  InterviewQuestionsResponse,
  JobDescriptionRequest,
  JobDescriptionResponse,
  ResumeParseRequest,
  ResumeParseResponse,
} from '../../types/hire/ai-recruitment';

class AIRecruitmentService {
  // ==================== Resume Parsing ====================

  async parseResume(request: ResumeParseRequest): Promise<ResumeParseResponse> {
    const response = await apiClient.post<ResumeParseResponse>(
      '/recruitment/ai/parse-resume',
      request
    );
    return response.data;
  }

  /**
   * Parse resume from a multipart file upload (PDF, DOCX, etc.)
   * Uses the /parse-resume/upload endpoint with FormData.
   */
  async parseResumeFromUpload(file: File): Promise<ResumeParseResponse> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post<ResumeParseResponse>(
      '/recruitment/ai/parse-resume/upload',
      formData,
      {headers: {'Content-Type': 'multipart/form-data'}}
    );
    return response.data;
  }

  // ==================== Candidate Matching ====================

  async calculateMatchScore(
    candidateId: string,
    jobOpeningId: string
  ): Promise<CandidateMatchResponse> {
    const response = await apiClient.post<CandidateMatchResponse>(
      '/recruitment/ai/match-score',
      null,
      {params: {candidateId, jobOpeningId}}
    );
    return response.data;
  }

  async rankCandidatesForJob(jobOpeningId: string): Promise<CandidateMatchResponse[]> {
    const response = await apiClient.get<CandidateMatchResponse[]>(
      `/recruitment/ai/ranked-candidates/${jobOpeningId}`
    );
    return response.data;
  }

  // ==================== Screening Summary ====================

  async generateScreeningSummary(
    request: CandidateScreeningSummaryRequest
  ): Promise<CandidateScreeningSummaryResponse> {
    const response = await apiClient.post<CandidateScreeningSummaryResponse>(
      '/recruitment/ai/screening-summary',
      request
    );
    return response.data;
  }

  // ==================== Job Description ====================

  async generateJobDescription(
    request: JobDescriptionRequest
  ): Promise<JobDescriptionResponse> {
    const response = await apiClient.post<JobDescriptionResponse>(
      '/recruitment/ai/generate-job-description',
      request
    );
    return response.data;
  }

  // ==================== Interview Questions ====================

  async generateInterviewQuestions(
    jobOpeningId: string,
    candidateId?: string
  ): Promise<InterviewQuestionsResponse> {
    const params: Record<string, string> = {};
    if (candidateId) {
      params.candidateId = candidateId;
    }
    const response = await apiClient.get<InterviewQuestionsResponse>(
      `/recruitment/ai/interview-questions/${jobOpeningId}`,
      {params}
    );
    return response.data;
  }

  // ==================== Feedback Synthesis ====================

  async synthesizeFeedback(
    request: FeedbackSynthesisRequest
  ): Promise<FeedbackSynthesisResponse> {
    const response = await apiClient.post<FeedbackSynthesisResponse>(
      '/recruitment/ai/synthesize-feedback',
      request
    );
    return response.data;
  }
}

export const aiRecruitmentService = new AIRecruitmentService();
