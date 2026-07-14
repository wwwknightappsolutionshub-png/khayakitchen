"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BackendPage } from "@/components/shared/BackendPage";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { engagementService } from "@/services/engagement.service";

export default function ReviewsPage() {
  const queryClient = useQueryClient();
  const reviews = useQuery({
    queryKey: ["engagement", "reviews"],
    queryFn: () => engagementService.listReviews(),
  });

  const moderate = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "approved" | "rejected" }) =>
      engagementService.moderateReview(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["engagement", "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["engagement", "notification-badges"] });
    },
  });

  return (
    <BackendPage>
      <header className="backend-header">
        <div>
          <h1 className="text-2xl font-bold">Kitchen reviews</h1>
          <p className="text-sm text-muted">Approve reviews before they appear on the menu footer ticker</p>
        </div>
      </header>

      <div className="space-y-3">
        {(reviews.data?.reviews ?? []).map((review) => (
          <Card key={review.id}>
            <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="font-medium">{review.customer_name}</p>
                <p className="text-sm text-muted">{review.summary || review.body}</p>
                <p className="mt-1 text-xs capitalize text-muted">{review.status}</p>
              </div>
              {review.status === "pending" && (
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => moderate.mutate({ id: review.id, status: "approved" })}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => moderate.mutate({ id: review.id, status: "rejected" })}
                  >
                    Disapprove
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
        {(reviews.data?.reviews ?? []).length === 0 && (
          <p className="text-sm text-muted">No reviews yet.</p>
        )}
      </div>
    </BackendPage>
  );
}
