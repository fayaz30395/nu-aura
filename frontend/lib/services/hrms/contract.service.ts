import { apiClient } from '../../api/client';
import {
  Contract,
  ContractListItem,
  CreateContractRequest,
  UpdateContractRequest,
  ContractSignature,
  SendForSigningRequest,
  ContractTemplate,
  CreateContractTemplateRequest,
  ContractStatus,
  ContractType,
  Page,
  SignatureSummary,
} from '../../types/hrms/contract';

class ContractService {
  // ===================== Contract CRUD =====================

  async createContract(data: CreateContractRequest): Promise<Contract> {
    const response = await apiClient.post<Contract>('/contracts', data);
    return response.data;
  }

  async getContractById(id: string): Promise<Contract> {
    const response = await apiClient.get<Contract>(`/contracts/${id}`);
    return response.data;
  }

  async getContracts(page: number = 0, size: number = 20): Promise<Page<ContractListItem>> {
    const response = await apiClient.get<Page<ContractListItem>>('/contracts', {
      params: { page, size },
    });
    return response.data;
  }

  async updateContract(id: string, data: UpdateContractRequest): Promise<Contract> {
    const response = await apiClient.put<Contract>(`/contracts/${id}`, data);
    return response.data;
  }

  async deleteContract(id: string): Promise<void> {
    await apiClient.delete(`/contracts/${id}`);
  }

  // ===================== Filtering & Search =====================

  async getContractsByStatus(status: ContractStatus, page: number = 0, size: number = 20): Promise<Page<ContractListItem>> {
    const response = await apiClient.get<Page<ContractListItem>>(`/contracts/status/${status}`, {
      params: { page, size },
    });
    return response.data;
  }

  async getContractsByType(type: ContractType, page: number = 0, size: number = 20): Promise<Page<ContractListItem>> {
    const response = await apiClient.get<Page<ContractListItem>>(`/contracts/type/${type}`, {
      params: { page, size },
    });
    return response.data;
  }

  async getEmployeeContracts(employeeId: string, page: number = 0, size: number = 20): Promise<Page<ContractListItem>> {
    const response = await apiClient.get<Page<ContractListItem>>(`/contracts/employee/${employeeId}`, {
      params: { page, size },
    });
    return response.data;
  }

  async searchContracts(search: string, page: number = 0, size: number = 20): Promise<Page<ContractListItem>> {
    const response = await apiClient.get<Page<ContractListItem>>('/contracts/search', {
      params: { search, page, size },
    });
    return response.data;
  }

  // ===================== Status Transitions =====================

  async markAsPendingReview(id: string): Promise<Contract> {
    const response = await apiClient.patch<Contract>(`/contracts/${id}/mark-pending-review`);
    return response.data;
  }

  async markAsPendingSignatures(id: string): Promise<Contract> {
    const response = await apiClient.patch<Contract>(`/contracts/${id}/mark-pending-signatures`);
    return response.data;
  }

  async markAsActive(id: string): Promise<Contract> {
    const response = await apiClient.patch<Contract>(`/contracts/${id}/mark-active`);
    return response.data;
  }

  async terminateContract(id: string): Promise<Contract> {
    const response = await apiClient.patch<Contract>(`/contracts/${id}/terminate`);
    return response.data;
  }

  async renewContract(id: string): Promise<Contract> {
    const response = await apiClient.patch<Contract>(`/contracts/${id}/renew`);
    return response.data;
  }

  // ===================== Expiry & Status Checks =====================

  async getExpiringContracts(days: number = 30): Promise<ContractListItem[]> {
    const response = await apiClient.get<ContractListItem[]>('/contracts/expiring', {
      params: { days },
    });
    return response.data;
  }

  async getExpiredContracts(): Promise<ContractListItem[]> {
    const response = await apiClient.get<ContractListItem[]>('/contracts/expired');
    return response.data;
  }

  async getActiveContracts(): Promise<ContractListItem[]> {
    const response = await apiClient.get<ContractListItem[]>('/contracts/active');
    return response.data;
  }

  // ===================== Version Management =====================

  async getVersionHistory(contractId: string): Promise<Record<string, unknown>[]> {
    const response = await apiClient.get<Record<string, unknown>[]>(`/contracts/${contractId}/versions`);
    return response.data;
  }

  // ===================== Signature Management =====================

  async sendForSigning(contractId: string, data: SendForSigningRequest): Promise<ContractSignature> {
    const response = await apiClient.post<ContractSignature>(`/contracts/${contractId}/send-for-signing`, data);
    return response.data;
  }

  async recordSignature(
    contractId: string,
    signerEmail: string,
    signatureImageUrl: string,
    ipAddress?: string
  ): Promise<ContractSignature> {
    const response = await apiClient.post<ContractSignature>(`/contracts/${contractId}/record-signature`, null, {
      params: { signerEmail, signatureImageUrl, ipAddress },
    });
    return response.data;
  }

