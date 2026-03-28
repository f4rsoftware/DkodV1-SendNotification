import 'dotenv/config'
import NetGsm from 'netgsm'
import axios from 'axios'
import { getLogger } from "./lib//utils/logger.js"
const logger = getLogger('sendSmsTest.js')

function parsePkgIdFromProviderResponse(payload) {
    if (!payload || typeof payload !== 'object') return null
    return payload?.data?.pkgID ?? payload?.data?.pkgId ?? payload?.pkgID ?? payload?.pkgId ?? null
}

const provider = (process.argv[2] || 'netgsm').toLowerCase()
const phoneArg = process.argv[3] || '905065855286'
const messageArg = process.argv[4] || 'dkod Test Mesaji'

async function sendSMSNetGsm(gsm, message) {
    const smsNetGsm = new NetGsm({
        usercode: process.env.NETGSM_USERCODE,
        password: process.env.NETGSM_PASSWORD,
        msgheader: process.env.NETGSM_HEADER
    })

    // gsm : Array of GSM numbers
    // message : Message to be sent
    try {
        logger.info('NetGsm ile Sms Gönderme İşlemleri Başladı.')
        const response = await smsNetGsm.get('sms/send/get/', {
            gsmno: gsm,
            message
        })
        if (typeof response.data === 'string' && (response.data.slice(0, 2).trimEnd() === '00' || response.data.slice(0, 2).trimEnd() === '01')) {
            logger.info('Net Gsm SMS Gönderme Başarılı:');
            return { success: true, data: response.data };
        }
        logger.info('Net Gsm SMS Gönderme Başarısız:' + response.data)
            return { success: false, data: 'Başarısız' };
    } catch (err) {
        logger.error('Net Gsm Sms Gönderme Hatası:' + err)
        return { success: false, data: 'Başarısız'};
    }
}

async function sendSMSKirmizi(gsm,message) {
    logger.info('Kırmızı Santral  ile Sms Gönderme İşlemleri Başladı.')

    const url = 'http://smslogin.nac.com.tr:9587/sms/create'
    const username = process.env.KIRMIZI_SANTRAL_USERCODE
    const password = process.env.KIRMIZI_SANTRAL_PASSWORD
    //Kırmızı Santralde metinden gelen \n karakteri alt satıra geçmeye yaramadığı  için kaldırıldı.
     const data = {
        type: 1,
        sendingType: 1,
        title: "X tarihli 1 - N testi",
        content: message,
        numbers: gsm,
        encoding: 1,
        sender: "08504808771",
        periodicSettings: null,
        sendingDate: null,
        validity: 1440
    }

    const auth = Buffer.from(`${username}:${password}`).toString('base64')

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        })

        const payload = response?.data
        const pkgID = parsePkgIdFromProviderResponse(payload)
        if (payload?.err === null && pkgID) {
            logger.info('Kırmızı Santral SMS Gönderme Başarılı:' + pkgID)
            return { success: true, data: pkgID }
        }
        logger.info('Kırmızı Santral SMS Gönderme Başarısız: ' + JSON.stringify(payload))
        return { success: false, data: 'Başarısız' }
    } catch (err) {
      logger.error('Kırmızı Santral SMS Gönderme Hatası:'+ (err?.response?.data ? JSON.stringify(err.response.data) : err))
        return { success: false, data: 'Başarısız' };
    }
}


async function sendSMSKobicom(gsm,message) {
    logger.info('Kobicom Santral  ile Sms Gönderme İşlemleri Başladı.')

    const url = 'http://smsportal.kobikom.com.tr:9587/sms/create'
    const username = process.env.KOBICOM_SANTRAL_USERCODE
    const password = process.env.KOBICOM_SANTRAL_PASSWORD
    //Kobicom Santralde metinden gelen \n karakteri alt satıra geçmeye yaramadığı  için kaldırıldı.
    const data = {
        type: 1,
        sendingType: 1,
        title: "DAHIKOD",
        content: message,
        numbers: gsm,
        encoding: 1,
        sender: "DAHIKOD", //Mesaj Başlığı
        periodicSettings: null,
        sendingDate: null,
        validity: 1440
    }

    const auth = Buffer.from(`${username}:${password}`).toString('base64')

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            }
        })
    
        const payload = response?.data
        const pkgID = parsePkgIdFromProviderResponse(payload)
        if (payload?.err === null && pkgID) {
            console.log(pkgID)
            logger.info('Kobicom SMS Gönderme Başarılı:' + pkgID.toString())
            return { success: true, data: pkgID }
        }
        logger.info('Kobicom SMS Gönderme Başarısız: ' + JSON.stringify(payload))
        return { success: false, data: 'Başarısız' }
    } catch (err) {
        logger.error('Kobicom SMS Gönderme Hatası:'+ (err?.response?.data ? JSON.stringify(err.response.data) : err))
        return { success: false, data: 'Başarısız' };
    }
}

async function runSmsTest() {
    if (provider === 'netgsm') {
        const response = await sendSMSNetGsm(phoneArg, messageArg)
        logger.info('SMS test sonucu: ' + JSON.stringify(response))
        return
    }

    if (provider === 'kirmizi') {
        const response = await sendSMSKirmizi([phoneArg], messageArg)
        logger.info('SMS test sonucu: ' + JSON.stringify(response))
        return
    }

    if (provider === 'kobicom') {
        const response = await sendSMSKobicom([phoneArg], messageArg)
        logger.info('SMS test sonucu: ' + JSON.stringify(response))
        return
    }

    logger.error('Desteklenen provider degerleri: netgsm | kirmizi | kobicom')
    process.exit(1)
}

runSmsTest()