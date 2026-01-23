import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { ParsedResumeData } from '@/types/api.types';

/**
 * Resume Parser Service
 * 
 * CRITICAL: Fail-loud error handling. All parsing failures throw detailed errors.
 * This service extracts structured data from resume files (PDF/DOCX).
 */

/**
 * Parses PDF file and extracts text content
 */
async function parsePdfFile(buffer: Buffer): Promise<string> {
    if (!buffer || buffer.length === 0) {
        throw new Error('Cannot parse empty PDF buffer');
    }

    try {
        const data = await pdfParse(buffer);

        if (!data.text || data.text.trim().length === 0) {
            throw new Error(
                'PDF parsing resulted in empty text. ' +
                `File may be corrupted or contain only images. Pages: ${data.numpages}`
            );
        }

        return data.text;
    } catch (error) {
        throw new Error(
            `PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            `Buffer size: ${buffer.length} bytes`
        );
    }
}

/**
 * Parses DOCX file and extracts text content
 */
async function parseDocxFile(buffer: Buffer): Promise<string> {
    if (!buffer || buffer.length === 0) {
        throw new Error('Cannot parse empty DOCX buffer');
    }

    try {
        const result = await mammoth.extractRawText({ buffer });

        if (!result.value || result.value.trim().length === 0) {
            throw new Error(
                'DOCX parsing resulted in empty text. File may be corrupted or empty.'
            );
        }

        if (result.messages && result.messages.length > 0) {
            console.warn('DOCX parsing warnings:', result.messages);
        }

        return result.value;
    } catch (error) {
        throw new Error(
            `DOCX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            `Buffer size: ${buffer.length} bytes`
        );
    }
}

/**
 * Extracts email addresses from text
 */
function extractEmails(text: string): string[] {
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
    return text.match(emailRegex) || [];
}

/**
 * Extracts phone numbers from text
 */
function extractPhoneNumbers(text: string): string[] {
    const phoneRegex = /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
    return text.match(phoneRegex) || [];
}

/**
 * Extracts URLs from text
 * @param text - Text to extract URLs from
 * @returns Array of URLs found in the text
 */
export function extractUrls(text: string): string[] {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
}

/**
 * Extracts LinkedIn profile URL
 */
function extractLinkedIn(text: string): string | undefined {
    const linkedinRegex = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[a-zA-Z0-9_-]+/i;
    const match = text.match(linkedinRegex);
    return match ? match[0] : undefined;
}

/**
 * Extracts GitHub profile URL
 */
function extractGitHub(text: string): string | undefined {
    const githubRegex = /(?:https?:\/\/)?(?:www\.)?github\.com\/[a-zA-Z0-9_-]+/i;
    const match = text.match(githubRegex);
    return match ? match[0] : undefined;
}

/**
 * Extracts name from resume text (basic heuristic)
 */
function extractName(text: string): string | undefined {
    // Assume name is in the first few lines
    const lines = text.split('\n').filter(line => line.trim().length > 0);

    if (lines.length === 0) {
        return undefined;
    }

    // First line is often the name
    const firstLine = lines[0]?.trim();

    if (firstLine && firstLine.length > 2 && firstLine.length < 50) {
        // Check if it looks like a name (contains spaces, not too long)
        const words = firstLine.split(/\s+/);
        if (words.length >= 2 && words.length <= 4) {
            return firstLine;
        }
    }

    return undefined;
}

/**
 * Identifies section headers in resume
 */
function identifySections(text: string): Record<string, string> {
    const sections: Record<string, string> = {};
    const lines = text.split('\n');

    const sectionKeywords = {
        experience: ['experience', 'work history', 'employment', 'work experience'],
        education: ['education', 'academic', 'qualification'],
        skills: ['skills', 'technical skills', 'core competencies', 'expertise'],
        projects: ['projects', 'portfolio'],
        certifications: ['certifications', 'certificates', 'licenses'],
        summary: ['summary', 'objective', 'profile', 'about'],
    };

    let currentSection = '';
    let sectionContent = '';

    for (const line of lines) {
        const lowerLine = line.toLowerCase().trim();

        // Check if line is a section header
        let foundSection = false;
        for (const [section, keywords] of Object.entries(sectionKeywords)) {
            if (keywords.some(keyword => lowerLine.includes(keyword))) {
                // Save previous section
                if (currentSection && sectionContent) {
                    sections[currentSection] = sectionContent.trim();
                }
                currentSection = section;
                sectionContent = '';
                foundSection = true;
                break;
            }
        }

        if (!foundSection && currentSection) {
            sectionContent += line + '\n';
        }
    }

    // Save last section
    if (currentSection && sectionContent) {
        sections[currentSection] = sectionContent.trim();
    }

    return sections;
}

