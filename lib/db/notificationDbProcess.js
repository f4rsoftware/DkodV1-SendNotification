import sql from 'mssql'
import { pool } from './dbConnect.js'
import {sendNotificationStatusType, settings} from '../global/settings.js'
import { getLogger } from '../utils/logger.js'
import {jsonToSqlParameters} from "../utils/queryProcess.js";

const logger = getLogger('notificationDbProcess.js')
const kacDakika = 3000 // Burası settings den alınacak
async function getSmsTaskList(taskCallId){
    // Sms Gönderilecek Olan Kayıtların Alınması
    // Parametreler:
    // taskCallId: Durumu Beklemede yada Gönderilemedi Olan Kayıtları Alır.
    const queryTextSms = `SELECT * FROM K_DAHIKOD_BILDIRIM WHERE (CAGRI_ID = ${taskCallId}) and
                                          (BILDIRIM_SMS=1) and (BILDIRIM_METNI is not null) and 
                                          (DATEDIFF(minute, BILDIRIM_OLUSTURMA_ZAMANI, GETDATE()) <= @kacDakika) and
                                          (KAYIT_KONTROL_EDILDI=0) and
                                          (BILDIRIM_SMS_ISLEM_ACIKLAMA='${sendNotificationStatusType.Beklemede}') or (BILDIRIM_SMS_ISLEM_ACIKLAMA='${sendNotificationStatusType.Gönderilemedi}')`
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

    const queryTextSesliCagri = `SELECT * FROM K_DAHIKOD_BILDIRIM WHERE (CAGRI_ID = ${taskCallId}) and
                                          (BILDIRIM_SESLI_CAGRI=1) and (SESLI_CAGRI_METNI is not null) and 
                                          (DATEDIFF(minute, BILDIRIM_OLUSTURMA_ZAMANI, GETDATE()) <= @kacDakika) and
                                          (KAYIT_KONTROL_EDILDI=0) and
                                          (BILDIRIM_SESLI_CAGRI_ISLEM_ACIKLAMA='${sendNotificationStatusType.Beklemede}') or (BILDIRIM_SESLI_CAGRI_ISLEM_ACIKLAMA='${sendNotificationStatusType.Gönderilemedi}')`

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
    else if (bildirimTuru=='kirmizisantralseslicagri'){
        queryText= `UPDATE K_DAHIKOD_BILDIRIM SET BILDIRIM_SESLI_CAGRI_ZAMANI = getdate() WHERE CAGRI_ID =  ${taskCallId}
                    AND PERSONEL_TELEFON IN ${notificationListId}`

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




export { setNotificationStatus, getSmsTaskList, getSesliCagriTaskList,setNotificationStatusByPhoneNumber,setNotificationStatusDateTime}
