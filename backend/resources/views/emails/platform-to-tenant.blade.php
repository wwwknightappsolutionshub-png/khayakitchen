<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $title }}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #1a1a2e;">
    <p>Hello {{ $recipientName }},</p>
    <p>Message for <strong>{{ $restaurantName }}</strong> from KhayaOS Platform:</p>
    <h2 style="font-size: 18px;">{{ $title }}</h2>
    <p style="white-space: pre-wrap;">{{ $bodyText }}</p>
    <p style="color: #666; font-size: 12px;">— KhayaOS Platform</p>
</body>
</html>
