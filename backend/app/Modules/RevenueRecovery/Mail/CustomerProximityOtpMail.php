<?php

namespace App\Modules\RevenueRecovery\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CustomerProximityOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $customerName,
        public string $otpCode,
        public string $restaurantName,
        public string $purpose = 'verification',
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "{$this->restaurantName} — your {$this->purpose} code",
        );
    }

    public function content(): Content
    {
        $name = e($this->customerName);
        $otp = e($this->otpCode);
        $kitchen = e($this->restaurantName);
        $purpose = e($this->purpose);

        return new Content(
            htmlString: <<<HTML
<div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
  <p>Hi {$name},</p>
  <p>Your {$purpose} code for <strong>{$kitchen}</strong> is:</p>
  <p style="font-size:28px;font-weight:bold;letter-spacing:4px">{$otp}</p>
  <p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
  <p style="color:#666">— {$kitchen} on KhayaOS</p>
</div>
HTML
        );
    }
}
