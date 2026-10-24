import { useEffect, useState, type FormEvent } from "react";
import { LogOut, Save } from "lucide-react";
import { ApiError } from "../api/client";
import { useApp } from "../context/AppContext";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  Field,
  TextInput,
  statusTone,
  humanizeStatus,
} from "../components/ui";
import styles from "./Profile.module.css";

export function Profile() {
  const { currentUser, updateProfile, logout, theme, toggleTheme } = useApp();
  const [name, setName] = useState(currentUser?.name ?? "");
  const [phone, setPhone] = useState(currentUser?.phone ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!currentUser) return;
    setName(currentUser.name);
    setPhone(currentUser.phone);
  }, [currentUser?.name, currentUser?.phone]);

  if (!currentUser) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (name.trim().length < 2 || phone.trim().length < 9) {
      setError("Enter a valid name and phone number.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not update profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.wrap}>
      <div>
        <h1 className={styles.h1}>Profile & settings</h1>
        <p className={styles.sub}>
          Manage your account details and preferences.
        </p>
      </div>

      <div className={styles.grid}>
        <Card>
          <CardHeader title="Account overview" />
          <div className={styles.profileHead}>
            <div className={styles.avatarLg}>{currentUser.avatarSeed}</div>
            <div>
              <div className={styles.name}>{currentUser.name}</div>
              <div className={styles.email}>{currentUser.email}</div>
              <div
                style={{
                  marginTop: 6,
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                }}
              >
                <Badge tone={statusTone(currentUser.paymentStatus)}>
                  {humanizeStatus(currentUser.paymentStatus)}
                </Badge>
                <Badge tone="info">{humanizeStatus(currentUser.role)}</Badge>
                <Badge tone={statusTone(currentUser.accountStatus)}>
                  {humanizeStatus(currentUser.accountStatus)}
                </Badge>
              </div>
            </div>
          </div>
          <dl className={styles.dl}>
            <div>
              <dt>Referral code</dt>
              <dd>{currentUser.referralCode}</dd>
            </div>
            <div>
              <dt>Member since</dt>
              <dd>{new Date(currentUser.createdAt).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>{currentUser.phone}</dd>
            </div>
          </dl>
        </Card>

        <Card>
          <CardHeader
            title="Edit profile"
            subtitle="Update your basic information"
          />
          <form onSubmit={save}>
            <Field label="Full name" error={error}>
              <TextInput
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Phone number">
              <TextInput
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
            <Field label="Email (read-only)">
              <TextInput value={currentUser.email} readOnly />
            </Field>
            <Button type="submit" loading={saving} icon={<Save size={16} />}>
              Save changes
            </Button>
          </form>
        </Card>

        <Card>
          <CardHeader title="Preferences" />
          <div className={styles.prefRow}>
            <div>
              <div className={styles.prefLabel}>Theme</div>
              <div className={styles.prefHint}>
                Currently using {theme} mode.
              </div>
            </div>
            <Button variant="secondary" onClick={toggleTheme}>
              Toggle theme
            </Button>
          </div>
          <div className={styles.prefRow}>
            <div>
              <div className={styles.prefLabel}>Email notifications</div>
              <div className={styles.prefHint}>
                Simulated preference — no real emails are sent.
              </div>
            </div>
            <Badge tone="info">Enabled</Badge>
          </div>
        </Card>

        <Card>
          <CardHeader
            title="Session"
            subtitle="Sign out of this demo account"
          />
          <Button variant="danger" icon={<LogOut size={16} />} onClick={logout}>
            Log out
          </Button>
        </Card>
      </div>
    </div>
  );
}
