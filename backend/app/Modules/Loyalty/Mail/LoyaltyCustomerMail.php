<?php

namespace App\Modules\Loyalty\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class LoyaltyCustomerMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $customerName,
        public string $restaurantName,
        public string $subjectLine,
        public string $bodyText,
        public ?string $headerLine = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        $header = $this->headerLine ?: $this->subjectLine;

        return new Content(
            htmlString: '<div style="font-family:sans-serif;line-height:1.5">'
                .'<h1 style="font-size:22px;margin:0 0 16px">'.e($header).'</h1>'
                .'<p>Hi '.e($this->customerName).',</p>'
                .'<p>'.nl2br(e($this->bodyText)).'</p>'
                .'<p style="color:#666">— '.e($this->restaurantName).' on KhayaOS</p>'
                .'</div>',
        );
    }
}
