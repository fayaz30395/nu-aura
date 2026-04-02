/**
 * Authenticated E-Signature service — wraps /api/v1/esignature/** endpoints.
 * Uses the shared apiClient (cookie-based JWT auth).
 * For public/external token-based signing, use esign-public.service.ts instead.
 */
import { apiClient } from '../../api/client';
import type {
  CreateSignatureRequestRequest,
  SignatureRequestResponse,
  SignatureApprovalRequest,
  SignatureApprovalResponse,
  SignatureStatus,
} from '../../types/hire/esignature';

class ESignatureService {
  // ==================== Signature Requests ====================

  async createSignatureRequest(
    data: CreateSignatureRequestRequest
  ): Promise<SignatureRequestResponse> {
    const res = await apiClient.post<SignatureRequestResponse>('/esignature/requests', data);
    return res.data;
  }

  async getSignatureRequest(id: string): Promise<SignatureRequestResponse> {
    const res = await apiClient.get<SignatureRequestResponse>(`/esignature/requests/${id}`);
    return res.data;
  }

  async sendForSignature(id: string): Promise<SignatureRequestResponse> {
    const res = await apiClient.patch<SignatureRequestResponse>(`/esignature/requests/${id}/send`);
    return res.data;
  }

  async cancelSignatureRequest(id: string, reason: string): Promise<SignatureRequestResponse> {
    const res = await apiClient.patch<SignatureRequestResponse>(
      `/esignature/requests/${id}/cancel`,
      null,
      { params: { reason } }
    );
    return res.data;
  }

  async getSignatureRequestsByStatus(
    status: SignatureStatus
  ): Promise<SignatureRequestResponse[]> {
    const res = await apiClient.get<SignatureRequestResponse[]>(`/esignature/requests/status/${status}`);
    return res.data;
  }

  // ==================== Approvals / Signers ====================

  async addSigner(
    requestId: string,
    signer: SignatureApprovalRequest
  ): Promise<SignatureApprovalResponse> {
    const res = await apiClient.post<SignatureApprovalResponse>(
      `/esignature/requests/${requestId}/signers`,
      signer
    );
    return res.data;
  }

  async getApprovalsByRequest(requestId: string): Promise<SignatureApprovalResponse[]> {
    const res = await apiClient.get<SignatureApprovalResponse[]>(
      `/esignature/requests/${requestId}/approvals`
    );
    return res.data;
  }

  async getPendingApprovalsForSigner(signerId: string): Promise<SignatureApprovalResponse[]> {
    const res = await apiClient.get<SignatureApprovalResponse[]>(
      `/esignature/approvals/signer/${signerId}/pending`
    );
    return res.data;
  }
}

export const eSignatureService = new ESignatureService();
