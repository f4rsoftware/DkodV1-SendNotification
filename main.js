import express from 'express'
import cors from 'cors'
import { settingProcessRun } from './lib/db/settingProcess.js'
import { getLogger } from './lib/utils/logger.js'
import { tumBildirimKontrolleriniBaslat } from './lib/notificationTask/runTumBildirimTurleri.js'
import {startCallReminderHandler} from "./lib/notificationTask/callReminderHandler.js"
import {settings} from "./lib/global/settings.js"
import { notifyNtfy } from './lib/utils/notifyNtfy.js'

const app = express()
const port =  process.env.HTTP_PORT || 3000
const logger = getLogger('main.js')

// CORS Middleware'i uygulama genelinde kullanmak için (isteğe bağlı)
app.use(cors())

app.get('/api/refreshInstantCalls', async (req, res) => {
    try {

        logger.info('Sql Server Yeni Çağrı Bildirimi Yaptı')
        // Önce yanıtı gönderiyoruz
        res.status(200).json({ message: 'GET isteği başarıyla alındı' })

        // Sonrasında asenkron işlemleri başlatıyoruz
        await tumBildirimKontrolleriniBaslat() // Bildirim Kontrolleri Başlatılıyor.

        if (settings.cagriOnayAramasiAktifligi) {
            logger.info('Çağrı Onayı Hatırlatma Araması Kontrolerine Başlanıldı.')
            startCallReminderHandler() // Hatırlatma Bildirimi Çalıştırılıyor.
        }

    } catch (error) {
        // Eğer yanıt daha önce gönderildiyse burada bir sorun olmayacak
        if (!res.headersSent) {
            res.status(500).json({ error: 'Bir hata oluştu' })
        } else {
            logger.error('Yanıt gönderildikten sonra hata oluştu:', error)
        }
    }
})

app.get('/api/runSettingProcess', async (req, res) => {
    try {
        logger.info('Setting Ayarlarının Değiştiği Bildirimi Yapıldı.')
        // Önce yanıtı gönderiyoruz
        res.status(200).json({ message: 'Setting Process başarıyla çalıştırıldı.' })

        // Sonrasında asenkron işlemleri başlatıyoruz
        await settingProcessRun() // settingProcessRun fonksiyonu çalıştırılıyor.

    } catch (error) {
        // Eğer yanıt daha önce gönderildiyse burada bir sorun olmayacak
        if (!res.headersSent) {
            res.status(500).json({ error: 'Bir hata oluştu' })
        } else {
            logger.error('Yanıt gönderildikten sonra hata oluştu:', error)
        }
    }
})

app.get('/', (req, res) => {
    logger.info('Canlı olduğumu bildirdim.')
    res.status(200).send('OK') // Doğrudan istek için "OK" cevabı döndür
})




// 404 Not Found Middleware
app.use((req, res, next) => {
    res.status(404).send('404 Not Found')
})

// İlk başlangıçta gerekli olan işlemleri burada çalıştır
async function init() {
    try {
        logger.info('Send Notification Started.')
        await settingProcessRun()
        logger.info('Genel Setting Alındı.')
        await tumBildirimKontrolleriniBaslat()
        logger.info('Bildirim Kontrollerine Başalanıldı.')
        //startCallReminderHandler()

        app.listen(port, () => {
            logger.info(`Bildirim Gönderim App ${port} portunda çalışıyor.`)
        })
    } catch (error) {
        logger.error('Başlangıç işlemi sırasında hata oluştu:', error)
        throw error // retry mekanizmasının devreye girmesi için hatayı tekrar fırlat
    }
}


//Başlangıç'ta  hata oluşursa yeniden deneme işlemi
async function initWithRetry(retryInterval = 10000, maxRetries = 10) {
    let attempt = 0;

    while (attempt < maxRetries) {
        try {
            logger.info(`Init işlemi başlatılıyor. Deneme: ${attempt + 1}`);
            await init()
            return
        } catch (error) {
            const errorMsg = `Başlatma hatası (Deneme ${attempt + 1}): ${error?.stack || error}`
            logger.error(errorMsg)         
            if (attempt === 0) {
                await notifyNtfy(errorMsg, 'high', 'dahi-santral')
            }
            attempt++
            logger.info(`${retryInterval / 1000} saniye sonra tekrar deneniyor...`)
            await new Promise(resolve => setTimeout(resolve, retryInterval))
        }
    }

    const finalError = 'Maksimum deneme sayısına ulaşıldı. Uygulama başlatılamadı.'
    logger.error(finalError)
    await notifyNtfy(finalError, 'urgent', 'dahi-santral')
    process.exit(1)
}



initWithRetry()
