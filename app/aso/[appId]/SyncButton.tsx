"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/Button";

export function SyncButton({ appId }: { appId: string }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "syncing" | "done" | "error">("idle");

  async function sync() {
    setState("syncing");
    try {
      const res = await fetch(`/api/aso/${appId}/sync`, { method: "POST" });
      setState(res.ok ? "done" : "error");
      if (res.ok) {
        setTimeout(() => { setState("idle"); router.refresh(); }, 1500);
      }
    } catch {
      setState("error");
    }
  }

  return (
    <Button
      variant={state === "error" ? "danger" : state === "done" ? "secondary" : "primary"}
      size="sm"
      disabled={state === "syncing"}
      onClick={sync}
    >
      {state === "syncing" ? "同期中..." : state === "done" ? "完了 ✓" : state === "error" ? "エラー" : "Apptweak 同期"}
    </Button>
  );
}
