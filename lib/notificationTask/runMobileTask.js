// import { getLogger } from "../utils/logger.js"
// import {
//     deleteTokenPersonel,
//     getMobileBildirimTaskList,
//     getSesliCagriTaskList,
//     setNotificationStatus,
//     setNotificationStatusDateTime, setNotificationStatusMobile
// } from "../db/notificationDbProcess.js";
// import {sendNotificationStatusType, settings} from "../global/settings.js";
// import {jsonToSqlParameters} from "../utils/queryProcess.js";
// import {sendSesliCagriKobicom, sendSesliCagriNetGsm} from "../notificationModule/sendVoiceCall.js";
// import {sendMobileNotification} from "../notificationModule/sendMobile.js";
// const logger = getLogger('runMobileTask.js')

// //K_DAHIKOD_BILDIRIM TABLOSUNA
// // BILDIRIM_MOBILE_ISLEM_ACIKLAMA ALANI EKLENDI
// //BILDIRIM_MOBILE_HATA_MESAJI ALANI EKLENDI
// // [BILDIRIM_METNI_OLUSTUR] STOREPROCEDURE EKLENDI
// //
// async function handleMobileBildirimResponse(taskListId, response, taskCallId) {
//     try {        
//         // Hatalı indeksler üzerinde döngü
//         //Burada Kaldım Burayı İncele
//         for (const index of response.failedIndices) {           
//             const taskId = taskListId[index];           
//             const error = response.errorMessage[index-1];
//             console.log(taskId + ' : ' + error)         
//             await setNotificationStatusMobile('BILDIRIM_MOBILE_ISLEM_ACIKLAMA', sendNotificationStatusType.Gönderilemedi, taskId);
//             await setNotificationStatusMobile('BILDIRIM_MOBILE_HATA_MESAJI',error, taskId);
//             await setNotificationStatusMobile('BILDIRIM_MOBILE_DURUM', false, taskId);
//             logger.error(`Mobile Bildirim Gönderimi Başarısız. Başarısız Olan Kayıtlar İşlendi.`);
            

//             if (error === 'invalid-registration-token' || 
//                 error === 'The registration token is not a valid FCM registration token' || 
//                 error === 'invalid-argument' || 
//                 error === 'Requested entity was not found.' || 
//                 error === 'requested-entity-not-found') {
//               // Bu token'ı listeden silebilirsiniz
//               deleteTokenPersonel(taskId)
//             }
//         }

//         // Başarılı indeksler üzerinde döngü
//         for (const index of response.successfulIndices) {
//             const taskId = taskListId[index];
//             await setNotificationStatusMobile('BILDIRIM_MOBILE_ISLEM_ACIKLAMA', sendNotificationStatusType.Gönderildi, taskId);
//             await setNotificationStatusMobile('BILDIRIM_MOBILE_DURUM', true, taskId);
//             logger.info(`Mobile Bildirim Gönderimi Başarılı. Başarılı Olan Kayıtlar İşlendi.`);
//         }

//         // Eğer herhangi bir failedIndices varsa hata olarak kabul edelim
//         // if (response.failedIndices.length > 0) {
//         //     return { success: false, incrementCounter: true };
//         // }

//         // Hata yoksa başarı durumunu dönelim
//         return { success: true, incrementCounter: false };

//     } catch (error) {
//         // Genel bir hata olursa
//         logger.error(`handleMobileBildirimResponse fonksiyonunda bir hata oluştu: ${error.message}`);
//         return { success: false, incrementCounter: true };
//     }
// }


// async function runMobileBildirimTaskList(taskCallId) {
//     // taskCallId : Kontrol Edilecek Çağrı Id Değeri
//     if (!taskCallId) {
//         return false;
//     }

//     let notificationSendCount = 1;
//     let counter = 0;

//     //while (notificationSendCount !== 0 && counter < settings.bildirimGondermeDenemeSayisi) {
//         try {
//             logger.info('Mobil Bildirim Kayıtları Bulundu.')
//             const sendMobileBildirimPersonelList = await getMobileBildirimTaskList(taskCallId)// Bildirim Gönderilecek Mobil Kayıtlar Alınıyor.
//             notificationSendCount = sendMobileBildirimPersonelList.length // Kayıt Sayısı Alınıyor.
         
//             // Eğer kayıt yoksa, döngüyü bitir.
//             if (notificationSendCount === 0) {
//                 logger.info('Bildirim Gönderilecek Mobile Bildirim Kayıtları Bulunamadı.')
//                 return true
//             }

//             // Bildirim Gönderilecek Kayıtların Id Değerlerinin Alınması
//             const islemeAlinanKayitlar = jsonToSqlParameters(sendMobileBildirimPersonelList, 'BILDIRIM_DENEME_ID', notificationSendCount)
//             await setNotificationStatus('BILDIRIM_MOBILE_ISLEM_ACIKLAMA', null, sendNotificationStatusType.İşlemeAlındı, islemeAlinanKayitlar) // Bildirim Gönderilecek Kayıtların Durumları İşleme Alındı Olarak Güncelleniyor.
//             const sendMobilePersonelListArray = Object.values(sendMobileBildirimPersonelList) // Bildirim Gönderilecek Mobil Kayıtları Array'e Dönüştürülüyor.

//             const gonderilecekTokenBilgileri = sendMobilePersonelListArray.map(item => item['MOBIL_APP_TOKEN'])
//             const gonderilecekTaskListId = sendMobilePersonelListArray.map(item => item['BILDIRIM_DENEME_ID'])
//             const title = sendMobilePersonelListArray[0].BILDIRIM_MOBILE_TITLE
//             const body = sendMobilePersonelListArray[0].BILDIRIM_MOBILE_METNI          
//             const responseMobileNotification = await sendMobileNotification(title, body, gonderilecekTokenBilgileri)          

//             await setNotificationStatus('ISLEM_SAYACI_MOBILE', null, counter + 1, islemeAlinanKayitlar) // Bildirim Gönderim Deneme Sayısı İşleniyor.
//             await setNotificationStatusDateTime('mobile', islemeAlinanKayitlar)// Bildirim Gönderim Zamanı İşleniyor.
//             const result = await handleMobileBildirimResponse(gonderilecekTaskListId, responseMobileNotification, null)

//             if (result.incrementCounter) {
//                 counter++
//             }
//         } catch (err) {
//             logger.error(err)
//             return false // Hata durumunda döngüyü bitir ve false dön.
//         }
//    // }

//     // Döngü başarıyla tamamlandıysa true döner.
//     return true
// }


// export {runMobileBildirimTaskList}
