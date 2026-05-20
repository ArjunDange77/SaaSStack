import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";

interface Props {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function SbPageHeader({ title, subtitle, actions }: Props) {
  return (
    <div className="sb-page-header-wrap">
      <PageHeader title={title} subtitle={subtitle} actions={actions} />
    </div>
  );
}
