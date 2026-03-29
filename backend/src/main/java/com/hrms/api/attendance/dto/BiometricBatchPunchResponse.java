package com.hrms.api.attendance.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class BiometricBatchPunchResponse {

    private int totalReceived;
    private int accepted;
    private int rejected;
    private List<BiometricPunchResponse> results;
}
