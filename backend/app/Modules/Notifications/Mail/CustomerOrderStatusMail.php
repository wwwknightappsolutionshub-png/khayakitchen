<?php

namespace App\Modules\Notifications\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CustomerOrderStatusMail extends Mailable
{
    use Queueable, SerializesModels;

    /**
     * @param  list<array{label: string, url: string, hint?: string}>|null  $ctas
     */
    public function __construct(
        public string $customerName,
        public string $restaurantName,
        public string $subjectLine,
        public string $bodyText,
        public ?string $logoUrl = null,
        public ?array $ctas = null,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: $this->subjectLine);
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    private function buildHtml(): string
    {
        $logo = $this->logoUrl
            ? '<img src="'.e($this->logoUrl).'" alt="" width="56" height="56" style="border-radius:12px;display:block;margin:0 0 16px" />'
            : '';

        $ctaBlock = '';
        if ($this->ctas) {
            $buttons = '';
            foreach ($this->ctas as $cta) {
                $hint = ! empty($cta['hint'])
                    ? '<p style="margin:4px 0 14px;font-size:12px;color:#666">'.e($cta['hint']).'</p>'
                    : '<div style="height:10px"></div>';
                $buttons .= '<p style="margin:0 0 4px">'
                    .'<a href="'.e($cta['url']).'" style="display:inline-block;background:#E07A5F;color:#fff;text-decoration:none;padding:10px 16px;border-radius:999px;font-size:14px;font-weight:600">'
                    .e($cta['label'])
                    .'</a></p>'.$hint;
            }
            $ctaBlock = '<div style="margin:24px 0;padding:16px;border:1px solid #eee;border-radius:12px;background:#fafafa">'
                .'<p style="margin:0 0 12px;font-size:14px;font-weight:600">Next steps</p>'
                .$buttons
                .'</div>';
        }

        return '<div style="font-family:sans-serif;line-height:1.5;max-width:560px;margin:0 auto;color:#18181b">'
            .$logo
            .'<h1 style="font-size:22px;margin:0 0 16px">'.e($this->subjectLine).'</h1>'
            .'<p>Hi '.e($this->customerName).',</p>'
            .'<p>'.nl2br(e($this->bodyText)).'</p>'
            .$ctaBlock
            .'<p style="color:#666;font-size:13px">— '.e($this->restaurantName).' on KhayaOS</p>'
            .'</div>';
    }
}
