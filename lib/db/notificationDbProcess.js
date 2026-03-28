import sql from 'mssql'
import { pool } from './dbConnect.js'
import {sendNotificationStatusType, settings} from '../global/settings.js'
import { getLogger } from '../utils/logger.js'
import {jsonToSqlParameters} from "../utils/queryProcess.js";

const logger = getLogger('notificationDbProcess.js')


async function getSmsTaskList(taskCallId){
    const kacDakika = settings.kacDakikaOncekiBildirimGonderilsin // Burası settings den alınacak
    // Sms Gönderilecek Olan Kayıtların Alınması
    // Parametreler:
    // taskCallId: Durumu Beklemede yada Gönderilemedi Olan Kayıtları Alır.
    const queryTextSms = `SELECT * FROM K_DAHIKOD_BILDIRIM WHERE (CAGRI_ID = ${taskCallId}) and
                                          (BILDIRIM_SMS=1) and (BILDIRIM_METNI is not null) and 
                                          (DATEDIFF(minute, BILDIRIM_OLUSTURMA_ZAMANI, GETDATE()) <= @kacDakika) and
                                          (KAYIT_KONTROL_EDILDI=0) and
                                          ((BILDIRIM_SMS_ISLEM_ACIKLAMA='${sendNotificationStatusType.Beklemede}') or (BILDIRIM_SMS_ISLEM_ACIKLAMA='${sendNotificationStatusType.Gönderilemedi}'))`
    try
    {

        await pool.connect()
        const request = pool.request()
        request.input('kacDakika', sql.Int, kacDakika)
        const result = await request.query(queryTextSms)
        return result.recordset
    }
    catch (err)
    {
        logger.error('SQL error runSmsTaskList', err)
        return false
    }

}

async function getSesliCagriTaskList(taskCallId){
    // Sesli Çağrı Gönderilecek Olan Kayıtların Alınması
    // Parametreler:
    // taskCallId: Gönderilecek çağrı id'si. Birden fazla değer olabilir.
    const kacDakika = settings.kacDakikaOncekiBildirimGonderilsin // Burası settings den alınacak
    const queryTextSesliCagri = `SELECT * FROM K_DAHIKOD_BILDIRIM WHERE (CAGRI_ID = ${taskCallId}) and
                                          (BILDIRIM_SESLI_CAGRI=1) and (SESLI_CAGRI_METNI is not null) and 
                                          (DATEDIFF(minute, BILDIRIM_OLUSTURMA_ZAMANI, GETDATE()) <= @kacDakika) and
                                          (KAYIT_KONTROL_EDILDI=0) and
                                          ((BILDIRIM_SESLI_CAGRI_ISLEM_ACIKLAMA='${sendNotificationStatusType.Beklemede}') or (BILDIRIM_SESLI_CAGRI_ISLEM_ACIKLAMA='${sendNotificationStatusType.Gönderilemedi}'))`

    try
    {
        await pool.connect()
        const request = pool.request()
        request.input('kacDakika', sql.Int, kacDakika)
        const result = await request.query(queryTextSesliCagri)
        return result.recordset
    }
    catch (err)
    {
        logger.error('SQL error runSesliCagriTaskList', err)
        return false
    }

}

async function getMobileBildirimTaskList(taskCallId){
    // Sesli Çağrı Gönderilecek Olan Kayıtların Alınması
    // Parametreler:
    // taskCallId: Gönderilecek çağrı id'si. Birden fazla değer olabilir.
    const kacDakika = settings.kacDakikaOncekiBildirimGonderilsin // Burası settings den alınacak
    const queryTextSesliCagri = `SELECT * FROM K_DAHIKOD_BILDIRIM WHERE (CAGRI_ID = ${taskCallId}) and
                                          (DATEDIFF(minute, BILDIRIM_OLUSTURMA_ZAMANI, GETDATE()) <= @kacDakika) and
                                          (BILDIRIM_MOBILE=1)  and                                          
                                          (KAYIT_KONTROL_EDILDI=0) and
                                          (BILDIRIM_MOBILE_ISLEM_ACIKLAMA='${sendNotificationStatusType.Beklemede}')`

    try
    {
        await pool.connect()
        const request = pool.request()
        request.input('kacDakika', sql.Int, kacDakika)
        const result = await request.query(queryTextSesliCagri)
        return result.recordset
    }
    catch (err)
    {
        logger.error('SQL error runMobileBildirimTaskList', err)
        return false
    }

}



