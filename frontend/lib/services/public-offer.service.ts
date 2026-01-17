import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

// Create a separate axios instance for public (unauthenticated) endpoints
const publicClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface PublicOfferResponse {
  candidateId: string;
  candidateName: string;
  email: string;
  jobTitle?: string;
  offeredDesignation?: string;
  offeredCtc?: number;
  proposedJoiningDate?: string;
  offerExtendedDate?: string;
  status: string;
  offerAcceptedDate?: string;
  offerDeclinedDate?: string;
  offerLetterId?: string;
  offerLetterUrl?: string;
  offerLetterReferenceNumber?: string;
  signatureToken?: string;
  tokenValid: boolean;
  errorMessage?: string;
  companyName?: string;
}

export interface AcceptOfferRequest {
  email: string;
  confirmedJoiningDate?: string;
  signatureData?: string;
}

export interface DeclineOfferRequest {
  email: string;
  declineReason?: string;
}

class PublicOfferService {
  /**
   * Get offer details by token (public endpoint - no auth required)
   */
  async getOfferByToken(token: string): Promise<PublicOfferResponse> {
    const response = await publicClient.get<PublicOfferResponse>(`/public/offers/${token}`);
    return response.data;
  }

  /**
   * Accept offer using token (public endpoint - no auth required)
   */
  async acceptOffer(token: string, data: AcceptOfferRequest): Promise<PublicOfferResponse> {
    const response = await publicClient.post<PublicOfferResponse>(
      `/public/offers/${token}/accept`,
      data
    );
    return response.data;
  }

  /**
   * Decline offer using token (public endpoint - no auth required)
   */
  async declineOffer(token: string, data: DeclineOfferRequest): Promise<PublicOfferResponse> {
    const response = await publicClient.post<PublicOfferResponse>(
      `/public/offers/${token}/decline`,
      data
    );
    return response.data;
  }
}

export const publicOfferService = new PublicOfferService();
