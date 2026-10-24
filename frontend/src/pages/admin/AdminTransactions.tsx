import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, Download, Eye, FileSpreadsheet, FileText, FileType2, ListFilter, XCircle } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { adminApi } from "../../api/client";
import type { AdminTransactionRow, AdminTransactionSummary } from "../../api/types";
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, Modal, Pagination, SelectInput, TextInput, humanizeStatus, statusTone } from "../../components/ui";
import { StatCard } from "../../components/StatCard";
import { formatMoney } from "../../data/format";
import type { Transaction } from "../../types";
import styles from "./Admin.module.css";

const PAGE_SIZE = 10;
type Filters = { date?: string; q?: string; type?: string; status?: string };

function mapTransaction(row: AdminTransactionRow): Transaction {
  return { id: String(row.id), ref: row.reference, userId: String(row.userId), userName: row.userName, type: row.type as Transaction["type"], description: row.description, amount: Number(row.amount), status: row.status as Transaction["status"], createdAt: row.createdAt };
}

function filterParams(date: string, query: string, type: string, status: string): Filters {
  return { date: date || undefined, q: query.trim() || undefined, type: type === "ALL" ? undefined : type, status: status === "ALL" ? undefined : status };
}

async function loadAllMatching(filters: Filters): Promise<Transaction[]> {
  const first = await adminApi.transactions(0, 100, filters);
  if (first.totalPages <= 1) return first.content.map(mapTransaction);
  const rest = await Promise.all(Array.from({ length: first.totalPages - 1 }, (_, index) => adminApi.transactions(index + 1, 100, filters)));
  return [first, ...rest].flatMap((page) => page.content.map(mapTransaction));
}

