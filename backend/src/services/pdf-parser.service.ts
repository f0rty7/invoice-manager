import { PDFExtract } from 'pdf.js-extract';
import { zeptoParser } from '../parsers/zepto.parser';
import { blinkitParser } from '../parsers/blinkit.parser';
import type { ParseResult } from '@pdf-invoice/shared';

export class PDFParserService {
  private pdfExtract: PDFExtract;
  private parsers = [zeptoParser, blinkitParser];

  constructor() {
    this.pdfExtract = new PDFExtract();
  }

  async parsePDF(buffer: Buffer): Promise<ParseResult> {
    try {
      // Extract text from PDF
      const data = await new Promise<any>((resolve, reject) => {
        this.pdfExtract.extractBuffer(buffer, {}, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      // Extract tokens from all pages
      const tokens: string[] = [];
      for (const page of data.pages) {
        for (const content of page.content) {
          const text = (content.str || '').trim();
          if (text) tokens.push(text);
        }
      }

      // Try each parser to see which one can handle this format
      for (const parser of this.parsers) {
        if (parser.canParse(tokens)) {
          return parser.parse(tokens);
        }
      }

      throw new Error('Unsupported PDF format - not a Zepto or Blinkit invoice');
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw error;
    }
  }

  async parsePDFFile(filePath: string): Promise<ParseResult> {
    try {
      const data = await new Promise<any>((resolve, reject) => {
        this.pdfExtract.extract(filePath, {}, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      const tokens: string[] = [];
      for (const page of data.pages) {
        for (const content of page.content) {
          const text = (content.str || '').trim();
          if (text) tokens.push(text);
        }
      }

      for (const parser of this.parsers) {
        if (parser.canParse(tokens)) {
          return parser.parse(tokens);
        }
      }

      throw new Error('Unsupported PDF format - not a Zepto or Blinkit invoice');
    } catch (error) {
      console.error('PDF parsing error:', error);
      throw error;
    }
  }
}

export const pdfParserService = new PDFParserService();

