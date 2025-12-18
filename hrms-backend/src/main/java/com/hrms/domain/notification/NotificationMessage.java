package com.hrms.domain.notification;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationMessage {
    private String type;
    private String title;
    private String message;
    private Object payload;
    private long timestamp;
}
