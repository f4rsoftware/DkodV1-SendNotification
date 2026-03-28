import sql from 'mssql'
import 'dotenv/config'
import { getLogger } from '../utils/logger.js'

const logger = getLogger('dbConnect.js')

function envToBool(value, defaultValue = false) {
    if (value === undefined || value === null || String(value).trim() === '') {
        return defaultValue
    }
    const normalized = String(value).trim().toLowerCase()
    return ['1', 'true', 'yes', 'on'].includes(normalized)
}

// SQL Server bağlantı yapılandırması
const config = {
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

// Bağlantı havuzu oluşturuluyor
const pool = new sql.ConnectionPool(config)
const poolConnect = pool.connect()

pool.on('error', err => {
    logger.error('SQL Database Connection Error: ', err)
})

// Bağlantı nesnelerini dışa aktarıyoruz
export { poolConnect, pool }
