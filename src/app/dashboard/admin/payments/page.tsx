"use client";

import { AdminPaymentSettings } from "@/components/admin/admin-payment-settings";
import { useAlipayPaymentSettings } from "@/lib/admin/use-alipay-payment-settings";

export default function DashboardAdminPaymentsPage() {
  const payment = useAlipayPaymentSettings();

  return <AdminPaymentSettings payment={payment} />;
}
