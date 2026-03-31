package com.nulogic.pm.api.dto;

import com.nulogic.pm.domain.project.ProjectMember;
import com.nulogic.pm.domain.project.ProjectMember.ProjectRole;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

public class MemberDTO {

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AddRequest {
        private UUID projectId;
        private UUID userId;
        private String userName;
        private String email;
        private ProjectRole role;
        private Integer hoursPerWeek;
        private String department;
        private String designation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UpdateRequest {
        private ProjectRole role;
        private Integer hoursPerWeek;
        private String department;
        private String designation;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Response {
        private UUID id;
        private UUID projectId;
        private UUID userId;
        private String userName;
        private String email;
        private ProjectRole role;
        private LocalDate joinedDate;
        private LocalDate leftDate;
        private Boolean isActive;
        private Integer hoursPerWeek;
        private String department;
        private String designation;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        public static Response fromEntity(ProjectMember member) {
            return Response.builder()
                    .id(member.getId())
                    .projectId(member.getProjectId())
                    .userId(member.getUserId())
                    .userName(member.getUserName())
                    .email(member.getEmail())
                    .role(member.getRole())
                    .joinedDate(member.getJoinedDate())
                    .leftDate(member.getLeftDate())
                    .isActive(member.getIsActive())
                    .hoursPerWeek(member.getHoursPerWeek())
                    .department(member.getDepartment())
                    .designation(member.getDesignation())
                    .createdAt(member.getCreatedAt())
                    .updatedAt(member.getUpdatedAt())
                    .build();
        }
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ListResponse {
        private UUID id;
        private UUID userId;
        private String userName;
        private String email;
        private ProjectRole role;
        private Boolean isActive;
        private String designation;

        public static ListResponse fromEntity(ProjectMember member) {
            return ListResponse.builder()
                    .id(member.getId())
                    .userId(member.getUserId())
                    .userName(member.getUserName())
                    .email(member.getEmail())
                    .role(member.getRole())
                    .isActive(member.getIsActive())
                    .designation(member.getDesignation())
                    .build();
        }
    }
}
