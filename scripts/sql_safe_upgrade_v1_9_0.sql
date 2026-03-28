/*
Safe SQL upgrade for V1-SendNotification (v1.9.0 compatibility)

How to use:
1) First run with @ApplyChanges = 0 (dry-run)
2) Review output (what will be changed)
3) Run with @ApplyChanges = 1 in maintenance window

Behavior:
- Idempotent: adds only missing columns
- Transactional: full rollback on error
- Optional default fill for NULL config values
*/

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @SchemaName SYSNAME = 'dbo';
DECLARE @ApplyChanges BIT = 0;       -- 0 = dry-run, 1 = apply
DECLARE @FillDefaults BIT = 0;       -- 0 = do not overwrite NULL config values, 1 = fill only NULL values
DECLARE @FailOnInvalidData BIT = 1;  -- 1 = stop if invalid AKTIF_* values exist

DECLARE @msg NVARCHAR(4000);
DECLARE @sql NVARCHAR(MAX);

PRINT '=== sql_safe_upgrade_v1_9_0.sql ===';
PRINT 'ApplyChanges=' + CAST(@ApplyChanges AS VARCHAR(10)) + ', FillDefaults=' + CAST(@FillDefaults AS VARCHAR(10));

BEGIN TRY
    BEGIN TRAN;

    /* 1) Table existence checks (hard fail) */
    IF OBJECT_ID(QUOTENAME(@SchemaName) + '.[K_DAHIKOD_AYARLAR]', 'U') IS NULL
        THROW 50001, 'Missing table: K_DAHIKOD_AYARLAR', 1;

    IF OBJECT_ID(QUOTENAME(@SchemaName) + '.[S_GENELAYARLAR]', 'U') IS NULL
        THROW 50002, 'Missing table: S_GENELAYARLAR', 1;

    IF OBJECT_ID(QUOTENAME(@SchemaName) + '.[K_DAHIKOD_BILDIRIM]', 'U') IS NULL
        THROW 50003, 'Missing table: K_DAHIKOD_BILDIRIM', 1;

    IF OBJECT_ID(QUOTENAME(@SchemaName) + '.[K_DAHIKOD_CAGRI]', 'U') IS NULL
        THROW 50004, 'Missing table: K_DAHIKOD_CAGRI', 1;

    PRINT 'Table checks: OK';

    /* Helper pattern: add missing column only */

    /* 2) K_DAHIKOD_AYARLAR missing columns */
    IF COL_LENGTH(@SchemaName + '.K_DAHIKOD_AYARLAR','KIRMIZI_SANTRAL_BIRINCI_FIRMA') IS NULL
    BEGIN
        SET @sql = 'ALTER TABLE ' + QUOTENAME(@SchemaName) + '.[K_DAHIKOD_AYARLAR] ADD [KIRMIZI_SANTRAL_BIRINCI_FIRMA] TINYINT NULL;';
        IF @ApplyChanges = 1 EXEC sp_executesql @sql ELSE PRINT '[DRY-RUN] ' + @sql;
    END

    IF COL_LENGTH(@SchemaName + '.K_DAHIKOD_AYARLAR','AKTIF_BIRINCI_FIRMA') IS NULL
    BEGIN
        SET @sql = 'ALTER TABLE ' + QUOTENAME(@SchemaName) + '.[K_DAHIKOD_AYARLAR] ADD [AKTIF_BIRINCI_FIRMA] VARCHAR(30) NULL;';
        IF @ApplyChanges = 1 EXEC sp_executesql @sql ELSE PRINT '[DRY-RUN] ' + @sql;
    END

    IF COL_LENGTH(@SchemaName + '.K_DAHIKOD_AYARLAR','AKTIF_IKINCI_FIRMA') IS NULL
    BEGIN
        SET @sql = 'ALTER TABLE ' + QUOTENAME(@SchemaName) + '.[K_DAHIKOD_AYARLAR] ADD [AKTIF_IKINCI_FIRMA] VARCHAR(30) NULL;';
        IF @ApplyChanges = 1 EXEC sp_executesql @sql ELSE PRINT '[DRY-RUN] ' + @sql;
    END

    IF COL_LENGTH(@SchemaName + '.K_DAHIKOD_AYARLAR','CAGRI_SONLANDIRMA_GERI_ARAMASI') IS NULL
    BEGIN
        SET @sql = 'ALTER TABLE ' + QUOTENAME(@SchemaName) + '.[K_DAHIKOD_AYARLAR] ADD [CAGRI_SONLANDIRMA_GERI_ARAMASI] TINYINT NULL;';
        IF @ApplyChanges = 1 EXEC sp_executesql @sql ELSE PRINT '[DRY-RUN] ' + @sql;
    END

    IF COL_LENGTH(@SchemaName + '.K_DAHIKOD_AYARLAR','CAGRI_SONLANDIRMA_ARAMA_BASLAMA_DAKIKASI') IS NULL
    BEGIN
        SET @sql = 'ALTER TABLE ' + QUOTENAME(@SchemaName) + '.[K_DAHIKOD_AYARLAR] ADD [CAGRI_SONLANDIRMA_ARAMA_BASLAMA_DAKIKASI] INT NULL;';
        IF @ApplyChanges = 1 EXEC sp_executesql @sql ELSE PRINT '[DRY-RUN] ' + @sql;
    END

    IF COL_LENGTH(@SchemaName + '.K_DAHIKOD_AYARLAR','CAGRI_SONLANDIRMA_ARAMA_BITIS_DAKIKASI') IS NULL
    BEGIN
        SET @sql = 'ALTER TABLE ' + QUOTENAME(@SchemaName) + '.[K_DAHIKOD_AYARLAR] ADD [CAGRI_SONLANDIRMA_ARAMA_BITIS_DAKIKASI] INT NULL;';
        IF @ApplyChanges = 1 EXEC sp_executesql @sql ELSE PRINT '[DRY-RUN] ' + @sql;
    END

    /* 3) K_DAHIKOD_BILDIRIM reminder-flow columns */
    IF COL_LENGTH(@SchemaName + '.K_DAHIKOD_BILDIRIM','CAGRI_ONAYI_HATIRLARMA_ARAMA_SAYISI') IS NULL
    BEGIN
        SET @sql = 'ALTER TABLE ' + QUOTENAME(@SchemaName) + '.[K_DAHIKOD_BILDIRIM] ADD [CAGRI_ONAYI_HATIRLARMA_ARAMA_SAYISI] INT NULL;';
        IF @ApplyChanges = 1 EXEC sp_executesql @sql ELSE PRINT '[DRY-RUN] ' + @sql;
    END

    IF COL_LENGTH(@SchemaName + '.K_DAHIKOD_BILDIRIM','CAGRI_ONAYI_HATIRLATMA_ARAMASI_YAPILACAK') IS NULL
    BEGIN
        SET @sql = 'ALTER TABLE ' + QUOTENAME(@SchemaName) + '.[K_DAHIKOD_BILDIRIM] ADD [CAGRI_ONAYI_HATIRLATMA_ARAMASI_YAPILACAK] TINYINT NULL;';
        IF @ApplyChanges = 1 EXEC sp_executesql @sql ELSE PRINT '[DRY-RUN] ' + @sql;
    END

    IF COL_LENGTH(@SchemaName + '.K_DAHIKOD_BILDIRIM','CAGRI_ONAY_BILDIRIM_METNI') IS NULL
    BEGIN
        SET @sql = 'ALTER TABLE ' + QUOTENAME(@SchemaName) + '.[K_DAHIKOD_BILDIRIM] ADD [CAGRI_ONAY_BILDIRIM_METNI] NVARCHAR(MAX) NULL;';
        IF @ApplyChanges = 1 EXEC sp_executesql @sql ELSE PRINT '[DRY-RUN] ' + @sql;
    END

    IF COL_LENGTH(@SchemaName + '.K_DAHIKOD_BILDIRIM','CAGRI_ONAYI_BILDIRIM_FIRMASI') IS NULL
    BEGIN
        SET @sql = 'ALTER TABLE ' + QUOTENAME(@SchemaName) + '.[K_DAHIKOD_BILDIRIM] ADD [CAGRI_ONAYI_BILDIRIM_FIRMASI] VARCHAR(30) NULL;';
        IF @ApplyChanges = 1 EXEC sp_executesql @sql ELSE PRINT '[DRY-RUN] ' + @sql;
    END

    /* 4) Optional NULL default fill (only if requested) */
    /* Dynamic SQL used to avoid compile-time "Invalid column name" errors for newly added columns */
    IF @FillDefaults = 1
    BEGIN
        IF @ApplyChanges = 1
        BEGIN
            EXEC sp_executesql N'UPDATE K_DAHIKOD_AYARLAR
               SET BILDIRIM_GONDERME_DENEME_SAYISI = ISNULL(BILDIRIM_GONDERME_DENEME_SAYISI, 3),
                   KAC_DAKIKA_ONCEKI_BILDIRIM_GONDERILSIN = ISNULL(KAC_DAKIKA_ONCEKI_BILDIRIM_GONDERILSIN, 30),
                   TEK_SEFERDE_SMS_GONDERILECEK_KISI_SAYISI = ISNULL(TEK_SEFERDE_SMS_GONDERILECEK_KISI_SAYISI, 50),
                   TEK_SEFERDE_SESLI_CAGRI_GONDERILECEK_KISI_SAYISI = ISNULL(TEK_SEFERDE_SESLI_CAGRI_GONDERILECEK_KISI_SAYISI, 50),
                   TEK_SEFERDE_MAIL_GONDERILECEK_KISI_SAYISI = ISNULL(TEK_SEFERDE_MAIL_GONDERILECEK_KISI_SAYISI, 50),
                   NET_GSM_BIRINCI_FIRMA = ISNULL(NET_GSM_BIRINCI_FIRMA, 1),
                   KOBICOM_BIRINCI_FIRMA = ISNULL(KOBICOM_BIRINCI_FIRMA, 0),
                   KIRMIZI_SANTRAL_BIRINCI_FIRMA = ISNULL(KIRMIZI_SANTRAL_BIRINCI_FIRMA, 0),
                   AKTIF_BIRINCI_FIRMA = ISNULL(AKTIF_BIRINCI_FIRMA, ''NETGSM''),
                   AKTIF_IKINCI_FIRMA = ISNULL(AKTIF_IKINCI_FIRMA, ''KIRMIZISANTRAL''),
                   CAGRI_SONLANDIRMA_GERI_ARAMASI = ISNULL(CAGRI_SONLANDIRMA_GERI_ARAMASI, 0),
                   CAGRI_SONLANDIRMA_ARAMA_BASLAMA_DAKIKASI = ISNULL(CAGRI_SONLANDIRMA_ARAMA_BASLAMA_DAKIKASI, 5),
                   CAGRI_SONLANDIRMA_ARAMA_BITIS_DAKIKASI = ISNULL(CAGRI_SONLANDIRMA_ARAMA_BITIS_DAKIKASI, 30);';

                        EXEC sp_executesql N'UPDATE K_DAHIKOD_AYARLAR
                             SET AKTIF_IKINCI_FIRMA = ''KIRMIZISANTRAL''
                         WHERE UPPER(ISNULL(AKTIF_BIRINCI_FIRMA, '''')) = ''NETGSM''
                             AND UPPER(ISNULL(AKTIF_IKINCI_FIRMA, '''')) = ''KOBIKOM'';';

            EXEC sp_executesql N'UPDATE S_GENELAYARLAR
               SET SMS_DURUM = ISNULL(SMS_DURUM, 1),
                   EPOSTA_DURUM = ISNULL(EPOSTA_DURUM, 1),
                   SESLI_CAGRI_AKTIF = ISNULL(SESLI_CAGRI_AKTIF, 1);';
        END
        ELSE
        BEGIN
            PRINT '[DRY-RUN] Would fill NULL defaults in K_DAHIKOD_AYARLAR and S_GENELAYARLAR';
        END
    END

    /* 5) Value validation (non-destructive check) */
    /* Dynamic SQL to avoid compile-time binding errors on newly added columns */
    DECLARE @InvalidActiveFirmCount INT = 0;
    EXEC sp_executesql
        N'SELECT @cnt = COUNT(*)
          FROM K_DAHIKOD_AYARLAR
          WHERE UPPER(ISNULL(AKTIF_BIRINCI_FIRMA,'''')) NOT IN (''NETGSM'',''KIRMIZISANTRAL'',''KOBIKOM'')
             OR UPPER(ISNULL(AKTIF_IKINCI_FIRMA,'''')) NOT IN (''NETGSM'',''KIRMIZISANTRAL'',''KOBIKOM'')
             OR UPPER(ISNULL(AKTIF_BIRINCI_FIRMA,'''')) = UPPER(ISNULL(AKTIF_IKINCI_FIRMA,''''));',
        N'@cnt INT OUTPUT',
        @cnt = @InvalidActiveFirmCount OUTPUT;

    IF @InvalidActiveFirmCount > 0
    BEGIN
        PRINT 'INVALID AKTIF_* rows found: ' + CAST(@InvalidActiveFirmCount AS VARCHAR(20));
        IF @FailOnInvalidData = 1
            THROW 50010, 'Validation failed: AKTIF_BIRINCI_FIRMA / AKTIF_IKINCI_FIRMA invalid.', 1;
    END

    PRINT 'Validation checks completed.';

    IF @ApplyChanges = 1
    BEGIN
        COMMIT TRAN;
        PRINT 'APPLY MODE: COMMIT successful.';
    END
    ELSE
    BEGIN
        ROLLBACK TRAN;
        PRINT 'DRY-RUN MODE: transaction rolled back (no changes applied).';
    END

    /* 6) Post-check snapshot (dynamic to avoid compile-time column resolution errors) */
    PRINT '--- K_DAHIKOD_AYARLAR (top 5) ---';
    EXEC sp_executesql N'SELECT TOP 5
        BILDIRIM_GONDERME_DENEME_SAYISI,
        KAC_DAKIKA_ONCEKI_BILDIRIM_GONDERILSIN,
        NET_GSM_BIRINCI_FIRMA,
        KOBICOM_BIRINCI_FIRMA,
        KIRMIZI_SANTRAL_BIRINCI_FIRMA,
        AKTIF_BIRINCI_FIRMA,
        AKTIF_IKINCI_FIRMA,
        CAGRI_SONLANDIRMA_GERI_ARAMASI,
        CAGRI_SONLANDIRMA_ARAMA_BASLAMA_DAKIKASI,
        CAGRI_SONLANDIRMA_ARAMA_BITIS_DAKIKASI
    FROM K_DAHIKOD_AYARLAR;';

    PRINT '--- S_GENELAYARLAR (top 5) ---';
    EXEC sp_executesql N'SELECT TOP 5 SMS_DURUM, EPOSTA_DURUM, SESLI_CAGRI_AKTIF
    FROM S_GENELAYARLAR;';

END TRY
BEGIN CATCH
    IF @@TRANCOUNT > 0
        ROLLBACK TRAN;

    SET @msg = ERROR_MESSAGE();
    PRINT 'ERROR: ' + @msg;
    THROW;
END CATCH;
