import { pool, poolConnect } from "./dbConnect.js"
import { getLogger } from "../utils/logger.js"
import { settings, sendNotificationStatusType } from '../global/settings.js'

const logger = getLogger('settingProcess.js')


async function getControlVariable() {
    // Ayarların K_DAHIKOD_AYARLAR tablosundan alınması
    await poolConnect
    try {
        const result = await pool.request()
            .query('SELECT BILDIRIM_GONDERME_DENEME_SAYISI,KAC_DAKIKA_ONCEKI_BILDIRIM_GONDERILSIN,' +
                'NET_GSM_BIRINCI_FIRMA,KIRMIZI_SANTRAL_BIRINCI_FIRMA,TEK_SEFERDE_SMS_GONDERILECEK_KISI_SAYISI, ' +
                'TEK_SEFERDE_SESLI_CAGRI_GONDERILECEK_KISI_SAYISI,TEK_SEFERDE_MAIL_GONDERILECEK_KISI_SAYISI FROM K_DAHIKOD_AYARLAR')
        const dbSettings = result.recordset[0]
        settings.bildirimGondermeDenemeSayisi = dbSettings.BILDIRIM_GONDERME_DENEME_SAYISI
        settings.kacDakikaOncekiBildirimGonderilsin = dbSettings.KAC_DAKIKA_ONCEKI_BILDIRIM_GONDERILSIN
        settings.netGsmBirinciFirma = dbSettings.NET_GSM_BIRINCI_FIRMA
        settings.kirmiziSantralBirinciFirma = dbSettings.KIRMIZI_SANTRAL_BIRINCI_FIRMA
        settings.tekSeferdeSmsGonderilecekKisiSayisi = dbSettings.TEK_SEFERDE_SMS_GONDERILECEK_KISI_SAYISI
        settings.tekSeferdeSesliCagriGonderilecekKisiSayisi = dbSettings.TEK_SEFERDE_SESLI_CAGRI_GONDERILECEK_KISI_SAYISI
        settings.tekSeferdeMailGonderilecekKisiSayisi = dbSettings.TEK_SEFERDE_MAIL_GONDERILECEK_KISI_SAYISI

    } catch (err) {
        logger.error('SQL error getControlVariable', err);
    }
}

async function getNotificationStatusSetting() {
    // Ayarların S_GENEL_AYARLAR tablosundan alınması
    await poolConnect
    try {
        const result = await pool.request()
            .query('SELECT SMS_DURUM,EPOSTA_DURUM,SESLI_CAGRI_AKTIF FROM S_GENELAYARLAR')
        const dbSettings = result.recordset[0]
        settings.smsActive = dbSettings.SMS_DURUM
        settings.mailActive = dbSettings.EPOSTA_DURUM
        settings.sesliCagriActive = dbSettings.SESLI_CAGRI_AKTIF
    } catch (err) {
        logger.error('SQL error getNotificationStatusSetting', err);
    }
}


async function setSystemWorkingSet() {
    // Sistem Çalışma Değerlerini kontrol eder ve eğer yoksa ekler.
    // Verileri defaultValueList.mjs içinden alır.
    let queryText = null
    // Notification Send Status Tip Değerleri
    const keys6 = Object.keys(sendNotificationStatusType)
    for (const key of keys6) {
        const value = sendNotificationStatusType[key]

        queryText = `INSERT INTO S_BILDIRIM_DURUM_TIPLERI (DURUM_DEGERI,DURUM_ADI)
                               SELECT '${value}' , '${key}'
                               WHERE NOT EXISTS (SELECT 1 FROM S_BILDIRIM_DURUM_TIPLERI WHERE DURUM_ADI = '${key}')`
        try {
            await pool.query(queryText)
        } catch (err) {
            logger.error(err)
        }
    }
}

async function settingProcessRun() {
    // Ayarların alınması
    await getControlVariable()
    await getNotificationStatusSetting()
   // await setSystemWorkingSet()
    logger.info('Genel Setting İşlemleri Tamamlandı.')
}

export { settingProcessRun }
