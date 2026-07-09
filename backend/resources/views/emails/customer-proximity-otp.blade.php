<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Verification code</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.5; color: #111;">
    <p>Hi {{ $customerName }},</p>
    <p>Your verification code for proximity offers at <strong>{{ $restaurantName }}</strong> is:</p>
    <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px;">{{ $otpCode }}</p>
    <p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p>
</body>
</html>