export function AdminTransactions() {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [date, setDate] = useState("");
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<AdminTransactionSummary | null>(null);
  const [pageCount, setPageCount] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [detail, setDetail] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const filters = useMemo(() => filterParams(date, query, type, status), [date, query, type, status]);

  useEffect(() => {
    const sequence = ++requestSequence.current;
    setLoading(true);
    setListError(null);
    setSummaryError(null);
    Promise.allSettled([adminApi.transactions(page - 1, PAGE_SIZE, filters), adminApi.transactionSummary(filters)]).then(([listResult, summaryResult]) => {
      if (sequence !== requestSequence.current) return;
      if (listResult.status === "fulfilled") {
        setRows(listResult.value.content.map(mapTransaction));
        setTotalElements(listResult.value.totalElements);
        setPageCount(Math.max(1, listResult.value.totalPages));
      } else {
        setRows([]);
        setListError(listResult.reason instanceof Error ? listResult.reason.message : "Transactions could not be loaded.");
      }
      if (summaryResult.status === "fulfilled") setSummary(summaryResult.value);
      else {
        setSummary(null);
        setSummaryError(summaryResult.reason instanceof Error ? summaryResult.reason.message : "The transaction summary could not be loaded.");
      }
      setLoading(false);
    });
  }, [filters, page]);

  const clearFilters = () => { setQuery(""); setType("ALL"); setStatus("ALL"); setDate(""); setPage(1); };
  const runExport = async (kind: "csv" | "xlsx" | "pdf") => {
    setExporting(true);
    try {
      const allRows = await loadAllMatching(filters);
      const totalAmount = allRows.reduce((sum, row) => sum + row.amount, 0);
      if (kind === "csv") exportCsv(allRows, totalAmount, filters);
      if (kind === "xlsx") exportXlsx(allRows, totalAmount, filters);
      if (kind === "pdf") exportPdf(allRows, totalAmount, filters);
    } catch { setListError("The export could not be prepared. Please try again."); }
    finally { setExporting(false); }
  };

  return <div className={styles.wrap}>
    <div><h1 className={styles.h1}>Transaction management</h1><p className={styles.sub}>Inspect the unified earnings ledger. Date and status totals cover every matching record, not only the visible page.</p></div>

    <div className={styles.statGrid}>
      <StatCard icon={<ListFilter size={18} />} label="Matching records" value={summary ? String(summary.matchingCount) : "—"} hint={summary ? "All active filters" : "Summary unavailable"} />
      <StatCard icon={<Download size={18} />} label="Matching ledger total" value={summary ? formatMoney(summary.matchingAmount, 2) : "—"} hint={summary?.currency ?? "KES"} accent />
      <StatCard icon={<Clock3 size={18} />} label="Pending" value={summary ? `${summary.pendingCount} · ${formatMoney(summary.pendingAmount, 2)}` : "—"} />
      <StatCard icon={<CheckCircle2 size={18} />} label="Completed" value={summary ? `${summary.completedCount} · ${formatMoney(summary.completedAmount, 2)}` : "—"} />
    </div>
    <div className={styles.statGrid}><StatCard icon={<XCircle size={18} />} label="Failed" value={summary ? `${summary.failedCount} · ${formatMoney(summary.failedAmount, 2)}` : "—"} /></div>

    <Card>
      <CardHeader title="Transactions" subtitle={loading ? "Loading matching records…" : `${totalElements} records · Ledger totals above are not limited by pagination`} action={<div className={styles.exportRow}>
        <Button size="sm" variant="secondary" icon={<FileText size={14} />} onClick={() => void runExport("csv")} loading={exporting}>CSV</Button>
        <Button size="sm" variant="secondary" icon={<FileSpreadsheet size={14} />} onClick={() => void runExport("xlsx")} loading={exporting}>XLSX</Button>
        <Button size="sm" variant="secondary" icon={<FileType2 size={14} />} onClick={() => void runExport("pdf")} loading={exporting}>PDF</Button>
      </div>} />
      <div className={styles.filters} style={{ marginBottom: "var(--space-3)" }}>
        <TextInput placeholder="Search reference, user, or description…" value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} />
        <TextInput aria-label="Filter by date" type="date" value={date} onChange={(event) => { setDate(event.target.value); setPage(1); }} />
        <SelectInput value={type} onChange={(event) => { setType(event.target.value); setPage(1); }}><option value="ALL">All types</option><option value="REFERRAL_REWARD">Referral reward</option><option value="VIDEO_REWARD">Video reward</option><option value="WITHDRAWAL">Withdrawal</option><option value="PAYMENT_SUBMISSION">Payment</option><option value="ADJUSTMENT">Adjustment</option></SelectInput>
        <SelectInput value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="ALL">All statuses</option><option value="COMPLETED">Completed</option><option value="PENDING">Pending</option><option value="FAILED">Failed</option></SelectInput>
        <Button size="sm" variant="ghost" onClick={clearFilters}>Clear filters</Button>
      </div>
      {summaryError && <div style={{ marginBottom: "var(--space-3)" }}><ErrorState message={`Transaction list loaded, but totals are unavailable: ${summaryError}`} /></div>}
      {listError && <div style={{ marginBottom: "var(--space-3)" }}><ErrorState message={listError} /></div>}
      <div className={styles.tableWrap} aria-busy={loading}><table className={styles.table}>
        <thead><tr><th>Reference</th><th>User</th><th>Type</th><th>Date</th><th className={styles.right}>Amount</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((transaction) => <tr key={transaction.id}><td data-label="Reference"><code className={styles.code}>{transaction.ref}</code></td><td data-label="User">{transaction.userName}</td><td data-label="Type">{humanizeStatus(transaction.type)}</td><td data-label="Date">{new Date(transaction.createdAt).toLocaleDateString()}</td><td data-label="Amount" className={styles.right}><span style={{ color: transaction.amount >= 0 ? "var(--success)" : "var(--danger)", fontWeight: 600 }}>{formatMoney(transaction.amount, 2)}</span></td><td data-label="Status"><Badge tone={statusTone(transaction.status)}>{humanizeStatus(transaction.status)}</Badge></td><td className={styles.right}><Button size="sm" variant="ghost" onClick={() => setDetail(transaction)} icon={<Eye size={14} />}>View</Button></td></tr>)}
          {!loading && rows.length === 0 && <tr><td colSpan={7}><EmptyState title="No transactions match your filters" message="Try another date, status, type, or search term." /></td></tr>}
          {loading && <tr><td colSpan={7}><EmptyState title="Loading transactions…" /></td></tr>}
        </tbody>
      </table></div>
      <Pagination page={Math.min(page, pageCount)} pageCount={pageCount} onChange={setPage} />
      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: "var(--space-3)", display: "flex", alignItems: "center", gap: 6 }}><Download size={14} /> Exports fetch the complete filtered result set before creating the file.</p>
    </Card>

    <Modal open={!!detail} title="Transaction details" onClose={() => setDetail(null)}>{detail && <dl className={styles.dl}><div><dt>Reference</dt><dd>{detail.ref}</dd></div><div><dt>User</dt><dd>{detail.userName}</dd></div><div><dt>Type</dt><dd>{humanizeStatus(detail.type)}</dd></div><div><dt>Description</dt><dd>{detail.description}</dd></div><div><dt>Date</dt><dd>{new Date(detail.createdAt).toLocaleString()}</dd></div><div><dt>Amount</dt><dd>{formatMoney(detail.amount, 2)}</dd></div><div><dt>Status</dt><dd><Badge tone={statusTone(detail.status)}>{humanizeStatus(detail.status)}</Badge></dd></div></dl>}</Modal>
  </div>;
}

