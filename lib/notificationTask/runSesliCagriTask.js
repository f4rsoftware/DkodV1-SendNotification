import { getLogger } from "../utils/logger.js"
import { settings, sendNotificationStatusType } from '../global/settings.js'
import {
    getSesliCagriTaskList,
    setNotificationStatus,
    setNotificationStatusByPhoneNumber, setNotificationStatusDateTime
} from "../db/notificationDbProcess.js"
import {jsonToSqlParameters} from "../utils/queryProcess.js"
import {sendSesliCagriKirmiziSantral, sendSesliCagriNetGsm} from "../notificationModule/sendVoiceCall.js";
const logger = getLogger('runSesliCagriTask.js')

async function handleSesliCagriResponse(response, taskCallId, gonderilenNumara, isNetGsm) {
    let logPrefix = isNetGsm ? 'NetGsm' : 'Kirmizi Santral'
    let setNotificationStatusFunction = isNetGsm ? setNotificationStatus : setNotificationStatusByPhoneNumber

    if (!response.success) {
        await setNotificationStatusFunction('BILDIRIM_SESLI_CAGRI_ISLEM_ACIKLAMA', taskCallId, sendNotificationStatusType.Gönderilemedi, gonderilenNumara)
        await setNotificationStatusFunction('BILDIRIM_SESLI_CAGRI_DURUM', taskCallId, 0, gonderilenNumara)
        return { success: false, incrementCounter: true }
    } else
    {
        logger.info(`${logPrefix} Sesli Çağrı Gönderimi Başarılı Oldu.`)
        await setNotificationStatusFunction('BILDIRIM_SESLI_CAGRI_ISLEM_ACIKLAMA', taskCallId, sendNotificationStatusType.Gönderildi, gonderilenNumara)
        await setNotificationStatusFunction('BILDIRIM_SESLI_CAGRI_DURUM', taskCallId, 1, gonderilenNumara)
        return { success: true, incrementCounter: false }
    }
}

