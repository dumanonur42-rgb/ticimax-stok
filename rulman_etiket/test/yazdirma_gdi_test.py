from __future__ import annotations

import copy
import io
import sys
import tempfile
import types
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np
import pymupdf
import zxingcpp
from PIL import Image, ImageDraw, ImageWin

KOK = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(KOK))

import yazdirma as yz
from etiket_cizim import EtiketVerisi, yerlesim


class SahteWin32Print:
    PRINTER_ACCESS_USE = 8
    DC_ENUMRESOLUTIONS = 13
    DM_PRINTQUALITY = 0x400
    DM_YRESOLUTION = 0x2000

    def __init__(self):
        self.eski = types.SimpleNamespace(
            Fields=0x4,
            PrintQuality=200,
            YResolution=300,
            PaperSize=1,
            PaperWidth=120,
            PaperLength=340,
            Orientation=1,
        )
        self.set_calls = []
        self.closed = False

    def OpenPrinter(self, _yazici, _ayar):
        return 17

    def GetPrinter(self, _kol, seviye):
        if seviye == 9:
            return {"pDevMode": copy.deepcopy(self.eski)}
        return {"pDevMode": copy.deepcopy(self.eski), "pPortName": "USB001"}

    def DeviceCapabilities(self, _yazici, _port, tur):
        if tur == self.DC_ENUMRESOLUTIONS:
            return [(300, 300), (300, 600)]
        return []

    def DocumentProperties(self, *_args):
        return 1

    def SetPrinter(self, _kol, _seviye, ayar, _komut):
        self.set_calls.append(copy.deepcopy(ayar["pDevMode"]))

    def ClosePrinter(self, _kol):
        self.closed = True


class SahteDC:
    def __init__(self, caps, hata=None):
        self.caps = caps
        self.hata = hata
        self.cagrilar = []
        self.cizimler = []

    def CreatePrinterDC(self, _yazici):
        self.cagrilar.append("CreatePrinterDC")

    def GetDeviceCaps(self, kod):
        return self.caps[kod]

    def _islem(self, ad):
        self.cagrilar.append(ad)
        if self.hata == ad:
            raise OSError(ad)
        return 1

    def StartDoc(self, _ad):
        return self._islem("StartDoc")

    def StartPage(self):
        return self._islem("StartPage")

    def EndPage(self):
        return self._islem("EndPage")

    def EndDoc(self):
        return self._islem("EndDoc")

    def AbortDoc(self):
        return self._islem("AbortDoc")

    def GetHandleOutput(self):
        return self

    def DeleteDC(self):
        self.cagrilar.append("DeleteDC")


class SahteDib:
    def __init__(self, goruntu, dc):
        self.goruntu = goruntu.copy()
        self.dc = dc

    def draw(self, hdc, rect):
        if self.dc.hata == "draw":
            self.dc.cagrilar.append("draw")
            raise OSError("draw")
        self.dc.cizimler.append((self.goruntu.copy(), rect))
        return 1


