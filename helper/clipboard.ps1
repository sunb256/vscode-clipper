param(
    [Parameter(Mandatory = $true)]
    [ValidateSet('get', 'set')]
    [string]$Mode,
    [Parameter(Mandatory = $true)]
    [string]$HtmlPath,
    [Parameter(Mandatory = $true)]
    [string]$TextPath
)

Add-Type -AssemblyName System.Windows.Forms
$utf8 = New-Object Text.UTF8Encoding($false)

if ($Mode -eq 'get') {
    $html = [Windows.Forms.Clipboard]::GetData([Windows.Forms.DataFormats]::Html)
    if (-not $html) {
        throw 'VS Code did not provide HTML clipboard data'
    }
    [IO.File]::WriteAllText($HtmlPath, $html, $utf8)
    [IO.File]::WriteAllText($TextPath, [Windows.Forms.Clipboard]::GetText(), $utf8)
    exit 0
}

$clipboard = New-Object Windows.Forms.DataObject
$html = [IO.File]::ReadAllText($HtmlPath, $utf8)
$text = [IO.File]::ReadAllText($TextPath, $utf8)
$clipboard.SetData([Windows.Forms.DataFormats]::Html, $false, $html)
$clipboard.SetData([Windows.Forms.DataFormats]::UnicodeText, $true, $text)
[Windows.Forms.Clipboard]::SetDataObject($clipboard, $true)
