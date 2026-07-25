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
     * @return array{
     *   reply: string,
     *   suggest_whatsapp: bool,
     *   needs_email: bool,
     *   handoff: bool,
     *   confident: bool,
     *   whatsapp_url: string
     * }
     */
    public function reply(string $message, array $history = [], ?string $email = null): array
    {
        $message = trim($message);
        $email = $email ? strtolower(trim($email)) : null;

        if ($email && filter_var($email, FILTER_VALIDATE_EMAIL)) {
            return $this->buildHandoff($history, $email, $message);
        }

        // Visitor replied with an email as the message after we asked for one.
        if (filter_var($message, FILTER_VALIDATE_EMAIL)) {
            return $this->buildHandoff($history, strtolower($message), null);
        }

        $whatsappUrl = $this->whatsappUrl($message);

        if ($message === '') {
            return [
                'reply' => "Hey — I'm here if you want a quick take on KhayaOS. Ask about kitchens, marketplaces, or getting set up. If you'd rather talk to a person, I can pass you to WhatsApp.",
                'suggest_whatsapp' => false,
                'needs_email' => false,
                'handoff' => false,
                'confident' => true,
                'whatsapp_url' => $whatsappUrl,
            ];
        }

        if ($this->wantsHuman($message)) {
            return [
                'reply' => "Totally — happy to connect you with the team on WhatsApp. Drop your email first so we can send the chat history across, then I'll open WhatsApp for you.",
                'suggest_whatsapp' => true,
                'needs_email' => true,
                'handoff' => false,
                'confident' => true,
                'whatsapp_url' => $whatsappUrl,
            ];
        }

        $ai = $this->tryOpenAi($message, $history);
        if (is_array($ai)) {
            return $ai + ['whatsapp_url' => $whatsappUrl];
        }

        $fallback = $this->knowledgeReply($message);

        return [
            'reply' => $fallback['reply'],
            'suggest_whatsapp' => $fallback['suggest_whatsapp'],
            'needs_email' => $fallback['needs_email'],
            'handoff' => false,
            'confident' => $fallback['confident'],
            'whatsapp_url' => $whatsappUrl,
        ];
    }

    public function whatsappUrl(?string $prefill = null): string
    {
        $text = $prefill
            ? $prefill
            : 'Hi KhayaOS — I have a question about getting started.';

        return 'https://wa.me/'.self::WHATSAPP_E164.'?text='.rawurlencode($text);
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $history
     * @return array{
     *   reply: string,
     *   suggest_whatsapp: bool,
     *   needs_email: bool,
     *   handoff: bool,
     *   confident: bool,
     *   whatsapp_url: string
     * }
     */
    private function buildHandoff(array $history, string $email, ?string $extraMessage): array
    {
        $lines = ['Hi KhayaOS team — please continue this chat.', 'Visitor email: '.$email, '', 'Chat history:'];
        foreach (array_slice($history, -10) as $turn) {
            $role = ($turn['role'] ?? '') === 'assistant' ? 'Assistant' : 'Visitor';
            $content = trim((string) ($turn['content'] ?? ''));
            if ($content !== '') {
                $lines[] = $role.': '.Str::limit($content, 400);
            }
        }
        if ($extraMessage && ! filter_var($extraMessage, FILTER_VALIDATE_EMAIL)) {
            $lines[] = 'Visitor: '.Str::limit($extraMessage, 400);
        }

        $url = $this->whatsappUrl(implode("\n", $lines));

        return [
            'reply' => "Perfect — thanks. I'm opening WhatsApp so a teammate can pick this up. I've included your email ($email) and our chat so nothing gets lost.",
            'suggest_whatsapp' => true,
            'needs_email' => false,
            'handoff' => true,
            'confident' => true,
            'whatsapp_url' => $url,
        ];
    }

    private function wantsHuman(string $message): bool
    {
        $lower = Str::lower($message);

        return Str::contains($lower, [
            'human', 'agent', 'speak to', 'talk to', 'call me', 'whatsapp', 'sales', 'demo', 'urgent', 'real person',
        ]);
    }

    /**
     * @param  array<int, array{role: string, content: string}>  $history
     * @return array{reply: string, suggest_whatsapp: bool, needs_email: bool, handoff: bool, confident: bool}|null
     */
    private function tryOpenAi(string $message, array $history): ?array
    {
        $key = config('services.openai.api_key');
        if (! is_string($key) || $key === '') {
            return null;
        }

        $messages = [
            [
                'role' => 'system',
                'content' => 'You are a warm, natural KhayaOS guide (not a corporate bot). KhayaOS is a kitchen operating system for food businesses: orders, kitchen display, inventory, loyalty, campaigns, revenue recovery. Contrast gently with marketplaces (Uber Eats, Just Eat, Deliveroo) as demand channels vs an OS you own. Sound human: short sentences, conversational. Greetings like hi/hello should get a friendly welcome and invite a KhayaOS topic — never jump to WhatsApp. Never invent exact prices. If the user is clearly off-topic, steer back to kitchen OS topics without demanding email. Only reply with exactly: HANDOFF| followed by one friendly sentence asking for their email when they explicitly want a human/sales call or you truly cannot help after trying to steer.',
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
                    'temperature' => 0.7,
                    'max_tokens' => 280,
                ]);

            if (! $response->successful()) {
                Log::warning('marketing.chat.openai_failed', ['body' => $response->body()]);

                return null;
            }

            $text = data_get($response->json(), 'choices.0.message.content');
            if (! is_string($text) || trim($text) === '') {
                return null;
            }

            $text = trim($text);
            if (Str::startsWith($text, 'HANDOFF|')) {
                $ask = trim(Str::after($text, 'HANDOFF|')) ?: "I'm not fully sure on that one — share your email and I'll pass our chat to the team on WhatsApp.";

                return [
                    'reply' => $ask,
                    'suggest_whatsapp' => true,
                    'needs_email' => true,
                    'handoff' => false,
                    'confident' => false,
                ];
            }

            return [
                'reply' => $text,
                'suggest_whatsapp' => false,
                'needs_email' => false,
                'handoff' => false,
                'confident' => true,
            ];
        } catch (\Throwable $e) {
            Log::warning('marketing.chat.openai_exception', ['error' => $e->getMessage()]);

            return null;
        }
    }

    /**
     * @return array{reply: string, suggest_whatsapp: bool, needs_email: bool, confident: bool}
     */
    private function knowledgeReply(string $message): array
    {
        $lower = Str::lower(trim($message));
        $normalized = preg_replace('/[^\p{L}\p{N}\s]+/u', '', $lower) ?? $lower;
        $normalized = trim(preg_replace('/\s+/', ' ', $normalized) ?? $normalized);

        if ($this->isGreeting($normalized)) {
            return [
                'reply' => "Hey! Good to meet you. I'm here to help with KhayaOS — the kitchen operating system for food businesses (orders, prep, inventory, loyalty, and growth). What are you curious about first: owning customers vs marketplaces, kitchen ops, or getting started free?",
                'suggest_whatsapp' => false,
                'needs_email' => false,
                'confident' => true,
            ];
        }

        if (Str::contains($lower, ['price', 'pricing', 'cost', 'plan', 'subscription', 'fee'])) {
            return [
                'reply' => "Good question. Plans run from Starter up to Enterprise, and you can start free. What unlocks (kitchen, loyalty, campaigns, recovery) depends on the plan — I don't want to guess a quote. Want me to pass you to WhatsApp for exact numbers?",
                'suggest_whatsapp' => true,
                'needs_email' => false,
                'confident' => true,
            ];
        }

        if (Str::contains($lower, ['uber', 'deliveroo', 'just eat', 'marketplace', 'commission'])) {
            return [
                'reply' => "Those apps are great for demand, but they rent you the diner and take a cut. KhayaOS is the kitchen OS underneath — your PWA, menu, prep, loyalty, and recovery — so the relationship stays yours. Plenty of kitchens keep Uber Eats as one channel and run everything else here.",
                'suggest_whatsapp' => false,
                'needs_email' => false,
                'confident' => true,
            ];
        }

        if (Str::contains($lower, ['pwa', 'install', 'app', 'phone', 'home screen'])) {
            return [
                'reply' => "Yep — KhayaOS installs as a PWA. After you create a workspace, staff and customers can add it to the home screen for that app-speed feel without an app-store wait.",
                'suggest_whatsapp' => false,
                'needs_email' => false,
                'confident' => true,
            ];
        }

        if (Str::contains($lower, ['start', 'signup', 'sign up', 'onboard', 'trial', 'free', 'get started'])) {
            return [
                'reply' => "Hit Start free on this page and you'll provision a workspace in a few steps. If you'd like someone walking you through it live, I can hand you to WhatsApp.",
                'suggest_whatsapp' => true,
                'needs_email' => false,
                'confident' => true,
            ];
        }

        if (Str::contains($lower, ['kitchen', 'order', 'inventory', 'loyalty', 'campaign', 'kds', 'prep', 'khaya'])) {
            return [
                'reply' => "In short: orders and kitchen display, inventory and recipes, loyalty, campaigns, and revenue recovery — one workspace instead of a pile of tools. Which part are you most curious about?",
                'suggest_whatsapp' => false,
                'needs_email' => false,
                'confident' => true,
            ];
        }

        // Off-topic / unclear — steer back to specialty instead of immediate WhatsApp handoff.
        return [
            'reply' => "I might be off-track there — my specialty is KhayaOS for food kitchens. Think orders, kitchen display, inventory, loyalty, and keeping customers off marketplace rent. Want to dig into how that works, or how to start a free workspace?",
            'suggest_whatsapp' => false,
            'needs_email' => false,
            'confident' => true,
        ];
    }

    private function isGreeting(string $normalized): bool
    {
        if ($normalized === '') {
            return false;
        }

        $exact = [
            'hi', 'hello', 'hey', 'hiya', 'howdy', 'yo', 'sup', 'hola', 'good morning',
            'good afternoon', 'good evening', 'morning', 'afternoon', 'evening',
            'hi there', 'hello there', 'hey there', 'hi khayaos', 'hello khayaos', 'hey khayaos',
        ];

        if (in_array($normalized, $exact, true)) {
            return true;
        }

        return (bool) preg_match(
            '/^(hi|hello|hey|hiya|howdy|yo|hola|good\s+(morning|afternoon|evening))(\s+(there|team|folks|khayaos))?$/',
            $normalized,
        );
    }
}
