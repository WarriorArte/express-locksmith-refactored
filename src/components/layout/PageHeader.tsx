/**
 * PageHeader - Cerrajería Express Redesign
 *
 * Mobile (Redesign.html style): big bold title on the left + avatar
 * with notification dot on the right. The desktop topbar already
 * shows avatar/notifications, so on lg+ this becomes the classic
 * title + optional action layout.
 */
import * as React from "react";
import { HeroHeader } from "@/design-system/layout/HeroHeader";
import { AccountMenu } from "@/components/layout/AccountMenu";

interface PageHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  /** Right-side action (desktop). Use `mobileAction` for mobile. */
  action?: React.ReactNode;
  /** Action shown on mobile next to the avatar (e.g. small + button). */
  mobileAction?: React.ReactNode;
  /** Hide the mobile avatar (e.g. when page provides its own). */
  hideAvatar?: boolean;
  /** Keep a compact non-bleeding header for nested panels. */
  compact?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  eyebrow,
  action,
  mobileAction,
  hideAvatar = false,
  compact = false,
  className,
  children,
}: PageHeaderProps) {
  return (
    <HeroHeader
      title={title}
      subtitle={subtitle}
      eyebrow={eyebrow}
      action={action}
      mobileAction={mobileAction}
      compact={compact}
      className={className}
      accountTrigger={!hideAvatar ? <AccountMenu /> : null}
    >
      {children}
    </HeroHeader>
  );
}