async function getCallReminderTaskList(kontrolDakikaBaslama, kontrolDakikaBitis) {
    const queryCallReminderTaskList = `
    WITH CTE AS (
        SELECT
            b.BILDIRIM_DENEME_ID,
            b.CAGRI_ID,
            b.PERSONEL_ID,
            b.PERSONEL_TELEFON,
            b.BILDIRIM_SESLI_CAGRI,
            b.CAGRI_ONAYI_HATIRLARMA_ARAMA_SAYISI,
            b.CAGRI_ONAYI_HATIRLATMA_ARAMASI_YAPILACAK,
            b.CAGRI_ONAY_BILDIRIM_METNI,
            c.CAGRI_DURUMU,
            c.CAGRI_ZAMANI,
            c.TEST_CAGRISI,
            DATEDIFF(MINUTE, c.CAGRI_ZAMANI, GETDATE()) AS MINUTES_PASSED
        FROM
            K_DAHIKOD_BILDIRIM b
        JOIN
            K_DAHIKOD_CAGRI c ON b.CAGRI_ID = c.CAGRI_ID
        WHERE
            c.CAGRI_DURUMU = 1
            AND b.BILDIRIM_SESLI_CAGRI = 1
            AND b.CAGRI_ONAYI_HATIRLATMA_ARAMASI_YAPILACAK = 1
            AND b.PERSONEL_TELEFON IS NOT NULL
            AND b.CAGRI_ONAY_BILDIRIM_METNI IS NOT NULL
            AND b.BILDIRIM_SESLI_CAGRI_DURUM = 1
            AND c.TEST_CAGRISI=0
        )
        SELECT *
        FROM CTE
        WHERE MINUTES_PASSED >= @kontrolDakikaBaslama
            AND MINUTES_PASSED < @kontrolDakikaBitis
        ORDER BY CAGRI_ID DESC;
    `
    try {
        await pool.connect()
        const request = pool.request()
        request.input('kontrolDakikaBaslama', kontrolDakikaBaslama)
        request.input('kontrolDakikaBitis', kontrolDakikaBitis)
        const result = await request.query(queryCallReminderTaskList)
        return result.recordset
    } catch (err) {
        logger.error('SQL error getCallReminderTaskList', err)
        return false
    }
}


async function setNotificationStatus(fieldName, callId = null, value, notificationListId = null) {
    // Bildirimlerin gönderilme durumlarının güncellenmesi işlemini yapar.
    // Parametreler:
    // fieldName: Güncellenecek alan adı
    // callId: Güncellenecek çağrı id'si
    // value: Güncellenecek değer
    // notificationListId: Güncellenecek notification list id'si
    if (!fieldName) {
        logger.error('setNotificationStatus: fieldName is null')
        return false
    }
    let queryText
    if ((notificationListId === null)) {
        queryText = `UPDATE K_DAHIKOD_BILDIRIM SET ${fieldName} = '${value}' WHERE CAGRI_ID = ${callId}`
    } else {
        queryText = `UPDATE K_DAHIKOD_BILDIRIM SET ${fieldName} = '${value}' WHERE BILDIRIM_DENEME_ID IN ${notificationListId}`
    }
    try {
        await pool.query(queryText)
        return true
    } catch (err) {
        logger.error(err.stack)
    }
}



async function setCallReminderHandlerReplyCount(notificationListId) {
    // Çağrı Onay Aramasındaki Arama Sayısı Alanını Günceller.

    let queryText
        queryText = `UPDATE K_DAHIKOD_BILDIRIM SET CAGRI_ONAYI_HATIRLARMA_ARAMA_SAYISI = CAGRI_ONAYI_HATIRLARMA_ARAMA_SAYISI + 1  WHERE BILDIRIM_DENEME_ID IN ${notificationListId}`

    try {
        logger.info("Çağrı Onayı Hatırlatma Sayısı Arttırıldı.")
        await pool.query(queryText)
        return true
    } catch (err) {
        logger.error(err.stack)
    }
}

async function setNotificationStatusMobile(fieldName, value, notificationListId = null) {
    // Bildirimlerin gönderilme durumlarının güncellenmesi işlemini yapar.
    // Parametreler:
    // fieldName: Güncellenecek alan adı
    // callId: Güncellenecek çağrı id'si
    // value: Güncellenecek değer
    // notificationListId: Güncellenecek notification list id'si
    if (!fieldName) {
        logger.error('setNotificationStatus: fieldName is null')
        return false
    }
    let queryText
    queryText = `UPDATE K_DAHIKOD_BILDIRIM SET ${fieldName} = '${value}' WHERE BILDIRIM_DENEME_ID = ${notificationListId}`
    // if ((notificationListId === null)) {
    //     queryText = `UPDATE K_DAHIKOD_BILDIRIM SET ${fieldName} = '${value}' WHERE CAGRI_ID = ${callId}`
    // } else {
    //     queryText = `UPDATE K_DAHIKOD_BILDIRIM SET ${fieldName} = '${value}' WHERE BILDIRIM_DENEME_ID IN ${notificationListId}`
    // }
    try {
        await pool.query(queryText)
        return true
    } catch (err) {
        logger.error(err.stack)
    }
}

