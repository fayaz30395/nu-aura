package com.nulogic.hrms.employee.dto;

import jakarta.validation.constraints.NotBlank;
import java.util.List;
import lombok.Data;

@Data
public class EmployeeSelfUpdateRequest {
    private String phone;
    private String currentAddress;
    private String permanentAddress;
    private List<EmergencyContact> emergencyContacts;
    private String profilePhotoUrl;

    @Data
    public static class EmergencyContact {
        @NotBlank(message = "Emergency contact name is required")
        private String name;

        @NotBlank(message = "Emergency contact relationship is required")
        private String relationship;

        @NotBlank(message = "Emergency contact phone is required")
        private String phone;
    }
}