class GdiYazdirmaTesti(unittest.TestCase):
    DPI_X = 300
    DPI_Y = 600
    YAZICI = "Brother QL-550"

    def setUp(self):
        self.gecici = tempfile.TemporaryDirectory()
        self.addCleanup(self.gecici.cleanup)
        self.pdf_sayaci = 0

    def _veri(self, barkod_no=""):
        return EtiketVerisi(
            kod="6308-C-2HRS",
            ek="C3",
            adet=1,
            bilgi1="LOT-123",
            bilgi2="MADE IN TURKEY",
            alt_tekrar=True,
            barkod_no=barkod_no,
        )

    def _caps(self, veri, boyut, logo, cihaz_mm=None):
        y = yerlesim(veri, boyut, logo=logo)
        genislik_mm = y.genislik / 72 * 25.4
        yukseklik_mm = y.yukseklik / 72 * 25.4
        if cihaz_mm is None:
            cihaz_mm = genislik_mm, yukseklik_mm
        return {
            88: self.DPI_X,
            90: self.DPI_Y,
            110: round(cihaz_mm[0] / 25.4 * self.DPI_X),
            111: round(cihaz_mm[1] / 25.4 * self.DPI_Y),
            112: 17,
            113: 29,
        }, y

    def _yazdir(self, veri, boyut, kopya=1, logo=None, cihaz_mm=None, hata=None):
        caps, y = self._caps(veri, boyut, logo, cihaz_mm)
        dc = SahteDC(caps, hata)
        self.son_dc = dc
        yazici = SahteWin32Print()
        self.son_yazici = yazici
        win32print = types.ModuleType("win32print")
        for ad in (
            "PRINTER_ACCESS_USE",
            "DC_ENUMRESOLUTIONS",
            "DM_PRINTQUALITY",
            "DM_YRESOLUTION",
            "OpenPrinter",
            "GetPrinter",
            "DeviceCapabilities",
            "DocumentProperties",
            "SetPrinter",
            "ClosePrinter",
        ):
            setattr(win32print, ad, getattr(yazici, ad))
        win32ui = types.ModuleType("win32ui")
        win32ui.CreateDC = lambda: dc
        win32con = types.ModuleType("win32con")
        for ad, value in (
            ("LOGPIXELSX", 88),
            ("LOGPIXELSY", 90),
            ("PHYSICALWIDTH", 110),
            ("PHYSICALHEIGHT", 111),
            ("PHYSICALOFFSETX", 112),
            ("PHYSICALOFFSETY", 113),
        ):
            setattr(win32con, ad, value)
        self.pdf_sayaci += 1
        pdf = Path(self.gecici.name) / f"{boyut}_{self.pdf_sayaci}.pdf"
        with (
            patch.dict(sys.modules, {
                "win32print": win32print,
                "win32ui": win32ui,
                "win32con": win32con,
            }),
            patch.object(yz.sys, "platform", "win32"),
            patch.object(yz, "yazicilari_listele", return_value=[self.YAZICI]),
            patch.object(yz, "_yazdirma_pdf_yolu", return_value=pdf),
            patch.object(ImageWin, "Dib", side_effect=lambda img: SahteDib(img, dc)),
        ):
            sonuc = yz.yazdir(veri, boyut, kopya, self.YAZICI, logo=logo)
        return sonuc, dc, yazici, y

    def test_eslesen_boyutlar_300x600_ofset_ve_kagit_ayari(self):
        for boyut in ("62x25", "62x35", "62x62", "62x100", "62surekli"):
            with self.subTest(boyut=boyut):
                veri = self._veri()
                pdf, dc, yazici, y = self._yazdir(veri, boyut)
                with pymupdf.open(pdf) as belge:
                    sayfa = belge[0]
                    beklenen = (
                        round(sayfa.rect.width / 72 * self.DPI_X),
                        round(sayfa.rect.height / 72 * self.DPI_Y),
                    )
                goruntu, rect = dc.cizimler[0]
                self.assertEqual(goruntu.size, beklenen)
                self.assertEqual(goruntu.mode, "1")
                self.assertEqual(
                    rect,
                    (-17, -29, -17 + beklenen[0], -29 + beklenen[1]),
                )
                self.assertEqual(dc.cagrilar.count("StartPage"), 1)
                self.assertIn("EndDoc", dc.cagrilar)
                self.assertNotIn("AbortDoc", dc.cagrilar)
                self.assertIn("DeleteDC", dc.cagrilar)
                self.assertTrue(yazici.closed)
                secilen = yazici.set_calls[0]
                self.assertEqual((secilen.PrintQuality, secilen.YResolution), (300, 600))
                self.assertEqual((secilen.PaperSize, secilen.PaperWidth), (256, 620))
                beklenen_uzunluk = (
                    1000 if boyut == "62x100"
                    else round(y.yukseklik / 72 * 254)
                )
                self.assertEqual(secilen.PaperLength, beklenen_uzunluk)
                geri_yuklenen = yazici.set_calls[-1]
                self.assertEqual(
                    (geri_yuklenen.Fields, geri_yuklenen.PrintQuality,
                     geri_yuklenen.YResolution, geri_yuklenen.PaperSize,
                     geri_yuklenen.PaperWidth, geri_yuklenen.PaperLength),
                    (yazici.eski.Fields, yazici.eski.PrintQuality,
                     yazici.eski.YResolution, yazici.eski.PaperSize,
                     yazici.eski.PaperWidth, yazici.eski.PaperLength),
                )
                if boyut == "62x62":
                    with pymupdf.open(pdf) as belge:
                        beklenen_goruntu = yz._sayfayi_tek_bit_yap(
                            belge[0], self.DPI_X, self.DPI_Y, []
                        )
                    self.assertEqual(goruntu.tobytes(), beklenen_goruntu.tobytes())

    def test_kopya_basina_bir_sayfa(self):
        _, dc, _, _ = self._yazdir(self._veri(), "62x100", kopya=3)
        self.assertEqual(dc.cagrilar.count("StartPage"), 3)
        self.assertEqual(len(dc.cizimler), 3)

    def test_swapped_device_rotates_bitmap(self):
        veri = self._veri()
        y = yerlesim(veri, "62x25")
        swapped = (y.yukseklik / 72 * 25.4, y.genislik / 72 * 25.4)
        _, dc, _, _ = self._yazdir(veri, "62x25", cihaz_mm=swapped)
        goruntu, _ = dc.cizimler[0]
        self.assertEqual(
            goruntu.size,
            (
                round(y.yukseklik / 72 * self.DPI_X),
                round(y.genislik / 72 * self.DPI_Y),
            ),
        )

    def test_mismatched_media_aborts_and_deletes_dc(self):
        veri = self._veri()
        with self.assertRaisesRegex(
            yz.YazdirmaHatasi,
            r"Yazıcının etiket boyu ayarı etiketle uyuşmuyor\. Yazıcı ayarlarını kontrol edin\.",
        ):
            _, dc, _, _ = self._yazdir(
                veri, "62x25", cihaz_mm=(40, 160)
            )
        dc = self.son_dc
        self.assertIn("AbortDoc", dc.cagrilar)
        self.assertNotIn("EndDoc", dc.cagrilar)
        self.assertIn("DeleteDC", dc.cagrilar)

    def test_win32_hatasi_abort_ve_turkce_mesaj(self):
        with self.assertRaisesRegex(
            yz.YazdirmaHatasi,
            r"Yazıcı etiketi kabul etmedi\.",
        ):
            _, dc, _, _ = self._yazdir(
                self._veri(), "62x100", hata="StartPage"
            )
        dc = self.son_dc
        self.assertIn("AbortDoc", dc.cagrilar)
        self.assertIn("DeleteDC", dc.cagrilar)

    def test_logo_regions_are_dithered_and_other_pixels_are_one_bit(self):
        logo_img = Image.new("RGBA", (64, 32), (255, 255, 255, 0))
        ImageDraw.Draw(logo_img).rectangle((12, 6, 51, 25), fill=(128, 128, 128, 255))
        logo_io = io.BytesIO()
        logo_img.save(logo_io, format="PNG")
        logo = logo_io.getvalue()
        veri = self._veri()
        layout = yerlesim(veri, "62x100", logo=logo)
        rects = yz._logo_rectleri(layout)
        self.assertEqual(len(rects), 2)

        aa = pymupdf.mupdf.fz_aa_level()
        try:
            pymupdf.TOOLS.set_aa_level(3)
            beklenen_aa = pymupdf.mupdf.fz_aa_level()
            _, dc, _, _ = self._yazdir(veri, "62x100", logo=logo)
            self.assertEqual(pymupdf.mupdf.fz_aa_level(), beklenen_aa)
        finally:
            pymupdf.TOOLS.set_aa_level(aa)

        goruntu = dc.cizimler[0][0]
        values = set(np.unique(np.asarray(goruntu.convert("L"))).tolist())
        self.assertLessEqual(values, {0, 255})
        for x0, y0, x1, y1 in rects:
            box = (
                round(x0 * self.DPI_X / 72),
                round(y0 * self.DPI_Y / 72),
                round(x1 * self.DPI_X / 72),
                round(y1 * self.DPI_Y / 72),
            )
            logo_values = set(
                np.unique(np.asarray(goruntu.crop(box).convert("L"))).tolist()
            )
            self.assertEqual(logo_values, {0, 255})

    def test_printer_bitmaps_decode_ean_and_code128(self):
        ean = self._veri("8691234567890")
        _, ean_dc, _, _ = self._yazdir(ean, "62x25")
        ean_scan = np.asarray(ean_dc.cizimler[0][0].convert("L"))[::2, :].copy()
        ean_codes = zxingcpp.read_barcodes(ean_scan)
        self.assertTrue(any(
            code.format == zxingcpp.BarcodeFormat.EAN13
            and code.text == "8691234567890"
            for code in ean_codes
        ))

        code128 = EtiketVerisi(kod="6205-2RS", ek="C3")
        _, code_dc, _, _ = self._yazdir(code128, "62x100")
        code_scan = np.asarray(code_dc.cizimler[0][0].convert("L"))[::2, :].copy()
        code_results = zxingcpp.read_barcodes(code_scan)
        code_detections = [(code.format.name, code.text) for code in code_results]
        self.assertTrue(any(
            code.format == zxingcpp.BarcodeFormat.Code128
            and code.text == "6205-2RS C3"
            for code in code_results
        ), code_detections)


if __name__ == "__main__":
    unittest.main(verbosity=2)
