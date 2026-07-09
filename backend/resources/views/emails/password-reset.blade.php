<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset your password</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0c;font-family:Arial,Helvetica,sans-serif;color:#f4f4f5;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0c;padding:32px 16px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#141418;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
                <tr>
                    <td style="padding:28px 28px 12px;background:linear-gradient(135deg,#9a3412 0%,#1a1207 100%);">
                        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#fdba74;">KhayaOS</p>
                        <h1 style="margin:0;font-size:28px;line-height:1.2;color:#ffffff;">Reset your password</h1>
                    </td>
                </tr>
                <tr>
                    <td style="padding:28px;">
                        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#d4d4d8;">
                            Hi {{ $ownerName }}, we received a request to reset your KhayaOS password.
                        </p>

                        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#a1a1aa;">
                            This link expires in 60 minutes. If you did not request a reset, you can ignore this email.
                        </p>

                        <a href="{{ $resetUrl }}" style="display:inline-block;padding:14px 24px;background:#ea580c;color:#ffffff;text-decoration:none;border-radius:999px;font-size:15px;font-weight:700;">
                            Reset password
                        </a>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
