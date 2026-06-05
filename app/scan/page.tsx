import { Suspense } from "react";
import { ScanView } from "@/components/scan-view";

export const dynamic = "force-dynamic";

export default function ScanPage() {
  return (
    <Suspense fallback={null}>
      <ScanView />
    </Suspense>
  );
}
