<?php

namespace App\Modules\Auth\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class StaffInviteMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $staffName,
        public string $staffEmail,
        public string $roleLabel,
        public string $restaurantName,
        public string $tenantSlug,
        public string $temporaryPassword,
        public string $loginUrl,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'You have been added to '.$this->restaurantName.' on KhayaOS',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'emails.staff-invite',
        );
    }
}
