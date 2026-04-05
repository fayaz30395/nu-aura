// Public (unauthenticated) offer-acceptance endpoints — use the shared publicApiClient
// to ensure consistent base URL, timeout, and error handling across the platform.
import {publicApiClient} from '../../api/public-client';

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
    const response = await publicApiClient.get<PublicOfferResponse>(`/public/offers/${token}`);
    return response.data;
  }

  /**
   * Accept offer using token (public endpoint - no auth required)
   */
  async acceptOffer(token: string, data: AcceptOfferRequest): Promise<PublicOfferResponse> {
    const response = await publicApiClient.post<PublicOfferResponse>(
      `/public/offers/${token}/accept`,
      data
    );
    return response.data;
  }

  /**
   * Decline offer using token (public endpoint - no auth required)
   */
  async declineOffer(token: string, data: DeclineOfferRequest): Promise<PublicOfferResponse> {
    const response = await publicApiClient.post<PublicOfferResponse>(
      `/public/offers/${token}/decline`,
      data
    );
    return response.data;
  }
}

export const publicOfferService = new PublicOfferService();
