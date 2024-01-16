import winston from 'winston'

const customFormat = winston.format.printf((info) => {
    return `${info.level.toUpperCase()} [${info.service}] ${info.message}`
})

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL,
    format: customFormat,
    transports: [new winston.transports.Console()]
})

function getLogger(service) {
    return logger.child({ service })
}

export { getLogger }
