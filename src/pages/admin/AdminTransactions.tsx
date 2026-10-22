import { useMemo, useState } from "react";
import {
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  FileType2,
} from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useApp } from "../../context/AppContext";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Modal,
  Pagination,
  SelectInput,
  TextInput,
  statusTone,
  humanizeStatus,
} from "../../components/ui";
import { formatMoney } from "../../data/dummyData";
import type { Transaction } from "../../types";
import styles from "./Admin.module.css";

const PAGE_SIZE = 10;

export function AdminTransactions() {
  const { transactions, notify } = useApp();
  const [query, setQuery] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [page, setPage] = useState(1);
  const [detail, setDetail] = useState<Transaction | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return transactions.filter((t) => {
      if (type !== "ALL" && t.type !== type) return false;
      if (status !== "ALL" && t.status !== status) return false;
      if (!q) return true;
      return (
        t.ref.toLowerCase().includes(q) ||
        t.userName.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    });
  }, [transactions, type, status, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const rows = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  const totalAmount = filtered.reduce((s, t) => s + t.amount, 0);

  const exportCsv = () => {
    const header = [
      "Reference",
      "User",
      "Type",
      "Description",
      "Date",
      "Amount",
      "Status",
    ];
    const lines = [
      `"EarnHub Transaction Report"`,
      `"Exported: ${new Date().toISOString()}"`,
      `"Filters: type=${type}, status=${status}, query=${query || "—"}"`,
      "",
      header.map((h) => `"${h}"`).join(","),
      ...filtered.map((t) =>
        [
          t.ref,
          t.userName,
          humanizeStatus(t.type),
          t.description,
          new Date(t.createdAt).toISOString(),
          t.amount.toFixed(2),
          humanizeStatus(t.status),
        ]
          .map((v) => `"${String(v).replace(/"/g, '""')}"`)
          .join(","),
      ),
      "",
      `"Total","","","","",${totalAmount.toFixed(2)},""`,
    ];
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    triggerDownload(blob, `earnhub-transactions-${Date.now()}.csv`);
    notify("CSV exported.", "success");
  };

  const exportXlsx = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["EarnHub Transaction Report"],
      [`Exported: ${new Date().toISOString()}`],
      [`Filters: type=${type}, status=${status}, query=${query || "—"}`],
      [],
      ["Reference", "User", "Type", "Description", "Date", "Amount", "Status"],
      ...filtered.map((t) => [
        t.ref,
        t.userName,
        humanizeStatus(t.type),
        t.description,
        new Date(t.createdAt).toISOString(),
        t.amount,
        humanizeStatus(t.status),
      ]),
      [],
      ["Total", "", "", "", "", totalAmount, ""],
    ]);
    ws["!cols"] = [
      { wch: 16 },
      { wch: 20 },
      { wch: 18 },
      { wch: 34 },
      { wch: 22 },
      { wch: 12 },
      { wch: 12 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    const buf = XLSX.write(wb, {
      bookType: "xlsx",
      type: "array",
    }) as ArrayBuffer;
    triggerDownload(
      new Blob([buf], { type: "application/octet-stream" }),
      `earnhub-transactions-${Date.now()}.xlsx`,
    );
    notify("XLSX exported.", "success");
  };

  const exportPdf = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(16);
    doc.text("EarnHub — Transaction Report", 14, 16);
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 22);
    doc.text(
      `Filters: type=${type}, status=${status}, query=${query || "—"}`,
      14,
      28,
    );
    autoTable(doc, {
      startY: 34,
      head: [["Reference", "User", "Type", "Date", "Amount", "Status"]],
      body: filtered.map((t) => [
        t.ref,
        t.userName,
        humanizeStatus(t.type),
        new Date(t.createdAt).toLocaleDateString(),
        formatMoney(t.amount),
        humanizeStatus(t.status),
      ]),
      styles: { fontSize: 9 },
      headStyles: { fillColor: [249, 115, 22] },
      foot: [["Total", "", "", "", formatMoney(totalAmount), ""]],
      footStyles: { fillColor: [240, 236, 232], textColor: [33, 27, 23] },
    });
    doc.save(`earnhub-transactions-${Date.now()}.pdf`);
    notify("PDF exported.", "success");
  };

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.h1}>Transaction management</h1>
        <p className={styles.sub}>
          Inspect and export platform transactions. Exports respect active
          filters.
        </p>
      </div>

      <Card>
        <CardHeader
          title="Transactions"
          subtitle={`${filtered.length} records · Total ${formatMoney(totalAmount)}`}
          action={
            <div className={styles.exportRow}>
              <Button
                size="sm"
                variant="secondary"
                icon={<FileText size={14} />}
                onClick={exportCsv}
              >
                CSV
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<FileSpreadsheet size={14} />}
                onClick={exportXlsx}
              >
                XLSX
              </Button>
              <Button
                size="sm"
                variant="secondary"
                icon={<FileType2 size={14} />}
                onClick={exportPdf}
              >
                PDF
              </Button>
            </div>
          }
        />
        <div
          className={styles.filters}
          style={{ marginBottom: "var(--space-3)" }}
        >
          <TextInput
            placeholder="Search reference, user, or description…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
          <SelectInput
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All types</option>
            <option value="REFERRAL_REWARD">Referral reward</option>
            <option value="VIDEO_REWARD">Video reward</option>
            <option value="WITHDRAWAL">Withdrawal</option>
            <option value="PAYMENT_SUBMISSION">Payment</option>
          </SelectInput>
          <SelectInput
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
          </SelectInput>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Reference</th>
                <th>User</th>
                <th>Type</th>
                <th>Date</th>
                <th className={styles.right}>Amount</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td data-label="Reference">
                    <code className={styles.code}>{t.ref}</code>
                  </td>
                  <td data-label="User">{t.userName}</td>
                  <td data-label="Type">{humanizeStatus(t.type)}</td>
                  <td data-label="Date">
                    {new Date(t.createdAt).toLocaleDateString()}
                  </td>
                  <td data-label="Amount" className={styles.right}>
                    <span
                      style={{
                        color:
                          t.amount >= 0 ? "var(--success)" : "var(--danger)",
                        fontWeight: 600,
                      }}
                    >
                      {formatMoney(t.amount)}
                    </span>
                  </td>
                  <td data-label="Status">
                    <Badge tone={statusTone(t.status)}>
                      {humanizeStatus(t.status)}
                    </Badge>
                  </td>
                  <td className={styles.right}>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDetail(t)}
                      icon={<Eye size={14} />}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No transactions match your filters" />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={currentPage}
          pageCount={pageCount}
          onChange={setPage}
        />
        <p
          style={{
            fontSize: 12,
            color: "var(--text-muted)",
            marginTop: "var(--space-3)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Download size={14} /> Exports generate real files in your browser
          from the currently filtered dataset.
        </p>
      </Card>

      <Modal
        open={!!detail}
        title="Transaction details"
        onClose={() => setDetail(null)}
      >
        {detail && (
          <dl className={styles.dl}>
            <div>
              <dt>Reference</dt>
              <dd>{detail.ref}</dd>
            </div>
            <div>
              <dt>User</dt>
              <dd>{detail.userName}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{humanizeStatus(detail.type)}</dd>
            </div>
            <div>
              <dt>Description</dt>
              <dd>{detail.description}</dd>
            </div>
            <div>
              <dt>Date</dt>
              <dd>{new Date(detail.createdAt).toLocaleString()}</dd>
            </div>
            <div>
              <dt>Amount</dt>
              <dd>{formatMoney(detail.amount)}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd>
                <Badge tone={statusTone(detail.status)}>
                  {humanizeStatus(detail.status)}
                </Badge>
              </dd>
            </div>
          </dl>
        )}
      </Modal>
    </div>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
