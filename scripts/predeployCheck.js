import 'dotenv/config'
import sql from 'mssql'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const REQUIRED_ENV_VARS = [
  'MSSQL_HOST',
  'MSSQL_USER',
  'MSSQL_PASSWORD',
  'MSSQL_DATABASE',
  'NETGSM_USERCODE',
  'NETGSM_PASSWORD',
  'NETGSM_HEADER',
  'KIRMIZI_SANTRAL_USERCODE',
  'KIRMIZI_SANTRAL_PASSWORD',
  'KIRMIZI_SANTRAL_TOKEN'
]

const REQUIRED_TABLE_COLUMNS = {
  K_DAHIKOD_AYARLAR: [
    'BILDIRIM_GONDERME_DENEME_SAYISI',
    'KAC_DAKIKA_ONCEKI_BILDIRIM_GONDERILSIN',
    'NET_GSM_BIRINCI_FIRMA',
    'KOBICOM_BIRINCI_FIRMA',
    'KIRMIZI_SANTRAL_BIRINCI_FIRMA',
    'AKTIF_BIRINCI_FIRMA',
    'AKTIF_IKINCI_FIRMA',
    'TEK_SEFERDE_SMS_GONDERILECEK_KISI_SAYISI',
    'TEK_SEFERDE_SESLI_CAGRI_GONDERILECEK_KISI_SAYISI',
    'TEK_SEFERDE_MAIL_GONDERILECEK_KISI_SAYISI',
    'CAGRI_SONLANDIRMA_GERI_ARAMASI',
    'CAGRI_SONLANDIRMA_ARAMA_BASLAMA_DAKIKASI',
    'CAGRI_SONLANDIRMA_ARAMA_BITIS_DAKIKASI'
  ],
  S_GENELAYARLAR: [
    'SMS_DURUM',
    'EPOSTA_DURUM',
    'SESLI_CAGRI_AKTIF'
  ],
  K_DAHIKOD_BILDIRIM: [
    'BILDIRIM_DENEME_ID',
    'CAGRI_ID',
    'PERSONEL_TELEFON',
    'BILDIRIM_OLUSTURMA_ZAMANI',
    'KAYIT_KONTROL_EDILDI',
    'BILDIRIM_SMS',
    'BILDIRIM_METNI',
    'BILDIRIM_SMS_ISLEM_ACIKLAMA',
    'BILDIRIM_SMS_DURUM',
    'BILDIRIM_SMS_ID',
    'BILDIRIM_SMS_FIRMA',
    'ISLEM_SAYACI_SMS',
    'BILDIRIM_SMS_ZAMANI',
    'BILDIRIM_SESLI_CAGRI',
    'SESLI_CAGRI_METNI',
    'BILDIRIM_SESLI_CAGRI_ISLEM_ACIKLAMA',
    'BILDIRIM_SESLI_CAGRI_DURUM',
    'BILDIRIM_SESLI_CAGRI_ID',
    'BILDIRIM_SESLI_CAGRI_FIRMA',
    'ISLEM_SAYACI_SESLI_CAGRI',
    'BILDIRIM_SESLI_CAGRI_ZAMANI',
    'BILDIRIM_MOBILE',
    'BILDIRIM_MOBILE_ISLEM_ACIKLAMA',
    'BILDIRIM_MOBILE_ZAMANI',
    'CAGRI_ONAYI_HATIRLARMA_ARAMA_SAYISI',
    'CAGRI_ONAYI_HATIRLATMA_ARAMASI_YAPILACAK',
    'CAGRI_ONAY_BILDIRIM_METNI',
    'CAGRI_ONAYI_BILDIRIM_FIRMASI'
  ],
  K_DAHIKOD_CAGRI: [
    'CAGRI_ID',
    'CAGRI_DURUMU',
    'CAGRI_ZAMANI',
    'TEST_CAGRISI'
  ]
}

function printSection(title) {
  console.log(`\n=== ${title} ===`)
}

