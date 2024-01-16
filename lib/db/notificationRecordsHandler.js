import sql from 'mssql'
import { pool } from './dbConnect.js'
import { getLogger } from '../utils/logger.js'
import { settings } from '../global/settings.js'

const logger = getLogger('notificationRecordsHandler.js')


let kacDakika = settings.kacDakikaOncekiBildirimGonderilsin //Bildirim Gönderilecek Dakika Sınırırın alınması
/// <summary>
/// Bildirim gönderilecek kayıtları alır.
async function getTaskCount(){
// Ayarlarda Verilen Süre İçerisinde Belirtilen  Bildirim Türünde Gönderilmemiş Çağrıların Alınması.
// Buradan dönen değer task'ın döngü sayısını belirler.
// Call_id bazında kayıtlar gruplandırılarak çağrıya ait kayıt sayısı alınıyor.
// Return: Task Call_id List
//     let param1 = null
//     let param2 = null
//
//     if (!notificationType) {
//         logger.error('getTaskCount: notificationType is null')
//         return false
//     } else if (notificationType === 'mail') {
//         param1 = 'BILDIRIM_MAIL'
//         param2 = 'BILDIRIM_MAIL_ISLEM_ACIKLAMA'
//     } else if (notificationType === 'sms') {
//         param1 = 'BILDIRIM_SMS'
//         param2 = 'BILDIRIM_SMS_ISLEM_ACIKLAMA'
//     } else if (notificationType === 'seslicagri') {
//         param1 = 'BILDIRIM_SESLI_CAGRI'
//         param2 = 'BILDIRIM_SESLI_CAGRI_ISLEM_ACIKLAMA'
//     }

    const kacDakika = settings.kacDakikaOncekiBildirimGonderilsin
   // kacDakika = 3000
    logger.info("Son " +  kacDakika + " dakika içindeki bildirimler alınıyor.")

    const sorgu = `
        SELECT CAGRI_ID FROM K_DAHIKOD_BILDIRIM WHERE 
        (KAYIT_KONTROL_EDILDI=0) AND
        (DATEDIFF(minute, BILDIRIM_OLUSTURMA_ZAMANI, GETDATE()) <= @kacDakika) AND
        (BILDIRIM_MAIL=1 OR BILDIRIM_SMS=1 OR BILDIRIM_SESLI_CAGRI=1)
        GROUP BY CAGRI_ID`

    try {
        await pool.connect()
        const request = pool.request()
        request.input('kacDakika', sql.Int, kacDakika)
        const result = await request.query(sorgu)
        // Eğer sonuç seti boşsa, false dön
        if (result.recordset !== 0) {
            return result.recordset
            //return jsonToSqlParameters(result.recordset, 'CAGRI_ID')
        } else {
            logger.info("Son " + kacDakika + " dakika içinde bildirim gönderilecek kayıt bulunamadı.")
            return false
        }
    } catch (err) {
        logger.error('SQL error', err);
        throw err;
    }
}

export { getTaskCount }
