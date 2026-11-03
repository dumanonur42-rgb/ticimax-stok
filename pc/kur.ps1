$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$D = Join-Path $env:LOCALAPPDATA 'YamansaSenkron'
$R = 'https://raw.githubusercontent.com/dumanonur42-rgb/ticimax-stok/pc-senkron/pc'
New-Item -ItemType Directory -Force -Path $D, "$D\kod" | Out-Null
Write-Host 'Yamansa senkron kuruluyor...'
if (-not (Test-Path "$D\python\pythonw.exe")) {
  $z = "$env:TEMP\ys_python.zip"
  Invoke-WebRequest 'https://www.python.org/ftp/python/3.12.7/python-3.12.7-embed-amd64.zip' -OutFile $z -UseBasicParsing
  Expand-Archive $z -DestinationPath "$D\python" -Force; Remove-Item $z
}
foreach ($f in 'guncelle.py') { Invoke-WebRequest "$R/$f" -OutFile "$D\$f" -UseBasicParsing }
foreach ($f in 'cdp.py','senkron.py') { Invoke-WebRequest "$R/$f" -OutFile "$D\kod\$f" -UseBasicParsing }
$t = $env:YS_TOKEN
if (-not $t) { $s = Read-Host 'GitHub anahtarini yapistir' -AsSecureString } else { $s = ConvertTo-SecureString $t -AsPlainText -Force }
ConvertFrom-SecureString $s | Set-Content "$D\token.dat" -Encoding Ascii
Remove-Item Env:\YS_TOKEN -ErrorAction SilentlyContinue
icacls $D /inheritance:r /grant:r "$($env:USERNAME):(OI)(CI)F" | Out-Null
$vbs = @"
Dim s, x
s = ""
For Each x In WScript.Arguments : s = s & " " & x : Next
CreateObject("WScript.Shell").Run """$D\python\pythonw.exe"" ""$D\guncelle.py""" & s, 0, False
"@
Set-Content "$D\calistir.vbs" $vbs -Encoding Ascii
$act = New-ScheduledTaskAction -Execute 'wscript.exe' -Argument "`"$D\calistir.vbs`""
$trg = New-ScheduledTaskTrigger -Daily -At 07:00
$set = New-ScheduledTaskSettingsSet -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Hours 3) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName 'Yamansa Senkron' -Action $act -Trigger $trg -Settings $set -Force | Out-Null
$ws = New-Object -ComObject WScript.Shell
$k = $ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Simdi Guncelle.lnk'))
$k.TargetPath = 'wscript.exe'; $k.Arguments = "`"$D\calistir.vbs`" --elle"; $k.IconLocation = 'shell32.dll,238'; $k.Save()
Write-Host ''
Write-Host 'Simdi bir Edge penceresi acilacak. Rulman Dunyasi ve Madte sekmelerinde giris yap, sonra pencereyi kapat.'
Start-Process "$D\python\python.exe" -ArgumentList "`"$D\guncelle.py`" --giris" -Wait -WindowStyle Hidden
Start-Process 'wscript.exe' -ArgumentList "`"$D\calistir.vbs`""
Write-Host 'Kurulum bitti. Ilk guncelleme arka planda basladi. Bu pencereyi kapatabilirsin.'
