import { getLogger } from "../utils/logger.js"
import admin from 'firebase-admin'
import { initializeApp, cert } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';
import serviceAccount from './dkodpushnotification-firebase-adminsdk-4iucr-792402fa77.json' assert {type: 'json'};

const logger = getLogger('sendMobile.js')

async function sendMobileNotification(title, body, tokens) {
    try {
        //firebsae admin initialize
        if (admin.apps.length === 0) {
            initializeApp({
                credential: cert(serviceAccount)
            })
        }

        const message = {
            content_available: true,
            notification: {
                title: title,
                body: body
            },
            data: {
                priority: 'high'
            },
            tokens: tokens
        }
        const response = await getMessaging().sendEachForMulticast(message)

        const successfulIndices = []
        const failedIndices = []
        const errorMessage=[]

        response.responses.forEach((resp, index) => {
            if (resp.success) {
                successfulIndices.push(index);
            } else {
                failedIndices.push(index);
                errorMessage.push(resp.error.message)
                //console.log(`Hata ${index}:`, resp.error);
            }
        })

        return { successfulIndices, failedIndices,errorMessage };

    } catch (error) {
        logger.error('Error sending message',error)
        return false
    }
}

export {sendMobileNotification}
