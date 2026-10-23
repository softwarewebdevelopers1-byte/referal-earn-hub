package com.crlzTech.referal.admin;

import com.crlzTech.referal.admin.dto.AdminActionRequest;
import com.crlzTech.referal.admin.dto.AdminDashboardResponse;
import com.crlzTech.referal.admin.dto.AdminUserRow;
import com.crlzTech.referal.common.enums.PaymentStatus;
import com.crlzTech.referal.common.enums.Role;
import com.crlzTech.referal.payment.PaymentService;
import com.crlzTech.referal.security.CurrentUser;
import com.crlzTech.referal.user.UserRepository;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final PaymentService paymentService;
    private final UserRepository userRepository;

    public AdminController(AdminService adminService, PaymentService paymentService, UserRepository userRepository) {
        this.adminService = adminService;
        this.paymentService = paymentService;
        this.userRepository = userRepository;
    }

    @GetMapping("/dashboard")
    public AdminDashboardResponse dashboard() {
        return adminService.dashboard();
    }

    @GetMapping("/users")
    public Page<AdminUserRow> users(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) PaymentStatus status) {
        return adminService.searchUsers(q, role, status, page, size);
    }

    @PostMapping("/payments/{id}/approve")
    public void approve(@PathVariable Long id, @RequestBody(required = false) AdminActionRequest req) {
        paymentService.approveManually(id, req == null ? "Manual approval" : req.reason());
    }

    @PostMapping("/payments/{id}/reject")
    public void reject(@PathVariable Long id, @Valid @RequestBody AdminActionRequest req) {
        paymentService.rejectManually(id, req.reason());
    }

    @PostMapping("/users/{id}/suspend")
    public void suspend(@PathVariable Long id, @RequestBody(required = false) AdminActionRequest req) {
        Long currentAdminId = CurrentUser.id();
        if (id.equals(currentAdminId)) {
            throw new org.springframework.web.server.ResponseStatusException(
                    org.springframework.http.HttpStatus.CONFLICT, "Cannot suspend your own account");
        }
        userRepository.findById(id).ifPresent(u -> {
            u.setAccountStatus(com.crlzTech.referal.common.enums.AccountStatus.SUSPENDED);
            userRepository.save(u);
        });
    }

    @PostMapping("/users/{id}/reactivate")
    public void reactivate(@PathVariable Long id) {
        userRepository.findById(id).ifPresent(u -> {
            u.setAccountStatus(com.crlzTech.referal.common.enums.AccountStatus.ACTIVE);
            userRepository.save(u);
        });
    }
}
