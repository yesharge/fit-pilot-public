import { useState } from 'react'
import { pdfjsLib } from '@/lib/ai/pdfWorker'
import { estimateTokens } from '@/lib/ai/utils'

type ParseStatus = 'idle' | 'parsing' | 'parsed' | 'error'
 
interface UsePDFParserReturn {
  parseFile: (file: File) => Promise<string | null>
  text: string
  filename: string
  pageCount: number
  tokenCount: number
  status: ParseStatus
  error: string | null
}

export function usePDFParser(): UsePDFParserReturn {
    const [text, setText] = useState('')
    const [filename, setFilename] = useState('')
    const [pageCount, setPageCount] = useState(0)
    const [tokenCount, setTokenCount] = useState(0)
    const [status, setStatus] = useState<ParseStatus>('idle')
    const [error, setError] = useState<string | null>(null)

    async function extractTextFromPDF(file: File): Promise<string | null> {
        const arrayBuffer = await file.arrayBuffer()
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
        const pages: string[] = []

        for (let n = 1; n <= pdf.numPages; n++) {
            const page = await pdf.getPage(n)
            const content = await page.getTextContent()
            pages.push(
                (content.items as Array<{ str: string }>)
                    .map((item) => item.str)
                    .join(' ')
            )
        }

        return pages.join('\n').replace(/(\n\s*){2,}/g, '\n')
    }

    async function parseFile(file: File) {
        setStatus('parsing')
        setError(null)
        setFilename(file.name)

        try {
            const extracted = await extractTextFromPDF(file)
            if (!extracted) {
                throw new Error('No text extracted from PDF')
            }

            const pdf = await pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise
            const tokens = estimateTokens(extracted)

            setText(extracted)
            setPageCount(pdf.numPages)
            setTokenCount(tokens)
            setStatus('parsed')

            if (import.meta.env.DEV) {
                console.log('[usePDFParser] extracted text:', extracted.slice(0, 500) + '…')
                console.log(`[usePDFParser] ${pdf.numPages} pages, ~${tokens} tokens`)
              }
            return extracted
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse PDF')
            setStatus('error')
            return null
        }
    }

    return {
        parseFile, text, filename,pageCount, tokenCount, status, error
    }
}
