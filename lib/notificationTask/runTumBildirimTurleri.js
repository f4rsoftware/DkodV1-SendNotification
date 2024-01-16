import {getLogger} from "../utils/logger.js"
import {getTaskCount} from "../db/notificationRecordsHandler.js";
import {runSesliCagriTaskList} from "./runSesliCagriTask.js";
import {runSmsTaskList} from "./runSmsTask.js";
import {setNotificationStatus} from "../db/notificationDbProcess.js";

const logger = getLogger('runTumBildirimTurleri.js')

async function tumBildirimKontrolleriniBaslat() {
    const callIdList = await getTaskCount()//Bildirim Gönderilecek Bir Kayıt Varmı?

    if (callIdList) {
        logger.info('Bildirim Gönderilecek Kayıtlar Kontrol Ediliyor.')
        //Bulunan Kayıtlar Bildirim Gonderme Tasklarına Gönderiliyor.
        for (const cagri of callIdList) {
            
            const callId = cagri.CAGRI_ID
            logger.info('Bildirim Gönderilecek CagriId: ' + callId)

            Promise.all([
                runSmsTaskList(callId),
                runSesliCagriTaskList(callId)

            ])
                .then(results => {
                    // Tüm fonksiyonlar tamamlandığında yapılacak işlemler
                    logger.info('Tüm bildirim türleri gönderimi işlemlerini tamamladı.')
                    setNotificationStatus('KAYIT_KONTROL_EDILDI', callId, true)
                    return true
                })
                .catch(err => {
                    // Hata durumunda yapılacak işlemler
                    logger.error(err)
                    return false
                })
        }
    }
    else {
        logger.info('Bildirim Gönderilecek Kayıt Bulunamadı.')
    }
}

export {tumBildirimKontrolleriniBaslat}