function envToBool(value, defaultValue = false) {
  if (value === undefined || value === null || String(value).trim() === '') {
    return defaultValue
  }
  const normalized = String(value).trim().toLowerCase()
  return ['1', 'true', 'yes', 'on'].includes(normalized)
}

async function runMigration(pool) {
  const __filename = fileURLToPath(import.meta.url)
  const __dirname = dirname(__filename)
  const sqlPath = join(__dirname, 'sql_safe_upgrade_v1_9_0.sql')
  let sqlContent = readFileSync(sqlPath, 'utf8')
  // Apply + FillDefaults moduna geç; değer validasyonunu kapat (settings check ayrıca yapılacak)
  sqlContent = sqlContent.replace(
    'DECLARE @ApplyChanges BIT = 0;',
    'DECLARE @ApplyChanges BIT = 1;'
  )
  sqlContent = sqlContent.replace(
    'DECLARE @FillDefaults BIT = 0;',
    'DECLARE @FillDefaults BIT = 1;'
  )
  sqlContent = sqlContent.replace(
    'DECLARE @FailOnInvalidData BIT = 1;',
    'DECLARE @FailOnInvalidData BIT = 0;'
  )
  await pool.request().query(sqlContent)
}

function collectMissingEnvVars() {
  return REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key]
    return value === undefined || String(value).trim() === ''
  })
}

