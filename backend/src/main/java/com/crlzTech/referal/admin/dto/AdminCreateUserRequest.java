package com.crlzTech.referal.admin.dto;

import com.crlzTech.referal.common.enums.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record AdminCreateUserRequest(
        @NotBlank @Size(min = 2, max = 80) String firstName,
        @NotBlank @Size(min = 2, max = 80) String lastName,
        @NotBlank @Email @Size(max = 160) String email,
        @NotBlank @Pattern(regexp = "^\\+?[0-9]{9,15}$", message = "Invalid phone") String phone,
        @NotNull Role role,
        @NotBlank @Size(min = 8, max = 100) String password) {
}
