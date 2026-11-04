"use client";
import { useState } from "react";
import Modal, { Button, FormField, TextInput } from "@/components/Modal";
import { showToast } from "@/lib/storage";

/** Demo "forgot password": validates input and pretends to send a reset link. */
export default function ForgotPasswordModal({
  open,
  onClose,
  label,
  placeholder,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  placeholder: string;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const close = () => {
    setValue("");
    setError(null);
    setSent(false);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="Reset your password"
      size="sm"
      footer={
        sent ? (
          <Button onClick={close}>Done</Button>
        ) : (
          <>
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button
              variant="accent"
              onClick={() => {
                // Lower-case only a leading capitalised word ("Email" → "email"), keeping acronyms ("SV").
                if (value.trim().length < 4) return setError(`Enter your ${label.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase())}.`);
                setSent(true);
                showToast("Password reset instructions sent", "info");
              }}
            >
              Send reset link
            </Button>
          </>
        )
      }
    >
      {sent ? (
        <p className="text-sm dm-text-secondary">
          If <span className="font-semibold dm-text">{value}</span> matches an account, we&apos;ve sent reset instructions by SMS and email.
          In this demo nothing is actually sent — sign in with the demo credentials.
        </p>
      ) : (
        <FormField label={label} required error={error}>
          <TextInput value={value} onChange={setValue} placeholder={placeholder} />
        </FormField>
      )}
    </Modal>
  );
}
