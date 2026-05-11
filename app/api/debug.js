import crypto from 'crypto'
import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'

export default async function handler(req, res) {
  const rawKey = process.env.GOOGLE_PRIVATE_KEY ?? null
  const processedKey = rawKey ? rawKey.replace(/\\n/g, '\n') : null

  const result = {
    env: {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!rawKey,
      GOOGLE_SPREADSHEET_ID: !!process.env.GOOGLE_SPREADSHEET_ID,
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID ?? null,
    },
    keyDiagnostics: rawKey ? {
      rawLength: rawKey.length,
      processedLength: processedKey.length,
      rawHasLiteralBackslashN: rawKey.includes('\\n'),
      rawHasRealNewlines: rawKey.includes('\n'),
      processedHasRealNewlines: processedKey.includes('\n'),
      startsCorrectly: processedKey.startsWith('-----BEGIN PRIVATE KEY-----'),
      endsCorrectly: processedKey.trimEnd().endsWith('-----END PRIVATE KEY-----'),
      lineCount: processedKey.split('\n').length,
      firstLine: processedKey.split('\n')[0],
      lastNonEmptyLine: processedKey.split('\n').filter(Boolean).slice(-1)[0],
    } : null,
    cryptoTest: null,
    connection: null,
    sheets: null,
    error: null,
  }

  if (!result.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !result.env.GOOGLE_PRIVATE_KEY || !result.env.GOOGLE_SPREADSHEET_ID) {
    result.error = 'Missing required environment variables.'
    return res.status(200).json(result)
  }

  // Test if Node crypto can load the key at all
  try {
    crypto.createPrivateKey(processedKey)
    result.cryptoTest = 'ok'
  } catch (err) {
    result.cryptoTest = `failed: ${err.message}`
  }

  if (result.cryptoTest !== 'ok') {
    result.error = 'Key format is invalid — fix the key before testing connection.'
    return res.status(200).json(result)
  }

  try {
    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: processedKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    })
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SPREADSHEET_ID, auth)
    await doc.loadInfo()
    result.connection = 'ok'
    result.sheets = Object.keys(doc.sheetsByTitle)
  } catch (err) {
    result.connection = 'failed'
    result.error = err.message
  }

  return res.status(200).json(result)
}
