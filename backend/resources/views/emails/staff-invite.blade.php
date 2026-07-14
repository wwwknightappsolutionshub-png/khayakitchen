<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KhayaOS staff invite</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0c;font-family:Arial,Helvetica,sans-serif;color:#f4f4f5;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0a0a0c;padding:32px 16px;">
    <tr>
        <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#141418;border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden;">
                <tr>
                    <td style="padding:28px 28px 12px;background:linear-gradient(135deg,#9a3412 0%,#1a1207 100%);">
                        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.12em;text-transform:uppercase;color:#fdba74;">KhayaOS</p>
                        <h1 style="margin:0;font-size:26px;line-height:1.2;color:#ffffff;">Welcome, {{ $staffName }}</h1>
                    </td>
                </tr>
                <tr>
                    <td style="padding:28px;">
                        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#d4d4d8;">
                            You have been added to <strong style="color:#ffffff;">{{ $restaurantName }}</strong> as
                            <strong style="color:#fb923c;">{{ $roleLabel }}</strong>.
                        </p>

                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:24px 0;background:#0a0a0c;border:1px solid rgba(255,255,255,0.08);border-radius:12px;">
                            <tr>
                                <td style="padding:20px;">
                                    <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#fb923c;text-transform:uppercase;letter-spacing:0.08em;">Sign-in details</p>
                                    <p style="margin:0 0 8px;font-size:14px;color:#d4d4d8;"><strong style="color:#fff;">Login:</strong> <a href="{{ $loginUrl }}" style="color:#fb923c;">{{ $loginUrl }}</a></p>
                                    <p style="margin:0 0 8px;font-size:14px;color:#d4d4d8;"><strong style="color:#fff;">Workspace slug:</strong> {{ $tenantSlug }}</p>
                                    <p style="margin:0 0 8px;font-size:14px;color:#d4d4d8;"><strong style="color:#fff;">Email:</strong> {{ $staffEmail }}</p>
                                    <p style="margin:0;font-size:14px;color:#d4d4d8;"><strong style="color:#fff;">Temporary password:</strong> {{ $temporaryPassword }}</p>
                                </td>
                            </tr>
                        </table>

                        <p style="margin:0;font-size:14px;line-height:1.6;color:#a1a1aa;">
                            Sign in, then change your password from Settings after your first login.
                        </p>
                    </td>
                </tr>
            </table>
        </td>
    </tr>
</table>
</body>
</html>
