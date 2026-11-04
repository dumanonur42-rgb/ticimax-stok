; Inno Setup 6 – tek dosya kurulum: dist\YamansaPanel_Kurulum.exe
; CI: ISCC.exe kurulum.iss   (önce PyInstaller + Chromium gömme adımları çalışmış olmalı)
; Yönetici gerekmez: %LOCALAPPDATA%\Programs\YamansaPanel altına kurar (Görev Zamanlayıcı görevleri de
; kullanıcı hesabıyla çalıştığı için aynı hesapta kalır).

#define Ad        "Yamansa Sosyal Medya Paneli"
#define Surum     "2.1.0"
#define Yayimci   "Yamansa Rulman"
#define Exe       "YamansaPanel.exe"
#define Kimlik    "YamansaRulman.SosyalMedyaPaneli"

[Setup]
AppId={{7D2C9A61-4B7E-4F2B-9C0E-5A1F0E3B8D42}
AppName={#Ad}
AppVersion={#Surum}
AppVerName={#Ad} {#Surum}
AppPublisher={#Yayimci}
AppPublisherURL=https://www.yamansarulman.com
AppSupportURL=https://wa.me/905526109363
DefaultDirName={localappdata}\Programs\YamansaPanel
DefaultGroupName={#Yayimci}
DisableProgramGroupPage=yes
DisableDirPage=yes
PrivilegesRequired=lowest
ArchitecturesInstallIn64BitMode=x64
ArchitecturesAllowed=x64
OutputDir=dist
OutputBaseFilename=YamansaPanel_Kurulum
SetupIconFile=yamansa.ico
UninstallDisplayIcon={app}\{#Exe}
UninstallDisplayName={#Ad}
WizardStyle=modern
WizardImageFile=kurulum_yan.bmp
WizardSmallImageFile=kurulum_kucuk.bmp
Compression=lzma2/max
SolidCompression=yes
LZMAUseSeparateProcess=yes
CloseApplications=yes
RestartApplications=no
ShowLanguageDialog=no

[Languages]
Name: "turkish"; MessagesFile: "compiler:Languages\Turkish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "dist\YamansaPanel\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "OKU_BENI.txt"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#Ad}"; Filename: "{app}\{#Exe}"; AppUserModelID: "{#Kimlik}"; Comment: "Facebook · Instagram · Facebook grupları paylaşım paneli"
Name: "{group}\{#Ad} – Kaldır"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#Ad}"; Filename: "{app}\{#Exe}"; AppUserModelID: "{#Kimlik}"; Tasks: desktopicon

[Run]
Filename: "{app}\{#Exe}"; Description: "{cm:LaunchProgram,{#StringChange(Ad, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallRun]
; ajanı durdur + YamansaAjan / YamansaUyandir görevlerini sil (kullanıcı verileri %LOCALAPPDATA%\YamansaPanel korunur)
Filename: "{app}\{#Exe}"; Parameters: "--kaldir"; Flags: runhidden waituntilterminated; RunOnceId: "YamansaKaldir"

[Code]
// Güncellemede: dosyalar değiştirilmeden önce arka planda çalışan ajanı kapat (Chromium/DLL kilitleri).
function PrepareToInstall(var NeedsRestart: Boolean): String;
var
  Eski: String;
  Kod: Integer;
begin
  Result := '';
  Eski := ExpandConstant('{app}\{#Exe}');
  if FileExists(Eski) then
  begin
    Exec(Eski, '--durdur', '', SW_HIDE, ewWaitUntilTerminated, Kod);
    Sleep(1500);
  end;
end;
