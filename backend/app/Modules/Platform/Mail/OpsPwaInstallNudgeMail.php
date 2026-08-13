<?php

namespace App\Modules\Platform\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class OpsPwaInstallNudgeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $ownerName,
        public string $restaurantName,
        public string $loginUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Install KhayaOS Ops — your kitchen home screen',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.ops-pwa-install-nudge',
        );
    }
}
