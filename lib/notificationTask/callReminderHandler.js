import { getLogger } from "../utils/logger.js"
import { settings } from '../global/settings.js'
import {
    getCallReminderTaskList,
    setCallReminderHandlerReplyCount,
    setNotificationStatus
} from "../db/notificationDbProcess.js";
import { jsonToSqlParameters } from "../utils/queryProcess.js";
import { sendSesliCagriKirmiziSantral, sendSesliCagriKobicom, sendSesliCagriNetGsm } from "../notificationModule/sendVoiceCall.js";


const logger = getLogger('callReminderHandler.js')

function buildReminderFirmPriorityList() {
    const tumFirmalar = ['NETGSM', 'KIRMIZISANTRAL', 'KOBIKOM']

    if (settings.aktifBirinciFirma) {
        const normalBirinci = String(settings.aktifBirinciFirma).toUpperCase().trim()
        const normalIkinci = settings.aktifIkinciFirma ? String(settings.aktifIkinciFirma).toUpperCase().trim() : null
        const liste = []

        if (normalIkinci && normalIkinci !== normalBirinci) {
            liste.push(normalIkinci)
        }

        if (normalBirinci) {
            liste.push(normalBirinci)
        }

        for (const firma of tumFirmalar) {
            if (!liste.includes(firma)) {
                liste.push(firma)
            }
        }

        return liste
    }

    const birinciFirmalar = []
    const digerFirmalar = []
    const firmalar = [
        { name: 'NETGSM', isPrimary: settings.netGsmBirinciFirma },
        { name: 'KIRMIZISANTRAL', isPrimary: settings.kirmiziSantralBirinciFirma },
        { name: 'KOBIKOM', isPrimary: settings.kobicomBirinciFirma }
    ]

    for (const firma of firmalar) {
        if (firma.isPrimary) {
            birinciFirmalar.push(firma.name)
        } else {
            digerFirmalar.push(firma.name)
        }
    }

    return [...digerFirmalar, ...birinciFirmalar]
}

async function sendReminderByFirm(firma, netGsmPhones, phones, text, callId) {
    if (firma === 'NETGSM') {
        return sendSesliCagriNetGsm(netGsmPhones, text)
    }

    if (firma === 'KIRMIZISANTRAL') {
        return sendSesliCagriKirmiziSantral(phones, text)
    }

    return sendSesliCagriKobicom(phones, text, callId)
}


const checkAndSendReminders = async () => {
    try {
        const kontrolDakikaBaslama = settings.cagriOnayAramasiKontrolDakikasiBaslangic
        const kontrolDakikaBitis = settings.cagriOnayAramasiKontrolDakikasiBitis

        const notificationSendCount = await getCallReminderTaskList(kontrolDakikaBaslama, kontrolDakikaBitis)

        if (!notificationSendCount || notificationSendCount.length === 0) {
            logger.info('Hatırlatma Bildirimi Gönderilecek Kayıt Yok.')
            return;
        }

        const sendSesliCagriPersonelList = notificationSendCount;
        const islemeAlinanKayitlar = jsonToSqlParameters(sendSesliCagriPersonelList, 'BILDIRIM_DENEME_ID', 100)
        const sendSesliCagriPersonelListArray = Object.values(sendSesliCagriPersonelList);

        const distinctPhoneNumbersSet = new Set(sendSesliCagriPersonelListArray.map(item => item.PERSONEL_TELEFON))
        const sesliCagriPersonelPhonesNetGsm = Array.from(distinctPhoneNumbersSet).map(phone => `<no>${phone}</no>`)
        const sesliCagriCombinedPhonesNetGsm = sesliCagriPersonelPhonesNetGsm.join('')
        const sesliCagriPersonelPhones = Array.from(distinctPhoneNumbersSet)
        const sesliCagriText = sendSesliCagriPersonelList[0].CAGRI_ONAY_BILDIRIM_METNI.trimEnd()
        const callId = sendSesliCagriPersonelList[0].CAGRI_ID
        const firmPriorityList = buildReminderFirmPriorityList()

        logger.info('Hatırlatma Sesli Çağrı Firma Öncelik Sırası: ' + firmPriorityList.join(' > '))

        let sentSuccessfully = false

        for (const currentFirm of firmPriorityList) {
            logger.info(`Hatırlatma bildirimi ${currentFirm} firması ile deneniyor.`)

            const response = await sendReminderByFirm(
                currentFirm,
                sesliCagriCombinedPhonesNetGsm,
                sesliCagriPersonelPhones,
                sesliCagriText,
                callId
            )

            await setNotificationStatus('CAGRI_ONAYI_BILDIRIM_FIRMASI', null, currentFirm, islemeAlinanKayitlar)

            if (response?.success) {
                sentSuccessfully = true
                logger.info(`Hatırlatma bildirimi ${currentFirm} firması ile başarılı oldu.`)
                break
            }

            logger.warn(`Hatırlatma bildirimi ${currentFirm} firması ile başarısız oldu. Sıradaki firma denenecek.`)
        }

        if (!sentSuccessfully) {
            logger.warn('Hatırlatma bildirimi için tanımlı tüm firmalar denendi, başarılı gönderim olmadı.')
        }

        await setCallReminderHandlerReplyCount(islemeAlinanKayitlar)
    } catch (err) {
        logger.error(err)
    }
};

async function executePeriodicChecks() {
    logger.info('Çağrı Onayı Hatırlatma Araması Kontrolü Başladı.');
    const kontrolDakikaBaslangic =parseInt(settings.cagriOnayAramasiKontrolDakikasiBaslangic)
    const kontrolDakikaBitis =parseInt(settings.cagriOnayAramasiKontrolDakikasiBitis)
    const toplamKontrolDakikasi = kontrolDakikaBaslangic + kontrolDakikaBitis

    logger.info(`Hatırlatma Bildirimi ${kontrolDakikaBaslangic} - ${toplamKontrolDakikasi} Dakikaları Arasında Kontrol İşlemlerini Yapacak.`);

    for (let currentMinute = kontrolDakikaBaslangic; currentMinute < toplamKontrolDakikasi; currentMinute++) {
        logger.info(`Hatırlatma Bildirimi Kontrol Dakikası: ${currentMinute}`);
        await checkAndSendReminders();

        await new Promise(resolve => setTimeout(resolve, 60000)); 
    }

    logger.info('Hatırlatma Bildirimi Kontrolü Tamamlandı.');
}



function startCallReminderHandler() {
    try {
        if (!global.callReminderRunning) {
            global.callReminderRunning = true;
            executePeriodicChecks().catch(err => console.error(err))
                .finally(() => {
                    global.callReminderRunning = false;
                });
        } else {
            logger.warn("Call reminder handler is already running.");
        }
    } catch (err) {
        logger.error("Error in executePeriodicChecks:", err.toString());
    }
}

export { startCallReminderHandler }
