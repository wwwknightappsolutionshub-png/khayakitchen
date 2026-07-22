<?php

namespace App\Modules\Pricing\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TenantReferralInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $prospectName,
        public string $referrerRestaurant,
        public string $inviteUrl,
        public int $trialDays,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->referrerRestaurant} invited you to try KhayaOS — {$this->trialDays} days free",
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.tenant-referral-invite',
        );
    }
}
