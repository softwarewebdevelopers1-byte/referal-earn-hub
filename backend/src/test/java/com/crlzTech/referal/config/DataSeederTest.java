package com.crlzTech.referal.config;

import com.crlzTech.referal.common.enums.Role;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

class DataSeederTest {

    @Test
    void seedsTheConfiguredAdminWithTheRequestedCredentials() {
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(users.count()).thenReturn(0L);
        when(users.findByEmailIgnoreCase(anyString())).thenReturn(Optional.empty());
        when(encoder.encode(anyString())).thenAnswer(invocation -> "encoded:" + invocation.getArgument(0));
        List<User> savedUsers = new ArrayList<>();
        doAnswer(invocation -> {
            savedUsers.addAll(invocation.getArgument(0));
            return invocation.getArgument(0);
        }).when(users).saveAll(any());

        DataSeeder seeder = new DataSeeder(
                users,
                encoder,
                true,
                "earn.hub@gmail.com",
                "s0l!du$er",
                "referrer@example.com",
                "referrer-password",
                "+254700000001");

        seeder.run();

        verify(users).saveAll(any());
        User admin = savedUsers.stream()
                .filter(user -> "earn.hub@gmail.com".equals(user.getEmail()))
                .findFirst()
                .orElseThrow();
        assertEquals(Role.ADMIN, admin.getRole());
        assertEquals("encoded:s0l!du$er", admin.getPasswordHash());
    }
}
