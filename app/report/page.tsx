import { Suspense } from "react";
import { ScanView } from "@/components/scan-view";

export const dynamic = "force-dynamic";

export default function ReportPage() {
  return (
    <Suspense fallback={null}>
      <ScanView />
    </Suspense>
  );
}
