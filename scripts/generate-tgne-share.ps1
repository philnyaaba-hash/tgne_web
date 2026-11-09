$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$assetDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..\public\assets'))
$logoPath = Join-Path $assetDirectory 'tgne-logo.png'
$outputPath = Join-Path $assetDirectory 'tgne-share.png'
$bitmap = [System.Drawing.Bitmap]::new(1200, 630, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$logo = [System.Drawing.Image]::FromFile($logoPath)

try {
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $paper = [System.Drawing.Color]::FromArgb(247, 246, 241)
  $deep = [System.Drawing.Color]::FromArgb(11, 37, 39)
  $green = [System.Drawing.Color]::FromArgb(37, 116, 109)
  $gold = [System.Drawing.Color]::FromArgb(188, 150, 92)
  $orange = [System.Drawing.Color]::FromArgb(245, 130, 50)
  $blue = [System.Drawing.Color]::FromArgb(45, 172, 227)
  $lime = [System.Drawing.Color]::FromArgb(154, 205, 66)
  $white = [System.Drawing.Color]::FromArgb(255, 253, 247)
  $muted = [System.Drawing.Color]::FromArgb(92, 111, 106)
  $graphics.Clear($paper)

  $graphics.FillRectangle([System.Drawing.SolidBrush]::new($deep), 820, 0, 380, 630)
  $graphics.FillRectangle([System.Drawing.SolidBrush]::new($gold), 810, 0, 10, 630)
  $graphics.FillRectangle([System.Drawing.SolidBrush]::new($orange), 810, 0, 3, 630)
  $graphics.FillRectangle([System.Drawing.SolidBrush]::new($white), 70, 58, 118, 118)
  $graphics.DrawImage($logo, [System.Drawing.Rectangle]::new(73, 61, 112, 112))

  $brandFont = [System.Drawing.Font]::new('Segoe UI', 28, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $tagFont = [System.Drawing.Font]::new('Segoe UI', 13, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $titleFont = [System.Drawing.Font]::new('Georgia', 56, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $copyFont = [System.Drawing.Font]::new('Segoe UI', 23, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $smallFont = [System.Drawing.Font]::new('Segoe UI', 12, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $rowFont = [System.Drawing.Font]::new('Segoe UI', 20, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $brandBrush = [System.Drawing.SolidBrush]::new($deep)
  $greenBrush = [System.Drawing.SolidBrush]::new($green)
  $goldBrush = [System.Drawing.SolidBrush]::new($gold)
  $orangeBrush = [System.Drawing.SolidBrush]::new($orange)
  $blueBrush = [System.Drawing.SolidBrush]::new($blue)
  $limeBrush = [System.Drawing.SolidBrush]::new($lime)
  $whiteBrush = [System.Drawing.SolidBrush]::new($white)
  $mutedBrush = [System.Drawing.SolidBrush]::new($muted)
  $rulePen = [System.Drawing.Pen]::new([System.Drawing.Color]::FromArgb(67, 93, 91), 1)

  $graphics.DrawString('TGNE SOLUTIONS', $brandFont, $brandBrush, 214, 75)
  $graphics.DrawString('TECHNOLOGY  /  DESIGN  /  DIGITAL GROWTH', $tagFont, $greenBrush, 217, 115)
  $graphics.DrawString("Make your next move`nmatter.", $titleFont, $brandBrush, [System.Drawing.RectangleF]::new(72, 222, 720, 172))
  $graphics.FillRectangle($orangeBrush, 76, 412, 92, 4)
  $graphics.DrawString("Technology, design and ICT support`nfor businesses and communities in Ghana.", $copyFont, $mutedBrush, [System.Drawing.RectangleF]::new(76, 442, 700, 70))
  $graphics.FillRectangle($greenBrush, 76, 557, 24, 3)
  $graphics.DrawString('TGNE-WEB.VERCEL.APP', $smallFont, $greenBrush, 76, 577)

  $graphics.DrawString('WHAT WE DO', $smallFont, $goldBrush, 866, 72)
  $graphics.FillRectangle($blueBrush, 866, 134, 26, 5)
  $graphics.FillRectangle($orangeBrush, 900, 134, 26, 5)
  $graphics.FillRectangle($limeBrush, 934, 134, 26, 5)
  $graphics.DrawString('01', $smallFont, $goldBrush, 868, 191)
  $graphics.DrawString('Technology', $rowFont, $whiteBrush, 912, 185)
  $graphics.DrawLine($rulePen, 866, 238, 1152, 238)
  $graphics.DrawString('02', $smallFont, $goldBrush, 868, 278)
  $graphics.DrawString('Design & print', $rowFont, $whiteBrush, 912, 272)
  $graphics.DrawLine($rulePen, 866, 325, 1152, 325)
  $graphics.DrawString('03', $smallFont, $goldBrush, 868, 365)
  $graphics.DrawString('Digital education', $rowFont, $whiteBrush, 912, 359)
  $graphics.DrawLine($rulePen, 866, 412, 1152, 412)
  $graphics.DrawString('TEMA, GHANA', $tagFont, $whiteBrush, 866, 545)
  $graphics.FillRectangle($goldBrush, 866, 579, 286, 2)

  $bitmap.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)
  Get-Item $outputPath | Select-Object Name, Length | Format-Table -AutoSize
} finally {
  $logo.Dispose()
  $graphics.Dispose()
  $bitmap.Dispose()
}