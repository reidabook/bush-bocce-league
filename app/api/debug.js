import { GoogleSpreadsheet } from 'google-spreadsheet'
import { JWT } from 'google-auth-library'

export default async function handler(req, res) {
  const result = {
    env: {
      GOOGLE_SERVICE_ACCOUNT_EMAIL: !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      GOOGLE_PRIVATE_KEY: !!process.env.GOOGLE_PRIVATE_KEY,
      GOOGLE_SPREADSHEET_ID: !!process.env.GOOGLE_SPREADSHEET_ID,
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID ?? null,
    },
    connection: null,
    sheets: null,
    error: null,
  }

  if (!result.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !result.env.GOOGLE_PRIVATE_KEY || !result.env.GOOGLE_SPREADSHEET_ID) {
    result.error = 'Missing required environment variables. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SPREADSHEET_ID in Vercel project settings.'
    return res.status(200).json(result)
  }

  try {
    const auth = new JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
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
