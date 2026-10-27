# Generates English test audio locally via Windows SAPI (System.Speech) -
# zero network calls, no external TTS vendor, free. Used only to sanity-check
# the STT pipeline wiring with controlled, known ground-truth sentences
# (see PROGRESS.md: this is NOT a substitute for real human speech, and
# there is currently no installed Arabic voice on this machine to do the
# same for Egyptian Arabic).
Add-Type -AssemblyName System.Speech

$manifestPath = Join-Path $PSScriptRoot "..\test_audio\en\manifest.json"
$manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json

$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.SelectVoice("Microsoft Zira Desktop")
$synth.Rate = 0

foreach ($prop in $manifest.PSObject.Properties) {
    $fileName = $prop.Name
    $text = $prop.Value
    $outPath = Join-Path $PSScriptRoot "..\test_audio\en\$fileName"
    $synth.SetOutputToWaveFile($outPath)
    $synth.Speak($text)
    $synth.SetOutputToDefaultAudioDevice()
    Write-Output "Wrote $outPath ($text)"
}
