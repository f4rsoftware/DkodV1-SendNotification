import { getLogger } from "./logger.js"
import {settings} from "../global/settings.js";
const logger = getLogger('queryProcess.js')


//Gönderilen Data içindeki değerleri sql için parametre olarak hazırlar.
// Örnek kullanım: jsonToSqlParameters(data, 'CAGRI_ID')
// Örnek çıktı: (1,2,3,4,5)
function jsonToSqlParameters(data, fieldName, count) {
    // json içindeki değerleri sql için parametre olarak hazırlar.
    // data: json
    // fieldName: json içindeki alan adı
    if (data === null || data === undefined) {
        logger.error('jsonToSqlParameters: data is null or undefined')
        return false
    }

    if (typeof data !== 'object') {
        logger.error('jsonToSqlParameters: data is not object')
        return false
    }

    const selectedData = data.slice(0, count);

    if (selectedData.length === 0) {
        logger.error('jsonToSqlParameters: selectedData is empty');
        return false;
    }

    let inValues = selectedData.map(item => item[fieldName]).join(',');

    inValues = '(' + inValues + ')';
    return inValues;

    //
    // let inValues = data.map(id => id[fieldName]).join(',')
    // if (inValues === '') {
    //     logger.error('jsonToSqlParameters: inValues is empty')
    //     return false
    // }
    //
    // inValues = '(' + inValues + ')'
    // return inValues
}


export { jsonToSqlParameters }
