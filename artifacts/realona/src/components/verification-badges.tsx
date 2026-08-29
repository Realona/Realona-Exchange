import { BadgeCheck } from "lucide-react";

type VerificationBadgesProps = {
  isVerifiedTrader?: boolean | null;
  kycLevel?: number | null;
  size?: "sm" | "md";
  showLabels?: boolean;
};

export function VerificationBadges({
  isVerifiedTrader,
  kycLevel,
  size = "sm",
  showLabels = false,
}: VerificationBadgesProps) {
  const iconSize = size === "md" ? "h-5 w-5" : "h-4 w-4";

  if (!isVerifiedTrader && !kycLevel) return null;

  return (
    <span className="inline-flex shrink-0 flex-wrap items-center gap-1.5">
      {!!isVerifiedTrader && (
        <span
          className="inline-flex items-center gap-1 font-medium text-emerald-700"
          title="Verified Trader — awarded for trusted trading activity"
          aria-label="Verified Trader"
        >
          <BadgeCheck className={`${iconSize} fill-emerald-700 text-white`} />
          {showLabels && <span className="text-xs">Verified Trader</span>}
        </span>
      )}
      {!!kycLevel && (
        <span
          className="inline-flex items-center gap-1 font-medium text-blue-700"
          title="ID Verified — government ID approved"
          aria-label="ID Verified"
        >
          <BadgeCheck className={`${iconSize} fill-blue-700 text-white`} />
          {showLabels && <span className="text-xs">ID Verified</span>}
        </span>
      )}
    </span>
  );
}