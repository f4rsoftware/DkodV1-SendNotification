import fetch from 'node-fetch'
import dotenv from 'dotenv'

dotenv.config()

const hospitalName = process.env.HOSPITAL_NAME || 'Bilinmeyen'

export async function notifyNtfy(errorDetail = '', priority = 'high', topic = 'dahi-bildirim') {
    const message = `🚨 Send Notification uygulaması ${hospitalName} hastanesinde başlatılamadı.\n\nHata Detayı:\n${errorDetail}\n\nAcil kontrol ediniz.`

    try {
        await fetch(`https://ntfy.sh/${topic}`, {
            method: 'POST',
            headers: {
                'Title': 'Hata-Acil Kontrol',  // KALDIR ya da sadeleştir
                'Priority': priority,
                'Content-Type': 'text/plain'
            },
            body: message
        })
    } catch (error) {
        console.error('ntfy bildirimi gönderilemedi:', error)
    }
}