async function runSesliCagriTaskList(taskCallId) {
    //taskCallId : Kontrol Edilecek Çağrı Id Değeri

    if (!taskCallId) { return false }
    let notificationSendCount = 1
    let counter = 0
    let useFirstFirm = settings.netGsmBirinciFirma  // İlk denemede hangi firmayı kullanacağımızı belirleyin.

    while (notificationSendCount !== 0 && counter < settings.bildirimGondermeDenemeSayisi) {
        try {
            const sendSesliCagriPersonelList = await getSesliCagriTaskList(taskCallId) // Bildirim Gönderilecek Sesli Çağrı Kayıtlar Alınıyor.
            notificationSendCount = sendSesliCagriPersonelList.length //Kayıt Sayısı Alınıyor.

            // Eğer kayıt yoksa, döngüyü bitir.
            if (notificationSendCount === 0) {
                logger.info('Bildirim Gönderilecek Sesli Çağrı Kayıtları Tamamlandı.')
                return true
            }
            logger.info('Bildirim Gönderilecek Sesli Çağrı Kayıt Sayısı: ' + notificationSendCount)

            // Bildirim Gönderilecek Kayıtların Id Değerlerinin Alınması
            const islemeAlinanKayitlar = jsonToSqlParameters(sendSesliCagriPersonelList, 'BILDIRIM_DENEME_ID',settings.tekSeferdeSesliCagriGonderilecekKisiSayisi)

            await setNotificationStatus('BILDIRIM_SESLI_CAGRI_ISLEM_ACIKLAMA', null, sendNotificationStatusType.İşlemeAlındı,islemeAlinanKayitlar) //Bildirim Gönderilecek Sms Kayıtların Durumları İşleme Alındı Olarak Güncelleniyor.
            const sendSesliCagriPersonelListArray = Object.values(sendSesliCagriPersonelList) //Bildirim Gönderilecek Sesli Çağrı Kayıtları Array'e Dönüştürülüyor.
            const sesliCagriGonderilecekGrup = sendSesliCagriPersonelListArray.slice(0, settings.tekSeferdeSesliCagriGonderilecekKisiSayisi) //Bildirim Gönderilecek Kayıtları Grupluyor.
            //const gonderilenNumaraNetGsm = jsonToSqlParameters(sendSesliCagriPersonelList, 'PERSONEL_TELEFON')
            // Personel telefonları <no> ile başlayacak şekilde düzenleniyor.
            const sesliCagriPersonelPhonesNetGsm = sesliCagriGonderilecekGrup.map(item => {
                return {
                    personel_phone: `<no>${item.PERSONEL_TELEFON}</no>`
                }
            })
            const sesliCagriCombinedPhonesNetGsm = sesliCagriPersonelPhonesNetGsm.map(item => item.personel_phone.trim()).join('') //NetGsm Bildirim Gönderilecek Sesli Çağrı Kayıtların Telefon Numaraları Alınıyor.
            const sesliCagriPersonelPhonesKirmiziSantral = sesliCagriGonderilecekGrup.map(item => item.PERSONEL_TELEFON) //Kirmizi Santral Bildirim Gönderilecek Sesli Çağrı Kayıtların Telefon Numaraları Alınıyor.

            const sesliCagriText = sendSesliCagriPersonelListArray[0].SESLI_CAGRI_METNI.trimEnd() //Bildirim Gönderilecek Sesli Çağrı Kayıtların Metinleri Alınıyor.


            //Sesli Çağrı Gönderim İşlemleri Yapılıyor.
            let responseSesliCagri = false
            let gonderimTipiNetGsm = false
            let kirmiziSanttralGonderimHatasi = false

            if (useFirstFirm) {
                responseSesliCagri = await sendSesliCagriNetGsm(sesliCagriCombinedPhonesNetGsm, sesliCagriText)
                await setNotificationStatus('BILDIRIM_SESLI_CAGRI_FIRMA', null, 'NET GSM',islemeAlinanKayitlar) //Bildirim Gönderilen Firma İşleniyor
                gonderimTipiNetGsm = true
            }else {
                //Kırmızı Santral İçin Tek Tek Gönderim İşlemi Yapılıyor.
                for (const numara of sesliCagriPersonelPhonesKirmiziSantral) {
                    let aranacakNumara = numara.toString()
                    // Numaranın ilk karakteri 0 değilse başına 0 ekleyin
                    if (aranacakNumara.charAt(0) !== "0") {
                        aranacakNumara = "0" + numara;
                    }
                    responseSesliCagri = await sendSesliCagriKirmiziSantral(aranacakNumara.toString(), sesliCagriText)
                    const gonderilenNumara = "(" + numara + ")"
                    await setNotificationStatusByPhoneNumber('BILDIRIM_SESLI_CAGRI_FIRMA', taskCallId, 'KIRMIZI SANTRAL',gonderilenNumara) //Bildirim Gönderilen Firma İşleniyor
                    //Kırmızı Santral İçin İlgili Kaydın Sesli Çağrı Id'si Güncelleniyor.
                    await setNotificationStatusByPhoneNumber('BILDIRIM_SESLI_CAGRI_ID', taskCallId,JSON.parse(responseSesliCagri.data), gonderilenNumara) //Bildirim Gönderilen Sesli Çağrı Kayıtların SesliCagri Id'leri Güncelleniyor.
                    await setNotificationStatusByPhoneNumber('ISLEM_SAYACI_SESLI_CAGRI', taskCallId, counter+1,gonderilenNumara) //Bildirim Gönderim Deneme Sayısı İşleniyor.
                    await setNotificationStatusDateTime('kirmizisantralseslicagri', gonderilenNumara,taskCallId) //Bildirim Gönderim Zamanı  İşleniyor.
                    const result = await handleSesliCagriResponse(responseSesliCagri, taskCallId, gonderilenNumara, false)
                    if (result.incrementCounter) {
                        kirmiziSanttralGonderimHatasi = true
                    }
                }
                gonderimTipiNetGsm = false
            }

            if (kirmiziSanttralGonderimHatasi){
                useFirstFirm = !useFirstFirm // Başarısız olursa, bir sonraki denemede diğer firmayı kullan.
                counter++;
            }


            if (gonderimTipiNetGsm){
                //Eğer NetGsm Firması Kullanıldıysa Response Cevaplarını Toplu Olarak Güncelle.
                await setNotificationStatus('BILDIRIM_SESLI_CAGRI_ID', null, responseSesliCagri.data,islemeAlinanKayitlar) //Bildirim Gönderilen Sesli Çağrı Kayıtların SesliCagri Id'leri Güncelleniyor.
                await setNotificationStatus('ISLEM_SAYACI_SESLI_CAGRI', null, counter+1,islemeAlinanKayitlar) //Bildirim Gönderim Deneme Sayısı İşleniyor.
                await setNotificationStatusDateTime('sesliCagri', islemeAlinanKayitlar) //Bildirim Gönderim Zamanı  İşleniyor.
                const result = await handleSesliCagriResponse(responseSesliCagri, null, islemeAlinanKayitlar, true)
                if (result.incrementCounter) {
                    useFirstFirm = !useFirstFirm // Başarısız olursa, bir sonraki denemede diğer firmayı kullan.
                    counter++;
                }
            }
        }
        catch (err) {
            logger.error(err)
        }
    }
}


export { runSesliCagriTaskList }