async function getExistingColumns(pool, tableName) {
  const result = await pool.request()
    .input('tableName', sql.NVarChar, tableName)
    .query(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_NAME = @tableName
    `)

  return new Set(result.recordset.map((r) => r.COLUMN_NAME))
}

async function checkTablesAndColumns(pool) {
  const issues = []

  for (const [tableName, requiredColumns] of Object.entries(REQUIRED_TABLE_COLUMNS)) {
    const tableExistsResult = await pool.request()
      .input('tableName', sql.NVarChar, tableName)
      .query(`
        SELECT 1 AS EXISTS_FLAG
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_TYPE = 'BASE TABLE'
          AND TABLE_NAME = @tableName
      `)

    const exists = tableExistsResult.recordset.length > 0
    if (!exists) {
      issues.push(`Eksik tablo: ${tableName}`)
      continue
    }

    const existingColumns = await getExistingColumns(pool, tableName)
    const missingColumns = requiredColumns.filter((c) => !existingColumns.has(c))
    for (const missingColumn of missingColumns) {
      issues.push(`Eksik kolon: ${tableName}.${missingColumn}`)
    }
  }

  return issues
}

function checkAyarlarValues(row) {
  const issues = []
  if (!row) {
    return ['K_DAHIKOD_AYARLAR tablosunda kayıt bulunamadı.']
  }

  const positiveFields = [
    'BILDIRIM_GONDERME_DENEME_SAYISI',
    'KAC_DAKIKA_ONCEKI_BILDIRIM_GONDERILSIN',
    'TEK_SEFERDE_SMS_GONDERILECEK_KISI_SAYISI',
    'TEK_SEFERDE_SESLI_CAGRI_GONDERILECEK_KISI_SAYISI',
    'TEK_SEFERDE_MAIL_GONDERILECEK_KISI_SAYISI'
  ]

  for (const key of positiveFields) {
    if (!(Number(row[key]) > 0)) {
      issues.push(`Geçersiz değer: K_DAHIKOD_AYARLAR.${key} = ${row[key]}`)
    }
  }

  const boolLikeFields = [
    'NET_GSM_BIRINCI_FIRMA',
    'KOBICOM_BIRINCI_FIRMA',
    'KIRMIZI_SANTRAL_BIRINCI_FIRMA',
    'CAGRI_SONLANDIRMA_GERI_ARAMASI'
  ]
  for (const key of boolLikeFields) {
    if (![0, 1].includes(Number(row[key]))) {
      issues.push(`Geçersiz 0/1 değer: K_DAHIKOD_AYARLAR.${key} = ${row[key]}`)
    }
  }

  const allowedFirms = ['NETGSM', 'KIRMIZISANTRAL', 'KOBIKOM']
  const birinci = String(row.AKTIF_BIRINCI_FIRMA || '').toUpperCase().trim()
  const ikinci = String(row.AKTIF_IKINCI_FIRMA || '').toUpperCase().trim()

  if (!allowedFirms.includes(birinci)) {
    issues.push(`Geçersiz firma: K_DAHIKOD_AYARLAR.AKTIF_BIRINCI_FIRMA = ${row.AKTIF_BIRINCI_FIRMA}`)
  }
  if (!allowedFirms.includes(ikinci)) {
    issues.push(`Geçersiz firma: K_DAHIKOD_AYARLAR.AKTIF_IKINCI_FIRMA = ${row.AKTIF_IKINCI_FIRMA}`)
  }
  if (birinci && ikinci && birinci === ikinci) {
    issues.push('Geçersiz kombinasyon: AKTIF_BIRINCI_FIRMA ve AKTIF_IKINCI_FIRMA aynı.')
  }

  return issues
}

function checkGenelAyarlarValues(row) {
  const issues = []
  if (!row) {
    return ['S_GENELAYARLAR tablosunda kayıt bulunamadı.']
  }

  for (const key of ['SMS_DURUM', 'EPOSTA_DURUM', 'SESLI_CAGRI_AKTIF']) {
    if (![0, 1].includes(Number(row[key]))) {
      issues.push(`Geçersiz 0/1 değer: S_GENELAYARLAR.${key} = ${row[key]}`)
    }
  }

  return issues
}

async function checkCriticalRows(pool) {
  const ayarlar = await pool.request().query('SELECT TOP 1 * FROM K_DAHIKOD_AYARLAR')
  const genelAyarlar = await pool.request().query('SELECT TOP 1 SMS_DURUM, EPOSTA_DURUM, SESLI_CAGRI_AKTIF FROM S_GENELAYARLAR')

  return [
    ...checkAyarlarValues(ayarlar.recordset[0]),
    ...checkGenelAyarlarValues(genelAyarlar.recordset[0])
  ]
}

async function autoFixNullSettings(pool) {
  await pool.request().query(`
    UPDATE K_DAHIKOD_AYARLAR SET
      BILDIRIM_GONDERME_DENEME_SAYISI              = ISNULL(BILDIRIM_GONDERME_DENEME_SAYISI, 3),
      KAC_DAKIKA_ONCEKI_BILDIRIM_GONDERILSIN       = ISNULL(KAC_DAKIKA_ONCEKI_BILDIRIM_GONDERILSIN, 30),
      TEK_SEFERDE_SMS_GONDERILECEK_KISI_SAYISI     = ISNULL(TEK_SEFERDE_SMS_GONDERILECEK_KISI_SAYISI, 50),
      TEK_SEFERDE_SESLI_CAGRI_GONDERILECEK_KISI_SAYISI = ISNULL(TEK_SEFERDE_SESLI_CAGRI_GONDERILECEK_KISI_SAYISI, 50),
      TEK_SEFERDE_MAIL_GONDERILECEK_KISI_SAYISI    = ISNULL(TEK_SEFERDE_MAIL_GONDERILECEK_KISI_SAYISI, 50),
      NET_GSM_BIRINCI_FIRMA                        = ISNULL(NET_GSM_BIRINCI_FIRMA, 1),
      KOBICOM_BIRINCI_FIRMA                        = ISNULL(KOBICOM_BIRINCI_FIRMA, 0),
      KIRMIZI_SANTRAL_BIRINCI_FIRMA                = ISNULL(KIRMIZI_SANTRAL_BIRINCI_FIRMA, 0),
      AKTIF_BIRINCI_FIRMA                          = ISNULL(AKTIF_BIRINCI_FIRMA, 'NETGSM'),
      AKTIF_IKINCI_FIRMA                           = ISNULL(AKTIF_IKINCI_FIRMA, 'KIRMIZISANTRAL'),
      CAGRI_SONLANDIRMA_GERI_ARAMASI               = ISNULL(CAGRI_SONLANDIRMA_GERI_ARAMASI, 0),
      CAGRI_SONLANDIRMA_ARAMA_BASLAMA_DAKIKASI     = ISNULL(CAGRI_SONLANDIRMA_ARAMA_BASLAMA_DAKIKASI, 5),
      CAGRI_SONLANDIRMA_ARAMA_BITIS_DAKIKASI       = ISNULL(CAGRI_SONLANDIRMA_ARAMA_BITIS_DAKIKASI, 30)
  `)
  await pool.request().query(`
    UPDATE K_DAHIKOD_AYARLAR
       SET AKTIF_IKINCI_FIRMA = 'KIRMIZISANTRAL'
     WHERE UPPER(ISNULL(AKTIF_BIRINCI_FIRMA, '')) = 'NETGSM'
       AND UPPER(ISNULL(AKTIF_IKINCI_FIRMA, '')) = 'KOBIKOM'
  `)
  await pool.request().query(`
    UPDATE S_GENELAYARLAR SET
      SMS_DURUM        = ISNULL(SMS_DURUM, 1),
      EPOSTA_DURUM     = ISNULL(EPOSTA_DURUM, 1),
      SESLI_CAGRI_AKTIF = ISNULL(SESLI_CAGRI_AKTIF, 1)
  `)
}

async function normalizeLegacyFirmDefaults(pool) {
  const result = await pool.request().query(`
    UPDATE K_DAHIKOD_AYARLAR
       SET AKTIF_IKINCI_FIRMA = 'KIRMIZISANTRAL'
     WHERE UPPER(ISNULL(AKTIF_BIRINCI_FIRMA, '')) = 'NETGSM'
       AND UPPER(ISNULL(AKTIF_IKINCI_FIRMA, '')) = 'KOBIKOM'
  `)

  return Number(result?.rowsAffected?.[0] || 0)
}

async function run() {
  let hasError = false
  let firmaInfo = null

  printSection('ENV CHECK')
  const missingEnvVars = collectMissingEnvVars()
  if (missingEnvVars.length > 0) {
    hasError = true
    console.error('Eksik ENV değişkenleri:')
    for (const item of missingEnvVars) {
      console.error(`- ${item}`)
    }
  } else {
    console.log('Tum gerekli ENV degiskenleri mevcut.')
  }

  const dbConfig = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE,
    options: {
      // Eski/on-prem SQL Server kurulumlarında TLS protokol uyumsuzluğu olmaması için varsayılan false.
      // Azure SQL gibi ortamlarda MSSQL_ENCRYPT=true ile açılabilir.
      encrypt: envToBool(process.env.MSSQL_ENCRYPT, false),
      trustServerCertificate: envToBool(process.env.MSSQL_TRUST_SERVER_CERTIFICATE, true)
    }
  }

  let pool
  try {
    printSection('DB CONNECT')
    pool = await new sql.ConnectionPool(dbConfig).connect()
    console.log('SQL baglantisi basarili.')

    printSection('SCHEMA CHECK')
    const schemaIssues = await checkTablesAndColumns(pool)
    if (schemaIssues.length > 0) {
      console.warn('DB schema eksiklikleri bulundu:')
      for (const issue of schemaIssues) {
        console.warn(`- ${issue}`)
      }
      console.log('Migration SQL calistiriliyor (sql_safe_upgrade_v1_9_0.sql)...')
      try {
        await runMigration(pool)
        console.log('Migration tamamlandi. Schema yeniden kontrol ediliyor...')
        const retryIssues = await checkTablesAndColumns(pool)
        if (retryIssues.length > 0) {
          hasError = true
          console.error('Migration sonrasi hala schema sorunlari mevcut:')
          for (const issue of retryIssues) {
            console.error(`- ${issue}`)
          }
        } else {
          console.log('Migration basarili: Tablo ve kolon kontrolleri temiz.')
        }
      } catch (migErr) {
        hasError = true
        console.error('Migration calisirken hata olustu: ' + (migErr?.message || migErr))
      }
    } else {
      console.log('Tablo ve kolon kontrolleri basarili.')
    }

    printSection('SETTINGS CHECK')
    const valueIssues = await checkCriticalRows(pool)
    if (valueIssues.length > 0) {
      console.warn('Ayar degerleri eksik/gecersiz bulundu:')
      for (const issue of valueIssues) {
        console.warn(`- ${issue}`)
      }
      console.log('NULL ayar degerleri varsayilanlarla dolduruluyor...')
      try {
        await autoFixNullSettings(pool)
        console.log('Ayarlar guncellendi. Yeniden kontrol ediliyor...')
        const retryValueIssues = await checkCriticalRows(pool)
        if (retryValueIssues.length > 0) {
          hasError = true
          console.error('Duzeltme sonrasi hala gecersiz ayar degerleri mevcut:')
          for (const issue of retryValueIssues) {
            console.error(`- ${issue}`)
          }
        } else {
          console.log('Ayar duzeltme basarili: Kritik ayar degerleri uygun.')
        }
      } catch (fixErr) {
        hasError = true
        console.error('Ayar duzeltme sirasinda hata olustu: ' + (fixErr?.message || fixErr))
      }
    } else {
      console.log('Kritik ayar degerleri uygun.')
    }

    printSection('FIRMA SIRASI NORMALIZE')
    const normalizedCount = await normalizeLegacyFirmDefaults(pool)
    if (normalizedCount > 0) {
      console.log(`${normalizedCount} kayit NETGSM > KOBIKOM ikilisinden NETGSM > KIRMIZISANTRAL ikilisine guncellendi.`)
    } else {
      console.log('Legacy default firma kombinasyonu bulunmadi.')
    }

    // Firma bilgisini pool kapanmadan önce oku (sonradan yazdırılmak üzere sakla)
    try {
      const ayarlarRow = (await pool.request().query('SELECT TOP 1 AKTIF_BIRINCI_FIRMA, AKTIF_IKINCI_FIRMA FROM K_DAHIKOD_AYARLAR')).recordset[0]
      if (ayarlarRow) {
        const birinci = String(ayarlarRow.AKTIF_BIRINCI_FIRMA || '').toUpperCase().trim()
        const ikinci  = String(ayarlarRow.AKTIF_IKINCI_FIRMA  || '').toUpperCase().trim()
        firmaInfo = { birinci, ikinci }
      }
    } catch (_) { /* bilgi okunamazsa sessizce geç */ }

  } catch (err) {
    hasError = true
    console.error('Pre-check calisirken hata olustu: ' + (err?.message || err))
  } finally {
    if (pool) {
      await pool.close()
    }
  }

  printSection('RESULT')
  if (hasError) {
    console.error('PRECHECK FAILED - guncelleme oncesi duzeltme gerekiyor.')
    process.exit(1)
  }

  console.log('PRECHECK PASSED - guncelleme icin teknik olarak hazir.')

  if (firmaInfo) {
    const { birinci, ikinci } = firmaInfo
    const hatirlatmaOnce  = ikinci && ikinci !== birinci ? ikinci : birinci
    const hatirlatmaSonra = ikinci && ikinci !== birinci ? birinci : null

    printSection('AKTIF FIRMA BILGISI')
    console.log(`Sesli Cagri   - 1. Firma : ${birinci}`)
    console.log(`Sesli Cagri   - 2. Firma : ${ikinci || '-'}`)
    console.log(`Hatirlatma    - 1. Deneme: ${hatirlatmaOnce}`)
    if (hatirlatmaSonra) {
      console.log(`Hatirlatma    - 2. Deneme: ${hatirlatmaSonra}`)
    }
  }
}

run()