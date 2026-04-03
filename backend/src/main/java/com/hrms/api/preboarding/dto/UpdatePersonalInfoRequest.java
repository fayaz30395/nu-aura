package com.hrms.api.preboarding.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdatePersonalInfoRequest {
    private LocalDate dateOfBirth;
    private String address;
    private String city;
    private String state;
    private String postalCode;
    private String country;
    private String phoneNumber;
    private String emergencyContactNumber;
    private String emergencyContactName;
}
