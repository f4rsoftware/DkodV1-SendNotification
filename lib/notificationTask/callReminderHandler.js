import { getLogger } from "../utils/logger.js"
import { sendNotificationStatusType, settings } from '../global/settings.js'
import {
    getCallReminderTaskList,
    getSesliCagriTaskList,
    setCallReminderHandlerReplyCount,
    setNotificationStatus,
    setNotificationStatusDateTime
} from "../db/notificationDbProcess.js";
import { jsonToSqlParameters } from "../utils/queryProcess.js";
import { sendSesliCagriKobicom, sendSesliCagriNetGsm } from "../notificationModule/sendVoiceCall.js";


const logger = getLogger('callReminderHandler.js')


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
        const sesliCagriPersonelPhonesKobicom = Array.from(distinctPhoneNumbersSet)
        const sesliCagriText = sendSesliCagriPersonelList[0].CAGRI_ONAY_BILDIRIM_METNI.trimEnd()

        let useFirstFirm = !settings.netGsmBirinciFirma
        if (useFirstFirm) {
            await sendSesliCagriNetGsm(sesliCagriCombinedPhonesNetGsm, sesliCagriText)
            await setNotificationStatus('CAGRI_ONAYI_BILDIRIM_FIRMASI', null, 'NET GSM', islemeAlinanKayitlar)
        } else {
            await sendSesliCagriKobicom(sesliCagriPersonelPhonesKobicom, sesliCagriText)
            await setNotificationStatus('CAGRI_ONAYI_BILDIRIM_FIRMASI', null, 'KOBICOM', islemeAlinanKayitlar)
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
