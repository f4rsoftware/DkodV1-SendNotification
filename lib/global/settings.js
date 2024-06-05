// Ayarlar için bir nesne oluşturuluyor
const settings = {
    bildirimGondermeDenemeSayisi: null,
    kacDakikaOncekiBildirimGonderilsin: null,
    netGsmBirinciFirma: null,
    kirmiziSantralBirinciFirma: null,
    kobicomBirinciFirma: null,
    smsActive: null,
    mailActive: null,
    sesliCagriActive: null,
    mobileActive: null,
    tekSeferdeSmsGonderilecekKisiSayisi: null,
    tekSeferdeMailGonderilecekKisiSayisi: null,
    tekSeferdeSesliCagriGonderilecekKisiSayisi: null,
    cagriOnayAramasiAktifligi: null,
    cagriOnayAramasiKontrolDakikasiBaslangic: null,
    cagriOnayAramasiKontrolDakikasiBitis: null
}

const sendNotificationStatusType = {
    Beklemede: "Beklemede",
    İşlemeAlındı: "İşleme Alındı",
    Gönderildi: "Gönderildi",
    Gönderilemedi: "Gönderilemedi",
    SmsBildirimGönderimiKapalı: "Genel Sms Gönderimi Kapalı",
    SesliÇağrıBildirimGönderimiKapalı: "Genel Sesli Çağrı Gönderimi Kapalı",
    EmailBildirimGönderimiKapalı: "Genel E-Mail Gönderimi Kapalı",
    TelefonNumarasıYok: "Telefon Numarası Yok",
    EMailAdresiYok: "E-Mail Bilgisi Yok",
    MobileTokenYok: "Mobil Token Bilgisi Yok",
    AyarlarıKontrolEdiniz: "Ayarları Kontrol Ediniz"
}

const notificationType = {
    mail: 'mail',
    sms: 'sms',
    seslicagri: 'seslicagri',
    mobil: 'mobil'
}

// Dışa aktarılacak nesne
export { settings, sendNotificationStatusType,notificationType }
