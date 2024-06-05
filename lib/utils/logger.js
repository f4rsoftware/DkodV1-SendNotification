import winston from 'winston'

//const levelWidth = 7; // Seviye için maksimum genişlik
const timestampWidth = 18; // Zaman damgası için genişlik
const serviceWidth = 30; // Servis ismi için genişlik

const customFormat = winston.format.combine(
    winston.format.timestamp({
        format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf((info) => {
        // Her bölümü belirli bir genişlikte hizalama
        const level = info.level.toUpperCase();
        const timestamp = info.timestamp.padEnd(timestampWidth);
        const service = info.service.padEnd(serviceWidth);
        return `${level} [${timestamp}] [${service}] ${info.message}`
    })
)

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL,
    format: customFormat,
    transports: [new winston.transports.Console()]
})

function getLogger(service) {
    return logger.child({ service })
}

export { getLogger }
