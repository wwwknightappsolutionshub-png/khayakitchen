<?php

namespace App\Modules\Platform\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class WelcomeOwnerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $ownerName,
        public string $restaurantName,
        public string $tenantSlug,
        public string $ownerEmail,
        public string $plainPassword,
        public string $loginUrl,
        public string $planName,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Welcome aboard — your KhayaOS kitchen is ready',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.welcome-owner',
        );
    }
}
