package com.crlzTech.referal.user;

import com.crlzTech.referal.security.CurrentUser;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/profile")
public class ProfileController {

    private final UserRepository userRepository;

    public ProfileController(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public record UpdateProfileRequest(
            @NotBlank @Size(min = 2, max = 80) String firstName,
            @NotBlank @Size(min = 2, max = 80) String lastName,
            @NotBlank @Pattern(regexp = "^\\+?[0-9]{9,15}$") String phone) {
    }

    @GetMapping
    public Map<String, Object> me() {
        User u = CurrentUser.require();
        return Map.of(
                "id", u.getId(), "firstName", u.getFirstName(), "lastName", u.getLastName(),
                "email", u.getEmail(), "phone", u.getPhone(), "referralCode", u.getReferralCode(),
                "paymentStatus", u.getPaymentStatus().name(), "role", u.getRole().name(),
                "createdAt", u.getCreatedAt());
    }

    @PatchMapping
    public Map<String, Object> update(@Valid @RequestBody UpdateProfileRequest req) {
        User u = CurrentUser.require();
        u.setFirstName(req.firstName().trim());
        u.setLastName(req.lastName().trim());
        u.setPhone(req.phone().trim());
        userRepository.save(u);
        return me();
    }
}