/**
 * Extracts structured data from parsed text using AI
 */
async function extractStructuredDataWithAI(text: string): Promise<ParsedResumeData> {
    console.log('=== AI Resume Parsing Starting ===');
    console.log('Text length:', text.length);
    console.log('Text preview:', text.substring(0, 500));

    try {
        console.log('Loading OpenAI client...');
        const { getOpenAIClient } = await import('./openai.service');
        const openai = getOpenAIClient();
        console.log('OpenAI client loaded successfully');

        const prompt = `Extract structured data from this resume text and return it as JSON.

Resume Text:
${text}

Return ONLY valid JSON in this exact format (no markdown, no explanations):
{
  "personalInfo": {
    "fullName": "string",
    "email": "string",
    "phone": "string",
    "location": "string",
    "linkedin": "string",
    "github": "string",
    "website": "string",
    "summary": "string"
  },
  "workExperience": [
    {
      "company": "string",
      "position": "string",
      "location": "string",
      "startDate": "string",
      "endDate": "string (or 'Present')",
      "current": boolean,
      "description": "string",
      "achievements": ["string"]
    }
  ],
  "education": [
    {
      "institution": "string",
      "degree": "string",
      "field": "string",
      "location": "string",
      "startDate": "string",
      "endDate": "string",
      "current": boolean,
      "gpa": "string",
      "achievements": ["string"]
    }
  ],
  "projects": [
    {
      "title": "string",
      "description": "string",
      "technologies": ["string"],
      "url": "string",
      "githubUrl": "string",
      "startDate": "string",
      "endDate": "string",
      "highlights": ["string"]
    }
  ],
  "skills": [
    {
      "category": "string (e.g., 'Programming Languages', 'Tools', 'Frameworks')",
      "skills": ["string"]
    }
  ],
  "certifications": [
    {
      "name": "string",
      "issuer": "string",
      "issueDate": "string",
      "expiryDate": "string",
      "credentialId": "string",
      "credentialUrl": "string"
    }
  ]
}`;

        console.log('Making AI request...');
        const completion = await openai.chat.completions.create({
            model: 'meta/llama-3.1-8b-instruct',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.1,
            max_tokens: 4000,
        });

        console.log('AI response received');
        const responseText = completion.choices[0]?.message?.content?.trim();
        console.log('Response text length:', responseText?.length);
        console.log('Response text preview:', responseText?.substring(0, 500));

        if (!responseText) {
            throw new Error('AI returned empty response');
        }

        // Try to clean up the response if it has markdown code blocks or extra text
        let cleanedResponse = responseText;

        // Remove markdown code blocks
        if (responseText.includes('```json')) {
            cleanedResponse = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
            console.log('Cleaned markdown from response');
        } else if (responseText.includes('```')) {
            cleanedResponse = responseText.replace(/```\n?/g, '').trim();
            console.log('Cleaned code blocks from response');
        }

        // Remove any text before the JSON starts (common with AI responses)
        const jsonStart = cleanedResponse.indexOf('{');
        if (jsonStart > 0) {
            cleanedResponse = cleanedResponse.substring(jsonStart);
            console.log('Removed text before JSON (starting at position', jsonStart, ')');
        }

        // Remove any text after the JSON ends
        const jsonEnd = cleanedResponse.lastIndexOf('}');
        if (jsonEnd > 0 && jsonEnd < cleanedResponse.length - 1) {
            cleanedResponse = cleanedResponse.substring(0, jsonEnd + 1);
            console.log('Removed text after JSON');
        }

        console.log('Final cleaned response length:', cleanedResponse.length);
        console.log('Final cleaned response preview:', cleanedResponse.substring(0, 200));

        // Parse the JSON response
        console.log('Parsing JSON...');
        const rawData = JSON.parse(cleanedResponse) as ParsedResumeData;

        console.log('AI parsed resume successfully!');
        console.log('- Work Experience entries:', rawData.workExperience?.length || 0);
        console.log('- Education entries:', rawData.education?.length || 0);
        console.log('- Projects:', rawData.projects?.length || 0);
        console.log('- Skills categories:', rawData.skills?.length || 0);
        console.log('- Certifications:', rawData.certifications?.length || 0);

        // Post-process the data to fix common formatting issues
        const cleanedData = cleanupParsedData(rawData);
        console.log('Data cleaned and normalized');

        return cleanedData;
    } catch (error) {
        console.error('=== AI PARSING FAILED ===');
        console.error('Error:', error);
        console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
        console.error('Falling back to basic extraction...');

        // Fall back to basic extraction
        return extractStructuredDataBasic(text);
    }
}

/**
 * Converts natural language dates to YYYY-MM format
 * Returns undefined for empty/unparseable dates (for optional fields)
 */
function convertToYYYYMM(dateStr: string | undefined): string | undefined {
    if (!dateStr || dateStr.trim() === '') return undefined;

    // If it's already in YYYY-MM format, return it
    if (/^\d{4}-\d{2}$/.test(dateStr.trim())) {
        return dateStr.trim();
    }

    // If it's in YYYY format, convert to YYYY-01 (January)
    if (/^\d{4}$/.test(dateStr.trim())) {
        return `${dateStr.trim()}-01`;
    }

    // Handle "Present", "Current", etc. - return undefined for ongoing roles
    if (/present|current/i.test(dateStr)) {
        return undefined;
    }

    // Try to extract month and year from natural language
    const monthMap: Record<string, string> = {
        'january': '01', 'jan': '01',
        'february': '02', 'feb': '02',
        'march': '03', 'mar': '03',
        'april': '04', 'apr': '04',
        'may': '05',
        'june': '06', 'jun': '06',
        'july': '07', 'jul': '07',
        'august': '08', 'aug': '08',
        'september': '09', 'sep': '09', 'sept': '09',
        'october': '10', 'oct': '10',
        'november': '11', 'nov': '11',
        'december': '12', 'dec': '12'
    };

    // Extract year (4 digits)
    const yearMatch = dateStr.match(/\b(20\d{2}|19\d{2})\b/);
    const year = yearMatch ? yearMatch[0] : '';

    // Extract month name
    let month = '';
    const lowerDate = dateStr.toLowerCase();
    for (const [monthName, monthNum] of Object.entries(monthMap)) {
        if (lowerDate.includes(monthName)) {
            month = monthNum;
            break;
        }
    }

    // If we have both year and month, return YYYY-MM
    if (year && month) {
        return `${year}-${month}`;
    }

    // If we only have year, use January as default month
    if (year) {
        return `${year}-01`;
    }

    // If we can't parse it, return undefined
    console.warn(`Could not parse date: "${dateStr}" - returning undefined`);
    return undefined;
}

/**
 * Cleans up and normalizes parsed resume data
 */
function cleanupParsedData(data: ParsedResumeData): ParsedResumeData {
    // Clean up personal info
    const personalInfo = data.personalInfo || {};

    // Fix LinkedIn URL - if it's not a URL, clear it
    if (personalInfo.linkedin && !personalInfo.linkedin.includes('linkedin.com')) {
        console.log('Clearing invalid LinkedIn URL:', personalInfo.linkedin);
        personalInfo.linkedin = '';
    }

    // Fix GitHub URL - if it's not a URL, clear it
    if (personalInfo.github && !personalInfo.github.includes('github.com')) {
        console.log('Clearing invalid GitHub URL:', personalInfo.github);
        personalInfo.github = '';
    }

    // Fix website URL - if it's not a URL, clear it
    if (personalInfo.website && !personalInfo.website.startsWith('http')) {
        console.log('Clearing invalid website URL:', personalInfo.website);
        personalInfo.website = '';
    }

    // Clean up work experience dates
    const workExperience = (data.workExperience || []).map((exp, idx) => {
        const converted = {
            ...exp,
            startDate: convertToYYYYMM(exp.startDate),
            endDate: convertToYYYYMM(exp.endDate),
        };
        console.log(`Work Exp ${idx}: startDate="${exp.startDate}" → "${converted.startDate}", endDate="${exp.endDate}" → "${converted.endDate}"`);
        return converted;
    });

    // Clean up education dates
    const education = (data.education || []).map((edu, idx) => {
        const converted = {
            ...edu,
            startDate: convertToYYYYMM(edu.startDate),
            endDate: convertToYYYYMM(edu.endDate),
        };
        console.log(`Education ${idx}: startDate="${edu.startDate}" → "${converted.startDate}", endDate="${edu.endDate}" → "${converted.endDate}"`);
        return converted;
    });

    // Clean up project dates
    const projects = (data.projects || []).map((proj, idx) => {
        const converted = {
            ...proj,
            startDate: convertToYYYYMM(proj.startDate),
            endDate: convertToYYYYMM(proj.endDate),
        };
        console.log(`Project ${idx}: startDate="${proj.startDate}" → "${converted.startDate}", endDate="${proj.endDate}" → "${converted.endDate}"`);
        return converted;
    });

    // Clean up certification dates
    const certifications = (data.certifications || []).map((cert, idx) => {
        const converted = {
            ...cert,
            issueDate: convertToYYYYMM(cert.issueDate),
            expiryDate: convertToYYYYMM(cert.expiryDate),
        };
        console.log(`Cert ${idx}: issueDate="${cert.issueDate}" → "${converted.issueDate}", expiryDate="${cert.expiryDate}" → "${converted.expiryDate}"`);
        return converted;
    });

    return {
        personalInfo,
        workExperience,
        education,
        projects,
        skills: data.skills || [],
        certifications,
    };
}

/**
 * Extracts structured data from parsed text (basic extraction)
 */
function extractStructuredDataBasic(text: string): ParsedResumeData {
    const emails = extractEmails(text);
    const phones = extractPhoneNumbers(text);
    const linkedin = extractLinkedIn(text);
    const github = extractGitHub(text);
    const name = extractName(text);

    const sections = identifySections(text);

    const parsedData: ParsedResumeData = {
        personalInfo: {
            fullName: name,
            email: emails[0],
            phone: phones[0],
            linkedin,
            github,
            summary: sections.summary,
        },
        workExperience: [],
        education: [],
        projects: [],
        skills: [],
        certifications: [],
    };

    return parsedData;
}

/**
 * Main parsing function
 */
export async function parseResumeFile(
    buffer: Buffer,
    mimeType: string
): Promise<ParsedResumeData> {
    if (!buffer || buffer.length === 0) {
        throw new Error('Cannot parse empty file buffer');
    }

    if (!mimeType) {
        throw new Error('MIME type is required for file parsing');
    }

    let extractedText: string;

    try {
        if (mimeType === 'application/pdf') {
            extractedText = await parsePdfFile(buffer);
        } else if (
            mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
            mimeType === 'application/msword'
        ) {
            extractedText = await parseDocxFile(buffer);
        } else {
            throw new Error(
                `Unsupported file type: ${mimeType}. ` +
                'Supported types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            );
        }

        if (!extractedText || extractedText.trim().length < 50) {
            throw new Error(
                'Extracted text is too short or empty. ' +
                `Length: ${extractedText?.length || 0} characters. ` +
                'File may not contain valid resume content.'
            );
        }

        // Use AI to extract structured data
        const parsedData = await extractStructuredDataWithAI(extractedText);

        if (!parsedData.personalInfo?.email && !parsedData.personalInfo?.fullName) {
            console.warn(
                'Warning: Could not extract basic contact information. ' +
                'File may have unusual formatting. Extracted text length: ' +
                extractedText.length
            );
        }

        return parsedData;
    } catch (error) {
        throw new Error(
            `Resume parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
            `MIME type: ${mimeType}, Buffer size: ${buffer.length} bytes`
        );
    }
}

/**
 * Validates parsed resume data
 */
export function validateParsedData(data: ParsedResumeData): {
    isValid: boolean;
    missingFields: string[];
} {
    const missingFields: string[] = [];

    if (!data.personalInfo?.fullName) {
        missingFields.push('Full Name');
    }

    if (!data.personalInfo?.email) {
        missingFields.push('Email');
    }

    return {
        isValid: missingFields.length === 0,
        missingFields,
    };
}

