import { getLogger } from "../utils/logger.js"
import { settings, sendNotificationStatusType } from '../global/settings.js'
import {
    getSesliCagriTaskList,
    setNotificationStatus,
    setNotificationStatusDateTime
} from "../db/notificationDbProcess.js"
import {jsonToSqlParameters} from "../utils/queryProcess.js"
import {sendSesliCagriKobicom, sendSesliCagriNetGsm, sendSesliCagriKirmiziSantral} from "../notificationModule/sendVoiceCall.js";
const logger = getLogger('runSesliCagriTask.js')

function buildFirmPriorityList() {
    // AKTIF_BIRINCI_FIRMA ve AKTIF_IKINCI_FIRMA DB'den string olarak geliyorsa önce onları kullan.
    // Boş/null ise eski boolean flag'lere (NET_GSM_BIRINCI_FIRMA vb.) geri dön.
    const tumFirmalar = ['NETGSM', 'KIRMIZISANTRAL', 'KOBIKOM']

    if (settings.aktifBirinciFirma) {
        const birinci = String(settings.aktifBirinciFirma).toUpperCase().trim()
        const ikinci  = settings.aktifIkinciFirma ? String(settings.aktifIkinciFirma).toUpperCase().trim() : null
        const liste = [birinci]
        if (ikinci && ikinci !== birinci) liste.push(ikinci)
        // Geri kalan firmaları fallback olarak ekle
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

async function handleSesliCagriResponse(response, taskCallId, gonderilenNumara, firmAdi) {
    if (!response.success) {
        await setNotificationStatus('BILDIRIM_SESLI_CAGRI_ISLEM_ACIKLAMA', taskCallId, sendNotificationStatusType.Gönderilemedi, gonderilenNumara)
        await setNotificationStatus('BILDIRIM_SESLI_CAGRI_DURUM', taskCallId, 0, gonderilenNumara)
        return { success: false, incrementCounter: true }
    } else {
        logger.info(`${firmAdi} Sesli Çağrı Gönderimi Başarılı Oldu.`)
        await setNotificationStatus('BILDIRIM_SESLI_CAGRI_ISLEM_ACIKLAMA', taskCallId, sendNotificationStatusType.Gönderildi, gonderilenNumara)
        await setNotificationStatus('BILDIRIM_SESLI_CAGRI_DURUM', taskCallId, 1, gonderilenNumara)
        return { success: true, incrementCounter: false }
    }
}

async function runSesliCagriTaskList(taskCallId) {
    //taskCallId : Kontrol Edilecek Çağrı Id Değeri

    if (!taskCallId) { return false }
    let notificationSendCount = 1
    let counter = 0
    const firmPriorityList = buildFirmPriorityList()
    let currentFirmIndex = 0
    logger.info('Sesli Çağrı Firma Öncelik Sırası: ' + firmPriorityList.join(' > '))

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

            await setNotificationStatus('BILDIRIM_SESLI_CAGRI_ISLEM_ACIKLAMA', null, sendNotificationStatusType.İşlemeAlındı,islemeAlinanKayitlar) //Bildirim Gönderilecek  Kayıtların Durumları İşleme Alındı Olarak Güncelleniyor.
            const sendSesliCagriPersonelListArray = Object.values(sendSesliCagriPersonelList) //Bildirim Gönderilecek Sesli Çağrı Kayıtları Array'e Dönüştürülüyor.
            const sesliCagriGonderilecekGrup = sendSesliCagriPersonelListArray.slice(0, settings.tekSeferdeSesliCagriGonderilecekKisiSayisi) //Bildirim Gönderilecek Kayıtları Grupluyor.
            //const gonderilenNumaraNetGsm = jsonToSqlParameters(sendSesliCagriPersonelList, 'PERSONEL_TELEFON')
            // Personel telefonları <no> ile başlayacak şekilde düzenleniyor.
            const sesliCagriCombinedPhonesNetGsm = sesliCagriGonderilecekGrup.map(item => `<no>${item.PERSONEL_TELEFON}</no>`).join('')
            const sesliCagriPersonelPhones = sesliCagriGonderilecekGrup.map(item => item.PERSONEL_TELEFON)
            const sesliCagriText = sendSesliCagriPersonelListArray[0].SESLI_CAGRI_METNI.trimEnd()

            // Sıradaki firmayı belirle
            const currentFirm = firmPriorityList[currentFirmIndex % firmPriorityList.length]
            let responseSesliCagri = false

            if (currentFirm === 'NETGSM') {
                responseSesliCagri = await sendSesliCagriNetGsm(sesliCagriCombinedPhonesNetGsm, sesliCagriText)
                await setNotificationStatus('BILDIRIM_SESLI_CAGRI_FIRMA', null, 'NETGSM', islemeAlinanKayitlar)
            } else if (currentFirm === 'KIRMIZISANTRAL') {
                responseSesliCagri = await sendSesliCagriKirmiziSantral(sesliCagriPersonelPhones, sesliCagriText)
                await setNotificationStatus('BILDIRIM_SESLI_CAGRI_FIRMA', null, 'KIRMIZISANTRAL', islemeAlinanKayitlar)
            } else {
                responseSesliCagri = await sendSesliCagriKobicom(sesliCagriPersonelPhones, sesliCagriText, taskCallId)
                await setNotificationStatus('BILDIRIM_SESLI_CAGRI_FIRMA', null, 'KOBIKOM', islemeAlinanKayitlar)
            }

            await setNotificationStatus('BILDIRIM_SESLI_CAGRI_ID', null, responseSesliCagri.data, islemeAlinanKayitlar)
            await setNotificationStatus('ISLEM_SAYACI_SESLI_CAGRI', null, counter + 1, islemeAlinanKayitlar)
            await setNotificationStatusDateTime('sesliCagri', islemeAlinanKayitlar)
            const result = await handleSesliCagriResponse(responseSesliCagri, null, islemeAlinanKayitlar, currentFirm)
            if (result.incrementCounter) {
                currentFirmIndex++
                counter++
            }

        }
        catch (err) {
            logger.error(err)
        }
    }
}


export { runSesliCagriTaskList }
