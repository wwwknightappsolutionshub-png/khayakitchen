<?php

namespace App\Modules\Platform\Application\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class MarketingChatService
{
    public const WHATSAPP_E164 = '447756183484';

    public const WHATSAPP_DISPLAY = '+44 7756 183484';

    /**
     * @param  array<int, array{role: string, content: string}>  $history
     * @return array{reply: string, suggest_whatsapp: bool, whatsapp_url: string}
     */
    public function reply(string $message, array $history = []): array
    {
        $message = trim($message);
        $whatsappUrl = $this->whatsappUrl($message);

        if ($message === '') {
            return [
                'reply' => 'Ask anything about KhayaOS — kitchen ops, pricing plans, or getting started. I can also connect you to a human on WhatsApp.',
                'suggest_whatsapp' => false,
                'whatsapp_url' => $whatsappUrl,
            ];
        }

        $ai = $this->tryOpenAi($message, $history);
        if ($ai !== null) {
            return [
                'reply' => $ai,
                'suggest_whatsapp' => $this->wantsHuman($message),
                'whatsapp_url' => $whatsappUrl,
            ];
        }

        $fallback = $this->knowledgeReply($message);

        return [
            'reply' => $fallback['reply'],
            'suggest_whatsapp' => $fallback['suggest_whatsapp'] || $this->wantsHuman($message),
            'whatsapp_url' => $whatsappUrl,
        ];
    }

    public function whatsappUrl(?string $prefill = null): string
    {
        $text = $prefill
            ? 'Hi KhayaOS — '.$prefill
            : 'Hi KhayaOS — I have a question about getting started.';

        return 'https://wa.me/'.self::WHATSAPP_E164.'?text='.rawurlencode($text);
    }

    private function wantsHuman(string $message): bool
    {
        $lower = Str::lower($message);

        return Str::contains($lower, [
            'human', 'agent', 'speak to', 'talk to', 'call me', 'whatsapp', 'sales', 'demo', 'urgent',
        ]);
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $history
     */
    private function tryOpenAi(string $message, array $history): ?string
    {
        $key = config('services.openai.api_key');
        if (! is_string($key) || $key === '') {
            return null;
        }

        $messages = [
            [
                'role' => 'system',
                'content' => 'You are the KhayaOS marketing assistant. KhayaOS is a kitchen operating system for food businesses: orders, kitchen display, inventory, loyalty, campaigns, and revenue recovery. Position it as an OS the restaurant owns versus marketplace demand channels (Uber Eats, Just Eat, Deliveroo). Be concise (2–4 short sentences). Never invent pricing numbers. If unsure, suggest WhatsApp '.self::WHATSAPP_DISPLAY.'.',
            ],
        ];

        foreach (array_slice($history, -6) as $turn) {
            $role = ($turn['role'] ?? '') === 'assistant' ? 'assistant' : 'user';
            $content = trim((string) ($turn['content'] ?? ''));
            if ($content !== '') {
                $messages[] = ['role' => $role, 'content' => Str::limit($content, 800)];
            }
        }
        $messages[] = ['role' => 'user', 'content' => Str::limit($message, 800)];

        try {
            $response = Http::withToken($key)
                ->timeout(12)
                ->post('https://api.openai.com/v1/chat/completions', [
                    'model' => config('services.openai.model', 'gpt-4o-mini'),
                    'messages' => $messages,
                    'temperature' => 0.4,
                    'max_tokens' => 280,
                ]);

            if (! $response->successful()) {
                Log::warning('marketing.chat.openai_failed', ['body' => $response->body()]);

                return null;
            }

            $text = data_get($response->json(), 'choices.0.message.content');

            return is_string($text) && trim($text) !== '' ? trim($text) : null;
        } catch (\Throwable $e) {
            Log::warning('marketing.chat.openai_exception', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * @return array{reply: string, suggest_whatsapp: bool}
     */
    private function knowledgeReply(string $message): array
    {
        $lower = Str::lower($message);

        if (Str::contains($lower, ['price', 'pricing', 'cost', 'plan', 'subscription', 'fee'])) {
            return [
                'reply' => 'KhayaOS has Starter through Enterprise plans with a free start path. Features unlock by plan (kitchen, loyalty, campaigns, revenue recovery). For a tailored quote, continue on WhatsApp '.self::WHATSAPP_DISPLAY.'.',
                'suggest_whatsapp' => true,
            ];
        }

        if (Str::contains($lower, ['uber', 'deliveroo', 'just eat', 'marketplace', 'commission'])) {
            return [
                'reply' => 'Marketplaces are demand channels that rent you customers and take commission. KhayaOS is your kitchen OS — your PWA, menu, ops, loyalty, and recovery — so you own the relationship after the order. Many kitchens keep marketplaces as one channel and run everything else in KhayaOS.',
                'suggest_whatsapp' => false,
            ];
        }

        if (Str::contains($lower, ['pwa', 'install', 'app', 'phone'])) {
            return [
                'reply' => 'KhayaOS is installable as a PWA on staff and customer devices. After you create a workspace, your ordering link and admin app can be added to the home screen for fast daily use.',
                'suggest_whatsapp' => false,
            ];
        }

        if (Str::contains($lower, ['start', 'signup', 'sign up', 'onboard', 'trial', 'free'])) {
            return [
                'reply' => 'Tap Start free on this page to provision your KhayaOS workspace. Enterprise onboarding walks you through kitchen setup in minutes. Need a guided demo? Jump to WhatsApp and we will help.',
                'suggest_whatsapp' => true,
            ];
        }

        if (Str::contains($lower, ['kitchen', 'order', 'inventory', 'loyalty', 'campaign', 'kds'])) {
            return [
                'reply' => 'KhayaOS covers orders and kitchen display, inventory and recipes, loyalty packages, campaigns, and revenue recovery — one modular workspace instead of stitching separate tools together.',
                'suggest_whatsapp' => false,
            ];
        }

        return [
            'reply' => 'I can help with KhayaOS features, how we differ from marketplaces, and getting started. Ask a specific question, or continue on WhatsApp '.self::WHATSAPP_DISPLAY.' for a human.',
            'suggest_whatsapp' => true,
        ];
    }
}
