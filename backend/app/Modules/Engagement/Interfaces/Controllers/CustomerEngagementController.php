<?php

namespace App\Modules\Engagement\Interfaces\Controllers;

use App\Modules\Engagement\Application\Services\ChatService;
use App\Modules\Engagement\Application\Services\KitchenReviewService;
use App\Modules\Engagement\Application\Services\MealLikeService;
use App\Shared\Utils\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;

class CustomerEngagementController extends Controller
{
    public function __construct(
        private ChatService $chatService,
        private MealLikeService $mealLikeService,
        private KitchenReviewService $kitchenReviewService,
    ) {}

    public function openChat(Request $request)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
            'name' => ['nullable', 'string', 'max:120'],
            'subject' => ['nullable', 'string', 'max:200'],
        ]);

        $thread = $this->chatService->openCustomerThread(
            $data['phone'],
            $data['name'] ?? 'Guest',
            $data['subject'] ?? null,
        );

        return ApiResponse::success(['thread' => $thread], 201);
    }

    public function showChat(Request $request, string $id)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
        ]);

        return ApiResponse::success([
            'thread' => $this->chatService->messagesForCustomer($id, $data['phone']),
        ]);
    }

    public function postChat(Request $request, string $id)
    {
        $data = $request->validate([
            'phone' => ['required', 'string', 'max:32'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $message = $this->chatService->postCustomerMessage($id, $data['phone'], $data['body']);

        return ApiResponse::success(['message' => $message], 201);
    }

    public function toggleLike(Request $request, string $mealId)
    {
        $data = $request->validate([
            'phone' => ['nullable', 'string', 'max:32'],
            'guest_key' => ['nullable', 'string', 'max:64'],
        ]);

        return ApiResponse::success(
            $this->mealLikeService->toggleLike(
                $mealId,
                $data['phone'] ?? null,
                $data['guest_key'] ?? null,
            ),
        );
    }

    public function referMeal(string $mealId)
    {
        return ApiResponse::success([
            'refer' => $this->mealLikeService->referPayload($mealId),
        ]);
    }

    public function submitReview(Request $request)
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'phone' => ['required', 'string', 'max:32'],
            'body' => ['required', 'string', 'max:5000'],
        ]);

        $review = $this->kitchenReviewService->submit($data['name'], $data['phone'], $data['body']);

        return ApiResponse::success(['review' => $review], 201);
    }
}
