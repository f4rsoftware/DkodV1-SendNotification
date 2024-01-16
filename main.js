import {settingProcessRun} from "./lib/db/settingProcess.js"
import {getLogger} from './lib/utils/logger.js'
import { createServer } from 'http'
import {tumBildirimKontrolleriniBaslat} from "./lib/notificationTask/runTumBildirimTurleri.js"
import {sendSesliCagriNetGsm} from "./lib/notificationModule/sendVoiceCall.js"
const logger = getLogger('main.js')

await settingProcessRun() //Setting İşlemleri Çalıştırılıyor.
await tumBildirimKontrolleriniBaslat() // Bildirim Kontrolleri Başlatılıyor.


const port = 6000

const server = createServer(async (req, res) => {
    if (req.url === '/api/refreshInstantCalls' && req.method === 'GET') {
        try {
            logger.info('Sql Server Yeni Çağrı Bildirimi Yaptı')
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ message: 'GET isteği başarıyla alındı' }))

            await tumBildirimKontrolleriniBaslat(); // Bildirim Kontrolleri Başlatılıyor.

        } catch (error) {

            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Bir hata oluştu' }))

        }
    } else if (req.url === '/api/runSettingProcess' && req.method === 'GET') {
        // Yeni rota: /api/runSettingProcess
        try {
            logger.info('Setting Ayarlarının Değiştiği Bildirimi Yapıldı.')
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ message: 'Setting Process başarıyla çalıştırıldı' }))

            await settingProcessRun() // settingProcessRun fonksiyonu çalıştırılıyor.

        } catch (error) {

            res.writeHead(500, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: 'Bir hata oluştu' }))
        }
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('404 Not Found')
    }
})
server.listen(port, () => {
    console.log(`Bildirim Gönderim App  ${port} portunda çalışıyor.`)
})






