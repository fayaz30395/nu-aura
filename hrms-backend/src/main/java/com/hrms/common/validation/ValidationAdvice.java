package com.hrms.common.validation;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.springframework.stereotype.Component;

import java.lang.reflect.Field;
import java.lang.reflect.InaccessibleObjectException;

/**
 * AOP advice for automatic input validation on controller methods.
 * Validates and sanitizes String fields in request DTOs.
 */
@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class ValidationAdvice {

    private final InputSanitizer inputSanitizer;

    /**
     * Validate all string parameters in controller request bodies.
     */
    @Before("execution(* com.hrms.api..controller.*.*(..)) && args(.., @org.springframework.web.bind.annotation.RequestBody body)")
    public void validateRequestBody(JoinPoint joinPoint, Object body) {
        if (body == null) {
            return;
        }

        validateObject(body, body.getClass().getSimpleName());
    }

    private void validateObject(Object obj, String objectName) {
        Class<?> clazz = obj.getClass();

        // Skip validation for core Java types and non-application classes
        String packageName = clazz.getPackageName();
        if (packageName.startsWith("java.") || packageName.startsWith("javax.") ||
            packageName.startsWith("sun.") || packageName.startsWith("jdk.")) {
            return;
        }

        for (Field field : clazz.getDeclaredFields()) {
            // Skip synthetic fields and static fields
            if (field.isSynthetic() || java.lang.reflect.Modifier.isStatic(field.getModifiers())) {
                continue;
            }

            try {
                field.setAccessible(true);
                if (field.isAnnotationPresent(SkipSanitization.class)) {
                    continue;
                }
                Object value = field.get(obj);

                if (value instanceof String stringValue) {
                    String fieldName = objectName + "." + field.getName();

                    // Check for dangerous content
                    if (inputSanitizer.containsXss(stringValue)) {
                        log.warn("XSS attempt detected in field: {}", fieldName);
                        throw new IllegalArgumentException(
                                "Invalid input: potentially malicious content in " + field.getName());
                    }

                    if (inputSanitizer.containsSqlInjection(stringValue)) {
                        log.warn("SQL injection attempt detected in field: {}", fieldName);
                        throw new IllegalArgumentException(
                                "Invalid input: invalid characters in " + field.getName());
                    }
                }
            } catch (IllegalAccessException | InaccessibleObjectException e) {
                log.debug("Could not access field: {}", field.getName());
            }
        }
    }
}
