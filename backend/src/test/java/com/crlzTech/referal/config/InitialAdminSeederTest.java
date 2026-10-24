package com.crlzTech.referal.config;

import com.crlzTech.referal.common.enums.Role;
import com.crlzTech.referal.user.User;
import com.crlzTech.referal.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicLong;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class InitialAdminSeederTest {

    @Test
    void createsOneHashedRegularAdminOnAnEmptyDatabase() {
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(users.count()).thenReturn(0L);
        when(encoder.encode("local-strong-password")).thenReturn("$2a$hashed-value");
        when(users.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        new InitialAdminSeeder(users, encoder, "ADMIN@Example.com", "local-strong-password")
                .run(new DefaultApplicationArguments(new String[0]));

        var captor = org.mockito.ArgumentCaptor.forClass(User.class);
        verify(users).save(captor.capture());
        User admin = captor.getValue();
        assertEquals("admin@example.com", admin.getEmail());
        assertEquals(Role.ADMIN, admin.getRole());
        assertEquals("$2a$hashed-value", admin.getPasswordHash());
        verify(encoder).encode("local-strong-password");
    }

    @Test
    void existingUsersAreNotChangedOrOverwritten() {
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        when(users.count()).thenReturn(2L);

        new InitialAdminSeeder(users, encoder, "admin@example.com", "local-strong-password")
                .run(new DefaultApplicationArguments(new String[0]));

        verify(users, never()).save(any());
        verifyNoInteractions(encoder);
    }

    @Test
    void missingOrPlaceholderCredentialsFailOnlyWhenSeedingIsNeeded() {
        UserRepository users = mock(UserRepository.class);
        when(users.count()).thenReturn(0L);
        PasswordEncoder encoder = mock(PasswordEncoder.class);

        assertThrows(IllegalStateException.class,
                () -> new InitialAdminSeeder(users, encoder, "", "replace_me_with_a_strong_unique_password")
                        .run(new DefaultApplicationArguments(new String[0])));
        verifyNoInteractions(encoder);
    }

    @Test
    void repeatedExecutionDoesNotCreateDuplicateUsers() {
        UserRepository users = mock(UserRepository.class);
        PasswordEncoder encoder = mock(PasswordEncoder.class);
        AtomicLong count = new AtomicLong(0);
        when(users.count()).thenAnswer(invocation -> count.get());
        when(encoder.encode(anyString())).thenReturn("hashed");
        when(users.save(any(User.class))).thenAnswer(invocation -> {
            count.incrementAndGet();
            return invocation.getArgument(0);
        });
        InitialAdminSeeder seeder = new InitialAdminSeeder(users, encoder, "admin@example.com", "local-strong-password");

        seeder.run(new DefaultApplicationArguments(new String[0]));
        seeder.run(new DefaultApplicationArguments(new String[0]));

        verify(users, times(1)).save(any(User.class));
        verify(encoder, times(1)).encode(anyString());
    }
}
