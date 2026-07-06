import { getPwaBootGateScript } from "@/lib/pwa-boot-gate";

export function PwaBootGate({ buildId }: { buildId: string }) {
  return (
    <script
      id="pwa-boot-gate"
      dangerouslySetInnerHTML={{ __html: getPwaBootGateScript(buildId) }}
    />
  );
}
