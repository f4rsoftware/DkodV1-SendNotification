# SendNotification - Bildirim Gönderme Modülü

### Kurulum

- `.env` dosyasını hastaneye göre değiştiriniz
- `npm i` komutu ile paketleri yükleyin
- `npm start` komutu ile projeyi çalıştırın

### Değişiklikler [version]

=> `01.01.2024` [v1.1.0]

- [x] Otomasyon Setting Değişikliklerini Algılayacak Rota Eklendi.


=> `01.02.2024` [v1.2.1]

- [x] Kırmızı Santral Sms Metni \g karakterleri metinden kaldırıldı.


=> `01.03.2024` [v1.3.0]

- [x] Kobicom sisteme eklendi. Kırmızı santral sistemden çıkartıldı.

=> `01.04.2024` [v1.4.0]

- [x] Mobil Bildirim Özelliği Sisteme Eklendi.

=> `01.06.2024` [v1.5.0]

- [x] Çağrı Onay Hatırlatması Özelliği Sisteme Eklendi.

=> `01.10.2024` [v1.6.0]

- [x] Mobil bildirim özelliği sisteme eklendi. Aktifleştirildi.


=> `12.03.2023` [v1.7.0]

- [-] Modüllerin mqtt bağımlılıklarının kaldırılması için modüllere socet üzerinden bildirim özelliği eklenecek.

=> `26.03.2025` [v1.8.0]

- [x] Uygulama başlangıcında hata oluşması durumunda otomatik yeniden deneme (retry) mekanizması eklendi.
- [x] İlk hatada ve maksimum deneme sonunda `ntfy.sh` üzerinden yüksek öncelikli bildirim gönderimi sağlandı.
- [x] Bildirim mesajları `.env` dosyasındaki `HOSPITAL_NAME` değişkeniyle özelleştirilebilir hale getirildi.
- [x] Başlatma sürecindeki tüm hatalar detaylı olarak log'lara yazılacak şekilde yapılandırıldı.

=> `12.03.2026` [v1.9.0]

- [x] Kırmızı Santral sesli çağrı modülü sisteme entegre edildi.
- [x] Sesli çağrı firma öncelik sistemi yeniden yapılandırıldı. DB'deki `AKTIF_BIRINCI_FIRMA` ve `AKTIF_IKINCI_FIRMA` alanlarına `NETGSM`, `KIRMIZISANTRAL` veya `KOBIKOM` değeri yazılarak firma değişikliği kod düzenlenmeden yapılabilir hale getirildi.
- [x] Başarısız gönderimde sistem sıradaki firmaya otomatik olarak geçecek şekilde güncellendi.
- [x] `sendVoiceCall.js` — Kırmızı Santral'de tek numara veya dizi desteği eklendi; `response.data` parse hatası düzeltildi (`startsWith`, `slice` hataları).
- [x] `settingProcess.js` — SQL sorgusundaki virgül hatası düzeltildi; `KIRMIZI_SANTRAL_BIRINCI_FIRMA`, `AKTIF_BIRINCI_FIRMA`, `AKTIF_IKINCI_FIRMA` alanları eklendi.
- [x] `sendSms.js` — `sendSMSKobicom` içindeki geçici Kırmızı Santral yönlendirmesi (TODO) kaldırıldı, gerçek Kobicom SMS fonksiyonu geri yüklendi.
- [x] `runSmsTask.js` — SMS firma öncelik sistemi yeniden yapılandırıldı. `AKTIF_BIRINCI_FIRMA` / `AKTIF_IKINCI_FIRMA` DB alanları artık SMS için de geçerli; `useFirstFirm` boolean mantığı kaldırılarak sesli çağrı ile aynı öncelik listesi yapısına geçildi.
- [x] `callReminderHandler.js` — Hatırlatma sesli çağrı akışı, normal bildirim sırasının tersini kullanacak şekilde yeniden düzenlendi. Normalde birinci olan firma yerine hatırlatmada diğer firma önce denenir; başarısız olursa sıradaki firmaya otomatik fallback yapılır. Bu akışa `KIRMIZISANTRAL` desteği de eklendi.
