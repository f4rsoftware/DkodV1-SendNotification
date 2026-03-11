import axios from "axios";
import 'dotenv/config'
import {getLogger} from "./lib/utils/logger.js";
const logger = getLogger('testSesliCagri.js')
async function sendSesliCagriNetGsm(gsm, message) {
    const usercode = process.env.NETGSM_USERCODE
    const password = process.env.NETGSM_PASSWORD
    // Gönderilecek XML verisi
    const xmlData = '<?xml version="1.0" encoding="utf-8"?>' +
        '<mainbody>' +
        '<header>' +
        `<usercode>${usercode}</usercode>` +
        `<password>${password}</password>` +
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
        const responseData = String(response.data)
        if (responseData.startsWith('00')) {
            logger.info(`Net Gsm Sesli Çağrı Gönderme Başarılı: ${responseData}`)
            return { success: true, data: responseData }
        } else {
            logger.info(`Net Gsm Sesli Çağrı Gönderme Başarısız: ${responseData}`)
            return { success: false, data: responseData }
        }
    } catch (err) {
        logger.error('Net Gsm Sesli Çağrı Gönderme Hatası:' + err)
        return { success: false, data: 'Başarısız'}
    }
}

async function sendSesliCagriKirmiziSantral(gsm, message) {
    let data = JSON.stringify({
        "callee": gsm,
        "callerid": "908504808771",
        "gender": "male",
        "language": "tr",
        "surveyid": "123456789",
        "retry": "2",
        "dtmflen": "1",
        "dtmfwait": "2",
        "endmessage": "sonucsesiornek",
        "responseurl": "https://abc.com/response",
        "questions": {
            "1": message.toString()
        }
    })
    let config = {
        method: 'post',
        maxBodyLength: Infinity,
        url: 'https://krmzapi.kirmizisantral.com.tr/speech/survey',
        headers: {
            'token': process.env.KIRMIZI_SANTRAL_TOKEN,
            'Content-Type': 'application/json'
        },
        data: data
    }

    try {
        logger.info('Kırmızı Santral ile Sesli Mesaj Gönderimi Başladı.')
        const response = await axios.request(config)
        logger.info('Kırmızı Santral Ham Yanıt: ' + JSON.stringify(response.data))
        const callinfo = response.data?.callinfo

        if (callinfo?.status === 1) {
            logger.info('Kırmızı Santral Sesli Çağrı Gönderme Başarılı:', JSON.stringify(callinfo))
            return { success: true, data: callinfo.uniqueid }
        } else {
            logger.info('Kırmızı Santral Sesli Çağrı Gönderme Başarısız:', JSON.stringify(response.data))
            return { success: false, data: 'Başarısız' }
        }
    } catch (err) {
        logger.error('Kırmızı Santral Sesli Çağrı Gönderme Hatası:' + err)
        return { success: false, data: 'Başarısız' }
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
    const msg = 'Beyaz kod, Beyaz kod, F blok, -1. kat, 1. kapı'
    //await sendSesliCagriNetGsm('<no>5065855286</no>', msg)
    await sendSesliCagriKirmiziSantral('905065855286', msg)
    //await sendSesliCagriKobicom(["905065855286"],msg,'9999');
})()