function reportFilterText(filters: Filters) { return `date=${filters.date ?? "—"}, type=${filters.type ?? "ALL"}, status=${filters.status ?? "ALL"}, query=${filters.q ?? "—"}`; }
function exportCsv(rows: Transaction[], total: number, filters: Filters) {
  const lines = ['"EarnHub Transaction Report"', `"Filters: ${reportFilterText(filters)}"`, "", ["Reference", "User", "Type", "Description", "Date", "Amount", "Status"].map((value) => `"${value}"`).join(","), ...rows.map((row) => [row.ref, row.userName, humanizeStatus(row.type), row.description, new Date(row.createdAt).toISOString(), row.amount.toFixed(2), humanizeStatus(row.status)].map((value) => `"${String(value).replace(/"/g, '""')}"`).join(",")), "", `"Matching ledger total","","","","",${total.toFixed(2)},""`];
  triggerDownload(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" }), `earnhub-transactions-${Date.now()}.csv`);
}
function exportXlsx(rows: Transaction[], total: number, filters: Filters) {
  const sheet = XLSX.utils.aoa_to_sheet([["EarnHub Transaction Report"], [`Filters: ${reportFilterText(filters)}`], [], ["Reference", "User", "Type", "Description", "Date", "Amount", "Status"], ...rows.map((row) => [row.ref, row.userName, humanizeStatus(row.type), row.description, new Date(row.createdAt).toISOString(), row.amount, humanizeStatus(row.status)]), [], ["Matching ledger total", "", "", "", "", total, ""]]);
  sheet["!cols"] = [{ wch: 16 }, { wch: 20 }, { wch: 18 }, { wch: 34 }, { wch: 22 }, { wch: 12 }, { wch: 12 }];
  const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, "Transactions");
  const buffer = XLSX.write(book, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  triggerDownload(new Blob([buffer], { type: "application/octet-stream" }), `earnhub-transactions-${Date.now()}.xlsx`);
}
function exportPdf(rows: Transaction[], total: number, filters: Filters) {
  const doc = new jsPDF({ orientation: "landscape" }); doc.setFontSize(16); doc.text("EarnHub — Transaction Report", 14, 16); doc.setFontSize(10); doc.setTextColor(100); doc.text(`Filters: ${reportFilterText(filters)}`, 14, 22);
  autoTable(doc, { startY: 28, head: [["Reference", "User", "Type", "Date", "Amount", "Status"]], body: rows.map((row) => [row.ref, row.userName, humanizeStatus(row.type), new Date(row.createdAt).toLocaleDateString(), formatMoney(row.amount, 2), humanizeStatus(row.status)]), styles: { fontSize: 9 }, headStyles: { fillColor: [249, 115, 22] }, foot: [["Matching ledger total", "", "", "", formatMoney(total, 2), ""]] });
  doc.save(`earnhub-transactions-${Date.now()}.pdf`);
}
function triggerDownload(blob: Blob, filename: string) { const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
