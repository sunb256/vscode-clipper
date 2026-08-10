param(
    [Parameter(Mandatory = $true)]
    [string]$LabelFile
)

Add-Type -AssemblyName System.Windows.Forms

function Get-Fragment([string]$Html) {
    $startMarker = '<!--StartFragment-->'
    $endMarker = '<!--EndFragment-->'
    $start = $Html.IndexOf($startMarker)
    $end = $Html.IndexOf($endMarker)
    if ($start -lt 0 -or $end -le $start) {
        throw 'VS Code HTML clipboard fragment was not found'
    }
    $start += $startMarker.Length
    return $Html.Substring($start, $end - $start)
}

function Get-ByteCount([string]$Value) {
    return [Text.Encoding]::UTF8.GetByteCount($Value)
}

function New-ClipboardHtml([string]$Fragment, [string]$Label) {
    $safeLabel = [Net.WebUtility]::HtmlEncode($Label)
    $labelHtml = '<div style="color:#404040;font-size:13px;margin-bottom:4px;font-family:Segoe UI,sans-serif;">' + $safeLabel + '</div>'
    $content = $labelHtml + $Fragment
    $prefix = '<html><body><!--StartFragment-->'
    $suffix = '<!--EndFragment--></body></html>'
    $template = "Version:1.0`r`nStartHTML:{0:D10}`r`nEndHTML:{1:D10}`r`nStartFragment:{2:D10}`r`nEndFragment:{3:D10}`r`n"
    $startHtml = Get-ByteCount ($template -f 0, 0, 0, 0)
    $startFragment = $startHtml + (Get-ByteCount $prefix)
    $endFragment = $startFragment + (Get-ByteCount $content)
    $document = $prefix + $content + $suffix
    $endHtml = $startHtml + (Get-ByteCount $document)
    return ($template -f $startHtml, $endHtml, $startFragment, $endFragment) + $document
}

$label = Get-Content -LiteralPath $LabelFile -Raw -Encoding UTF8
$sourceHtml = [Windows.Forms.Clipboard]::GetData([Windows.Forms.DataFormats]::Html)
if (-not $sourceHtml) {
    throw 'VS Code did not provide HTML clipboard data'
}

$sourceText = [Windows.Forms.Clipboard]::GetText()
$fragment = Get-Fragment $sourceHtml
$combinedHtml = New-ClipboardHtml $fragment $label
$combinedText = $label + "`r`n" + $sourceText
$clipboard = New-Object Windows.Forms.DataObject
$clipboard.SetData([Windows.Forms.DataFormats]::Html, $false, $combinedHtml)
$clipboard.SetData([Windows.Forms.DataFormats]::UnicodeText, $true, $combinedText)
[Windows.Forms.Clipboard]::SetDataObject($clipboard, $true)
