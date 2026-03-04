import axios from 'axios';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

// No JWT interceptor — public endpoints
const publicApi = axios.create({ baseURL: BASE_URL });

export const esignPublicService = {
  async getSignatureInfo(token: string) {
    const res = await publicApi.get(`/api/v1/esignature/external/${token}`);
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
    const res = await publicApi.post(`/api/v1/esignature/external/${token}/sign`, body);
    return res.data;
  },
  async decline(token: string, signerEmail: string, reason?: string) {
    const res = await publicApi.post(
      `/api/v1/esignature/external/${token}/decline`,
      null,
      {
        params: { signerEmail, reason: reason || '' },
      }
    );
    return res.data;
  },
};
