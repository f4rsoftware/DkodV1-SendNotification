import axios  from "axios"
import 'dotenv/config'
import { getLogger } from "../utils/logger.js"

const logger = getLogger('sendVoiceCall.js')

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
        const response = await axios.post('https://api.netgsm.com.tr/voicesms/send', xmlData)
        console.log(response.data)
        if ((response.data ==='30') || (response.data==='40') || (response.data==='45') || (response.data==='70')) {
            // responseCode 30, 40, 45 veya 70 ise buraya gelir
            logger.info(`Net Gsm Sesli Çağrı Gönderme Başarısız: ${response.data}`)
            return { success: false, data: 'Başarısız' }
        } else {
            // responseCode 00 veya 01 ise buraya gelir
            logger.info(`Net Gsm Sesli Çağrı Gönderme Başarılı: ${response.data}`)
            return { success: true, data: response.data }
        }

    } catch (err) {
        logger.error('Net Gsm Sesli Çağrı Gönderme Hatası:'+ err)
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
        const responseCode = response.data.slice(0, 3).trimEnd()

        if (typeof responseCode === 'string' && responseCode !== '111') {
            // responseCode 111
            logger.info('Kırmızı Santral Sesli Çağrı Gönderme Başarısız:', response.data)
            return { success: false, data: 'Başarısız' }
        } else {
            // responseCode 00 veya 01 ise buraya gelir
            logger.info('Kırmızı Santral Sesli Çağrı Gönderme Başarılı:', response.data)
            return { success: true, data: JSON.stringify(response.data) }
        }

    } catch (err) {
        logger.error('Kırmızı Santral Sesli Çağrı Gönderme Hatası:'+ err)
        return { success: false, data: 'Başarısız'}
    }
}


export { sendSesliCagriNetGsm, sendSesliCagriKirmiziSantral }
