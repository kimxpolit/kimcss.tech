Add-Type -AssemblyName System.Drawing

function Create-HoangKimLogo {
    param (
        [int]$Width = 920,
        [int]$Height = 180,
        [string]$OutputPath
    )

    $bmp = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)

    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

    # Transparent background
    $g.Clear([System.Drawing.Color]::Transparent)

    # Gold Linear Gradient
    $rect = New-Object System.Drawing.Rectangle(0, 0, $Width, $Height)
    $gold1 = [System.Drawing.Color]::FromArgb(255, 255, 240, 160)
    $gold2 = [System.Drawing.Color]::FromArgb(255, 255, 179, 0)
    $gold3 = [System.Drawing.Color]::FromArgb(255, 218, 140, 0)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $gold1, $gold3, 45.0)

    # ColorBlend for rich metallic effect
    $cb = New-Object System.Drawing.Drawing2D.ColorBlend
    $cb.Colors = @(
        [System.Drawing.Color]::FromArgb(255, 255, 248, 200),
        [System.Drawing.Color]::FromArgb(255, 255, 215, 0),
        [System.Drawing.Color]::FromArgb(255, 255, 160, 0),
        [System.Drawing.Color]::FromArgb(255, 255, 215, 0),
        [System.Drawing.Color]::FromArgb(255, 184, 134, 11)
    )
    $cb.Positions = @(0.0, 0.25, 0.5, 0.75, 1.0)
    $brush.InterpolationColors = $cb

    # Draw Crown Icon on Left (scaled for Width 920, Height 180)
    $crownPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    # Crown Base
    $crownPath.AddPolygon(@(
        (New-Object System.Drawing.Point(30, 130)),
        (New-Object System.Drawing.Point(140, 130)),
        (New-Object System.Drawing.Point(130, 150)),
        (New-Object System.Drawing.Point(40, 150))
    ))
    # Crown Spikes
    $crownPath.AddPolygon(@(
        (New-Object System.Drawing.Point(26, 122)),
        (New-Object System.Drawing.Point(144, 122)),
        (New-Object System.Drawing.Point(136, 68)),
        (New-Object System.Drawing.Point(108, 95)),
        (New-Object System.Drawing.Point(85, 34)),
        (New-Object System.Drawing.Point(62, 95)),
        (New-Object System.Drawing.Point(34, 68))
    ))
    $g.FillPath($brush, $crownPath)

    # Crown Jewels (White circles on spike tips)
    $jewelBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $g.FillEllipse($jewelBrush, 80, 26, 12, 12)
    $g.FillEllipse($jewelBrush, 29, 62, 10, 10)
    $g.FillEllipse($jewelBrush, 131, 62, 10, 10)
    $g.FillEllipse($jewelBrush, 58, 92, 8, 8)
    $g.FillEllipse($jewelBrush, 104, 92, 8, 8)

    # Center Diamond in Crown
    $diamondPath = New-Object System.Drawing.Drawing2D.GraphicsPath
    $diamondPath.AddPolygon(@(
        (New-Object System.Drawing.Point(85, 75)),
        (New-Object System.Drawing.Point(97, 92)),
        (New-Object System.Drawing.Point(85, 110)),
        (New-Object System.Drawing.Point(73, 92))
    ))
    $g.FillPath($jewelBrush, $diamondPath)

    # Font for "HOÀNG KIM"
    $fontFamily = New-Object System.Drawing.FontFamily("Segoe UI")
    $titleFont = New-Object System.Drawing.Font($fontFamily, 52, [System.Drawing.FontStyle]::Bold)
    
    # Shadow for title
    $shadowBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(70, 0, 0, 0))
    $g.DrawString("HOÀNG KIM", $titleFont, $shadowBrush, 178, 30)

    # Draw Title
    $g.DrawString("HOÀNG KIM", $titleFont, $brush, 175, 28)

    # Subtitle line
    $pen = New-Object System.Drawing.Pen($brush, 2.5)
    $g.DrawLine($pen, 178, 122, 880, 122)

    # Font for Subtitle
    $subFont = New-Object System.Drawing.Font($fontFamily, 16, [System.Drawing.FontStyle]::Bold)
    $subBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(230, 203, 213, 225))
    $g.DrawString("HỆ THỐNG MMO TỰ ĐỘNG  •  UY TÍN SỐ 1", $subFont, $subBrush, 180, 132)

    # VIP Badge
    $vipBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Rectangle(800, 128, 70, 28)),
        [System.Drawing.Color]::FromArgb(255, 255, 215, 0),
        [System.Drawing.Color]::FromArgb(255, 255, 150, 0),
        0.0
    )
    $g.FillRectangle($vipBrush, 800, 128, 70, 26)
    $vipTextFont = New-Object System.Drawing.Font($fontFamily, 13, [System.Drawing.FontStyle]::Bold)
    $vipTextBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 20, 20, 20))
    $g.DrawString("VIP", $vipTextFont, $vipTextBrush, 816, 132)

    # Save
    $bmp.Save($OutputPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Created: $OutputPath"
}

# 1. Main Logo files
$targets = @(
    "public\assets\storage\images\logo_hoang_kim.png",
    "public\assets\storage\images\logo_dark_8OJ.png",
    "assets\storage\images\logo_dark_8OJ.png",
    "public\assets\img\logo.png",
    "public\client\images\logo.png"
)

foreach ($t in $targets) {
    $dir = Split-Path $t -Parent
    if (!(Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    Create-HoangKimLogo -Width 920 -Height 180 -OutputPath $t
}

# 2. Square Favicon (64x64)
$favBmp = New-Object System.Drawing.Bitmap(64, 64, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$favG = [System.Drawing.Graphics]::FromImage($favBmp)
$favG.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$favG.Clear([System.Drawing.Color]::Transparent)

$goldRect = New-Object System.Drawing.Rectangle(0, 0, 64, 64)
$favBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush($goldRect, 
    [System.Drawing.Color]::FromArgb(255, 255, 220, 100), 
    [System.Drawing.Color]::FromArgb(255, 220, 130, 0), 45.0)

$favPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$favPath.AddPolygon(@(
    (New-Object System.Drawing.Point(6, 44)),
    (New-Object System.Drawing.Point(58, 44)),
    (New-Object System.Drawing.Point(55, 22)),
    (New-Object System.Drawing.Point(42, 33)),
    (New-Object System.Drawing.Point(32, 10)),
    (New-Object System.Drawing.Point(22, 33)),
    (New-Object System.Drawing.Point(9, 22))
))
$favG.FillPath($favBrush, $favPath)
$favBmp.Save("public\assets\img\favicon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$favBmp.Save("public\favicon.ico", [System.Drawing.Imaging.ImageFormat]::Png)
$favG.Dispose()
$favBmp.Dispose()
Write-Host "Created Favicons successfully"