  async declineSignature(contractId: string, signerEmail: string): Promise<ContractSignature> {
    const response = await apiClient.post<ContractSignature>(`/contracts/${contractId}/decline-signature`, null, {
      params: { signerEmail },
    });
    return response.data;
  }

  async getSignatures(contractId: string): Promise<ContractSignature[]> {
    const response = await apiClient.get<ContractSignature[]>(`/contracts/${contractId}/signatures`);
    return response.data;
  }

  async getPendingSignatures(contractId: string): Promise<ContractSignature[]> {
    const response = await apiClient.get<ContractSignature[]>(`/contracts/${contractId}/signatures/pending`);
    return response.data;
  }

  async getSignatureSummary(contractId: string): Promise<SignatureSummary> {
    const response = await apiClient.get<SignatureSummary>(`/contracts/${contractId}/signatures/summary`);
    return response.data;
  }

  // ===================== Templates =====================

  async createTemplate(data: CreateContractTemplateRequest): Promise<ContractTemplate> {
    const response = await apiClient.post<ContractTemplate>('/contracts/templates', data);
    return response.data;
  }

  async getTemplateById(id: string): Promise<ContractTemplate> {
    const response = await apiClient.get<ContractTemplate>(`/contracts/templates/${id}`);
    return response.data;
  }

  async getTemplates(page: number = 0, size: number = 20): Promise<Page<ContractTemplate>> {
    const response = await apiClient.get<Page<ContractTemplate>>('/contracts/templates', {
      params: { page, size },
    });
    return response.data;
  }

  async getActiveTemplates(page: number = 0, size: number = 20): Promise<Page<ContractTemplate>> {
    const response = await apiClient.get<Page<ContractTemplate>>('/contracts/templates/active', {
      params: { page, size },
    });
    return response.data;
  }

  async getTemplatesByType(type: ContractType): Promise<ContractTemplate[]> {
    const response = await apiClient.get<ContractTemplate[]>(`/contracts/templates/type/${type}`);
    return response.data;
  }

  async searchTemplates(search: string, page: number = 0, size: number = 20): Promise<Page<ContractTemplate>> {
    const response = await apiClient.get<Page<ContractTemplate>>('/contracts/templates/search', {
      params: { search, page, size },
    });
    return response.data;
  }

  async updateTemplate(id: string, data: CreateContractTemplateRequest): Promise<ContractTemplate> {
    const response = await apiClient.put<ContractTemplate>(`/contracts/templates/${id}`, data);
    return response.data;
  }

  async deleteTemplate(id: string): Promise<void> {
    await apiClient.delete(`/contracts/templates/${id}`);
  }

  async toggleTemplateActive(id: string): Promise<ContractTemplate> {
    const response = await apiClient.patch<ContractTemplate>(`/contracts/templates/${id}/toggle-active`);
    return response.data;
  }

  // ===================== Helpers =====================

  getTypeLabel(type: ContractType): string {
    const labels: Record<ContractType, string> = {
      EMPLOYMENT: 'Employment Contract',
      VENDOR: 'Vendor Contract',
      NDA: 'Non-Disclosure Agreement',
      SLA: 'Service Level Agreement',
      FREELANCER: 'Freelancer Agreement',
      OTHER: 'Other',
    };
    return labels[type] || type;
  }

  getStatusLabel(status: ContractStatus): string {
    const labels: Record<ContractStatus, string> = {
      DRAFT: 'Draft',
      PENDING_REVIEW: 'Pending Review',
      PENDING_SIGNATURES: 'Pending Signatures',
      ACTIVE: 'Active',
      EXPIRED: 'Expired',
      TERMINATED: 'Terminated',
      RENEWED: 'Renewed',
    };
    return labels[status] || status;
  }

  getStatusColor(status: ContractStatus): string {
    const colors: Record<ContractStatus, string> = {
      DRAFT: 'bg-[var(--bg-surface)] text-[var(--text-secondary)]',
      PENDING_REVIEW: 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300',
      PENDING_SIGNATURES: 'bg-warning-100 text-warning-700 dark:bg-warning-900 dark:text-warning-300',
      ACTIVE: 'bg-success-100 text-success-700 dark:bg-success-900 dark:text-success-300',
      EXPIRED: 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300',
      TERMINATED: 'bg-danger-100 text-danger-700 dark:bg-danger-900 dark:text-danger-300',
      RENEWED: 'bg-accent-100 text-accent-700 dark:bg-accent-900 dark:text-accent-300',
    };
    return colors[status] || colors.DRAFT;
  }

  formatCurrency(value: number | undefined, currency: string = 'USD'): string {
    if (value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency,
    }).format(value);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}

export const contractService = new ContractService();
