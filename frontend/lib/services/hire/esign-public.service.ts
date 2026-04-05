// Public (unauthenticated) e-signature endpoints — use the shared publicApiClient
// to ensure consistent base URL, timeout, and error handling across the platform.
import {publicApiClient} from '../../api/public-client';

export const esignPublicService = {
  async getSignatureInfo(token: string) {
    const res = await publicApiClient.get(`/esignature/external/${token}`);
    return res.data;
  },
  async sign(
    token: string,
    body: {
      signerEmail: string;
      signatureMethod: string;
      signatureData: string;
      comments?: string;
    }
  ) {
    const res = await publicApiClient.post(`/esignature/external/${token}/sign`, body);
    return res.data;
  },
  async decline(token: string, signerEmail: string, reason?: string) {
    const res = await publicApiClient.post(
      `/esignature/external/${token}/decline`,
      null,
      {
        params: {signerEmail, reason: reason || ''},
      }
    );
    return res.data;
  },
};
