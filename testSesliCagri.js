import axios from "axios";
import {getLogger} from "./lib/utils/logger.js";
const logger = getLogger('testSesliCagri.js')
async function sendSesliCagriNetGsm(gsm, message) {
    // Gönderilecek XML verisi
    const xmlData = '<?xml version="1.0" encoding="utf-8"?>' +
        '<mainbody>' +
        '<header>' +
        '<usercode>5065855286</usercode>' +
        '<password>Gdbd.0713</password>' +
        '<key>1</key>' +
        '</header>' +
        '<body>' +
        '<text>' + message + '</text>' +
        gsm +
        '</body>' +
        '</mainbody>'

    try {
        logger.info('NetGsm ile Sesli Mesaj Gönderimi Başladı.')
        const response = await axios.post('https://api.netgsm.com.tr/voicesms/send', xmlData, {
            headers: {
                'Content-Type': 'application/xml' // Eğer XML gönderiyorsak content type'ı belirtmek önemli olabilir.
            }
        })

        // Response'un ilk iki karakterini kontrol ediyoruz
        if (response.data.startsWith('00')) {
            logger.info(`Net Gsm Sesli Çağrı Gönderme Başarılı: ${response.data}`)
            return { success: true, data: response.data }
        } else {
            logger.info(`Net Gsm Sesli Çağrı Gönderme Başarısız: ${response.data}`)
            return { success: false, data: response.data }
        }
    } catch (err) {
        logger.error('Net Gsm Sesli Çağrı Gönderme Hatası:' + err)
        return { success: false, data: 'Başarısız'}
    }
}

async function sendSesliCagriKobicom(phoneNumbersToCall, voiceMessageText,callID) {
    const apiUrl = 'http://185.254.52.15/dial.php'
    const data = {
        requestId: "H1C1", // Sabit veya benzersiz bir değer olabilir
        voiceMessageText: voiceMessageText, // Fonksiyon parametresinden gelen metin
        callerid: callID, //Meydana gelen acil kod çağrısı id değeri
        phoneNumbersToCall: phoneNumbersToCall, // Fonksiyon parametresinden gelen telefon numaraları
        retryCount: 1,
        delayTime: 60,
        ivrType: 1, //TUŞLAMA OLMASIN
        outgoingCallerId: "908508886906"
    }
    const headers = {
        'x-api-key': 'Y63fb2Er2zxR4tHuuU88nW1k',
        'Content-Type': 'application/json'
    }

    try {
        const response = await axios.post(apiUrl, data, { headers: headers });
        if (response.data.ApiResponse.status != 'success') {
            logger.info('Kobicom  Sesli Çağrı Gönderme Başarısız:', response.data.ApiResponse)
            return { success: false, data: 'Başarısız' }
        } else {
            logger.info('Kobicom  Sesli Çağrı Gönderme Başarılı:', response.data.ApiResponse)
            return { success: true, data: response.data.ApiResponse.dialTaskId }
        }

    } catch (error) {
        logger.error('Kobicom Sesli Çağrı Gönderme Hatası:'+ error)
        return { success: false, data: 'Başarısız'}
    }
}

(async () => {
    const msg = 'Beyaz kod, Beyaz kod, F blok, Doğumhane'
    await sendSesliCagriNetGsm('<no>5065855286</no>',msg)
    //await sendSesliCagriKobicom(["905065855286"],msg,'9999');
})()
