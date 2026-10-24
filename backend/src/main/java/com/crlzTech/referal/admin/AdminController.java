package com.crlzTech.referal.admin;

import com.crlzTech.referal.admin.dto.AdminActionRequest;
import com.crlzTech.referal.admin.dto.AdminCreateUserRequest;
import com.crlzTech.referal.admin.dto.AdminDashboardResponse;
import com.crlzTech.referal.admin.dto.AdminResetPasswordRequest;
import com.crlzTech.referal.admin.dto.AdminTransactionSummary;
import com.crlzTech.referal.admin.dto.AdminUpdateEmailRequest;
import com.crlzTech.referal.admin.dto.AdminUserRow;
import com.crlzTech.referal.common.enums.LedgerStatus;
import com.crlzTech.referal.common.enums.LedgerType;
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

    @GetMapping("/payments")
    public Page<com.crlzTech.referal.admin.dto.AdminPaymentRow> payments(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return adminService.searchPayments(page, size);
    }

    @GetMapping("/transactions")
    public Page<com.crlzTech.referal.admin.dto.AdminTransactionRow> transactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) LedgerType type,
            @RequestParam(required = false) LedgerStatus status) {
        return adminService.searchTransactions(date, q, type, status, page, size);
    }

    @GetMapping("/transactions/summary")
    public AdminTransactionSummary transactionSummary(
            @RequestParam(required = false) String date,
            @RequestParam(required = false) String q,
            @RequestParam(required = false) LedgerType type,
            @RequestParam(required = false) LedgerStatus status) {
        return adminService.summarizeTransactions(date, q, type, status);
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
        var user = userRepository.findById(id).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
        user.setAccountStatus(com.crlzTech.referal.common.enums.AccountStatus.SUSPENDED);
        userRepository.save(user);
    }

    @PostMapping("/users/{id}/reactivate")
    public void reactivate(@PathVariable Long id) {
        var user = userRepository.findById(id).orElseThrow(() -> new org.springframework.web.server.ResponseStatusException(
                org.springframework.http.HttpStatus.NOT_FOUND, "User not found"));
        user.setAccountStatus(com.crlzTech.referal.common.enums.AccountStatus.ACTIVE);
        userRepository.save(user);
    }

    @PostMapping("/users")
    @ResponseStatus(org.springframework.http.HttpStatus.CREATED)
    public AdminUserRow createUser(@Valid @RequestBody AdminCreateUserRequest request) {
        return adminService.createUser(request);
    }

    @PatchMapping("/users/{id}/email")
    public AdminUserRow updateEmail(@PathVariable Long id, @Valid @RequestBody AdminUpdateEmailRequest request) {
        return adminService.updateEmail(id, request);
    }

    @PostMapping("/users/{id}/password-reset")
    @ResponseStatus(org.springframework.http.HttpStatus.NO_CONTENT)
    public void resetPassword(@PathVariable Long id, @Valid @RequestBody AdminResetPasswordRequest request) {
        adminService.resetPassword(id, request);
    }
}
