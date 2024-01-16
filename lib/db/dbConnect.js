import sql from 'mssql'
import 'dotenv/config'
import { getLogger } from '../utils/logger.js'

const logger = getLogger('dbConnect.js')

// SQL Server bağlantı yapılandırması
const config = {
    user: process.env.MSSQL_USER,
    password: process.env.MSSQL_PASSWORD,
    server: process.env.MSSQL_HOST,
    database: process.env.MSSQL_DATABASE,
    options: {
        encrypt: true, // Azure SQL için gerekli olabilir
        trustServerCertificate: true // Kendi sunucunuzda sertifika güvenliği devre dışı bırakmak için
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
