import { getLogger } from "../utils/logger.js"
import { settings, sendNotificationStatusType } from '../global/settings.js'
import {getSmsTaskList, setNotificationStatus, setNotificationStatusDateTime} from "../db/notificationDbProcess.js"
import {pool} from "../db/dbConnect.js"
import {getTaskCount} from "../db/notificationRecordsHandler.js"
import {jsonToSqlParameters} from "../utils/queryProcess.js"
import {sendSMSKirmizi, sendSMSNetGsm,sendSMSKobicom} from "../notificationModule/sendSms.js"
const logger = getLogger('runSmsTask.js')

function buildSmsFirmPriorityList() {
    const tumFirmalar = ['NETGSM', 'KIRMIZISANTRAL', 'KOBIKOM']
    if (settings.aktifBirinciFirma) {
        const birinci = String(settings.aktifBirinciFirma).toUpperCase().trim()
        const ikinci  = settings.aktifIkinciFirma ? String(settings.aktifIkinciFirma).toUpperCase().trim() : null
        const liste = [birinci]
        if (ikinci && ikinci !== birinci) liste.push(ikinci)
        for (const f of tumFirmalar) {
            if (!liste.includes(f)) liste.push(f)
        }
        return liste
    }
    // Eski boolean flag mantığı (geriye dönük uyumluluk)
    const birinci = []
    const diger = []
    const firmalar = [
        { name: 'NETGSM',         isPrimary: settings.netGsmBirinciFirma },
        { name: 'KIRMIZISANTRAL', isPrimary: settings.kirmiziSantralBirinciFirma },
        { name: 'KOBIKOM',        isPrimary: settings.kobicomBirinciFirma }
    ]
    for (const f of firmalar) {
        if (f.isPrimary) birinci.push(f.name)
        else diger.push(f.name)
    }
    return [...birinci, ...diger]
}

async function runSmsTaskList(taskCallId) {
    //tastCallId : Kontrol Edilecek Çağrı Id Değeri
    if (!taskCallId) { return false }

    let notificationSendCount = 1
    let counter = 0
    const firmPriorityList = buildSmsFirmPriorityList()
    let currentFirmIndex = 0
    logger.info('SMS Firma Öncelik Sırası: ' + firmPriorityList.join(' > '))

    while (notificationSendCount !== 0 && counter < settings.bildirimGondermeDenemeSayisi) {
        try {
            const sendSmsPersonelList = await getSmsTaskList(taskCallId) // Bildirim Gönderilecek Sms Kayıtlar Alınıyor.
            notificationSendCount = sendSmsPersonelList.length //Kayıt Sayısı Alınıyor.          

            // Eğer kayıt yoksa, döngüyü bitir.
            if (notificationSendCount === 0) {
                logger.info('Bildirim Gönderilecek Sms Kayıtları Tammalandı yada Kayıt Yok....')
                return true
            }

            logger.info('Bildirim Gönderilecek Sms Kayıt Sayısı: ' + notificationSendCount)
            logger.info('Tek Seferde Gönderilecek Sms Sayısı: ' + settings.tekSeferdeSmsGonderilecekKisiSayisi)

            // Bildirim Gönderilecek Kayıtların Id Değerlerinin Alınması
            const islemeAlinanKayitlar = jsonToSqlParameters(sendSmsPersonelList, 'BILDIRIM_DENEME_ID',settings.tekSeferdeSmsGonderilecekKisiSayisi)
            //console.log('İşleme Alinan Kayitlar : ' + islemeAlinanKayitlar)

            await setNotificationStatus('BILDIRIM_SMS_ISLEM_ACIKLAMA', null, sendNotificationStatusType.İşlemeAlındı,islemeAlinanKayitlar) //Bildirim Gönderilecek Sms Kayıtların Durumları İşleme Alındı Olarak Güncelleniyor.

            const sendSmsPersonelListArray = Object.values(sendSmsPersonelList) //Bildirim Gönderilecek Sms Kayıtlar Array'e Dönüştürülüyor.
            const smsGonderilecekGrup=sendSmsPersonelListArray.slice(0, settings.tekSeferdeSmsGonderilecekKisiSayisi) //Bildirim Gönderilecek Kayıtları Grupluyor.

            const smsPersonelPhonesNetGsm = smsGonderilecekGrup.map(item => item.PERSONEL_TELEFON.trimEnd()).join(',')
            const smsPersonelPhones = smsGonderilecekGrup.map(item => item.PERSONEL_TELEFON)
            const smsText = sendSmsPersonelList[0].BILDIRIM_METNI.trimEnd()
            const smsTextNl = smsText.replace(/\\n/g, "\n")

            // Sıradaki firmayı belirle
            const currentFirm = firmPriorityList[currentFirmIndex % firmPriorityList.length]
            let responseSms = false

            if (currentFirm === 'NETGSM') {
                responseSms = await sendSMSNetGsm(smsPersonelPhonesNetGsm, smsText)
                await setNotificationStatus('BILDIRIM_SMS_FIRMA', null, 'NETGSM', islemeAlinanKayitlar)
            } else if (currentFirm === 'KIRMIZISANTRAL') {
                responseSms = await sendSMSKirmizi(smsPersonelPhones, smsTextNl)
                await setNotificationStatus('BILDIRIM_SMS_FIRMA', null, 'KIRMIZISANTRAL', islemeAlinanKayitlar)
            } else {
                responseSms = await sendSMSKobicom(smsPersonelPhones, smsTextNl)
                await setNotificationStatus('BILDIRIM_SMS_FIRMA', null, 'KOBIKOM', islemeAlinanKayitlar)
            }

            await setNotificationStatus('ISLEM_SAYACI_SMS', null, counter+1,islemeAlinanKayitlar) //Bildirim Gönderim Deneme Sayısı İşleniyor.
            await setNotificationStatus('BILDIRIM_SMS_ID',null,  responseSms.data,islemeAlinanKayitlar) //Bildirim Gönderilen Sms Kayıtların Sms Id'leri Güncelleniyor.
            await setNotificationStatusDateTime('sms', islemeAlinanKayitlar) //Bildirim Gönderim Zamanı  İşleniyor.

            if (!responseSms.success){
                await setNotificationStatus('BILDIRIM_SMS_ISLEM_ACIKLAMA', null, sendNotificationStatusType.Gönderilemedi, islemeAlinanKayitlar)
                await setNotificationStatus('BILDIRIM_SMS_DURUM', null, 0, islemeAlinanKayitlar)
                currentFirmIndex++
                counter++
            } else {
                logger.info('Sms Send List Completed. Continue Task.');
                await setNotificationStatus('BILDIRIM_SMS_ISLEM_ACIKLAMA', null, sendNotificationStatusType.Gönderildi, islemeAlinanKayitlar)
                await setNotificationStatus('BILDIRIM_SMS_DURUM', null, 1, islemeAlinanKayitlar)
            }

        } catch (err) {
            logger.info('Sms gönderiminde Hata Meydana Geldi.')
            await setNotificationStatus('BILDIRIM_SMS_ISLEM_ACIKLAMA', null,sendNotificationStatusType.Gönderilemedi,islemeAlinanKayitlar)
            await setNotificationStatus('BILDIRIM_SMS_DURUM', null,0,islemeAlinanKayitlar)
            logger.info('Sms İşlemleri Gönderilemedi Olarak İşlenmekte')
            return false
        }
    }
}

export { runSmsTaskList }
