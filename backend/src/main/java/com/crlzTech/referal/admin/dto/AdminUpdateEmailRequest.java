package com.crlzTech.referal.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AdminUpdateEmailRequest(
        @NotBlank @Email @Size(max = 160) String email) {
}
