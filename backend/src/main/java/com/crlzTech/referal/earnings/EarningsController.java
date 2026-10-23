package com.crlzTech.referal.earnings;

import com.crlzTech.referal.common.enums.LedgerStatus;
import com.crlzTech.referal.common.enums.LedgerType;
import com.crlzTech.referal.earnings.dto.EarningsSummaryResponse;
import com.crlzTech.referal.security.CurrentUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/earnings")
public class EarningsController {

    private final EarningsService earningsService;
    private final LedgerEntryRepository ledgerRepository;

    public EarningsController(EarningsService earningsService, LedgerEntryRepository ledgerRepository) {
        this.earningsService = earningsService;
        this.ledgerRepository = ledgerRepository;
    }

    @GetMapping("/summary")
    public EarningsSummaryResponse summary() {
        return earningsService.summary();
    }

    @GetMapping("/transactions")
    public Page<LedgerEntry> transactions(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) LedgerType type,
            @RequestParam(required = false) LedgerStatus status) {
        return ledgerRepository.searchByUser(
                CurrentUser.id(), type, status,
                PageRequest.of(page, Math.min(size, 100), Sort.by(Sort.Direction.DESC, "createdAt")));
    }
}
