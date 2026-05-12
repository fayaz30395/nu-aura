package com.nulogic.api.preboarding.dto;

import lombok.Data;

@Data
public class UpdateBankDetailsRequest {
    private String bankAccountNumber;
    private String bankName;
    private String bankIfscCode;
    private String taxId;
}
