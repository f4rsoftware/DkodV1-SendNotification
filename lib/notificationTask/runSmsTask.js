import { getLogger } from "../utils/logger.js"
import { settings, sendNotificationStatusType } from '../global/settings.js'
import {getSmsTaskList, setNotificationStatus, setNotificationStatusDateTime} from "../db/notificationDbProcess.js"
import {pool} from "../db/dbConnect.js"
import {getTaskCount} from "../db/notificationRecordsHandler.js"
import {jsonToSqlParameters} from "../utils/queryProcess.js"
import {sendSMSKirmizi, sendSMSNetGsm} from "../notificationModule/sendSms.js"
const logger = getLogger('runSmsTask.js')

async function runSmsTaskList(taskCallId) {
    //tastCallId : Kontrol Edilecek Çağrı Id Değeri
    if (!taskCallId) { return false }

    let notificationSendCount = 1
    let counter = 0
    let useFirstFirm = settings.netGsmBirinciFirma      // İlk denemede hangi firmayı kullanacağımızı belirliyoruz.

    while (notificationSendCount !== 0 && counter < settings.bildirimGondermeDenemeSayisi) {
        try {
            const sendSmsPersonelList = await getSmsTaskList(taskCallId) // Bildirim Gönderilecek Sms Kayıtlar Alınıyor.
            notificationSendCount = sendSmsPersonelList.length //Kayıt Sayısı Alınıyor.

            // Eğer kayıt yoksa, döngüyü bitir.
            if (notificationSendCount === 0) {
                logger.info('Bildirim Gönderilecek Sms Kayıtları Tammalandı yada Kayıt Yok.')
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

            const smsPersonelPhonesNetGsm = smsGonderilecekGrup.map(item => item.PERSONEL_TELEFON.trimEnd()).join(',') //Bildirim Gönderilecek Sms Kayıtların Telefon Numaraları Alınıyor.
            //console.log('Sms Personel Phones NetGsm : ' + smsPersonelPhonesNetGsm)
            const smsPersonelPhonesKirmiziSantral = smsGonderilecekGrup.map(item => item.PERSONEL_TELEFON) //Bildirim Gönderilecek Sms Kayıtların Telefon Numaraları Alınıyor.
            //console.log('Sms Personel Phones KirmiziSantral : ' + smsPersonelPhonesKirmiziSantral)

            const smsText = sendSmsPersonelList[0].BILDIRIM_METNI.trimEnd() //Bildirim Gönderilecek Sms Kayıtların Metinleri Alınıyor.

            //Sms Gönderim İşlemleri Yapılıyor.
            let responseSms = false
            let gonderimTipiNetGsm = false
            if (useFirstFirm) {
                responseSms = await sendSMSNetGsm(smsPersonelPhonesNetGsm, smsText)
                await setNotificationStatus('BILDIRIM_SMS_FIRMA', null, 'NET GSM',islemeAlinanKayitlar) //Bildirim Gönderilen Firma İşleniyor
                gonderimTipiNetGsm = true
            } else {
                const mesajDegistir = smsText.replace(/\\n/g, "\n")
                //logger.info(`Kırmızı Santral Sms Metni :  ${mesajDegistir}`)
                responseSms = await sendSMSKirmizi(smsPersonelPhonesKirmiziSantral, mesajDegistir)
                await setNotificationStatus('BILDIRIM_SMS_FIRMA', null, 'KIRMIZI SANTRAL',islemeAlinanKayitlar) //Bildirim Gönderilen Firma İşleniyor
                gonderimTipiNetGsm = false
            }

            await setNotificationStatus('ISLEM_SAYACI_SMS', null, counter+1,islemeAlinanKayitlar) //Bildirim Gönderim Deneme Sayısı İşleniyor.
            await setNotificationStatus('BILDIRIM_SMS_ID',null,  responseSms.data,islemeAlinanKayitlar) //Bildirim Gönderilen Sms Kayıtların Sms Id'leri Güncelleniyor.
            await setNotificationStatusDateTime('sms', islemeAlinanKayitlar) //Bildirim Gönderim Zamanı  İşleniyor.

            // Status Durumları Güncelleniyor.
            if (!responseSms.success){
                await setNotificationStatus('BILDIRIM_SMS_ISLEM_ACIKLAMA', null,sendNotificationStatusType.Gönderilemedi,islemeAlinanKayitlar)
                await setNotificationStatus('BILDIRIM_SMS_DURUM', null,0,islemeAlinanKayitlar)
                counter++
                useFirstFirm = !useFirstFirm // Başarısız olursa, bir sonraki denemede diğer firmayı kullan.
            } else
            {
                logger.info('Sms Send List Completed. Continue Task.');
                await setNotificationStatus('BILDIRIM_SMS_ISLEM_ACIKLAMA', null, sendNotificationStatusType.Gönderildi,islemeAlinanKayitlar)
                await setNotificationStatus('BILDIRIM_SMS_DURUM', null,1,islemeAlinanKayitlar)
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