async function deleteTokenPersonel(taskId) {
    // Hatalı mobil token personellerin token değerlerini siler.
    // Parametreler:
    // taskId: Bildirim tablosundaki hatalı işlem satırını temsil eder
    if (!taskId) {
        logger.error('deleteTokenPersonel: taskId is null')
        return false
    }
    let queryText
    queryText = `UPDATE S_PERSONEL SET MOBIL_APP_TOKEN=NULL WHERE PERSONEL_ID=(
                    SELECT PERSONEL_ID FROM K_DAHIKOD_BILDIRIM WHERE BILDIRIM_DENEME_ID = ${taskId})`
    try {
        await pool.query(queryText)
        logger.info('Hatalı Personel Tokenları Silindi.')
        return true
    } catch (err) {
        logger.error(err.stack)
    }
}

async function setNotificationStatusDateTime(bildirimTuru, notificationListId, taskCallId=null) {
    // Bildirimlerin gönderilme durumlarının güncellenmesi işlemini yapar.
    // Parametreler:
    // fieldName: Güncellenecek alan adı
    // callId: Güncellenecek çağrı id'si
    // value: Güncellenecek değer
    // notificationListId: Güncellenecek notification list id'si

    let queryText
    if (bildirimTuru=='sms'){
        queryText= `UPDATE K_DAHIKOD_BILDIRIM SET BILDIRIM_SMS_ZAMANI = getdate() WHERE BILDIRIM_DENEME_ID IN ${notificationListId}`
    }
    else if (bildirimTuru=='sesliCagri'){
        queryText= `UPDATE K_DAHIKOD_BILDIRIM SET BILDIRIM_SESLI_CAGRI_ZAMANI = getdate() WHERE BILDIRIM_DENEME_ID IN ${notificationListId}`
    }
    else if (bildirimTuru=='mail'){
        queryText= `UPDATE K_DAHIKOD_BILDIRIM SET BILDIRIM_MAIL_ZAMANI = getdate() WHERE BILDIRIM_DENEME_ID IN ${notificationListId}`
    }
    else if (bildirimTuru=='kirmizisantralseslicagri') {
        queryText = `UPDATE K_DAHIKOD_BILDIRIM SET BILDIRIM_SESLI_CAGRI_ZAMANI = getdate() WHERE CAGRI_ID =  ${taskCallId}
                    AND PERSONEL_TELEFON IN ${notificationListId}`
    }
    else if (bildirimTuru=='mobile'){
            queryText= `UPDATE K_DAHIKOD_BILDIRIM SET BILDIRIM_MOBILE_ZAMANI = getdate() WHERE BILDIRIM_DENEME_ID IN ${notificationListId}`

    }

    try {
        await pool.query(queryText)
        return true
    } catch (err) {
        logger.error('setNotificationStatusDateTime: ' + queryText)
        logger.error(err.stack)
    }
}

async function setNotificationStatusByPhoneNumber(fieldName, callId, value, phoneNumber) {
    // Bildirimlerin gönderilme durumlarının güncellenmesi işlemini yapar.
    // Parametreler:
    // fieldName: Güncellenecek alan adı
    // callId: Güncellenecek çağrı id'si
    // value: Güncellenecek değer
    // notificationListId: Güncellenecek notification list id'si
    if (!fieldName) {
        logger.error('setNotificationStatus: fieldName is null')
        return false
    }

    const queryText = `UPDATE K_DAHIKOD_BILDIRIM SET ${fieldName} = '${value}' WHERE CAGRI_ID =  ${callId} AND 
                       PERSONEL_TELEFON IN ${phoneNumber}`

    try {
        await pool.query(queryText)
        return true
    } catch (err) {
        logger.error(err)
        logger.error('setNotificationStatusByPhoneNumber: ' + queryText)
    }
}




export { setNotificationStatus, setNotificationStatusMobile,
        getSmsTaskList, getSesliCagriTaskList,setNotificationStatusByPhoneNumber,setNotificationStatusDateTime,getMobileBildirimTaskList,
        getCallReminderTaskList,setCallReminderHandlerReplyCount,deleteTokenPersonel}
