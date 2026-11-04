"""CI: Görev Zamanlayıcı görevlerini YÖNETİCİ OLMAYAN (standart) bir Windows hesabından kaydetme testi.

Kullanıcının PC'sinde 'ERROR: Erişim engellendi.' görüldü: yönetici hakkı olmayan hesap, kullanıcı
belirtilmemiş oturum açma tetikleyicisi vb. içeren görevleri kaydedemez. Bu betik workflow'da
yeni açılan standart bir yerel hesapla çalıştırılır; gorev.py'nin ürettiği her iki XML kaydedilebilmeli.
"""
import sys

import gorev

sonuc = True
for ad, xml in ((gorev.GOREV, gorev._ajan_xml()), (gorev.GOREV_UYANDIR, gorev._uyandir_xml(["09:00", "12:30", "18:30"]))):
    ok, mesaj = gorev._gorev_yaz(ad, xml)
    print(f"{ad}: {'OK' if ok else 'HATA'} {mesaj}")
    sonuc = sonuc and ok
    if ok:
        _, q = gorev._schtasks("/Query", "/TN", ad, "/XML")
        print(f"  WakeToRun: {'true' if '<WakeToRun>true</WakeToRun>' in q else 'false'} · UserId var: {'<UserId>' in q}")
kurulu = gorev.kurulu()
print("kurulu:", kurulu, "· kullanıcı:", gorev._kullanici(), "· erişim-hatası-tanıma:", gorev._erisim_hatasi("ERROR: Erişim engellendi."))
for ad in (gorev.GOREV, gorev.GOREV_UYANDIR):
    print(gorev._schtasks("/Delete", "/F", "/TN", ad))
sys.exit(0 if sonuc and kurulu else 1)
