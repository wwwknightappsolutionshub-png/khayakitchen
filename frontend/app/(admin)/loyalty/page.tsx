"use client";

import { useQuery } from "@tanstack/react-query";
import { BackendPage } from "@/components/shared/BackendPage";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { crmService } from "@/services/crm.service";
import { loyaltyService } from "@/services/loyalty.service";
import { Gift } from "lucide-react";

export default function LoyaltyPage() {
  const { data: customersData } = useQuery({
    queryKey: ["customers"],
    queryFn: () => crmService.getCustomers(),
  });

  const customers = customersData?.customers?.slice(0, 10) ?? [];

  return (
    <BackendPage>
      <header className="backend-header">
        <div className="flex items-center gap-3">
          <Gift className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Loyalty</h1>
            <p className="text-sm text-muted">Points balances and rewards</p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {customers.map((customer) => (
          <LoyaltyCard key={customer.id} customerId={customer.id} name={customer.name} />
        ))}
        {customers.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-muted">
              No loyalty accounts yet
            </CardContent>
          </Card>
        )}
      </div>
    </BackendPage>
  );
}

function LoyaltyCard({ customerId, name }: { customerId: string; name: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["loyalty", customerId],
    queryFn: () => loyaltyService.getAccount(customerId),
    retry: false,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{name}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted">Loading...</p>
        ) : data?.loyalty ? (
          <div className="flex items-center justify-between">
            <span className="font-mono text-2xl font-bold text-primary">
              {data.loyalty.points_balance}
            </span>
            <Badge variant="secondary">{data.loyalty.tier ?? "Member"}</Badge>
          </div>
        ) : (
          <p className="text-sm text-muted">No loyalty account</p>
        )}
      </CardContent>
    </Card>
  );
}
